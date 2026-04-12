"use client";

/**
 * Instructor session replay page.
 * Dual panel: message conversation on left, thinking analysis on right.
 * The [sessionId] route parameter represents a student ID.
 * Shows the student's completed sessions list, then displays a selected session's replay.
 *
 * Uses the growth trend endpoint to obtain session IDs for the student,
 * then loads session detail for the selected session.
 */

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getStudentGrowth, getSessionDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ThoughtPanel } from "@/components/chat/ThoughtPanel";
import { ArrowLeft, BookOpen, Calendar, User } from "lucide-react";
import { SUBJECT_LABELS } from "@/lib/constants";
import type {
    SessionDetail,
    GrowthTrendEntry,
    MessageWithAnalysis,
    ThoughtAnalysis,
} from "@/types";


// --- Constants ---

const PAGE_TITLE = "세션 리플레이";
const BACK_BUTTON_LABEL = "대시보드로 돌아가기";
const NO_SESSIONS_TEXT = "이 학생의 완료된 세션이 없습니다.";
const SELECT_SESSION_TEXT = "왼쪽에서 세션을 선택하세요.";
const ERROR_LOAD_SESSIONS = "세션 목록을 불러올 수 없습니다.";
const ERROR_LOAD_DETAIL = "세션 상세를 불러올 수 없습니다.";
const NO_MESSAGES_TEXT = "이 세션에 메시지가 없습니다.";

/** Fallback label when the `name` query param is missing or empty */
const UNKNOWN_STUDENT_LABEL = "학생";

/** Suspense fallback placeholder text */
const SUSPENSE_FALLBACK_TEXT = "로딩 중...";


// --- Inner Component (uses useSearchParams) ---

