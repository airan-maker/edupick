"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, CreditCard, ReceiptText } from "lucide-react";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/use-protected-page";

interface PaymentItem {
  id: string;
  enrollmentId: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  paidAt: string | null;
  createdAt: string;
  portonePaymentId: string | null;
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
  effectiveDate: string;
}

const statusFilters = ["ALL", "COMPLETED", "PENDING", "REFUNDED"] as const;

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function getStatusBadge(status: PaymentItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return { label: "결제 완료", variant: "verified" as const };
    case "PENDING":
      return { label: "입금 대기", variant: "new" as const };
    case "REFUNDED":
      return { label: "환불", variant: "popular" as const };
    default:
      return { label: "실패", variant: "default" as const };
  }
}

export default function PaymentsPage() {
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const [selectedStatus, setSelectedStatus] = useState<(typeof statusFilters)[number]>("ALL");

  const paymentsQuery = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => api.get<PaymentItem[]>("/payments"),
    enabled: canUseProtectedApi,
  });

  const filteredPayments = useMemo(() => {
    const payments = paymentsQuery.data ?? [];
    if (selectedStatus === "ALL") {
      return payments;
    }

    return payments.filter((payment) => payment.status === selectedStatus);
  }, [paymentsQuery.data, selectedStatus]);

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
        <LoginRequiredCard description="결제 상태와 최근 납부 내역을 확인하려면 로그인해 주세요." />
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
            결제 내역
          </h1>
          <p className="text-xs text-text-secondary">최근 납부 상태와 반별 결제를 확인합니다.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <FilterChip
            key={status}
            selected={selectedStatus === status}
            onClick={() => setSelectedStatus(status)}
          >
            {status === "ALL" ? "전체" : status === "COMPLETED" ? "완료" : status === "PENDING" ? "대기" : "환불"}
          </FilterChip>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filteredPayments.length === 0 ? (
          <Card className="px-4 py-12 text-center text-sm text-text-secondary">
            조건에 맞는 결제 내역이 없습니다.
          </Card>
        ) : (
          filteredPayments.map((payment) => {
            const badge = getStatusBadge(payment.status);

            return (
              <Card key={payment.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-text-primary">
                        {payment.className}
                      </h2>
                      <Badge>{payment.subject}</Badge>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-text-secondary">
                      <p className="flex items-center gap-1.5">
                        <ReceiptText size={12} />
                        {payment.academy.name}
                        {payment.child ? ` · ${payment.child.name}` : ""}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CreditCard size={12} />
                        {formatDate(payment.effectiveDate)} · {formatCurrency(payment.amount)}
                      </p>
                      {payment.portonePaymentId ? (
                        <p>결제 식별자: {payment.portonePaymentId}</p>
                      ) : null}
                    </div>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-primary">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
