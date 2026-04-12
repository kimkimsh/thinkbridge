"use client";

/**
 * Tutorial system: React context, provider, and hooks.
 *
 * - TutorialProvider: global state (active tutorial, current step index).
 * - useTutorial: consumer hook exposing navigation + completion helpers.
 * - useAutoStartTutorial: per-page hook that auto-triggers first-visit tutorial
 *   once the page signals it is ready (data loaded + DOM mounted).
 * - waitForTarget: utility that polls the DOM until a selector resolves or times out.
 *
 * Persistence: per-tutorial completion flag stored in localStorage under a versioned key.
 * A global disable flag (`TUTORIAL_DISABLED_STORAGE_KEY`) suppresses all tutorials for
 * demo day escape-hatch scenarios.
 */

import {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useState,
    useRef,
    type ReactNode,
} from "react";

import {
    TUTORIAL_DISABLED_STORAGE_KEY,
    TUTORIAL_WAIT_POLL_INTERVAL_MS,
} from "./tutorialConstants";
import {
    getTutorial,
    type TutorialId,
    type TutorialStep,
} from "./tutorialSteps";


// --- Constants ---

/** Delay (ms) between page `ready` becoming true and auto-starting the tutorial. */
const AUTO_START_DELAY_MS = 400;

/** String value used as the "completed" marker in localStorage. */
const STORAGE_VALUE_TRUE = "true";


// --- Context types ---

interface TutorialContextValue
{
    activeTutorialId: TutorialId | null;
    currentStepIndex: number;
    currentStep: TutorialStep | null;
    totalSteps: number;
    isCompleted: (tutorialId: TutorialId) => boolean;
    startTutorial: (tutorialId: TutorialId) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTutorial: () => void;
    /** Close the tutorial without marking it complete (for external overlay conflicts). */
    abortTutorial: () => void;
}


const TutorialContext = createContext<TutorialContextValue | null>(null);


// --- Provider ---

