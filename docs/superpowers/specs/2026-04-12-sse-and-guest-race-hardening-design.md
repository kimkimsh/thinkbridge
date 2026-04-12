# SSE 최종 이벤트 Flush + Guest 5턴 Race Condition 방어 설계

> **Date**: 2026-04-12
> **Status**: Draft (사용자 승인 대기)
> **Deadline**: 2026-04-13 (D-1)
> **Scope**: 2개 파일, 약 20줄 수정
> **Option 선택**: B (Targeted Minimal Fix) — A/B/C 중 사용자 확정

## 1. 배경

ThinkBridge는 2026 KIT 바이브코딩 공모전 출품작으로, 현재 기능 완성도 95%(P1 13/13, API 16/16, 모델 8/8, 페이지 10/10) 상태에서 마감 D-1이다. 프로젝트 최상위 원칙은 다음 두 가지다.

- "학생 채팅 1개 기능의 완벽함 > 기능 10개의 존재"
- **Iron Rule**: Day 3 끝까지 학생 채팅이 라이브 URL에서 동작해야 한다

구조/코드 분석 결과 5가지 잠재 리스크가 식별되었고, Triage 끝에 **실재하면서 저위험으로 방어 가능한 2건(SSE 최종 이벤트 flush, Guest 5턴 race)** 만 이번 변경 범위에 포함했다. 나머지 3건은 고의적으로 제외했다(§5 비목표 참조).

## 2. 목표와 비목표

### 목표
1. **Fix #3** — SSE 스트림이 종결자(`\n\n`) 없이 끝날 경우에도 최종 이벤트(`analysis`/`done`/`error`)가 프론트엔드 컨슈머에 전달되도록 방어적 flush 수행.
2. **Fix #5** — Guest 사용자의 동시 `POST /api/sessions/{id}/messages` 요청에서 5턴 상한이 넘어가지 않도록 TutoringSession 행 수준 락 적용.

### 비목표 (의도적 제외)
- **매핑 3단계 변환 리팩터** (snake_case → mPascalCase → camelCase): 작동 중인 코드 전반을 건드려야 해 D-1 위험도 최고. 기술 부채로 기록만 하고 패스.
- **Race condition #4**: 2차 코드 리딩 결과 `flush()` + 신규 세션 사용으로 이미 방어되어 있어 **리스크 아님**으로 재판정.
- **Cold start 개선**: `page.tsx:161`의 warm-up fetch와 `scripts/warmup.sh`로 이미 대응 중. 체계적 강화는 별도 작업.
- **Auth/JWT, 리포트 생성기, 대시보드 로직 변경**: 범위 외.

## 3. 설계 근거

### 3.1 대안 비교

| 옵션 | 설명 | 선택 여부 | 이유 |
|------|------|----------|------|
| A. Conservative | 아무것도 수정하지 않고 데모 리허설·리포트 폴리싱 집중 | ❌ | 사용자가 B 선택 |
| **B. Targeted Minimal** | **#3 + #5만 각 10줄 내외 수정** | ✅ | **변경량 최소·영향 격리** |
| C. Full Refactor | 5개 전부 수정 | ❌ | D-1에 매핑 리팩터는 Iron Rule 위반 가능 |

### 3.2 3팀 에이전트 병렬 검증 결과

| 에이전트 | 초점 | 결론 |
|---------|------|------|
| Agent 1 (DB/인프라) | `FOR UPDATE` + pgbouncer + asyncpg 호환성 | ✅ GO |
| Agent 2 (SSE 스펙) | WHATWG SSE spec + sse_starlette 동작 | ✅ CORRECT (간소화 제안 수용) |
| Agent 3 (독립 리뷰) | D-1 리스크 전반 | 🛑 DEFER (근거 2가지 사실 오류) |

### 3.3 Agent 3 DEFER 권고 반박 기록

Agent 3이 제기한 반대 근거 중 다음 2건은 **사실 오류**로 반박됨 (보존):

**오류 1**: "`selectinload` + `with_for_update()` = PostgreSQL outer join 거부"
- **반박**: `selectinload`는 `SELECT ... FROM parent` 본 쿼리 실행 후 별도 `SELECT ... WHERE parent_id IN (...)` 발행 방식 (SQLAlchemy 문서). 본 쿼리에 JOIN이 없으므로 `FOR UPDATE` 적용 가능. Agent 1 상세 인용.

