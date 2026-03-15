"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Megaphone,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { getRoleLabel, isOperatorRole } from "@/lib/role-ui";
import { api } from "@/lib/api";

interface OperatorSummary {
  metrics: {
    academyCount: number;
    classCount: number;
    activeEnrollmentCount: number;
    pendingPaymentCount: number;
    completedAmount: number;
  };
  academies: Array<{
    id: string;
    name: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
    createdAt: string;
    paidAt: string | null;
    className: string;
    subject: string;
    academy: {
      id: string;
      name: string;
    };
    child: {
      id: string;
      name: string;
    } | null;
  }>;
  pendingPayments: Array<{
    id: string;
    amount: number;
    createdAt: string;
    className: string;
    academy: {
      id: string;
      name: string;
    };
    child: {
      id: string;
      name: string;
    } | null;
  }>;
}

const operatorQuickActions = [
  {
    href: "/studio/academies",
    title: "학원 관리",
    description: "학원 정보, 카테고리, 셔틀 정보를 관리합니다.",
    icon: Building2,
  },
  {
    href: "/studio/classes",
    title: "반 관리",
    description: "시간표, 정원, 수강료와 반 운영 상태를 관리합니다.",
    icon: ClipboardList,
  },
  {
    href: "/studio/students",
    title: "원생 관리",
    description: "재원생, 보호자, 최근 수납 상태를 함께 확인합니다.",
    icon: UsersRound,
  },
  {
    href: "/studio/announcements",
    title: "공지 발송",
    description: "수업 변경이나 준비물 공지를 즉시 발송합니다.",
    icon: Megaphone,
  },
  {
    href: "/studio/payments",
    title: "수납 현황",
    description: "입금 대기, 완료 건수와 최근 결제를 확인합니다.",
    icon: WalletCards,
  },
  {
    href: "/studio/statistics",
    title: "운영 통계",
    description: "월별 매출 추이와 학원·과목별 현황을 확인합니다.",
    icon: BarChart3,
  },
  {
    href: "/calendar",
    title: "운영 일정",
    description: "반 일정과 수업 시간을 주간/월간으로 검토합니다.",
    icon: CalendarClock,
  },
] as const;

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

export default function StudioPage() {
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);

  const summaryQuery = useQuery({
    queryKey: ["operator-summary"],
    queryFn: () => api.get<OperatorSummary>("/payments/operator/summary"),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  if (!mounted) {
    return (
      <div className="px-4 py-8">
        <div className="soft-card h-56 animate-pulse rounded-[34px]" />
      </div>
    );
  }

  if (!canUseProtectedApi) {
    return (
      <div className="px-4 py-8">
        <LoginRequiredCard description="운영 화면은 로그인 후 이용할 수 있습니다." />
      </div>
    );
  }

  if (!isOperatorRole(user?.role)) {
    return (
      <div className="px-4 py-8">
        <Card className="py-12 text-center">
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary sm:text-2xl">
            운영 모드 전용 화면입니다
          </h1>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            설정에서 `강사 View`로 전환하면 이 화면을 사용할 수 있습니다.
          </p>
          <Link
            href="/mypage/settings"
            className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
          >
            설정으로 이동
          </Link>
        </Card>
      </div>
    );
  }

  const metrics = summaryQuery.data?.metrics;

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="soft-panel rounded-[30px] px-5 py-5">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-primary">
          {getRoleLabel(user?.role)} 모드
        </span>
        <h1 className="display-font mt-3 text-2xl font-bold tracking-[-0.05em] text-text-primary">
          강사 스튜디오
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-7 text-text-secondary">
          학원, 반, 원생, 공지, 수납 흐름을 한 화면에서 관리하는 강사 작업 공간입니다.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-primary sm:text-2xl">
              {metrics?.academyCount ?? 0}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">운영 학원</p>
          </Card>
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-secondary sm:text-2xl">
              {metrics?.classCount ?? 0}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">운영 반</p>
          </Card>
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-accent sm:text-2xl">
              {metrics?.pendingPaymentCount ?? 0}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">입금 대기</p>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {operatorQuickActions.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-blue-50 text-primary">
                      <Icon size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                      <p className="mt-1 text-xs leading-6 text-text-secondary">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-text-secondary" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UsersRound size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text-primary">운영 요약</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">활성 수강</p>
              <p className="mt-2 text-lg font-bold text-primary">
                {metrics?.activeEnrollmentCount ?? 0}명
              </p>
            </div>
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">누적 완료 결제</p>
              <p className="mt-2 text-lg font-bold text-secondary">
                {formatCurrency(metrics?.completedAmount ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4">
            <p className="text-sm font-semibold text-text-primary">운영 학원</p>
            <div className="mt-3 space-y-2">
              {(summaryQuery.data?.academies ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">아직 연결된 학원이 없습니다.</p>
              ) : (
                summaryQuery.data?.academies.map((academy) => (
                  <div
                    key={academy.id}
                    className="rounded-[18px] bg-white/80 px-4 py-3 text-sm font-medium text-text-primary"
                  >
                    {academy.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-text-primary">최근 결제</h2>
          <div className="mt-4 space-y-3">
            {(summaryQuery.data?.recentPayments ?? []).length === 0 ? (
              <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                아직 운영 결제 데이터가 없습니다.
              </div>
            ) : (
              summaryQuery.data?.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {payment.className}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {payment.academy.name}
                        {payment.child ? ` · ${payment.child.name}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {formatDate(payment.paidAt ?? payment.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
