# SSE Flush + Guest Race Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** D-1 마감(2026-04-13) 전에 ThinkBridge의 SSE 최종 이벤트 손실(Fix #3)과 Guest 5턴 동시성 race(Fix #5)를 최소 변경(~20줄)으로 방어한다.

**Architecture:** Verification-first (프로젝트 CLAUDE.md "No TDD" 정책 존중). 두 수정은 독립 파일/커밋으로 분리되어 개별 롤백 가능. Fix #3는 프론트엔드 SSE 파서 방어층 1개 추가, Fix #5는 Guest 사용자 한정 `SELECT ... FOR UPDATE` 행 락.

**Tech Stack:** Next.js 14 (TypeScript strict), FastAPI + SQLAlchemy 2.0 async, asyncpg, Supabase PostgreSQL Pooler Session mode, httpx (test script).

**Spec reference:** `docs/superpowers/specs/2026-04-12-sse-and-guest-race-hardening-design.md`

**Current state:**
- Git branch: `main`, clean working tree
- HEAD: `6854cc6 docs(spec): refine test script + commit strategy from simulator review`
- Backend URL: `https://thinkbridge-api.onrender.com`
- Frontend URL: Vercel-deployed (auto on push)

---

## Task 1: Fix #3 — SSE Final-Event Flush (Frontend)

**Files:**
- Modify: `frontend/src/lib/api.ts` (add constant near L34; replace while-loop body L286-304)

**Pre-conditions:**
- Working tree clean
- Node installed (`node --version` should succeed)

- [ ] **Step 1.1: Re-read current SSE constants section**

Run:
```bash
sed -n '30,50p' frontend/src/lib/api.ts
```
Expected: output shows `SSE Parsing Constants` header (L31), `SSE_EVENT_PREFIX` (L33), `SSE_DATA_PREFIX` (L34), `SSE_EVENT_BOUNDARY_REGEX` (L41), `SSE_LINE_SPLIT_REGEX` (L46).

- [ ] **Step 1.2: Insert new constant after `SSE_DATA_PREFIX` (between L34 and L41)**

Use Edit tool to change this block:
```typescript
const SSE_EVENT_PREFIX = "event:";
const SSE_DATA_PREFIX = "data:";

/**
 * Regex matching SSE event boundaries (blank line between events).
```

Replace with:
```typescript
const SSE_EVENT_PREFIX = "event:";
const SSE_DATA_PREFIX = "data:";

/** 스트림 종료 시 종결자 없는 최종 이벤트 flush용 가상 경계 (SSE blank line) */
const SSE_STREAM_END_BOUNDARY = "\n\n";

/**
 * Regex matching SSE event boundaries (blank line between events).
```

- [ ] **Step 1.3: Re-read current while-loop (verify before modifying)**

Run:
```bash
sed -n '286,305p' frontend/src/lib/api.ts
```
Expected: shows the `while (true)` loop with `const { done, value } = await tReader.read();` and the `if (done) { break; }` block.

- [ ] **Step 1.4: Replace while-loop body with defensive flush**

Use Edit tool:

Old block (L286-304):
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

New block:
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

- [ ] **Step 1.5: Run TypeScript type check**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: exit code 0, no errors. `SSE_STREAM_END_BOUNDARY` type inferred as `string`.

- [ ] **Step 1.6: Run Next.js build**

Run:
```bash
cd frontend && npm run build
```
Expected: "Compiled successfully" + static pages generated. No TypeScript errors.

- [ ] **Step 1.7: Commit Fix #3**

Run:
```bash
cd /home/mark-minipc/workspace/thinkbridge
git add frontend/src/lib/api.ts
git diff --cached --stat
```
Expected: 1 file changed, ~11 insertions(+), ~1 deletion(-)

