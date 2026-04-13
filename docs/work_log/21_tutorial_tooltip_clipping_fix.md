# 21. 튜토리얼 툴팁 viewport clipping 수정

## 요약

`TutorialOverlay.tsx` 의 툴팁 위치 계산이 viewport 경계를 검사하지 않아 화면 해상도와 타겟 위치에 따라 툴팁이 화면 밖으로 잘려나가던 critical 버그를 수정. 두 가지 핵심 메커니즘 추가:

1. **Viewport edge clamping**: 계산된 좌표를 `[viewportMargin, viewport - tooltipSize - viewportMargin]` 범위로 강제 clamp
2. **Auto-flip placement**: 선호 방향에 충분한 공간이 없으면 반대편으로 자동 전환 (left↔right, top↔bottom)

- **Date**: 2026-04-13
- **Affected files**:
  - `frontend/src/lib/tutorialConstants.ts` (+4 상수)
  - `frontend/src/components/tutorial/TutorialOverlay.tsx` (positioning 로직 전면 재작성)
- **Commit** (예정): `fix(tutorial): clamp tooltip within viewport + auto-flip placement on overflow`

## 배경 / 버그 증상

### 사용자 보고
"화면 해상도에 따라 튜토리얼 도움말이 잘리는 경우가 발생해."

### 재현 조건
- iPad landscape (820×1180) 등 768-1024px 중간 해상도
- 채팅 페이지에서 `chat-analysis` step (placement="left", target=ThoughtPanel)
- ThoughtPanel 이 viewport 우측 끝에 위치 → placement="left" 계산이 음수 좌표 생성 → 툴팁 좌측 잘림

### 근본 원인 (`computeTooltipStyle` 기존 로직)

```ts
// 기존 코드 — 경계 검사 없음
if (input.placement === "left") {
    return {
        position: "fixed",
        top: tRect.top + tRect.height / 2,
        right: window.innerWidth - tRect.left + tOffset,  // ← 계산만, 검증 없음
        transform: "translateY(-50%)",
        ...
    };
}
```

문제점:
1. **viewport edge clamping 부재**: 계산값이 음수거나 viewport 초과해도 그대로 적용
2. **auto-flip 로직 부재**: 우측에 공간 없어도 placement="right" 강제 사용
3. **mobile breakpoint(768px) 만 center fallback**: 769px-1024px 중간 해상도는 보호 없음
4. **height 측정 없음**: `transform: translateY(-50%)` 만으로 처리하다 vertical 클리핑 발생 가능

## 변경 사항

### 1. `frontend/src/lib/tutorialConstants.ts` — 신규 상수 4개

```ts
/** Minimum margin (px) between tooltip and any viewport edge — prevents flush-against-edge appearance. */
export const TUTORIAL_VIEWPORT_MARGIN_PX = 12;

/** Minimum free space (px) required on preferred placement side before we auto-flip to opposite. */
export const TUTORIAL_FLIP_MIN_SPACE_PX = 40;

/** Tooltip dimension estimate (px) used for the first paint before real measurement arrives. */
export const TUTORIAL_TOOLTIP_ESTIMATED_HEIGHT_PX = 200;
export const TUTORIAL_TOOLTIP_ESTIMATED_WIDTH_PX = 360;
```

**이유**: 매직 숫자 제거 + 향후 디자인 조정 시 한 곳에서 통제.

### 2. `TutorialOverlay.tsx` — 측정 + clamp + flip 로직 추가

#### a. Tooltip 크기 측정 (`useLayoutEffect` + ref)

```tsx
const mTooltipRef = useRef<HTMLDivElement | null>(null);
const [mTooltipSize, setTooltipSize] = useState<Size | null>(null);

useLayoutEffect(() => {
    if (!mTooltipRef.current) return;
    const tRect = mTooltipRef.current.getBoundingClientRect();
    const tNext: Size = { width: tRect.width, height: tRect.height };
    if (!mTooltipSize || mTooltipSize.width !== tNext.width || mTooltipSize.height !== tNext.height) {
        setTooltipSize(tNext);
    }
}, [mTooltipSize, currentStepIndex, activeTutorialId, mViewport]);
```

