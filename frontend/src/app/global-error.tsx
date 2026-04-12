"use client";

/**
 * Root-level global error boundary.
 * Handles failures that occur inside the root layout itself (before
 * the normal error.tsx boundary can render), which requires wrapping
 * the fallback UI in <html><body> since the layout chain has failed.
 *
 * Segment-level errors continue to be handled by app/error.tsx.
 */

import { useEffect } from "react";


// --- Constants ---

const HTML_LANG = "ko";
const ERROR_HEADING = "심각한 오류가 발생했습니다";
const ERROR_DESCRIPTION = "페이지를 새로고침하거나 홈으로 돌아가주세요.";
const RESET_BUTTON_LABEL = "다시 시도";
const HOME_BUTTON_LABEL = "홈으로";
const HOME_HREF = "/";
const LOG_PREFIX = "Global error (root layout):";


// --- Component ---

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
})
{
    // 루트 레이아웃 단계에서 발생한 치명적 오류 로깅
    useEffect(() =>
    {
        console.error(LOG_PREFIX, error);
    }, [error]);

    return (
        <html lang={HTML_LANG}>
            <body>
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            {ERROR_HEADING}
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {ERROR_DESCRIPTION}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={reset}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                            >
                                {RESET_BUTTON_LABEL}
                            </button>
                            <a
                                href={HOME_HREF}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium"
                            >
                                {HOME_BUTTON_LABEL}
                            </a>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