**오류 2**: "Supabase pgbouncer transaction pooling에서 `FOR UPDATE` 실패"
- **반박**: 이 프로젝트는 `docs/work_log/03_deployment.md` Issue 3에서 명시적으로 **Session mode (port 5432)** 로 전환함. Session mode는 전체 세션 동안 단일 백엔드 커넥션을 유지하므로 `FOR UPDATE`/`SET LOCAL`/prepared statements 모두 정상 작동.

### 3.4 Agent 3에서 수용한 개선 (유효 피드백)

- 테스트 방법: `xargs -P 5`는 fork latency로 race 재현 불완전 → **Python `asyncio.gather`** 로 대체
- Agent 2의 코드 간소화(`trim().length > 0` 가드 제거): `parseSSEBuffer`가 empty 버퍼에 no-op이므로 가드 불필요

## 4. 상세 설계

### 4.1 Fix #3 — SSE 최종 이벤트 Flush

**파일**: `frontend/src/lib/api.ts`
**함수**: `streamMessages` (line 244-305)

**현재 동작**:
`reader.read()`가 `done=true`를 반환하면 즉시 `break`. 이 시점에 `tBuffer`에 종결자 없는 부분 이벤트가 남아 있으면 영구 손실됨.

**변경 전** (line 286-304):
```typescript
while (true)
{
    const { done, value } = await tReader.read();

    if (done)
    {
        break;
    }

    tBuffer += tDecoder.decode(value, { stream: true });
    const tResult = parseSSEBuffer(tBuffer);

    for (const tEvent of tResult.events)
    {
        yield tEvent;
    }

    tBuffer = tResult.remaining;
}
```

**변경 후**:
```typescript
while (true)
{
    const { done, value } = await tReader.read();

    if (done)
    {
        // 스트림 종료 시 종결자 없는 최종 이벤트 방어적 flush.
        // parseSSEBuffer는 empty/whitespace 버퍼에 no-op이므로 가드 불필요.
        const tFinalResult = parseSSEBuffer(tBuffer + SSE_STREAM_END_BOUNDARY);
        for (const tEvent of tFinalResult.events)
        {
            yield tEvent;
        }
        break;
    }

    tBuffer += tDecoder.decode(value, { stream: true });
    const tResult = parseSSEBuffer(tBuffer);

    for (const tEvent of tResult.events)
    {
        yield tEvent;
    }

    tBuffer = tResult.remaining;
}
```

**상수 추가** (기존 `SSE Parsing Constants` 섹션 내, `api.ts:31` 부근 `SSE_EVENT_PREFIX`/`SSE_DATA_PREFIX` 옆에 배치):
```typescript
/** 스트림 종료 시 종결자 없는 최종 이벤트 flush용 가상 경계 (SSE blank line) */
const SSE_STREAM_END_BOUNDARY = "\n\n";
```

**영향 분석**:
- **정상 경로** (`sse_starlette`가 항상 `\r\n\r\n` 종결자 부착): `tBuffer`가 이미 빈 문자열 → `"" + "\n\n"` 파싱 시 events 0건 → no-op. **변경 없음**.
- **비정상 경로** (프록시 truncation, 서버 중단 등): 부분 이벤트 1건 복구.
- **성능**: 루프 종료 시 1회 regex exec 추가. 무시 가능.
- **Malformed trailing bytes**: `parseSSEBuffer` 내부 JSON parse가 이미 try/catch로 감싸져 있음(`api.ts:207-233`). 부분 바이트가 섞여 들어와도 이벤트 단위 silent skip. 추가 방어 불필요.

### 4.2 Fix #5 — Guest 5턴 Race Condition 방어

**파일**: `backend/app/routers/sessions.py`
**함수**: `sendMessage` (line 345-561)

**현재 동작**:
1. Line 368-377: `SELECT` with `selectinload`로 TutoringSession + messages + analyses eager load (락 없음).
2. Line 405: `if currentUser.mIsGuest and tSession.mTotalTurns >= GUEST_MAX_TURNS` 체크.
3. Line 435: `tSession.mTotalTurns = tNewTurnNumber` (증가).
4. Line 436: `await db.flush()`.
5. Line 479: `await db.commit()`.

**Race 시나리오**:
- T0: Request A 도착, `mTotalTurns=4` 읽음.
- T1: Request B 도착, `mTotalTurns=4` 읽음 (A가 아직 commit 전).
- T2: A 통과 (`4 < 5`), B 통과 (`4 < 5`).
- T3: A increment→5, B increment→5.
- T4: commit 2회. 결과: 실제 6턴 수행.

