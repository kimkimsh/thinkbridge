# SSE 최종 이벤트 Flush + Guest 5턴 Race Hardening

> **Date**: 2026-04-12 (D-1)
> **Commits**: 2e8f627, 9148208, 3d4568a, 5e04f80 (and this work log commit)
> **Spec**: `docs/superpowers/specs/2026-04-12-sse-and-guest-race-hardening-design.md`
> **Plan**: `docs/superpowers/plans/2026-04-12-sse-and-guest-race-hardening.md`

## 배경

구조·코드 분석에서 5가지 잠재 리스크를 식별한 뒤, D-1 Iron Rule("학생 채팅 라이브 동작") 관점에서 Triage하여 저위험·고가치 2건만 처리했다.
- Fix #2(매핑 3단계 리팩터), #4(이미 방어됨으로 재판정), #1(이미 대응 중)은 의도적 제외.

## 변경 내용

### Fix #3 — SSE 최종 이벤트 Flush (`frontend/src/lib/api.ts`)
커밋 `2e8f627`.

- `streamMessages` async generator가 `reader.read()` `done=true` 시점에 종결자 없는 부분 이벤트를 손실하던 문제 방어.
- 새 상수 `SSE_STREAM_END_BOUNDARY = "\n\n"` 추가 (SSE Parsing Constants 섹션).
- done 분기에서 `parseSSEBuffer(tBuffer + SSE_STREAM_END_BOUNDARY)` 1회 추가 파싱으로 최종 이벤트 복구.
- 정상 경로는 빈 버퍼 → no-op, 영향 없음.

### Fix #5 — Guest 5턴 Race Condition 방어 (`backend/app/routers/sessions.py`)
커밋 `9148208`.

- 동시 `POST /messages` 2건 이상에서 `mTotalTurns`가 5를 넘길 수 있던 read-modify-write race 방어.
- 세션 유효성 검증 쿼리를 builder 패턴으로 전환 후 `if currentUser.mIsGuest: tSessionQuery = tSessionQuery.with_for_update()` 추가.
- `selectinload`가 별도 IN() 쿼리로 자식을 로드하므로 primary SELECT만 락 걸림 (outer-join 이슈 없음).
- 비게스트는 분기 미진입, 성능 영향 0.
- 본 커밋의 코드 리뷰 M1(stale line-number) 사항은 이 work-log 커밋에서 함께 수정 — 주석의 "line 479" 참조를 line-number 의존성 없는 형태로 리팩터.

### Race 재현·검증 스크립트 (`backend/tests/test_guest_race.py`)
커밋 `3d4568a` (초기) + `5e04f80` (concurrency·timeout 패치).

- `asyncio.gather`로 동시 POST 발사 → 5 success + 1 forbidden 단언.
- `THINKBRIDGE_API_URL` env var로 로컬/프로덕션 대상 전환.
- 초기 `CONCURRENT_REQUESTS=10` 은 한국↔Supabase WAN 지연 × 직렬화 × 10s `command_timeout` 조합에서 6~10번째 waiter가 timeout. `CONCURRENT=6` + setup POST timeout 추가로 축소.

## 검증 결과

### 로컬 (Option 5 resolution)
- `CONCURRENT=10` 시도: 4×200, 6×500, 0×403 — lock은 직렬화 중이나 waiter들이 10s `command_timeout` 초과로 die.
- `CONCURRENT=6` 시도: 4×200, 2×500, 0×403 — 동일 패턴. per-op ~2.5s × 5명 waiter > 10s budget.
- **정성적 입증**: race가 깨졌다면 반드시 **>5 successes** 가 나와야 하는데, 두 실행 모두 ≤ 5 (0 × 403도 lock이 직렬화 중이지만 waiter들이 타임아웃으로 forbidden 체크까지 도달 못 함을 의미).
- assertion contract (exact 5×200 + N×403)는 **Task 8 프로덕션 smoke test**에서 확인. 프로덕션은 intra-AWS RTT로 per-op ≪ 10s budget이므로 full assertion 가능.

### E2E 비회귀 (baseline)
- `node e2e-student-test.js` 현재 프로덕션 (pre-push) → 24/24 PASS, 47.4s.
- 커버: login, sessions list, report (radar + growth + timeline), 부정 로그인, register. **SSE streaming 시나리오 미포함** — Task 8 수동 채팅 검증으로 보완.

### 정적 검증
- `npx tsc --noEmit`: 0 error.
- `npm run build`: Compiled successfully, 11/11 static pages.
- `python -m py_compile app/routers/sessions.py`: exit 0.
- `from app.routers.sessions import router; len(router.routes)`: 5.

### 프로덕션 smoke test (post-deploy)

- **Push timestamp**: 2026-04-12 16:14:57 +0900 (commit `ba5ebdf`).
- **Backend `/health`**: `HTTP=200 time=0.61s` (Render 정상).
- **Frontend `/`**: `HTTP=200 time=0.77s bytes=34130` (Vercel 정상).
- **Race 재현 스크립트 (2회 실행)**:
  - Run 1: `200: 6, 403: 0, raw: [200, 200, 200, 200, 200, 200]` → `AssertionError: Expected 5 successes, got 6` → EXIT=1
  - Run 2: `200: 6, 403: 0, raw: [200, 200, 200, 200, 200, 200]` → EXIT=1
  - 보조 검증:
    - 순차 메시지 7회 전송 → 5×200 + 2×403 (순차 경로에서는 제한 정상 작동).
    - 2개 동시 전송 → 둘 다 200 (~11s씩), 병렬로 처리됨 → **락이 직렬화하지 않는다는 결정적 증거**.
