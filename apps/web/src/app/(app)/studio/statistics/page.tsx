"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronLeft, CircleDollarSign, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { isOperatorRole } from "@/lib/role-ui";

type StatisticsRange = "year" | "last_6_months" | "last_30_days";

interface OperatorStatistics {
  period: {
    range: StatisticsRange;
    year: number | null;
    label: string;
    startDate: string;
    endDate: string;
  };
  metrics: {
    academyCount: number;
    classCount: number;
    activeEnrollmentCount: number;
    pendingPaymentCount: number;
    completedAmount: number;
    pendingAmount: number;
    averageClassFillRate: number;
  };
  revenueTrend: Array<{
    label: string;
    amount: number;
  }>;
  academyBreakdown: Array<{
    academyId: string;
    academyName: string;
    classCount: number;
    activeEnrollmentCount: number;
    completedAmount: number;
    pendingAmount: number;
  }>;
  subjectBreakdown: Array<{
    subject: string;
    color: string;
    classCount: number;
    activeEnrollmentCount: number;
    completedAmount: number;
  }>;
  paymentStatus: {
    completedAmount: number;
    pendingAmount: number;
    refundedAmount: number;
    failedAmount: number;
  };
}

const rangeOptions: Array<{ value: StatisticsRange; label: string }> = [
  { value: "year", label: "연간" },
  { value: "last_6_months", label: "최근 6개월" },
  { value: "last_30_days", label: "최근 30일" },
];

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

export default function StudioStatisticsPage() {
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);
  const currentYear = new Date().getFullYear();
  const [selectedRange, setSelectedRange] = useState<StatisticsRange>("year");
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const statisticsQuery = useQuery({
    queryKey: ["operator-statistics", selectedRange, selectedYear],
    queryFn: () =>
      api.get<OperatorStatistics>("/payments/operator/statistics", {
        range: selectedRange,
        year: selectedRange === "year" ? selectedYear : undefined,
      }),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const yearOptions = useMemo(() => {
    return [currentYear - 1, currentYear];
  }, [currentYear]);

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
        <LoginRequiredCard description="운영 통계 화면은 로그인 후 이용할 수 있습니다." />
      </div>
    );
  }

  if (!isOperatorRole(user?.role)) {
    return (
      <div className="px-4 py-8">
        <Card className="py-12 text-center">
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary sm:text-2xl">
            운영 역할 전용 화면입니다
          </h1>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            강사 화면에서만 운영 통계를 확인할 수 있습니다.
          </p>
        </Card>
      </div>
    );
  }

  const statistics = statisticsQuery.data;
  const maxTrendAmount = Math.max(
    ...(statistics?.revenueTrend.map((item) => item.amount) ?? [0]),
    1,
  );
  const trendMinWidth =
    (statistics?.revenueTrend.length ?? 0) > 12 ? "900px" : "620px";

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="flex items-center gap-2">
        <Link
          href="/studio"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-[0_10px_18px_rgba(195,200,220,0.14)]"
          aria-label="스튜디오로 돌아가기"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary">
            운영 통계
          </h1>
          <p className="text-xs text-text-secondary">
            기간별 매출 추이와 과목별, 학원별 운영 지표를 확인합니다.
          </p>
        </div>
      </div>

      <Card className="mt-4 bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">조회 기간</p>
            <p className="mt-1 text-xs leading-6 text-text-secondary">
              {statistics?.period.label ?? "선택한 기간"} 기준 완료 매출 추이와 현재 미납 현황을
              함께 보여줍니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <FilterChip
                key={option.value}
                selected={selectedRange === option.value}
                onClick={() => setSelectedRange(option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {selectedRange === "year" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {yearOptions.map((year) => (
              <FilterChip
                key={year}
                selected={selectedYear === year}
                onClick={() => setSelectedYear(year)}
              >
                {year}년
              </FilterChip>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]" padding="sm">
          <p className="text-[11px] font-semibold text-text-secondary">기간 매출</p>
          <p className="mt-2 text-lg font-bold text-primary">
            {formatCurrency(statistics?.metrics.completedAmount ?? 0)}
          </p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)]" padding="sm">
          <p className="text-[11px] font-semibold text-text-secondary">현재 미납 잔액</p>
          <p className="mt-2 text-lg font-bold text-accent">
            {formatCurrency(statistics?.metrics.pendingAmount ?? 0)}
          </p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)]" padding="sm">
          <p className="text-[11px] font-semibold text-text-secondary">재원생</p>
          <p className="mt-2 text-lg font-bold text-secondary">
            {statistics?.metrics.activeEnrollmentCount ?? 0}명
          </p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)]" padding="sm">
          <p className="text-[11px] font-semibold text-text-secondary">평균 충원율</p>
          <p className="mt-2 text-lg font-bold text-text-primary">
            {statistics?.metrics.averageClassFillRate ?? 0}%
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text-primary">매출 추이</h2>
          </div>

          {statisticsQuery.error instanceof Error ? (
            <p className="mt-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {statisticsQuery.error.message}
            </p>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <div
              className="flex items-end gap-3"
              style={{ minWidth: trendMinWidth }}
            >
              {(statistics?.revenueTrend ?? []).map((item, index) => {
                const height = `${Math.max((item.amount / maxTrendAmount) * 180, 10)}px`;

                return (
                  <div key={`${item.label}-${index}`} className="flex min-w-[44px] flex-1 flex-col items-center">
                    <p className="mb-2 text-[11px] font-semibold text-text-secondary">
                      {item.amount > 0 ? `${Math.round(item.amount / 10000)}만` : "0"}
                    </p>
                    <div
                      className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#81b7ff_0%,#6aa8ff_100%)]"
                      style={{ height }}
                    />
                    <p className="mt-3 text-xs font-semibold text-text-secondary">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign size={18} className="text-secondary" />
            <h2 className="text-base font-semibold text-text-primary">수납 상태</h2>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">기간 완료</p>
              <p className="mt-2 text-lg font-bold text-secondary">
                {formatCurrency(statistics?.paymentStatus.completedAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">현재 미납</p>
              <p className="mt-2 text-lg font-bold text-accent">
                {formatCurrency(statistics?.paymentStatus.pendingAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">기간 환불 / 실패</p>
              <p className="mt-2 text-lg font-bold text-text-primary">
                {formatCurrency(
                  (statistics?.paymentStatus.refundedAmount ?? 0) +
                    (statistics?.paymentStatus.failedAmount ?? 0),
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text-primary">학원별 현황</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(statistics?.academyBreakdown ?? []).length === 0 ? (
              <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                집계할 학원 데이터가 없습니다.
              </div>
            ) : (
              statistics?.academyBreakdown.map((academy) => (
                <div
                  key={academy.academyId}
                  className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {academy.academyName}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        반 {academy.classCount}개 · 재원생 {academy.activeEnrollmentCount}명
                      </p>
                    </div>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(academy.completedAmount)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-text-secondary">
                    현재 미납 {formatCurrency(academy.pendingAmount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-secondary" />
            <h2 className="text-base font-semibold text-text-primary">과목별 매출</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(statistics?.subjectBreakdown ?? []).length === 0 ? (
              <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                집계할 과목 데이터가 없습니다.
              </div>
            ) : (
              statistics?.subjectBreakdown.map((subject) => (
                <div
                  key={subject.subject}
                  className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="mt-1 h-3 w-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {subject.subject}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          반 {subject.classCount}개 · 재원생 {subject.activeEnrollmentCount}명
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-secondary">
                      {formatCurrency(subject.completedAmount)}
                    </p>
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
