"use client";

/**
 * Tutorial overlay component.
 *
 * Renders via React portal to document.body so it escapes any parent stacking context
 * and sits above in-page overlays. Uses an SVG mask to create a spotlight cutout on
 * the target element, positions a tooltip card relative to the target (4 placements),
 * and falls back to a centered modal when no target is found, on mobile, or when
 * placement is "center".
 *
 * Features:
 * - SVG mask spotlight with smooth rect transitions (respects prefers-reduced-motion).
 * - Responsive: switches to centered tooltip below the mobile breakpoint.
 * - Keyboard: Esc skips, ArrowRight/Enter advances, ArrowLeft goes back.
 * - Re-measures target rect on scroll/resize via requestAnimationFrame.
 * - SSR-safe (mounted guard before touching document).
 */

import { createPortal } from "react-dom";
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useCallback,
    type CSSProperties,
} from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorial, waitForTarget } from "@/lib/tutorial";
import {
    TUTORIAL_OVERLAY_Z_INDEX,
    TUTORIAL_SPOTLIGHT_PADDING_PX,
    TUTORIAL_TOOLTIP_OFFSET_PX,
    TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
    TUTORIAL_BACKDROP_OPACITY,
    TUTORIAL_TRANSITION_MS,
    TUTORIAL_WAIT_DEFAULT_TIMEOUT_MS,
    TUTORIAL_MOBILE_BREAKPOINT_PX,
    TUTORIAL_SCROLL_STABILIZE_MS,
    TUTORIAL_BTN_NEXT,
    TUTORIAL_BTN_PREV,
    TUTORIAL_BTN_SKIP,
    TUTORIAL_BTN_FINISH,
    TUTORIAL_BTN_CLOSE_ARIA,
    TUTORIAL_VIEWPORT_MARGIN_PX,
    TUTORIAL_FLIP_MIN_SPACE_PX,
    TUTORIAL_TOOLTIP_ESTIMATED_HEIGHT_PX,
    TUTORIAL_TOOLTIP_ESTIMATED_WIDTH_PX,
} from "@/lib/tutorialConstants";


// --- Local constants ---

/** SVG rect corner radius for the spotlight cutout (px). */
const SPOTLIGHT_CORNER_RADIUS_PX = 8;

/** SVG mask element id (must be unique on the page — scoped by overlay root). */
const SPOTLIGHT_MASK_ID = "tutorial-spotlight";

/** ARIA id for the tooltip title (referenced by aria-labelledby). */
const ARIA_TITLE_ID = "tutorial-title";

/** ARIA id for the tooltip description (referenced by aria-describedby). */
const ARIA_DESCRIPTION_ID = "tutorial-description";


// --- Types ---

interface Rect
{
    top: number;
    left: number;
    width: number;
    height: number;
}

interface Size
{
    width: number;
    height: number;
}

type Placement = "top" | "bottom" | "left" | "right" | "center";


// --- Component ---

