# P0 Critical Fixes — 즉시 수정 필수

> 프로덕션 리스크 최고 수준. 각 수정은 독립 commit, 개별 롤백 가능하도록 분리.

## P0-1: `anthropic.OverloadedError` AttributeError

### 위치
`backend/app/services/ai_engine.py:368`

### 현상
```python
except anthropic.OverloadedError as tError:  # 이 속성 존재 안 함
    ...
```

SDK `anthropic==0.34.2`에서 `OverloadedError`는 top-level export에 없음. `work_log/09_sse_and_race_hardening.md`의 "부차 관찰"에서 이미 확인됨 (`module 'anthropic' has no attribute 'OverloadedError'`).

### 터지는 시나리오
1. Claude API가 529 Overloaded 반환
2. Python이 `except anthropic.OverloadedError` 평가 시점에 `AttributeError` 발생
3. 이 `AttributeError`가 `processTurnStreaming` 밖으로 전파
4. `generateSseEvents`의 bare `except Exception`이 잡고 "스트리밍 중 오류가 발생했습니다" 일반 메시지 반환
5. **재시도 로직은 절대 실행 안 됨** (catch 지점을 지나지도 못함)

### Root Cause
SDK 0.34.2 실제 exception classes:
```
APIConnectionError, APIError, APIResponseValidationError, APIStatusError,
APITimeoutError, AnthropicError, AuthenticationError, BadRequestError,
ConflictError, InternalServerError, NotFoundError, PermissionDeniedError,
RateLimitError, UnprocessableEntityError
```

`529 Overloaded`는 `APIStatusError(status_code=529)`로 올라옴. `BetaOverloadedError`는 `anthropic.types`에만 존재하며 런타임 예외 클래스가 아님.

### Fix Approach

```python
# ai_engine.py — except 블록 교체

# Before
except anthropic.OverloadedError as tError:
    # overload retry logic

# After
except anthropic.APIStatusError as tError:
    if tError.status_code == OVERLOAD_STATUS_CODE:
        # 기존 overload retry 로직 유지
        ...
    else:
        raise  # 다른 status 에러는 상위로
```

추가 constants:
```python
OVERLOAD_STATUS_CODE = 529
RATE_LIMIT_STATUS_CODE = 429
```

### P1-1과 연계
동일 수정 범위에서 `RateLimitError` (429) 재시도 루프도 포함 권장:
```python
except (anthropic.APIStatusError, anthropic.RateLimitError) as tError:
    tStatus = getattr(tError, 'status_code', None)
    if tStatus == OVERLOAD_STATUS_CODE or isinstance(tError, anthropic.RateLimitError):
        # exponential backoff retry
        ...
```

### 검증 방법
- 단위 테스트: `anthropic.APIStatusError(message="...", response=mock, body=None)` 주입
- 통합: 529 mocking + SSE stream 소비 후 사용자가 정상 재시도 받는지 확인
- 로깅: `logger.warning("Claude overload, retrying attempt %d/%d", ...)` 첨가 권장

### 예상 변경량
**S** (~15-20줄), 1 파일 (`ai_engine.py`)

### 리스크
- 현재 코드는 실제로 529를 핸들 못 하고 있으므로, 수정 후 "이전엔 안 되던 재시도"가 처음 동작. 재시도 자체의 버그 가능성 → 최대 재시도 수와 backoff 상한 철저히 명시.

---

## P0-2: `_saveAiResponseToDb` 침묵 실패 → 클라이언트/DB 괴리

### 위치
`backend/app/routers/sessions.py:559-574` (`generateSseEvents` finally 부분) + `sessions.py:641-647` (`_saveAiResponseToDb` except)

### 현상
SSE 스트림이 `event: done`을 클라이언트에 송신 완료 **후** `_saveAiResponseToDb`가 호출됨. 이 시점에 DB 저장이 실패하면:
```python
except Exception as tSaveError:
    logger.error("Failed to save AI response to DB for session %d: %s", tSessionId, tSaveError)
    # 재시도 없음, 클라이언트에 알림 없음, 턴 카운트 CAS는 이미 증가됨
```

### 터지는 시나리오
- 클라이언트 화면: AI 응답 + 분석 패널 업데이트 완료 → 사용자는 "성공" 인식
- DB: Message 레코드 없음, ThoughtAnalysis 없음, TokenUsage 없음
- `mTotalTurns`: 이미 CAS로 +1 (rollback 안 됨, 별도 트랜잭션이므로)
- **다음 턴**: `_buildSessionHistory`가 DB에서 user 메시지만 있고 assistant가 빠진 턴을 로드 → Claude는 "내가 뭐라고 답했지?"를 몰라서 같은 질문 반복하거나 맥락 오해

### 발생 가능한 원인
- Supabase pooler 일시 타임아웃
- `TokenUsage.mModel`이 unknown 문자열로 저장되는 corner case
- `ThoughtAnalysis.mDetectedPatterns`가 너무 긴 JSON array
- FK 위반 (동시성으로 인한 Message ID 중복)

### Fix Approach (최소 변경, 안전)

**Phase 1 — 에러 visibility 개선 (즉시)**
```python
# _saveAiResponseToDb 내
except Exception as tSaveError:
    logger.exception(
        "CRITICAL: AI response DB save failed for session %d, turn %d. "
        "Client-side state may diverge from DB. Error: %s",
        sessionId, turnNumber, tSaveError,
    )
    # 메트릭 카운터 (Sentry/log scraper 용)
    raise  # re-raise so caller knows
```

