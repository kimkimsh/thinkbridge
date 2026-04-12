"use client";

/**
 * Core chat interface component with SSE streaming.
 * Handles message sending, real-time streaming display,
 * hint requests, session ending, and guest turn limits.
 * This is the MOST CRITICAL component for demo quality.
 */

import {
    useState,
    useRef,
    useEffect,
    useCallback,
    type KeyboardEvent,
    type ChangeEvent,
    type MutableRefObject,
} from "react";
import { useRouter } from "next/navigation";
import { Send, Lightbulb, Square, FileText, Brain, Sparkles, MessageCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ProgressBar } from "@/components/chat/ProgressBar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ThoughtPanel } from "@/components/chat/ThoughtPanel";
import { streamMessages, endSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEFAULT_SOCRATIC_STAGE, GUEST_MAX_TURNS, SUBJECT_LABELS, clampSocraticStage } from "@/lib/constants";
import type { ThoughtAnalysis } from "@/types";


// --- Constants ---

/** Prefix added to hint request messages */
const HINT_REQUEST_PREFIX = "[힌트 요청] ";

/** Maximum stage value (for display/report button logic) */
const REPORT_ELIGIBLE_STAGE = 5;

/** Minimum textarea rows */
const TEXTAREA_MIN_ROWS = 1;

/** Maximum textarea rows for auto-resize */
const TEXTAREA_MAX_ROWS = 4;

/** Scroll delay to ensure DOM update before scrolling */
const SCROLL_DELAY_MS = 50;

/** Number of characters to reveal per animation frame for smooth typing effect */
const CHARS_PER_FRAME = 2;

/** Animation frame interval in milliseconds (~30ms for natural typing speed) */
const ANIMATION_INTERVAL_MS = 30;

/**
 * z-index tier for the full-screen session-end overlay.
 * Must render above Sidebar Sheet (z-50) and ThoughtPanel floating button (z-40)
 * so the user cannot interact with sidebar/panel while report generation is in-flight.
 */
const END_SESSION_OVERLAY_Z_INDEX = "z-[70]";

/** Primary overlay message shown while report generation is running server-side */
const END_SESSION_OVERLAY_PRIMARY_TEXT = "사고 과정을 분석하고 있어요";

/** Secondary hint — gives users a realistic upper-bound expectation for wait time */
const END_SESSION_OVERLAY_SECONDARY_TEXT = "리포트 생성까지 최대 10초가 걸릴 수 있습니다";

/** Welcome tips for Socratic tutoring */
const WELCOME_TIPS = [
    { icon: MessageCircle, text: "질문을 통해 스스로 답을 찾아가는 과정을 경험하세요" },
    { icon: Lightbulb, text: "막히면 '힌트' 버튼을 눌러 도움을 받을 수 있어요" },
    { icon: BookOpen, text: "대화가 끝나면 사고 과정 리포트를 확인할 수 있어요" },
];


// --- Message Type ---

/**
 * 채팅 UI에서 렌더링할 메시지 단위.
 * 세션 재개 시 외부(page.tsx)에서 DB 메시지를 변환하여 주입하므로 export 한다.
 */
export interface ChatMessage
{
    role: "user" | "assistant";
    content: string;
}


// --- Props ---

interface ChatInterfaceProps
{
    sessionId: number;
    subject: string;
    topic?: string;
    isGuest?: boolean;
    isDemo?: boolean;
    /**
     * 세션 재개 시 이전 메시지 기록 (선택).
     * 제공되면 Welcome 카드 대신 기존 대화가 복원된다.
     */
    initialMessages?: ChatMessage[];
    /**
     * 세션 재개 시 마지막 assistant 턴의 분석 스냅샷 (선택).
     */
    initialAnalysis?: ThoughtAnalysis | null;
    /**
     * 세션 재개 시 복원할 소크라테스 단계 (선택, 기본 1).
     */
    initialStage?: number;
    /**
     * 세션 재개 시 복원할 누적 턴 카운트 (선택, 기본 0).
     * Guest 턴 제한 UI와 동기화된다.
     */
    initialTurnCount?: number;
}


// --- Component ---

