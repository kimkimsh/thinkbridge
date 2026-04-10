"use client";

/**
 * Student chat page with subject selector, topic input, and chat interface.
 * Before a session starts: shows subject selection and topic input form.
 * After session creation: renders the full ChatInterface with SSE streaming.
 * Supports guest mode with turn-limited badge.
 */

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, BookOpen, FlaskConical, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useAuth } from "@/lib/auth";
import { createSession, getSessionDetail } from "@/lib/api";
import { SUBJECT_LABELS, GUEST_MAX_TURNS } from "@/lib/constants";


// --- Constants ---

/** Subject color themes for visual distinction */
const SUBJECT_THEMES: Record<string, {
    border: string;
    bg: string;
    text: string;
    iconBg: string;
    iconColor: string;
    ring: string;
}> = {
    math: {
        border: "border-blue-500",
        bg: "bg-blue-50",
        text: "text-blue-700",
        iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
        iconColor: "text-white",
        ring: "ring-blue-200",
    },
    science: {
        border: "border-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
        iconColor: "text-white",
        ring: "ring-emerald-200",
    },
    essay: {
        border: "border-purple-500",
        bg: "bg-purple-50",
        text: "text-purple-700",
        iconBg: "bg-gradient-to-br from-purple-500 to-violet-600",
        iconColor: "text-white",
        ring: "ring-purple-200",
    },
};

/** Default theme for unknown subjects */
const DEFAULT_THEME = SUBJECT_THEMES.math;

/** Available subjects with their icons and descriptions */
const SUBJECT_OPTIONS = [
    {
        key: "math",
        icon: BookOpen,
        description: "방정식, 함수, 기하 등",
    },
    {
        key: "science",
        icon: FlaskConical,
        description: "물리, 화학, 생물 등",
    },
    {
        key: "essay",
        icon: PenLine,
        description: "논증, 비판적 글쓰기 등",
    },
] as const;

/** Topic input placeholder by subject */
const TOPIC_PLACEHOLDERS: Record<string, string> = {
    math: "예: 이차방정식의 근의 공식",
    science: "예: 뉴턴의 운동 법칙",
    essay: "예: 기본소득제 찬반 논증",
};

/** Default topic placeholder */
const DEFAULT_TOPIC_PLACEHOLDER = "학습하고 싶은 주제를 입력하세요";


// --- Component ---

