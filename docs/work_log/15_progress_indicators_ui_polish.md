# 15. Progress Indicators + UI Polish (A.2 / A.4 / C.1 / C.2)

## Scope

User-test findings from the B.3-after walk-through flagged four UX issues
that all share the same underlying theme: **the app performed correctly but
did not *feel* responsive**. Users stared at visually-unchanged screens
during slow operations, struggled to tell a disabled button from an active
one, and on mobile had UI elements overlapping at the bottom-right corner.

This entry captures the four-issue polish pass:

| ID  | Area                                      | Problem                                                |
| --- | ----------------------------------------- | ------------------------------------------------------ |
| A.2 | Session end (ChatInterface)               | No visible progress between "종료" click and report page |
| A.4 | Report page (getSessionReport)            | 404 "not ready" hit turned into a terminal error box   |
| C.1 | 종료 button state discernibility          | `variant="ghost"` — active/disabled visually too close |
| C.2 | Mobile hamburger vs Send/종료 on chat    | Hamburger sat at `bottom-4 right-4` behind input bar   |

## A.2 — Full-Screen Session-End Overlay

### Symptom

Clicking "종료" triggered `endSession()` (POST `/api/sessions/{id}/end`) plus
`router.push(/student/report/{id})`. Backend eagerly kicks off report
generation there, which can take several seconds (sometimes 10+ on Render
free tier). During that window the chat UI only rendered `disabled=true` on
the button — no spinner, no message. Users reported "is this frozen?".

### Fix

`frontend/src/components/chat/ChatInterface.tsx`:

- Added three constants at the top of the constants block:
  `END_SESSION_OVERLAY_Z_INDEX` (`z-[70]`),
  `END_SESSION_OVERLAY_PRIMARY_TEXT` ("사고 과정을 분석하고 있어요"),
  `END_SESSION_OVERLAY_SECONDARY_TEXT` ("리포트 생성까지 최대 10초가 걸릴 수 있습니다").
- Introduced a full-screen overlay rendered when `mIsEnding` is `true`.
  - `fixed inset-0`, backdrop-blur, `bg-white/85`, fade-in animation.
  - `z-[70]` intentionally above Sidebar Sheet (`z-50`) and ThoughtPanel
    floating button (`z-40`) — during end-session processing the user
    should not be able to open the sidebar or analysis drawer.
  - Indigo spinner (spinning ring) + primary headline + secondary hint.
  - `role="status"` + `aria-live="polite"` for SR announcement.
- No change to `handleEndSession` — it already sets `setIsEnding(true)`
  immediately after the guard, so the overlay appears the frame after
  click and stays up through `router.push` navigation.

## A.4 — Report Page Retry with Progress Indicator

### Symptom

`/api/reports/session/{id}` returns HTTP 404 with detail
`"리포트가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요."` when the
backend has not finished generating the report. The page previously called
`Promise.all([...])` once; any 404 bubbled straight to the red error box
with no retry, so users hitting the race between A.2's navigation and the
report completion saw a dead-end error.

### Fix

`frontend/src/app/student/report/[id]/page.tsx`:

- Added retry constants:
  - `REPORT_RETRY_ATTEMPTS = 5`
  - `REPORT_RETRY_INTERVAL_MS = 2000`
  - `NOT_READY_MARKER_JSON = "아직 준비"`,
    `NOT_READY_MARKER_HEADER = "리포트가 아직"`,
    `NOT_READY_MARKER_STATUS = "HTTP 404"` — the three substrings used
    to identify the retryable condition (covers JSON-parsed `detail` and
    the `apiRequest` fallback when JSON parsing itself fails).
  - `buildGeneratingMessage(n, total)` — formats `"사고 과정을 분석하고 있어요... (N/5)"`.
- New state: `mGeneratingMessage: string | null`.
- `loadReportData` was rewritten as a `for` loop over
  `REPORT_RETRY_ATTEMPTS`. On a retryable error it sets the generating
  message, sleeps `REPORT_RETRY_INTERVAL_MS`, and continues. On terminal
  error or attempts exhausted it delegates to `normalizeErrorMessage`
  (newly imported from `@/lib/api`) and falls back to
  `REPORT_LOAD_FAILED_MESSAGE`.
