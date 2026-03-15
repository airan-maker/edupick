"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Clock3, CreditCard, MapPin, UserRound, XCircle } from "lucide-react";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/use-protected-page";

interface EnrollmentItem {
  id: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  autoPayEnabled: boolean;
  nextPaymentDate: string | null;
  enrolledAt: string;
  cancelledAt: string | null;
  child: {
    id: string;
    name: string;
  } | null;
  class: {
    id: string;
    name: string;
    subject: string;
    monthlyFee: number;
    schedules: Array<{
      id: string;
      dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
      startTime: string;
      endTime: string;
    }>;
    academy: {
      id: string;
      name: string;
      address: string;
    };
  };
}

const dayMap: Record<EnrollmentItem["class"]["schedules"][number]["dayOfWeek"], string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function formatSchedule(
  schedules: EnrollmentItem["class"]["schedules"]
) {
  return schedules
    .map((schedule) => `${dayMap[schedule.dayOfWeek]} ${schedule.startTime}-${schedule.endTime}`)
    .join(" · ");
}

export default function EnrollmentsPage() {
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();

  const enrollmentsQuery = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => api.get<EnrollmentItem[]>("/enrollments"),
    enabled: canUseProtectedApi,
  });

  const cancelMutation = useMutation({
    mutationFn: async (enrollmentId: string) => api.patch(`/enrollments/${enrollmentId}/cancel`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["mypage-summary-enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const summary = useMemo(() => {
    const enrollments = enrollmentsQuery.data ?? [];
    return {
      active: enrollments.filter((item) => item.status === "ACTIVE").length,
      cancelled: enrollments.filter((item) => item.status === "CANCELLED").length,
      monthlyFee: enrollments
        .filter((item) => item.status === "ACTIVE")
        .reduce((sum, item) => sum + item.class.monthlyFee, 0),
    };
  }, [enrollmentsQuery.data]);

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
        <LoginRequiredCard description="신청한 반과 다음 결제 일정을 확인하려면 로그인해 주세요." />
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
            수강 내역
          </h1>
          <p className="text-xs text-text-secondary">현재 수강 중인 반과 취소 내역을 확인합니다.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-primary">{summary.active}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">수강 중</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-accent">{summary.cancelled}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">취소됨</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-secondary">{Math.round(summary.monthlyFee / 10000)}만</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">월 수강료</p>
        </Card>
      </div>

      <div className="mt-4 space-y-3">
        {(enrollmentsQuery.data ?? []).length === 0 ? (
          <Card className="px-4 py-12 text-center text-sm text-text-secondary">
            아직 수강 신청한 반이 없습니다.
          </Card>
        ) : (
          (enrollmentsQuery.data ?? []).map((enrollment) => {
            const isActive = enrollment.status === "ACTIVE";

            return (
              <Card key={enrollment.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-text-primary">
                        {enrollment.class.name}
                      </h2>
                      <Badge>{enrollment.class.subject}</Badge>
                      <Badge variant={isActive ? "verified" : "popular"}>
                        {isActive ? "수강 중" : "취소됨"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium text-text-primary">
                      {enrollment.class.academy.name}
                    </p>
                    <div className="mt-3 space-y-1.5 text-xs text-text-secondary">
                      <p className="flex items-center gap-1.5">
                        <Clock3 size={12} />
                        {formatSchedule(enrollment.class.schedules)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin size={12} />
                        {enrollment.class.academy.address}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <UserRound size={12} />
                        {enrollment.child?.name ?? "본인"} · 신청일 {formatDate(enrollment.enrolledAt)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CreditCard size={12} />
                        월 {formatCurrency(enrollment.class.monthlyFee)} · 다음 결제 {formatDate(enrollment.nextPaymentDate)}
                      </p>
                    </div>
                  </div>

                  {isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(enrollment.id)}
                    >
                      <XCircle size={14} />
                      수강 취소
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