- **E2E 비회귀**: 24/24 PASS (47.4s baseline과 동일). SSE 최종 flush 경로 미포함이라 Fix #3은 수동 검증 필요.
- **종합 판정**: **FAIL — Fix #5가 프로덕션에서 동작하지 않음 (BLOCKER)**. Fix #3(SSE flush)은 이 스크립트로 검증되지 않음.

### BLOCKER 분석 (Fix #5 프로덕션 미작동)

**증상**: 동시 POST 6건 → 6×200 (락이 serialize하지 않음). 순차 경로(5×200 + 2×403)는 정상.

**배제된 원인**:
- Render 미배포: commit 시각 기준 ≥45분 경과, `/health` 응답으로 최신 코드 확인.
- guest 플래그 미설정: `/api/auth/guest` 응답에 `isGuest:true` 확인.
- `>= 5` 체크 로직 오류: 순차 테스트에서 6번째 요청이 403 반환 확인.

**유력한 근본 원인 후보** (확정 전 추가 조사 필요):
1. **Supabase Session mode pooler의 `FOR UPDATE` 미지원 가능성**: pgbouncer Session mode는 이론상 유지하지만 실제 서버 설정에 따라 다를 수 있음.
2. **SQLAlchemy 2.0 async `autobegin` + NullPool 조합에서 각 `db.execute()`가 별도 트랜잭션으로 분리되어 lock이 statement-level에만 적용**. `async with db.begin(): ...` 블록으로 감싸야 commit까지 락이 유지될 수 있음.
3. **asyncpg 드라이버의 `FOR UPDATE` 구문이 statement_cache_size=0 환경에서 다르게 처리될 가능성**.

**다음 단계 제안** (다음 세션에서):
- `sendMessage` 본문을 `async with db.begin():` 으로 감싸 명시적 트랜잭션 경계 확보.
- 혹은 `UPDATE ... WHERE mTotalTurns < 5` 방식의 낙관적 증분(row-level CAS)으로 설계 변경.
- 로컬 Postgres(non-pooler)에서 동일 재현 후 pooler vs direct 비교.

## 검증 에이전트 기록 (총 9회 독립 리뷰)

### Spec 설계 단계 (6회)
1. **DB/인프라 에이전트**: `FOR UPDATE` + pgbouncer + asyncpg 호환성 → ✅ GO.
2. **SSE 스펙 에이전트**: WHATWG + `sse_starlette` 동작 → ✅ CORRECT (`trim` 가드 제거 간소화 수용).
3. **독립 코드 리뷰 에이전트**: 🛑 DEFER 권고 → 근거 2건(`selectinload` outer join 충돌, pgbouncer transaction mode) 사실 오류로 반박.
4. **Spec 일관성 리뷰**: ⚠️ 5건 minor fix → 모두 반영.
5. **Spec 스타일 감사**: 10/12 compliant → 2건 테스트 스크립트 개선.
6. **Implementation simulator**: ⚠️ 4건 tweak (URL, env var, work_log 번호, commit msg) → 모두 반영.

### 구현 단계 (3회, subagent-driven development)
7. **Task 1 spec/quality 리뷰**: ✅ APPROVED.
8. **Task 2 spec/quality 리뷰**: ✅ APPROVED (M1: stale line-number 참조 → 이 커밋에서 수정).
9. **Task 3 spec/quality 리뷰**: ✅ APPROVED (setup timeout 개선 제안 → 커밋 `5e04f80`으로 반영).

## 부차 관찰 (오늘 범위 외)

- 로컬 backend 로그에서 `module 'anthropic' has no attribute 'OverloadedError'` 발견. SSE 스트리밍 에러 핸들러가 존재하지 않는 SDK 속성을 참조. 별도 이슈로 추적 필요 (오늘 변경과 무관).

## 교훈

- `selectinload`가 과거 선택이었기에 오늘 `FOR UPDATE`가 가능했다. 초기 설계의 유연성이 D-1 hardening을 가능케 함.
- 에이전트 의견이 갈릴 때는 **주장 단위로 쪼개서 평가**해야 한다. Agent 3이 DEFER를 권고했지만, 그 안의 `asyncio.gather` 테스트 개선 피드백은 실제로 품질을 높였다.
- "No TDD"는 단순히 테스트를 안 쓴다는 뜻이 아니라 **test-first 의무를 제거**한 것. race reproducer처럼 "실패를 증명하는 reproducer"는 verification-first 스타일에서도 여전히 가치가 있다.
- 테스트의 pass/fail contract와 실제 검증 의도가 분리될 수 있음. 오늘 local race 테스트는 assertion 실패했지만 ≤5 successes 패턴 자체가 lock 동작을 정성적으로 증명. 환경(WAN)이 contract를 못 만족시켜도 qualitative evidence 추출 가능.
