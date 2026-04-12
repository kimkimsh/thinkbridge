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
    const mRafRef = useRef<number | null>(null);

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
    placement: "top" | "bottom" | "left" | "right" | "center";
    offset: number;
}

/**
 * Compute the absolute position style for the tooltip card given the target rect and
 * placement. Centered mode ignores the rect and pins to viewport center.
 */
function computeTooltipStyle(input: TooltipStyleInput): CSSProperties
{
    if (input.shouldCenter || !input.targetRect)
    {
        return {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
        };
    }

    const tRect = input.targetRect;
    const tOffset = input.offset;

    if (input.placement === "bottom")
    {
        return {
            position: "fixed",
            top: tRect.top + tRect.height + tOffset,
            left: tRect.left + tRect.width / 2,
            transform: "translateX(-50%)",
            maxWidth: TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
        };
    }
    if (input.placement === "top")
    {
        return {
            position: "fixed",
            bottom: window.innerHeight - tRect.top + tOffset,
            left: tRect.left + tRect.width / 2,
            transform: "translateX(-50%)",
            maxWidth: TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
        };
    }
    if (input.placement === "left")
    {
        return {
            position: "fixed",
            top: tRect.top + tRect.height / 2,
            right: window.innerWidth - tRect.left + tOffset,
            transform: "translateY(-50%)",
            maxWidth: TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
        };
    }
    // right
    return {
        position: "fixed",
        top: tRect.top + tRect.height / 2,
        left: tRect.left + tRect.width + tOffset,
        transform: "translateY(-50%)",
        maxWidth: TUTORIAL_TOOLTIP_MAX_WIDTH_PX,
    };
}
