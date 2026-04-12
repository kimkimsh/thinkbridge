# 20. 모바일 햄버거 하단 floating → 상단 Navbar 고정 재설계

## 요약

모바일 햄버거 메뉴를 **하단 floating 버튼 (페이지마다 좌/우 분기)** → **상단 Navbar 좌측 고정 (전 페이지 공통)** 으로 재설계. 이전 구조는 어느 위치에 있든 페이지 하단 컨텐츠(채팅 입력 바, 세션 카드 flow, ThoughtPanel 플로팅 트리거 등)를 가릴 수밖에 없었고, 페이지별 위치 분기 로직(`HAMBURGER_CHAT_POSITION` / `HAMBURGER_DEFAULT_POSITION`) 으로 UX 일관성도 깨졌다.

- **Date**: 2026-04-13
- **Affected files**:
  - `frontend/src/components/layout/MobileMenu.tsx` (NEW)
  - `frontend/src/components/layout/Sidebar.tsx` (desktop-only 로 단순화, NavList/nav items export)
  - `frontend/src/components/layout/Navbar.tsx` (좌측에 `<MobileMenu />` 삽입)
- **Commit** (예정): `feat(layout): move mobile hamburger from bottom-float to top Navbar`

## 배경 / 문제

### 이전 구조 (v1.2 까지)

`Sidebar.tsx` 내부에서 모바일 햄버거가 **fixed bottom floating 버튼** 으로 렌더됨:

```tsx
const HAMBURGER_DEFAULT_POSITION = "bottom-4 right-4";
const HAMBURGER_CHAT_POSITION = "bottom-4 left-4";

const tIsChatPage = pathname === CHAT_PAGE_PATH;
const tHamburgerPositionClass = tIsChatPage ? HAMBURGER_CHAT_POSITION : HAMBURGER_DEFAULT_POSITION;

<div className={cn("fixed z-50 md:hidden", tHamburgerPositionClass)}>
    <Sheet>...
```

### 문제점

1. **어느 방향이든 콘텐츠 가림**
   - 우하단: 세션 목록에서 마지막 카드 우측 아래가 가려짐 / 리포트 페이지 스크롤 중 차트 hover 간섭
   - 좌하단: 채팅 입력창 좌측 하단 이슈 (모바일 키보드 올라올 때 겹침)
   - 하단 floating 자체가 콘텐츠 safe-area 를 침범

2. **페이지별 위치 분기 = 일관성 파괴**
   - 채팅 페이지만 좌하단 / 그 외는 우하단 → 사용자가 "아까는 오른쪽에 있었는데?" 로 혼란
   - 새 페이지 추가 시마다 분기 조건 늘어나는 구조

3. **데스크톱/모바일 네비게이션 로직 섞임**
   - `Sidebar.tsx` 가 desktop `<aside>` + mobile `<Sheet>` 동시 관리 → 비대
   - 모바일 UX 조정하려면 desktop 도 같이 건드림

## 변경 사항

### 1. `frontend/src/components/layout/MobileMenu.tsx` (NEW)

단일 책임: 모바일 전용 햄버거 트리거 + Sheet. Navbar 내부에 마운트.

```tsx
export function MobileMenu()
{
    const { user } = useAuth();
    const pathname = usePathname();
    const [mIsOpen, setIsOpen] = useState(false);

    if (!user) return null;

    const tNavItems = getNavItemsForRole(user.role);

    return (
        <Sheet open={mIsOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-9 w-9 ..."
                    aria-label={MOBILE_MENU_TRIGGER_LABEL}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side={MOBILE_SHEET_SIDE} className="w-64 p-0">
                <SheetHeader className="border-b px-4 py-3 text-left">
                    <SheetTitle className="sr-only">{MOBILE_MENU_TITLE}</SheetTitle>
                    ...
                </SheetHeader>
                <NavList
                    items={tNavItems}
                    pathname={pathname}
                    onItemClick={() => setIsOpen(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
```

**상수** (매직 문자열 제거):
- `MOBILE_MENU_TRIGGER_LABEL = "메뉴 열기"` — aria-label + title
- `MOBILE_MENU_TITLE = "네비게이션"` — SheetTitle (sr-only)
- `MOBILE_SHEET_SIDE = "left"` — Sheet 슬라이드인 방향

**접근성 강화**:
- `<SheetHeader><SheetTitle className="sr-only">...</SheetTitle>` → Radix Dialog 경고 해결 + 스크린 리더 공지
- `aria-label` + `title` 동시 제공

### 2. `frontend/src/components/layout/Sidebar.tsx` (desktop-only 로 단순화)

- 모바일 Sheet 블록 (기존 163-188 라인) **완전 삭제**
- 상수 `HAMBURGER_DEFAULT_POSITION`, `HAMBURGER_CHAT_POSITION`, `CHAT_PAGE_PATH` **삭제**
- `useState` / `Sheet` / `SheetContent` / `SheetTrigger` / `Menu` / `Button` / `cn` import 제거 (데스크톱 사이드바에서는 불필요)
- `NavItem`, `NavList`, `getNavItemsForRole` 을 `export` → MobileMenu 가 재사용

**결과**: Sidebar 는 `<aside className="hidden md:flex md:w-56 ...">` 하나만 렌더. 책임 단순화.