export function ChatInterface({
    sessionId,
    subject,
    topic,
    isGuest,
    isDemo,
    initialMessages,
    initialAnalysis,
    initialStage,
    initialTurnCount,
}: ChatInterfaceProps)
{
    // --- State ---
    // 세션 재개 시 props로 초기값을 seed 한다. 제공되지 않으면 빈 상태로 새 대화 시작.
    const [mMessages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
    const [mCurrentAnalysis, setCurrentAnalysis] = useState<ThoughtAnalysis | null>(initialAnalysis ?? null);
    const [mCurrentStage, setCurrentStage] = useState<number>(initialStage ?? DEFAULT_SOCRATIC_STAGE);
    const [mIsStreaming, setIsStreaming] = useState(false);
    const [mStreamingText, setStreamingText] = useState("");
    const [mInputValue, setInputValue] = useState("");
    const [mTurnCount, setTurnCount] = useState<number>(initialTurnCount ?? 0);
    const [mErrorMessage, setErrorMessage] = useState<string | null>(null);
    const [mIsEnding, setIsEnding] = useState(false);
    const [mIsSessionEnded, setIsSessionEnded] = useState(false);
    const [mIsInputFocused, setIsInputFocused] = useState(false);

    // --- Refs ---
    const mScrollRef = useRef<HTMLDivElement>(null);
    const mTextareaRef = useRef<HTMLTextAreaElement>(null);

    /**
     * Ref to accumulate the FULL streaming text (all tokens received so far).
     * This ref holds the complete text for saving to messages when done.
     */
    const mStreamingTextRef: MutableRefObject<string> = useRef("");

    /**
     * Buffer for incoming tokens not yet displayed.
     * Characters are drained from this buffer by the animation loop
     * to produce a smooth typing effect.
     */
    const mTokenBuffer: MutableRefObject<string> = useRef("");

    /**
     * Text currently rendered on screen (subset of mStreamingTextRef).
     * The animation loop gradually appends characters from mTokenBuffer.
     */
    const mDisplayedText: MutableRefObject<string> = useRef("");

    /**
     * Handle for the typing animation interval.
     * Stored so we can clear it when streaming ends or component unmounts.
     */
    const mAnimationTimer: MutableRefObject<ReturnType<typeof setInterval> | null> = useRef(null);

    /**
     * AbortController handle for the current SSE stream.
     * - 새 메시지 전송 시 이전 스트림 중단
     * - 컴포넌트 언마운트 시 스트림 중단 (리소스 누수 방지)
     */
    const mAbortRef: MutableRefObject<AbortController | null> = useRef(null);

    // --- Hooks ---
    const { token } = useAuth();
    const router = useRouter();

    /**
     * Starts the typing animation loop if not already running.
     * Drains characters from mTokenBuffer into mDisplayedText at a natural pace.
     */
    const startAnimationLoop = useCallback(() =>
    {
        if (mAnimationTimer.current !== null)
        {
            return;
        }

        mAnimationTimer.current = setInterval(() =>
        {
            if (mTokenBuffer.current.length > 0)
            {
                const tCharsToReveal = Math.min(CHARS_PER_FRAME, mTokenBuffer.current.length);
                mDisplayedText.current += mTokenBuffer.current.substring(0, tCharsToReveal);
                mTokenBuffer.current = mTokenBuffer.current.substring(tCharsToReveal);
                setStreamingText(mDisplayedText.current);
            }
        }, ANIMATION_INTERVAL_MS);
    }, []);

    /**
     * Stops the typing animation loop and flushes any remaining buffer immediately.
     */
    const stopAnimationLoop = useCallback(() =>
    {
        if (mAnimationTimer.current !== null)
        {
            clearInterval(mAnimationTimer.current);
            mAnimationTimer.current = null;
        }

        // Flush any remaining buffered text instantly
        if (mTokenBuffer.current.length > 0)
        {
            mDisplayedText.current += mTokenBuffer.current;
            mTokenBuffer.current = "";
            setStreamingText(mDisplayedText.current);
        }
    }, []);

    // Clean up animation timer on unmount
    useEffect(() =>
    {
        return () =>
        {
            if (mAnimationTimer.current !== null)
            {
                clearInterval(mAnimationTimer.current);
                mAnimationTimer.current = null;
            }
        };
    }, []);

    // Clean up in-flight SSE stream on unmount to prevent resource leak.
    // 페이지 이동/컴포넌트 언마운트 시 진행 중인 fetch를 취소하여 네트워크 리소스 확보.
    useEffect(() =>
    {
        return () =>
        {
            mAbortRef.current?.abort();
        };
    }, []);

    // --- Derived State ---
    const tSubjectLabel = SUBJECT_LABELS[subject] || subject;
    const tIsGuestLimitReached = isGuest === true && mTurnCount >= GUEST_MAX_TURNS;
    const tCanSend = !mIsStreaming && !mIsEnding && mInputValue.trim().length > 0 && !tIsGuestLimitReached && !mIsSessionEnded;
    const tShowReportButton = mCurrentStage >= REPORT_ELIGIBLE_STAGE || mIsSessionEnded;

    /**
     * Scrolls the message area to the bottom.
     */
    const scrollToBottom = useCallback(() =>
    {
        setTimeout(() =>
        {
            if (mScrollRef.current)
            {
                mScrollRef.current.scrollTop = mScrollRef.current.scrollHeight;
            }
        }, SCROLL_DELAY_MS);
    }, []);

    // Auto-scroll when messages change or streaming text updates
    useEffect(() =>
    {
        scrollToBottom();
    }, [mMessages, mStreamingText, scrollToBottom]);

    /**
     * Auto-resize textarea based on content.
     */
    const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) =>
    {
        setInputValue(event.target.value);

        // Auto-resize
        const tTextarea = event.target;
        tTextarea.style.height = "auto";
        const tLineHeight = parseInt(getComputedStyle(tTextarea).lineHeight) || 20;
        const tMaxHeight = tLineHeight * TEXTAREA_MAX_ROWS;
        tTextarea.style.height = `${Math.min(tTextarea.scrollHeight, tMaxHeight)}px`;
    }, []);

    /**
     * Core send message handler with SSE streaming.
     */
    const handleSend = useCallback(async (content: string) =>
    {
        if (!token || mIsStreaming || content.trim().length === 0)
        {
            return;
        }

        setErrorMessage(null);

        // 이전 진행 중이던 스트림이 있다면 abort 후 새 controller 생성.
        // 일반적으로 mIsStreaming 가드 때문에 도달하지 않지만, race 방어 차원에서 정리.
        mAbortRef.current?.abort();
        mAbortRef.current = new AbortController();
        const tSignal = mAbortRef.current.signal;

        // Add user message to conversation
        const tUserMessage: ChatMessage = { role: "user", content: content.trim() };
        setMessages((prev) => [...prev, tUserMessage]);
        setInputValue("");
        setIsStreaming(true);
        setStreamingText("");
        mStreamingTextRef.current = "";
        mTokenBuffer.current = "";
        mDisplayedText.current = "";

        // Reset textarea height
        if (mTextareaRef.current)
        {
            mTextareaRef.current.style.height = "auto";
        }

        try
        {
            // Stream AI response via SSE
            for await (const tEvent of streamMessages(sessionId, content.trim(), token, tSignal))
            {
                if (tEvent.type === "token")
                {
                    // Accumulate full text in ref (for saving to messages later)
                    mStreamingTextRef.current += tEvent.data;
                    // Queue the chunk for gradual typing animation
                    mTokenBuffer.current += tEvent.data;
                    startAnimationLoop();
                }
                else if (tEvent.type === "analysis")
                {
                    // Update analysis panel and stage
                    setCurrentAnalysis(tEvent.data);
                    // 백엔드 응답이 예상 범위([1,5])를 벗어나는 경우를 대비해 방어적으로 클램프
                    setCurrentStage(clampSocraticStage(tEvent.data.socraticStage));
                }
                else if (tEvent.type === "done")
                {
                    // Stop animation and flush any remaining buffered text instantly
                    stopAnimationLoop();

                    // Finalize: read accumulated text from ref and add to messages
                    const tAccumulatedText = mStreamingTextRef.current;

                    if (tAccumulatedText.length > 0)
                    {
                        const tAssistantMessage: ChatMessage = {
                            role: "assistant",
                            content: tAccumulatedText,
                        };
                        setMessages((prevMessages) => [...prevMessages, tAssistantMessage]);
                    }

                    // Clear streaming state
                    mStreamingTextRef.current = "";
                    mTokenBuffer.current = "";
                    mDisplayedText.current = "";
                    setStreamingText("");
                    setTurnCount((prev) => prev + 1);
                }
                else if (tEvent.type === "error")
                {
                    setErrorMessage(tEvent.data.message);
                }
            }
        }
        catch (error)
        {
            // 의도적 abort (언마운트 / 새 send) → UI에 에러로 표시하지 않고 조용히 종료.
            if (error instanceof Error && error.name === "AbortError")
            {
                stopAnimationLoop();
                mStreamingTextRef.current = "";
                mTokenBuffer.current = "";
                mDisplayedText.current = "";
                setStreamingText("");
                return;
            }

            // Stop animation on error
            stopAnimationLoop();

            // Finalize any partial streaming text on error
            const tPartialText = mStreamingTextRef.current;

            if (tPartialText.length > 0)
            {
                const tPartialMessage: ChatMessage = {
                    role: "assistant",
                    content: tPartialText,
                };
                setMessages((prevMessages) => [...prevMessages, tPartialMessage]);
            }

            // Clear streaming state
            mStreamingTextRef.current = "";
            mTokenBuffer.current = "";
            mDisplayedText.current = "";
            setStreamingText("");

            const tErrorMsg = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
            setErrorMessage(tErrorMsg);
        }
        finally
        {
            setIsStreaming(false);
            // Focus textarea for next input
            setTimeout(() =>
            {
                mTextareaRef.current?.focus();
            }, SCROLL_DELAY_MS);
        }
    }, [token, mIsStreaming, sessionId, startAnimationLoop, stopAnimationLoop]);

    /**
     * Handles Enter key to send (Shift+Enter for newline).
     */
    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) =>
    {
        if (event.key === "Enter" && !event.shiftKey)
        {
            event.preventDefault();
            if (tCanSend)
            {
                handleSend(mInputValue);
            }
        }
    }, [tCanSend, handleSend, mInputValue]);

    /**
     * Sends a hint request using the last user message as context.
     */
    const handleHintRequest = useCallback(() =>
    {
        // Find the last user message for context
        let tLastUserContent = "";
        for (let i = mMessages.length - 1; i >= 0; i--)
        {
            if (mMessages[i].role === "user")
            {
                tLastUserContent = mMessages[i].content;
                break;
            }
        }

        const tHintMessage = HINT_REQUEST_PREFIX + (tLastUserContent || "힌트를 주세요");
        handleSend(tHintMessage);
    }, [mMessages, handleSend]);

    /**
     * Ends the current session and navigates to the report page.
     */
    const handleEndSession = useCallback(async () =>
    {
        if (!token || mIsEnding)
        {
            return;
        }

        setIsEnding(true);

        try
        {
            await endSession(sessionId, token);
            setIsSessionEnded(true);
            router.push(`/student/report/${sessionId}`);
        }
        catch (error)
        {
            const tMsg = error instanceof Error ? error.message : "세션 종료 중 오류가 발생했습니다.";
            setErrorMessage(tMsg);
            setIsEnding(false);
        }
    }, [token, mIsEnding, sessionId, router]);

    /**
     * Navigates to the report page.
     */
    const handleViewReport = useCallback(() =>
    {
        router.push(`/student/report/${sessionId}`);
    }, [router, sessionId]);

    return (
        <div className="flex h-full flex-col bg-gray-50/50">
            {/* Progress bar */}
            <div
                data-tutorial-id="chat-progress-bar"
                className="shrink-0 border-b border-indigo-100/50 bg-white p-3"
            >
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-xs text-indigo-700">
                            {tSubjectLabel}
                        </Badge>
                        {topic && (
                            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                                {topic}
                            </span>
                        )}
                        {isGuest && (
                            <Badge
                                variant="secondary"
                                className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                            >
                                체험 중 ({mTurnCount}/{GUEST_MAX_TURNS})
                            </Badge>
                        )}
                    </div>
                </div>
                <ProgressBar currentStage={mCurrentStage} />
            </div>

            {/* Main content area: messages + analysis panel */}
            <div className="flex min-h-0 flex-1">
                {/* Message area */}
                <div className="flex flex-1 flex-col">
                    <div
                        ref={mScrollRef}
                        className="flex-1 overflow-y-auto p-4"
                    >
                        <div className="mx-auto max-w-2xl space-y-4">
                            {/* Welcome message (숨김: 세션 재개 진입인 경우 initialMessages가 주어지므로 표시하지 않는다) */}
                            {mMessages.length === 0 && !mIsStreaming && !initialMessages && (
                                <div className="flex items-center justify-center py-8 sm:py-12">
                                    <div className="w-full max-w-sm rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                                        {/* Header with icon */}
                                        <div className="mb-4 flex flex-col items-center text-center">
                                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200/50">
                                                <Sparkles className="h-7 w-7 text-white" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800">
                                                안녕하세요!
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                오늘은 어떤 주제로 함께 생각해볼까요?
                                            </p>
                                        </div>

                                        {/* Tips */}
                                        <div className="space-y-2.5">
                                            {WELCOME_TIPS.map((tip, index) =>
                                            {
                                                const TipIcon = tip.icon;
                                                return (
                                                    <div key={index} className="flex items-start gap-2.5 rounded-lg bg-indigo-50/60 px-3 py-2.5">
                                                        <TipIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                                                        <span className="text-xs leading-relaxed text-gray-600">
                                                            {tip.text}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rendered messages */}
                            {mMessages.map((msg, index) => (
                                <MessageBubble
                                    key={index}
                                    message={msg}
                                />
                            ))}

                            {/* Streaming message */}
                            {mIsStreaming && mStreamingText.length > 0 && (
                                <MessageBubble
                                    message={{ role: "assistant", content: mStreamingText }}
                                    isStreaming={true}
                                />
                            )}

                            {/* Typing indicator (before any text arrives) */}
                            {mIsStreaming && mStreamingText.length === 0 && (
                                <div className="flex items-center gap-2.5 justify-start">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "0ms" }} />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "150ms" }} />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error message with retry */}
                            {mErrorMessage && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                    <p className="text-sm text-red-700">{mErrorMessage}</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 border-red-300 text-red-600 hover:bg-red-100"
                                        onClick={() =>
                                        {
                                            setErrorMessage(null);
                                            const tLastUserMsg = mMessages.filter(m => m.role === "user").pop();
                                            if (tLastUserMsg)
                                            {
                                                handleSend(tLastUserMsg.content);
                                            }
                                        }}
                                        disabled={mIsStreaming}
                                    >
                                        다시 시도
                                    </Button>
                                </div>
                            )}

                            {/* Guest limit reached */}
                            {tIsGuestLimitReached && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
                                    <p className="mb-2 text-sm font-medium text-amber-800">
                                        체험 {GUEST_MAX_TURNS}턴이 모두 사용되었습니다.
                                    </p>
                                    <p className="mb-3 text-xs text-amber-600">
                                        계속하려면 회원가입이 필요합니다.
                                    </p>
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                        onClick={() => router.push("/register")}
                                    >
                                        회원가입하기
                                    </Button>
                                </div>
                            )}

                            {/* Stage 5 report button */}
                            {tShowReportButton && !tIsGuestLimitReached && mMessages.length > 0 && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                                    <p className="mb-2 text-sm font-medium text-emerald-800">
                                        대화가 완료되었습니다! 사고 과정 리포트를 확인해 보세요.
                                    </p>
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        onClick={handleViewReport}
                                    >
                                        <FileText className="mr-1.5 h-4 w-4" />
                                        리포트 확인
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="shrink-0 border-t border-gray-200/80 bg-white p-3 sm:p-4">
                        <div className="mx-auto max-w-2xl">
                            <div
                                className={`
                                    flex items-end gap-2 rounded-xl border bg-white p-2 transition-all duration-200
                                    ${mIsInputFocused
                                        ? "border-indigo-300 shadow-md shadow-indigo-100/50 ring-1 ring-indigo-200"
                                        : "border-gray-200 shadow-sm"
                                    }
                                `}
                            >
                                <Textarea
                                    ref={mTextareaRef}
                                    value={mInputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                    placeholder={
                                        tIsGuestLimitReached
                                            ? "체험이 종료되었습니다"
                                            : mIsSessionEnded
                                                ? "세션이 종료되었습니다"
                                                : "질문을 입력하세요... (Shift+Enter: 줄바꿈)"
                                    }
                                    disabled={mIsStreaming || tIsGuestLimitReached || mIsSessionEnded}
                                    rows={TEXTAREA_MIN_ROWS}
                                    className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                                />

                                <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
                                    {/* Hint button */}
                                    <Button
                                        data-tutorial-id="chat-hint-button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleHintRequest}
                                        disabled={mIsStreaming || mMessages.length === 0 || tIsGuestLimitReached || mIsSessionEnded}
                                        className="gap-1 whitespace-nowrap text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                        title="힌트 더 받기"
                                    >
                                        <Lightbulb className="h-4 w-4" />
                                        <span className="hidden sm:inline text-xs">힌트</span>
                                    </Button>

                                    {/* Send button */}
                                    <Button
                                        size="sm"
                                        onClick={() => handleSend(mInputValue)}
                                        disabled={!tCanSend}
                                        className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>

                                    {/* End session button — outline variant with explicit active/hover/disabled states
                                        so 3-state discernibility is unambiguous (기존 ghost variant는 경계선이 약해
                                        활성/비활성 구분이 어려웠던 UX 이슈 대응). */}
                                    <Button
                                        data-tutorial-id="chat-end-button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEndSession}
                                        disabled={mIsStreaming || mIsEnding || mIsSessionEnded || mMessages.length === 0}
                                        className={`
                                            gap-1 whitespace-nowrap
                                            border-red-300 bg-white text-red-600
                                            hover:border-red-500 hover:bg-red-50 hover:text-red-700
                                            active:bg-red-100
                                            disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300
                                            transition-colors duration-150
                                        `}
                                        aria-label="대화 종료"
                                        title="대화 종료"
                                    >
                                        <Square className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline text-xs font-medium">종료</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analysis panel (desktop sidebar) */}
                <div
                    data-tutorial-id="chat-thought-panel"
                    className="hidden w-72 shrink-0 border-l border-indigo-100/50 bg-gradient-to-b from-gray-50 to-indigo-50/20 p-3 lg:block xl:w-80"
                >
                    <ThoughtPanel
                        analysis={mCurrentAnalysis}
                        isDemo={isDemo}
                    />
                </div>
            </div>

            {/* 세션 종료 진행 중 전체화면 오버레이.
                "종료" 클릭 직후 router.push 로 리포트 페이지가 그려지기까지 수 초 ~ 10+초 공백이 생기는데,
                기존에는 버튼만 disabled 되어 사용자가 "먹통인가?" 로 인식하던 UX 이슈 대응.
                Sidebar Sheet(z-50) + ThoughtPanel floating(z-40) 보다 상위인 z-[70]로 올려
                종료 중에는 사이드바/분석 패널 조작도 차단. */}
            {mIsEnding && (
                <div
                    className={`fixed inset-0 ${END_SESSION_OVERLAY_Z_INDEX} flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm animate-in fade-in duration-200`}
                    role="status"
                    aria-live="polite"
                >
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                    <p className="mt-4 text-sm font-semibold text-gray-800">
                        {END_SESSION_OVERLAY_PRIMARY_TEXT}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {END_SESSION_OVERLAY_SECONDARY_TEXT}
                    </p>
                </div>
            )}

            {/* Analysis panel (mobile floating button + Sheet drawer, visible only on small screens when analysis exists) */}
            {mCurrentAnalysis && (
                <div className="fixed bottom-20 right-4 z-40 lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                size="icon"
                                className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-300/40 hover:shadow-xl hover:shadow-indigo-300/60 transition-shadow"
                            >
                                <Brain className="h-5 w-5 text-white" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl px-4 pb-6 pt-4">
                            <SheetHeader className="mb-3">
                                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                    사고력 분석
                                </SheetTitle>
                            </SheetHeader>
                            <ThoughtPanel
                                analysis={mCurrentAnalysis}
                                isDemo={isDemo}
                            />
                        </SheetContent>
                    </Sheet>
                </div>
            )}
        </div>
    );
}
