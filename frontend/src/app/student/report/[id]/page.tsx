"use client";

/**
 * Student report page for a completed tutoring session.
 * Displays radar chart (6-dim scores), AI narrative summary,
 * growth trend across sessions, and turn-by-turn thought timeline.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    MessageCircle,
    Calendar,
    BookOpen,
    FlaskConical,
    PenLine,
    BarChart3,
    TrendingUp,
    Clock,
    List,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
    getSessionReport,
    getSessionDetail,
    getStudentGrowth,
    normalizeErrorMessage,
} from "@/lib/api";
import { SUBJECT_LABELS, DIMENSION_KEYS } from "@/lib/constants";
import type {
    Report,
    SessionDetail,
    GrowthTrendEntry,
} from "@/types";
import { ThinkingRadarChart } from "@/components/charts/RadarChart";
import { GrowthTrendChart } from "@/components/charts/GrowthTrendChart";
import { ThoughtTimeline } from "@/components/charts/ThoughtTimeline";


// --- Constants ---

const PAGE_TITLE = "학습 리포트";
const GROWTH_SECTION_TITLE = "성장 추세";
const TIMELINE_SECTION_TITLE = "턴별 사고 분석";
const SUMMARY_SECTION_TITLE = "AI 분석 요약";
const RADAR_CHART_TITLE = "사고력 분석";

const NAV_NEW_CHAT = "새 대화 시작";
const NAV_SESSION_LIST = "세션 목록으로";

const SUBJECT_ICONS: Record<string, React.ElementType> = {
    math: BookOpen,
    science: FlaskConical,
    essay: PenLine,
};


// --- Report Retry Constants ---

/**
 * 최대 재시도 횟수.
 * endSession 직후 백엔드에서 리포트 생성이 진행 중일 수 있어 /api/reports/session/{id} 가
 * 404 (REPORT_NOT_READY_DETAIL) 를 반환할 수 있다. 이를 에러로 바로 노출하지 않고
 * 짧은 간격으로 재시도하여 "분석 중" 안내를 보여준다.
 */
const REPORT_RETRY_ATTEMPTS = 5;

/** 각 재시도 사이의 대기 시간 (ms) */
const REPORT_RETRY_INTERVAL_MS = 2000;

/** 리포트 로드 실패 시 기본 사용자 메시지 */
const REPORT_LOAD_FAILED_MESSAGE = "리포트를 불러오지 못했습니다.";

/** 404 detail 텍스트에서 "아직 준비되지 않음" 케이스 매칭에 사용하는 부분 문자열 */
const NOT_READY_MARKER_JSON = "아직 준비";
const NOT_READY_MARKER_HEADER = "리포트가 아직";
const NOT_READY_MARKER_STATUS = "HTTP 404";

/** 재시도 진행 중 오버레이에 표시할 메시지 템플릿 */
function buildGeneratingMessage(currentAttempt: number, totalAttempts: number): string
{
    return `사고 과정을 분석하고 있어요... (${currentAttempt}/${totalAttempts})`;
}


// --- Helper ---

/**
 * Formats ISO date string to Korean locale date display.
 */
function formatDate(isoDate: string): string
{
    const tDate = new Date(isoDate);
    return tDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/**
 * Calculates average dimension scores from growth trend data for comparison overlay.
 */
function calculateAverageScores(growthData: GrowthTrendEntry[]): Record<string, number>
{
    if (growthData.length === 0)
    {
        return {};
    }

    const tTotals: Record<string, number> = {};
    for (const key of DIMENSION_KEYS)
    {
        tTotals[key] = 0;
    }

    for (const entry of growthData)
    {
        for (const key of DIMENSION_KEYS)
        {
            tTotals[key] += (entry as unknown as Record<string, number>)[key] ?? 0;
        }
    }

    const tAverages: Record<string, number> = {};
    for (const key of DIMENSION_KEYS)
    {
        tAverages[key] = tTotals[key] / growthData.length;
    }

    return tAverages;
}

/**
 * Counts the number of thinking stage transitions in the session messages.
 */
function countStageTransitions(sessionDetail: SessionDetail): number
{
    let tTransitions = 0;
    let tPrevStage = -1;

    for (const msg of sessionDetail.messages)
    {
        if (msg.analysis)
        {
            if (tPrevStage !== -1 && msg.analysis.socraticStage !== tPrevStage)
            {
                tTransitions++;
            }
            tPrevStage = msg.analysis.socraticStage;
        }
    }

    return tTransitions;
}


// --- Loading Skeleton ---

function ReportSkeleton()
{
    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
            {/* Header skeleton */}
            <div className="animate-pulse space-y-3">
                <div className="h-7 w-48 rounded bg-gray-200" />
                <div className="flex gap-2">
                    <div className="h-6 w-20 rounded bg-gray-200" />
                    <div className="h-6 w-32 rounded bg-gray-200" />
                    <div className="h-6 w-16 rounded bg-gray-200" />
                </div>
            </div>

            {/* Radar + Summary skeleton */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="h-80 animate-pulse rounded-lg border bg-gray-100" />
                <div className="animate-pulse space-y-3 rounded-lg border p-4">
                    <div className="h-5 w-32 rounded bg-gray-200" />
                    <div className="h-4 w-full rounded bg-gray-200" />
                    <div className="h-4 w-5/6 rounded bg-gray-200" />
                    <div className="h-4 w-4/6 rounded bg-gray-200" />
                    <div className="h-4 w-full rounded bg-gray-200" />
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                </div>
            </div>

            {/* Growth chart skeleton */}
            <div className="h-96 animate-pulse rounded-lg border bg-gray-100" />

            {/* Timeline skeleton */}
            <div className="animate-pulse space-y-4 rounded-lg border p-4">
                <div className="h-5 w-40 rounded bg-gray-200" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <div className="h-3 w-3 rounded-full bg-gray-200" />
                        <div className="h-16 flex-1 rounded bg-gray-200" />
                    </div>
                ))}
            </div>
        </div>
    );
}