export function TutorialProvider({ children }: { children: ReactNode })
{
    const [mActiveTutorialId, setActiveTutorialId] = useState<TutorialId | null>(null);
    const [mCurrentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [mMounted, setMounted] = useState<boolean>(false);

    // SSR-safe mount flag so localStorage reads happen only on the client.
    useEffect(() =>
    {
        setMounted(true);
    }, []);

    const tCurrentTutorial = mActiveTutorialId ? getTutorial(mActiveTutorialId) : null;
    const tCurrentStep = tCurrentTutorial ? tCurrentTutorial.steps[mCurrentStepIndex] ?? null : null;
    const tTotalSteps = tCurrentTutorial ? tCurrentTutorial.steps.length : 0;

    const isCompleted = useCallback((tutorialId: TutorialId): boolean =>
    {
        if (!mMounted)
        {
            return false;
        }
        if (typeof window === "undefined")
        {
            return false;
        }
        // Global kill-switch: treat every tutorial as completed.
        if (localStorage.getItem(TUTORIAL_DISABLED_STORAGE_KEY) === STORAGE_VALUE_TRUE)
        {
            return true;
        }
        const tTutorial = getTutorial(tutorialId);
        return localStorage.getItem(tTutorial.storageKey) === STORAGE_VALUE_TRUE;
    }, [mMounted]);

    const startTutorial = useCallback((tutorialId: TutorialId) =>
    {
        if (typeof window !== "undefined"
            && localStorage.getItem(TUTORIAL_DISABLED_STORAGE_KEY) === STORAGE_VALUE_TRUE)
        {
            return;
        }
        setActiveTutorialId(tutorialId);
        setCurrentStepIndex(0);
    }, []);

    const markCompleted = useCallback((tutorialId: TutorialId) =>
    {
        if (typeof window === "undefined")
        {
            return;
        }
        const tTutorial = getTutorial(tutorialId);
        localStorage.setItem(tTutorial.storageKey, STORAGE_VALUE_TRUE);
    }, []);

    const nextStep = useCallback(() =>
    {
        if (!mActiveTutorialId || !tCurrentTutorial)
        {
            return;
        }
        if (mCurrentStepIndex >= tCurrentTutorial.steps.length - 1)
        {
            // Last step → mark complete and close.
            markCompleted(mActiveTutorialId);
            setActiveTutorialId(null);
            setCurrentStepIndex(0);
        }
        else
        {
            setCurrentStepIndex(mCurrentStepIndex + 1);
        }
    }, [mActiveTutorialId, mCurrentStepIndex, tCurrentTutorial, markCompleted]);

    const prevStep = useCallback(() =>
    {
        if (mCurrentStepIndex > 0)
        {
            setCurrentStepIndex(mCurrentStepIndex - 1);
        }
    }, [mCurrentStepIndex]);

    const skipTutorial = useCallback(() =>
    {
        if (mActiveTutorialId)
        {
            // Skip is a deliberate "don't show this again" action.
            markCompleted(mActiveTutorialId);
        }
        setActiveTutorialId(null);
        setCurrentStepIndex(0);
    }, [mActiveTutorialId, markCompleted]);

    const abortTutorial = useCallback(() =>
    {
        // Abort leaves the completion flag alone — tutorial may trigger again next visit.
        setActiveTutorialId(null);
        setCurrentStepIndex(0);
    }, []);

    const tValue: TutorialContextValue = {
        activeTutorialId: mActiveTutorialId,
        currentStepIndex: mCurrentStepIndex,
        currentStep: tCurrentStep,
        totalSteps: tTotalSteps,
        isCompleted,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        abortTutorial,
    };

    return (
        <TutorialContext.Provider value={tValue}>
            {children}
        </TutorialContext.Provider>
    );
}


// --- Consumer hook ---

export function useTutorial(): TutorialContextValue
{
    const tContext = useContext(TutorialContext);
    if (!tContext)
    {
        throw new Error("useTutorial must be used within TutorialProvider");
    }
    return tContext;
}


// --- Auto-start hook ---

/**
 * Auto-trigger the tutorial on first visit, once the page signals `ready`.
 * Ready=false keeps the hook waiting (e.g. data still loading). Completed tutorials are skipped.
 * Uses a ref to guarantee single fire per mount lifecycle.
 */
export function useAutoStartTutorial(tutorialId: TutorialId, ready: boolean)
{
    const { activeTutorialId, isCompleted, startTutorial } = useTutorial();
    const mTriggeredRef = useRef<boolean>(false);

    useEffect(() =>
    {
        if (!ready)
        {
            return;
        }
        if (mTriggeredRef.current)
        {
            return;
        }
        if (activeTutorialId !== null)
        {
            return;
        }
        if (isCompleted(tutorialId))
        {
            return;
        }

        // Small delay to let the page DOM settle before the spotlight tries to measure rects.
        const tTimer = setTimeout(() =>
        {
            if (!mTriggeredRef.current)
            {
                mTriggeredRef.current = true;
                startTutorial(tutorialId);
            }
        }, AUTO_START_DELAY_MS);

        return () => clearTimeout(tTimer);
    }, [ready, tutorialId, activeTutorialId, isCompleted, startTutorial]);
}


// --- DOM utilities ---

/**
 * Poll the DOM until a selector resolves to an element or the timeout elapses.
 * Used by the overlay to wait for target elements that might not be mounted yet
 * (e.g. async-rendered dashboard widgets).
 */
export async function waitForTarget(selector: string, timeoutMs: number): Promise<Element | null>
{
    const tStart = Date.now();
    while (Date.now() - tStart < timeoutMs)
    {
        const tElement = document.querySelector(selector);
        if (tElement)
        {
            return tElement;
        }
        await new Promise<void>(function sleepForPollInterval(resolve)
        {
            setTimeout(resolve, TUTORIAL_WAIT_POLL_INTERVAL_MS);
        });
    }
    return null;
}
