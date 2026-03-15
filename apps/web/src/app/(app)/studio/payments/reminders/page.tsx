"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, History, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { isOperatorRole } from "@/lib/role-ui";

type ReminderTrigger = "all" | "manual" | "auto";

interface MyClassOption {
  id: string;
  name: string;
  subject: string;
  academy: {
    id: string;
    name: string;
  };
}

interface ReminderLogsResponse {
  summary: {
    totalCount: number;
    manualCount: number;
    autoCount: number;
  };
  items: Array<{
    id: string;
    trigger: "manual" | "auto";
    title: string;
    body: string;
    createdAt: string;
    guardian: {
      id: string;
      name: string | null;
      phone: string | null;
    };
    class: {
      id: string;
      name: string;
    };
    academy: {
      id: string;
      name: string;
    };
    student: {
      id: string | null;
      name: string;
    };
    amount: number;
    lastReminderAt: string | null;
  }>;
}

const triggerOptions: Array<{ value: ReminderTrigger; label: string }> = [
  { value: "all", label: "전체" },
  { value: "manual", label: "수동" },
  { value: "auto", label: "자동" },
];

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function StudioPaymentRemindersPage() {
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);
  const [selectedClassId, setSelectedClassId] = useState("ALL");
  const [trigger, setTrigger] = useState<ReminderTrigger>("all");
  const [search, setSearch] = useState("");

  const classesQuery = useQuery({
    queryKey: ["my-classes", "reminder-logs"],
    queryFn: () => api.get<MyClassOption[]>("/classes/mine"),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const logsQuery = useQuery({
    queryKey: ["unpaid-reminder-logs", selectedClassId, trigger, search],
    queryFn: () =>
      api.get<ReminderLogsResponse>("/notifications/unpaid-reminders/mine", {
        classId: selectedClassId === "ALL" ? undefined : selectedClassId,
        trigger,
        search: search.trim() || undefined,
      }),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const classLabel = useMemo(() => {
    if (selectedClassId === "ALL") {
      return "전체 반";
    }

    return (
      classesQuery.data?.find((classItem) => classItem.id === selectedClassId)?.name ??
      "선택 반"
    );
  }, [classesQuery.data, selectedClassId]);

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
        <LoginRequiredCard description="미납 알림 로그는 로그인 후 이용할 수 있습니다." />
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
            강사 화면에서만 미납 알림 로그를 확인할 수 있습니다.
          </p>
        </Card>
      </div>
    );
  }

  const summary = logsQuery.data?.summary;

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="flex items-center gap-2">
        <Link
          href="/studio/payments"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-[0_10px_18px_rgba(195,200,220,0.14)]"
          aria-label="수납 현황으로 돌아가기"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary">
            미납 알림 로그
          </h1>
          <p className="text-xs text-text-secondary">
            자동/수동 발송 내역과 반별 알림 이력을 확인합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-primary">{summary?.totalCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">조회 로그</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-accent">{summary?.manualCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">수동 발송</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-secondary">{summary?.autoCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">자동 발송</p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center gap-2">
          <History size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-text-primary">필터</h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">반</span>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
            >
              <option value="ALL">전체 반</option>
              {classesQuery.data?.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">검색</span>
            <div className="mt-1.5 flex items-center rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
              <Search size={16} className="text-text-secondary" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="ml-2 w-full bg-transparent text-sm text-text-primary outline-none"
                placeholder="원생명, 보호자명, 반명 검색"
              />
            </div>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {triggerOptions.map((option) => (
            <FilterChip
              key={option.value}
              selected={trigger === option.value}
              onClick={() => setTrigger(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {logsQuery.error instanceof Error ? (
          <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
            {logsQuery.error.message}
          </p>
        ) : null}

        {(logsQuery.data?.items ?? []).length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-text-secondary">
            {classLabel} 기준으로 표시할 미납 알림 로그가 없습니다.
          </Card>
        ) : (
          logsQuery.data?.items.map((item) => (
            <Card
              key={item.id}
              className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{item.student.name}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.trigger === "auto"
                          ? "bg-emerald-50 text-secondary"
                          : "bg-blue-50 text-primary"
                      }`}
                    >
                      {item.trigger === "auto" ? "자동" : "수동"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {item.academy.name} · {item.class.name}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    보호자 {item.guardian.name ?? "미등록"}
                    {item.guardian.phone ? ` · ${item.guardian.phone}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-accent">
                    {formatCurrency(item.amount)}
                  </p>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>

              <p className="mt-3 rounded-[18px] bg-white/80 px-4 py-3 text-sm leading-6 text-text-primary">
                {item.body}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
