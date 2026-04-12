# 19. 대화 세션 중 튜토리얼 재실행 버튼 누락 보완

## 요약

`ChatInterface.tsx` 에 `TutorialButton` 이 없어서 **대화 세션이 시작된 이후에는 튜토리얼을 재실행할 방법이 전무**했던 문제를 수정. ProgressBar 헤더 우측에 `도움말` 버튼을 추가하여 대화 중에도 언제든 `chat` 튜토리얼(7 steps)을 재실행 가능.

- **Date**: 2026-04-13
- **Affected files**: `frontend/src/components/chat/ChatInterface.tsx`
- **Commit** (예정): `fix(chat): expose tutorial replay button inside active ChatInterface`

## 배경 / 문제 (실제 버그)

### 증상
사용자가 `/student/chat` 의 "새 대화 시작" 카드에서 `도움말` 버튼을 한 번 눌러 튜토리얼을 종료하거나 "대화 시작하기" 를 클릭해 세션을 시작하면:
- 카드가 `ChatInterface` 로 교체되면서 `TutorialButton` 도 함께 언마운트 → **더 이상 튜토리얼 재실행 경로 없음**
- chat 튜토리얼은 7 steps 구조인데 **step 4-7 (progress-bar, thought-panel, hint-button, end-button)** 은 오히려 세션 시작 후에야 실제 타겟이 DOM 에 생기는 post-session 스텝
- 즉, 세션 중간에 "튜토리얼 다시 보고 싶어요" 니즈가 있을 때 유일한 방법이 localStorage 수동 삭제 → 새로고침 → ChatInterface 언마운트 → pre-session 카드 재렌더 → 도움말 클릭, 이라는 비현실적 경로

### 범인 코드

`frontend/src/app/student/chat/page.tsx:365`:
```tsx
<TutorialButton tutorialId="chat" />
```
이 `TutorialButton` 은 `{mSessionId === null}` 분기의 **pre-session Card** 안에만 있었다. 세션 생성 시 `{mSessionId !== null}` 분기로 전환되며 `<ChatInterface ... />` 렌더 → 기존 `TutorialButton` 은 DOM 에서 사라짐.

`ChatInterface.tsx` 전체 텍스트에 `TutorialButton` import 자체가 없었음 — Phase 3 integration (`5badfb7`) 에서 빠진 누락.

## 변경 사항

### `frontend/src/components/chat/ChatInterface.tsx`

1. **Import 추가**
   ```diff
    import { ProgressBar } from "@/components/chat/ProgressBar";
    import { MessageBubble } from "@/components/chat/MessageBubble";
    import { ThoughtPanel } from "@/components/chat/ThoughtPanel";
   +import { TutorialButton } from "@/components/tutorial/TutorialButton";
    import { streamMessages, endSession } from "@/lib/api";
   ```

2. **ProgressBar 헤더 우측에 버튼 삽입**

   기존 헤더는 `flex items-center justify-between` 이었지만 자식이 하나라 `justify-between` 이 무의미한 상태였음. 둘째 자식으로 `TutorialButton` 을 넣으니 자동으로 우측 정렬:
   ```diff
   -<div className="mb-2 flex items-center justify-between">
   -    <div className="flex items-center gap-2">
   +<div className="mb-2 flex items-center justify-between gap-2">
   +    <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" ...>{tSubjectLabel}</Badge>
            {topic && <span className="... truncate max-w-[200px]">{topic}</span>}
            {isGuest && <Badge ...>체험 중 ({mTurnCount}/{GUEST_MAX_TURNS})</Badge>}
        </div>
   +    <TutorialButton tutorialId="chat" className="shrink-0" />
    </div>
   ```

#### 설계 결정 근거

| 결정 | 이유 |
|------|------|
| 위치: ProgressBar 헤더 우측 | 항상 화면 상단에 고정 + 기존 `justify-between` 레이아웃 활용 → 추가 스타일 거의 없이 우측 정렬 |
| input bar 우측 대신 선택 | input bar 는 이미 `힌트 / 보내기 / 종료` 3개 버튼 밀집. 추가 시 주 액션과 시각적 경쟁 |
| floating button 미선택 | 모바일은 이미 ThoughtPanel 플로팅 버튼 (z-40) 이 있음. 두 번째 floating 은 혼란 유발 |
| `className="shrink-0"` | 긴 topic 이 우측으로 밀어내지 못하도록 버튼 너비 고정 |
| `min-w-0` on badge flex | topic 의 `truncate max-w-[200px]` 가 제대로 작동하도록 부모 flex 의 min-width 제약 해제 |
| `gap-2` on parent flex | 좌측 badge 그룹과 우측 버튼 사이 여백 최소 확보 |

