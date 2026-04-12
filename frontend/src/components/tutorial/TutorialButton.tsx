"use client";

/**
 * Help button ("?") that re-opens the tutorial for the current page.
 * Renders a small ghost-style button with an icon and optional label.
 * Meant to live in the page header/top-right so users can replay the tutorial.
 */

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorial } from "@/lib/tutorial";
import type { TutorialId } from "@/lib/tutorialSteps";


// --- Constants ---

/** Default visible label next to the icon (hidden on xs breakpoints). */
const DEFAULT_LABEL = "도움말";

/** Suffix used to build the aria-label + title ("<label> 다시 보기"). */
const REPLAY_SUFFIX = "다시 보기";


// --- Props ---

interface TutorialButtonProps
{
    tutorialId: TutorialId;
    className?: string;
    label?: string;
}


// --- Component ---

export function TutorialButton({
    tutorialId,
    className = "",
    label = DEFAULT_LABEL,
}: TutorialButtonProps)
{
    const { startTutorial } = useTutorial();

    function handleClick()
    {
        startTutorial(tutorialId);
    }

    const tReplayHint = `${label} ${REPLAY_SUFFIX}`;

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            className={`gap-1 text-gray-500 hover:text-indigo-600 ${className}`}
            aria-label={tReplayHint}
            title={tReplayHint}
            type="button"
        >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{label}</span>
        </Button>
    );
}
