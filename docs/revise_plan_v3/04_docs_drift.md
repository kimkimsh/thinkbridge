# 문서 Drift — 코드와 불일치한 문서 수정

> 문서가 코드와 다르면 다음 엔지니어가 속음. 제출 AI 리포트 정확도도 훼손.
> 이 문서 자체는 기능 추가 아님 — 정확성 복구.

## DOC-1: Admin P1 vs P2 상반된 기술 (3개 파일)

### 위치
- `docs/revise_plan_v2/review-summary-v2.md:26` — "Admin → P2"
- `docs/revise_plan_v2/thinkbridge-design-v3.md:13` — Admin P1로 표기
- `docs/revise_plan_v2/thinkbridge-plan-v3.md:511` — "Admin=P2"

실제 구현은 **P1 완성**: `backend/app/routers/admin.py` + `frontend/src/app/admin/dashboard/page.tsx` 모두 존재, 프로덕션에서 동작 중.

### Fix
`thinkbridge-plan-v3.md:511`의 "Admin=P2"를 P1으로 수정. `review-summary-v2.md`의 P2 demote 기록을 "reconsidered — Admin remained P1 per final implementation"로 annotation.

### 변경량
**XS** — 3개 파일 각 1-2줄 수정

---

## DOC-2: `frontend/CLAUDE.md`의 `parseSSEBuffer` 예시 코드가 CRLF 버그 有 구버전

### 위치
`frontend/CLAUDE.md:103-124`

### 현상
문서의 illustrative 코드:
```typescript
const lines = buffer.split('\n');  // ← CRLF 처리 안 함
```

실제 구현 (`api.ts:41-46`):
```typescript
const SSE_EVENT_BOUNDARY_REGEX = /\r\n\r\n|\r\r|\n\n/;
const SSE_LINE_SPLIT_REGEX = /\r\n|\r|\n/;
```

`sse_starlette`가 `\r\n\r\n` 종결자를 사용하므로 `\n`만 split하면 event 파싱 실패. `docs/bug_fix/v1/bug_report.md`에서 이미 이 버그를 고쳤음.

### 위험
새 엔지니어가 `frontend/CLAUDE.md`의 예시를 참조 구현하면 **CRLF 버그 재발**.

### Fix
`frontend/CLAUDE.md`의 예시 코드를 실제 구현의 regex 기반 버전으로 교체. 또는 예시 생략하고 `api.ts` 참조만:
```markdown
실제 구현은 `frontend/src/lib/api.ts:parseSSEBuffer` 참조.
CRLF 종결자 (`\r\n\r\n`) 포함 모든 SSE spec 변종을 regex로 처리함.
```

### 변경량
**S** (~20줄)

---

## DOC-3: v3 Spec 문서가 FOR UPDATE 기술 (실제는 CAS)

### 위치
`docs/superpowers/specs/2026-04-12-sse-and-guest-race-hardening-design.md` §4.2

### 현상
Spec 문서가 Fix #5를 `SELECT ... FOR UPDATE` 접근법으로 기술하고 있으나, 실제 프로덕션은 CAS (`UPDATE ... WHERE mTotalTurns < 5 ... RETURNING`)로 배포됨 (`work_log/09`에서 전환 기록).

### 위험
- 누군가 spec만 보고 FOR UPDATE를 "올바른 패턴"으로 오해
- Post-submission에서 같은 env (SQLAlchemy async + pooler)에 FOR UPDATE 시도 시 동일 실패 반복

### Fix
Spec 문서 §4.2에 "SUPERSEDED" 박스 추가:
```markdown
> **⚠️ SUPERSEDED 2026-04-12**: 실 프로덕션에서 SELECT FOR UPDATE가 SQLAlchemy async + NullPool + Supabase Pooler 조합에서 동시 요청을 직렬화하지 못함을 실측. 구현은 atomic UPDATE ... RETURNING (CAS) 패턴으로 대체 (커밋 e1db1c5).
> 자세한 내용: `docs/work_log/09_sse_and_race_hardening.md` §CAS 재설계 섹션.
```

그리고 §4.2 본문은 그대로 유지 (역사적 기록으로 가치 有).

### 변경량
**XS** (~10줄 annotation)

---

## DOC-4: `SSEEvent` 타입에 "error" Variant 누락

### 위치
`frontend/CLAUDE.md:385-388`