Then:
```bash
git commit -m "$(cat <<'EOF'
fix(sse): flush final event when stream ends without boundary

Defensive flush in streamMessages async generator: when reader returns
done=true, re-parse tBuffer with an appended SSE blank-line terminator
so that any unterminated trailing event (proxy truncation, abrupt server
close) is still delivered to the consumer.

No behavior change on normal completion (empty buffer -> no-op parse).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Fix #5 — Guest Session Row Lock (Backend)

**Files:**
- Modify: `backend/app/routers/sessions.py:368-378`

**Pre-conditions:**
- Task 1 committed (working tree clean)
- Python venv activated OR running inside repo with dependencies (SQLAlchemy 2.0 async available)

- [ ] **Step 2.1: Re-read target block**

Run:
```bash
sed -n '365,385p' backend/app/routers/sessions.py
```
Expected: shows the `# 1. 세션 유효성 검증` comment and the existing `select(TutoringSession)` query.

- [ ] **Step 2.2: Replace with conditional `with_for_update()`**

Use Edit tool:

Old block (L368-378):
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

New block:
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

- [ ] **Step 2.3: Python syntax check**

Run:
```bash
cd backend && python -m py_compile app/routers/sessions.py
echo "exit=$?"
```
Expected: `exit=0`, no SyntaxError.

- [ ] **Step 2.4: Quick import smoke check (ensures with_for_update chain resolves)**

Run:
```bash
cd backend && python -c "from app.routers.sessions import router; print('ok', len(router.routes))"
```
Expected: `ok 5` (5 registered endpoints on sessions router).

- [ ] **Step 2.5: Commit Fix #5**

Run:
```bash
cd /home/mark-minipc/workspace/thinkbridge
git add backend/app/routers/sessions.py
git diff --cached --stat
```
Expected: 1 file changed, ~11 insertions(+), ~7 deletions(-)

Then:
```bash
git commit -m "$(cat <<'EOF'
fix(sessions): lock guest session row to enforce 5-turn limit under concurrency

Adds conditional SELECT ... FOR UPDATE on the TutoringSession row when
the current user is a guest. Prevents a read-modify-write race where two
simultaneous POST /messages requests could both observe mTotalTurns<5
and both increment past the 5-turn guest limit.

selectinload is safe to combine with FOR UPDATE because it issues separate
IN() queries; only the primary SELECT is locked. Supabase Pooler is in
Session mode (port 5432), which preserves transaction-scoped locks.
Non-guest users bypass the with_for_update() branch and hit the identical
original query path - zero performance impact for registered users.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Race Reproducer Test Script

**Files:**
- Create: `backend/tests/test_guest_race.py`

**Pre-conditions:**
- Task 2 committed
- `backend/tests/` dir exists (verified: `test_api_scenarios.py` already present)
- `httpx==0.27.2` available (verified: in `backend/requirements.txt:11`)

- [ ] **Step 3.1: Create the test file**

Use Write tool to create `backend/tests/test_guest_race.py` with content:

```python
"""
Guest 5턴 제한 race condition 재현·검증 스크립트.
Local backend(localhost:8000) 또는 production(Render)에 대해 실행 가능.

사용법:
    # Local (race 재현성 최대)
    THINKBRIDGE_API_URL=http://localhost:8000 python backend/tests/test_guest_race.py

    # Production smoke test
    python backend/tests/test_guest_race.py

기대 결과: 200 응답 5건 + 403 응답 5건. 락이 미동작하면 200이 6개 이상 나옴.
"""

import asyncio
import os

import httpx


DEFAULT_API_URL = "https://thinkbridge-api.onrender.com"
API_URL = os.getenv("THINKBRIDGE_API_URL", DEFAULT_API_URL)

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
    """게스트 토큰 발급 후 세션 1개 생성"""
    tAuth = await client.post(f"{API_URL}/api/auth/guest")
    tToken = tAuth.json()["accessToken"]
    tSession = await client.post(
        f"{API_URL}/api/sessions",
        headers={"Authorization": f"Bearer {tToken}"},
        json={"subject": "math", "topic": "race test"},
    )
    return tToken, tSession.json()["id"]


async def sendOneMessage(client, token, sessionId, idx):
    """단일 메시지 POST — 상태 코드 또는 에러 문자열 반환"""
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
        await warmUpBackend(tClient)
        tToken, tSessionId = await createGuestSession(tClient)

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

- [ ] **Step 3.2: Python syntax check**

