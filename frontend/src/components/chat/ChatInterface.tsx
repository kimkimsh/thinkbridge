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
import { Send, Lightbulb, Square, FileText, Brain } from "lucide-react";
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
import { GUEST_MAX_TURNS, SUBJECT_LABELS } from "@/lib/constants";
import type { ThoughtAnalysis } from "@/types";


// --- Constants ---

/** Prefix added to hint request messages */
const HINT_REQUEST_PREFIX = "[힌트 요청] ";

/** Default Socratic stage at conversation start */
const DEFAULT_STAGE = 1;

/** Maximum stage value (for display/report button logic) */
const REPORT_ELIGIBLE_STAGE = 5;

/** Minimum textarea rows */
const TEXTAREA_MIN_ROWS = 1;

/** Maximum textarea rows for auto-resize */
const TEXTAREA_MAX_ROWS = 4;

/** Scroll delay to ensure DOM update before scrolling */
const SCROLL_DELAY_MS = 50;


// --- Props ---

interface ChatInterfaceProps
{
    sessionId: number;
    subject: string;
    isGuest?: boolean;
    isDemo?: boolean;
}


// --- Message Type ---

interface ChatMessage
{
    role: "user" | "assistant";
    content: string;
}


// --- Component ---

export function ChatInterface({ sessionId, subject, isGuest, isDemo }: ChatInterfaceProps)
{
    // --- State ---
    const [mMessages, setMessages] = useState<ChatMessage[]>([]);
    const [mCurrentAnalysis, setCurrentAnalysis] = useState<ThoughtAnalysis | null>(null);
    const [mCurrentStage, setCurrentStage] = useState(DEFAULT_STAGE);
    const [mIsStreaming, setIsStreaming] = useState(false);
    const [mStreamingText, setStreamingText] = useState("");
    const [mInputValue, setInputValue] = useState("");
    const [mTurnCount, setTurnCount] = useState(0);
    const [mErrorMessage, setErrorMessage] = useState<string | null>(null);
    const [mIsEnding, setIsEnding] = useState(false);
    const [mIsSessionEnded, setIsSessionEnded] = useState(false);

    // --- Refs ---
    const mScrollRef = useRef<HTMLDivElement>(null);
    const mTextareaRef = useRef<HTMLTextAreaElement>(null);

    /**
     * Ref to accumulate streaming text tokens.
     * Using a ref avoids the fragile pattern of calling setMessages
     * inside a setStreamingText state updater callback.
     */
    const mStreamingTextRef: MutableRefObject<string> = useRef("");

    // --- Hooks ---
    const { token } = useAuth();
    const router = useRouter();

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

        // Add user message to conversation
        const tUserMessage: ChatMessage = { role: "user", content: content.trim() };
        setMessages((prev) => [...prev, tUserMessage]);
        setInputValue("");
        setIsStreaming(true);
        setStreamingText("");
        mStreamingTextRef.current = "";

        // Reset textarea height
        if (mTextareaRef.current)
        {
            mTextareaRef.current.style.height = "auto";
        }

        try
        {
            // Stream AI response via SSE
            for await (const tEvent of streamMessages(sessionId, content.trim(), token))
            {
                if (tEvent.type === "token")
                {
                    // Accumulate token in ref and sync to display state
                    mStreamingTextRef.current += tEvent.data;
                    setStreamingText(mStreamingTextRef.current);
                }
                else if (tEvent.type === "analysis")
                {
                    // Update analysis panel and stage
                    setCurrentAnalysis(tEvent.data);
                    setCurrentStage(tEvent.data.socraticStage);
                }
                else if (tEvent.type === "done")
                {
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
    }, [token, mIsStreaming, sessionId]);

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
        <div className="flex h-full flex-col">
            {/* Progress bar */}
            <div className="shrink-0 border-b bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {tSubjectLabel}
                        </Badge>
                        {isGuest && (
                            <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-700 border-amber-300 text-xs"
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
                            {/* Welcome message */}
                            {mMessages.length === 0 && !mIsStreaming && (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="mb-3 text-4xl">
                                            {"🤔"}
                                        </div>
                                        <h3 className="mb-1 text-lg font-semibold text-gray-700">
                                            함께 생각해 봅시다
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            궁금한 점을 물어보세요. 답을 알려주는 대신,
                                            <br />
                                            스스로 답을 찾도록 도와드릴게요.
                                        </p>
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
                                <div className="flex justify-start">
                                    <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-gray-100 px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error message */}
                            {mErrorMessage && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {mErrorMessage}
                                </div>
                            )}

                            {/* Guest limit reached */}
                            {tIsGuestLimitReached && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-center">
                                    <p className="mb-2 text-sm font-medium text-amber-800">
                                        체험 {GUEST_MAX_TURNS}턴이 모두 사용되었습니다.
                                    </p>
                                    <p className="mb-3 text-xs text-amber-600">
                                        계속하려면 회원가입이 필요합니다.
                                    </p>
                                    <Button
                                        size="sm"
                                        onClick={() => router.push("/register")}
                                    >
                                        회원가입하기
                                    </Button>
                                </div>
                            )}

                            {/* Stage 5 report button */}
                            {tShowReportButton && !tIsGuestLimitReached && mMessages.length > 0 && (
                                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-center">
                                    <p className="mb-2 text-sm font-medium text-green-800">
                                        대화가 완료되었습니다! 사고 과정 리포트를 확인해 보세요.
                                    </p>
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
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
                    <div className="shrink-0 border-t bg-white p-3 sm:p-4">
                        <div className="mx-auto flex max-w-2xl items-end gap-2">
                            <Textarea
                                ref={mTextareaRef}
                                value={mInputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    tIsGuestLimitReached
                                        ? "체험이 종료되었습니다"
                                        : mIsSessionEnded
                                            ? "세션이 종료되었습니다"
                                            : "질문을 입력하세요... (Shift+Enter: 줄바꿈)"
                                }
                                disabled={mIsStreaming || tIsGuestLimitReached || mIsSessionEnded}
                                rows={TEXTAREA_MIN_ROWS}
                                className="min-h-[40px] max-h-[120px] resize-none"
                            />

                            {/* Hint button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleHintRequest}
                                disabled={mIsStreaming || mMessages.length === 0 || tIsGuestLimitReached || mIsSessionEnded}
                                className="shrink-0 gap-1 whitespace-nowrap"
                                title="힌트 더 받기"
                            >
                                <Lightbulb className="h-4 w-4" />
                                <span className="hidden sm:inline">힌트</span>
                            </Button>

                            {/* Send button */}
                            <Button
                                size="sm"
                                onClick={() => handleSend(mInputValue)}
                                disabled={!tCanSend}
                                className="shrink-0"
                            >
                                <Send className="h-4 w-4" />
                            </Button>

                            {/* End session button */}
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleEndSession}
                                disabled={mIsStreaming || mIsEnding || mIsSessionEnded || mMessages.length === 0}
                                className="shrink-0 gap-1 whitespace-nowrap"
                            >
                                <Square className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">종료</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Analysis panel (desktop sidebar) */}
                <div className="hidden w-72 shrink-0 border-l bg-gray-50 p-3 lg:block xl:w-80">
                    <ThoughtPanel
                        analysis={mCurrentAnalysis}
                        isDemo={isDemo}
                    />
                </div>
            </div>

            {/* Analysis panel (mobile floating button + Sheet drawer, visible only on small screens when analysis exists) */}
            {mCurrentAnalysis && (
                <div className="fixed bottom-20 right-4 z-40 lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                size="icon"
                                className="h-12 w-12 rounded-full bg-blue-600 shadow-lg hover:bg-blue-700"
                            >
                                <Brain className="h-5 w-5 text-white" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl px-4 pb-6 pt-4">
                            <SheetHeader className="mb-3">
                                <SheetTitle className="text-sm font-semibold">
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
