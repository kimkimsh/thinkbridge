"use client";

/**
 * ThinkBridge landing page.
 * First impression for judges -- must look impressive.
 * Sections: Hero, ChatGPT vs ThinkBridge comparison, Feature cards, Demo mode, Footer.
 *
 * Design: Warm intellectual aesthetic -- "Notion meets Apple Education"
 * Primary: Deep indigo (#4338CA), Accent: Warm amber (#F59E0B)
 * Scroll-triggered fade-in animations via IntersectionObserver
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getHomePathForRole } from "@/lib/auth";
import { normalizeErrorMessage } from "@/lib/api";
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
    AlertCircle,
} from "lucide-react";


// --- Constants ---

const DEMO_ACCOUNTS = {
    student: { email: "student@demo.com", password: "demo1234", redirect: "/student/chat" },
    instructor: { email: "instructor@demo.com", password: "demo1234", redirect: "/instructor/dashboard" },
    admin: { email: "admin@demo.com", password: "demo1234", redirect: "/admin/dashboard" },
} as const;

const COMPARISON_QUESTION = "이차방정식 x\u00B2 - x - 6 = 0 풀어줘";

const CHATGPT_RESPONSE_LINES = [
    "이차방정식 x\u00B2 - x - 6 = 0을 풀겠습니다.",
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

const HERO_CHAT_PREVIEW = [
    { role: "student" as const, text: "광합성에서 빛은 어떤 역할을 하나요?" },
    { role: "ai" as const, text: "좋은 질문이에요! 식물이 빛 없이도 성장할 수 있을까요? 어떤 경험이 떠오르나요?" },
    { role: "student" as const, text: "어두운 곳에 둔 화분이 시들었어요..." },
    { role: "ai" as const, text: "훌륭한 관찰이에요! 그렇다면 빛이 식물에게 무엇을 제공한다고 추론할 수 있을까요?" },
];

interface FeatureCardData
{
    icon: React.ElementType;
    title: string;
    description: string;
    iconColor: string;
    iconBg: string;
    borderColor: string;
}

const FEATURE_CARDS: FeatureCardData[] = [
    {
        icon: MessageSquare,
        title: "소크라테스식 대화",
        description: "AI가 답을 알려주는 대신, 질문을 던져 스스로 생각하도록 유도합니다. 수학, 과학, 논술 과목을 지원합니다.",
        iconColor: "text-indigo-600",
        iconBg: "bg-indigo-100",
        borderColor: "border-indigo-200 hover:border-indigo-300",
    },
    {
        icon: BarChart3,
        title: "실시간 사고력 분석",
        description: "블룸의 인지적 영역 6단계 기반으로 학생의 사고 과정을 실시간 분석합니다. 문제 이해부터 창의적 사고까지.",
        iconColor: "text-emerald-600",
        iconBg: "bg-emerald-100",
        borderColor: "border-emerald-200 hover:border-emerald-300",
    },
    {
        icon: Users,
        title: "교강사 대시보드",
        description: "학생별 사고력 히트맵, 성장 추세, 세션 리플레이를 통해 개별 학생의 사고 패턴을 파악합니다.",
        iconColor: "text-purple-600",
        iconBg: "bg-purple-100",
        borderColor: "border-purple-200 hover:border-purple-300",
    },
];

/** 스크롤 애니메이션 딜레이 단위 (ms) */
const ANIMATION_STAGGER_DELAY_MS = 150;

/** Hero 텍스트 애니메이션 딜레이 단위 (ms) */
const HERO_STAGGER_DELAY_MS = 200;

/** 게스트 체험 로그인 실패 시 기본 표시 메시지 */
const GUEST_LOGIN_FALLBACK_ERROR = "게스트 체험 시작에 실패했습니다. 잠시 후 다시 시도해주세요.";

/** 데모 계정 로그인 실패 시 기본 표시 메시지 */
const DEMO_LOGIN_FALLBACK_ERROR = "데모 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";


// --- Custom Hook: Scroll-triggered fade-in ---

function useScrollFadeIn()
{
    const mRef = useRef<HTMLDivElement>(null);
    const [mIsVisible, setIsVisible] = useState(false);

    useEffect(() =>
    {
        const tNode = mRef.current;
        if (!tNode)
        {
            return;
        }

        const tObserver = new IntersectionObserver(
            ([entry]) =>
            {
                if (entry.isIntersecting)
                {
                    setIsVisible(true);
                    tObserver.unobserve(tNode);
                }
            },
            { threshold: 0.15 }
        );

        tObserver.observe(tNode);
        return () => tObserver.disconnect();
    }, []);

    return { ref: mRef, isVisible: mIsVisible };
}