**변경 전** (line 368-378):
```python
# 1. 세션 유효성 검증
tResult = await db.execute(
    select(TutoringSession)
    .options(
        selectinload(TutoringSession.mMessages)
        .selectinload(Message.mThoughtAnalysis)
    )
    .where(TutoringSession.mId == sessionId)
)
tSession = tResult.scalar_one_or_none()
```

**변경 후**:
```python
# 1. 세션 유효성 검증
# 게스트는 턴 카운트 증가까지 동시 요청 경합을 막기 위해 행 잠금(FOR UPDATE) 적용.
# selectinload는 별도 IN() 쿼리이므로 primary SELECT만 잠기며 Postgres outer join 이슈 없음.
# Supabase Pooler Session mode(port 5432)에서 락은 db.commit()(line 479)까지 유지됨.
tSessionQuery = (
    select(TutoringSession)
    .options(
        selectinload(TutoringSession.mMessages)
        .selectinload(Message.mThoughtAnalysis)
    )
    .where(TutoringSession.mId == sessionId)
)
if currentUser.mIsGuest:
    tSessionQuery = tSessionQuery.with_for_update()

tResult = await db.execute(tSessionQuery)
tSession = tResult.scalar_one_or_none()
```

**영향 분석**:
- **비게스트**: `if` 분기 미진입, 쿼리 완전 동일. **변경 없음**.
- **게스트**: 주 쿼리에 `FOR UPDATE` 추가. 이후 동시 요청은 첫 요청의 `db.commit()`까지 대기.
- **락 수명**: `SELECT FOR UPDATE` 시점(line ~369) → `db.commit()`(line 479) → 자동 해제. SSE 스트리밍(line 481~)은 락 해제 후 시작.
- **`selectinload` 영향**: 자식 IN() 쿼리는 락 없이 실행 (정상 의도).
- **교착 가능성**: 단일 세션 행만 잠그므로 deadlock 불가.
- **NullPool 상호작용**: `database.py:46`의 `NullPool`로 각 요청이 별도 커넥션을 획득하고 `async_session_maker`가 독립 트랜잭션을 시작. `FOR UPDATE` 락 범위는 단일 요청 커넥션 한정 → 커밋 시점 해제 → 요청 간 락 누출 불가.
- **인프라 확인**: Supabase Session mode + asyncpg + `statement_cache_size=0`(`database.py:51`) + `NullPool`(`database.py:46`) — Agent 1이 모두 정상 조합으로 검증.

## 5. 테스트 계획

### 5.1 Fix #3 검증

1. **비회귀 E2E**: 기존 `test_suite3.js`/`e2e_test_suite1.js` 재실행. 학생 채팅 streaming + analysis 패널 + done 이벤트 정상 작동 확인.
2. **단위 테스트**: 브라우저 devtools에서 `streamMessages`를 수동 호출 후 서버가 응답 중 연결 강제 끊기(Render 콘솔에서 restart). 최종 부분 이벤트가 consumer에 전달되는지 로그로 확인.

### 5.2 Fix #5 검증

