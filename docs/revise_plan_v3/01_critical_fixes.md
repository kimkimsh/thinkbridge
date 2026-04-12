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
2. Python이 **런타임 예외 발생 후 `except anthropic.OverloadedError` 절의 속성을 resolve 하려 할 때** `AttributeError` 발생 (import 시점이나 함수 정의 시점이 아님)
3. 이 `AttributeError`가 `processTurnStreaming` 밖으로 전파
4. `generateSseEvents`의 bare `except Exception`이 잡고 "스트리밍 중 오류가 발생했습니다" 일반 메시지 반환
5. **재시도 로직은 절대 실행 안 됨** (catch 지점을 지나지도 못함)

검증 확인: `AttributeError: module 'anthropic' has no attribute 'OverloadedError'` 실제 재현 완료 (Agent 검증, 2026-04-12).

### Root Cause
SDK 0.34.2 실제 exception classes:
```
APIConnectionError, APIError, APIResponseValidationError, APIStatusError,
APITimeoutError, AnthropicError, AuthenticationError, BadRequestError,
ConflictError, InternalServerError, NotFoundError, PermissionDeniedError,
RateLimitError, UnprocessableEntityError
```

SDK 내부 매핑 (`anthropic/_client.py:317` 근처):
```python
if response.status_code >= 500:
    return InternalServerError(...)
```

즉 **529는 `InternalServerError` (APIStatusError의 서브클래스)** 로 올라옴. `BetaOverloadedError`는 `anthropic.types`에만 존재하며 런타임 예외 클래스가 아님.

Anthropic 공식 docs (`https://docs.anthropic.com/en/api/errors`) 기준 529 = `overloaded_error` 공식 코드.

### Fix Approach

```python
# ai_engine.py — except 블록 교체

# Before
except anthropic.OverloadedError as tError:
    # overload retry logic

# After (narrow target — 5xx만 포착, 4xx 영향 없음)
except anthropic.InternalServerError as tError:
    tStatus = getattr(tError, 'status_code', None)
    if tStatus == OVERLOAD_STATUS_CODE:
        # 기존 overload retry 로직 유지
        ...
    else:
        # 기타 5xx (502/503/504)은 즉시 에러 이벤트
        raise
```

추가 constants (기존에 `OVERLOAD_RETRY_COUNT = 2`, `OVERLOAD_RETRY_DELAY_SECONDS = 3`은 `ai_engine.py:74-75`에 이미 존재):
```python
OVERLOAD_STATUS_CODE = 529
RATE_LIMIT_STATUS_CODE = 429
```

### P1-1과 연계 (RateLimitError 포함)
429도 동일 retry loop 포함 권장. 현재 `ai_engine.py:385-391`에서는 즉시 에러 반환:
```python
except anthropic.InternalServerError as tError:
    tStatus = getattr(tError, 'status_code', None)
    if tStatus == OVERLOAD_STATUS_CODE:
        # exponential backoff retry
        ...
except anthropic.RateLimitError as tError:
    # 429 — retry-after 헤더 참조 가능
    # 동일 backoff 정책 적용
    ...
```

**선택 근거**: `APIStatusError` (4xx 부모)보다 `InternalServerError` (5xx 전용)가 더 정확함. AuthenticationError 등 4xx를 잘못 retry하지 않음.

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
`backend/app/routers/sessions.py:560-574` (`generateSseEvents` finally 부분, 2026-04-12 검증 기준) + `sessions.py:641-647` (`_saveAiResponseToDb` except)

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

**Phase 1 — 에러 메시지 승급 + caller에서 포착**

**참고**: `_saveAiResponseToDb`는 이미 L647에 `raise`가 있음 (검증 완료). 문제는 caller(`generateSseEvents`)가 except로 잡아 로그만 찍고 삼키는 것. 따라서 Phase 1은 "re-raise 추가"가 아니라 "**로그 메시지 승급 + caller에서 error event yield**" 순으로 변경:

```python
# _saveAiResponseToDb 내 (로그 승급만)
except Exception as tSaveError:
    logger.exception(
        "CRITICAL: AI response DB save failed for session %d, turn %d. "
        "Client-side state may diverge from DB.",
        sessionId, turnNumber,
    )
    raise  # 기존 raise 유지
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

**프론트 호환성 검증**: `ChatInterface.tsx:313-316`이 이미 server error event 핸들링 (`setErrorMessage`). Plan 초안이 참조한 `319-344`는 catch 블록이고, server error는 313-316 경로. 둘 다 있어서 호환 OK.

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

### 터지는 시나리오 (현실성 순)
- **5xx 에러이면서 본문이 JSON 아닌 HTML** (Render free tier sleeping 시 502/503 HTML 반환) — **가장 현실적**. 이 경우 `!tResponse.ok` 분기의 `tResponse.json()` 호출(L109)에서 크래시
- 프록시/CDN이 일시적으로 빈 응답 리턴 — 발생 시 fetch 자체가 reject되므로 `.json()` 도달 전 catch 필요
- ~~`endSession` 204 No Content~~ — 현재 FastAPI가 `response_model=SessionResponse`로 JSON 강제 중이라 **실제 발생 불가**. 향후 API 변경 대비만 의미 있음.

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
**S** (~20-30줄), 1 파일 (`api.ts`), **2 위치 (`apiRequest` + `streamMessages` error path L267)**

`streamMessages` 내부의 에러 응답 파싱(L267)도 동일한 `.json()` 직접 호출 패턴 → 같이 수정.

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
