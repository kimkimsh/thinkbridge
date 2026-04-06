"use client";

/**
 * Socratic 5-stage progress bar.
 * Displays horizontal stage indicators showing conversation progress
 * through the five Socratic tutoring stages.
 */

import { STAGE_LABELS, TOTAL_STAGES } from "@/lib/constants";


// --- Constants ---

/** CSS transition duration for stage change animations */
const STAGE_TRANSITION_DURATION = "300ms";


// --- Props ---

interface ProgressBarProps
{
    currentStage: number;
}


// --- Component ---

export function ProgressBar({ currentStage }: ProgressBarProps)
{
    return (
        <div className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-3 shadow-sm sm:px-6">
            {STAGE_LABELS.map((label, index) =>
            {
                const tStageNumber = index + 1;
                const tIsPast = tStageNumber < currentStage;
                const tIsCurrent = tStageNumber === currentStage;
                const tIsFuture = tStageNumber > currentStage;

                return (
                    <div key={tStageNumber} className="flex items-center">
                        {/* Stage indicator */}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`
                                    flex h-7 w-7 items-center justify-center rounded-full
                                    text-xs font-semibold
                                    transition-all
                                    sm:h-8 sm:w-8 sm:text-sm
                                    ${tIsCurrent
                                        ? "scale-110 bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1"
                                        : ""
                                    }
                                    ${tIsPast
                                        ? "bg-blue-200 text-blue-700"
                                        : ""
                                    }
                                    ${tIsFuture
                                        ? "border-2 border-gray-300 bg-white text-gray-400"
                                        : ""
                                    }
                                `}
                                style={{ transitionDuration: STAGE_TRANSITION_DURATION }}
                            >
                                {tStageNumber}
                            </div>
                            <span
                                className={`
                                    text-[10px] font-medium sm:text-xs
                                    transition-colors
                                    ${tIsCurrent ? "text-blue-600 font-semibold" : ""}
                                    ${tIsPast ? "text-blue-500" : ""}
                                    ${tIsFuture ? "text-gray-400" : ""}
                                `}
                                style={{ transitionDuration: STAGE_TRANSITION_DURATION }}
                            >
                                {label}
                            </span>
                        </div>

                        {/* Connector line between stages */}
                        {tStageNumber < TOTAL_STAGES && (
                            <div
                                className={`
                                    mx-1 hidden h-0.5 w-6 sm:mx-2 sm:block sm:w-10 md:w-14
                                    transition-colors
                                    ${tStageNumber < currentStage ? "bg-blue-300" : "bg-gray-200"}
                                `}
                                style={{ transitionDuration: STAGE_TRANSITION_DURATION }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