export default function StudentChatPage()
{
    // --- State ---
    const [mSelectedSubject, setSelectedSubject] = useState<string>("math");
    const [mTopicInput, setTopicInput] = useState("");
    const [mSessionId, setSessionId] = useState<number | null>(null);
    const [mIsCreating, setIsCreating] = useState(false);
    const [mError, setError] = useState<string | null>(null);

    // --- Hooks ---
    const { user, token } = useAuth();
    const searchParams = useSearchParams();

    // --- Derived ---
    const tIsGuest = user?.isGuest === true;
    const tIsDemo = searchParams.get("demo") === "true";
    const tCanStart = mTopicInput.trim().length > 0 && !mIsCreating;

    /**
     * If sessionId search param is present, load that session and render ChatInterface directly.
     */
    useEffect(() =>
    {
        const tSessionIdParam = searchParams.get("sessionId");
        if (!tSessionIdParam || !token)
        {
            return;
        }

        const tParsedId = Number(tSessionIdParam);
        if (isNaN(tParsedId))
        {
            return;
        }

        let tIsCancelled = false;

        async function loadExistingSession()
        {
            try
            {
                const tDetail = await getSessionDetail(tParsedId, token!);
                if (!tIsCancelled)
                {
                    setSessionId(tDetail.id);
                    setSelectedSubject(tDetail.subject);
                }
            }
            catch
            {
                // 세션 로드 실패 시 새 대화 시작 UI 유지
                if (!tIsCancelled)
                {
                    setError("기존 세션을 불러올 수 없습니다. 새 대화를 시작하세요.");
                }
            }
        }

        loadExistingSession();

        return () =>
        {
            tIsCancelled = true;
        };
    }, [searchParams, token]);

    /**
     * Creates a new tutoring session and transitions to chat interface.
     */
    const handleStartSession = useCallback(async () =>
    {
        if (!token || !tCanStart)
        {
            return;
        }

        setIsCreating(true);
        setError(null);

        try
        {
            const tSession = await createSession(mSelectedSubject, mTopicInput.trim(), token);
            setSessionId(tSession.id);
        }
        catch (error)
        {
            const tMsg = error instanceof Error ? error.message : "세션 생성 중 오류가 발생했습니다.";
            setError(tMsg);
            setIsCreating(false);
        }
    }, [token, tCanStart, mSelectedSubject, mTopicInput]);

    /**
     * Handles Enter key on topic input to start session.
     */
    const handleTopicKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) =>
    {
        if (event.key === "Enter" && tCanStart)
        {
            handleStartSession();
        }
    }, [tCanStart, handleStartSession]);

    // --- Session active: render chat interface ---
    if (mSessionId !== null)
    {
        return (
            <div className="h-[calc(100vh-4rem)]">
                <ChatInterface
                    sessionId={mSessionId}
                    subject={mSelectedSubject}
                    topic={mTopicInput}
                    isGuest={tIsGuest}
                    isDemo={tIsDemo}
                />
            </div>
        );
    }

    // --- Pre-session: subject + topic selection ---
    return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-gray-50 to-indigo-50/30 p-4">
            <Card className="w-full max-w-lg border-indigo-100 shadow-lg shadow-indigo-100/30">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200/50">
                        <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800">
                        새 대화 시작
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                        과목과 주제를 선택하고 소크라테스식 대화를 시작하세요
                    </p>

                    {/* Guest badge */}
                    {tIsGuest && (
                        <div className="mt-2">
                            <Badge
                                variant="secondary"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                                {GUEST_MAX_TURNS}턴 체험 중
                            </Badge>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Subject selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            과목 선택
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {SUBJECT_OPTIONS.map((option) =>
                            {
                                const tIsSelected = mSelectedSubject === option.key;
                                const IconComponent = option.icon;
                                const tTheme = SUBJECT_THEMES[option.key] || DEFAULT_THEME;

                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setSelectedSubject(option.key)}
                                        className={`
                                            flex flex-col items-center gap-2 rounded-xl border-2 p-4
                                            transition-all duration-200
                                            ${tIsSelected
                                                ? `${tTheme.border} ${tTheme.bg} shadow-sm ring-2 ${tTheme.ring} ring-offset-1`
                                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                                            }
                                        `}
                                    >
                                        <div
                                            className={`
                                                flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200
                                                ${tIsSelected
                                                    ? tTheme.iconBg
                                                    : "bg-gray-100"
                                                }
                                            `}
                                        >
                                            <IconComponent
                                                className={`h-5 w-5 ${tIsSelected ? tTheme.iconColor : "text-gray-400"}`}
                                            />
                                        </div>
                                        <span className={`text-sm font-semibold ${tIsSelected ? tTheme.text : "text-gray-600"}`}>
                                            {SUBJECT_LABELS[option.key]}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {option.description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Topic input */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            주제 입력
                        </label>
                        <Input
                            value={mTopicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            onKeyDown={handleTopicKeyDown}
                            placeholder={TOPIC_PLACEHOLDERS[mSelectedSubject] || DEFAULT_TOPIC_PLACEHOLDER}
                            disabled={mIsCreating}
                            className="border-gray-200 focus-visible:border-indigo-300 focus-visible:ring-indigo-200"
                        />
                    </div>

                    {/* Error message */}
                    {mError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {mError}
                        </div>
                    )}

                    {/* Start button */}
                    <Button
                        className={`
                            w-full shadow-md transition-all duration-200
                            ${tCanStart
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50"
                                : ""
                            }
                        `}
                        size="lg"
                        onClick={handleStartSession}
                        disabled={!tCanStart}
                    >
                        {mIsCreating ? (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                세션 생성 중...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                대화 시작하기
                            </div>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
