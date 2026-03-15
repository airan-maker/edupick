"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ClipboardList,
  PencilLine,
  Plus,
  Save,
  UsersRound,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { isOperatorRole } from "@/lib/role-ui";

interface OwnedAcademy {
  id: string;
  name: string;
}

interface MyClassItem {
  id: string;
  academyId: string;
  name: string;
  subject: string;
  ageGroup: string | null;
  monthlyFee: number;
  maxStudents: number;
  currentStudents: number;
  status: "OPEN" | "FULL" | "CLOSED";
  createdAt: string;
  academy: {
    id: string;
    name: string;
    address: string;
  };
  instructor: {
    id: string;
    name: string | null;
  } | null;
  schedules: Array<{
    id: string;
    dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
    startTime: string;
    endTime: string;
  }>;
  metrics: {
    activeEnrollmentCount: number;
    pendingPaymentCount: number;
    spotsLeft: number;
  };
}

interface ScheduleForm {
  dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  startTime: string;
  endTime: string;
}

interface ClassFormState {
  academyId: string;
  name: string;
  subject: string;
  ageGroup: string;
  maxStudents: string;
  monthlyFee: string;
  status: "OPEN" | "FULL" | "CLOSED";
  schedules: ScheduleForm[];
}

const dayOptions: ScheduleForm["dayOfWeek"][] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const dayLabelMap: Record<ScheduleForm["dayOfWeek"], string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

const initialForm: ClassFormState = {
  academyId: "",
  name: "",
  subject: "",
  ageGroup: "",
  maxStudents: "12",
  monthlyFee: "",
  status: "OPEN",
  schedules: [{ dayOfWeek: "MON", startTime: "15:00", endTime: "16:00" }],
};

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

function formatSchedule(schedules: MyClassItem["schedules"]) {
  if (schedules.length === 0) {
    return "일정 미등록";
  }

  return schedules
    .map((schedule) => `${dayLabelMap[schedule.dayOfWeek]} ${schedule.startTime}-${schedule.endTime}`)
    .join(" · ");
}

function toFormState(classItem: MyClassItem): ClassFormState {
  return {
    academyId: classItem.academyId,
    name: classItem.name,
    subject: classItem.subject,
    ageGroup: classItem.ageGroup ?? "",
    maxStudents: String(classItem.maxStudents),
    monthlyFee: String(classItem.monthlyFee),
    status: classItem.status,
    schedules:
      classItem.schedules.length > 0
        ? classItem.schedules.map((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          }))
        : initialForm.schedules,
  };
}

