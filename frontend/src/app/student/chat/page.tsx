"use client";

/**
 * Student chat page with subject selector, topic input, and chat interface.
 * Before a session starts: shows subject selection and topic input form.
 * After session creation: renders the full ChatInterface with SSE streaming.
 * Supports guest mode with turn-limited badge.
 */

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageCircle, BookOpen, FlaskConical, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatInterface, type ChatMessage } from "@/components/chat/ChatInterface";
import { TutorialButton } from "@/components/tutorial/TutorialButton";
import { useAuth } from "@/lib/auth";
import { createSession, getSessionDetail, normalizeErrorMessage } from "@/lib/api";
import { SUBJECT_LABELS, GUEST_MAX_TURNS, DEFAULT_SOCRATIC_STAGE } from "@/lib/constants";
import { useAutoStartTutorial } from "@/lib/tutorial";
import type { SessionDetail, MessageWithAnalysis, ThoughtAnalysis } from "@/types";


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

/** Suspense fallback placeholder text */
const SUSPENSE_FALLBACK_TEXT = "로딩 중...";

/** 종료된 세션 상태 값 (백엔드 SessionStatus enum과 일치) */
const SESSION_STATUS_COMPLETED = "completed";

/** 세션 로딩 중 표시할 안내 메시지 */
const SESSION_LOADING_TITLE = "이전 대화를 불러오고 있어요...";
const SESSION_LOADING_SUBTITLE = "잠시만 기다려 주세요";


// --- Helpers (session detail → ChatInterface props) ---

/**
 * 세션 상세 응답의 MessageWithAnalysis[] 를 ChatInterface가 사용하는 ChatMessage[] 로 변환한다.
 *
 * 정렬 기준:
 *   1) turnNumber 오름차순
 *   2) 같은 turnNumber 내에서 user → assistant (대화 흐름 보존)
 *
 * API 응답이 이미 정렬되어 있더라도, 클라이언트 측에서도 방어적으로 재정렬한다.
 */
function convertDetailMessagesToChatMessages(messages: MessageWithAnalysis[]): ChatMessage[]
{
    const tSorted = [...messages].sort((a, b) =>
    {
        if (a.turnNumber !== b.turnNumber)
        {
            return a.turnNumber - b.turnNumber;
        }
        // 같은 턴이면 user 먼저
        if (a.role === "user" && b.role !== "user")
        {
            return -1;
        }
        if (a.role !== "user" && b.role === "user")
        {
            return 1;
        }
        return 0;
    });

    return tSorted.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));
}

/**
 * 가장 최근 assistant 메시지의 분석 결과를 찾는다.
 * ChatInterface 의 ThoughtPanel 을 마지막 상태로 복원하기 위함.
 */
function getLastAssistantAnalysis(messages: MessageWithAnalysis[]): ThoughtAnalysis | null
{
    for (let i = messages.length - 1; i >= 0; i--)
    {
        const tMsg = messages[i];
        if (tMsg.role === "assistant" && tMsg.analysis)
        {
            return tMsg.analysis;
        }
    }
    return null;
}

/**
 * 가장 최근 분석의 소크라테스 단계를 반환. 없으면 기본값(1)으로 fallback.
 */
function getLastStageFromAnalyses(messages: MessageWithAnalysis[]): number
{
    const tLast = getLastAssistantAnalysis(messages);
    return tLast?.socraticStage ?? DEFAULT_SOCRATIC_STAGE;
}


// --- Inner Component (uses useSearchParams) ---

