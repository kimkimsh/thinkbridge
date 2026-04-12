# P1 High Priority — 안정성·Silent Failure·리소스 Leak

> 엣지 케이스지만 발생 시 UX/데이터 무결성/리소스에 직접 영향.

## P1-1: CAS 증가 후 예외 → 게스트 턴 보상 감소 없음

### 위치
`backend/app/routers/sessions.py:417-437` (CAS) + `sessions.py:488-574` (generateSseEvents)

### 현상
CAS로 `mTotalTurns`를 +1 한 뒤 `db.commit()`이 L494에서 실행됨. 만약 이 사이 단계(메시지 INSERT, SSE stream 초기화 등)에서 예외 발생 시 FastAPI/`get_db`가 implicit rollback → `mTotalTurns`도 원상복귀 → 문제 없음.

**하지만** commit(L494) 이후 SSE generator에서 AI 응답을 못 받거나 stream이 중단되면:
- 턴은 이미 소모됨 (CAS commit 완료)
- 사용자는 빈 응답 + 에러 메시지
- 게스트는 5턴 중 1개를 허무하게 잃음

### Fix Approach
P0-2의 Phase 3와 통합. AI 응답 실패 확정(`tHasError = True` AND no `tCollectedText`) 시 보상 감소:

```python
# generateSseEvents 하단부
if tHasError and not tCollectedText and tIsGuest:
    # Guest turn 보상 감소 — 별도 세션으로 독립 트랜잭션
    async with async_session_maker() as tCompDb:
        try:
            await tCompDb.execute(
                update(TutoringSession)
                .where(TutoringSession.mId == tSessionId)
                .where(TutoringSession.mTotalTurns > 0)
                .values(mTotalTurns=TutoringSession.mTotalTurns - 1)
            )
            # Also delete the orphaned user message
            await tCompDb.execute(
                delete(Message).where(
                    Message.mSessionId == tSessionId,
                    Message.mTurnNumber == tTurnNumber,
                    Message.mRole == MessageRole.USER,
                )
            )
            await tCompDb.commit()
            logger.info("Compensated guest turn decrement for session %d turn %d", tSessionId, tTurnNumber)
        except Exception as tCompError:
            logger.exception("Compensation decrement failed for session %d: %s", tSessionId, tCompError)
```

### 리스크
- User 메시지 삭제가 UX 혼란 야기 가능 (사용자 화면에는 보였다가 새로고침 시 사라짐).
- **대안**: 삭제 대신 `mContent = "[시스템 오류로 처리되지 못한 메시지]"` 로 표시만 변경.
- Idempotency: 동일 compensation이 여러 번 트리거되면 `> 0` 조건으로 방어.

### 변경량
**M** (~30줄), `sessions.py`

---

## P1-2: SSE `AbortController` 미사용 → Unmount 후 스트림 계속

### 위치
`frontend/src/lib/api.ts:247-315` (`streamMessages`) + `frontend/src/components/chat/ChatInterface.tsx:189-199` (cleanup)

### 현상
`streamMessages` async generator가 `fetch`에 `signal` 미전달. ChatInterface가 unmount되어도 백엔드는 stream을 끝까지 서빙. `for await` 루프는 돌지만 setState는 "Can't perform a React state update on unmounted component" 경고 후 무시.

### 문제
1. Claude API 비용: 사용자가 페이지 이탈 후에도 응답 생성 계속
2. Render 연결 리소스: NullPool + Session mode Pooler로 DB connection 유지
3. React warning 발생 (dev 모드), StrictMode 더블마운트 시 특히

### Fix Approach

**api.ts 수정**:
```typescript
// signal 파라미터 추가
export async function* streamMessages(
    sessionId: number,
    content: string,
    token: string,
    signal?: AbortSignal,  // 신규
): AsyncGenerator<SSEEvent>
{
    const tResponse = await fetch(`${API_URL}/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { ... },
        body: JSON.stringify({ content }),
        signal,  // 전달
    });
    // ...
    while (true)
    {
        if (signal?.aborted) {
            tReader.cancel();
            break;
        }
        const { done, value } = await tReader.read();
        // ...
    }
}
```

**ChatInterface.tsx 수정**:
```typescript
const mAbortRef = useRef<AbortController | null>(null);

const handleSend = async (content: string) => {
    // 이전 stream 중단
    mAbortRef.current?.abort();
    mAbortRef.current = new AbortController();
    try {
        for await (const tEvent of streamMessages(sessionId, content, token, mAbortRef.current.signal)) {
            // ...
        }
    } catch (error) {
        if (error.name === 'AbortError') return;  // 정상 abort
        // 다른 에러 처리
    }
};

