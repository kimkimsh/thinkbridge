"use client";

/**
 * ThinkBridge registration page.
 * Name, email, password fields with student/instructor role selection.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, GraduationCap, Users } from "lucide-react";
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
}

const ROLE_OPTIONS: RoleOption[] = [
    {
        value: "student",
        label: "학생",
        description: "소크라테스 대화로 학습하기",
        icon: GraduationCap,
    },
    {
        value: "instructor",
        label: "교강사",
        description: "학생 사고력 분석 대시보드",
        icon: Users,
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
                        <CardTitle className="text-xl">회원가입</CardTitle>
                        <CardDescription>
                            ThinkBridge에 가입하고 사고력을 키워보세요
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
                                                    "flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors",
                                                    tIsSelected
                                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                                                )}
                                            >
                                                <IconComponent className="h-5 w-5" />
                                                <span className="text-sm font-medium">{tOption.label}</span>
                                                <span className="text-xs opacity-70">{tOption.description}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Submit button */}
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={mIsLoading}
                            >
                                {mIsLoading ? "가입 중..." : "가입하기"}
                            </Button>
                        </form>

                        {/* Login link */}
                        <p className="mt-4 text-center text-sm text-gray-500">
                            이미 계정이 있으신가요?{" "}
                            <Link href="/login" className="font-medium text-blue-600 hover:underline">
                                로그인
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
