# 17. Tutorial Overlay - Integration (Phase 3)

## Summary

Phase 2에서 완성한 튜토리얼 Core layer(Provider/Overlay/Button/Steps)를 4개 실제 페이지에 연결했다. 각 페이지에 `data-tutorial-id` 속성을 부착하고 헤더 영역에 `TutorialButton`(? 아이콘)을 배치했으며, `useAutoStartTutorial` 훅으로 첫 방문 자동 트리거를 활성화했다.

## Why

- Phase 2 Core는 library-agnostic infra였지만 실제 DOM 없이는 동작 불가. 페이지/컴포넌트에 타깃 속성을 부착해야 spotlight + tooltip이 의미를 가진다.
- 4개 튜토리얼 (chat, sessions, instructor, admin) 각각의 ready 조건이 다르므로 페이지별 명시적 훅 호출이 필요했다 (chat은 세션 로딩만 끝나면, sessions는 목록이 1개 이상, instructor는 heatmap 데이터 로드 완료, admin은 stats 로드 완료).
- 교강사/운영자 판정단이 대시보드 기능을 한눈에 파악하려면 guided walkthrough가 필수.

## What Changed

### 수정 파일 (5)

1. **`frontend/src/app/student/chat/page.tsx`** (+15 lines)
   - Import `TutorialButton` + `useAutoStartTutorial` 추가
   - `useAutoStartTutorial("chat", !mIsLoadingSession)` 호출 — pre-session / in-session 양쪽 모두 커버
   - CardHeader 우상단에 `<TutorialButton tutorialId="chat" />` 배치 (absolute positioned)
   - 3개 `data-tutorial-id` 추가: `chat-subject-selector` (과목 선택 grid), `chat-topic-input` (주제 Input), `chat-start-button` (대화 시작 Button)

2. **`frontend/src/components/chat/ChatInterface.tsx`** (+8 lines)
   - 4개 `data-tutorial-id` 추가: `chat-progress-bar` (progress bar 컨테이너), `chat-thought-panel` (데스크톱 사이드바), `chat-hint-button` (힌트 버튼), `chat-end-button` (종료 버튼)
   - 기존 JSX 구조 / className 일체 변경 없음

3. **`frontend/src/app/student/sessions/page.tsx`** (+34 lines)
   - Import 추가, `useAutoStartTutorial("sessions", !mIsLoading && mSessions.length > 0)` 호출 — 세션 1개 이상일 때 의미있음
   - `SessionCard`에 `isFirst` / `isFirstCompleted` prop 추가 → map callback이 `index === 0` / `session.id === tFirstCompletedId`로 첫 항목만 marking
   - 헤더 영역에 `<TutorialButton tutorialId="sessions" />` 배치 (새 대화 시작 버튼 좌측)
   - 3개 `data-tutorial-id` 추가: `sessions-new-chat` (새 대화 버튼), `sessions-card-first` (첫 카드만), `sessions-report-cta` (첫 완료 카드의 리포트 버튼만)

4. **`frontend/src/app/instructor/dashboard/page.tsx`** (+26 lines)
   - Import 추가, `useAutoStartTutorial("instructor", !mIsLoadingData && !!mHeatmap)` 호출 — heatmap 로드 완료 시점
   - 페이지 제목 옆에 `<TutorialButton tutorialId="instructor" />` 배치 (flex justify-between 헤더)
   - 4개 `data-tutorial-id` 추가 (wrapper div로): `instructor-class-selector`, `instructor-summary-cards`, `instructor-heatmap`, `instructor-student-list`
   - 하위 컴포넌트(ClassSelector, SummaryCards, HeatmapChart, StudentList)는 수정 없이 wrapper div만 추가

5. **`frontend/src/app/admin/dashboard/page.tsx`** (+22 lines)
   - Import 추가, `useAutoStartTutorial("admin", !mIsLoading && !!mStats)` 호출 — stats 로드 완료 시점
   - 페이지 제목 옆에 `<TutorialButton tutorialId="admin" />` 배치
   - 4개 `data-tutorial-id` 추가: `admin-demo-banner` (amber 배너 div), `admin-stats-cards` (4 카드 grid), `admin-bar-chart` (BarChart Card), `admin-radar-chart` (RadarChart Card)

