"use client";

/**
 * Student sessions list page.
 * Shows all user sessions with subject, topic, status, turn count, and date.
 * Completed sessions link to report page; active sessions link to chat.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    FlaskConical,
    PenLine,
    Clock,
    CheckCircle2,
    MessageCircle,
    ChevronRight,
    Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getSessions } from "@/lib/api";
import { SUBJECT_LABELS } from "@/lib/constants";
import type { TutoringSession } from "@/types";


// --- Constants ---

const SUBJECT_ICONS: Record<string, React.ElementType> = {
    math: BookOpen,
    science: FlaskConical,
    essay: PenLine,
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: {
        label: "진행 중",
        className: "bg-green-100 text-green-700 border-green-200",
        icon: Clock,
    },
    completed: {
        label: "완료",
        className: "bg-blue-100 text-blue-700 border-blue-200",
        icon: CheckCircle2,
    },
};

const DEFAULT_STATUS_CONFIG = {
    label: "알 수 없음",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Clock,
};

const EMPTY_STATE_MESSAGE = "아직 세션이 없습니다. 새 대화를 시작해보세요!";
const PAGE_TITLE = "세션 목록";
const NEW_CHAT_LABEL = "새 대화 시작";
const LOADING_SKELETON_COUNT = 4;


// --- Helper ---

/**
 * Formats ISO date string to Korean locale date display.
 */
function formatDate(isoDate: string): string
{
    const tDate = new Date(isoDate);
    return tDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}


// --- Loading Skeleton ---

function SessionSkeleton()
{
    return (
        <Card className="animate-pulse">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-gray-200" />
                        <div className="h-3 w-1/2 rounded bg-gray-200" />
                    </div>
                    <div className="h-6 w-16 rounded bg-gray-200" />
                </div>
            </CardContent>
        </Card>
    );
}


// --- Session Card ---

interface SessionCardProps
{
    session: TutoringSession;
    onClick: () => void;
}

function SessionCard({ session, onClick }: SessionCardProps)
{
    const IconComponent = SUBJECT_ICONS[session.subject] ?? BookOpen;
    const tStatus = STATUS_CONFIG[session.status] ?? DEFAULT_STATUS_CONFIG;
    const StatusIcon = tStatus.icon;

    return (
        <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-200"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    {/* Subject icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>

                    {/* Session info */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-gray-900">
                                {session.topic}
                            </h3>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span>{SUBJECT_LABELS[session.subject] ?? session.subject}</span>
                            <span className="text-gray-300">|</span>
                            <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {session.totalTurns}턴
                            </span>
                            <span className="text-gray-300">|</span>
                            <span>{formatDate(session.startedAt)}</span>
                        </div>
                    </div>

                    {/* Status badge */}
                    <Badge variant="outline" className={`shrink-0 text-xs ${tStatus.className}`}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {tStatus.label}
                    </Badge>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                </div>
            </CardContent>
        </Card>
    );
}


// --- Component ---

export default function StudentSessionsPage()
{
    const [mSessions, setSessions] = useState<TutoringSession[]>([]);
    const [mIsLoading, setIsLoading] = useState(true);
    const [mError, setError] = useState<string | null>(null);

    const { token } = useAuth();
    const router = useRouter();

    // 세션 목록 로드
    useEffect(() =>
    {
        if (!token)
        {
            return;
        }

        let tIsCancelled = false;

        async function loadSessions()
        {
            try
            {
                const tData = await getSessions(token!);
                if (!tIsCancelled)
                {
                    setSessions(tData);
                }
            }
            catch (error)
            {
                if (!tIsCancelled)
                {
                    const tMsg = error instanceof Error ? error.message : "세션 목록을 불러오지 못했습니다.";
                    setError(tMsg);
                }
            }
            finally
            {
                if (!tIsCancelled)
                {
                    setIsLoading(false);
                }
            }
        }

        loadSessions();

        return () =>
        {
            tIsCancelled = true;
        };
    }, [token]);

    /**
     * Navigates to report page for completed sessions, or chat page for active ones.
     */
    function handleSessionClick(session: TutoringSession)
    {
        if (session.status === "completed")
        {
            router.push(`/student/report/${session.id}`);
        }
        else
        {
            router.push(`/student/chat?sessionId=${session.id}`);
        }
    }

    return (
        <div className="mx-auto max-w-2xl p-4 sm:p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                    {PAGE_TITLE}
                </h1>
                <Button
                    size="sm"
                    onClick={() => router.push("/student/chat")}
                >
                    <Plus className="mr-1 h-4 w-4" />
                    {NEW_CHAT_LABEL}
                </Button>
            </div>

            {/* Loading state */}
            {mIsLoading && (
                <div className="space-y-3">
                    {Array.from({ length: LOADING_SKELETON_COUNT }).map((_, index) => (
                        <SessionSkeleton key={index} />
                    ))}
                </div>
            )}

            {/* Error state */}
            {mError && !mIsLoading && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {mError}
                </div>
            )}

            {/* Empty state */}
            {!mIsLoading && !mError && mSessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                        <MessageCircle className="h-8 w-8 text-blue-400" />
                    </div>
                    <p className="mb-4 text-sm text-gray-500">
                        {EMPTY_STATE_MESSAGE}
                    </p>
                    <Button onClick={() => router.push("/student/chat")}>
                        <Plus className="mr-1 h-4 w-4" />
                        {NEW_CHAT_LABEL}
                    </Button>
                </div>
            )}

            {/* Session list */}
            {!mIsLoading && !mError && mSessions.length > 0 && (
                <div className="space-y-3">
                    {mSessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            onClick={() => handleSessionClick(session)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