export default function StudioClassesPage() {
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);
  const [selectedAcademyId, setSelectedAcademyId] = useState<string>("ALL");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassFormState>(initialForm);

  const academiesQuery = useQuery({
    queryKey: ["my-academies"],
    queryFn: () => api.get<OwnedAcademy[]>("/academies/mine"),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const classesQuery = useQuery({
    queryKey: ["my-classes", selectedAcademyId],
    queryFn: () =>
      api.get<MyClassItem[]>("/classes/mine", {
        academyId: selectedAcademyId === "ALL" ? undefined : selectedAcademyId,
      }),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        ageGroup: form.ageGroup.trim() || undefined,
        maxStudents: Number(form.maxStudents),
        monthlyFee: Number(form.monthlyFee),
        schedules: form.schedules
          .filter((schedule) => schedule.startTime && schedule.endTime)
          .map((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })),
      };

      if (editingClassId) {
        return api.patch<MyClassItem>(`/classes/${editingClassId}`, {
          ...payload,
          status: form.status,
        });
      }

      return api.post<MyClassItem>("/classes", {
        academyId: form.academyId,
        ...payload,
      });
    },
    onSuccess: () => {
      const nextAcademyId =
        form.academyId || academiesQuery.data?.[0]?.id || "";
      setEditingClassId(null);
      setForm({
        ...initialForm,
        academyId: nextAcademyId,
      });
      void queryClient.invalidateQueries({ queryKey: ["my-classes"] });
      void queryClient.invalidateQueries({ queryKey: ["operator-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["my-academies"] });
    },
  });

  const summary = useMemo(() => {
    const classes = classesQuery.data ?? [];
    return {
      classCount: classes.length,
      activeEnrollmentCount: classes.reduce(
        (sum, classItem) => sum + classItem.metrics.activeEnrollmentCount,
        0
      ),
      pendingPaymentCount: classes.reduce(
        (sum, classItem) => sum + classItem.metrics.pendingPaymentCount,
        0
      ),
    };
  }, [classesQuery.data]);

  useEffect(() => {
    const firstAcademy = academiesQuery.data?.[0];
    if (firstAcademy && !form.academyId && !editingClassId) {
      setForm((current) => ({ ...current, academyId: firstAcademy.id }));
    }
  }, [academiesQuery.data, editingClassId, form.academyId]);

  function updateSchedule(index: number, next: Partial<ScheduleForm>) {
    setForm((current) => ({
      ...current,
      schedules: current.schedules.map((schedule, scheduleIndex) =>
        scheduleIndex === index ? { ...schedule, ...next } : schedule
      ),
    }));
  }

  function addScheduleRow() {
    setForm((current) => ({
      ...current,
      schedules: [
        ...current.schedules,
        { dayOfWeek: "MON", startTime: "15:00", endTime: "16:00" },
      ],
    }));
  }

  function removeScheduleRow(index: number) {
    setForm((current) => ({
      ...current,
      schedules:
        current.schedules.length === 1
          ? current.schedules
          : current.schedules.filter((_, scheduleIndex) => scheduleIndex !== index),
    }));
  }

  function startEdit(classItem: MyClassItem) {
    setEditingClassId(classItem.id);
    setForm(toFormState(classItem));
    setSelectedAcademyId(classItem.academyId);
  }

  function cancelEdit() {
    setEditingClassId(null);
    setForm({
      ...initialForm,
      academyId: academiesQuery.data?.[0]?.id ?? "",
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
        <LoginRequiredCard description="반 관리 화면은 로그인 후 이용할 수 있습니다." />
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
            강사 View에서만 반 조회와 수정 기능을 사용할 수 있습니다.
          </p>
        </Card>
      </div>
    );
  }

  const canSubmit =
    form.name.trim().length > 0 &&
    form.subject.trim().length > 0 &&
    Number(form.maxStudents) > 0 &&
    Number(form.monthlyFee) > 0 &&
    form.schedules.some((schedule) => schedule.startTime && schedule.endTime) &&
    (editingClassId !== null || form.academyId.length > 0);

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
            반 관리
          </h1>
          <p className="text-xs text-text-secondary">
            운영 반 조회, 신규 반 생성, 기존 반 수정을 진행합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-primary">{summary.classCount}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">운영 반</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-secondary">{summary.activeEnrollmentCount}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">활성 수강</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-accent">{summary.pendingPaymentCount}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">입금 대기</p>
        </Card>
      </div>

      {(academiesQuery.data?.length ?? 0) > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            selected={selectedAcademyId === "ALL"}
            onClick={() => setSelectedAcademyId("ALL")}
          >
            전체 학원
          </FilterChip>
          {academiesQuery.data?.map((academy) => (
            <FilterChip
              key={academy.id}
              selected={selectedAcademyId === academy.id}
              onClick={() => {
                setSelectedAcademyId(academy.id);
                if (!editingClassId) {
                  setForm((current) => ({ ...current, academyId: academy.id }));
                }
              }}
            >
              {academy.name}
            </FilterChip>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary">운영 중인 반</h2>
          <div className="mt-4 space-y-3">
            {(classesQuery.data ?? []).length === 0 ? (
              <div className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                아직 조회된 반이 없습니다.
              </div>
            ) : (
              classesQuery.data?.map((classItem) => (
                <Card
                  key={classItem.id}
                  className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-blue-50 text-primary">
                          <ClipboardList size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{classItem.name}</p>
                          <p className="text-xs text-text-secondary">
                            {classItem.academy.name} · {classItem.subject}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-text-secondary">
                        <p>{formatSchedule(classItem.schedules)}</p>
                        <p>
                          {classItem.ageGroup ?? "대상 미입력"} · 월 {formatCurrency(classItem.monthlyFee)}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <UsersRound size={12} />
                          현재 {classItem.currentStudents}명 / 정원 {classItem.maxStudents}명 · 잔여 {classItem.metrics.spotsLeft}자리
                        </p>
                        <p>입금 대기 {classItem.metrics.pendingPaymentCount}건</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-text-secondary">
                        {classItem.status}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => startEdit(classItem)}
                      >
                        <PencilLine size={14} />
                        수정
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-primary">
              {editingClassId
                ? "반 수정"
                : (academiesQuery.data?.length ?? 0) > 0
                  ? "새 반 생성"
                  : "반 운영"}
            </h2>
            {editingClassId ? (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={cancelEdit}>
                <X size={14} />
                취소
              </Button>
            ) : null}
          </div>

          {(academiesQuery.data?.length ?? 0) > 0 || editingClassId ? (
            <div className="mt-4 space-y-3">
              {editingClassId ? (
                <div className="rounded-[20px] bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] px-4 py-3 text-sm text-text-secondary">
                  선택한 반의 기본 정보, 정원, 시간표, 상태를 수정합니다.
                </div>
              ) : (
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">학원 선택</span>
                  <select
                    value={form.academyId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, academyId: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                  >
                    <option value="">학원을 선택해 주세요</option>
                    {academiesQuery.data?.map((academy) => (
                      <option key={academy.id} value={academy.id}>
                        {academy.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">반 이름</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                  placeholder="예: 초등 영어 독해반"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">과목</span>
                  <input
                    value={form.subject}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, subject: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                    placeholder="영어"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">대상</span>
                  <input
                    value={form.ageGroup}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, ageGroup: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                    placeholder="초등 3~4학년"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">정원</span>
                  <input
                    value={form.maxStudents}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxStudents: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                    placeholder="12"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">월 수강료</span>
                  <input
                    value={form.monthlyFee}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, monthlyFee: event.target.value }))
                    }
                    className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                    placeholder="220000"
                  />
                </label>
              </div>

              {editingClassId ? (
                <label className="block">
                  <span className="text-xs font-semibold text-text-secondary">운영 상태</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as ClassFormState["status"],
                      }))
                    }
                    className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="FULL">FULL</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </label>
              ) : null}

              <div className="rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">시간표</p>
                  <button
                    type="button"
                    onClick={addScheduleRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <Plus size={14} />
                    추가
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {form.schedules.map((schedule, index) => (
                    <div
                      key={`${schedule.dayOfWeek}-${index}`}
                      className="grid grid-cols-[0.9fr_1fr_1fr_auto] gap-2"
                    >
                      <select
                        value={schedule.dayOfWeek}
                        onChange={(event) =>
                          updateSchedule(index, {
                            dayOfWeek: event.target.value as ScheduleForm["dayOfWeek"],
                          })
                        }
                        className="rounded-[16px] border border-white/70 bg-white/82 px-3 py-2.5 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                      >
                        {dayOptions.map((day) => (
                          <option key={day} value={day}>
                            {dayLabelMap[day]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={schedule.startTime}
                        onChange={(event) =>
                          updateSchedule(index, { startTime: event.target.value })
                        }
                        className="rounded-[16px] border border-white/70 bg-white/82 px-3 py-2.5 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                      />
                      <input
                        type="time"
                        value={schedule.endTime}
                        onChange={(event) =>
                          updateSchedule(index, { endTime: event.target.value })
                        }
                        className="rounded-[16px] border border-white/70 bg-white/82 px-3 py-2.5 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeScheduleRow(index)}
                        className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[16px] bg-white/82 text-text-secondary shadow-[0_10px_18px_rgba(195,200,220,0.14)]"
                        aria-label="시간표 행 삭제"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {submitMutation.error instanceof Error ? (
                <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
                  {submitMutation.error.message}
                </p>
              ) : null}

              <Button
                className="gap-2"
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit || submitMutation.isPending}
              >
                <Save size={16} />
                {submitMutation.isPending
                  ? editingClassId
                    ? "수정 중..."
                    : "생성 중..."
                  : editingClassId
                    ? "반 수정 저장"
                    : "반 생성"}
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
              먼저 `학원 관리`에서 운영 학원을 등록하면 반 생성까지 같은 강사 View에서 진행할 수 있습니다.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