- While `mIsLoading` is `true` and `mGeneratingMessage` is set, the
  skeleton renders with an absolute-positioned overlay containing a small
  spinner, the progress message, and "잠시만 기다려 주세요" hint.
  The `tIsCancelled` flag is honored inside the retry loop so unmounted
  pages don't keep retrying.

Combined with A.2, the user now sees: full-screen overlay on chat page
→ navigation → skeleton-with-overlay progress until report is ready.

## C.1 — End-Session Button State Clarity

### Symptom

`variant="ghost"` has no border by default, so the 종료 button looked
almost identical whether active, disabled, or hovered. Users could not
tell at a glance whether they could click it.

### Fix

`frontend/src/components/chat/ChatInterface.tsx`:

- Switched to `variant="outline"` and gave explicit class tokens for each
  state transition:
  - **Base (active):** `border-red-300 bg-white text-red-600`
  - **Hover:** `hover:border-red-500 hover:bg-red-50 hover:text-red-700`
  - **Pressed:** `active:bg-red-100`
  - **Disabled:** `disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed`
  - `transition-colors duration-150` for smooth state changes.
- Added `aria-label="대화 종료"` and `title="대화 종료"` for A11y.
- Text uses `font-medium` inside `hidden sm:inline` wrapper (unchanged
  visibility rules; icon-only on xs).
- Hint button was NOT changed in this pass — its amber tint is already
  visually distinct from the send/end cluster and no user feedback
  targeted it. Leaving as-is reduces risk surface.

## C.2 — Mobile Hamburger Position on Chat Page

### Symptom

Default hamburger class was `fixed bottom-4 right-4 z-50 md:hidden`. On
`/student/chat` the input bar's trailing-edge cluster (Send + 종료 + hint
icons) lives at roughly `bottom-3 right-3`, and the ThoughtPanel floating
button sits at `bottom-20 right-4 z-40` — a three-way vertical stack in
the same right-side column, and on narrow mobile widths the hamburger
overlaps the Send/종료 target.

### Fix

`frontend/src/components/layout/Sidebar.tsx`:

- Added constants:
  - `CHAT_PAGE_PATH = "/student/chat"`
  - `HAMBURGER_DEFAULT_POSITION = "bottom-4 right-4"`
  - `HAMBURGER_CHAT_POSITION = "bottom-4 left-4"`
- Computed `tIsChatPage = pathname === CHAT_PAGE_PATH` in the component
  body and picked the appropriate position class.
- Switched the static `fixed bottom-4 right-4 z-50 md:hidden` to
  `cn("fixed z-50 md:hidden", tHamburgerPositionClass)` so only the
  position axis changes; z-index and visibility rules are unchanged.

Left-bottom placement was chosen (rather than `top-3 left-3`) because the
chat page's input bar occupies the bottom strip on the right side only —
bottom-left is visually balanced and keeps the hamburger within thumb
reach on mobile.

## Files Affected

- `frontend/src/components/chat/ChatInterface.tsx` — A.2 overlay + C.1 button.
- `frontend/src/app/student/report/[id]/page.tsx` — A.4 retry + progress overlay.
- `frontend/src/components/layout/Sidebar.tsx` — C.2 hamburger position.

## Verification

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — successful, 11/11 pages generated.

## Notes / Follow-ups

- The hint button at `variant="ghost"` with amber tokens was intentionally
  left unchanged to minimize scope; if user testing flags it separately
  the same outline pattern can be applied.
- `REPORT_RETRY_ATTEMPTS * REPORT_RETRY_INTERVAL_MS` gives a 10-second
  upper bound on waiting — matches A.2's "최대 10초" message. If report
  generation regularly exceeds that, both constants should scale together.
- The overlay does NOT cover the browser chrome — if the user opens a
  different tab during the end-session flow the polling continues in the
  original tab without issue.
