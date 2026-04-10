"use client";

/**
 * Collapsible thinking analysis panel.
 * Displays 6-dimension Bloom's Taxonomy scores as animated bars,
 * Socratic stage indicator, engagement level, and detected patterns.
 * Default collapsed for students; always open in demo mode.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, TrendingUp, Zap, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DIMENSION_KEYS,
    DIMENSION_LABELS,
    DIMENSION_COLORS,
    STAGE_LABELS,
    MAX_DIMENSION_SCORE,
    TOTAL_STAGES,
} from "@/lib/constants";
import type { ThoughtAnalysis } from "@/types";


// --- Constants ---

/** CSS transition for dimension bar width animation */
const BAR_TRANSITION_STYLE = "width 500ms cubic-bezier(0.4, 0, 0.2, 1)";

/** Engagement level display configuration */
const ENGAGEMENT_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: "적극적", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Zap },
    passive: { label: "수동적", className: "bg-amber-50 text-amber-700 border-amber-200", icon: TrendingUp },
    stuck: { label: "멈춤", className: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
};

/** Dimension score threshold for "strong" classification */
const STRONG_THRESHOLD = 7;

/** Dimension score threshold for "weak" classification */
const WEAK_THRESHOLD = 4;


// --- Props ---

interface ThoughtPanelProps
{
    analysis: ThoughtAnalysis | null;
    isDemo?: boolean;
}


// --- Component ---

export function ThoughtPanel({ analysis, isDemo }: ThoughtPanelProps)
{
    const [mIsOpen, setIsOpen] = useState(isDemo === true);

    if (!analysis)
    {
        return (
            <Card className="border-dashed border-indigo-200 bg-indigo-50/30">
                <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2 text-sm text-indigo-400">
                        <Sparkles className="h-4 w-4" />
                        사고력 분석
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                    <p className="text-xs text-indigo-400/70">
                        첫 번째 메시지를 보내면 사고 분석이 시작됩니다.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const tEngagement = ENGAGEMENT_CONFIG[analysis.engagementLevel] || ENGAGEMENT_CONFIG.active;
    const EngagementIcon = tEngagement.icon;

    // Compute average score for the mini summary
    let tTotalScore = 0;
    let tScoreCount = 0;
    for (const key of DIMENSION_KEYS)
    {
        const tVal = analysis[key as keyof ThoughtAnalysis];
        if (typeof tVal === "number")
        {
            tTotalScore += tVal;
            tScoreCount++;
        }
    }
    const tAverageScore = tScoreCount > 0 ? (tTotalScore / tScoreCount) : 0;

    return (
        <Card className="overflow-hidden border-indigo-100 shadow-sm">
            {/* Header with toggle */}
            <CardHeader
                className="cursor-pointer select-none p-4 transition-colors hover:bg-indigo-50/50"
                onClick={() => setIsOpen(!mIsOpen)}
            >
                <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600">
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-semibold text-gray-800">사고력 분석</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Average score pill */}
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                            {tAverageScore.toFixed(1)}
                        </span>
                        <Badge
                            variant="outline"
                            className={`gap-1 ${tEngagement.className}`}
                        >
                            <EngagementIcon className="h-3 w-3" />
                            {tEngagement.label}
                        </Badge>
                        {mIsOpen
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                        }
                    </div>
                </CardTitle>
            </CardHeader>

            {/* Collapsible content */}
            {mIsOpen && (
                <CardContent className="space-y-5 px-4 pb-5 pt-0">
                    {/* 6-dimension bars */}
                    <div className="space-y-3">
                        {DIMENSION_KEYS.map((key) =>
                        {
                            const tScore = analysis[key as keyof ThoughtAnalysis] as number;
                            const tLabel = DIMENSION_LABELS[key];
                            const tColor = DIMENSION_COLORS[key];
                            const tPercentage = (tScore / MAX_DIMENSION_SCORE) * 100;

                            // Determine score classification for visual indicator
                            let tScoreClass = "text-gray-600";
                            if (tScore >= STRONG_THRESHOLD)
                            {
                                tScoreClass = "text-emerald-600";
                            }
                            else if (tScore < WEAK_THRESHOLD)
                            {
                                tScoreClass = "text-red-500";
                            }

                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-gray-700">
                                            {tLabel}
                                        </span>
                                        <span className={`text-xs font-bold tabular-nums ${tScoreClass}`}>
                                            {tScore}/{MAX_DIMENSION_SCORE}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${tPercentage}%`,
                                                background: `linear-gradient(90deg, ${tColor}99, ${tColor})`,
                                                transition: BAR_TRANSITION_STYLE,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Socratic stage indicator */}
                    <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-indigo-700">
                                소크라테스 단계
                            </span>
                            <span className="text-xs font-bold text-indigo-600">
                                {analysis.socraticStage}/{TOTAL_STAGES}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {STAGE_LABELS.map((label, index) =>
                            {
                                const tStageNum = index + 1;
                                const tIsPast = tStageNum < analysis.socraticStage;
                                const tIsActive = tStageNum === analysis.socraticStage;
                                const tIsFuture = tStageNum > analysis.socraticStage;

                                return (
                                    <div key={tStageNum} className="flex items-center gap-1">
                                        <div
                                            className={`
                                                flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold
                                                transition-all duration-300
                                                ${tIsActive
                                                    ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 ring-offset-1"
                                                    : ""
                                                }
                                                ${tIsPast
                                                    ? "bg-indigo-200 text-indigo-700"
                                                    : ""
                                                }
                                                ${tIsFuture
                                                    ? "border border-gray-200 bg-white text-gray-400"
                                                    : ""
                                                }
                                            `}
                                        >
                                            {tStageNum}
                                        </div>
                                        {tStageNum < TOTAL_STAGES && (
                                            <div
                                                className={`h-0.5 w-2 rounded-full ${
                                                    tStageNum < analysis.socraticStage ? "bg-indigo-300" : "bg-gray-200"
                                                }`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Active stage label */}
                        <p className="mt-1.5 text-[11px] text-indigo-600">
                            현재: <span className="font-bold">{STAGE_LABELS[analysis.socraticStage - 1]}</span> 단계
                        </p>
                    </div>

                    {/* Detected patterns */}
                    {analysis.detectedPatterns && analysis.detectedPatterns.length > 0 && (
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-gray-600">
                                감지된 패턴
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis.detectedPatterns.map((pattern, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="rounded-full bg-indigo-50 text-[10px] text-indigo-700 border border-indigo-100"
                                    >
                                        {pattern}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
