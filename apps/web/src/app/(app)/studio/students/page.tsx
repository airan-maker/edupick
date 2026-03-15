"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  CircleAlert,
  GraduationCap,
  NotebookPen,
  Search,
  UsersRound,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { isOperatorRole } from "@/lib/role-ui";

type EnrollmentStatus = "ACTIVE" | "PAUSED" | "CANCELLED";
type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

interface OwnedAcademy {
  id: string;
  name: string;
}

interface MyClassOption {
  id: string;
  name: string;
  subject: string;
  academy: {
    id: string;
    name: string;
  };
}

interface ManagedStudentsResponse {
  summary: {
    totalCount: number;
    activeCount: number;
    pausedCount: number;
    cancelledCount: number;
    pendingPaymentCount: number;
    autoPayEnabledCount: number;
  };
  items: Array<{
    id: string;
    status: EnrollmentStatus;
    enrolledAt: string;
    cancelledAt: string | null;
    autoPayEnabled: boolean;
    memo: string | null;
    nextPaymentDate: string | null;
    student: {
      id: string;
      name: string;
      grade: string | null;
      schoolName: string | null;
      kind: "child" | "self";
    };
    guardian: {
      id: string;
      name: string | null;
      phone: string | null;
    };
    class: {
      id: string;
      name: string;
      subject: string;
      ageGroup: string | null;
      schedules: Array<{
        id: string;
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
      }>;
    };
    academy: {
      id: string;
      name: string;
    };
    latestPayment: {
      id: string;
      amount: number;
      status: PaymentStatus;
      effectiveDate: string;
      lastReminderAt: string | null;
    } | null;
  }>;
}

type ManagedStudentItem = ManagedStudentsResponse["items"][number];

interface DetailFormState {
  status: EnrollmentStatus;
  autoPayEnabled: boolean;
  memo: string;
}

type MemoFilter = "ALL" | "WITH_MEMO" | "WITHOUT_MEMO";

const statusOptions: Array<{ value: "ALL" | EnrollmentStatus; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "ACTIVE", label: "재원" },
  { value: "PAUSED", label: "일시중지" },
  { value: "CANCELLED", label: "취소" },
];

const editableStatusOptions: Array<{ value: EnrollmentStatus; label: string }> = [
  { value: "ACTIVE", label: "재원" },
  { value: "PAUSED", label: "일시중지" },
  { value: "CANCELLED", label: "취소" },
];

const statusLabelMap: Record<EnrollmentStatus, string> = {
  ACTIVE: "재원",
  PAUSED: "일시중지",
  CANCELLED: "취소",
};

const dayLabelMap: Record<DayOfWeek, string> = {
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

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function formatSchedule(schedules: ManagedStudentItem["class"]["schedules"]) {
  if (schedules.length === 0) {
    return "일정 미등록";
  }

  return schedules
    .map((schedule) => {
      return `${dayLabelMap[schedule.dayOfWeek]} ${schedule.startTime}-${schedule.endTime}`;
    })
    .join(" · ");
}

function getPaymentTone(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-accent";
    case "COMPLETED":
      return "bg-emerald-50 text-secondary";
    case "FAILED":
      return "bg-rose-50 text-rose-500";
    case "REFUNDED":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "미납";
    case "COMPLETED":
      return "완료";
    case "FAILED":
      return "실패";
    case "REFUNDED":
      return "환불";
    default:
      return status;
  }
}

function toDetailForm(item: ManagedStudentItem): DetailFormState {
  return {
    status: item.status,
    autoPayEnabled: item.autoPayEnabled,
    memo: item.memo ?? "",
  };
}