// --- Component ---

export default function LandingPage()
{
    const { user, login, loginAsGuest } = useAuth();
    const router = useRouter();
    const [mIsGuestLoading, setIsGuestLoading] = useState(false);
    const [mDemoLoadingRole, setDemoLoadingRole] = useState<string | null>(null);
    const [mHeroLoaded, setHeroLoaded] = useState(false);
    // 게스트/데모 로그인 실패를 사용자에게 표시하기 위한 에러 상태.
    // 기존 catch 블록이 완전히 조용했기 때문에 Render cold start 등 실패 시 원인 불명으로 멈춘 것처럼 보였음.
    const [mError, setError] = useState<string | null>(null);

    // 백엔드 cold start 방지를 위한 warm-up 호출
    useEffect(() =>
    {
        fetch(`${API_URL}/health`).catch(() =>
        {
            // warm-up 실패는 무시 (backend가 아직 준비 안 됐을 수 있음)
        });
    }, []);

    // Hero 등장 애니메이션 트리거
    useEffect(() =>
    {
        const tTimer = setTimeout(() => setHeroLoaded(true), 100);
        return () => clearTimeout(tTimer);
    }, []);

    // 스크롤 애니메이션을 위한 섹션 refs
    const tComparisonFade = useScrollFadeIn();
    const tFeatureFade = useScrollFadeIn();
    const tDemoFade = useScrollFadeIn();

    /**
     * 게스트 체험 모드 진입
     */
    async function handleGuestTrial()
    {
        setIsGuestLoading(true);
        setError(null);
        try
        {
            await loginAsGuest();
            // loginAsGuest가 내부적으로 리다이렉트 처리함
        }
        catch (tError)
        {
            // 이전에는 catch가 비어 있어 실패 시 로딩만 풀리고 사용자는 원인을 알 수 없었음.
            // 운영 중 가장 흔한 실패 원인인 백엔드 cold start / 네트워크 오류를 사용자에게 표면화.
            // normalizeErrorMessage로 "Failed to fetch" 등 브라우저 원문 메시지를 한국어 친화 메시지로 치환.
            const tMessage = tError instanceof Error ? normalizeErrorMessage(tError) : GUEST_LOGIN_FALLBACK_ERROR;
            setError(tMessage);
            console.error("Guest login failed", tError);
            setIsGuestLoading(false);
        }
    }

    /**
     * 데모 계정으로 원클릭 로그인
     */
    async function handleDemoLogin(role: keyof typeof DEMO_ACCOUNTS)
    {
        setDemoLoadingRole(role);
        setError(null);
        try
        {
            const tAccount = DEMO_ACCOUNTS[role];
            await login(tAccount.email, tAccount.password);
            // login이 내부적으로 리다이렉트 처리함
        }
        catch (tError)
        {
            const tMessage = tError instanceof Error ? normalizeErrorMessage(tError) : DEMO_LOGIN_FALLBACK_ERROR;
            setError(tMessage);
            console.error("Demo login failed", tError, { role });
            setDemoLoadingRole(null);
        }
    }

    /**
     * 로그인 상태에서 기본 CTA 클릭 시 역할별 홈으로 이동.
     */
    function handleContinue()
    {
        if (!user)
        {
            return;
        }
        router.push(getHomePathForRole(user.role));
    }

    /**
     * 로그인된 사용자를 위한 Hero CTA 라벨 — 역할과 게스트 여부에 따라 분기.
     */
    function getContinueCtaLabel(): string
    {
        if (!user)
        {
            return "";
        }
        if (user.role === "instructor")
        {
            return "강사 대시보드로";
        }
        if (user.role === "admin")
        {
            return "관리자 대시보드로";
        }
        // student or guest
        return user.isGuest ? "체험 계속하기" : "대화 계속하기";
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Navbar */}
            <Navbar />

            {/* 게스트/데모 로그인 실패 에러 배너 — 상단 우측 고정, 사용자가 수동으로 닫을 수 있음 */}
            {mError && (
                <div className="fixed right-4 top-20 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 p-3 shadow-lg shadow-red-100/60">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <div className="flex-1">
                            <p className="text-sm text-red-700">{mError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            className="shrink-0 text-xs text-red-500 hover:text-red-700"
                            aria-label="에러 메시지 닫기"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* 배경 그리드 패턴 */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #4338CA 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />

                {/* 배경 그라디언트 */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white/40 to-white" />

                {/* 데코레이션 블러 원 */}
                <div className="pointer-events-none absolute -top-32 left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-200/30 blur-3xl" />
                <div className="pointer-events-none absolute -top-20 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-200/20 blur-3xl" />
                <div className="pointer-events-none absolute bottom-0 left-1/2 h-[200px] w-[600px] -translate-x-1/2 rounded-full bg-amber-100/20 blur-3xl" />

                <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 md:pb-20 md:pt-24">
                    {/* Badge */}
                    <div
                        className="mb-8 flex justify-center"
                        style={{
                            opacity: mHeroLoaded ? 1 : 0,
                            transform: mHeroLoaded ? "translateY(0)" : "translateY(16px)",
                            transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
                        }}
                    >
                        <Badge
                            variant="secondary"
                            className="inline-flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-indigo-700"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            AI 소크라테스식 1:1 튜터링
                        </Badge>
                    </div>

                    {/* Main headline */}
                    <div className="text-center">
                        <h1
                            className="mb-2 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl lg:text-6xl"
                            style={{
                                opacity: mHeroLoaded ? 1 : 0,
                                transform: mHeroLoaded ? "translateY(0)" : "translateY(20px)",
                                transition: `opacity 0.7s ease-out ${HERO_STAGGER_DELAY_MS}ms, transform 0.7s ease-out ${HERO_STAGGER_DELAY_MS}ms`,
                            }}
                        >
                            AI가 답을 주는 시대,
                        </h1>
                        <h1
                            className="mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl lg:text-6xl"
                            style={{
                                opacity: mHeroLoaded ? 1 : 0,
                                transform: mHeroLoaded ? "translateY(0)" : "translateY(20px)",
                                transition: `opacity 0.7s ease-out ${HERO_STAGGER_DELAY_MS * 2}ms, transform 0.7s ease-out ${HERO_STAGGER_DELAY_MS * 2}ms`,
                            }}
                        >
                            생각하는 법을 가르치는 AI
                        </h1>
                    </div>

                    {/* Subtitle */}
                    <p
                        className="mx-auto mb-10 max-w-2xl text-center text-lg text-gray-500 md:text-xl"
                        style={{
                            opacity: mHeroLoaded ? 1 : 0,
                            transform: mHeroLoaded ? "translateY(0)" : "translateY(16px)",
                            transition: `opacity 0.7s ease-out ${HERO_STAGGER_DELAY_MS * 3}ms, transform 0.7s ease-out ${HERO_STAGGER_DELAY_MS * 3}ms`,
                        }}
                    >
                        ThinkBridge는 절대 정답을 알려주지 않습니다.
                        <br className="hidden sm:inline" />
                        소크라테스식 질문으로 학생 스스로 답에 도달하도록 이끕니다.
                    </p>

                    {/* CTA buttons — 로그인 상태별 분기 */}
                    <div
                        className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
                        style={{
                            opacity: mHeroLoaded ? 1 : 0,
                            transform: mHeroLoaded ? "translateY(0)" : "translateY(16px)",
                            transition: `opacity 0.7s ease-out ${HERO_STAGGER_DELAY_MS * 4}ms, transform 0.7s ease-out ${HERO_STAGGER_DELAY_MS * 4}ms`,
                        }}
                    >
                        {user ? (
                            <Button
                                size="lg"
                                className="w-full bg-indigo-600 px-8 text-base font-semibold shadow-lg shadow-indigo-200 transition-all duration-300 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 sm:w-auto"
                                onClick={handleContinue}
                            >
                                {getContinueCtaLabel()}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <>
                                <Button
                                    size="lg"
                                    className="w-full bg-indigo-600 px-8 text-base font-semibold shadow-lg shadow-indigo-200 transition-all duration-300 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 sm:w-auto"
                                    onClick={handleGuestTrial}
                                    disabled={mIsGuestLoading}
                                >
                                    {mIsGuestLoading ? "준비 중..." : "바로 체험하기"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full border-gray-300 transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50 sm:w-auto"
                                    onClick={() => router.push("/login")}
                                >
                                    로그인
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Hero CTA 바로 아래 inline 에러 배너 — 상단 고정 배너 외에 Hero 근처에서도 즉시 눈에 띄도록 추가 표시 */}
                    {mError && (
                        <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1">{mError}</span>
                            <button
                                type="button"
                                onClick={() => setError(null)}
                                className="text-xs font-medium text-red-500 underline hover:text-red-700"
                                aria-label="에러 닫기"
                            >
                                닫기
                            </button>
                        </div>
                    )}

                    {/* Guest trial note — 비로그인 상태에서만 노출 */}
                    {!user && (
                        <p
                            className="mt-3 text-center text-sm text-gray-400"
                            style={{
                                opacity: mHeroLoaded ? 1 : 0,
                                transition: `opacity 0.7s ease-out ${HERO_STAGGER_DELAY_MS * 5}ms`,
                            }}
                        >
                            회원가입 없이 5턴 무료 체험
                        </p>
                    )}

                    {/* Mini Chat Preview Mockup */}
                    <div
                        className="mx-auto mt-12 max-w-lg"
                        style={{
                            opacity: mHeroLoaded ? 1 : 0,
                            transform: mHeroLoaded ? "translateY(0)" : "translateY(24px)",
                            transition: `opacity 0.8s ease-out ${HERO_STAGGER_DELAY_MS * 5}ms, transform 0.8s ease-out ${HERO_STAGGER_DELAY_MS * 5}ms`,
                        }}
                    >
                        <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-4 shadow-xl shadow-indigo-100/50 backdrop-blur-sm">
                            {/* 채팅 헤더 */}
                            <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
                                    <Brain className="h-3.5 w-3.5 text-indigo-600" />
                                </div>
                                <span className="text-xs font-semibold text-gray-700">ThinkBridge 튜터</span>
                                <Badge variant="secondary" className="ml-auto border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] text-emerald-600">
                                    과학
                                </Badge>
                            </div>

                            {/* 채팅 메시지 */}
                            <div className="space-y-2.5">
                                {HERO_CHAT_PREVIEW.map((tMsg, tIndex) => (
                                    <div
                                        key={tIndex}
                                        className={`flex ${tMsg.role === "student" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                                tMsg.role === "student"
                                                    ? "rounded-br-md bg-indigo-600 text-white"
                                                    : "rounded-bl-md bg-gray-100 text-gray-700"
                                            }`}
                                        >
                                            {tMsg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 입력 바 모형 */}
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                                <span className="flex-1 text-xs text-gray-400">생각을 입력해보세요...</span>
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600">
                                    <ArrowRight className="h-3 w-3 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ChatGPT vs ThinkBridge Comparison */}
            <section
                ref={tComparisonFade.ref}
                className="bg-gradient-to-b from-white via-gray-50/80 to-gray-50 py-16 md:py-24"
                style={{
                    opacity: tComparisonFade.isVisible ? 1 : 0,
                    transform: tComparisonFade.isVisible ? "translateY(0)" : "translateY(32px)",
                    transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
                }}
            >
                <div className="mx-auto max-w-5xl px-4">
                    <div className="mb-12 text-center">
                        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
                            기존 AI와 무엇이 다른가요?
                        </h2>
                        <p className="text-gray-500">
                            같은 질문, 완전히 다른 접근 방식
                        </p>
                    </div>

                    <div className="relative grid gap-6 md:grid-cols-2 md:gap-8">
                        {/* VS Divider (desktop only) */}
                        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white font-bold text-gray-400 shadow-md">
                                VS
                            </div>
                        </div>

                        {/* ChatGPT side -- muted, "wrong" visual */}
                        <Card
                            className="relative overflow-hidden border-red-200/80 bg-gradient-to-br from-red-50/60 to-white"
                            style={{
                                opacity: tComparisonFade.isVisible ? 1 : 0,
                                transform: tComparisonFade.isVisible ? "translateX(0)" : "translateX(-24px)",
                                transition: `opacity 0.7s ease-out ${ANIMATION_STAGGER_DELAY_MS}ms, transform 0.7s ease-out ${ANIMATION_STAGGER_DELAY_MS}ms`,
                            }}
                        >
                            {/* 부정적 오버레이 표시 */}
                            <div className="pointer-events-none absolute right-3 top-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                                    <X className="h-5 w-5 text-red-500" />
                                </div>
                            </div>

                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-red-800">
                                        기존 AI 챗봇
                                    </h3>
                                    <Badge className="border-red-300 bg-red-100 text-red-700">
                                        답 제공
                                    </Badge>
                                </div>

                                {/* Question */}
                                <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
                                    <p className="mb-1 text-xs font-medium text-gray-400">학생 질문</p>
                                    <p className="text-sm font-medium text-gray-800">{COMPARISON_QUESTION}</p>
                                </div>

                                {/* Response -- faded, strikethrough feel */}
                                <div className="rounded-xl bg-red-100/50 p-3">
                                    <p className="mb-1 text-xs font-medium text-gray-400">AI 응답</p>
                                    {CHATGPT_RESPONSE_LINES.map((tLine, tIndex) => (
                                        <p key={tIndex} className="text-sm text-gray-600">
                                            {tLine || "\u00A0"}
                                        </p>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-50 py-2">
                                    <X className="h-4 w-4 text-red-500" />
                                    <p className="text-sm font-semibold text-red-600">
                                        학생은 답만 받고, 사고 과정은 없음
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* VS Divider (mobile only) */}
                        <div className="flex items-center justify-center md:hidden">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-sm font-bold text-gray-400 shadow-md">
                                VS
                            </div>
                        </div>

                        {/* ThinkBridge side -- highlighted, "right" visual */}
                        <Card
                            className="relative overflow-hidden border-indigo-300 bg-gradient-to-br from-indigo-50/60 to-white shadow-lg shadow-indigo-100/50"
                            style={{
                                opacity: tComparisonFade.isVisible ? 1 : 0,
                                transform: tComparisonFade.isVisible ? "translateX(0)" : "translateX(24px)",
                                transition: `opacity 0.7s ease-out ${ANIMATION_STAGGER_DELAY_MS * 2}ms, transform 0.7s ease-out ${ANIMATION_STAGGER_DELAY_MS * 2}ms`,
                            }}
                        >
                            {/* 긍정적 오버레이 표시 */}
                            <div className="pointer-events-none absolute right-3 top-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                </div>
                            </div>

                            {/* 글로잉 테두리 효과 */}
                            <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-400/20 via-purple-400/10 to-indigo-400/20 blur-sm" />

                            <CardContent className="relative p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-indigo-800">
                                        ThinkBridge
                                    </h3>
                                    <Badge className="border-indigo-300 bg-indigo-100 text-indigo-700">
                                        사고 유도
                                    </Badge>
                                </div>

                                {/* Question */}
                                <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
                                    <p className="mb-1 text-xs font-medium text-gray-400">학생 질문</p>
                                    <p className="text-sm font-medium text-gray-800">{COMPARISON_QUESTION}</p>
                                </div>

                                {/* Response -- vibrant, alive feel */}
                                <div className="rounded-xl bg-indigo-100/50 p-3">
                                    <p className="mb-1 text-xs font-medium text-gray-400">AI 응답</p>
                                    {THINKBRIDGE_RESPONSE_LINES.map((tLine, tIndex) => (
                                        <p key={tIndex} className="text-sm text-gray-700">
                                            {tLine || "\u00A0"}
                                        </p>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    <p className="text-sm font-semibold text-emerald-600">
                                        질문으로 스스로 사고하도록 유도
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Feature Cards */}
            <section
                ref={tFeatureFade.ref}
                className="bg-white py-16 md:py-24"
                style={{
                    opacity: tFeatureFade.isVisible ? 1 : 0,
                    transform: tFeatureFade.isVisible ? "translateY(0)" : "translateY(32px)",
                    transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
                }}
            >
                <div className="mx-auto max-w-5xl px-4">
                    <div className="mb-12 text-center">
                        <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
                            ThinkBridge의 핵심 기능
                        </h2>
                        <p className="text-gray-500">
                            단순한 챗봇이 아닌, 사고력 성장 플랫폼
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {FEATURE_CARDS.map((tCard, tIndex) =>
                        {
                            const IconComponent = tCard.icon;
                            return (
                                <Card
                                    key={tCard.title}
                                    className={`border-2 ${tCard.borderColor} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
                                    style={{
                                        opacity: tFeatureFade.isVisible ? 1 : 0,
                                        transform: tFeatureFade.isVisible ? "translateY(0)" : "translateY(24px)",
                                        transition: `opacity 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS * (tIndex + 1)}ms, transform 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS * (tIndex + 1)}ms`,
                                    }}
                                >
                                    <CardContent className="p-6">
                                        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tCard.iconBg}`}>
                                            <IconComponent className={`h-6 w-6 ${tCard.iconColor}`} />
                                        </div>
                                        <h3 className="mb-2 text-lg font-bold text-gray-900">
                                            {tCard.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-gray-500">
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
            <section
                ref={tDemoFade.ref}
                className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24"
                style={{
                    opacity: tDemoFade.isVisible ? 1 : 0,
                    transform: tDemoFade.isVisible ? "translateY(0)" : "translateY(32px)",
                    transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
                }}
            >
                <div className="mx-auto max-w-3xl px-4 text-center">
                    <div className="mb-3 flex items-center justify-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 md:text-3xl lg:text-4xl">
                            {user ? "다른 역할 체험" : "데모 모드"}
                        </h2>
                    </div>
                    <p className="mb-10 text-gray-500">
                        원클릭으로 각 역할을 체험해보세요. 시드 데이터가 준비되어 있습니다.
                    </p>

                    <div className="grid gap-5 sm:grid-cols-3">
                        {/* Student demo */}
                        <Card
                            className="border-2 border-indigo-200 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50"
                            style={{
                                opacity: tDemoFade.isVisible ? 1 : 0,
                                transform: tDemoFade.isVisible ? "translateY(0)" : "translateY(20px)",
                                transition: `opacity 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS}ms, transform 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS}ms`,
                            }}
                        >
                            <CardContent className="flex flex-col items-center p-6">
                                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                                    <GraduationCap className="h-7 w-7 text-indigo-600" />
                                </div>
                                <h3 className="mb-1 text-lg font-bold text-gray-900">학생</h3>
                                <p className="mb-5 text-sm text-gray-500">
                                    채팅 + 사고력 분석
                                </p>
                                <Button
                                    className="w-full bg-indigo-600 font-semibold shadow-md shadow-indigo-200 transition-all duration-300 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200"
                                    onClick={() => handleDemoLogin("student")}
                                    disabled={mDemoLoadingRole === "student"}
                                >
                                    {mDemoLoadingRole === "student" ? "로그인 중..." : "학생으로 체험"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Instructor demo */}
                        <Card
                            className="border-2 border-purple-200 transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50"
                            style={{
                                opacity: tDemoFade.isVisible ? 1 : 0,
                                transform: tDemoFade.isVisible ? "translateY(0)" : "translateY(20px)",
                                transition: `opacity 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS * 2}ms, transform 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS * 2}ms`,
                            }}
                        >
                            <CardContent className="flex flex-col items-center p-6">
                                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100">
                                    <Users className="h-7 w-7 text-purple-600" />
                                </div>
                                <h3 className="mb-1 text-lg font-bold text-gray-900">교강사</h3>
                                <p className="mb-5 text-sm text-gray-500">
                                    대시보드 + 리플레이
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full border-purple-300 font-semibold text-purple-700 transition-all duration-300 hover:bg-purple-50 hover:shadow-md"
                                    onClick={() => handleDemoLogin("instructor")}
                                    disabled={mDemoLoadingRole === "instructor"}
                                >
                                    {mDemoLoadingRole === "instructor" ? "로그인 중..." : "교강사로 체험"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Admin demo */}
                        <Card
                            className="border-2 border-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-slate-400 hover:shadow-lg hover:shadow-slate-100/50"
                            style={{
                                opacity: tDemoFade.isVisible ? 1 : 0,
                                transform: tDemoFade.isVisible ? "translateY(0)" : "translateY(20px)",
                                transition: `opacity 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS * 3}ms, transform 0.6s ease-out ${ANIMATION_STAGGER_DELAY_MS * 3}ms`,
                            }}
                        >
                            <CardContent className="flex flex-col items-center p-6">
                                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                                    <BarChart3 className="h-7 w-7 text-slate-600" />
                                </div>
                                <h3 className="mb-1 text-lg font-bold text-gray-900">운영자</h3>
                                <p className="mb-5 text-sm text-gray-500">
                                    전체 통계 + 분석
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full border-slate-300 font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-50 hover:shadow-md"
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
            <footer className="border-t border-gray-100 bg-white py-10">
                <div className="mx-auto max-w-5xl px-4">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                                <Brain className="h-4 w-4 text-indigo-600" />
                            </div>
                            <span className="font-bold text-gray-900">ThinkBridge</span>
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