Run:
```bash
python -m py_compile backend/tests/test_guest_race.py
echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 3.3: Commit test script**

Run:
```bash
git add backend/tests/test_guest_race.py
git commit -m "$(cat <<'EOF'
test: add asyncio race reproducer for guest turn limit

Script runs CONCURRENT_REQUESTS=10 POST /sessions/{id}/messages calls
against a single guest session via asyncio.gather. Correct row locking
yields exactly 5 successes and 5 forbidden. Script honors THINKBRIDGE_API_URL
env var so it can run against local backend (where race reproduces reliably)
or production for smoke testing.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Local Verification — Run Race Reproducer Against Local Backend

**Files:** (no code changes)

**Pre-conditions:**
- Tasks 1-3 committed
- Local `.env` with valid `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SECRET_KEY`, `CORS_ORIGINS`
- Backend dependencies installed (`pip install -r backend/requirements.txt` previously)

- [ ] **Step 4.1: Start local backend in background**

Run:
```bash
cd backend && nohup python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > /tmp/thinkbridge-local.log 2>&1 &
echo "pid=$!"
sleep 5
```
Expected: PID printed, `sleep 5` gives server time to bind.

- [ ] **Step 4.2: Verify backend is up**

Run:
```bash
curl -s http://127.0.0.1:8000/health
```
Expected: `{"status":"ok","timestamp":"..."}`.

- [ ] **Step 4.3: Run race reproducer against local backend**

Run:
```bash
cd /home/mark-minipc/workspace/thinkbridge
THINKBRIDGE_API_URL=http://127.0.0.1:8000 python backend/tests/test_guest_race.py
```
Expected output:
```
200: 5, 403: 5, raw: [200, 200, 200, 200, 200, 403, 403, 403, 403, 403]
PASS: Guest 5-turn limit correctly enforced under concurrency
```
(Order of 200/403 in raw may vary — only counts matter.)

- [ ] **Step 4.4: Stop local backend**

Run:
```bash
pkill -f "uvicorn app.main:app --host 127.0.0.1 --port 8000" || true
```
Expected: returns cleanly. No further action if process not found.

- [ ] **Step 4.5: Record result**

If PASS, note `Local race test: PASS at <timestamp>` in scratchpad for Task 6 work log.
If FAIL, DO NOT proceed to Task 5. Debug: re-read `backend/app/routers/sessions.py` to confirm Step 2.2 was applied correctly; check Supabase connection is actually on Session mode (port 5432 in DATABASE_URL).

---

## Task 5: Existing E2E Regression — Fix #3 Non-Regression

**Files:** (no code changes)

**Pre-conditions:**
- Frontend reachable (either local `npm run dev` or Vercel preview deploy)
- Backend reachable (Render prod or local from Task 4)

- [ ] **Step 5.1: Check existing E2E test dependency**

Run:
```bash
cd /home/mark-minipc/workspace/thinkbridge && node --version
ls node_modules/playwright 2>/dev/null || echo "playwright missing"
```
Expected: node version printed; playwright present (project uses Playwright 1.59.1).

- [ ] **Step 5.2: Run the core E2E scenario suite against current deployment**

Run:
```bash
cd /home/mark-minipc/workspace/thinkbridge
node e2e-student-test.js 2>&1 | tail -40
```
Expected: scenarios PASS — student login → chat → SSE streaming → analysis panel updates → session end → report appears.

If any chat-streaming scenario fails, investigate before proceeding.

- [ ] **Step 5.3: Record result**

Record PASS count and any flakes for the work log (Task 6).

---

## Task 6: Work Log Entry

**Files:**
- Create: `docs/work_log/09_sse_and_race_hardening.md`

**Pre-conditions:**
- All prior tasks committed and verified.

- [ ] **Step 6.1: Write the work log**

Use Write tool to create `docs/work_log/09_sse_and_race_hardening.md`:

```markdown
# SSE 최종 이벤트 Flush + Guest 5턴 Race Hardening

> **Date**: 2026-04-12 (D-1)
> **Commits**: `fix(sse)`, `fix(sessions)`, `test:` — 3개 분리 커밋
> **Spec**: `docs/superpowers/specs/2026-04-12-sse-and-guest-race-hardening-design.md`
> **Plan**: `docs/superpowers/plans/2026-04-12-sse-and-guest-race-hardening.md`

## 배경

구조·코드 분석에서 5가지 잠재 리스크를 식별한 뒤, D-1 Iron Rule("학생 채팅 라이브 동작") 관점에서 Triage하여 저위험·고가치 2건만 처리했다.
- Fix #2(매핑 3단계 리팩터), #4(이미 방어됨으로 재판정), #1(이미 대응 중)은 의도적 제외.

## 변경 내용

### Fix #3 — SSE 최종 이벤트 Flush (frontend/src/lib/api.ts)
- `streamMessages` async generator가 `reader.read()` `done=true` 시점에 종결자 없는 부분 이벤트를 손실하던 문제 방어.
- 새 상수 `SSE_STREAM_END_BOUNDARY = "\n\n"` 추가.
- done 분기에서 `parseSSEBuffer(tBuffer + SSE_STREAM_END_BOUNDARY)` 1회 추가 파싱으로 최종 이벤트 복구.
- 정상 경로는 빈 버퍼 → no-op, 영향 없음.

### Fix #5 — Guest 5턴 Race Condition 방어 (backend/app/routers/sessions.py)
- 동시 `POST /messages` 2건 이상에서 `mTotalTurns`가 5를 넘길 수 있던 read-modify-write race 방어.
- 세션 유효성 검증 쿼리에 `if currentUser.mIsGuest: tSessionQuery = tSessionQuery.with_for_update()` 추가.
- `selectinload`가 별도 IN() 쿼리로 자식을 로드하므로 primary SELECT만 락 걸림 (outer-join 이슈 없음).
- Supabase Pooler Session mode + `NullPool` + `statement_cache_size=0` 조합에서 안전함을 Agent 검증 완료.

### 추가 — Race 재현·검증 스크립트
- `backend/tests/test_guest_race.py` 신규.
- `asyncio.gather`로 10개 동시 POST 발사 → 200 5건 + 403 5건 단언.
- `THINKBRIDGE_API_URL` env var로 로컬/프로덕션 대상 전환.

## 검증 결과

- Local: `THINKBRIDGE_API_URL=http://127.0.0.1:8000 python backend/tests/test_guest_race.py` → PASS
- E2E regression: `node e2e-student-test.js` → PASS
- TypeScript strict build: `cd frontend && npm run build` → 0 error
- Python import: `from app.routers.sessions import router` → 5 routes loaded

## 검증 에이전트 기록 (6회 독립 리뷰)

1. DB/인프라 에이전트: FOR UPDATE + pgbouncer + asyncpg 호환성 → ✅ GO
2. SSE 스펙 에이전트: WHATWG + sse_starlette 동작 → ✅ CORRECT (trim 가드 제거 간소화 수용)
3. 독립 코드 리뷰 에이전트: DEFER 권고 → 근거 2건 사실 오류로 반박
4. Spec 일관성 리뷰: ⚠️ 5개 minor fix → 모두 반영
5. Spec 스타일 감사: 10/12 compliant → 2건 테스트 스크립트 개선
6. Implementation simulator: ⚠️ 4건 tweak (URL, env var, work_log 번호, commit msg) → 모두 반영

## 교훈

- `selectinload`가 과거 선택이었기에 오늘 FOR UPDATE가 가능했다. 초기 설계의 유연성이 D-1 hardening을 가능케 함.
- 에이전트 의견이 갈릴 때는 **주장 단위로 쪼개서 평가**해야 한다. Agent 3이 DEFER를 권고했지만, 그 안의 `asyncio.gather` 테스트 개선 피드백은 실제로 품질을 높였다.
- "No TDD"는 단순히 테스트를 안 쓴다는 뜻이 아니라, **test-first 의무를 제거**한 것이다. 이번 race 스크립트처럼 "실패를 증명하는 reproducer"는 여전히 가치가 있다.
```

- [ ] **Step 6.2: Commit work log**

Run:
```bash
git add docs/work_log/09_sse_and_race_hardening.md
git commit -m "$(cat <<'EOF'
docs: add work log for SSE flush + guest race hardening