**자동화 스크립트** (`backend/tests/test_guest_race.py` 신규, 제출 후 제거 가능):
```python
import asyncio
import httpx

API_URL = "https://<backend>.onrender.com"
CONCURRENT_REQUESTS = 10
GUEST_MAX_TURNS = 5
EXPECTED_SUCCESS_COUNT = GUEST_MAX_TURNS
EXPECTED_FORBIDDEN_COUNT = CONCURRENT_REQUESTS - GUEST_MAX_TURNS
MESSAGE_TIMEOUT_SECONDS = 90.0
WARMUP_TIMEOUT_SECONDS = 60.0
SUCCESS_STATUS = 200
FORBIDDEN_STATUS = 403

async def warmUpBackend(client):
    """Render cold start 편향 제거를 위한 사전 호출"""
    try:
        await client.get(f"{API_URL}/health", timeout=WARMUP_TIMEOUT_SECONDS)
    except Exception:
        pass

async def createGuestSession(client):
    tAuth = await client.post(f"{API_URL}/api/auth/guest")
    tToken = tAuth.json()["accessToken"]
    tSession = await client.post(
        f"{API_URL}/api/sessions",
        headers={"Authorization": f"Bearer {tToken}"},
        json={"subject": "math", "topic": "race test"},
    )
    return tToken, tSession.json()["id"]

async def sendOneMessage(client, token, sessionId, idx):
    try:
        tResp = await client.post(
            f"{API_URL}/api/sessions/{sessionId}/messages",
            headers={"Authorization": f"Bearer {token}"},
            json={"content": f"test {idx}"},
            timeout=MESSAGE_TIMEOUT_SECONDS,
        )
        return tResp.status_code
    except Exception as tError:
        return f"ERR: {tError}"

async def main():
    async with httpx.AsyncClient() as tClient:
        # 1. Render cold start 워밍업 (race 편향 제거)
        await warmUpBackend(tClient)

        # 2. Guest 세션 생성
        tToken, tSessionId = await createGuestSession(tClient)

        # 3. 동시 10개 메시지 발사
        tResults = await asyncio.gather(*[
            sendOneMessage(tClient, tToken, tSessionId, i)
            for i in range(CONCURRENT_REQUESTS)
        ])

        tSuccess = sum(1 for tStatus in tResults if tStatus == SUCCESS_STATUS)
        tForbidden = sum(1 for tStatus in tResults if tStatus == FORBIDDEN_STATUS)
        print(f"200: {tSuccess}, 403: {tForbidden}, raw: {tResults}")
        assert tSuccess == EXPECTED_SUCCESS_COUNT, \
            f"Expected {EXPECTED_SUCCESS_COUNT} successes, got {tSuccess}"
        assert tForbidden == EXPECTED_FORBIDDEN_COUNT, \
            f"Expected {EXPECTED_FORBIDDEN_COUNT} forbidden, got {tForbidden}"
        print("PASS: Guest 5-turn limit correctly enforced under concurrency")

if __name__ == "__main__":
    asyncio.run(main())
```

**Expected**: 200 응답 정확히 5건, 403 응답 5건. 실패 시 락 미작동 또는 다른 race 존재.

**주의 사항**:
- `MESSAGE_TIMEOUT_SECONDS=90`: 10개 동시 SSE 스트림에서 각 턴이 full AI 응답(약 10-20초 × 병렬 대기)까지 포괄하는 보수적 상한.
- Render 콜드 스타트 편향이 의심되면 워밍업 후 30초 추가 슬립을 넣어도 됨.

### 5.3 배포 전 수동 확인

- [ ] 로컬에서 `python -m uvicorn app.main:app --reload` 기동 후 Supabase 실 DB로 race 스크립트 실행
- [ ] `frontend/.next` 빌드 확인 (`npm run build`)
- [ ] Vercel deploy 시 환경변수 변경 없음 확인

## 6. 롤백 계획

두 수정 모두 독립 커밋으로 분리하여 개별 롤백 가능.

```bash
# 단일 수정 롤백
git revert <commit-sha-fix-3>
git revert <commit-sha-fix-5>

# 양쪽 모두 롤백
git revert <commit-sha-fix-5>..<commit-sha-fix-3>
```

Render/Vercel은 이전 빌드 자동 재배포 가능 (Rollback 버튼).

## 7. 승인 체크리스트

배포 전 다음 항목 확인:

- [ ] 기존 비게스트 채팅 플로우 비회귀 (로컬 + 스테이징)
- [ ] Fix #3 간소화(가드 제거) 후 정상 종료 케이스에서 spurious 이벤트 yield 없음
- [ ] Fix #5의 `with_for_update()`가 Supabase Session mode에서 정상 취득·해제되는지 서버 로그 확인
- [ ] `asyncio.gather` 기반 race 재현 스크립트 통과
- [ ] 두 수정이 별도 커밋으로 분리되어 있음
- [ ] 구현 완료 후 `docs/work_log/` 에 작업 로그 엔트리 작성 (프로젝트 CLAUDE.md Work Log Policy 준수)

## 8. 참고 자료

- WHATWG SSE spec: https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
- SQLAlchemy `with_for_update`: https://docs.sqlalchemy.org/en/20/core/selectable.html#sqlalchemy.sql.expression.GenerativeSelect.with_for_update
- SQLAlchemy `selectinload`: https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html#select-in-loading
- 프로젝트 배포 로그: `docs/work_log/03_deployment.md` (특히 Issue 3: pgbouncer Session mode 전환)
- 프로젝트 CLAUDE.md: `/home/mark-minipc/workspace/thinkbridge/CLAUDE.md`