useEffect(() => {
    return () => {
        mAbortRef.current?.abort();
    };
}, []);
```

### 검증 방법
- DevTools Network 탭에서 대화 시작 후 페이지 이동 → fetch가 cancelled 되는지 확인
- React console warning 사라지는지 확인

### 변경량
**S** (~15-20줄), 2 파일 (`api.ts`, `ChatInterface.tsx`)

### 리스크
- Stream 중간 abort 시 백엔드 `_saveAiResponseToDb`는 여전히 호출되나 `tCollectedText`가 완성되지 않아 부분 응답이 저장될 수 있음 — 현재 로직 그대로 유지 (부분 응답도 기록 가치 있음)

---

## P1-3: `DEFAULT_ANALYSIS` Fallback 플래그 없음 → 리포트 오염

### 위치
`backend/app/services/ai_engine.py:42-52` (DEFAULT_ANALYSIS 정의) + 사용처 L247-249, L471-480 + `backend/app/models/thought_analysis.py`

### 현상
Claude가 `analyze_thinking` tool을 호출하지 않거나 JSON 파싱 실패 시, `DEFAULT_ANALYSIS`로 폴백:
```python
DEFAULT_ANALYSIS = {
    "problem_understanding": 5,
    "premise_check": 5,
    # ... all 5s
    "socratic_stage": 1,
    "engagement_level": "active",
}
```

이게 DB에 저장되고, 리포트/히트맵/관리자 대시보드에서 **실제 분석 결과와 구분 없이** 집계됨.

### 문제
- 실제 5점은 "중간 수준" 의미. Fallback 5점은 "데이터 없음" 의미. 이걸 혼동하면 리포트 왜곡.
- 관리자가 "학생 평균 5.0점"을 볼 때 fallback 비율이 높을수록 의미 상실.

### Fix Approach

**Phase 1 — 로깅 강화 (즉시, 무-스키마-변경)**:
```python
# ai_engine.py _validateAnalysis 또는 fallback 사용처
logger.warning(
    "Using DEFAULT_ANALYSIS fallback for session %s turn %d (reason: %s)",
    session_id, turn_number, fallback_reason,  # "tool_not_called" / "json_parse_failed" / "timeout"
)
```

**Phase 2 — 모델 확장 (권장)**:
```python
# ThoughtAnalysis 모델에 컬럼 추가
mIsFallback: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
mFallbackReason: Mapped[str | None] = mapped_column(String(50), nullable=True)
```

```python
# Migration 없이 기존 DB 호환하려면 default=False만 지정. 기존 로우는 False (non-fallback)로 간주.
# Supabase는 ALTER TABLE 실행 필요
```

**Phase 3 — 집계에서 제외 or 마커 표시**:
```python
# reports.py, dashboard.py, admin.py의 평균 계산 시
.where(ThoughtAnalysis.mIsFallback == False)  # 또는 UI에 "⚠️ 일부 턴 데이터 누락" 배지
```

### 공모전 관점
- AI 리포트에 "3-stage fallback 작동 지점 N회 관찰" 를 포함하면 오히려 엔지니어링 성숙도 어필 가능

### 변경량
**M** (~40줄 + Supabase ALTER TABLE), 3 파일

### 리스크
- DB 스키마 변경은 프로덕션 다운타임 가능성 있음 → Supabase SQL Editor에서 `ALTER TABLE thought_analysis ADD COLUMN mIsFallback BOOLEAN DEFAULT FALSE;` 단일 쿼리로 해결
- 프로덕션 배포 직후 기존 데이터는 모두 `mIsFallback=False` — 과거 fallback 기록은 유실 (회복 불가)

---

## P1-4: Streaming Retry Fallback의 Canned Text 주입

### 위치
`backend/app/services/ai_engine.py:484-517`

### 현상
스트리밍 중 text block 없이 tool_use만 오는 경우 (모델 드물게 발생), non-streaming retry 1회 시도. retry도 실패하면:
```python
FALLBACK_RESPONSE_TEXT = "좋은 질문이에요! 조금 더 생각해볼까요?..."
yield {"type": "token", "data": FALLBACK_RESPONSE_TEXT}
```

이 가짜 응답이 Message 로우로 DB 저장됨. 같은 세션에서 여러 번 발생하면 동일 텍스트 반복 → 리포트 narrative 생성 시 의미 없는 반복.

### 문제
- Claude가 실제로 그런 말을 한 게 아닌데 대시보드에 기록
- 사용자는 AI가 그런 답변을 한 것으로 오해
- 지표 왜곡 (Tool Use 실패율이 숨겨짐)

### Fix Approach

**방안 A — Error 이벤트로 변경**:
```python
except Exception as tRetryError:
    logger.error("Streaming retry failed: %s", tRetryError)
    yield {
        "type": "error",
        "data": {"message": "AI 응답을 받지 못했습니다. 다시 시도해주세요.", "code": "AI_EMPTY_RESPONSE"},
    }
    return  # fallback yield 하지 않음