export function TutorialOverlay()
{
    const {
        activeTutorialId,
        currentStep,
        currentStepIndex,
        totalSteps,
        nextStep,
        prevStep,
        skipTutorial,
    } = useTutorial();

    const [mTargetRect, setTargetRect] = useState<Rect | null>(null);
    const [mIsMobile, setIsMobile] = useState<boolean>(false);
    const [mMounted, setMounted] = useState<boolean>(false);
    const [mTooltipSize, setTooltipSize] = useState<Size | null>(null);
    const [mViewport, setViewport] = useState<Size>({
        width: TUTORIAL_TOOLTIP_ESTIMATED_WIDTH_PX,
        height: TUTORIAL_TOOLTIP_ESTIMATED_HEIGHT_PX,
    });
    const mRafRef = useRef<number | null>(null);
    const mTooltipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() =>
    {
        setMounted(true);
    }, []);

    // --- Responsive detection ---
    useEffect(() =>
    {
        if (typeof window === "undefined")
        {
            return;
        }
        const tMediaQuery = window.matchMedia(`(max-width: ${TUTORIAL_MOBILE_BREAKPOINT_PX - 1}px)`);
        setIsMobile(tMediaQuery.matches);
        function handleMediaChange(event: MediaQueryListEvent)
        {
            setIsMobile(event.matches);
        }
        tMediaQuery.addEventListener("change", handleMediaChange);
        return () => tMediaQuery.removeEventListener("change", handleMediaChange);
    }, []);

    // --- Viewport size tracking (for clamping tooltip within visible area) ---
    useEffect(() =>
    {
        if (typeof window === "undefined")
        {
            return;
        }
        function syncViewportSize()
        {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
        }
        syncViewportSize();
        window.addEventListener("resize", syncViewportSize);
        return () => window.removeEventListener("resize", syncViewportSize);
    }, []);

    // Compute padded rect from the target element using the current step's override (if any).
    const computeRect = useCallback((element: Element): Rect =>
    {
        const tBounding = element.getBoundingClientRect();
        const tPadding = currentStep?.spotlightPadding ?? TUTORIAL_SPOTLIGHT_PADDING_PX;
        return {
            top: tBounding.top - tPadding,
            left: tBounding.left - tPadding,
            width: tBounding.width + tPadding * 2,
            height: tBounding.height + tPadding * 2,
        };
    }, [currentStep]);

    // --- Target resolution + rect tracking ---
    useEffect(() =>
    {
        if (!currentStep || !mMounted)
        {
            setTargetRect(null);
            return;
        }
        let tIsCancelled = false;
        let tCleanupListeners: (() => void) | null = null;

        async function resolveTargetAndTrack()
        {
            if (!currentStep)
            {
                return;
            }
            const tTimeoutMs = currentStep.waitTimeoutMs ?? TUTORIAL_WAIT_DEFAULT_TIMEOUT_MS;
            const tElement = await waitForTarget(currentStep.targetSelector, tTimeoutMs);
            if (tIsCancelled)
            {
                return;
            }
            // Missing target or explicit center placement → render centered modal.
            if (!tElement || currentStep.placement === "center")
            {
                setTargetRect(null);
                return;
            }

            tElement.scrollIntoView({ block: "center", behavior: "smooth" });

            // Allow smooth scroll to settle before measuring.
            await new Promise<void>(function stabilizeAfterScroll(resolve)
            {
                setTimeout(resolve, TUTORIAL_SCROLL_STABILIZE_MS);
            });
            if (tIsCancelled)
            {
                return;
            }

            setTargetRect(computeRect(tElement));

            // Re-measure on scroll/resize via RAF to coalesce bursts of events.
            function updateRectOnLayout()
            {
                if (mRafRef.current)
                {
                    cancelAnimationFrame(mRafRef.current);
                }
                mRafRef.current = requestAnimationFrame(() =>
                {
                    if (!currentStep)
                    {
                        return;
                    }
                    const tCurrentEl = document.querySelector(currentStep.targetSelector);
                    if (tCurrentEl)
                    {
                        setTargetRect(computeRect(tCurrentEl));
                    }
                });
            }
            window.addEventListener("resize", updateRectOnLayout);
            window.addEventListener("scroll", updateRectOnLayout, true);

            tCleanupListeners = function removeLayoutListeners()
            {
                window.removeEventListener("resize", updateRectOnLayout);
                window.removeEventListener("scroll", updateRectOnLayout, true);
                if (mRafRef.current)
                {
                    cancelAnimationFrame(mRafRef.current);
                    mRafRef.current = null;
                }
            };
        }

        resolveTargetAndTrack();

        return () =>
        {
            tIsCancelled = true;
            if (tCleanupListeners)
            {
                tCleanupListeners();
            }
        };
    }, [currentStep, mMounted, computeRect]);

    // --- Keyboard handling ---
    useEffect(() =>
    {
        if (!activeTutorialId)
        {
            return;
        }
        function handleKeyDown(event: KeyboardEvent)
        {
            if (event.key === "Escape")
            {
                event.preventDefault();
                skipTutorial();
            }
            else if (event.key === "ArrowRight" || event.key === "Enter")
            {
                // Enter on the focused Next button also bubbles here → advance once.
                event.preventDefault();
                nextStep();
            }
            else if (event.key === "ArrowLeft")
            {
                event.preventDefault();
                prevStep();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTutorialId, nextStep, prevStep, skipTutorial]);

    // --- Tooltip size measurement ---
    // Runs after each render (before paint) so auto-flip/clamp can react to the
    // measured size on the next render. Only sets state when the size actually
    // changes, so we get at most one extra render per step or viewport change.
    useLayoutEffect(() =>
    {
        if (!mTooltipRef.current)
        {
            return;
        }
        const tRect = mTooltipRef.current.getBoundingClientRect();
        const tNext: Size = { width: tRect.width, height: tRect.height };
        if (!mTooltipSize || mTooltipSize.width !== tNext.width || mTooltipSize.height !== tNext.height)
        {
            setTooltipSize(tNext);
        }
    }, [mTooltipSize, currentStepIndex, activeTutorialId, mViewport]);

    // Portal target only exists after mount — and we need an active step to render.
    if (!mMounted || !activeTutorialId || !currentStep)
    {
        return null;
    }

    const tIsLastStep = currentStepIndex === totalSteps - 1;
    const tShouldCenter = !mTargetRect || currentStep.placement === "center" || mIsMobile;

    const tTooltipStyle = computeTooltipStyle({
        shouldCenter: tShouldCenter,
        targetRect: mTargetRect,
        placement: currentStep.placement ?? "bottom",
        offset: currentStep.offset ?? TUTORIAL_TOOLTIP_OFFSET_PX,
        viewport: mViewport,
        tooltipSize: mTooltipSize,
    });

    return createPortal(
        <div
            className="fixed inset-0"
            style={{ zIndex: TUTORIAL_OVERLAY_Z_INDEX }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ARIA_TITLE_ID}
            aria-describedby={ARIA_DESCRIPTION_ID}
        >
            {/* Spotlight (SVG mask) or solid backdrop depending on mode. */}
            {!tShouldCenter && mTargetRect ? (
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    <defs>
                        <mask id={SPOTLIGHT_MASK_ID}>
                            <rect width="100%" height="100%" fill="white" />
                            <rect
                                x={mTargetRect.left}
                                y={mTargetRect.top}
                                width={mTargetRect.width}
                                height={mTargetRect.height}
                                rx={SPOTLIGHT_CORNER_RADIUS_PX}
                                ry={SPOTLIGHT_CORNER_RADIUS_PX}
                                fill="black"
                                style={{ transition: `all ${TUTORIAL_TRANSITION_MS}ms ease-out` }}
                            />
                        </mask>
                    </defs>
                    <rect
                        width="100%"
                        height="100%"
                        fill="black"
                        fillOpacity={TUTORIAL_BACKDROP_OPACITY}
                        mask={`url(#${SPOTLIGHT_MASK_ID})`}
                    />
                </svg>
            ) : (
                <div
                    className="absolute inset-0"
                    style={{ backgroundColor: `rgba(0, 0, 0, ${TUTORIAL_BACKDROP_OPACITY})` }}
                />
            )}

            {/* Tooltip card */}
            <div
                ref={mTooltipRef}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xl"
                style={tTooltipStyle}
            >
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-indigo-600">
                        {currentStepIndex + 1} / {totalSteps}
                    </span>
                    <button
                        onClick={skipTutorial}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label={TUTORIAL_BTN_CLOSE_ARIA}
                        type="button"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <h3 id={ARIA_TITLE_ID} className="mb-2 text-base font-bold text-gray-900">
                    {currentStep.title}
                </h3>
                <p id={ARIA_DESCRIPTION_ID} className="mb-4 text-sm leading-relaxed text-gray-600">
                    {currentStep.description}
                </p>
                <div className="flex items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={skipTutorial}
                        className="text-xs text-gray-500"
                    >
                        {TUTORIAL_BTN_SKIP}
                    </Button>
                    <div className="flex gap-2">
                        {currentStepIndex > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={prevStep}
                                className="gap-1"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                {TUTORIAL_BTN_PREV}
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={nextStep}
                            autoFocus
                            className="gap-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                            {tIsLastStep ? TUTORIAL_BTN_FINISH : TUTORIAL_BTN_NEXT}
                            {!tIsLastStep && <ArrowRight className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}


// --- Tooltip positioning helper ---

interface TooltipStyleInput
{
    shouldCenter: boolean;
    targetRect: Rect | null;
    placement: Placement;
    offset: number;
    viewport: Size;
    tooltipSize: Size | null;
}

/**
 * Clamp a numeric position into [min, max] range. If the available range is inverted
 * (min > max, e.g., tooltip larger than viewport), returns min — better to overflow
 * consistently on one side than to produce NaN / nonsensical values.
 */
function clampToRange(value: number, min: number, max: number): number
{
    if (max < min)
    {
        return min;
    }
    if (value < min)
    {
        return min;
    }
    if (value > max)
    {
        return max;
    }
    return value;
}

/**
 * Decide whether to flip a horizontal placement (left ↔ right) given the available
 * space on each side. Flips only when the preferred side has less than
 * TUTORIAL_FLIP_MIN_SPACE_PX room AND the opposite side has more room.
 */
function resolveHorizontalPlacement(
    preferred: "left" | "right",
    targetRect: Rect,
    viewport: Size,
    tooltipWidth: number,
    offset: number,
): "left" | "right"
{
    const tSpaceLeft = targetRect.left - offset;
    const tSpaceRight = viewport.width - (targetRect.left + targetRect.width) - offset;
    if (preferred === "right" && tSpaceRight < tooltipWidth + TUTORIAL_FLIP_MIN_SPACE_PX && tSpaceLeft > tSpaceRight)
    {
        return "left";
    }
    if (preferred === "left" && tSpaceLeft < tooltipWidth + TUTORIAL_FLIP_MIN_SPACE_PX && tSpaceRight > tSpaceLeft)
    {
        return "right";
    }
    return preferred;
}

/**
 * Decide whether to flip a vertical placement (top ↔ bottom) given the available
 * space on each side, using the same logic as the horizontal case.
 */
function resolveVerticalPlacement(
    preferred: "top" | "bottom",
    targetRect: Rect,
    viewport: Size,
    tooltipHeight: number,
    offset: number,
): "top" | "bottom"
{
    const tSpaceTop = targetRect.top - offset;
    const tSpaceBottom = viewport.height - (targetRect.top + targetRect.height) - offset;
    if (preferred === "bottom" && tSpaceBottom < tooltipHeight + TUTORIAL_FLIP_MIN_SPACE_PX && tSpaceTop > tSpaceBottom)
    {
        return "top";
    }
    if (preferred === "top" && tSpaceTop < tooltipHeight + TUTORIAL_FLIP_MIN_SPACE_PX && tSpaceBottom > tSpaceTop)
    {
        return "bottom";
    }
    return preferred;
}

/**
 * Compute the absolute position style for the tooltip card.
 *
 * Uses concrete `top`/`left` coordinates instead of Tailwind transforms so that
 * viewport-edge clamping can be applied after auto-flip. Falls back to estimated
 * tooltip dimensions on the first paint before useLayoutEffect measures the real size.
 */
function computeTooltipStyle(input: TooltipStyleInput): CSSProperties
{
    const tTooltipWidth = input.tooltipSize?.width ?? TUTORIAL_TOOLTIP_ESTIMATED_WIDTH_PX;
    const tTooltipHeight = input.tooltipSize?.height ?? TUTORIAL_TOOLTIP_ESTIMATED_HEIGHT_PX;
    const tMargin = TUTORIAL_VIEWPORT_MARGIN_PX;
    const tViewport = input.viewport;

    // Centered fallback (no target / explicit center / mobile).
    if (input.shouldCenter || !input.targetRect)
    {
        const tCenteredLeft = (tViewport.width - tTooltipWidth) / 2;
        const tCenteredTop = (tViewport.height - tTooltipHeight) / 2;
        return {
            position: "fixed",
            top: clampToRange(tCenteredTop, tMargin, tViewport.height - tTooltipHeight - tMargin),
            left: clampToRange(tCenteredLeft, tMargin, tViewport.width - tTooltipWidth - tMargin),
            maxWidth: TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
        };
    }

    const tRect = input.targetRect;
    const tOffset = input.offset;

    // Resolve possibly-flipped placement based on available space.
    let tResolved: Placement = input.placement;
    if (input.placement === "left" || input.placement === "right")
    {
        tResolved = resolveHorizontalPlacement(input.placement, tRect, tViewport, tTooltipWidth, tOffset);
    }
    else if (input.placement === "top" || input.placement === "bottom")
    {
        tResolved = resolveVerticalPlacement(input.placement, tRect, tViewport, tTooltipHeight, tOffset);
    }

    // Compute raw coordinates for the resolved placement using explicit top/left.
    let tLeft = 0;
    let tTop = 0;

    if (tResolved === "bottom")
    {
        tTop = tRect.top + tRect.height + tOffset;
        tLeft = tRect.left + tRect.width / 2 - tTooltipWidth / 2;
    }
    else if (tResolved === "top")
    {
        tTop = tRect.top - tOffset - tTooltipHeight;
        tLeft = tRect.left + tRect.width / 2 - tTooltipWidth / 2;
    }
    else if (tResolved === "left")
    {
        tTop = tRect.top + tRect.height / 2 - tTooltipHeight / 2;
        tLeft = tRect.left - tOffset - tTooltipWidth;
    }
    else if (tResolved === "right")
    {
        tTop = tRect.top + tRect.height / 2 - tTooltipHeight / 2;
        tLeft = tRect.left + tRect.width + tOffset;
    }

    // Clamp within viewport so tooltip never clips off-screen.
    const tClampedLeft = clampToRange(tLeft, tMargin, tViewport.width - tTooltipWidth - tMargin);
    const tClampedTop = clampToRange(tTop, tMargin, tViewport.height - tTooltipHeight - tMargin);

    return {
        position: "fixed",
        top: tClampedTop,
        left: tClampedLeft,
        maxWidth: TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
    };
}