**왜 useLayoutEffect**: paint 직전에 동기적으로 측정 → 다음 render 에서 정확한 위치 계산. useEffect 사용 시 한 frame flicker 발생 가능.

**왜 두 단계 렌더링**: 첫 paint 는 estimate (200×360) 로 위치 계산 → 측정 후 두 번째 paint 에서 실제 크기 반영. 사용자 눈에는 거의 동시에 보이고, 잘못된 위치로 한 frame 보였다 사라지는 것보다 안전.

#### b. Viewport 크기 추적

```tsx
const [mViewport, setViewport] = useState<Size>({ width: 360, height: 200 });

useEffect(() => {
    function syncViewportSize() {
        setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    syncViewportSize();
    window.addEventListener("resize", syncViewportSize);
    return () => window.removeEventListener("resize", syncViewportSize);
}, []);
```

리사이즈 시 위치 재계산 (기존에는 `window.innerWidth` 직접 참조 → resize 시 stale).

#### c. Auto-flip 로직

```ts
function resolveHorizontalPlacement(
    preferred: "left" | "right",
    targetRect: Rect,
    viewport: Size,
    tooltipWidth: number,
    offset: number,
): "left" | "right" {
    const tSpaceLeft = targetRect.left - offset;
    const tSpaceRight = viewport.width - (targetRect.left + targetRect.width) - offset;
    if (preferred === "right" && tSpaceRight < tooltipWidth + TUTORIAL_FLIP_MIN_SPACE_PX && tSpaceLeft > tSpaceRight) {
        return "left";
    }
    if (preferred === "left" && tSpaceLeft < tooltipWidth + TUTORIAL_FLIP_MIN_SPACE_PX && tSpaceRight > tSpaceLeft) {
        return "right";
    }
    return preferred;
}
```

**판정 기준**:
- 선호 방향에 `tooltipWidth + 40px (FLIP_MIN_SPACE)` 미만의 공간만 있으면
- 그리고 반대 방향에 더 많은 공간이 있으면
- → 반대 방향으로 flip

수직(top↔bottom)도 같은 패턴으로 `resolveVerticalPlacement` 함수.

#### d. Clamp 로직

```ts
function clampToRange(value: number, min: number, max: number): number {
    if (max < min) return min;  // tooltip 이 viewport 보다 클 때 — 한쪽 정렬 (오버플로우 일관성)
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

// 사용 예
const tClampedLeft = clampToRange(tLeft, tMargin, tViewport.width - tTooltipWidth - tMargin);
const tClampedTop = clampToRange(tTop, tMargin, tViewport.height - tTooltipHeight - tMargin);
```

**`max < min` 처리 이유**: 만약 측정된 tooltip 이 viewport 보다 크면 (스마트폰 가로 + 긴 description), `viewport - tooltipWidth - margin < margin` 가 되어 음수 max 발생. 이 경우 left=margin 으로 일관되게 잡아 한쪽으로만 오버플로우 (양쪽 다 짤리는 것보다 가독성 ↑).

#### e. transform 제거 → 절대 좌표

```ts
// 기존: transform: "translateX(-50%)"  ← clamp 적용 어려움
// 수정: left: tRect.left + tRect.width / 2 - tTooltipWidth / 2  ← 직접 좌표 계산
```

`translateX(-50%)` 는 CSS 단계에서 처리되므로 JS clamp 후 적용 불가. 절대 좌표로 직접 계산하면 clamp 가능.

### 3. Placement 계산 통일

기존 4개 placement 별 5줄 return → 통합 흐름:
1. `resolveHorizontal/VerticalPlacement` 로 flip 여부 결정
2. resolved placement 에 따라 raw `tLeft`, `tTop` 계산
3. 마지막에 `clampToRange` 로 강제 viewport 안에 가둠

