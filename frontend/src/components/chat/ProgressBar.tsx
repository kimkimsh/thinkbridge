"use client";

/**
 * Socratic 5-stage progress bar.
 * Displays horizontal stage indicators with connecting gradient lines,
 * step numbers, and a pulsing glow on the current stage.
 */

import { Check } from "lucide-react";
import { STAGE_LABELS, TOTAL_STAGES } from "@/lib/constants";


// --- Constants ---

/** CSS transition duration for stage change animations */
const STAGE_TRANSITION_DURATION = "400ms";


// --- Props ---

interface ProgressBarProps
{
    currentStage: number;
}


// --- Component ---

export function ProgressBar({ currentStage }: ProgressBarProps)
{
    return (
        <div className="flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/30 to-white px-4 py-4 shadow-sm sm:px-6">
            {STAGE_LABELS.map((label, index) =>
            {
                const tStageNumber = index + 1;
                const tIsPast = tStageNumber < currentStage;
                const tIsCurrent = tStageNumber === currentStage;
                const tIsFuture = tStageNumber > currentStage;

                return (
                    <div key={tStageNumber} className="flex items-center">
                        {/* Stage indicator */}
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={`
                                    relative flex items-center justify-center rounded-full
                                    text-xs font-bold
                                    transition-all
                                    ${tIsCurrent
                                        ? "h-9 w-9 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-300/50 ring-[3px] ring-indigo-200 ring-offset-2 sm:h-10 sm:w-10 sm:text-sm"
                                        : ""
                                    }
                                    ${tIsPast
                                        ? "h-8 w-8 bg-gradient-to-br from-indigo-400 to-indigo-500 text-white sm:h-9 sm:w-9 sm:text-sm"
                                        : ""
                                    }
                                    ${tIsFuture
                                        ? "h-8 w-8 border-2 border-gray-200 bg-white text-gray-400 sm:h-9 sm:w-9 sm:text-sm"
                                        : ""
                                    }
                                `}
                                style={{ transitionDuration: STAGE_TRANSITION_DURATION }}
                            >
                                {/* Pulse animation ring for current stage */}
                                {tIsCurrent && (
                                    <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20" />
                                )}

                                {/* Checkmark for past stages, number for current/future */}
                                {tIsPast
                                    ? <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
                                    : tStageNumber
                                }
                            </div>
                            <span
                                className={`
                                    text-[10px] font-medium sm:text-xs
                                    transition-colors
                                    ${tIsCurrent ? "font-bold text-indigo-700" : ""}
                                    ${tIsPast ? "font-semibold text-indigo-500" : ""}
                                    ${tIsFuture ? "text-gray-400" : ""}
                                `}
                                style={{ transitionDuration: STAGE_TRANSITION_DURATION }}
                            >
                                {label}
                            </span>
                        </div>

                        {/* Connector line between stages with gradient fill */}
                        {tStageNumber < TOTAL_STAGES && (
                            <div className="mx-1.5 hidden sm:block sm:mx-2">
                                <div
                                    className="relative h-1 w-8 overflow-hidden rounded-full sm:w-12 md:w-16"
                                    style={{
                                        backgroundColor: "#e5e7eb",
                                    }}
                                >
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full transition-all"
                                        style={{
                                            width: tStageNumber < currentStage ? "100%" : "0%",
                                            background: "linear-gradient(90deg, #818cf8, #6366f1)",
                                            transitionDuration: STAGE_TRANSITION_DURATION,
                                            transitionTimingFunction: "ease-in-out",
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