### 현상
```typescript
interface SSEEvent {
    type: "token" | "analysis" | "done";  // "error" 없음
    data: ...;
}
```

실제 코드 `frontend/src/types/index.ts` 및 `api.ts:225-228`에서 "error" 이벤트를 yield. 백엔드도 `EVENT_TYPE_ERROR`로 송신.

### 위험
- 새 엔지니어가 타입 정의만 보고 error 이벤트 처리 누락
- TypeScript 컴파일러가 error 이벤트를 "unknown" 처리 → 런타임 오류 가능

### Fix
```typescript
interface SSEEvent {
    type: "token" | "analysis" | "done" | "error";
    data: string | ThoughtAnalysis | Record<string, never> | ErrorEventData;
}

interface ErrorEventData {
    message: string;
    code?: string;  // 선택적: AI_API_ERROR, STREAM_UNEXPECTED 등
}
```

`frontend/CLAUDE.md`의 예시도 맞춰 업데이트.

### 변경량
**S** (~15줄)

---

## DOC-5: `GET /api/auth/me` 문서에 있으나 실제 없음

### 위치
- 루트 `CLAUDE.md:148` — "POST /api/auth/register, /login, /guest" 다음에 어디선가 `/me` 언급
- `docs/superpowers/specs/2026-04-06-thinkbridge-design.md:198`

### 현상
실제 `backend/app/routers/auth.py`에는 register/login/guest 3개 엔드포인트만 존재. `/me`는 구현 안 됨.

### 영향
- API endpoint 총 개수 16개 표기와 실제 개수 불일치
- 새 엔지니어가 `/me` 존재한다고 오해

### Fix
- 루트 `CLAUDE.md`에서 `/me` 언급 제거 (현 3개 endpoint만 기술)
- `2026-04-06-thinkbridge-design.md` 198번 부근에 "SUPERSEDED: /me endpoint dropped in favor of token-embedded user claims" 메모

### 변경량
**XS** (~5줄)

---

## DOC-6: Stuck Detection 동작 실제와 다름

### 위치
- `backend/CLAUDE.md:177-183`
- 실제 코드: `backend/app/routers/sessions.py:183-211` + `STUCK_DETECTION_INSTRUCTION` 주입 (L457-478)

### 현상 (P2-7과 중복)
Docs: "Force socratic_stage down by 1"
Actual: Prompt prefix 추가만. Stage 강제 감소 없음.

### Fix
`backend/CLAUDE.md` 문서 업데이트 (P2-7 Option A와 동일):
```markdown
### Stuck Detection
If engagement_level == "stuck" for 2 consecutive turns:
  → Prepend STUCK_DETECTION_INSTRUCTION to next user prompt
  → AI re-interprets context and provides more concrete hint
  (Stage value not forcibly decremented — current design relies on AI judgment)
```

### 변경량
**XS**

---

## DOC-7: Supabase Session Mode Port 5432 Invariant 미문서

### 위치
`backend/CLAUDE.md` 또는 `backend/app/database.py`

### 현상
- 사용자가 DATABASE_URL을 port 6543 (Transaction mode)으로 바꾸면 prepared statement 캐시 충돌로 배포 실패
- 이 invariant는 `work_log/03_deployment.md` Issue 3에만 기록됨
- 새 환경 배포 시 중대 실수 가능

### Fix

**Option A — `database.py` 상단 주석**:
```python
# ============================================================================
# IMPORTANT: Supabase DATABASE_URL MUST use Session mode (port 5432)
# Transaction mode (port 6543) breaks asyncpg prepared statement cache.
# History: docs/work_log/03_deployment.md Issue 3.
# ============================================================================
```

**Option B — `backend/CLAUDE.md` Deployment 섹션**:
```markdown
### Supabase Pooler Configuration
- **DATABASE_URL must use port 5432** (Session mode pooler)
- Transaction mode (port 6543) breaks asyncpg's prepared statement cache
- See `docs/work_log/03_deployment.md` Issue 3 for history
```

### 권장
**둘 다 적용** (code comment는 즉각적, CLAUDE.md는 검색 가능).

### 변경량
**XS** (~10줄 합산)

---

## DOC-8: Prompt Versioning 기록 부재

### 위치
`backend/app/core/prompts.py`

