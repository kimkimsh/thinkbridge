"use client";

/**
 * Global error boundary for the application.
 * Catches unhandled errors and displays a user-friendly error page
 * with a retry button to attempt recovery.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";


// --- Constants ---

const PAGE_TITLE = "문제가 발생했습니다";
const PAGE_DESCRIPTION = "예기치 않은 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침해 주세요.";
const RETRY_BUTTON_LABEL = "다시 시도";
const HOME_BUTTON_LABEL = "홈으로 돌아가기";


// --- Component ---

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
})
{
    // 개발 환경에서 에러 로깅
    useEffect(() =>
    {
        console.error("Global error boundary caught:", error);
    }, [error]);

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
            <div className="flex flex-col items-center gap-4 text-center">
                {/* 에러 아이콘 */}
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>

                {/* 제목 및 설명 */}
                <h2 className="text-xl font-bold text-gray-900">
                    {PAGE_TITLE}
                </h2>
                <p className="max-w-md text-sm text-gray-600">
                    {PAGE_DESCRIPTION}
                </p>

                {/* 에러 메시지 (개발 환경용) */}
                {error.message && (
                    <p className="max-w-md rounded-lg bg-gray-100 px-4 py-2 text-xs text-gray-500">
                        {error.message}
                    </p>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-3">
                    <Button
                        onClick={reset}
                        className="gap-2"
                    >
                        <RotateCcw className="h-4 w-4" />
                        {RETRY_BUTTON_LABEL}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = "/"}
                    >
                        {HOME_BUTTON_LABEL}
                    </Button>
                </div>
            </div>
        </div>
    );
}
