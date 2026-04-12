# 14. Session Resume: Restore Messages, Analysis, Turn Count

## Scope

User test finding **B.3** — resuming an in-progress tutoring session from the
sessions list landed the user on an empty chat view even though the DB already
had the full conversation history. Next message sent was interpreted by the
backend with full context, but the student's screen had no visual continuity,
so the dialogue felt disconnected.

## Symptom

1. Student opens `/student/sessions` and clicks an **active** session card.
2. Router pushes `/student/chat?sessionId={id}`.
3. `ChatInterface` mounts, but shows:
   - Welcome card ("안녕하세요! 오늘은 어떤 주제로...")
   - Turn count badge `0 / 5` (guest) or analysis panel empty (logged-in)
   - Progress bar on Stage 1
4. User sends a message; the assistant replies using full DB history, but the
   prior turns are invisible.

## Root Cause

- `frontend/src/app/student/chat/page.tsx` line 119-162: the `useEffect` that
  fires on `sessionId` query param called `getSessionDetail()` but only used
  the response's `id` and `subject` fields. The decoded `messages` array and
  per-turn `analysis` were silently discarded.
- `frontend/src/components/chat/ChatInterface.tsx` had no `initialMessages` /
  `initialAnalysis` / `initialStage` / `initialTurnCount` props — `useState`
  was hard-coded to empty defaults.

## Fix

### `frontend/src/components/chat/ChatInterface.tsx`

- Exported new `ChatMessage` interface (previously file-private) so the page
  can build the seed array from the DB response.
- Added four optional props: `initialMessages`, `initialAnalysis`,
  `initialStage`, `initialTurnCount`.
- Swapped `useState` defaults to `initial* ?? <empty>` so restored state
  becomes the initial render (no flicker, no post-mount flash of the
  welcome card).
- Replaced the file-private `DEFAULT_STAGE = 1` with the now-exported
  `DEFAULT_SOCRATIC_STAGE` from `@/lib/constants` (single source of truth
  for the default Socratic stage).
- Hid the welcome card when `initialMessages` is provided
  (`mMessages.length === 0 && !mIsStreaming && !initialMessages`).

### `frontend/src/app/student/chat/page.tsx`

- Three new helpers:
  - `convertDetailMessagesToChatMessages()` — sorts by `turnNumber` (user
    before assistant within the same turn, defensively) and drops DB-only
    fields (`id`, `sessionId`, `createdAt`, `analysis`) that `ChatInterface`
    doesn't consume.
  - `getLastAssistantAnalysis()` — walks the messages in reverse to find the
    most recent assistant turn that has an analysis attached, so the
    `ThoughtPanel` reflects the student's latest progress immediately on
    resume.
  - `getLastStageFromAnalyses()` — reads the same analysis and returns its
    `socraticStage`, falling back to `DEFAULT_SOCRATIC_STAGE` when none is
    found.
- Rewrote the `useEffect` that handles the `sessionId` query param:
  - Tracks loading state via new `mIsLoadingSession` state.
  - Stores the full `SessionDetail` in new `mLoadedDetail` state for use as
    seed data when rendering `ChatInterface`.
  - Guards against race conditions with a `tIsCancelled` flag.
  - Redirects `completed` sessions to `/student/report/{id}` via
    `router.replace()` — the user should not be able to continue writing
    into a finalized session.
  - Uses `normalizeErrorMessage` (introduced in work log 13) for user-facing
    error strings.
- Added a full-page loading view (spinner + "이전 대화를 불러오고
  있어요..." + "잠시만 기다려 주세요") shown while `mIsLoadingSession`
  is true, preventing a one-frame flash of the "새 대화 시작" card.
- Passes the four new seed props to `ChatInterface` when a loaded
  `SessionDetail` is available; otherwise passes `undefined` so the "new
  session" flow keeps its empty defaults.

### `frontend/src/lib/constants.ts`

- Exported the previously file-private `DEFAULT_SOCRATIC_STAGE = 1` so
  both the chat page and `ChatInterface` use the same constant.

## Files Modified

- `frontend/src/app/student/chat/page.tsx` (~+100 lines, ~-15 lines)
- `frontend/src/components/chat/ChatInterface.tsx` (~+35 lines, ~-6 lines)
- `frontend/src/lib/constants.ts` (1 line changed — `const` -> `export const`)

## Verification

- `npx tsc --noEmit` -> 0 errors
- `npm run lint` -> 0 warnings
- `npm run build` -> `Compiled successfully`, all 11 routes generated,
  `/student/chat` bundle size 9.6 kB (up from ~9.3 kB — small cost for
  the extra helpers and loading view).

## Notes

- The resume flow intentionally does **not** re-fetch analysis one turn at
  a time. The `ThoughtPanel` snapshot is seeded from the most recent
  assistant analysis only; earlier turns' analyses are not surfaced in
  the panel (they're still visible on the instructor replay page via
  `/instructor/replay/{sessionId}`).
- `initialTurnCount` comes from `SessionDetail.totalTurns`, which the
  backend increments once per user→assistant round-trip. Guest turn-limit
  math (`mTurnCount >= GUEST_MAX_TURNS`) therefore stays consistent
  across sessions.
- `completed` sessions are detected via string compare against the
  `SESSION_STATUS_COMPLETED` constant, matching the value emitted by
  `SessionStatus.value` on the backend (`"completed"`). The student
  sessions list already shows a report button on completed cards (work
  log 13), but users could still reach `/student/chat?sessionId={id}`
  by URL manipulation or stale browser history — the `router.replace()`
  redirect covers that path.