### 현상
v3 plan (`docs/revise_plan_v2/thinkbridge-plan-v3.md` Task 4)가 "Keep v1 prompt as comment block for evolution history"를 요구. 실제로는 prompt history 주석 없음.

### 영향
- AI 리포트 Chapter 2 ("프롬프트 진화")가 source material 없음
- 새 엔지니어가 "왜 현재 이 프롬프트?"를 이해 못 함

### Fix

**Minimal — Top-level docstring**:
```python
"""
ThinkBridge AI System Prompts.

### Evolution History
- v1 (2026-04-07): Initial 3-principle prompt (no-answer, guide, stage-based)
- v2 (2026-04-08): Added Tool Use for 6-dimension analysis; few-shot examples added
- v3 (2026-04-09): Added principle 4 (min 2 sentences) to prevent tool-only responses
- v3.1 (2026-04-10): Added STUCK_DETECTION_INSTRUCTION prefix for hint requests

See `docs/work_log/06_ai_response_fix.md` and `08_prompt_engineering.md`.
"""
```

### 변경량
**XS** (~15줄 docstring)

---

## DOC-9: `processTurn` Non-Streaming Fallback 설계 vs 실제 불일치

### 위치
`backend/CLAUDE.md:128-140`

### 현상
문서:
> "Non-streaming flow (Implement FIRST)"

실제 코드:
- `process_turn()` 함수는 존재 (`ai_engine.py:267`)
- 하지만 **어떤 라우터도 호출 안 함**
- Streaming 경로 (`processTurnStreaming`)만 사용

### Fix

**Option A — Dead code 명시**:
```markdown
### Non-Streaming Flow (process_turn)
Initially planned as primary fallback, but current production only uses
`processTurnStreaming`. `processTurn` retained as:
- Reference implementation for testing
- Future fallback target if streaming becomes unreliable

Not invoked by any router as of 2026-04-12.
```

**Option B — 코드 제거**:
`processTurn` 함수 삭제. 단순화.

### 권장
**Option A** (문서만 수정). 코드는 유지 — 리포트 생성 등 다른 용도로 나중에 쓸 수 있음.

### 변경량
**XS**

---

## DOC-10: Deploy/Rollback/Secret Rotation Runbook 부재

### 위치
`docs/runbooks/` 폴더 자체가 없음

### 현상
- Deploy 절차는 `work_log/03`에 one-time 기록만
- Rollback은 `docs/superpowers/specs/2026-04-12-…-design.md`에만 기술
- Secret rotation (`ANTHROPIC_API_KEY`, `SECRET_KEY`, `DATABASE_URL`) 절차 없음
- Cold start 복구, DB seed refresh 등 runbook 없음

### 제안 (별도 scope — 새 파일 생성 필요)

**공모전 기한 내 최소 runbook 작성 권고**:
- `docs/runbooks/00_deploy.md` — push → Render/Vercel 확인 → smoke test
- `docs/runbooks/01_rollback.md` — git revert 순서, dashboard 롤백, DB 대응
- `docs/runbooks/02_cold_start.md` — Render 깨우기, UptimeRobot 확인, warmup.sh 사용
- `docs/runbooks/03_db_seed.md` — `seed_sync.py` 사용법, reset 절차

### 권장
**Post-submission 우선순위**. 공모전 기한 내에는 `revise_plan_v3/` 문서 자체가 runbook 역할 부분 대체.

### 변경량
**M** — 4-5개 신규 파일 (작성 시간 필요)

---

## DOC 수정 공통 원칙

- 문서 수정은 **기능 변경 아님** — 안전
- 각 수정은 독립 commit (reverse 필요 시 간단)
- 제안 commit: `docs: reconcile X/Y drift in documentation`
- AI 리포트 작성 시 이 수정들이 기반 재료로 활용됨

## 우선순위

**즉시 반영 (가장 리스크 있는 drift)**:
- DOC-2 (parseSSEBuffer 예시 → CRLF 재발 방지)
- DOC-4 (SSEEvent error variant)
- DOC-7 (Session mode invariant)

**권장 반영**:
- DOC-1 (Admin P1/P2)
- DOC-3 (CAS supersedes)
- DOC-5 (/me endpoint)
- DOC-6 (stuck detection)

**선택적**:
- DOC-8 (prompt versioning)
- DOC-9 (processTurn dead code)

**별도 scope**:
- DOC-10 (runbooks) → post-submission
