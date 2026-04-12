"use client";

/**
 * 모바일 네비게이션 메뉴.
 * 상단 Navbar 좌측(로고 앞)에 배치되는 햄버거 버튼 + Sheet.
 * 로그인 상태에서 역할별 네비게이션을 제공한다.
 * 하단 floating 배치가 콘텐츠를 가리는 문제를 해결하기 위해 상단 고정 방식으로 이동.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Brain } from "lucide-react";
import { getNavItemsForRole, NavList } from "@/components/layout/Sidebar";


// --- Constants ---

/** 햄버거 트리거 버튼 aria 라벨 (한국어) */
const MOBILE_MENU_TRIGGER_LABEL = "메뉴 열기";

/** Sheet 헤더 타이틀 (스크린 리더용) */
const MOBILE_MENU_TITLE = "네비게이션";

/** Sheet 슬라이드인 방향 */
const MOBILE_SHEET_SIDE = "left";


// --- Component ---

export function MobileMenu()
{
    const { user } = useAuth();
    const pathname = usePathname();
    const [mIsOpen, setIsOpen] = useState(false);

    if (!user)
    {
        return null;
    }

    const tNavItems = getNavItemsForRole(user.role);

    return (
        <Sheet open={mIsOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-9 w-9 text-gray-700 hover:bg-gray-100"
                    aria-label={MOBILE_MENU_TRIGGER_LABEL}
                    title={MOBILE_MENU_TRIGGER_LABEL}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side={MOBILE_SHEET_SIDE} className="w-64 p-0">
                <SheetHeader className="border-b px-4 py-3 text-left">
                    <SheetTitle className="sr-only">{MOBILE_MENU_TITLE}</SheetTitle>
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">
                            ThinkBridge
                        </span>
                    </div>
                </SheetHeader>
                <NavList
                    items={tNavItems}
                    pathname={pathname}
                    onItemClick={() => setIsOpen(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