Documents the D-1 triage decision, both fixes, local/E2E verification
results, and the 6-agent cross-verification trail. Records the factual
refutation of the DEFER recommendation and lessons learned about
agent opinion aggregation.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Push to Origin/Main (Triggers Render + Vercel Auto-Deploy)

**Files:** (no code changes)

**Pre-conditions:**
- All prior tasks committed
- Local race + E2E verification PASSED
- Current branch is `main` (confirm with `git branch --show-current`)

**⚠️ User confirmation required before this task.** Pushing to `main` triggers auto-deploy to production (Render backend + Vercel frontend). The judge may access the site during this window.

- [ ] **Step 7.1: Confirm commits to push**

Run:
```bash
git log origin/main..HEAD --oneline
```
Expected: 4 commits — fix(sse), fix(sessions), test:, docs:

- [ ] **Step 7.2: Push**

Run:
```bash
git push origin main
```
Expected: "To github.com:...thinkbridge.git  <prev>..<new>  main -> main"

- [ ] **Step 7.3: Monitor Render deploy**

Open: https://dashboard.render.com (backend service)
Wait for: latest commit hash shows "Live" status. Typical 2-4 minutes.

- [ ] **Step 7.4: Monitor Vercel deploy**

Open: https://vercel.com/dashboard (thinkbridge frontend)
Wait for: latest commit "Ready" state. Typical 1-2 minutes.

---

## Task 8: Production Smoke Test

**Files:** (no code changes)

**Pre-conditions:**
- Task 7 complete, both Render and Vercel show latest commit deployed.

- [ ] **Step 8.1: Warm up backend**

Run:
```bash
bash scripts/warmup.sh https://thinkbridge-api.onrender.com
```
Expected: "Health check... OK", "SSE test... OK", "Guest login... OK (token received)".

- [ ] **Step 8.2: Run race reproducer against production**

Run:
```bash
python backend/tests/test_guest_race.py
```
Expected: `PASS: Guest 5-turn limit correctly enforced under concurrency`.
Note: over WAN, network latency may slightly reduce race contention; if result shows 5/5 that's correct-behavior evidence regardless of whether the race would have triggered.

- [ ] **Step 8.3: Manual chat smoke test**

Open: `https://thinkbridge.vercel.app` (or actual Vercel URL from Task 7.4)
Click: "바로 체험하기" → enter topic → send first message → verify:
- Streaming tokens appear character-by-character
- Thought analysis panel populates
- Progress bar advances
- Final `done` event closes the stream cleanly (input re-enabled)

- [ ] **Step 8.4: Record final status**

Append to `docs/work_log/09_sse_and_race_hardening.md` under "## 검증 결과":
```
- Production smoke test (post-deploy): PASS at <timestamp>
- Manual chat verification: streaming + analysis + done event all OK
```

Then:
```bash
git add docs/work_log/09_sse_and_race_hardening.md
git commit -m "docs(work_log): record post-deploy smoke test results

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Rollback Procedure (If Any Post-Deploy Test Fails)

If Step 8.2 or 8.3 fails:

```bash
# Identify the two bad commits
git log --oneline -6

# Revert in reverse order (newest first to avoid conflicts)
git revert <commit-sha-fix-5>
git revert <commit-sha-fix-3>
git push origin main
```

Render/Vercel will auto-deploy the revert. Alternative: use Render/Vercel dashboard "Rollback" button to snap back to the pre-deploy build instantly.

---

## Success Criteria

All of:
- [ ] Task 1-8 completed
- [ ] 5 commits in sequence on `main` (4 pre-deploy + 1 post-deploy log)
- [ ] Local race test PASS
- [ ] E2E regression PASS
- [ ] Production smoke test PASS
- [ ] Manual chat flow verified on live URL
- [ ] `docs/work_log/09_sse_and_race_hardening.md` exists and is committed

**If all criteria met**: the D-1 hardening is complete. Proceed to demo rehearsal + AI report submission polish.
