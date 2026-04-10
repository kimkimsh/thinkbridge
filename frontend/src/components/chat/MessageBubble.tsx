"use client";

/**
 * Chat message bubble component.
 * Renders user messages right-aligned with indigo gradient background,
 * and AI assistant messages left-aligned with white background and left indigo border.
 * Includes avatar icons and supports streaming cursor animation.
 */

import { User, Sparkles } from "lucide-react";


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
        <div className={`flex w-full gap-2.5 ${tIsUser ? "justify-end" : "justify-start"}`}>
            {/* AI avatar (left side) */}
            {!tIsUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                    <Sparkles className="h-4 w-4 text-white" />
                </div>
            )}

            <div
                className={`
                    relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                    sm:max-w-[72%] md:max-w-[68%]
                    ${tIsUser
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md"
                        : "border-l-[3px] border-l-indigo-400 bg-white text-gray-800 rounded-bl-md border border-gray-100"
                    }
                `}
            >
                {/* Role label */}
                <div
                    className={`
                        mb-1.5 text-[10px] font-semibold uppercase tracking-wider
                        ${tIsUser ? "text-indigo-200" : "text-indigo-500"}
                    `}
                >
                    {tIsUser ? "나" : "AI 튜터"}
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

            {/* User avatar (right side) */}
            {tIsUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
                    <User className="h-4 w-4 text-white" />
                </div>
            )}
        </div>
    );
}
