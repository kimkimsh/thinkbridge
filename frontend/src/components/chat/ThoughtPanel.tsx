"use client";

/**
 * Collapsible thinking analysis panel.
 * Displays 6-dimension Bloom's Taxonomy scores as animated bars,
 * Socratic stage indicator, engagement level, and detected patterns.
 * Default collapsed for students; always open in demo mode.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
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
const BAR_TRANSITION_STYLE = "width 300ms ease";

/** Engagement level display configuration */
const ENGAGEMENT_CONFIG: Record<string, { label: string; className: string }> = {
    active: { label: "적극적", className: "bg-green-100 text-green-700 border-green-300" },
    passive: { label: "수동적", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    stuck: { label: "멈춤", className: "bg-red-100 text-red-700 border-red-300" },
};


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
            <Card className="border-dashed">
                <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Brain className="h-4 w-4" />
                        사고력 분석
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                    <p className="text-xs text-muted-foreground">
                        첫 번째 메시지를 보내면 사고 분석이 시작됩니다.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const tEngagement = ENGAGEMENT_CONFIG[analysis.engagementLevel] || ENGAGEMENT_CONFIG.active;

    return (
        <Card className="overflow-hidden">
            {/* Header with toggle */}
            <CardHeader
                className="cursor-pointer select-none p-4 hover:bg-gray-50"
                onClick={() => setIsOpen(!mIsOpen)}
            >
                <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <span>사고력 분석</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={tEngagement.className}
                        >
                            {tEngagement.label}
                        </Badge>
                        {mIsOpen
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                    </div>
                </CardTitle>
            </CardHeader>

            {/* Collapsible content */}
            {mIsOpen && (
                <CardContent className="space-y-4 px-4 pb-4 pt-0">
                    {/* 6-dimension bars */}
                    <div className="space-y-2.5">
                        {DIMENSION_KEYS.map((key) =>
                        {
                            const tScore = analysis[key as keyof ThoughtAnalysis] as number;
                            const tLabel = DIMENSION_LABELS[key];
                            const tColor = DIMENSION_COLORS[key];
                            const tPercentage = (tScore / MAX_DIMENSION_SCORE) * 100;

                            return (
                                <div key={key} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-gray-700">
                                            {tLabel}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            {tScore}/{MAX_DIMENSION_SCORE}
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${tPercentage}%`,
                                                backgroundColor: tColor,
                                                transition: BAR_TRANSITION_STYLE,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Socratic stage indicator */}
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                        <span className="text-xs font-medium text-blue-700">
                            단계:
                        </span>
                        <div className="flex items-center gap-1">
                            {STAGE_LABELS.map((label, index) =>
                            {
                                const tStageNum = index + 1;
                                const tIsActive = tStageNum === analysis.socraticStage;
                                return (
                                    <span
                                        key={tStageNum}
                                        className={`text-xs ${
                                            tIsActive
                                                ? "font-bold text-blue-700"
                                                : "text-blue-400"
                                        }`}
                                    >
                                        {tIsActive ? `[${label}]` : label}
                                        {tStageNum < TOTAL_STAGES && " - "}
                                    </span>
                                );
                            })}
                        </div>
                        <span className="ml-auto text-xs font-semibold text-blue-600">
                            ({analysis.socraticStage}/{TOTAL_STAGES})
                        </span>
                    </div>

                    {/* Detected patterns */}
                    {analysis.detectedPatterns && analysis.detectedPatterns.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="text-xs font-medium text-gray-500">
                                감지된 패턴
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis.detectedPatterns.map((pattern, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-[10px]"
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
