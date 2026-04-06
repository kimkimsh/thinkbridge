"use client";

/**
 * Growth trend chart showing 6-dimension thinking scores across sessions.
 * Multi-line time-series using Recharts LineChart.
 * Each dimension uses a distinct color for visual clarity.
 */

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import type { GrowthTrendEntry } from "@/types";
import {
    DIMENSION_KEYS,
    DIMENSION_LABELS,
    DIMENSION_COLORS,
    MAX_DIMENSION_SCORE,
    MIN_DIMENSION_SCORE,
} from "@/lib/constants";


// --- Constants ---

const CHART_HEIGHT = 350;
const LINE_STROKE_WIDTH = 2;
const DOT_RADIUS = 4;
const ACTIVE_DOT_RADIUS = 6;

const Y_AXIS_LABEL = "점수";
const X_AXIS_LABEL = "날짜";

const TOOLTIP_DATE_LABEL = "날짜";


// --- Types ---

interface GrowthTrendChartProps
{
    data: GrowthTrendEntry[];
}


// --- Custom Tooltip ---

interface TooltipPayloadEntry
{
    name: string;
    value: number;
    color: string;
}

interface CustomTooltipProps
{
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
}

/**
 * Custom tooltip showing all 6 dimension values with Korean labels.
 */
function GrowthTooltip({ active, payload, label }: CustomTooltipProps)
{
    if (!active || !payload || payload.length === 0)
    {
        return null;
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
            <p className="mb-1 text-xs font-semibold text-gray-600">
                {TOOLTIP_DATE_LABEL}: {label}
            </p>
            {payload.map((entry) => (
                <div
                    key={entry.name}
                    className="flex items-center gap-2 text-xs"
                >
                    <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-600">{entry.name}:</span>
                    <span className="font-medium text-gray-900">
                        {entry.value.toFixed(1)}
                    </span>
                </div>
            ))}
        </div>
    );
}


// --- Component ---

export function GrowthTrendChart({ data }: GrowthTrendChartProps)
{
    if (data.length === 0)
    {
        return (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                아직 성장 데이터가 없습니다.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    label={{
                        value: X_AXIS_LABEL,
                        position: "insideBottomRight",
                        offset: -5,
                        style: { fontSize: 11, fill: "#9CA3AF" },
                    }}
                />
                <YAxis
                    domain={[MIN_DIMENSION_SCORE, MAX_DIMENSION_SCORE]}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    label={{
                        value: Y_AXIS_LABEL,
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 11, fill: "#9CA3AF" },
                    }}
                    tickCount={6}
                />
                <Tooltip content={<GrowthTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: 11 }}
                />

                {DIMENSION_KEYS.map((key) => (
                    <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={DIMENSION_LABELS[key]}
                        stroke={DIMENSION_COLORS[key]}
                        strokeWidth={LINE_STROKE_WIDTH}
                        dot={{ r: DOT_RADIUS, fill: DIMENSION_COLORS[key] }}
                        activeDot={{ r: ACTIVE_DOT_RADIUS }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
