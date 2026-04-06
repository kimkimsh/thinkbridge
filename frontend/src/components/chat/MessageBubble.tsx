"use client";

/**
 * Chat message bubble component.
 * Renders user messages right-aligned with primary background,
 * and AI assistant messages left-aligned with muted background.
 * Supports streaming cursor animation for in-progress AI responses.
 */


// --- Constants ---

/** Blinking cursor character shown during streaming */
const STREAMING_CURSOR = "\u2588";


// --- Props ---

interface MessageBubbleProps
{
    message: {
        role: "user" | "assistant";
        content: string;
    };
    isStreaming?: boolean;
}


// --- Component ---

export function MessageBubble({ message, isStreaming }: MessageBubbleProps)
{
    const tIsUser = message.role === "user";

    return (
        <div className={`flex w-full ${tIsUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`
                    relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    sm:max-w-[75%] md:max-w-[70%]
                    ${tIsUser
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200"
                    }
                `}
            >
                {/* Role label */}
                <div
                    className={`
                        mb-1 text-[10px] font-semibold uppercase tracking-wider
                        ${tIsUser ? "text-blue-200" : "text-gray-400"}
                    `}
                >
                    {tIsUser ? "You" : "ThinkBridge"}
                </div>

                {/* Message content with streaming cursor */}
                <div className="whitespace-pre-wrap break-words">
                    {message.content}
                    {isStreaming && (
                        <span className="animate-pulse ml-0.5 text-current opacity-80">
                            {STREAMING_CURSOR}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
