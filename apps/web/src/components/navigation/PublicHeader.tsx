"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface PublicHeaderNavItem {
  href: string;
  label: string;
}

export interface PublicHeaderAuthItem {
  href: string;
  label: string;
  variant: "ghost" | "outline";
}

const defaultNavItems: readonly PublicHeaderNavItem[] = [
  { href: "/", label: "서비스 소개" },
  { href: "/discover", label: "학원 찾기" },
  { href: "/instructor", label: "강사 전용" },
] as const;

const defaultAuthItems: readonly PublicHeaderAuthItem[] = [
  { href: "/login", label: "로그인", variant: "ghost" },
  { href: "/signup", label: "회원가입", variant: "outline" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href.startsWith("#")) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

interface PublicHeaderProps {
  navItems?: readonly PublicHeaderNavItem[];
  authItems?: readonly PublicHeaderAuthItem[];
  homeHref?: string;
  subtitle?: string;
}

export function PublicHeader({
  navItems = defaultNavItems,
  authItems = defaultAuthItems,
  homeHref = "/",
  subtitle = "학원 탐색·신청·일정을 하나로",
}: PublicHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNavigate() {
    setMenuOpen(false);
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="soft-panel relative rounded-[28px] px-4 py-3 sm:rounded-[32px] sm:px-5 sm:py-4">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={homeHref}
          className="min-w-0 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          onClick={handleNavigate}
        >
          <p className="display-font text-lg font-bold tracking-[-0.04em] text-text-primary">
            EduPick
          </p>
          <p className="text-xs text-text-secondary">
            {subtitle}
          </p>
        </Link>

        <nav aria-label="주요 이동" className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavigate}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                isActivePath(pathname, item.href)
                  ? "bg-blue-50 text-primary"
                  : "text-text-secondary hover:bg-white/70 hover:text-text-primary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {authItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavigate}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                item.variant === "outline"
                  ? "border border-white/70 bg-white/80 text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)] hover:bg-white"
                  : "text-text-secondary hover:bg-white/72 hover:text-text-primary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)] lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="public-mobile-menu"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {menuOpen ? (
        <div
          id="public-mobile-menu"
          className="absolute inset-x-3 top-[calc(100%+10px)] z-20 rounded-[28px] border border-white/70 bg-white/96 p-3 shadow-[0_18px_34px_rgba(193,199,221,0.24)] backdrop-blur-md lg:hidden"
        >
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavigate}
                className={cn(
                  "block rounded-[18px] px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  isActivePath(pathname, item.href)
                    ? "bg-blue-50 text-primary"
                    : "text-text-primary hover:bg-slate-50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {authItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavigate}
                className={cn(
                  "rounded-full px-4 py-3 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  item.variant === "outline"
                    ? "border border-white/70 bg-white text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)]"
                    : "bg-slate-100 text-text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
