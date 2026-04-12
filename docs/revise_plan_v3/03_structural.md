# P2 Structural — 구조/알고리즘 개선

> 기술 부채 성격. 오늘 밤 범위에서 선별 적용 가능. 큰 리팩터는 defer(backlog).

## P2-1: `Message (sessionId, turnNumber, role)` Unique Constraint 부재

### 위치
`backend/app/models/message.py`

### 현상
현재 Message 테이블에 unique constraint 없음. `_saveAiResponseToDb`가 재시도/race에 의해 중복 호출되면 같은 session·turn·role 조합이 복수 행 생성 가능.

### 영향
- 리포트 집계 시 이중 계산 (Analysis가 두 개 붙어 있으면 점수 평균 왜곡)
- `_buildSessionHistory`에서 중복 메시지 Claude에 전송 → context 낭비

### Fix Approach

**Option A — 코드 레벨 defensive check (권장, 공모전 기한)**:
```python
# _saveAiResponseToDb 시작 부분
tExistingCheck = await tDb.execute(
    select(Message.mId)
    .where(Message.mSessionId == sessionId)
    .where(Message.mTurnNumber == turnNumber)
    .where(Message.mRole == MessageRole.ASSISTANT)
)
if tExistingCheck.scalar_one_or_none() is not None:
    logger.warning("Assistant message already exists for session %d turn %d; skipping INSERT", sessionId, turnNumber)
    return
```

**Option B — DB 레벨 unique constraint (정석)**:
```python
# message.py 모델 수정
class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint("m_session_id", "m_turn_number", "m_role", name="uq_message_session_turn_role"),
    )
    # ...
```

`create_all()`은 기존 테이블에 constraint 추가 안 함 → Supabase에서 `ALTER TABLE messages ADD CONSTRAINT ...` 직접 실행 필요.

### 권장
**Option A 지금**, Option B는 post-submission migration에서.

### 변경량
- A: S (~10줄), 1 파일
- B: M (Supabase SQL + 모델 수정)

---

## P2-2: `endSession` + `generateSessionReport` 분리된 트랜잭션 경계

### 위치
`backend/app/routers/sessions.py:650-717` (endSession, **검증 정정: Plan 초안 690-716은 40줄 drift**) + `backend/app/routers/reports.py:111-126` (lazy report gen)

### 현상
- `endSession`에서 session status=completed 커밋 후 `generateSessionReport(sessionId, db=db)` 호출
- 실패 시 except Exception으로 흡수 (세션 종료는 성공)
- `getSessionReport`가 나중에 호출되면 report 없는 경우 auto-create 시도
- `Report.mSessionId`에 unique constraint 있음 → 동시 auto-create 시 IntegrityError

### Race 시나리오
1. 사용자 A: `endSession` → report gen 시도 중 네트워크 에러
2. 사용자 A: `getSessionReport` → auto-create 시도
3. 사용자 A (다른 탭): `getSessionReport` → 동시 auto-create 시도
4. 한 쪽이 IntegrityError → 500 에러
5. A가 새로고침하면 이번에는 이미 존재하는 report 조회 → 200

### Fix Approach

**단순화 — `endSession`만 report를 확정 생성**:
```python
# endSession 내부
try:
    from app.services.report_generator import generateSessionReport
    await generateSessionReport(sessionId=sessionId, db=db)
except Exception as tReportError:
    logger.exception("Report generation failed for session %d", sessionId)
    # 세션 종료는 이미 커밋됨. Report는 나중에 수동 재생성 필요.
    # 프론트에 알림: 세션 종료는 성공이나 report pending
```

```python
# getSessionReport 단순화 — auto-create 제거
@router.get("/session/{session_id}")
async def getSessionReport(session_id: int, ...):
    tResult = await db.execute(select(Report).where(Report.mSessionId == session_id))
    tReport = tResult.scalar_one_or_none()
    if tReport is None:
        raise HTTPException(
            status_code=404,
            detail="리포트가 아직 생성되지 않았습니다. 잠시 후 다시 시도해주세요."
        )
    return _buildReportResponse(tReport)
```

**또는 `INSERT ... ON CONFLICT DO NOTHING` 스타일**:
```python
# auto-create 유지하되 race-safe
tInsertStmt = insert(Report).values(...)
tInsertStmt = tInsertStmt.on_conflict_do_nothing(index_elements=['m_session_id'])
await db.execute(tInsertStmt)
# 이후 SELECT로 다시 로드
```

### 권장
단순화 방안 (getSessionReport에서 auto-create 제거).  
**프론트 영향**: `report/[id]/page.tsx`에 retry 로직 추가 (P1 level 개선안과 연계).

### 변경량
**M** (~30줄), 2 파일

---