```

**방안 B — Fallback 저장 시 `is_fallback=True` 플래그 + 메시지 내용 변경**:
```python
# 명시적으로 fallback임을 표시
FALLBACK_RESPONSE_TEXT = "[시스템: AI 응답 생성 실패. 다시 시도해주세요.]"
```

**권장**: A + P1-3의 fallback 플래그 병행. Retry가 1회 실패했으니 사용자에게 솔직히 알리고 다음 턴으로 넘어가게 함.

### 변경량
**S** (~10줄), `ai_engine.py`

### 리스크
- 프론트의 error 이벤트 처리 로직이 이미 존재(ChatInterface) → 호환됨
- 사용자 경험: "AI가 멍청한 답변" 보다 "시스템 일시 오류 + 재시도 안내"가 신뢰감 높음

---

## P1-5: `processTurn` Non-Streaming `raise tLastError=None` 가능

### 위치
`backend/app/services/ai_engine.py:295-331`

### 현상
```python
tLastError = None
for tAttemptCount in range(MAX_RETRY_COUNT + 1):
    try:
        # API call
    except anthropic.APITimeoutError as tError:
        tLastError = tError
    except anthropic.APIError as tError:
        tLastError = tError
# 루프 종료 후
if tLastError:
    raise tLastError  # ← APIError 계열 아닌 예외는 여기까지 오지 못함
else:
    raise RuntimeError(...)  # ← 그런데 `tLastError = None` 상태에서 raise tLastError 경로로 오면?
```

실제 코드 확인 필요하지만, exception handling gap 있으면 `raise None` → `TypeError: exceptions must derive from BaseException`로 마스킹.

### Fix Approach
```python
tLastError: Exception | None = None
for tAttemptCount in range(MAX_RETRY_COUNT + 1):
    try:
        # API call
    except anthropic.APITimeoutError as tError:
        tLastError = tError
    except anthropic.APIError as tError:
        tLastError = tError
    except Exception as tError:  # catch-all 추가 (현재 누락 가능)
        tLastError = tError
        logger.exception("Unexpected error in processTurn attempt %d", tAttemptCount)
        break  # 재시도 가치 없는 에러는 즉시 종료

if tLastError is None:
    raise RuntimeError("All processTurn attempts exhausted with no captured exception")
raise tLastError
```

### 변경량
**S** (~8줄)

### 리스크
- `processTurn`은 현재 production 경로에서 직접 호출되지 않음(streaming만 사용) → 리스크 낮음. 그래도 safety net.

---

## P1-6: `generateSseEvents` Bare `except Exception`

### 위치
`backend/app/routers/sessions.py:548-558`

### 현상
```python
except Exception as tError:
    logger.error("Unexpected streaming error for session %d: %s", tSessionId, tError)
    tHasError = True
    yield {
        "event": EVENT_TYPE_ERROR,
        "data": json.dumps({"message": "스트리밍 중 오류가 발생했습니다."}, ensure_ascii=False),
    }
```

### 문제
1. `asyncio.CancelledError` 포함 — 클라이언트 disconnect 시 정상 cancel을 에러로 분류
2. `logger.error` → traceback 안 찍힘. Root cause 파악 불가 (`logger.exception`이 필요)
3. 모든 에러가 같은 generic 메시지 → 운영자 진단 어려움

### Fix Approach
```python
except asyncio.CancelledError:
    logger.info("Client disconnected during streaming for session %d", tSessionId)
    raise  # propagate cancellation
except anthropic.APIError as tApiError:
    logger.exception("Anthropic API error during streaming for session %d", tSessionId)
    tHasError = True
    yield {
        "event": EVENT_TYPE_ERROR,
        "data": json.dumps({
            "message": "AI 서비스 일시 오류입니다. 잠시 후 다시 시도해주세요.",
            "code": "AI_API_ERROR",
        }, ensure_ascii=False),
    }
except Exception as tError:
    logger.exception("Unexpected streaming error for session %d", tSessionId)  # exception (stacktrace)
    tHasError = True
    yield {
        "event": EVENT_TYPE_ERROR,
        "data": json.dumps({
            "message": "스트리밍 중 예상치 못한 오류가 발생했습니다.",
            "code": "STREAM_UNEXPECTED",
        }, ensure_ascii=False),
    }
