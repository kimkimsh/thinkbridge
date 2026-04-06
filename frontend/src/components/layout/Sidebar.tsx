"use client";

/**
 * ThinkBridge role-based sidebar navigation.
 * Desktop: fixed left sidebar.
 * Mobile: hamburger icon triggering a Sheet slide-in.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
    MessageSquare,
    List,
    LayoutDashboard,
    Menu,
    Brain,
} from "lucide-react";


// --- Navigation Configuration ---

interface NavItem
{
    label: string;
    href: string;
    icon: React.ElementType;
}

const STUDENT_NAV_ITEMS: NavItem[] = [
    { label: "채팅", href: "/student/chat", icon: MessageSquare },
    { label: "세션 목록", href: "/student/sessions", icon: List },
];

const INSTRUCTOR_NAV_ITEMS: NavItem[] = [
    { label: "대시보드", href: "/instructor/dashboard", icon: LayoutDashboard },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
    { label: "대시보드", href: "/admin/dashboard", icon: LayoutDashboard },
];

/** Returns navigation items based on user role */
function getNavItemsForRole(role: string): NavItem[]
{
    if (role === "instructor")
    {
        return INSTRUCTOR_NAV_ITEMS;
    }
    if (role === "admin")
    {
        return ADMIN_NAV_ITEMS;
    }
    return STUDENT_NAV_ITEMS;
}


// --- Sidebar Link Component ---

interface SidebarLinkProps
{
    item: NavItem;
    isActive: boolean;
    onClick?: () => void;
}

function SidebarLink({ item, isActive, onClick }: SidebarLinkProps)
{
    const IconComponent = item.icon;

    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            )}
        >
            <IconComponent className="h-4 w-4" />
            {item.label}
        </Link>
    );
}


// --- Navigation List ---

interface NavListProps
{
    items: NavItem[];
    pathname: string;
    onItemClick?: () => void;
}

function NavList({ items, pathname, onItemClick }: NavListProps)
{
    return (
        <nav className="flex flex-col gap-1 px-2 py-4">
            {items.map((tItem) => (
                <SidebarLink
                    key={tItem.href}
                    item={tItem}
                    isActive={pathname.startsWith(tItem.href)}
                    onClick={onItemClick}
                />
            ))}
        </nav>
    );
}


// --- Sidebar Component ---

export function Sidebar()
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
        <>
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-white">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">
                        ThinkBridge
                    </span>
                </div>
                <NavList items={tNavItems} pathname={pathname} />
            </aside>

            {/* Mobile hamburger + Sheet */}
            <div className="fixed bottom-4 right-4 z-50 md:hidden">
                <Sheet open={mIsOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button
                            size="icon"
                            className="h-12 w-12 rounded-full bg-blue-600 shadow-lg hover:bg-blue-700"
                        >
                            <Menu className="h-5 w-5 text-white" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <div className="flex items-center gap-2 border-b px-4 py-3">
                            <Brain className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-semibold text-gray-700">
                                ThinkBridge
                            </span>
                        </div>
                        <NavList
                            items={tNavItems}
                            pathname={pathname}
                            onItemClick={() => setIsOpen(false)}
                        />
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
