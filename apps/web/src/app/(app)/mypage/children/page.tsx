"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, GraduationCap, MapPin, Plus, Save, UserRound } from "lucide-react";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useProtectedPage } from "@/lib/use-protected-page";

interface Child {
  id: string;
  name: string;
  birthDate: string | null;
  schoolName: string | null;
  schoolAddress: string | null;
  grade: string | null;
}

interface ChildFormState {
  name: string;
  birthDate: string;
  grade: string;
  schoolName: string;
  schoolAddress: string;
}

const emptyForm: ChildFormState = {
  name: "",
  birthDate: "",
  grade: "",
  schoolName: "",
  schoolAddress: "",
};

function buildPayload(form: ChildFormState) {
  return {
    name: form.name.trim(),
    birthDate: form.birthDate || undefined,
    grade: form.grade.trim() || undefined,
    schoolName: form.schoolName.trim() || undefined,
    schoolAddress: form.schoolAddress.trim() || undefined,
  };
}

export default function ChildrenPage() {
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [form, setForm] = useState<ChildFormState>(emptyForm);

  const childrenQuery = useQuery({
    queryKey: ["mypage-children"],
    queryFn: () => api.get<Child[]>("/users/me/children"),
    enabled: canUseProtectedApi,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      if (!payload.name) {
        throw new Error("이름을 입력해 주세요.");
      }

      if (editingChildId) {
        return api.patch<Child>(`/users/me/children/${editingChildId}`, payload);
      }

      return api.post<Child>("/users/me/children", payload);
    },
    onSuccess: () => {
      setEditingChildId(null);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: ["mypage-children"] });
      void queryClient.invalidateQueries({ queryKey: ["mypage-summary-children"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar-children"] });
      void queryClient.invalidateQueries({ queryKey: ["my-children"] });
    },
  });

  const summary = useMemo(() => {
    const children = childrenQuery.data ?? [];
    return {
      total: children.length,
      withSchoolInfo: children.filter((child) => child.schoolName || child.schoolAddress).length,
    };
  }, [childrenQuery.data]);

  function startCreate() {
    setEditingChildId(null);
    setForm(emptyForm);
  }

  function startEdit(child: Child) {
    setEditingChildId(child.id);
    setForm({
      name: child.name,
      birthDate: child.birthDate ? child.birthDate.slice(0, 10) : "",
      grade: child.grade ?? "",
      schoolName: child.schoolName ?? "",
      schoolAddress: child.schoolAddress ?? "",
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
        <LoginRequiredCard description="자녀를 등록해야 수강 신청과 캘린더 연동을 제대로 사용할 수 있습니다." />
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
            자녀 관리
          </h1>
          <p className="text-xs text-text-secondary">학원 추천과 일정표 기준 정보를 관리합니다.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">등록된 자녀</p>
              <p className="mt-1 text-xs text-text-secondary">
                총 {summary.total}명 · 학교 정보 입력 {summary.withSchoolInfo}명
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startCreate}>
              <Plus size={14} />
              새 자녀 등록
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {(childrenQuery.data ?? []).length === 0 ? (
              <div className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                아직 등록된 자녀가 없습니다.
              </div>
            ) : (
              (childrenQuery.data ?? []).map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => startEdit(child)}
                  className={`w-full rounded-[26px] p-4 text-left shadow-[0_12px_22px_rgba(195,200,220,0.14)] ${
                    editingChildId === child.id
                      ? "bg-[linear-gradient(180deg,#f5f9ff_0%,#eef5ff_100%)] ring-2 ring-primary/20"
                      : "bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-blue-50 text-primary">
                          <UserRound size={18} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{child.name}</p>
                          <p className="text-xs text-text-secondary">
                            {child.grade ?? "학년 미입력"}
                            {child.birthDate ? ` · ${child.birthDate.slice(0, 10)}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-text-secondary">
                        <p className="flex items-center gap-1.5">
                          <GraduationCap size={12} />
                          {child.schoolName ?? "학교 정보 미입력"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <MapPin size={12} />
                          {child.schoolAddress ?? "학교 주소 미입력"}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-text-secondary">
                      수정
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-text-primary">
            {editingChildId ? "자녀 정보 수정" : "자녀 추가"}
          </p>
          <p className="mt-1 text-xs leading-6 text-text-secondary">
            학교 정보는 추천 스케줄, 거리 계산, 셔틀 판단 기준으로 사용됩니다.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">이름</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="예: 김민수"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">생년월일</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, birthDate: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">학년</span>
              <input
                value={form.grade}
                onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="예: 초3"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">학교명</span>
              <input
                value={form.schoolName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, schoolName: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="예: 서초초등학교"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">학교 주소</span>
              <textarea
                value={form.schoolAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, schoolAddress: event.target.value }))
                }
                className="mt-1.5 min-h-28 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="예: 서울시 서초구 서초대로 123"
              />
            </label>
          </div>

          {mutation.error instanceof Error ? (
            <p className="mt-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {mutation.error.message}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              <Save size={16} />
              {mutation.isPending ? "저장 중..." : editingChildId ? "수정 저장" : "자녀 등록"}
            </Button>
            {editingChildId ? (
              <Button variant="outline" onClick={startCreate}>
                새로 입력
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