## P2-3: `socraticStage` 0/undefined 방어 부족 (Frontend)

### 위치
`frontend/src/components/chat/ThoughtPanel.tsx:230` (`STAGE_LABELS[analysis.socraticStage - 1]`, raw — fallback 없음), `ChatInterface.tsx:287` (**검증 정정: 286-288 → 287 단일 라인, `setCurrentStage(tEvent.data.socraticStage)`**), `ThoughtTimeline.tsx:141` (이미 nullish-coalescing fallback 있음 — 이 파일은 수정 불필요)

### 현상
- 백엔드 분석이 tool_use 못 부른 경우 (DEFAULT_ANALYSIS의 socratic_stage=1이라 괜찮지만) 또는 수동 SSE 테스트 등으로 0/null이 올 수 있음
- `STAGE_LABELS[-1]` = `undefined` → 빈 라벨 or `.toString()` 에러

### Fix Approach

**Constants**:
```typescript
// lib/constants.ts
const DEFAULT_SOCRATIC_STAGE = 1;
const MIN_SOCRATIC_STAGE = 1;
const MAX_SOCRATIC_STAGE = STAGE_LABELS.length;  // 5

function clampSocraticStage(stage: number | undefined | null): number {
    if (typeof stage !== 'number' || isNaN(stage)) return DEFAULT_SOCRATIC_STAGE;
    return Math.max(MIN_SOCRATIC_STAGE, Math.min(MAX_SOCRATIC_STAGE, Math.floor(stage)));
}
```

**사용처 수정**:
```typescript
// ChatInterface.tsx
setCurrentStage(clampSocraticStage(data.socraticStage));

// ThoughtPanel.tsx
const tStageIndex = clampSocraticStage(analysis.socraticStage) - 1;
const tStageLabel = STAGE_LABELS[tStageIndex];
```

### 변경량
**S** (~15줄), 3 파일

### 리스크 없음 — 순수 방어적 코드

---

## P2-4: `app/error.tsx` → `app/global-error.tsx` 승격

### 위치
`frontend/src/app/error.tsx`

### 현상 (검증 정정)
`frontend/src/app/error.tsx`의 컴포넌트 이름은 이미 **`GlobalError`** (의도는 global)이지만, Next.js App Router는 **파일 경로**로 route 역할을 결정함. `app/error.tsx`는 여전히 root segment 수준만 포착, root layout 자체 에러는 놓침.

Next.js 14 App Router 규칙:
- `app/error.tsx`: route segment 하위 에러만 포착 (컴포넌트 이름 무관)
- `app/global-error.tsx`: root layout 포함 모든 에러 포착. 단, `<html><body>` 래퍼 필요.

### Fix Approach
```typescript
// frontend/src/app/global-error.tsx (신규 파일)
"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global error:", error);
    }, [error]);

    return (
        <html lang="ko">
            <body>
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            심각한 오류가 발생했습니다
                        </h1>
                        <p className="text-gray-600 mb-6">
                            페이지를 새로고침하거나 홈으로 돌아가주세요.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded">
                                다시 시도
                            </button>
                            <a href="/" className="px-4 py-2 bg-gray-200 rounded">홈으로</a>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
```

기존 `error.tsx`는 유지 (segment-level 에러 처리).

### 변경량
**S** (~30줄), 1 새 파일

### 리스크 없음 — 추가만, 기존 동작 변경 없음

---

## P2-5: `useSearchParams` Suspense Boundary

### 위치
`frontend/src/app/student/chat/page.tsx:11, 106, 110, 118`

### 현상
Next.js 14 App Router에서 `useSearchParams`를 쓰는 client component는 Suspense boundary로 감싸야 함. 안 그러면:
- Production build에서 해당 경로 전체가 **dynamic rendering**으로 전락
- 또는 "useSearchParams() should be wrapped in a suspense boundary" 경고

### 영향
- 빌드 경고 지속
- SEO/정적 생성 효과 감소 (학생 chat은 동적이니 큰 문제는 아님)
- 향후 Next.js 업데이트 시 에러로 승격 가능성

### Fix Approach
```typescript
// chat/page.tsx 구조 재편
"use client";

import { Suspense } from "react";

function ChatPageInner() {
    // 기존 useSearchParams 사용 컴포넌트 로직
}

export default function ChatPage() {
    return (
        <Suspense fallback={<ChatSkeleton />}>
            <ChatPageInner />
        </Suspense>
    );
}
```

### 변경량
**S** (~20줄), 1 파일

---

## P2-6: Hint 버튼이 User 메시지 Inflate

### 위치
`frontend/src/components/chat/ChatInterface.tsx:374-389` (handleHintRequest)

