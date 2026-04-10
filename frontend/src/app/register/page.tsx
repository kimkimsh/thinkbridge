"use client";

/**
 * ThinkBridge registration page.
 * Name, email, password fields with student/instructor role selection.
 * Consistent styling with the login page.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, GraduationCap, Users, MessageCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";


// --- Constants ---

const ERROR_EMPTY_FIELDS = "모든 항목을 입력해주세요.";
const MIN_PASSWORD_LENGTH = 6;
const ERROR_PASSWORD_TOO_SHORT = `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;

interface RoleOption
{
    value: string;
    label: string;
    description: string;
    icon: React.ElementType;
    selectedBorder: string;
    selectedBg: string;
    selectedText: string;
    selectedIconBg: string;
}

const ROLE_OPTIONS: RoleOption[] = [
    {
        value: "student",
        label: "학생",
        description: "소크라테스 대화로 학습하기",
        icon: GraduationCap,
        selectedBorder: "border-indigo-500",
        selectedBg: "bg-indigo-50",
        selectedText: "text-indigo-700",
        selectedIconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    },
    {
        value: "instructor",
        label: "교강사",
        description: "학생 사고력 분석 대시보드",
        icon: Users,
        selectedBorder: "border-emerald-500",
        selectedBg: "bg-emerald-50",
        selectedText: "text-emerald-700",
        selectedIconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    },
];

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

export default function RegisterPage()
{
    const { register } = useAuth();

    const [mName, setName] = useState("");
    const [mEmail, setEmail] = useState("");
    const [mPassword, setPassword] = useState("");
    const [mRole, setRole] = useState("student");
    const [mError, setError] = useState("");
    const [mIsLoading, setIsLoading] = useState(false);

    /**
     * 회원가입 폼 제출 처리
     */
    async function handleSubmit(event: FormEvent)
    {
        event.preventDefault();
        setError("");

        if (!mName.trim() || !mEmail.trim() || !mPassword.trim())
        {
            setError(ERROR_EMPTY_FIELDS);
            return;
        }

        if (mPassword.length < MIN_PASSWORD_LENGTH)
        {
            setError(ERROR_PASSWORD_TOO_SHORT);
            return;
        }

        setIsLoading(true);
        try
        {
            await register(mEmail, mName, mPassword, mRole);
            // register가 내부적으로 리다이렉트 처리함
        }
        catch (error)
        {
            const tMessage = error instanceof Error ? error.message : "회원가입에 실패했습니다.";
            setError(tMessage);
            setIsLoading(false);
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

            {/* Right registration form */}
            <div className="flex flex-1 items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md">
                    {/* Mobile logo (hidden on desktop) */}
                    <div className="mb-8 text-center lg:hidden">
                        <Link href="/" className="inline-flex items-center gap-2">
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
                            <CardTitle className="text-xl font-bold text-gray-800">회원가입</CardTitle>
                            <CardDescription>
                                ThinkBridge에 가입하고 사고력을 키워보세요
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

                                {/* Name field */}
                                <div className="space-y-1.5">
                                    <label htmlFor="name" className="text-sm font-medium text-gray-700">
                                        이름
                                    </label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="이름 입력"
                                        value={mName}
                                        onChange={(e) => setName(e.target.value)}
                                        autoComplete="name"
                                        disabled={mIsLoading}
                                        className="border-gray-200 focus-visible:border-indigo-300 focus-visible:ring-indigo-200"
                                    />
                                </div>

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
                                        placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
                                        value={mPassword}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        disabled={mIsLoading}
                                        className="border-gray-200 focus-visible:border-indigo-300 focus-visible:ring-indigo-200"
                                    />
                                </div>

                                {/* Role selection */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700">
                                        역할 선택
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {ROLE_OPTIONS.map((tOption) =>
                                        {
                                            const IconComponent = tOption.icon;
                                            const tIsSelected = mRole === tOption.value;

                                            return (
                                                <button
                                                    key={tOption.value}
                                                    type="button"
                                                    onClick={() => setRole(tOption.value)}
                                                    disabled={mIsLoading}
                                                    className={cn(
                                                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                                                        tIsSelected
                                                            ? `${tOption.selectedBorder} ${tOption.selectedBg} ring-2 ring-offset-1 ${tOption.selectedBorder.replace("border-", "ring-").replace("500", "200")}`
                                                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                                                            tIsSelected ? tOption.selectedIconBg : "bg-gray-100",
                                                        )}
                                                    >
                                                        <IconComponent className={cn("h-5 w-5", tIsSelected ? "text-white" : "text-gray-400")} />
                                                    </div>
                                                    <span className={cn("text-sm font-semibold", tIsSelected ? tOption.selectedText : "text-gray-600")}>
                                                        {tOption.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {tOption.description}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Submit button */}
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-200/50"
                                    disabled={mIsLoading}
                                >
                                    {mIsLoading ? "가입 중..." : "가입하기"}
                                </Button>
                            </form>

                            {/* Login link */}
                            <p className="mt-5 text-center text-sm text-gray-500">
                                이미 계정이 있으신가요?{" "}
                                <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                                    로그인
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
