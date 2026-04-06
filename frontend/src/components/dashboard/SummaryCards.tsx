"use client";

/**
 * Instructor dashboard summary cards.
 * Displays 4 key metrics: total students, average sessions,
 * active rate, and overall average score.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Activity, TrendingUp } from "lucide-react";
import type { StudentSummary } from "@/types";


// --- Constants ---

const MIN_SCORE_FOR_ACTIVE = 1;


// --- Props ---

interface SummaryCardsProps
{
    students: StudentSummary[];
}


// --- Helper Functions ---

/**
 * Computes average sessions across all students.
 */
function computeAvgSessions(students: StudentSummary[]): string
{
    if (students.length === 0)
    {
        return "0";
    }

    const tTotal = students.reduce((sum, student) => sum + student.sessionCount, 0);
    return (tTotal / students.length).toFixed(1);
}

/**
 * Computes active rate: percentage of students with at least one session.
 */
function computeActiveRate(students: StudentSummary[]): string
{
    if (students.length === 0)
    {
        return "0";
    }

    const tActiveCount = students.filter(
        (student) => student.sessionCount >= MIN_SCORE_FOR_ACTIVE,
    ).length;

    return ((tActiveCount / students.length) * 100).toFixed(0);
}

/**
 * Computes overall average score across all students.
 */
function computeAvgScore(students: StudentSummary[]): string
{
    if (students.length === 0)
    {
        return "0.0";
    }

    const tStudentsWithScores = students.filter((student) => student.avgScore > 0);

    if (tStudentsWithScores.length === 0)
    {
        return "0.0";
    }

    const tTotal = tStudentsWithScores.reduce((sum, student) => sum + student.avgScore, 0);
    return (tTotal / tStudentsWithScores.length).toFixed(1);
}


// --- Metric Card Configuration ---

interface MetricCardConfig
{
    label: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    getValue: (students: StudentSummary[]) => string;
    suffix?: string;
}

const METRIC_CARDS: MetricCardConfig[] = [
    {
        label: "총 학생",
        icon: Users,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
        getValue: (students) => students.length.toString(),
        suffix: "명",
    },
    {
        label: "평균 세션",
        icon: BookOpen,
        iconColor: "text-green-600",
        iconBg: "bg-green-100",
        getValue: computeAvgSessions,
        suffix: "회",
    },
    {
        label: "활성률",
        icon: Activity,
        iconColor: "text-orange-600",
        iconBg: "bg-orange-100",
        getValue: computeActiveRate,
        suffix: "%",
    },
    {
        label: "전체 평균",
        icon: TrendingUp,
        iconColor: "text-purple-600",
        iconBg: "bg-purple-100",
        getValue: computeAvgScore,
        suffix: "점",
    },
];


// --- Component ---

export function SummaryCards({ students }: SummaryCardsProps)
{
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {METRIC_CARDS.map((metric) =>
            {
                const IconComponent = metric.icon;
                const tValue = metric.getValue(students);

                return (
                    <Card key={metric.label}>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${metric.iconBg}`}>
                                <IconComponent className={`h-5 w-5 ${metric.iconColor}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {metric.label}
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {tValue}
                                    {metric.suffix && (
                                        <span className="ml-0.5 text-sm font-medium text-gray-500">
                                            {metric.suffix}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