### 현상
```typescript
const handleHintRequest = () => {
    const tLastUserMessage = messages.reverse().find(m => m.role === "user");
    if (tLastUserMessage) {
        handleSend(`[힌트 요청] ${tLastUserMessage.content}`);
    }
};
```

힌트 요청 시 "직전 사용자 메시지 전체 + [힌트 요청] prefix"를 **새 user 메시지로** 보냄. 결과:
- DB에 동일 user 메시지 중복 저장
- Turn number +1 소모 → **게스트는 5턴 한도 조기 소진**

### Fix Approach

**Phase 1 — Prefix만 보내기**:
```typescript
const handleHintRequest = () => {
    // 백엔드가 [힌트 요청] prefix를 감지하면 직전 턴 context를 가져와 처리
    handleSend(`[힌트 요청]`);
};
```

**Phase 2 — 백엔드 조정**:
```python
# sessions.py HINT_REQUEST_PREFIX 처리
tIsHintRequest = tActualContent.startswith(HINT_REQUEST_PREFIX)
if tIsHintRequest:
    # 직전 user 메시지를 세션 히스토리에서 가져옴
    tLastUserMsg = next(
        (m for m in reversed(tSortedMessages) if m.mRole == MessageRole.USER),
        None,
    )
    tOriginalQuery = tLastUserMsg.mContent if tLastUserMsg else ""
    tActualContent = f"{STUCK_DETECTION_INSTRUCTION}\n\n{tOriginalQuery}"
    # 또는 힌트 자체가 턴을 소모하지 않도록 tNewTurnNumber를 기존 turn으로 유지
```

**하지만** CAS 증가가 이미 일어난 상태라 turn을 안 세는 건 복잡. 대신:
- Frontend: hint 버튼 UI에 "이 요청은 1턴을 소모합니다" 명시 (변경 최소)
- 또는 Frontend: hint 버튼은 기존 메시지에 대한 additional context만 요청, **새 user 메시지 생성 금지**, 기존 assistant 메시지에 추가 힌트 섞어 표시 (복잡)

### 권장
**공모전 기한 내**: UI 경고 추가 ("1턴 소모됩니다")만.
**Post-submission**: 힌트를 별도 endpoint로 분리 (`POST /sessions/{id}/hint`)하여 턴 무소모.

### 변경량
- 단순: XS (1줄 UI 추가)
- 구조 개선: M (별도 endpoint 필요)

---

## P2-7: `_detectStuckState` Stage Decrement 미구현

### 위치
`backend/app/routers/sessions.py:183-211` (`_detectStuckState`) + `sessions.py:473-478` (**검증 정정: STUCK_DETECTION_INSTRUCTION prepend 라인. Plan 초안 457-478은 부정확**) + `backend/CLAUDE.md:177-183` (docs)

### 현상
`backend/CLAUDE.md`가 명시:
> "If engagement_level == 'stuck' for 2 consecutive turns:
>   → Force socratic_stage down by 1"

실제 코드는:
- `_detectStuckState`가 True 반환하면 `STUCK_DETECTION_INSTRUCTION` 프롬프트 prepend만 수행
- **socratic_stage 강제 감소 로직 없음**
- 즉, 문서와 구현이 다름 — docs/work_log에도 명시 안 됨

### 선택지

**Option A — 문서 수정 (현실 반영)**:
```markdown
# backend/CLAUDE.md 수정
- If engagement_level == "stuck" for 2 consecutive turns:
    → Prepend STUCK_DETECTION_INSTRUCTION to next user prompt
    → AI re-interprets context and provides more concrete hint
    (Stage value itself not forcibly decremented; current impl relies on Claude's judgment)
```

**Option B — 구현 추가 (문서 의도 실현)**:
```python
# sessions.py sendMessage 또는 processTurnStreaming에 stage decrement 주입
# 구현은 복잡: 다음 턴의 analysis 결과를 후처리해야 함
```

### 권장
**Option A (문서 수정)**. 현재 구현도 기능적으로 유의미 — 프롬프트 조정만으로 stuck 상태 개선 가능. Stage 강제 감소는 AI 판단을 무시하는 거라 오히려 비생산적일 수 있음.

### 변경량
**XS** (~5줄, 문서만)

---

## P2 공통 전략

**오늘 밤 적용 권장**: P2-3 (socraticStage 방어), P2-4 (global-error), P2-5 (Suspense)
**내일 새벽 적용 고려**: P2-1 (Message unique check), P2-2 (report gen 단순화)
**문서만 수정**: P2-7
**Post-submission**: P2-6 (hint 구조 변경)

**코드 변경 없는 항목**: P2-7 (docs만) — 가장 안전
**코드 변경 큰 항목**: P2-2 (트랜잭션 경계 재편) — 신중히