function ChatPageInner()
{
    // --- State ---
    const [mSelectedSubject, setSelectedSubject] = useState<string>("math");
    const [mTopicInput, setTopicInput] = useState("");
    const [mSessionId, setSessionId] = useState<number | null>(null);
    const [mIsCreating, setIsCreating] = useState(false);
    const [mError, setError] = useState<string | null>(null);
    // 재개 시 로드한 세션 상세(메시지 + 분석). ChatInterface seed 데이터.
    const [mLoadedDetail, setLoadedDetail] = useState<SessionDetail | null>(null);
    // 세션 상세 로딩 진행 여부. 스피너 UI 표시에 사용.
    const [mIsLoadingSession, setIsLoadingSession] = useState<boolean>(false);

    // --- Hooks ---
    const { user, token } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    // --- Derived ---
    const tIsGuest = user?.isGuest === true;
    const tIsDemo = searchParams.get("demo") === "true";
    const tCanStart = mTopicInput.trim().length > 0 && !mIsCreating;

    // 튜토리얼 자동 실행: 세션 로딩이 끝나면 시작한다.
    // pre-session / in-session 양쪽 상태 모두 커버되며, 이후 단계는 overlay 의
    // waitForTarget 이 timeout 되면 center fallback 으로 표시된다.
    useAutoStartTutorial("chat", !mIsLoadingSession);

    /**
     * sessionId 쿼리 파라미터 감지 시 해당 세션을 불러와 메시지/분석/턴 카운트를 복원한다.
     *
     * - 로딩 중에는 스피너만 표시하여, 빈 "새 대화 시작" 카드가 잠깐 번쩍이는 UX 깨짐을 방지.
     * - completed 세션에 재접속한 경우 편집 방지 목적으로 리포트 페이지로 리다이렉트.
     * - 실패 시 친숙한 한국어 메시지로 사용자에게 안내.
     */
    useEffect(() =>
    {
        const tSessionIdParam = searchParams.get("sessionId");
        if (!tSessionIdParam || !token)
        {
            return;
        }

        const tParsedId = parseInt(tSessionIdParam, 10);
        if (isNaN(tParsedId))
        {
            return;
        }

        let tIsCancelled = false;

        setIsLoadingSession(true);
        setError(null);

        async function loadExistingSession()
        {
            try
            {
                const tDetail = await getSessionDetail(tParsedId, token!);
                if (tIsCancelled)
                {
                    return;
                }

                // 종료된 세션은 수정 불가 - 리포트 페이지로 이동
                if (tDetail.status === SESSION_STATUS_COMPLETED)
                {
                    router.replace(`/student/report/${tDetail.id}`);
                    return;
                }

                setLoadedDetail(tDetail);
                setSessionId(tDetail.id);
                setSelectedSubject(tDetail.subject);
                setTopicInput(tDetail.topic);
            }
            catch (error)
            {
                if (!tIsCancelled)
                {
                    console.error("Failed to load session", error);
                    setError(normalizeErrorMessage(error));
                }
            }
            finally
            {
                if (!tIsCancelled)
                {
                    setIsLoadingSession(false);
                }
            }
        }

        loadExistingSession();

        return () =>
        {
            tIsCancelled = true;
        };
    }, [searchParams, token, router]);

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
            // "Failed to fetch" 등 브라우저 원문 메시지를 한국어 친화 메시지로 치환
            setError(normalizeErrorMessage(error));
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

    // --- Loading existing session: spinner overlay ---
    // 세션 재개 진입 시 detail API 응답 전까지 "새 대화 시작" 카드가
    // 플래시로 보이지 않도록 전용 로딩 뷰를 먼저 렌더한다.
    if (mIsLoadingSession)
    {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-gray-50 to-indigo-50/30">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                    <p className="text-sm font-medium text-gray-700">{SESSION_LOADING_TITLE}</p>
                    <p className="text-xs text-gray-500">{SESSION_LOADING_SUBTITLE}</p>
                </div>
            </div>
        );
    }

    // --- Session active: render chat interface ---
    if (mSessionId !== null)
    {
        // 재개 시 props: DB의 이전 메시지/분석/단계/턴 카운트를 ChatInterface 에 주입
        const tInitialMessages = mLoadedDetail
            ? convertDetailMessagesToChatMessages(mLoadedDetail.messages)
            : undefined;
        const tInitialAnalysis = mLoadedDetail
            ? getLastAssistantAnalysis(mLoadedDetail.messages)
            : undefined;
        const tInitialStage = mLoadedDetail
            ? getLastStageFromAnalyses(mLoadedDetail.messages)
            : undefined;
        const tInitialTurnCount = mLoadedDetail?.totalTurns;

        return (
            <div className="h-[calc(100vh-4rem)]">
                <ChatInterface
                    sessionId={mSessionId}
                    subject={mSelectedSubject}
                    topic={mTopicInput}
                    isGuest={tIsGuest}
                    isDemo={tIsDemo}
                    initialMessages={tInitialMessages}
                    initialAnalysis={tInitialAnalysis}
                    initialStage={tInitialStage}
                    initialTurnCount={tInitialTurnCount}
                />
            </div>
        );
    }

    // --- Pre-session: subject + topic selection ---
    return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-gray-50 to-indigo-50/30 p-4">
            <Card className="w-full max-w-lg border-indigo-100 shadow-lg shadow-indigo-100/30">
                <CardHeader className="text-center pb-4 relative">
                    {/* Tutorial replay button (top-right of card header) */}
                    <div className="absolute right-2 top-2">
                        <TutorialButton tutorialId="chat" />
                    </div>
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
                        <div className="grid grid-cols-3 gap-3" data-tutorial-id="chat-subject-selector">
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
                            data-tutorial-id="chat-topic-input"
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
                        data-tutorial-id="chat-start-button"
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


// --- Suspense Fallback ---

/**
 * Lightweight skeleton shown while ChatPageInner's useSearchParams
 * resolves during SSR/streaming. Matches the calm aesthetic of the
 * full chat layout without loading any dynamic data.
 */
function ChatPageSkeleton()
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
 * 컴포넌트는 반드시 Suspense 경계로 감싸야 한다.
 * 그렇지 않으면 빌드 시 CSR 바인딩 오류가 발생할 수 있다.
 */
export default function StudentChatPage()
{
    return (
        <Suspense fallback={<ChatPageSkeleton />}>
            <ChatPageInner />
        </Suspense>
    );
}
