# 16. Tutorial Overlay - Core Implementation (Phase 2)

## Summary

DIY 튜토리얼 오버레이 시스템의 Core layer를 구현했다. Third-party 라이브러리 없이 React Context + Portal + SVG mask로 구성. 4개 페이지(chat/sessions/instructor/admin)에 대한 총 18 steps의 튜토리얼 정의를 포함하며, 페이지별 wire-up(Phase 3)과 분리된 재사용 가능한 인프라 레이어다.

## Why

- **판정단 UX**: ThinkBridge 기능(6차원 분석, 5단계 소크라테스 진행, AI 인사이트 등)은 한눈에 파악하기 어려운 밀도 높은 정보를 담는다. 첫 방문 시 guided walkthrough가 필수.
- **Zero dependency**: Shepherd.js/Driver.js 같은 외부 라이브러리는 번들 크기 + SSR 이슈 + Tailwind/shadcn 디자인 통합 부담이 있음. DIY로 완전한 제어권 확보.
- **데모 안정성**: 글로벌 disable 플래그(`thinkbridge_tutorial_disabled`)로 데모 당일 전체 비활성화 가능 → 예상 못 한 버그로 인한 데모 중단 방지.

## What Changed

### 신규 파일 (5)

1. **`frontend/src/lib/tutorialConstants.ts`**
   - Z-index(80, ChatInterface overlay 70 위), 스토리지 키 prefix + 버전 접미사, spotlight padding/offset/backdrop opacity, polling 간격, 모바일 breakpoint, 버튼 라벨 등 모든 magic value 집중.

2. **`frontend/src/lib/tutorialSteps.ts`**
   - `TutorialId` union = `"chat" | "sessions" | "instructor" | "admin"`.
   - 4개 Tutorial record (총 18 steps): 각 step은 CSS selector + Korean title/description + placement.
   - 타겟은 모두 `[data-tutorial-id='…']` selector (Phase 3에서 실제 DOM에 부착 예정).

3. **`frontend/src/lib/tutorial.tsx`**
   - `TutorialProvider`: 전역 상태 (active tutorial ID, current step index). SSR-safe.
   - `useTutorial()`: 소비 훅. navigation + completion 헬퍼 제공.
   - `useAutoStartTutorial(tutorialId, ready)`: ready 신호 수신 시 first-visit 자동 트리거. 완료 상태 / 다른 튜토리얼 실행 중이면 무시. 400ms 지연으로 DOM 안정화.
   - `waitForTarget(selector, timeoutMs)`: 100ms 간격으로 polling하다 timeout 초과 시 null 반환. async-rendered 대시보드 widget 대응.
   - `skipTutorial()` = 완료 마킹 + 닫기 / `abortTutorial()` = 마킹 없이 닫기 (외부 overlay 충돌 시 사용).

4. **`frontend/src/components/tutorial/TutorialOverlay.tsx`**
   - `createPortal(..., document.body)` + mounted guard.
   - SVG mask spotlight: 전체 rect(white) + 타겟 rect(black) → 검정 backdrop에 mask 적용 → 타겟 영역만 투명 + 부드러운 transition.
   - 4 placement (top/bottom/left/right) + center fallback (타겟 없음 / placement="center" / 모바일).
   - `scrollIntoView({ block: "center", behavior: "smooth" })` + 150ms stabilize → rect 측정.
   - RAF-throttled resize/scroll listener로 rect 재계산.
   - 키보드: Esc = skip, Enter/ArrowRight = next, ArrowLeft = prev.
   - ARIA: `role="dialog" aria-modal="true" aria-labelledby aria-describedby`.
   - Tooltip: `1 / N` 스텝 카운터 + X 닫기 + 제목/설명 + [건너뛰기] [이전] [다음/완료] 버튼, Next 버튼 autoFocus.

5. **`frontend/src/components/tutorial/TutorialButton.tsx`**
   - `?` HelpCircle 아이콘 + "도움말" 라벨 (sm breakpoint 이상에서만 표시).
   - Click → `startTutorial(tutorialId)` 직접 호출 → 완료 여부 무시하고 재실행.

### 수정 파일 (1)

- **`frontend/src/app/layout.tsx`**
  - `AuthProvider` 내부에 `TutorialProvider` 등록.
  - `<TutorialOverlay />`를 `{children}` 뒤에 렌더 (portal이 body로 이동하므로 실제 렌더 위치는 무관하지만 관례상 Provider 내부에 유지).

## Key Decisions

- **Portal → body**: 부모 stacking context를 완전히 벗어나 ChatInterface mobile-sheet(z=70)보다 확실히 위에 올라가도록.
- **SVG mask vs 4-rect backdrop**: SVG mask가 더 간결 + corner radius(8px) 쉽게 적용 + rect transition 자연스러움. 성능도 크게 차이 없음.
- **Version suffix in storage key (`_v1`)**: 향후 스텝 내용이 변경되면 `_v2`로 bump해서 모든 사용자에게 다시 노출 가능.
- **Auto-start는 페이지 책임**: Provider가 알아서 트리거하지 않고, 각 페이지가 `useAutoStartTutorial(id, ready)`를 명시적으로 호출. Ready 조건(세션 로드 완료 등)은 페이지가 가장 잘 앎.
- **Lambda 최소화**: 이벤트 핸들러는 named function(`function handleKeyDown(event)`, `function updateRectOnLayout()`)으로. 글로벌 규칙 준수.

## Build Verification

```bash
npx tsc --noEmit  # 0 errors
npm run build     # Compiled successfully, 11/11 pages
```

페이지별 사이즈 유지 (overlay 미사용 페이지는 portal 렌더 X → 런타임 오버헤드 거의 0).

## Not Yet Done (Phase 3)

Phase 3에서 할 작업:
- 각 페이지(`student/chat`, `student/sessions`, `instructor/dashboard`, `admin/dashboard`)에 `data-tutorial-id="…"` 속성 부착.
- 각 페이지 상단 우측에 `<TutorialButton tutorialId="…" />` 배치.
- 각 페이지 진입 시 `useAutoStartTutorial("…", ready)` 호출 (ready = 데이터 로드 완료 boolean).

Phase 3는 별도 커밋에서 진행한다.

## Commit

- `e16fec7` — `feat(tutorial): add core overlay/context/steps for 4 tutorials (core only)`
