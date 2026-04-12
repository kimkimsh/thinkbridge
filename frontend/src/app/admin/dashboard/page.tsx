"use client";

/**
 * Admin dashboard page.
 * Displays platform-wide stats, per-class bar chart comparison,
 * and per-subject radar chart overlay. All data from seed data.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getAdminStats, getAdminClasses, getAdminSubjects } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TutorialButton } from "@/components/tutorial/TutorialButton";
import { useAutoStartTutorial } from "@/lib/tutorial";
import {
    Users,
    BookOpen,
    TrendingUp,
    Activity,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadarChart as RechartsRadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from "recharts";
import {
    DIMENSION_KEYS,
    DIMENSION_LABELS,
    DIMENSION_COLORS,
    SUBJECT_LABELS,
    MAX_DIMENSION_SCORE,
} from "@/lib/constants";
import type { AdminStats, AdminClassComparison, AdminSubjectRadar } from "@/types";


// --- Constants ---

const PAGE_TITLE = "운영자 대시보드";
const DEMO_BANNER_TEXT = "데모 데이터입니다. 실제 운영 시 전체 학원 데이터가 표시됩니다.";
const ERROR_LOAD_DATA = "데이터를 불러오는 중 오류가 발생했습니다.";
const RETRY_BUTTON_LABEL = "다시 시도";

const BAR_CHART_TITLE = "반별 사고력 비교";
const RADAR_CHART_TITLE = "과목별 6차원 레이더";

const BAR_CHART_HEIGHT = 400;
const RADAR_CHART_HEIGHT = 400;
const RADAR_OUTER_RADIUS = "70%";
const RADAR_TICK_COUNT = 6;

/** Colors for each subject in radar chart overlay */
const SUBJECT_COLORS: Record<string, string> = {
    math: "#3B82F6",
    science: "#10B981",
    essay: "#8B5CF6",
};

/** Fill opacity for radar chart areas */
const RADAR_FILL_OPACITY = 0.15;
const RADAR_STROKE_WIDTH = 2;

const STAT_CARD_SKELETON_COUNT = 4;


// --- Stat Card Configuration ---

interface StatCardConfig
{
    label: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    getValue: (stats: AdminStats) => string;
    suffix: string;
}

const STAT_CARDS: StatCardConfig[] = [
    {
        label: "총 학생",
        icon: Users,
        iconColor: "text-blue-600",
        iconBg: "bg-blue-100",
        getValue: (stats) => stats.totalStudents.toString(),
        suffix: "명",
    },
    {
        label: "총 세션",
        icon: BookOpen,
        iconColor: "text-green-600",
        iconBg: "bg-green-100",
        getValue: (stats) => stats.totalSessions.toString(),
        suffix: "회",
    },
    {
        label: "전체 평균",
        icon: TrendingUp,
        iconColor: "text-purple-600",
        iconBg: "bg-purple-100",
        getValue: (stats) => stats.avgScore.toFixed(1),
        suffix: "점",
    },
    {
        label: "활성률",
        icon: Activity,
        iconColor: "text-orange-600",
        iconBg: "bg-orange-100",
        getValue: (stats) => stats.activeRate.toFixed(0),
        suffix: "%",
    },
];


// --- Data Transformation Helpers ---

interface BarChartDataPoint
{
    className: string;
    [dimensionKey: string]: string | number;
}

/**
 * Transforms per-class comparison data into Recharts BarChart format.
 * Each data point has className and one key per dimension.
 */
function buildBarChartData(classes: AdminClassComparison[]): BarChartDataPoint[]
{
    return classes.map((classItem) =>
    {
        const tPoint: BarChartDataPoint = {
            className: classItem.name,
        };

        for (const tKey of DIMENSION_KEYS)
        {
            tPoint[tKey] = classItem.scores[tKey] ?? 0;
        }

        return tPoint;
    });
}


interface RadarDataPoint
{
    dimension: string;
    [subjectKey: string]: string | number;
}

/**
 * Transforms per-subject radar data into Recharts RadarChart format.
 * Each data point has dimension label and one key per subject.
 */
function buildRadarData(subjects: AdminSubjectRadar[]): RadarDataPoint[]
{
    return DIMENSION_KEYS.map((dimensionKey) =>
    {
        const tPoint: RadarDataPoint = {
            dimension: DIMENSION_LABELS[dimensionKey],
        };

        for (const tSubject of subjects)
        {
            tPoint[tSubject.subject] = tSubject.scores[dimensionKey] ?? 0;
        }

        return tPoint;
    });
}


// --- Component ---