```

### 변경량
**S** (~15줄)

### 리스크
- `asyncio.CancelledError` re-raise가 EventSourceResponse cleanup에 영향 줄 수 있음 — `sse_starlette` 동작 재확인 필요. 일반적으로는 재-raise가 정상.

---

## P1-7: 프론트 `parseSSEBuffer` JSON.parse 실패 Silent

### 위치
`frontend/src/lib/api.ts:210-237`

### 현상
```typescript
try {
    const tParsedData = JSON.parse(tDataStr);
    // ...
} catch {
    // JSON 파싱 실패 시 해당 이벤트 무시  ← 로그 없음
}
```

### 문제
- 네트워크 중간에 일부 바이트 손실되어 JSON이 깨진 경우 → 토큰/분석 결과 사일런트 누락
- 디버깅 불가 (console에도 흔적 안 남음)
- 반복 발생 시 사용자는 "응답이 잘렸다"고만 느낌

### Fix Approach
```typescript
catch (tParseError) {
    console.warn("SSE event JSON parse failed", {
        eventType: tEventType,
        dataPreview: tDataStr.slice(0, 100),
        error: tParseError instanceof Error ? tParseError.message : String(tParseError),
    });
    // 누적 실패 횟수 카운트 → 임계치 초과 시 error event 합성
    tParseFailureCount += 1;
    if (tParseFailureCount > SSE_PARSE_FAILURE_THRESHOLD) {
        tEvents.push({
            type: "error",
            data: { message: "응답 처리 중 여러 오류가 발생했습니다. 새로고침 해주세요." },
        });
    }
}
```

### 변경량
**S** (~15줄), 1 파일

### 리스크
- `console.warn`은 프로덕션 사용자에게는 보이지 않음 — Sentry 같은 원격 로깅 없이는 운영자도 모름. 최소한 로컬/개발 디버깅엔 유용.

---

## P1-8: Guest/Demo 로그인 에러 Silent

### 위치
- `frontend/src/app/page.tsx:182-194` (handleGuestTrial + handleDemoLogin)
- `frontend/src/app/login/page.tsx:85-96` (demo quick login)

### 현상
```typescript
const handleGuestTrial = async () => {
    setIsGuestLoading(true);
    try {
        await loginAsGuest();
        router.push("/student/chat");
    } catch {
        // 에러 무시
    } finally {
        setIsGuestLoading(false);
    }
};
```

### 문제
- 백엔드 cold start 지연, rate limit, CORS 실패 시 사용자는 스피너 → 자연 종료만 봄
- 데모 시연에서 **가장 중요한 CTA**가 침묵 실패

### Fix Approach
```typescript
const handleGuestTrial = async () => {
    setIsGuestLoading(true);
    setError(null);  // 신규 state
    try {
        await loginAsGuest();
        router.push("/student/chat");
    } catch (tError) {
        const tMessage = tError instanceof Error ? tError.message : "게스트 체험 시작에 실패했습니다";
        setError(tMessage);
        console.error("Guest login failed", tError);
    } finally {
        setIsGuestLoading(false);
    }
};

// 렌더링 부분에 error banner 추가
{mError && (
    <div className="fixed top-20 right-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded">
        {mError}
        <button onClick={() => setError(null)}>닫기</button>
    </div>
)}
```

### 변경량
**S** (~30줄), 2 파일

### 리스크
- 에러 UI가 hero 섹션과 시각적 충돌 가능 — toast (sonner) 활용이 더 깔끔하면 그쪽으로 변경. shadcn/ui에 Sonner 이미 있음.

---

## P1 공통 실행 전략

**묶음 커밋 가능 조합**:
- P1-1 + P1-4 (compensation + streaming retry): 같은 파일 (`sessions.py`, `ai_engine.py`)
- P1-5 + P1-6 (exception handling refinement): `ai_engine.py` + `sessions.py`
- P1-7 + P1-8 (frontend silent failures): `api.ts`, `page.tsx`, `login/page.tsx`

**검증 우선순위**:
1. P1-2 (AbortController) — DevTools로 즉시 확인 가능
2. P1-8 (Guest login 에러 표시) — 의도적 백엔드 다운 시뮬레이션
3. P1-6 (generateSseEvents bare except) — `logger.exception` 변환만 해도 운영성 향상

**리스크 평가**:
- P1-3 (DEFAULT_ANALYSIS 플래그)는 스키마 변경 포함 — 가장 큰 변경량. 별도 독립 commit 필수.
