"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  ChevronLeft,
  CircleAlert,
  History,
  Send,
  WalletCards,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { isOperatorRole } from "@/lib/role-ui";

interface OperatorSummary {
  metrics: {
    academyCount: number;
    classCount: number;
    activeEnrollmentCount: number;
    pendingPaymentCount: number;
    completedAmount: number;
  };
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
    user: {
      id: string;
      name: string | null;
      phone: string | null;
    };
  }>;
  pendingPayments: Array<{
    id: string;
    amount: number;
    createdAt: string;
    lastReminderAt: string | null;
    className: string;
    academy: {
      id: string;
      name: string;
    };
    child: {
      id: string;
      name: string;
    } | null;
    user: {
      id: string;
      name: string | null;
      phone: string | null;
    };
  }>;
}

interface UnpaidReminderResult {
  sentCount: number;
  skippedCount: number;
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function getStudentLabel(payment: {
  child: {
    id: string;
    name: string;
  } | null;
  user: {
    name: string | null;
  };
}) {
  return payment.child?.name ?? payment.user.name ?? "수강생";
}

export default function StudioPaymentsPage() {
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);

  const summaryQuery = useQuery({
    queryKey: ["operator-summary"],
    queryFn: () => api.get<OperatorSummary>("/payments/operator/summary"),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });
  const sendReminderMutation = useMutation({
    mutationFn: async (paymentIds: string[]) =>
      api.post<UnpaidReminderResult>("/notifications/unpaid-reminder", {
        paymentIds,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operator-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["managed-students"] });
    },
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
        <LoginRequiredCard description="수납 화면은 로그인 후 이용할 수 있습니다." />
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
            강사 View에서만 수납 현황을 확인할 수 있습니다.
          </p>
        </Card>
      </div>
    );
  }

  const metrics = summaryQuery.data?.metrics;
  const pendingPayments = summaryQuery.data?.pendingPayments ?? [];

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
            수납 현황
          </h1>
          <p className="text-xs text-text-secondary">운영 중인 반의 결제 요약과 최근 수납 내역입니다.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-primary">{metrics?.pendingPaymentCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">입금 대기</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-secondary">
            {formatCurrency(metrics?.completedAmount ?? 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">완료 누적</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-accent">{metrics?.activeEnrollmentCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">활성 수강</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CircleAlert size={18} className="text-accent" />
              <h2 className="text-base font-semibold text-text-primary">입금 대기</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/studio/payments/reminders"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3.5 py-2 text-sm text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)] backdrop-blur-md"
              >
                <History size={14} />
                발송 로그
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={pendingPayments.length === 0 || sendReminderMutation.isPending}
                onClick={() =>
                  sendReminderMutation.mutate(pendingPayments.map((payment) => payment.id))
                }
              >
                <Send size={14} />
                {sendReminderMutation.isPending ? "발송 중..." : "전체 알림"}
              </Button>
            </div>
          </div>

          {sendReminderMutation.data ? (
            <p className="mt-3 rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              미납 알림 {sendReminderMutation.data.sentCount}건을 발송했습니다.
              {sendReminderMutation.data.skippedCount > 0
                ? ` 이미 처리된 ${sendReminderMutation.data.skippedCount}건은 제외했습니다.`
                : ""}
            </p>
          ) : null}

          {sendReminderMutation.error instanceof Error ? (
            <p className="mt-3 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {sendReminderMutation.error.message}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {pendingPayments.length === 0 ? (
              <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                현재 입금 대기 건이 없습니다.
              </div>
            ) : (
              pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {payment.className}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {payment.academy.name} · {getStudentLabel(payment)}
                      </p>
                      {payment.user.phone ? (
                        <p className="mt-1 text-[11px] text-text-secondary">
                          보호자 연락처 {payment.user.phone}
                        </p>
                      ) : null}
                      {payment.lastReminderAt ? (
                        <p className="mt-1 text-[11px] text-text-secondary">
                          마지막 알림 {formatDate(payment.lastReminderAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-accent">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        {formatDate(payment.createdAt)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 gap-1.5 px-0 text-accent"
                        disabled={sendReminderMutation.isPending}
                        onClick={() => sendReminderMutation.mutate([payment.id])}
                      >
                        <Send size={14} />
                        알림 발송
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <WalletCards size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text-primary">최근 결제</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(summaryQuery.data?.recentPayments ?? []).length === 0 ? (
              <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                아직 최근 결제 내역이 없습니다.
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
                        {payment.academy.name} · {getStudentLabel(payment)}
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

      <Card className="mt-4 bg-[linear-gradient(180deg,#fffaf3_0%,#ffffff_100%)] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-accent">
            <BadgeDollarSign size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">운영 확장</p>
            <p className="mt-1 text-xs leading-6 text-text-secondary">
              미납 알림은 이 화면에서 바로 발송할 수 있고, 월별 매출 추이와 과목별 통계는
              운영 통계 화면에서 확인할 수 있습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/studio/statistics"
                className="inline-flex text-xs font-semibold text-primary"
              >
                운영 통계로 이동
              </Link>
              <Link
                href="/studio/payments/reminders"
                className="inline-flex text-xs font-semibold text-primary"
              >
                미납 알림 로그 보기
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
