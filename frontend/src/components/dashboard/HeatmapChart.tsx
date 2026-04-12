"use client";

/**
 * Thinking dimension heatmap for instructor dashboard.
 * Color-coded matrix: students (rows) x 6 dimensions (columns).
 * Shows score values in cells with red/yellow/green background colors.
 * Includes AI-generated insight text below the heatmap.
 */

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { DIMENSION_KEYS, DIMENSION_LABELS } from "@/lib/constants";
import type { HeatmapResponse } from "@/types";


// --- Constants ---

/** Score thresholds for heatmap cell colors */
const SCORE_THRESHOLD_HIGH = 7;
const SCORE_THRESHOLD_MID = 4;


// --- Props ---

interface HeatmapChartProps
{
    data: HeatmapResponse;
}


// --- Helper Functions ---

/**
 * Returns Tailwind background and text classes for a heatmap cell based on score.
 * Red for low (0-3), yellow for mid (4-6), green for high (7-10).
 */
function getCellClasses(score: number): string
{
    if (score >= SCORE_THRESHOLD_HIGH)
    {
        return "bg-green-200 text-green-900";
    }
    if (score >= SCORE_THRESHOLD_MID)
    {
        return "bg-yellow-200 text-yellow-900";
    }
    return "bg-red-200 text-red-900";
}


// --- Component ---

export function HeatmapChart({ data }: HeatmapChartProps)
{
    const router = useRouter();

    if (data.entries.length === 0)
    {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                        사고력 히트맵
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        분석할 데이터가 없습니다.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                    사고력 히트맵
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Heatmap table */}
                <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full min-w-[480px] border-collapse text-xs">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-gray-600">
                                    학생
                                </th>
                                {DIMENSION_KEYS.map((key) => (
                                    <th
                                        key={key}
                                        className="px-2 py-2 text-center font-medium text-gray-600"
                                    >
                                        {DIMENSION_LABELS[key]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.entries.map((entry) => (
                                <tr
                                    key={entry.studentId}
                                    className="cursor-pointer transition-colors hover:bg-gray-50"
                                    onClick={() =>
                                        router.push(
                                            `/instructor/replay/${entry.studentId}?name=${encodeURIComponent(entry.studentName)}`,
                                        )
                                    }
                                >
                                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-900 hover:text-blue-600">
                                        {entry.studentName}
                                    </td>
                                    {DIMENSION_KEYS.map((key) =>
                                    {
                                        const tScore = entry.scores[key] ?? 0;
                                        const tCellClasses = getCellClasses(tScore);

                                        return (
                                            <td
                                                key={key}
                                                className={`px-2 py-2 text-center font-semibold ${tCellClasses}`}
                                            >
                                                {tScore.toFixed(1)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* AI Insight */}
                {data.insight && (
                    <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <p className="text-sm leading-relaxed text-blue-800">
                            {data.insight}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
