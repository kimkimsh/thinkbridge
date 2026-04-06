"use client";

/**
 * Turn-by-turn thinking analysis timeline.
 * Vertical timeline showing strongest/weakest dimension badges per turn,
 * color-coded by engagement level, with Socratic stage badges.
 */

import { Badge } from "@/components/ui/badge";
import type { MessageWithAnalysis } from "@/types";
import { DIMENSION_LABELS, DIMENSION_KEYS, STAGE_LABELS } from "@/lib/constants";


// --- Constants ---

const ENGAGEMENT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-green-100", text: "text-green-700", label: "적극적" },
    passive: { bg: "bg-yellow-100", text: "text-yellow-700", label: "수동적" },
    stuck: { bg: "bg-red-100", text: "text-red-700", label: "막힘" },
};

const DEFAULT_ENGAGEMENT = { bg: "bg-gray-100", text: "text-gray-700", label: "알 수 없음" };

const TIMELINE_LINE_COLOR = "bg-blue-200";
const TIMELINE_DOT_COLOR_ACTIVE = "bg-blue-500";

const STRONGEST_LABEL = "강점";
const WEAKEST_LABEL = "약점";


// --- Types ---

interface ThoughtTimelineProps
{
    messages: MessageWithAnalysis[];
}

interface DimensionResult
{
    key: string;
    label: string;
    score: number;
}


// --- Helper Functions ---

/**
 * Finds the dimension with the highest score in a turn's analysis.
 */
function findStrongestDimension(analysis: Record<string, number>): DimensionResult
{
    let tBestKey = DIMENSION_KEYS[0];
    let tBestScore = -1;

    for (const key of DIMENSION_KEYS)
    {
        const tScore = analysis[key] ?? 0;
        if (tScore > tBestScore)
        {
            tBestScore = tScore;
            tBestKey = key;
        }
    }

    return {
        key: tBestKey,
        label: DIMENSION_LABELS[tBestKey],
        score: tBestScore,
    };
}

/**
 * Finds the dimension with the lowest score in a turn's analysis.
 */
function findWeakestDimension(analysis: Record<string, number>): DimensionResult
{
    let tWorstKey = DIMENSION_KEYS[0];
    let tWorstScore = Infinity;

    for (const key of DIMENSION_KEYS)
    {
        const tScore = analysis[key] ?? 0;
        if (tScore < tWorstScore)
        {
            tWorstScore = tScore;
            tWorstKey = key;
        }
    }

    return {
        key: tWorstKey,
        label: DIMENSION_LABELS[tWorstKey],
        score: tWorstScore,
    };
}

/**
 * Extracts dimension scores from a MessageWithAnalysis into a plain Record.
 */
function extractDimensionScores(message: MessageWithAnalysis): Record<string, number>
{
    if (!message.analysis)
    {
        return {};
    }

    const tScores: Record<string, number> = {};
    for (const key of DIMENSION_KEYS)
    {
        tScores[key] = (message.analysis as unknown as Record<string, number>)[key] ?? 0;
    }
    return tScores;
}


// --- Timeline Entry Component ---

interface TimelineEntryProps
{
    message: MessageWithAnalysis;
    isLast: boolean;
}

function TimelineEntry({ message, isLast }: TimelineEntryProps)
{
    const tAnalysis = message.analysis;
    const tHasAnalysis = tAnalysis !== null;

    if (!tHasAnalysis)
    {
        return null;
    }

    const tScores = extractDimensionScores(message);
    const tStrongest = findStrongestDimension(tScores);
    const tWeakest = findWeakestDimension(tScores);

    const tEngagement = ENGAGEMENT_COLORS[tAnalysis.engagementLevel] ?? DEFAULT_ENGAGEMENT;
    const tStageIndex = tAnalysis.socraticStage - 1;
    const tStageLabel = STAGE_LABELS[tStageIndex] ?? `단계 ${tAnalysis.socraticStage}`;

    return (
        <div className="relative flex gap-4">
            {/* Vertical line and dot */}
            <div className="flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${TIMELINE_DOT_COLOR_ACTIVE} ring-2 ring-blue-100`} />
                {!isLast && (
                    <div className={`w-0.5 flex-1 ${TIMELINE_LINE_COLOR}`} />
                )}
            </div>

            {/* Content */}
            <div className="mb-6 flex-1 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    {/* Turn number */}
                    <span className="text-xs font-semibold text-gray-500">
                        턴 {message.turnNumber}
                    </span>

                    {/* Stage badge */}
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">
                        {tStageLabel}
                    </Badge>

                    {/* Engagement badge */}
                    <Badge
                        variant="secondary"
                        className={`text-xs ${tEngagement.bg} ${tEngagement.text} border-0`}
                    >
                        {tEngagement.label}
                    </Badge>
                </div>

                {/* Strongest and weakest dimensions */}
                <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-green-600">{STRONGEST_LABEL}:</span>
                        <span className="text-gray-700">
                            {tStrongest.label} ({tStrongest.score.toFixed(1)})
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="font-medium text-red-500">{WEAKEST_LABEL}:</span>
                        <span className="text-gray-700">
                            {tWeakest.label} ({tWeakest.score.toFixed(1)})
                        </span>
                    </div>
                </div>

                {/* Detected patterns */}
                {tAnalysis.detectedPatterns && tAnalysis.detectedPatterns.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {tAnalysis.detectedPatterns.map((pattern, index) => (
                            <Badge
                                key={index}
                                variant="secondary"
                                className="text-[10px] bg-gray-50 text-gray-500"
                            >
                                {pattern}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


// --- Component ---

export function ThoughtTimeline({ messages }: ThoughtTimelineProps)
{
    // Only show messages that have analysis (assistant messages with analysis)
    const tAnalyzedMessages = messages.filter(
        (msg) => msg.analysis !== null
    );

    if (tAnalyzedMessages.length === 0)
    {
        return (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                사고 분석 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="py-2">
            {tAnalyzedMessages.map((message, index) => (
                <TimelineEntry
                    key={message.id}
                    message={message}
                    isLast={index === tAnalyzedMessages.length - 1}
                />
            ))}
        </div>
    );
}
