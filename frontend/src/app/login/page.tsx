"use client";

/**
 * ThinkBridge login page.
 * Email + password form with brand context, tagline, and links to register and guest trial.
 * Split layout with left brand panel (hidden on mobile) and right login form.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, ArrowRight, ArrowLeft, Sparkles, MessageCircle, BarChart3, GraduationCap } from "lucide-react";


// --- Constants ---

const ERROR_EMPTY_FIELDS = "이메일과 비밀번호를 입력해주세요.";

/** 게스트 체험 로그인 실패 시 기본 표시 메시지 */
const GUEST_LOGIN_FALLBACK_ERROR = "게스트 체험 시작에 실패했습니다. 잠시 후 다시 시도해주세요.";

/** 처음 안내 화면(랜딩)으로 돌아가는 내비게이션 라벨과 경로 */
const BACK_TO_HOME_LABEL = "처음 화면으로";
const HOME_PATH = "/";

/** Feature highlights for the brand panel */
const BRAND_FEATURES = [
    {
        icon: MessageCircle,
        title: "소크라테스식 대화",
        description: "AI가 답 대신 질문으로 사고를 이끕니다",
    },
    {
        icon: BarChart3,
        title: "6차원 사고력 분석",
        description: "블룸의 인지적 영역에 따른 실시간 분석",
    },
    {
        icon: GraduationCap,
        title: "맞춤형 학습 리포트",
        description: "대화 후 상세한 사고 과정 리포트 제공",
    },
];


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
        setError("");
        try
        {
            await loginAsGuest();
        }
        catch (tError)
        {
            // 기존에는 catch가 비어 실패 시 사용자는 버튼만 복구되고 원인을 알 수 없었음.
            // 폼 에러 배너를 재사용하여 실패 원인을 표면화.
            const tMessage = tError instanceof Error ? tError.message : GUEST_LOGIN_FALLBACK_ERROR;
            setError(tMessage);
            console.error("Guest login failed", tError);
            setIsGuestLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen">
            {/* Left brand panel (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-12 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white" />
                    <div className="absolute -right-16 top-1/3 h-56 w-56 rounded-full bg-white" />
                    <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-white" />
                </div>

                <div className="relative z-10 max-w-md text-center">
                    {/* Logo */}
                    <div className="mb-6 flex items-center justify-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                            <Brain className="h-8 w-8 text-white" />
                        </div>
                        <span className="text-3xl font-bold text-white">ThinkBridge</span>
                    </div>

                    {/* Tagline */}
                    <h2 className="mb-3 text-xl font-semibold text-white/90">
                        AI가 답을 주는 시대,
                    </h2>
                    <p className="mb-10 text-2xl font-bold text-white">
                        생각하는 법을 가르치는 AI
                    </p>

                    {/* Feature highlights */}
                    <div className="space-y-4 text-left">
                        {BRAND_FEATURES.map((feature, index) =>
                        {
                            const FeatureIcon = feature.icon;
                            return (
                                <div key={index} className="flex items-start gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                                        <FeatureIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{feature.title}</p>
                                        <p className="text-xs text-white/70">{feature.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right login form */}
            <div className="relative flex flex-1 items-center justify-center bg-gray-50 px-4">
                {/* Back to landing link (top-left, visible on all breakpoints) */}
                <Link
                    href={HOME_PATH}
                    className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 lg:left-6 lg:top-6"
                    aria-label={BACK_TO_HOME_LABEL}
                >
                    <ArrowLeft className="h-4 w-4" />
                    {BACK_TO_HOME_LABEL}
                </Link>

                <div className="w-full max-w-md">
                    {/* Mobile logo (hidden on desktop) */}
                    <div className="mb-8 text-center lg:hidden">
                        <Link href={HOME_PATH} className="inline-flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                                <Brain className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold text-gray-900">ThinkBridge</span>
                        </Link>
                        <p className="mt-2 text-sm text-gray-500">
                            생각하는 법을 가르치는 AI
                        </p>
                    </div>

                    <Card className="border-gray-200/80 shadow-lg shadow-gray-200/50">
                        <CardHeader className="text-center">
                            <CardTitle className="text-xl font-bold text-gray-800">로그인</CardTitle>
                            <CardDescription>
                                이메일과 비밀번호로 로그인하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Error message */}
                                {mError && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
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
                                        className="border-gray-200 focus-visible:border-indigo-300 focus-visible:ring-indigo-200"
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
                                        className="border-gray-200 focus-visible:border-indigo-300 focus-visible:ring-indigo-200"
                                    />
                                </div>

                                {/* Submit button */}
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-200/50"
                                    disabled={mIsLoading}
                                >
                                    {mIsLoading ? "로그인 중..." : "로그인"}
                                </Button>
                            </form>

                            {/* Divider */}
                            <div className="my-5 flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-200" />
                                <span className="text-xs text-gray-400">또는</span>
                                <div className="h-px flex-1 bg-gray-200" />
                            </div>

                            {/* Guest trial button */}
                            <Button
                                variant="outline"
                                className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                                onClick={handleGuestTrial}
                                disabled={mIsGuestLoading}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                {mIsGuestLoading ? "준비 중..." : "회원가입 없이 체험하기"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>

                            {/* Register link */}
                            <p className="mt-5 text-center text-sm text-gray-500">
                                계정이 없으신가요?{" "}
                                <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                                    회원가입
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
