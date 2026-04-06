"use client";

/**
 * ThinkBridge login page.
 * Email + password form with links to register and guest trial.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, ArrowRight } from "lucide-react";


// --- Constants ---

const ERROR_EMPTY_FIELDS = "이메일과 비밀번호를 입력해주세요.";


// --- Component ---

export default function LoginPage()
{
    const { login, loginAsGuest } = useAuth();

    const [mEmail, setEmail] = useState("");
    const [mPassword, setPassword] = useState("");
    const [mError, setError] = useState("");
    const [mIsLoading, setIsLoading] = useState(false);
    const [mIsGuestLoading, setIsGuestLoading] = useState(false);

    /**
     * 로그인 폼 제출 처리
     */
    async function handleSubmit(event: FormEvent)
    {
        event.preventDefault();
        setError("");

        if (!mEmail.trim() || !mPassword.trim())
        {
            setError(ERROR_EMPTY_FIELDS);
            return;
        }

        setIsLoading(true);
        try
        {
            await login(mEmail, mPassword);
            // login이 내부적으로 리다이렉트 처리함
        }
        catch (error)
        {
            const tMessage = error instanceof Error ? error.message : "로그인에 실패했습니다.";
            setError(tMessage);
            setIsLoading(false);
        }
    }

    /**
     * 게스트 체험 모드 진입
     */
    async function handleGuestTrial()
    {
        setIsGuestLoading(true);
        try
        {
            await loginAsGuest();
        }
        catch
        {
            setIsGuestLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <Brain className="h-8 w-8 text-blue-600" />
                        <span className="text-2xl font-bold text-gray-900">ThinkBridge</span>
                    </Link>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">로그인</CardTitle>
                        <CardDescription>
                            이메일과 비밀번호로 로그인하세요
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Error message */}
                            {mError && (
                                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                                    {mError}
                                </div>
                            )}

                            {/* Email field */}
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    이메일
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={mEmail}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    disabled={mIsLoading}
                                />
                            </div>

                            {/* Password field */}
                            <div className="space-y-1.5">
                                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    비밀번호
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="비밀번호 입력"
                                    value={mPassword}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    disabled={mIsLoading}
                                />
                            </div>

                            {/* Submit button */}
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={mIsLoading}
                            >
                                {mIsLoading ? "로그인 중..." : "로그인"}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="my-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-gray-200" />
                            <span className="text-xs text-gray-400">또는</span>
                            <div className="h-px flex-1 bg-gray-200" />
                        </div>

                        {/* Guest trial button */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleGuestTrial}
                            disabled={mIsGuestLoading}
                        >
                            {mIsGuestLoading ? "준비 중..." : "회원가입 없이 체험하기"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>

                        {/* Register link */}
                        <p className="mt-4 text-center text-sm text-gray-500">
                            계정이 없으신가요?{" "}
                            <Link href="/register" className="font-medium text-blue-600 hover:underline">
                                회원가입
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
