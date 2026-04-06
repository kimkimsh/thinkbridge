"use client";

/**
 * ThinkBridge landing page.
 * First impression for judges -- must look impressive.
 * Sections: Hero, ChatGPT vs ThinkBridge comparison, Feature cards, Demo mode, Footer.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { API_URL } from "@/lib/constants";
import {
    Brain,
    MessageSquare,
    BarChart3,
    Users,
    ArrowRight,
    Sparkles,
    X,
    CheckCircle,
    Lightbulb,
    GraduationCap,
} from "lucide-react";


// --- Constants ---

const DEMO_ACCOUNTS = {
    student: { email: "student@demo.com", password: "demo1234", redirect: "/student/chat" },
    instructor: { email: "instructor@demo.com", password: "demo1234", redirect: "/instructor/dashboard" },
    admin: { email: "admin@demo.com", password: "demo1234", redirect: "/admin/dashboard" },
} as const;

const COMPARISON_QUESTION = "이차방정식 x² - x - 6 = 0 풀어줘";

const CHATGPT_RESPONSE_LINES = [
    "이차방정식 x² - x - 6 = 0을 풀겠습니다.",
    "",
    "인수분해하면:",
    "(x - 3)(x + 2) = 0",
    "",
    "따라서 x = 3 또는 x = -2 입니다.",
];

const THINKBRIDGE_RESPONSE_LINES = [
    "좋은 질문이에요! 이 식을 보면 어떤 형태의 방정식인지 알 수 있나요?",
    "",
    "이차항, 일차항, 상수항의 계수를 각각 말해볼 수 있을까요?",
    "",
    "이 계수들 사이에 어떤 관계가 있는지 생각해보세요.",
];

interface FeatureCardData
{
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
}

const FEATURE_CARDS: FeatureCardData[] = [
    {
        icon: MessageSquare,
        title: "소크라테스식 대화",
        description: "AI가 답을 알려주는 대신, 질문을 던져 스스로 생각하도록 유도합니다. 수학, 과학, 논술 과목을 지원합니다.",
        color: "text-blue-600",
    },
    {
        icon: BarChart3,
        title: "실시간 사고력 분석",
        description: "블룸의 인지적 영역 6단계 기반으로 학생의 사고 과정을 실시간 분석합니다. 문제 이해부터 창의적 사고까지.",
        color: "text-emerald-600",
    },
    {
        icon: Users,
        title: "교강사 대시보드",
        description: "학생별 사고력 히트맵, 성장 추세, 세션 리플레이를 통해 개별 학생의 사고 패턴을 파악합니다.",
        color: "text-purple-600",
    },
];


// --- Component ---

export default function LandingPage()
{
    const { login, loginAsGuest } = useAuth();
    const router = useRouter();
    const [mIsGuestLoading, setIsGuestLoading] = useState(false);
    const [mDemoLoadingRole, setDemoLoadingRole] = useState<string | null>(null);

    // 백엔드 cold start 방지를 위한 warm-up 호출
    useEffect(() =>
    {
        fetch(`${API_URL}/health`).catch(() =>
        {
            // warm-up 실패는 무시 (backend가 아직 준비 안 됐을 수 있음)
        });
    }, []);

    /**
     * 게스트 체험 모드 진입
     */
    async function handleGuestTrial()
    {
        setIsGuestLoading(true);
        try
        {
            await loginAsGuest();
            // loginAsGuest가 내부적으로 리다이렉트 처리함
        }
        catch
        {
            setIsGuestLoading(false);
        }
    }

    /**
     * 데모 계정으로 원클릭 로그인
     */
    async function handleDemoLogin(role: keyof typeof DEMO_ACCOUNTS)
    {
        setDemoLoadingRole(role);
        try
        {
            const tAccount = DEMO_ACCOUNTS[role];
            await login(tAccount.email, tAccount.password);
            // login이 내부적으로 리다이렉트 처리함
        }
        catch
        {
            setDemoLoadingRole(null);
        }
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Navbar */}
            <Navbar />

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
                <div className="mx-auto max-w-5xl px-4 py-20 text-center md:py-28">
                    {/* Badge */}
                    <Badge
                        variant="secondary"
                        className="mb-6 inline-flex items-center gap-1.5 bg-blue-100 px-4 py-1.5 text-blue-700"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI 소크라테스식 1:1 튜터링
                    </Badge>

                    {/* Main headline */}
                    <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
                        AI가 답을 주는 시대,
                        <br />
                        <span className="text-blue-600">생각하는 법을 가르치는 AI</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 md:text-xl">
                        ThinkBridge는 절대 정답을 알려주지 않습니다.
                        <br className="hidden sm:inline" />
                        소크라테스식 질문으로 학생 스스로 답에 도달하도록 이끕니다.
                    </p>

                    {/* CTA buttons */}
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <Button
                            size="lg"
                            className="w-full bg-blue-600 px-8 text-base font-semibold hover:bg-blue-700 sm:w-auto"
                            onClick={handleGuestTrial}
                            disabled={mIsGuestLoading}
                        >
                            {mIsGuestLoading ? "준비 중..." : "바로 체험하기"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => router.push("/login")}
                        >
                            로그인
                        </Button>
                    </div>

                    {/* Guest trial note */}
                    <p className="mt-3 text-sm text-gray-400">
                        회원가입 없이 5턴 무료 체험
                    </p>
                </div>

                {/* Decorative gradient circles */}
                <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-100/40 blur-3xl" />
            </section>

            {/* ChatGPT vs ThinkBridge Comparison */}
            <section className="bg-gray-50 py-16 md:py-20">
                <div className="mx-auto max-w-5xl px-4">
                    <div className="mb-10 text-center">
                        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
                            기존 AI와 무엇이 다른가요?
                        </h2>
                        <p className="text-gray-600">
                            같은 질문, 다른 접근 방식
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* ChatGPT side */}
                        <Card className="border-red-200 bg-red-50/50">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                                        <X className="h-4 w-4 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-red-800">
                                        기존 AI 챗봇
                                    </h3>
                                    <Badge variant="outline" className="border-red-300 text-red-600">
                                        답 제공
                                    </Badge>
                                </div>

                                {/* Question */}
                                <div className="mb-3 rounded-lg bg-white p-3 shadow-sm">
                                    <p className="text-sm text-gray-500">학생 질문</p>
                                    <p className="font-medium text-gray-800">{COMPARISON_QUESTION}</p>
                                </div>

                                {/* Response */}
                                <div className="rounded-lg bg-red-100/60 p-3">
                                    <p className="text-sm text-gray-500">AI 응답</p>
                                    {CHATGPT_RESPONSE_LINES.map((tLine, tIndex) => (
                                        <p key={tIndex} className="text-sm text-gray-700">
                                            {tLine || "\u00A0"}
                                        </p>
                                    ))}
                                </div>

                                <p className="mt-3 text-center text-sm font-medium text-red-600">
                                    학생은 답만 받고, 사고 과정은 없음
                                </p>
                            </CardContent>
                        </Card>

                        {/* ThinkBridge side */}
                        <Card className="border-blue-200 bg-blue-50/50 shadow-md">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                        <CheckCircle className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-blue-800">
                                        ThinkBridge
                                    </h3>
                                    <Badge variant="outline" className="border-blue-300 text-blue-600">
                                        사고 유도
                                    </Badge>
                                </div>

                                {/* Question */}
                                <div className="mb-3 rounded-lg bg-white p-3 shadow-sm">
                                    <p className="text-sm text-gray-500">학생 질문</p>
                                    <p className="font-medium text-gray-800">{COMPARISON_QUESTION}</p>
                                </div>

                                {/* Response */}
                                <div className="rounded-lg bg-blue-100/60 p-3">
                                    <p className="text-sm text-gray-500">AI 응답</p>
                                    {THINKBRIDGE_RESPONSE_LINES.map((tLine, tIndex) => (
                                        <p key={tIndex} className="text-sm text-gray-700">
                                            {tLine || "\u00A0"}
                                        </p>
                                    ))}
                                </div>

                                <p className="mt-3 text-center text-sm font-medium text-blue-600">
                                    질문으로 스스로 사고하도록 유도
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Feature Cards */}
            <section className="py-16 md:py-20">
                <div className="mx-auto max-w-5xl px-4">
                    <div className="mb-10 text-center">
                        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
                            ThinkBridge의 핵심 기능
                        </h2>
                        <p className="text-gray-600">
                            단순한 챗봇이 아닌, 사고력 성장 플랫폼
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {FEATURE_CARDS.map((tCard) =>
                        {
                            const IconComponent = tCard.icon;
                            return (
                                <Card
                                    key={tCard.title}
                                    className="border-gray-200 transition-shadow hover:shadow-md"
                                >
                                    <CardContent className="p-6">
                                        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 ${tCard.color}`}>
                                            <IconComponent className="h-5 w-5" />
                                        </div>
                                        <h3 className="mb-2 text-lg font-semibold text-gray-900">
                                            {tCard.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-gray-600">
                                            {tCard.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Demo Mode Section */}
            <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-20">
                <div className="mx-auto max-w-3xl px-4 text-center">
                    <div className="mb-3 flex items-center justify-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                            데모 모드
                        </h2>
                    </div>
                    <p className="mb-8 text-gray-600">
                        원클릭으로 각 역할을 체험해보세요. 시드 데이터가 준비되어 있습니다.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {/* Student demo */}
                        <Card className="border-blue-200 transition-shadow hover:shadow-md">
                            <CardContent className="flex flex-col items-center p-6">
                                <GraduationCap className="mb-3 h-8 w-8 text-blue-600" />
                                <h3 className="mb-1 font-semibold text-gray-900">학생</h3>
                                <p className="mb-4 text-sm text-gray-500">
                                    채팅 + 사고력 분석
                                </p>
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleDemoLogin("student")}
                                    disabled={mDemoLoadingRole === "student"}
                                >
                                    {mDemoLoadingRole === "student" ? "로그인 중..." : "학생으로 체험"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Instructor demo */}
                        <Card className="border-purple-200 transition-shadow hover:shadow-md">
                            <CardContent className="flex flex-col items-center p-6">
                                <Users className="mb-3 h-8 w-8 text-purple-600" />
                                <h3 className="mb-1 font-semibold text-gray-900">교강사</h3>
                                <p className="mb-4 text-sm text-gray-500">
                                    대시보드 + 리플레이
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                                    onClick={() => handleDemoLogin("instructor")}
                                    disabled={mDemoLoadingRole === "instructor"}
                                >
                                    {mDemoLoadingRole === "instructor" ? "로그인 중..." : "교강사로 체험"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Admin demo */}
                        <Card className="border-gray-300 transition-shadow hover:shadow-md">
                            <CardContent className="flex flex-col items-center p-6">
                                <BarChart3 className="mb-3 h-8 w-8 text-gray-600" />
                                <h3 className="mb-1 font-semibold text-gray-900">운영자</h3>
                                <p className="mb-4 text-sm text-gray-500">
                                    전체 통계 + 분석
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleDemoLogin("admin")}
                                    disabled={mDemoLoadingRole === "admin"}
                                >
                                    {mDemoLoadingRole === "admin" ? "로그인 중..." : "운영자로 체험"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t bg-white py-8">
                <div className="mx-auto max-w-5xl px-4">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">ThinkBridge</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            2026 KIT 바이브코딩 공모전 출품작
                        </p>
                        <p className="text-sm text-gray-400">
                            AI 소크라테스식 튜터링 시스템
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