## 검증

### 정적
- `next lint`: ✔ No ESLint warnings or errors

### Playwright 자동 검증 (로컬 dev + 프로덕션 백엔드)

#### iPad landscape (820×1180), step 5 (chat-analysis, placement="left")

| 항목 | 측정값 | 결과 |
|------|-------|------|
| viewport | 820×1180 | — |
| target rect (ThoughtPanel mobile sheet 닫힘 → 0×0) | (0,0,0,0) | — |
| tooltip card | L=20, R=380, T=12, B=226 | viewport 안전 마진(12px)에 안착 |
| **fullyVisible** | **true** | ✅ |

이전 버그 상태에서는 `right: viewport.width - 0 + 12 = 832 > viewport.width` → 우측 잘림 발생.

#### iPad landscape (820×1180), step 7 (chat-end, placement="top")

| 항목 | 측정값 | 결과 |
|------|-------|------|
| target (종료 버튼) | T=1114, B=1146 (viewport 하단 1180) | space below=34px |
| 원래 placement | top → 위로 배치 | preserve (auto-flip 불필요) |
| tooltip card | L=448, R=808, T=903, B=1094 | viewport 내부 |
| **fullyVisible** | **true** | ✅ |

#### Desktop 1280×800, step 5 (chat-analysis, placement="left")

| 항목 | 측정값 | 결과 |
|------|-------|------|
| target ThoughtPanel | L=960, R=1280, W=320 | viewport 우측 끝에 flush |
| spaceLeftOfTarget | 960px | 충분 |
| spaceRightOfTarget | 0px | placement="right" 였다면 잘렸을 것 |
| tooltip card | L=580, R=940, T=398, B=613 | target 좌측에 정확 배치 (gap 20px = offset) |
| **fullyVisible** | **true** | ✅ |

### 스크린샷
- `tutorial_clip_fix_step5_ipad820.png` — iPad 820px chat-analysis 안전 배치
- `tutorial_clip_fix_step7_ipad820.png` — iPad 820px chat-end 위쪽 배치 + spotlight
- `tutorial_clip_fix_step5_desktop1280.png` — 데스크톱 1280px chat-analysis ThoughtPanel 좌측 배치

## 예상되는 추가 효과

이 수정은 다음 시나리오에서도 자동으로 안전:
- 작은 노트북 (1024×600 등) — bottom placement 가 화면 하단을 침범할 시 top 으로 flip
- 가로형 모바일 (568×320 iPhone SE landscape) — 모바일 breakpoint 가 768px 미만이라 center fallback 진입
- 고DPI 모니터 (3840×2160) — clamp 는 상한만 잡으므로 큰 화면에서는 영향 없음
- ThoughtPanel collapse/expand 동적 변경 — viewport listener 가 resize 시 재계산

## 시나리오 문서 업데이트 권장

`docs/test/user_test/fix_verification_scenarios.md` 의 V.16 (chat 7 steps) / V.18 (instructor) / V.19 (admin) 에 다음 검증 단계 추가 권장:
- "각 step 의 툴팁 카드가 viewport 경계를 넘지 않는지 확인 (`getBoundingClientRect` 로 left ≥ 0 + right ≤ viewport.width 등)"
- "iPad landscape (820px) 에서 step 5 가 화면 안에 완전히 표시되는지 확인"

## Commit

- **Affected**:
  - `frontend/src/lib/tutorialConstants.ts` (+4 상수)
  - `frontend/src/components/tutorial/TutorialOverlay.tsx` (+1 useLayoutEffect, +1 useEffect, +3 함수, ~50 line refactor)
- **Message**: `fix(tutorial): clamp tooltip within viewport + auto-flip placement on overflow`
- **Tags**: Tutorial, Layout, Bugfix, Responsive
