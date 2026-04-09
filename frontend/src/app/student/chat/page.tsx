"use client";

/**
 * Student chat page with subject selector, topic input, and chat interface.
 * Before a session starts: shows subject selection and topic input form.
 * After session creation: renders the full ChatInterface with SSE streaming.
 * Supports guest mode with turn-limited badge.
 */

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, BookOpen, FlaskConical, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useAuth } from "@/lib/auth";
import { createSession, getSessionDetail } from "@/lib/api";
import { SUBJECT_LABELS, GUEST_MAX_TURNS } from "@/lib/constants";


// --- Constants ---

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
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <MessageCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">새 대화 시작</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        과목과 주제를 선택하고 소크라테스식 대화를 시작하세요.
                    </p>

                    {/* Guest badge */}
                    {tIsGuest && (
                        <div className="mt-2">
                            <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-700 border-amber-300"
                            >
                                {GUEST_MAX_TURNS}턴 체험 중
                            </Badge>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Subject selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            과목 선택
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {SUBJECT_OPTIONS.map((option) =>
                            {
                                const tIsSelected = mSelectedSubject === option.key;
                                const IconComponent = option.icon;

                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setSelectedSubject(option.key)}
                                        className={`
                                            flex flex-col items-center gap-1.5 rounded-lg border-2 p-3
                                            transition-all duration-200
                                            ${tIsSelected
                                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                            }
                                        `}
                                    >
                                        <IconComponent className={`h-5 w-5 ${tIsSelected ? "text-blue-600" : "text-gray-400"}`} />
                                        <span className="text-sm font-medium">
                                            {SUBJECT_LABELS[option.key]}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {option.description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Topic input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            주제 입력
                        </label>
                        <Input
                            value={mTopicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            onKeyDown={handleTopicKeyDown}
                            placeholder={TOPIC_PLACEHOLDERS[mSelectedSubject] || DEFAULT_TOPIC_PLACEHOLDER}
                            disabled={mIsCreating}
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
                        className="w-full"
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
