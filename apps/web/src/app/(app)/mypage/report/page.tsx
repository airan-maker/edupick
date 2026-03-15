"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronLeft, TrendingUp } from "lucide-react";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/use-protected-page";

interface PaymentReport {
  period: {
    year: number;
    month: number | null;
    label: string;
  };
  totals: {
    completedAmount: number;
    pendingAmount: number;
    refundedAmount: number;
    failedAmount: number;
    paymentCount: number;
    completedCount: number;
    pendingCount: number;
  };
  bySubject: Array<{
    subject: string;
    amount: number;
    count: number;
    color: string;
  }>;
  byAcademy: Array<{
    academyId: string;
    academyName: string;
    amount: number;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: number;
    label: string;
    amount: number;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    className: string;
    academy: { id: string; name: string };
  }>;
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

export default function ReportPage() {
  const currentDate = new Date();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const [selectedView, setSelectedView] = useState<"month" | "year">("month");

  const reportQuery = useQuery({
    queryKey: ["payment-report", currentDate.getFullYear(), selectedView],
    queryFn: () =>
      api.get<PaymentReport>("/payments/report", {
        year: currentDate.getFullYear(),
        month: selectedView === "month" ? currentDate.getMonth() + 1 : undefined,
      }),
    enabled: canUseProtectedApi,
  });

  const maxSubjectAmount = useMemo(() => {
    return Math.max(...(reportQuery.data?.bySubject.map((item) => item.amount) ?? [1]));
  }, [reportQuery.data?.bySubject]);

  const maxMonthlyAmount = useMemo(() => {
    return Math.max(...(reportQuery.data?.monthlyTrend.map((item) => item.amount) ?? [1]));
  }, [reportQuery.data?.monthlyTrend]);

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
        <LoginRequiredCard description="교육비 리포트는 로그인한 계정의 결제 데이터를 기준으로 생성됩니다." />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="flex items-center gap-2">
        <Link
          href="/mypage"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-[0_10px_18px_rgba(195,200,220,0.14)]"
          aria-label="마이페이지로 돌아가기"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary">
            교육비 리포트
          </h1>
          <p className="text-xs text-text-secondary">과목별 지출과 월별 추이를 요약합니다.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <FilterChip selected={selectedView === "month"} onClick={() => setSelectedView("month")}>
          이번 달
        </FilterChip>
        <FilterChip selected={selectedView === "year"} onClick={() => setSelectedView("year")}>
          올해 전체
        </FilterChip>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-text-primary">
            <BarChart3 size={18} />
            <h2 className="text-base font-semibold">{reportQuery.data?.period.label ?? "리포트"}</h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">실결제 금액</p>
              <p className="mt-2 text-lg font-bold text-primary">
                {formatCurrency(reportQuery.data?.totals.completedAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">대기 금액</p>
              <p className="mt-2 text-lg font-bold text-accent">
                {formatCurrency(reportQuery.data?.totals.pendingAmount ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4">
            <p className="text-sm font-semibold text-text-primary">과목별 지출</p>
            <div className="mt-4 space-y-3">
              {(reportQuery.data?.bySubject ?? []).map((subject) => (
                <div key={subject.subject}>
                  <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
                    <span>{subject.subject}</span>
                    <span>{formatCurrency(subject.amount)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(subject.amount / maxSubjectAmount) * 100}%`,
                        backgroundColor: subject.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-text-primary">
              <TrendingUp size={18} />
              <h2 className="text-base font-semibold">{currentDate.getFullYear()}년 월별 추이</h2>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {(reportQuery.data?.monthlyTrend ?? []).map((item) => (
                <div key={item.month} className="text-center">
                  <div className="flex h-28 items-end justify-center rounded-[18px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-2 py-3">
                    <div
                      className="w-full rounded-full bg-[linear-gradient(180deg,#84b9ff_0%,#69a8ff_100%)]"
                      style={{
                        height: `${maxMonthlyAmount > 0 ? (item.amount / maxMonthlyAmount) * 100 : 0}%`,
                        minHeight: item.amount > 0 ? "10%" : "6px",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-text-secondary">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-text-primary">학원별 지출</h2>
            <div className="mt-4 space-y-3">
              {(reportQuery.data?.byAcademy ?? []).slice(0, 5).map((academy) => (
                <div
                  key={academy.academyId}
                  className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{academy.academyName}</p>
                      <p className="mt-1 text-xs text-text-secondary">{academy.count}건 결제</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{formatCurrency(academy.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