### 3. `frontend/src/components/layout/Navbar.tsx` (좌측 클러스터 추가)

```diff
 <div className="flex h-14 items-center justify-between px-4 md:px-6">
-    {/* Logo */}
-    <Link href={tLogoHref} className="flex items-center gap-2">
-        <Brain className="h-6 w-6 text-blue-600" />
-        <span>...</span>
-    </Link>
+    {/* Left cluster: mobile menu trigger (mobile only) + logo */}
+    <div className="flex items-center gap-2">
+        <MobileMenu />
+        <Link href={tLogoHref} className="flex items-center gap-2">
+            <Brain className="h-6 w-6 text-blue-600" />
+            <span>...</span>
+        </Link>
+    </div>
```

- 좌측을 `<div className="flex items-center gap-2">` 로 묶고 MobileMenu + 로고를 같은 클러스터에 배치
- MobileMenu 는 비로그인 시 `null` 반환 → 비로그인 상태에서도 로고 정렬 깨지지 않음
- `justify-between` 덕분에 우측 사용자 드롭다운 위치는 변동 없음

## 설계 결정 근거

| 결정 | 이유 |
|------|------|
| 위치: Navbar 좌측 (로고 앞) | 브라우저 menu 관례 + Sheet 좌측 슬라이드인과 위치 매칭 (menu 열기 방향의 mental model 일치) |
| ghost 스타일 | Navbar 내부에선 주 CTA (로그인/회원가입) 와 시각적으로 경쟁하지 않아야 함. `variant="ghost"` + `text-gray-700` |
| `h-9 w-9` (36px) | Navbar 높이 56px 내에서 정사각형 터치 타겟 확보 + 로고 옆에서 비례 균형 |
| `md:hidden` 이중 가드 | 버튼 자체 + (필요 시 상위 wrapper) 양쪽에 적용. Sheet 은 md+ 에서 절대 트리거 안 됨 |
| NavList export | 데스크톱 사이드바와 모바일 Sheet 가 동일 소스 → "둘 다 같은 항목" 보장 |
| SheetHeader/SheetTitle 추가 | Radix 요구사항 — 제공하지 않으면 console.error 발생. sr-only 로 시각적으로는 숨김 |
| 페이지별 분기 삭제 | 상단 고정 시 어떤 페이지도 가리지 않으므로 분기 근거 소멸 |

## 검증

### 정적 검증
- `next lint`: ✔ No ESLint warnings or errors

### Playwright 자동 테스트

1. **모바일 390×844, `/student/chat` 로그인 후**:
   - 햄버거 DOM 검출 (aria-label="메뉴 열기") → 좌표 `(x=16, y=10, 36×36)` — Navbar 상단 내부 ✅
   - `insideNavbar: true` (Navbar 높이 56px 내부)
   - **기존 bottom-floating 버튼 완전 제거** — `document.querySelectorAll('[class*="fixed"][class*="bottom-4"]')` 결과 0건 ✅
   - 햄버거 클릭 → Sheet 슬라이드인 → "채팅" / "세션 목록" 네비 아이템 렌더 ✅

2. **데스크톱 1280×800, 동일 계정**:
   - `<aside>` (데스크톱 사이드바) 표시, width=224px ✅
   - MobileMenu 햄버거 `display: none` (`md:hidden`) ✅
   - 데스크톱 사이드바에 "채팅", "세션 목록" 링크 렌더 ✅

### 스크린샷

- `mobile_hamburger_top_closed.png` — 모바일 기본 (햄버거 + 로고 + 우측 드롭다운, 하단 floating 없음)
- `mobile_hamburger_top_opened.png` — 모바일 Sheet 열림 (좌측 슬라이드인)

## 시나리오 문서 업데이트

`docs/test/user_test/fix_verification_scenarios.md` v1.3 갱신:
- 매핑 표 C.2 행: "좌하단" → "상단 Navbar 고정 (전 페이지 공통)"
- V.12 전면 재작성 (10단계 → 12단계): DOM 증거 + 하단 floating 제거 확인 + 역할별 반복 추가
- 스모크 Step 5 축약 재작성: "페이지 어디든 Navbar 좌측 고정 + 하단 floating 없음"
- 변경 이력 v1.3 엔트리 추가

## 영향도

- **Breaking change 없음**: Sheet 내부 네비 아이템 / Sheet 슬라이드 방향 / 데스크톱 사이드바 모두 동일
- **이전 V.12 시나리오는 obsolete** — v1.3 에서 동일 번호로 새 시나리오 덮어씀 (기존 통과 여부는 재테스트 필요)
- **CLAUDE.md Change Policy 준수**: 페이지별 위치 분기 제거는 사용자가 요청한 "상단 고정" 의 자연스러운 부산물 — 별도 justification 불필요

## Commit

- **Affected**:
  - NEW `frontend/src/components/layout/MobileMenu.tsx`
  - MOD `frontend/src/components/layout/Sidebar.tsx`
  - MOD `frontend/src/components/layout/Navbar.tsx`
  - DOC `docs/test/user_test/fix_verification_scenarios.md` (v1.3)
- **Message**: `feat(layout): move mobile hamburger from bottom-float to top Navbar`
- **Tags**: Mobile, UX, Layout, Navigation
