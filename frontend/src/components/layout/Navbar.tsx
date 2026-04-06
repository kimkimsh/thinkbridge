"use client";

/**
 * ThinkBridge top navigation bar.
 * Shows logo, user info with role badge, and logout button when authenticated.
 * Shows login/register links when unauthenticated.
 */

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown, Brain } from "lucide-react";


// --- Constants ---

const ROLE_LABELS: Record<string, string> = {
    student: "학생",
    instructor: "교강사",
    admin: "운영자",
};

const ROLE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    student: "default",
    instructor: "secondary",
    admin: "destructive",
};


// --- Component ---

export function Navbar()
{
    const { user, logout } = useAuth();

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="flex h-14 items-center justify-between px-4 md:px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <Brain className="h-6 w-6 text-blue-600" />
                    <span className="text-lg font-bold text-gray-900">
                        ThinkBridge
                    </span>
                </Link>

                {/* Right side: auth-dependent */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span className="hidden sm:inline">{user.name}</span>
                                    <Badge variant={ROLE_BADGE_VARIANTS[user.role] || "default"}>
                                        {user.isGuest ? "게스트" : ROLE_LABELS[user.role] || user.role}
                                    </Badge>
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    {user.email}
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    로그아웃
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm">
                                    로그인
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                    회원가입
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