### 총 attribute 수

- **18개 `data-tutorial-id`** 추가 → `tutorialSteps.ts`의 18개 step selector와 1:1 매핑 완료
- **4개 `TutorialButton`** (페이지당 하나)
- **4개 `useAutoStartTutorial`** 훅 호출 (페이지별 적절한 ready 조건)

## Key Decisions

### Chat page: ready 조건
Pre-session 구간에서 튜토리얼이 시작되면 첫 단계(subject-selector)부터 자연스럽게 spotlight. 이후 post-session 단계(progress-bar/thought-panel/hint/end) 타깃은 즉시 DOM에 없으므로 overlay의 `waitForTarget`이 5초 timeout 후 center fallback으로 tooltip을 띄움. 사용자가 "대화 시작"을 누른 뒤 다음 단계로 넘어가면 타깃이 실제로 DOM에 렌더되어 정상 spotlight됨. 세션 도중 재진입하면(재개 시) pre-session 단계 타깃이 없으므로 해당 step만 center fallback 처리.

### Sessions page: 첫 카드 only marking
Map callback에서 `index === 0`로 첫 entry만 `sessions-card-first` 부여. 리포트 CTA도 동일한 패턴으로, 첫 번째 **완료** 세션을 미리 계산(`tFirstCompletedId`)하여 해당 카드의 버튼만 marking. 두 마커는 서로 다른 카드일 수 있음(첫 카드가 완료 상태가 아닐 수도).

### Dashboard pages: wrapper div 전략
ClassSelector/SummaryCards/HeatmapChart/StudentList 하위 컴포넌트를 건드리지 않고 호출 시점에 wrapper `<div data-tutorial-id="…">`로 감싸는 방식. 기존 layout이 grid / flex 컨테이너 안에 들어가 있어도 wrapper div가 block display로 동작하여 시각적 차이 없음.

### TutorialButton 위치
페이지 제목 우측(flex justify-between)이 가장 자연스러운 발견 위치. Chat만 예외로 pre-session Card의 CardHeader 우상단(absolute)에 배치 — 채팅 UI가 pre-session / in-session 상태에 따라 레이아웃이 크게 바뀌므로 Card 내부에 두는 것이 일관성에 유리하다.

## Build Verification

```bash
npx tsc --noEmit  # 0 errors
npm run build     # Compiled successfully
```

11개 페이지 모두 빌드 성공. 페이지별 번들 사이즈 증가는 `TutorialButton` import + 3-5 lines 추가 분으로 미미함 (student/chat 11.7 kB, student/sessions 3.12 kB, instructor/dashboard 12.6 kB, admin/dashboard 9.06 kB).

## Potential Concerns

- **Chat post-session targets**: `chat-progress-bar` 등 4개 타깃은 세션 시작 후에만 렌더된다. 튜토리얼이 pre-session에서 시작되어 이 단계에 도달하면 `waitForTarget` 5s timeout → center fallback. 사용자가 tutorial을 완주하려면 세션을 실제로 시작해야 하거나 center fallback으로 설명만 읽어야 함. 판정단 데모에서는 `TutorialButton`으로 원하는 시점에 재실행 가능하므로 OK.
- **Sessions empty 상태**: 세션 0개면 `useAutoStartTutorial`의 ready가 false → 튜토리얼 시작 안 함. 이는 의도적 — card 기반 단계(step 2, 3)가 의미 없기 때문. 세션이 생기면 다음 방문 시 자동 트리거.
- **localStorage 완료 플래그**: 한 번 완료되면 재방문 시 자동 트리거 안 됨. `?` 버튼으로 언제든 재실행 가능. 데모 당일 전체 비활성화는 `thinkbridge_tutorial_disabled=true` 글로벌 플래그로 가능.

## Commit

- (이 커밋) — `feat(tutorial): integrate tutorial overlay + trigger on 4 pages (Phase 3)`
