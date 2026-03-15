"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface LoginRequiredCardProps {
  title?: string;
  description?: string;
}

export function LoginRequiredCard({
  title = "로그인이 필요합니다",
  description = "이 페이지는 로그인 후 이용할 수 있습니다.",
}: LoginRequiredCardProps) {
  return (
    <Card className="py-12 text-center">
      <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary sm:text-2xl">
        {title}
      </h1>
      <p className="mt-2 text-xs leading-6 text-text-secondary sm:text-sm">
        {description}
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
      >
        로그인으로 이동
      </Link>
    </Card>
  );
}
