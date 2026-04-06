"use client";

/**
 * 6-dimension radar chart for thinking analysis visualization.
 * Uses Recharts RadarChart with optional comparison overlay.
 * Main data shown as solid blue fill; comparison as dashed lighter outline.
 */

import {
    RadarChart as RechartsRadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { DIMENSION_KEYS, DIMENSION_LABELS, MAX_DIMENSION_SCORE } from "@/lib/constants";


// --- Constants ---

const RADAR_FILL_COLOR = "#3B82F6";
const RADAR_FILL_OPACITY = 0.6;
const RADAR_STROKE_COLOR = "#2563EB";

const COMPARISON_FILL_COLOR = "#93C5FD";
const COMPARISON_FILL_OPACITY = 0.2;
const COMPARISON_STROKE_COLOR = "#60A5FA";
const COMPARISON_STROKE_DASH = "5 5";

const RADIUS_TICK_COUNT = 6;
const OUTER_RADIUS_PERCENT = "70%";
const CHART_ASPECT_RATIO = 1;
const MIN_CHART_HEIGHT = 300;

const MAIN_LABEL = "현재 세션";
const COMPARISON_LABEL = "전체 평균";


// --- Types ---

interface RadarDataPoint
{
    dimension: string;
    score: number;
    comparison?: number;
}

interface ThinkingRadarChartProps
{
    scores: Record<string, number>;
    comparisonScores?: Record<string, number>;
    title?: string;
}


// --- Helper ---

/**
 * Transforms dimension scores into Recharts-compatible data points.
 * Each point contains the Korean label, current score, and optional comparison score.
 */
function buildRadarData(
    scores: Record<string, number>,
    comparisonScores?: Record<string, number>,
): RadarDataPoint[]
{
    return DIMENSION_KEYS.map((key) =>
    {
        const tPoint: RadarDataPoint = {
            dimension: DIMENSION_LABELS[key],
            score: scores[key] ?? 0,
        };

        if (comparisonScores)
        {
            tPoint.comparison = comparisonScores[key] ?? 0;
        }

        return tPoint;
    });
}


// --- Component ---

export function ThinkingRadarChart({ scores, comparisonScores, title }: ThinkingRadarChartProps)
{
    const tData = buildRadarData(scores, comparisonScores);

    return (
        <div className="w-full">
            {title && (
                <h3 className="mb-2 text-center text-sm font-semibold text-gray-700">
                    {title}
                </h3>
            )}
            <ResponsiveContainer width="100%" aspect={CHART_ASPECT_RATIO} minHeight={MIN_CHART_HEIGHT}>
                <RechartsRadarChart data={tData} outerRadius={OUTER_RADIUS_PERCENT}>
                    <PolarGrid />
                    <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fontSize: 12, fill: "#374151" }}
                    />
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, MAX_DIMENSION_SCORE]}
                        tick={{ fontSize: 10, fill: "#9CA3AF" }}
                        tickCount={RADIUS_TICK_COUNT}
                    />

                    {/* Comparison overlay (rendered first so main data is on top) */}
                    {comparisonScores && (
                        <Radar
                            name={COMPARISON_LABEL}
                            dataKey="comparison"
                            stroke={COMPARISON_STROKE_COLOR}
                            fill={COMPARISON_FILL_COLOR}
                            fillOpacity={COMPARISON_FILL_OPACITY}
                            strokeDasharray={COMPARISON_STROKE_DASH}
                            strokeWidth={2}
                        />
                    )}

                    {/* Main session scores */}
                    <Radar
                        name={MAIN_LABEL}
                        dataKey="score"
                        stroke={RADAR_STROKE_COLOR}
                        fill={RADAR_FILL_COLOR}
                        fillOpacity={RADAR_FILL_OPACITY}
                        strokeWidth={2}
                    />

                    <Legend
                        wrapperStyle={{ fontSize: 12 }}
                    />
                </RechartsRadarChart>
            </ResponsiveContainer>
        </div>
    );
}
