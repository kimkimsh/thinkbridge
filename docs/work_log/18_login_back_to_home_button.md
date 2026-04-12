# 18. 로그인 페이지 "처음 화면으로" 돌아가기 버튼 추가

## 요약

로그인 페이지에 랜딩 페이지(`/`)로 즉시 돌아갈 수 있는 **"처음 화면으로"** 버튼을 추가했다. 로그인 화면에 들어온 사용자가 설명/소개 화면으로 되돌아갈 명시적 경로가 없어서 브라우저 뒤로가기에 의존해야 했던 UX 사각지대를 해결.

- **Date**: 2026-04-13
- **Affected file**: `frontend/src/app/login/page.tsx`
- **Commit** (예정): `feat(login): add "처음 화면으로" back-to-landing link`

## 배경 / 문제

- 로그인 페이지는 좌측 브랜드 패널 + 우측 폼의 split 레이아웃이었고, 랜딩으로 돌아갈 공식 경로는 다음 3가지에 그쳤다:
  1. 브라우저 뒤로가기 (직접 `/login` URL로 진입한 경우 이력이 없을 수 있음)
  2. 모바일 로고 아이콘 (암묵적 링크 — 랜딩 복귀인지 불분명)
  3. Navbar 없음 — 로그인/회원가입 페이지는 전역 Navbar가 `/` 진입 후에만 보이는 구조가 아니지만 AuthProvider 상태에 의존해 혼동 가능
- "데모를 둘러보다가 실수로 로그인 페이지 진입" 같은 케이스에서 사용자가 브랜드 소개/CTA 화면으로 돌아오기 어려움

## 변경 사항

### 1. 상수 추가 (`frontend/src/app/login/page.tsx`)

```ts
/** 처음 안내 화면(랜딩)으로 돌아가는 내비게이션 라벨과 경로 */
const BACK_TO_HOME_LABEL = "처음 화면으로";
const HOME_PATH = "/";
```

프로젝트 원칙: 매직 문자열 제거 + 재사용 가능 (라벨은 aria-label에도 사용). `HOME_PATH = "/"` 는 기존 코드의 여러 곳에서 반복되던 리터럴을 치환.

### 2. ArrowLeft 아이콘 import 추가

```diff
-import { Brain, ArrowRight, Sparkles, ... } from "lucide-react";
+import { Brain, ArrowRight, ArrowLeft, Sparkles, ... } from "lucide-react";
```

브라우저 뒤로가기 시멘틱을 따르는 universal UI 관례 (← 아이콘).

### 3. 우측 패널 상단에 Link 배치

```tsx
<div className="relative flex flex-1 items-center justify-center bg-gray-50 px-4">
    <Link
        href={HOME_PATH}
        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 lg:left-6 lg:top-6"
        aria-label={BACK_TO_HOME_LABEL}
    >
        <ArrowLeft className="h-4 w-4" />
        {BACK_TO_HOME_LABEL}
    </Link>
    ...
```

#### 설계 결정 근거

1. **위치**: 우측 패널(로그인 폼 영역)의 좌상단. 브라우저 back 버튼 위치와 일치 + 좌측 브랜드 패널은 마케팅 컨텐츠용으로 보존.
2. **반응형**: 모바일/태블릿에서는 `left-4 top-4` (16px), 데스크톱(lg 이상)에서는 `left-6 top-6` (24px)로 약간 안쪽으로 배치. 브랜드 패널이 화면 절반을 차지하므로 버튼은 뷰포트 우측 절반 기준.
3. **부모 `relative`**: 기존 `flex flex-1 items-center justify-center`에 `relative` 추가 — absolute 자식의 좌표 기준을 우측 패널로 제한 (브랜드 패널과 겹치지 않도록).
4. **스타일**: Ghost-style 내비게이션 링크 (`text-gray-500 hover:text-indigo-600`). 메인 CTA (로그인 / 체험하기) 와 시각적으로 경쟁하지 않도록 눈에 띄지 않게 유지.
5. **접근성**: `aria-label` + 텍스트 라벨 동시 제공 → 스크린 리더와 시각 사용자 모두 커버. `focus-visible:ring-2 focus-visible:ring-indigo-300` 으로 키보드 포커스 가시성 확보.
6. **`<Link>` 사용**: Next.js App Router 클라이언트 사이드 네비게이션 → 페이지 번들 재다운로드 없이 랜딩으로 이동 (빠른 UX). `<a>` 대신 `<Link>` → 우클릭 "새 탭에서 열기"도 지원.

### 4. 기존 모바일 로고의 href도 상수화

기존에 하드코딩된 `href="/"` 를 `href={HOME_PATH}` 로 교체하여 "같은 링크는 같은 상수" 원칙 유지.

## 검증

### 정적 검증
- `next lint`: ✔ No ESLint warnings or errors (2026-04-13)
- TypeScript strict: 통과 (`npx tsc --noEmit` exit 0)

### Playwright 자동 테스트 (로컬 `next dev` 환경)

1. **데스크톱 뷰 (1245×1258)**:
   - 버튼 DOM 1개 검출 (`aria-label="처음 화면으로"`, `href="/"`)
   - 좌표: top=24, left=646.5 — 우측 패널 시작 (viewport 622.5) 기준 24px 안쪽 ✅
   - 클래스: `absolute left-4 top-4 ... lg:left-6 lg:top-6` 포함 + hover/focus 유틸리티 모두 적용 ✅

2. **모바일 뷰 (390×844)**:
   - 버튼 좌상단 "← 처음 화면으로" 시인성 양호 (스크린샷 첨부)
   - 모바일 로고 영역 위쪽에 위치하여 가장 먼저 인지됨

3. **클릭 동작**:
   - 로그인 페이지 (`/login`) → 버튼 클릭 → `/` 이동 성공 (클라이언트 사이드 전환, 전체 리로드 없음)

### 시각적 QA (스크린샷)

- `login_back_button_desktop.png`: 데스크톱에서 우측 패널 좌상단 표시 확인
- `login_back_button_mobile.png`: 모바일에서 최상단 표시 확인

## 회원가입 페이지에 대한 참고

`frontend/src/app/register/page.tsx` 도 동일한 UX 이슈(랜딩 복귀 공식 경로 없음)를 가지지만, 본 PR 은 **사용자가 명시적으로 요청한 로그인 페이지에 한정**한다. 프로젝트 CLAUDE.md Change Policy:

> 요청되지 않은 코드 변경 시 이유 명시 필요

회원가입 페이지에도 같은 패턴 적용을 권장하며, 별도 커밋으로 진행할 수 있다 (위 Link 블록을 register page의 우측 패널에 동일하게 삽입).

## 관련 상수 향후 확장

`BACK_TO_HOME_LABEL` / `HOME_PATH` 를 공용 constants 파일 (`frontend/src/lib/constants.ts` 또는 `authConstants.ts`) 로 이동하면 register page 적용 시 DRY 가능. 현재는 단일 사용처라 로컬 상수 유지.

## Commit

- **Affected file**: `frontend/src/app/login/page.tsx`
- **Message**: `feat(login): add "처음 화면으로" back-to-landing link`
- **Tags**: UX, Accessibility, Navigation