function InstructorReplayPageInner()
{
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = useAuth();

    // 대시보드 네비게이션에서 전달된 학생 이름 (누락 또는 빈 문자열이면 fallback)
    const tNameParam = searchParams.get("name");
    const tStudentName = tNameParam && tNameParam.length > 0
        ? tNameParam
        : UNKNOWN_STUDENT_LABEL;

    // Route param is student ID (named sessionId in the route structure)
    const mStudentId = Number(params.sessionId);

    // NaN 검증 - 잘못된 파라미터이면 대시보드로 리다이렉트
    useEffect(() =>
    {
        if (isNaN(mStudentId))
        {
            router.push("/instructor/dashboard");
        }
    }, [mStudentId, router]);

    const [mSessionEntries, setSessionEntries] = useState<GrowthTrendEntry[]>([]);
    const [mSelectedSessionId, setSelectedSessionId] = useState<number | null>(null);
    const [mSessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
    const [mSelectedAnalysis, setSelectedAnalysis] = useState<ThoughtAnalysis | null>(null);
    const [mSelectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(null);

    const [mIsLoadingSessions, setIsLoadingSessions] = useState(true);
    const [mIsLoadingDetail, setIsLoadingDetail] = useState(false);
    const [mError, setError] = useState<string | null>(null);

    /**
     * 학생의 세션 목록 로드 (growth trend 데이터 활용)
     */
    useEffect(() =>
    {
        if (!token || isNaN(mStudentId))
        {
            return;
        }

        let tIsCancelled = false;

        async function loadSessions()
        {
            try
            {
                const tEntries = await getStudentGrowth(mStudentId, token!);

                if (tIsCancelled)
                {
                    return;
                }

                setSessionEntries(tEntries);

                // 첫 번째 세션 자동 선택
                if (tEntries.length > 0)
                {
                    setSelectedSessionId(tEntries[0].sessionId);
                }
            }
            catch
            {
                if (!tIsCancelled)
                {
                    setError(ERROR_LOAD_SESSIONS);
                }
            }
            finally
            {
                if (!tIsCancelled)
                {
                    setIsLoadingSessions(false);
                }
            }
        }

        loadSessions();

        return () =>
        {
            tIsCancelled = true;
        };
    }, [token, mStudentId]);

    /**
     * 선택된 세션의 상세 데이터 로드
     */
    const loadSessionDetail = useCallback(async (sessionId: number) =>
    {
        if (!token)
        {
            return;
        }

        setIsLoadingDetail(true);
        setError(null);
        setSelectedAnalysis(null);
        setSelectedTurnIndex(null);

        try
        {
            const tDetail = await getSessionDetail(sessionId, token);
            setSessionDetail(tDetail);

            // 첫 번째 assistant 메시지의 분석 자동 선택
            const tFirstAssistantIndex = tDetail.messages.findIndex(
                (msg) => msg.role === "assistant" && msg.analysis !== null,
            );

            if (tFirstAssistantIndex >= 0)
            {
                setSelectedTurnIndex(tFirstAssistantIndex);
                setSelectedAnalysis(tDetail.messages[tFirstAssistantIndex].analysis);
            }
        }
        catch
        {
            setError(ERROR_LOAD_DETAIL);
        }
        finally
        {
            setIsLoadingDetail(false);
        }
    }, [token]);

    /**
     * 세션 선택 변경 시 상세 로드
     */
    useEffect(() =>
    {
        if (mSelectedSessionId !== null)
        {
            loadSessionDetail(mSelectedSessionId);
        }
    }, [mSelectedSessionId, loadSessionDetail]);

    /**
     * 메시지 클릭 핸들러 - 해당 메시지의 분석을 오른쪽 패널에 표시
     */
    function handleMessageClick(message: MessageWithAnalysis, index: number)
    {
        if (message.analysis)
        {
            setSelectedAnalysis(message.analysis);
            setSelectedTurnIndex(index);
        }
    }

    // 로딩 스켈레톤
    if (mIsLoadingSessions)
    {
        return (
            <div className="space-y-4 p-6">
                <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
                <div className="flex flex-col gap-4 md:flex-row">
                    <div className="h-32 animate-pulse rounded-xl bg-gray-200 md:h-96 md:w-64" />
                    <div className="h-64 flex-1 animate-pulse rounded-xl bg-gray-200 md:h-96" />
                    <div className="hidden h-96 w-80 animate-pulse rounded-xl bg-gray-200 lg:block" />
                </div>
            </div>
        );
    }

    // 헤더에 표시할 과목 레이블 (알려진 과목이면 한국어, 아니면 raw 값)
    const tSubjectLabel = mSessionDetail
        ? (SUBJECT_LABELS[mSessionDetail.subject] ?? mSessionDetail.subject)
        : null;

    return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col p-4 lg:p-6">
            {/* 헤더: 제목 + 학생/세션 메타 + 뒤로 가기 */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {PAGE_TITLE}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="font-medium text-gray-700">
                            {tStudentName}
                        </span>
                        {mSessionDetail && (
                            <>
                                <span>·</span>
                                <span>{tSubjectLabel}</span>
                                <span>·</span>
                                <span className="truncate max-w-xs">
                                    {mSessionDetail.topic}
                                </span>
                                <span>·</span>
                                <span>세션 #{mSessionDetail.id}</span>
                            </>
                        )}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => router.push("/instructor/dashboard")}
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    {BACK_BUTTON_LABEL}
                </Button>
            </div>

            {/* 에러 메시지 */}
            {mError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {mError}
                </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
                {/* 왼쪽: 세션 목록 (mobile: horizontal scroll, desktop: sidebar) */}
                <div className="shrink-0 md:w-56 lg:w-64">
                    <Card className="h-full">
                        <CardHeader className="p-3">
                            <CardTitle className="text-xs font-semibold text-gray-500">
                                세션 목록
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <ScrollArea className="h-32 md:h-[calc(100vh-14rem)]">
                                {mSessionEntries.length === 0 ? (
                                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                                        {NO_SESSIONS_TEXT}
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {mSessionEntries.map((entry) =>
                                        {
                                            const tIsSelected = mSelectedSessionId === entry.sessionId;

                                            return (
                                                <button
                                                    key={entry.sessionId}
                                                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                                                        tIsSelected
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "hover:bg-gray-50"
                                                    }`}
                                                    onClick={() => setSelectedSessionId(entry.sessionId)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-3 w-3 shrink-0" />
                                                        <span className="text-xs font-medium">
                                                            세션 #{entry.sessionId}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-1 pl-5 text-[10px] text-muted-foreground">
                                                        <Calendar className="h-2.5 w-2.5" />
                                                        <span>
                                                            {new Date(entry.date).toLocaleDateString("ko-KR")}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* 중앙: 메시지 리플레이 */}
                <div className="flex-1">
                    <Card className="h-full">
                        {mIsLoadingDetail ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                            </div>
                        ) : mSessionDetail ? (
                            <>
                                {/* 세션 메타데이터 */}
                                <CardHeader className="border-b p-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px]">
                                            {SUBJECT_LABELS[mSessionDetail.subject] || mSessionDetail.subject}
                                        </Badge>
                                        <span className="text-sm font-medium text-gray-900">
                                            {mSessionDetail.topic}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={
                                                mSessionDetail.status === "completed"
                                                    ? "border-green-300 bg-green-50 text-green-700"
                                                    : "border-yellow-300 bg-yellow-50 text-yellow-700"
                                            }
                                        >
                                            {mSessionDetail.status === "completed" ? "완료" : "진행 중"}
                                        </Badge>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {mSessionDetail.totalTurns}턴
                                        </span>
                                    </div>
                                </CardHeader>

                                {/* 메시지 목록 */}
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[50vh] md:h-[calc(100vh-16rem)]">
                                        {mSessionDetail.messages.length === 0 ? (
                                            <div className="flex h-full items-center justify-center py-12">
                                                <p className="text-sm text-muted-foreground">
                                                    {NO_MESSAGES_TEXT}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 p-4">
                                                {mSessionDetail.messages.map((message, index) => (
                                                    <div
                                                        key={message.id}
                                                        className={`cursor-pointer rounded-lg p-1 transition-colors ${
                                                            mSelectedTurnIndex === index
                                                                ? "bg-blue-50 ring-1 ring-blue-200"
                                                                : "hover:bg-gray-50"
                                                        }`}
                                                        onClick={() => handleMessageClick(message, index)}
                                                    >
                                                        <MessageBubble message={message} />
                                                        {message.analysis && (
                                                            <div className="mt-1 flex justify-end pr-2">
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    분석 보기
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-sm text-muted-foreground">
                                    {SELECT_SESSION_TEXT}
                                </p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* 오른쪽: 분석 패널 */}
                <div className="hidden w-72 shrink-0 lg:block xl:w-80">
                    <div className="sticky top-0">
                        <ThoughtPanel
                            analysis={mSelectedAnalysis}
                            isDemo={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- Suspense Fallback ---

/**
 * 세션 리플레이 페이지 렌더 전 searchParams 바인딩을 위한 스켈레톤.
 * student/chat/page.tsx의 SUSPENSE 패턴을 참조한다.
 */
function InstructorReplayPageSkeleton()
{
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-gray-500">
                {SUSPENSE_FALLBACK_TEXT}
            </div>
        </div>
    );
}


// --- Default Export (Suspense wrapper) ---

/**
 * Next.js 14 요구사항: useSearchParams를 사용하는 클라이언트
 * 컴포넌트는 반드시 Suspense 경계로 감싸야 빌드 시
 * CSR 바인딩 오류를 방지할 수 있다.
 */
export default function InstructorReplayPage()
{
    return (
        <Suspense fallback={<InstructorReplayPageSkeleton />}>
            <InstructorReplayPageInner />
        </Suspense>
    );
}