// --- Component ---

export default function StudentReportPage()
{
    const [mReport, setReport] = useState<Report | null>(null);
    const [mSessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
    const [mGrowthData, setGrowthData] = useState<GrowthTrendEntry[]>([]);
    const [mIsLoading, setIsLoading] = useState(true);
    const [mError, setError] = useState<string | null>(null);
    // 리포트 생성이 아직 완료되지 않아 재시도 중일 때 스켈레톤 위에 띄우는 진행 메시지.
    // null 이면 평범한 스켈레톤만 노출.
    const [mGeneratingMessage, setGeneratingMessage] = useState<string | null>(null);

    const params = useParams();
    const router = useRouter();
    const { user, token } = useAuth();

    const tSessionId = Number(params.id);

    // NaN 검증 - 잘못된 파라미터이면 세션 목록으로 리다이렉트
    useEffect(() =>
    {
        if (isNaN(tSessionId))
        {
            router.push("/student/sessions");
        }
    }, [tSessionId, router]);

    // 리포트 데이터 로드
    useEffect(() =>
    {
        if (!token || !user || isNaN(tSessionId))
        {
            return;
        }

        let tIsCancelled = false;

        /**
         * 리포트 + 세션 상세 + 성장 추세 병렬 로드.
         * 백엔드에서 endSession 직후 아직 리포트 생성이 완료되지 않았다면
         * 404 (REPORT_NOT_READY_DETAIL) 가 반환되므로,
         * 짧은 간격으로 REPORT_RETRY_ATTEMPTS 회까지 재시도하며
         * 사용자에게는 "분석 중..." 진행 메시지를 보여준다.
         */
        async function loadReportData()
        {
            for (let tAttempt = 0; tAttempt < REPORT_RETRY_ATTEMPTS; tAttempt++)
            {
                if (tIsCancelled)
                {
                    return;
                }

                try
                {
                    // 병렬로 3개 API 호출
                    const [tReport, tDetail, tGrowth] = await Promise.all([
                        getSessionReport(tSessionId, token!),
                        getSessionDetail(tSessionId, token!),
                        getStudentGrowth(user!.id, token!),
                    ]);

                    if (!tIsCancelled)
                    {
                        setReport(tReport);
                        setSessionDetail(tDetail);
                        setGrowthData(tGrowth);
                        setGeneratingMessage(null);
                        setIsLoading(false);
                    }
                    return;
                }
                catch (tError)
                {
                    if (tIsCancelled)
                    {
                        return;
                    }

                    // "아직 준비되지 않음" 시그널 판별:
                    // - JSON detail 에 포함된 한국어 문구
                    // - apiRequest fallback 메시지 "HTTP 404"
                    const tRaw = tError instanceof Error ? tError.message : String(tError);
                    const tIsNotReady =
                        tRaw.includes(NOT_READY_MARKER_JSON)
                        || tRaw.includes(NOT_READY_MARKER_HEADER)
                        || tRaw.includes(NOT_READY_MARKER_STATUS);

                    const tHasMoreAttempts = tAttempt < REPORT_RETRY_ATTEMPTS - 1;

                    if (tIsNotReady && tHasMoreAttempts)
                    {
                        setGeneratingMessage(
                            buildGeneratingMessage(tAttempt + 1, REPORT_RETRY_ATTEMPTS),
                        );
                        await new Promise((tResolve) =>
                            setTimeout(tResolve, REPORT_RETRY_INTERVAL_MS),
                        );
                        continue;
                    }

                    // 재시도 소진 or not-ready 이외의 실제 에러 — 사용자에게 노출
                    setError(normalizeErrorMessage(tError) || REPORT_LOAD_FAILED_MESSAGE);
                    setGeneratingMessage(null);
                    setIsLoading(false);
                    return;
                }
            }
        }

        loadReportData();

        return () =>
        {
            tIsCancelled = true;
        };
    }, [token, user, tSessionId]);

    // --- Loading state ---
    // 재시도 중일 때는 스켈레톤 위에 "분석 중" 오버레이를 띄워
    // 단순 에러 박스 대신 진행감 있는 피드백을 제공한다.
    if (mIsLoading)
    {
        return (
            <div className="relative">
                <ReportSkeleton />
                {mGeneratingMessage && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                        <p className="mt-3 text-sm font-medium text-gray-700">
                            {mGeneratingMessage}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            잠시만 기다려 주세요
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // --- Error state ---
    if (mError)
    {
        return (
            <div className="mx-auto max-w-4xl p-4 sm:p-6">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {mError}
                </div>
                <div className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/student/sessions")}
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        {NAV_SESSION_LIST}
                    </Button>
                </div>
            </div>
        );
    }

    // --- No data ---
    if (!mReport || !mSessionDetail)
    {
        return (
            <div className="mx-auto max-w-4xl p-4 sm:p-6">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    리포트 데이터가 없습니다.
                </div>
                <div className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/student/sessions")}
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        {NAV_SESSION_LIST}
                    </Button>
                </div>
            </div>
        );
    }

    // --- Derived values ---
    const tSubjectLabel = SUBJECT_LABELS[mSessionDetail.subject] ?? mSessionDetail.subject;
    const SubjectIcon = SUBJECT_ICONS[mSessionDetail.subject] ?? BookOpen;
    const tAverageScores = calculateAverageScores(mGrowthData);
    const tHasComparison = mGrowthData.length > 1;
    const tStageTransitions = countStageTransitions(mSessionDetail);

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
            {/* Header */}
            <div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-2 text-gray-500 hover:text-gray-700"
                    onClick={() => router.push("/student/sessions")}
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {NAV_SESSION_LIST}
                </Button>

                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {PAGE_TITLE}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-blue-200 text-blue-700">
                        <SubjectIcon className="mr-1 h-3 w-3" />
                        {tSubjectLabel}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        {mSessionDetail.topic}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        <MessageCircle className="mr-1 h-3 w-3" />
                        {mSessionDetail.totalTurns}턴
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(mSessionDetail.startedAt)}
                    </Badge>
                </div>

                {/* Stage transition summary */}
                {tStageTransitions > 0 && (
                    <p className="mt-3 text-sm text-blue-600">
                        {tStageTransitions}번의 사고 전환을 거쳐 스스로 답에 도달했습니다.
                    </p>
                )}
            </div>

            <Separator />

            {/* Radar Chart + Summary */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Radar Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            {RADAR_CHART_TITLE}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ThinkingRadarChart
                            scores={mReport.dimensionScores}
                            comparisonScores={tHasComparison ? tAverageScores : undefined}
                        />
                    </CardContent>
                </Card>

                {/* AI Summary */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4 text-blue-600" />
                            {SUMMARY_SECTION_TITLE}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                            {mReport.summary}
                        </p>
                        <div className="mt-4 text-xs text-gray-400">
                            {formatDate(mReport.generatedAt)}에 생성됨
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Growth Trend Chart */}
            {mGrowthData.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            {GROWTH_SECTION_TITLE}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GrowthTrendChart data={mGrowthData} />
                    </CardContent>
                </Card>
            )}

            {/* Thought Timeline */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <List className="h-4 w-4 text-blue-600" />
                        {TIMELINE_SECTION_TITLE}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ThoughtTimeline messages={mSessionDetail.messages} />
                </CardContent>
            </Card>

            {/* Navigation buttons */}
            <div className="flex flex-col gap-3 pb-8 sm:flex-row">
                <Button
                    className="flex-1"
                    onClick={() => router.push("/student/chat")}
                >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {NAV_NEW_CHAT}
                </Button>
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/student/sessions")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {NAV_SESSION_LIST}
                </Button>
            </div>
        </div>
    );
}
