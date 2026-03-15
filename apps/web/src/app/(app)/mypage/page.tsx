"use client";

import {
  Baby,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  ChevronRight,
  CreditCard,
  LogOut,
  Megaphone,
  Settings,
  User,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/use-protected-page";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { getRoleLabel, isOperatorRole } from "@/lib/role-ui";

const learnerMenuItems = [
  { icon: Baby, label: "자녀 관리", href: "/mypage/children" },
  { icon: BookOpen, label: "수강 내역", href: "/mypage/enrollments" },
  { icon: CreditCard, label: "결제 내역", href: "/mypage/payments" },
  { icon: BarChart3, label: "교육비 리포트", href: "/mypage/report" },
  { icon: Settings, label: "설정", href: "/mypage/settings" },
];

const operatorMenuItems = [
  { icon: Building2, label: "학원 관리", href: "/studio/academies" },
  { icon: ClipboardList, label: "반 관리", href: "/studio/classes" },
  { icon: UsersRound, label: "원생 관리", href: "/studio/students" },
  { icon: Megaphone, label: "공지 발송", href: "/studio/announcements" },
  { icon: WalletCards, label: "수납 현황", href: "/studio/payments" },
  { icon: BarChart3, label: "운영 통계", href: "/studio/statistics" },
  { icon: Settings, label: "설정", href: "/mypage/settings" },
];

interface ChildSummary {
  id: string;
  name: string;
}

interface EnrollmentSummary {
  id: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
}

interface PaymentSummary {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  effectiveDate: string;
}

interface OperatorSummary {
  metrics: {
    academyCount: number;
    classCount: number;
    activeEnrollmentCount: number;
    pendingPaymentCount: number;
    completedAmount: number;
  };
}

export default function MyPage() {
  const { user, logout } = useAuth();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const isOperator = isOperatorRole(user?.role);

  const childrenQuery = useQuery({
    queryKey: ["mypage-summary-children"],
    queryFn: () => api.get<ChildSummary[]>("/users/me/children"),
    enabled: canUseProtectedApi,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["mypage-summary-enrollments"],
    queryFn: () => api.get<EnrollmentSummary[]>("/enrollments"),
    enabled: canUseProtectedApi,
  });

  const paymentsQuery = useQuery({
    queryKey: ["mypage-summary-payments"],
    queryFn: () => api.get<PaymentSummary[]>("/payments"),
    enabled: canUseProtectedApi,
  });

  const operatorSummaryQuery = useQuery({
    queryKey: ["operator-summary"],
    queryFn: () => api.get<OperatorSummary>("/payments/operator/summary"),
    enabled: canUseProtectedApi && isOperator,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const childrenCount = childrenQuery.data?.length ?? 0;
    const activeEnrollments =
      enrollmentsQuery.data?.filter((item) => item.status === "ACTIVE").length ?? 0;
    const currentMonthSpend =
      paymentsQuery.data
        ?.filter((payment) => payment.status === "COMPLETED")
        .filter((payment) => {
          const date = new Date(payment.effectiveDate);
          return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth()
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0) ?? 0;

    const pendingPayments =
      paymentsQuery.data?.filter((payment) => payment.status === "PENDING").length ?? 0;

    return {
      childrenCount,
      activeEnrollments,
      currentMonthSpend,
      pendingPayments,
    };
  }, [childrenQuery.data, enrollmentsQuery.data, paymentsQuery.data]);

  const menuItems = useMemo(() => {
    if (isOperator) {
      return operatorMenuItems;
    }

    return learnerMenuItems;
  }, [isOperator]);

  if (!mounted) {
    return (
      <div className="px-4 py-8">
        <div className="soft-card h-48 animate-pulse rounded-[34px]" />
      </div>
    );
  }

  if (!canUseProtectedApi) {
    return (
      <div className="px-4 py-8">
        <LoginRequiredCard description="마이페이지에서 자녀, 수강, 결제 정보를 한 번에 관리할 수 있습니다." />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="soft-panel rounded-[28px] px-4 py-4 sm:rounded-[34px] sm:px-5 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#dfeeff_0%,#f7fbff_100%)]">
            <User size={20} className="text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="display-font truncate text-base font-bold tracking-[-0.03em] text-text-primary sm:text-lg">
              {user?.name ?? "로그인이 필요합니다"}
            </h1>
            <p className="mt-0.5 text-xs text-text-secondary">
              {user ? `${getRoleLabel(user.role)} 모드` : "로그인 후 시작하세요"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-primary sm:text-2xl">
              {isOperator
                ? operatorSummaryQuery.data?.metrics.academyCount ?? 0
                : stats.childrenCount}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              {isOperator ? "운영 학원" : "자녀"}
            </p>
          </Card>
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-secondary sm:text-2xl">
              {isOperator
                ? operatorSummaryQuery.data?.metrics.classCount ?? 0
                : stats.activeEnrollments}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              {isOperator ? "운영 반" : "수강 중"}
            </p>
          </Card>
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-accent sm:text-2xl">
              {isOperator
                ? operatorSummaryQuery.data?.metrics.pendingPaymentCount ?? 0
                : `${Math.round(stats.currentMonthSpend / 10000)}만`}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              {isOperator ? "입금 대기" : "이번 달"}
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {isOperator ? (
          <Card className="bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-4">
            <p className="text-sm font-semibold text-text-primary">
              강사 View 운영 메뉴가 활성화되었습니다
            </p>
            <p className="mt-1 text-xs leading-6 text-text-secondary">
              학원 관리, 반 관리, 원생 관리, 공지, 수납 흐름을 `스튜디오`에서 한 화면으로 확인할 수 있습니다.
            </p>
          </Card>
        ) : stats.pendingPayments > 0 ? (
          <Card className="bg-[linear-gradient(180deg,#fffaf3_0%,#ffffff_100%)] p-4">
            <p className="text-sm font-semibold text-text-primary">
              입금 대기 결제가 {stats.pendingPayments}건 있습니다
            </p>
            <p className="mt-1 text-xs leading-6 text-text-secondary">
              결제 내역에서 상태를 확인하고 계좌이체 또는 자동결제 일정을 점검해 주세요.
            </p>
          </Card>
        ) : null}

        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-text-primary sm:text-base">관리 메뉴</h2>

          <div className="mt-3 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-3.5 py-3 shadow-[0_8px_16px_rgba(195,200,220,0.12)] sm:rounded-[24px] sm:px-4 sm:py-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[#f7f8fc] sm:h-11 sm:w-11 sm:rounded-[18px]">
                      <Icon size={16} className="text-text-secondary" />
                    </span>
                    <span className="text-xs font-semibold text-text-primary sm:text-sm">
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-text-secondary" />
                </Link>
              );
            })}
          </div>
        </Card>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] py-3.5 text-sm text-text-secondary transition-colors hover:bg-rose-50 hover:text-rose-500"
        >
          <LogOut size={16} aria-hidden="true" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