**Phase 2 — generateSseEvents에서 save 실패 포착 후 클라이언트에 알림**
```python
# sessions.py finally 부분
if not tHasError and tCollectedText:
    try:
        await _saveAiResponseToDb(...)
    except Exception as tSaveError:
        logger.exception("DB save failed post-stream for session %d", tSessionId)
        # 이미 done 이벤트 보냈지만 error도 추가로 송신 (프론트가 toast 표시)
        yield {
            "event": EVENT_TYPE_ERROR,
            "data": json.dumps({
                "message": "응답을 저장하지 못했습니다. 페이지를 새로고침해주세요.",
                "code": "DB_SAVE_FAILED",
            }, ensure_ascii=False),
        }
```

**Phase 3 (옵션, 선택적) — 게스트 턴 보상 감소**
```python
# P1-1 과 연계. DB save 실패했고 isGuest면 turn을 1 감소시켜 사용자 손해 방지
if tIsGuest and save_failed:
    async with async_session_maker() as tCompDb:
        await tCompDb.execute(
            update(TutoringSession)
            .where(TutoringSession.mId == tSessionId)
            .where(TutoringSession.mTotalTurns > 0)
            .values(mTotalTurns=TutoringSession.mTotalTurns - 1)
        )
        await tCompDb.commit()
```

### 검증 방법
- 단위 테스트: `async_session_maker` mock해서 commit 시 예외 발생 → 클라이언트가 error 이벤트 수신하는지 확인
- 통합: Supabase에 temp rule 걸어 INSERT 차단 후 flow 확인

### 예상 변경량
**M** (~30-40줄), 1 파일 (`sessions.py`)

### 리스크
- `generateSseEvents` 흐름 수정은 SSE 계약 변경 → 프론트 `ChatInterface`가 done 후 error를 받아 처리할 수 있어야 함 (현재 error 이벤트 처리는 있음 — `ChatInterface.tsx:319-344`)

---

## P0-3: `apiRequest` empty body → JSON.parse 크래시

### 위치
`frontend/src/lib/api.ts:124`

### 현상
```typescript
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T>
{
    // ...
    return tResponse.json() as Promise<T>;  // 빈 body면 SyntaxError
}
```

### 터지는 시나리오
- `endSession` (PATCH) — 현재는 SessionResponse JSON 반환하지만, 향후 204 No Content로 바뀌면 크래시
- 프록시/CDN이 일시적으로 빈 응답 리턴 (Render cold start 중간 끊김 등)
- 5xx 에러 이지만 본문이 JSON 아닌 HTML (Render error page)
  - 이 경우 `!tResponse.ok` 분기에서 `tResponse.json()`을 호출하는데 역시 크래시 (L109)

### Fix Approach

**방어적 empty-body 처리**:
```typescript
// api.ts apiRequest 내부 최종 return 부분
const tText = await tResponse.text();
if (!tText) {
    return null as T;  // empty body → null
}
try {
    return JSON.parse(tText) as T;
} catch (tParseError) {
    console.error("apiRequest JSON parse failed", { path, text: tText.slice(0, 200), error: tParseError });
    throw new Error(API_RESPONSE_NOT_JSON);  // 새 상수
}
```

**에러 응답 본문 파싱도 방어**:
```typescript
// L105-119 수정
if (!tResponse.ok) {
    let tErrorMessage = `HTTP ${tResponse.status}`;
    try {
        const tErrorText = await tResponse.text();
        if (tErrorText) {
            try {
                const tErrorData = JSON.parse(tErrorText);
                if (tErrorData.detail) tErrorMessage = tErrorData.detail;
            } catch {
                // HTML 등 JSON 아닌 응답. 원문 trim해서 메시지에 포함
                tErrorMessage = `${tErrorMessage}: ${tErrorText.slice(0, 100)}`;
            }
        }
    } catch {
        // text() 자체가 실패 (네트워크 끊김 등)
    }
    throw new Error(tErrorMessage);
}
```

### 검증 방법
- 수동: DevTools로 endSession 응답을 빈 body로 override → 리포트 페이지 이동 확인
- 단위: mock fetch로 `Response("", {status: 200})` 주입

### 예상 변경량
**S** (~20-30줄), 1 파일 (`api.ts`)

### 리스크
- `apiRequest<T>` 반환 타입이 `T` 에서 `T | null`로 변경됨. TypeScript strict mode에서 모든 호출처 영향. 호출처는 현재 `!== null` 체크 없이 바로 사용 중 (예: `login`, `register`). 따라서 타입을 `T | null`로 바꾸기보단, null-on-empty는 내부 처리하고 caller가 void endpoints를 별도 helper로 호출하도록 분리가 더 안전.
- 대안: 현재 모든 엔드포인트가 JSON 본문 반환하므로 empty body는 비정상 — `throw new Error(API_EMPTY_BODY)` 로 즉시 에러화. Caller가 catch해서 UX 처리.

**권장 최소 버전**: empty body → throw `"서버 응답이 비어있습니다"`. null 반환 타입 변경 안 함.

---

## P0 공통 원칙

- 각 fix는 **단일 커밋**
- 각 커밋은 roll-back 가능한 독립 단위
- Commit message: `fix(area): concise description` 스타일
- 제안 메시지:
  - `fix(ai): handle Anthropic 529 overload via APIStatusError status code`
  - `fix(sessions): surface DB save failures to client after stream completion`
  - `fix(api): defensively handle empty/non-JSON response bodies`

## 검증 순서

1. 로컬에서 각 fix 개별 적용 + 컴파일/build 확인
2. P0-1: Claude API 529 mocking (httpx mock transport)
3. P0-2: Supabase 임시 네트워크 단절 시뮬레이션 (OR DB trigger로 INSERT 차단)
4. P0-3: DevTools 응답 override
5. 3개 개별 commit → push → Render/Vercel deploy → `test_guest_race.py` 회귀 + E2E
