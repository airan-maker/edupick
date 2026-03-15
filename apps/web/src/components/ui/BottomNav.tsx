"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  ClipboardList,
  Home,
  MessageCircle,
  Search,
  User,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isOperatorRole } from "@/lib/role-ui";
import { cn } from "@/lib/utils";

const learnerTabs = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/discover", label: "탐색", icon: Search },
  { href: "/calendar", label: "일정", icon: Calendar },
  { href: "/chat", label: "톡", icon: MessageCircle },
  { href: "/mypage", label: "마이", icon: User },
] as const;

const operatorTabs = [
  { href: "/studio", label: "스튜디오", icon: Home },
  { href: "/studio/classes", label: "반 관리", icon: ClipboardList },
  { href: "/calendar", label: "일정", icon: Calendar },
  { href: "/studio/payments", label: "수납", icon: WalletCards },
  { href: "/mypage", label: "계정", icon: Building2 },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuth((state) => state.user);
  const tabs = isOperatorRole(user?.role) ? operatorTabs : learnerTabs;

  if (pathname !== "/discover" && pathname.startsWith("/discover/")) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-1"
      aria-label="메인 내비게이션"
    >
      <div className="soft-panel mx-auto flex h-16 max-w-md items-center justify-around rounded-[28px] px-2 sm:h-[68px] sm:rounded-[30px]">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-1.5 transition-colors",
                isActive ? "text-primary" : "text-text-secondary"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full",
                  isActive
                    ? "h-9 w-9 bg-blue-50"
                    : "h-9 w-9"
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
              </span>
              <span className="text-[10px] font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
