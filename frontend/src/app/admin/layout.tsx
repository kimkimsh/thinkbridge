"use client";

/**
 * Admin layout with auth guard.
 * Only accessible to users with role "admin".
 * Includes Navbar + Sidebar.
 */

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";


// --- Constants ---

const REDIRECT_UNAUTHENTICATED = "/login";
const REDIRECT_WRONG_ROLE = "/";


// --- Component ---

export default function AdminLayout({ children }: { children: ReactNode })
{
    const { user, isLoading } = useAuth();
    const router = useRouter();

    // 인증 및 역할 검증 가드
    useEffect(() =>
    {
        if (isLoading)
        {
            return;
        }

        if (!user)
        {
            router.push(REDIRECT_UNAUTHENTICATED);
            return;
        }

        if (user.role !== "admin")
        {
            router.push(REDIRECT_WRONG_ROLE);
        }
    }, [user, isLoading, router]);

    // 로딩 중이거나 인증 실패 시 빈 화면 (리다이렉트 대기)
    if (isLoading || !user)
    {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-transparent" />
            </div>
        );
    }

    if (user.role !== "admin")
    {
        return null;
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}