export default function AdminDashboardPage()
{
    const { token } = useAuth();

    const [mStats, setStats] = useState<AdminStats | null>(null);
    const [mClasses, setClasses] = useState<AdminClassComparison[]>([]);
    const [mSubjects, setSubjects] = useState<AdminSubjectRadar[]>([]);

    const [mIsLoading, setIsLoading] = useState(true);
    const [mError, setError] = useState<string | null>(null);

    // 튜토리얼 자동 실행: 통계 로드 완료 시점에서 트리거.
    useAutoStartTutorial("admin", !mIsLoading && !!mStats);

    /**
     * 전체 데이터 로드 - 3개 API 병렬 호출
     */
    const loadDashboardData = useCallback(async () =>
    {
        if (!token)
        {
            return;
        }

        setIsLoading(true);
        setError(null);

        try
        {
            const [tStats, tClasses, tSubjects] = await Promise.all([
                getAdminStats(token),
                getAdminClasses(token),
                getAdminSubjects(token),
            ]);

            setStats(tStats);
            setClasses(tClasses);
            setSubjects(tSubjects);
        }
        catch
        {
            setError(ERROR_LOAD_DATA);
        }
        finally
        {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() =>
    {
        loadDashboardData();
    }, [loadDashboardData]);

    // 로딩 스켈레톤
    if (mIsLoading)
    {
        return (
            <div className="space-y-6 p-6">
                <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-12 animate-pulse rounded-lg bg-amber-100" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: STAT_CARD_SKELETON_COUNT }).map((_, index) => (
                        <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-200" />
                    ))}
                </div>
                <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
                <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
            </div>
        );
    }

    const tBarChartData = buildBarChartData(mClasses);
    const tRadarData = buildRadarData(mSubjects);

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* 페이지 제목 + 튜토리얼 버튼 */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                    {PAGE_TITLE}
                </h1>
                <TutorialButton tutorialId="admin" />
            </div>

            {/* Demo Data 배너 */}
            <div
                data-tutorial-id="admin-demo-banner"
                className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3"
            >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                    {DEMO_BANNER_TEXT}
                </p>
            </div>

            {/* 에러 메시지 */}
            {mError && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <span className="text-sm text-red-700">{mError}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4 shrink-0 border-red-300 text-red-700 hover:bg-red-100"
                        onClick={loadDashboardData}
                    >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        {RETRY_BUTTON_LABEL}
                    </Button>
                </div>
            )}

            {/* 요약 카드 4개 */}
            {mStats && (
                <div
                    data-tutorial-id="admin-stats-cards"
                    className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                >
                    {STAT_CARDS.map((metric) =>
                    {
                        const IconComponent = metric.icon;
                        const tValue = metric.getValue(mStats);

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
                                            <span className="ml-0.5 text-sm font-medium text-gray-500">
                                                {metric.suffix}
                                            </span>
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* 반별 사고력 비교 BarChart */}
            {tBarChartData.length > 0 && (
                <Card data-tutorial-id="admin-bar-chart">
                    <CardContent className="p-4 sm:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">
                            {BAR_CHART_TITLE}
                        </h2>
                        <div className="overflow-x-auto -mx-2 px-2">
                        <ResponsiveContainer width="100%" height={BAR_CHART_HEIGHT} minWidth={400}>
                            <BarChart
                                data={tBarChartData}
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="className"
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    domain={[0, MAX_DIMENSION_SCORE]}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip />
                                <Legend
                                    wrapperStyle={{ fontSize: 12 }}
                                />
                                {DIMENSION_KEYS.map((dimensionKey) => (
                                    <Bar
                                        key={dimensionKey}
                                        dataKey={dimensionKey}
                                        name={DIMENSION_LABELS[dimensionKey]}
                                        fill={DIMENSION_COLORS[dimensionKey]}
                                        radius={[2, 2, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 과목별 6차원 레이더 */}
            {tRadarData.length > 0 && mSubjects.length > 0 && (
                <Card data-tutorial-id="admin-radar-chart">
                    <CardContent className="p-6">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900">
                            {RADAR_CHART_TITLE}
                        </h2>
                        <ResponsiveContainer width="100%" height={RADAR_CHART_HEIGHT}>
                            <RechartsRadarChart data={tRadarData} outerRadius={RADAR_OUTER_RADIUS}>
                                <PolarGrid />
                                <PolarAngleAxis
                                    dataKey="dimension"
                                    tick={{ fontSize: 12, fill: "#374151" }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, MAX_DIMENSION_SCORE]}
                                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                    tickCount={RADAR_TICK_COUNT}
                                />
                                {mSubjects.map((subjectData) =>
                                {
                                    const tColor = SUBJECT_COLORS[subjectData.subject] ?? "#6B7280";
                                    const tLabel = SUBJECT_LABELS[subjectData.subject] ?? subjectData.subject;

                                    return (
                                        <Radar
                                            key={subjectData.subject}
                                            name={tLabel}
                                            dataKey={subjectData.subject}
                                            stroke={tColor}
                                            fill={tColor}
                                            fillOpacity={RADAR_FILL_OPACITY}
                                            strokeWidth={RADAR_STROKE_WIDTH}
                                        />
                                    );
                                })}
                                <Legend
                                    wrapperStyle={{ fontSize: 12 }}
                                />
                            </RechartsRadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