export default function StudioStudentsPage() {
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);
  const [selectedAcademyId, setSelectedAcademyId] = useState("ALL");
  const [selectedClassId, setSelectedClassId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnrollmentStatus>("ACTIVE");
  const [memoFilter, setMemoFilter] = useState<MemoFilter>("ALL");
  const [search, setSearch] = useState("");
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
  const [detailForm, setDetailForm] = useState<DetailFormState>({
    status: "ACTIVE",
    autoPayEnabled: true,
    memo: "",
  });

  const academiesQuery = useQuery({
    queryKey: ["my-academies", "students"],
    queryFn: () => api.get<OwnedAcademy[]>("/academies/mine"),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const classesQuery = useQuery({
    queryKey: ["my-classes", "students", selectedAcademyId],
    queryFn: () =>
      api.get<MyClassOption[]>("/classes/mine", {
        academyId: selectedAcademyId === "ALL" ? undefined : selectedAcademyId,
      }),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const studentsQuery = useQuery({
    queryKey: ["managed-students", selectedAcademyId, selectedClassId, statusFilter],
    queryFn: () =>
      api.get<ManagedStudentsResponse>("/enrollments/operator/students", {
        academyId: selectedAcademyId === "ALL" ? undefined : selectedAcademyId,
        classId: selectedClassId === "ALL" ? undefined : selectedClassId,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingEnrollmentId) {
        throw new Error("수정 대상을 찾을 수 없습니다.");
      }

      return api.patch<ManagedStudentItem>(
        `/enrollments/${editingEnrollmentId}/operator`,
        {
          status: detailForm.status,
          autoPayEnabled: detailForm.autoPayEnabled,
          memo: detailForm.memo,
        },
      );
    },
    onSuccess: () => {
      setEditingEnrollmentId(null);
      void queryClient.invalidateQueries({ queryKey: ["managed-students"] });
      void queryClient.invalidateQueries({ queryKey: ["operator-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["operator-statistics"] });
    },
  });

  useEffect(() => {
    if (!classesQuery.data?.some((classItem) => classItem.id === selectedClassId)) {
      setSelectedClassId("ALL");
    }
  }, [classesQuery.data, selectedClassId]);

  const academySummary = useMemo(() => {
    const academies = academiesQuery.data ?? [];
    const classes = classesQuery.data ?? [];

    return {
      academyCount: academies.length,
      classCount: classes.length,
    };
  }, [academiesQuery.data, classesQuery.data]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (studentsQuery.data?.items ?? []).filter((item) => {
      const hasMemo = item.memo?.trim().length ? true : false;

      if (memoFilter === "WITH_MEMO" && !hasMemo) {
        return false;
      }

      if (memoFilter === "WITHOUT_MEMO" && hasMemo) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        item.student.name,
        item.guardian.name ?? "",
        item.class.name,
        item.class.subject,
        item.memo ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [memoFilter, search, studentsQuery.data?.items]);

  function startEdit(item: ManagedStudentItem) {
    setEditingEnrollmentId(item.id);
    setDetailForm(toDetailForm(item));
  }

  function cancelEdit() {
    setEditingEnrollmentId(null);
    setDetailForm({
      status: "ACTIVE",
      autoPayEnabled: true,
      memo: "",
    });
  }

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
        <LoginRequiredCard description="원생 관리 화면은 로그인 후 이용할 수 있습니다." />
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
            강사 화면에서만 원생 관리 기능을 사용할 수 있습니다.
          </p>
        </Card>
      </div>
    );
  }

  const summary = studentsQuery.data?.summary;

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
            원생 관리
          </h1>
          <p className="text-xs text-text-secondary">
            반별 재원생, 보호자, 최근 수납 상태를 한 번에 확인하고 바로 수정합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-primary">{summary?.activeCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">재원생</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-accent">{summary?.pendingPaymentCount ?? 0}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">미납 포함</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-secondary">
            {summary?.autoPayEnabledCount ?? 0}
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">자동결제</p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center gap-2">
          <GraduationCap size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-text-primary">필터</h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">학원</span>
            <select
              value={selectedAcademyId}
              onChange={(event) => setSelectedAcademyId(event.target.value)}
              className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
            >
              <option value="ALL">전체 학원</option>
              {academiesQuery.data?.map((academy) => (
                <option key={academy.id} value={academy.id}>
                  {academy.name}
                </option>
              ))}
            </select>
          </label>

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
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-text-secondary">검색</span>
          <div className="mt-1.5 flex items-center rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
            <Search size={16} className="text-text-secondary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="ml-2 w-full bg-transparent text-sm text-text-primary outline-none"
              placeholder="원생명, 보호자명, 반명, 메모 검색"
            />
          </div>
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <FilterChip
              key={option.value}
              selected={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { value: "ALL", label: "메모 전체" },
            { value: "WITH_MEMO", label: "메모 있음" },
            { value: "WITHOUT_MEMO", label: "메모 없음" },
          ].map((option) => (
            <FilterChip
              key={option.value}
              selected={memoFilter === option.value}
              onClick={() => setMemoFilter(option.value as MemoFilter)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UsersRound size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text-primary">운영 기준</h2>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">운영 학원</p>
              <p className="mt-2 text-lg font-bold text-primary">
                {academySummary.academyCount}곳
              </p>
            </div>
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">운영 반</p>
              <p className="mt-2 text-lg font-bold text-secondary">
                {academySummary.classCount}개
              </p>
            </div>
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] p-4">
              <p className="text-xs font-semibold text-text-secondary">검색 결과</p>
              <p className="mt-2 text-lg font-bold text-accent">
                {filteredItems.length}명
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {studentsQuery.error instanceof Error ? (
            <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {studentsQuery.error.message}
            </p>
          ) : null}

          {filteredItems.length === 0 ? (
            <Card className="px-4 py-10 text-center text-sm text-text-secondary">
              조건에 맞는 원생이 없습니다.
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card
                key={item.id}
                className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-text-primary">
                        {item.student.name}
                      </p>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {statusLabelMap[item.status]}
                      </span>
                      {item.latestPayment ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPaymentTone(
                            item.latestPayment.status,
                          )}`}
                        >
                          {getPaymentStatusLabel(item.latestPayment.status)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {item.academy.name} · {item.class.name} · {item.class.subject}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      보호자 {item.guardian.name ?? "미등록"}
                      {item.guardian.phone ? ` · ${item.guardian.phone}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-text-secondary">등록일</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">
                      {formatDate(item.enrolledAt)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1.5"
                      onClick={() => startEdit(item)}
                    >
                      <NotebookPen size={14} />
                      {editingEnrollmentId === item.id ? "편집 중" : "상세 수정"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] bg-white/80 px-4 py-3">
                    <p className="text-[11px] font-semibold text-text-secondary">학교 / 학년</p>
                    <p className="mt-1 text-sm text-text-primary">
                      {item.student.schoolName ?? "학교 미등록"}
                      {item.student.grade ? ` · ${item.student.grade}` : ""}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-white/80 px-4 py-3">
                    <p className="text-[11px] font-semibold text-text-secondary">수업 일정</p>
                    <p className="mt-1 text-sm text-text-primary">
                      {formatSchedule(item.class.schedules)}
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-white/80 px-4 py-3">
                    <p className="text-[11px] font-semibold text-text-secondary">다음 결제</p>
                    <p className="mt-1 text-sm text-text-primary">
                      {item.nextPaymentDate ? formatDate(item.nextPaymentDate) : "미정"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="text-text-secondary">
                      자동결제 {item.autoPayEnabled ? "활성" : "비활성"}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      메모 {item.memo?.trim().length ? item.memo : "없음"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-text-primary">
                      {item.latestPayment
                        ? `${formatCurrency(item.latestPayment.amount)} · ${formatDate(
                            item.latestPayment.effectiveDate,
                          )}`
                        : "결제 이력 없음"}
                    </p>
                    {item.latestPayment?.lastReminderAt ? (
                      <p className="mt-1 text-xs text-text-secondary">
                        마지막 알림 {formatDate(item.latestPayment.lastReminderAt)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {item.latestPayment?.status === "PENDING" ? (
                  <div className="mt-3 rounded-[18px] bg-amber-50 px-4 py-3 text-xs leading-6 text-accent">
                    <div className="flex items-start gap-2">
                      <CircleAlert size={14} className="mt-1 shrink-0" />
                      <p>
                        최근 결제가 미납 상태입니다. 수납 현황 화면에서 알림을 발송하거나
                        자동 발송 이력을 확인할 수 있습니다.
                      </p>
                    </div>
                  </div>
                ) : null}

                {editingEnrollmentId === item.id ? (
                  <div className="mt-4 rounded-[22px] bg-white/82 p-4 shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-text-secondary">
                          수강 상태
                        </span>
                        <select
                          value={detailForm.status}
                          onChange={(event) =>
                            setDetailForm((current) => ({
                              ...current,
                              status: event.target.value as EnrollmentStatus,
                            }))
                          }
                          className="mt-1.5 w-full rounded-[16px] border border-white/70 bg-white px-4 py-3 text-sm text-text-primary outline-none"
                        >
                          {editableStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-3 rounded-[16px] border border-white/70 bg-white px-4 py-3 text-sm text-text-primary">
                        <input
                          type="checkbox"
                          checked={detailForm.autoPayEnabled}
                          onChange={(event) =>
                            setDetailForm((current) => ({
                              ...current,
                              autoPayEnabled: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        자동결제 사용
                      </label>
                    </div>

                    <label className="mt-3 block">
                      <span className="text-xs font-semibold text-text-secondary">
                        운영 메모
                      </span>
                      <textarea
                        value={detailForm.memo}
                        onChange={(event) =>
                          setDetailForm((current) => ({
                            ...current,
                            memo: event.target.value,
                          }))
                        }
                        className="mt-1.5 min-h-28 w-full rounded-[16px] border border-white/70 bg-white px-4 py-3 text-sm leading-6 text-text-primary outline-none"
                        placeholder="예: 결제 안내는 오후 6시 이후 연락 선호"
                      />
                    </label>

                    {updateMutation.error instanceof Error ? (
                      <p className="mt-3 rounded-[16px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
                        {updateMutation.error.message}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        className="gap-2"
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? "저장 중..." : "변경 저장"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={updateMutation.isPending}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