### 기존 TutorialButton 컴포넌트 재사용

수정 없이 `frontend/src/components/tutorial/TutorialButton.tsx` 그대로 사용. 기존 스타일:
- `variant="ghost"` — 배경 투명, 메인 CTA 와 경쟁 안 함
- `size="sm"` + `gap-1 text-gray-500 hover:text-indigo-600` — 서브 액션 적절
- `<span className="hidden sm:inline text-xs">{label}</span>` — **xs 뷰포트에서는 아이콘만**, sm 이상에서 "도움말" 라벨 표시 → 모바일에서 공간 절약

## 검증

### 정적 검증
- `next lint`: ✔ No ESLint warnings or errors (2026-04-13)

### 자동 테스트 (로컬 dev 환경, `NEXT_PUBLIC_API_URL=https://thinkbridge-api.onrender.com` override)

플로우: 학생 로그인 → 수학 + 주제 입력 → 대화 시작 → ChatInterface 활성 상태 확인.

**데스크톱 1245×1258**:
- `[data-tutorial-id='chat-progress-bar']` 존재 ✅ (ChatInterface 마운트 확인)
- `aria-label="도움말 다시 보기"` 버튼 검출됨 ✅
- `btnInsideProgressBar: true` — 버튼이 progress bar 섹션(top=57, bottom=218) 내부 (top=69, bottom=101)
- 위치: right=1233, viewport width=1245 (12px 마진, `shrink-0` 정상 작동)
- 버튼 클릭 → tutorial dialog step 1/7 ("과목을 선택하세요") 정상 오픈 ✅

**모바일 390×844**:
- 버튼 우상단 `?` 아이콘만 표시 (라벨 "도움말" 은 `hidden sm:inline` 으로 숨김) → 가로 공간 우호적 ✅

### 스크린샷

- `chat_tutorial_button_desktop.png` — 데스크톱 progress bar 우상단에 "도움말" 버튼
- `chat_tutorial_button_mobile.png` — 모바일 progress bar 우상단에 `?` 아이콘만

## 이번 수정으로 바뀌는 시나리오 검증 범위

`docs/test/user_test/fix_verification_scenarios.md` §4 의 **V.20 단계 1** 이 이제 완전히 통과:

```
단계 1: /student/chat 진입 (튜토리얼 완료 상태)
  기대: auto-trigger 없음 + 페이지 상단에 `?` 아이콘 존재
```

이전에는 "페이지 상단" 해석이 pre-session card 한정이었으나, **이제 active 세션 중에도 상단(ProgressBar 헤더)** 에 동일한 "도움말" 버튼이 존재. V.20 시나리오 의도가 이제 정확히 구현됨.

## 다른 페이지와 일관성

| 페이지 | TutorialButton 위치 | 대화 중에도 보이나? |
|-------|-------------------|-----------------|
| /student/chat (이전) | 새 대화 시작 카드 헤더 | ❌ 세션 시작 시 사라짐 |
| /student/chat (**수정 후**) | **ChatInterface ProgressBar 헤더 우측** (+ 기존 pre-session 카드 헤더도 유지) | ✅ |
| /student/sessions | 페이지 헤더 | ✅ 항상 |
| /instructor/dashboard | 페이지 헤더 | ✅ 항상 |
| /admin/dashboard | 페이지 헤더 | ✅ 항상 |

다른 페이지는 레이아웃이 고정이라 단일 TutorialButton 로 충분하지만, `/student/chat` 은 단일 라우트 안에서 pre-session ↔ active 두 UI 가 전환되므로 **양쪽에 모두 배치** 필요. 수정으로 그 gap 해소.

## 배포 후 확인 포인트

1. Vercel 프로덕션에 배포된 후 학생 또는 게스트 로그인 → 세션 시작 → 헤더 우상단 "도움말" 버튼 가시 확인
2. 버튼 클릭 → `chat` 튜토리얼 1/7 부터 정상 재시작
3. 튜토리얼 진행 중 실제 progress-bar / thought-panel / hint / end 타겟 하이라이트 — 이미 post-session DOM 이 존재하므로 `waitForTarget` 없이 즉시 스포트라이트 렌더 (V.24 center fallback 경로를 타지 않음 → 더 자연스러운 UX)

## Commit

- **Affected**: `frontend/src/components/chat/ChatInterface.tsx` (+3 imports, +1 component, +2 classes)
- **Message**: `fix(chat): expose tutorial replay button inside active ChatInterface`
- **Tags**: Tutorial, UX, Bugfix, Navigation
