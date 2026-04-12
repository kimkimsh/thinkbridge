# 13. Landing / Auth / Navbar UX Fixes

## Scope

User test findings (L.9, B.1, B.2, B.4) addressed in a single pass:

| Issue | Symptom | Fix |
|-------|---------|-----|
| A.3 | Raw browser fetch error messages ("Failed to fetch") surfaced to users | `normalizeErrorMessage()` helper in `api.ts` maps known English strings to Korean friendly equivalents |
| A.1 (L.9) | Error banner only fixed top-right — easily missed when attention is on the Hero CTA | Added an inline error banner directly under the CTA buttons; existing top-right banner kept for wider visibility |
| B.1 | Authenticated users still saw "바로 체험하기" + "로그인" on landing, which doesn't match their state | Hero CTA now branches on `user`: role-specific continuation button ("대화 계속하기" / "강사 대시보드로" / "관리자 대시보드로") when logged in |
| B.2 | Navbar logo always linked to `/` — authenticated users clicking it landed back on landing and had to re-navigate | Logo href becomes `getHomePathForRole(user.role)` when logged in |
| B.4 | "리포트" entry from sessions list was implicit (card click only); users weren't sure completed sessions had a report | Added an explicit "리포트" button on completed session cards; click bubbles to existing card `onClick` router push |

## Files Modified

- `frontend/src/lib/api.ts`
  - Added `ERROR_MESSAGE_MAP` constant (Chrome/Firefox/Safari fetch-failure strings -> Korean)
  - Added `normalizeErrorMessage(error: unknown): string` exported helper
- `frontend/src/lib/auth.tsx`
  - Exported `HOME_PATH_STUDENT`, `HOME_PATH_INSTRUCTOR`, `HOME_PATH_ADMIN` constants
  - Exported previously-private `getHomePathForRole()` so landing/Navbar can reuse the same mapping
- `frontend/src/app/page.tsx`
  - Imported `getHomePathForRole` from `@/lib/auth` and `normalizeErrorMessage` from `@/lib/api`
  - Destructured `user` from `useAuth()`
  - Replaced the Hero CTA pair with a `user ? ... : ...` branch; added `handleContinue()` and `getContinueCtaLabel()` helpers
  - Added inline error banner directly beneath the Hero CTA (complements the existing fixed top-right banner)
  - Guest-trial caption ("회원가입 없이 5턴 무료 체험") now hidden when logged in
  - Demo section title switches to "다른 역할 체험" when logged in (still keeps the role buttons for role-switch demo)
  - Catch blocks now run error messages through `normalizeErrorMessage` before setting state
- `frontend/src/components/layout/Navbar.tsx`
  - Imported `getHomePathForRole`
  - Logo `href` is now `user ? getHomePathForRole(user.role) : "/"`
- `frontend/src/app/student/sessions/page.tsx`
  - Imported `FileText` icon and added `REPORT_CTA_LABEL` constant
  - Added a "리포트" button next to the status badge on completed session cards (click bubbles to the card's existing `onClick`)

## Verification

- `npx tsc --noEmit` -> 0 errors
- `npm run build` -> `Compiled successfully`, all 11 routes generated

## Notes

- The existing fixed top-right error banner was intentionally kept; the new inline banner is additive (wider visibility).
- `getHomePathForRole` is now the single source of truth for role -> home path. The internal `STUDENT_HOME_PATH`/`INSTRUCTOR_HOME_PATH`/`ADMIN_HOME_PATH` constants kept their names (now re-assigned from the exported `HOME_PATH_*` constants) to minimize diff in the redirect-on-login flow.
- The "리포트" button does NOT call `stopPropagation` — the click intentionally bubbles to the card to reuse the existing router push, avoiding duplicated routing logic.
