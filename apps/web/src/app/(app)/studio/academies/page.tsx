"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronLeft,
  MapPin,
  PencilLine,
  Phone,
  Save,
  School,
  Truck,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { isOperatorRole } from "@/lib/role-ui";

interface OwnedAcademy {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  categories: string[];
  description: string | null;
  hasShuttle: boolean;
  hasParking: boolean;
  monthlyFeeMin: number | null;
  monthlyFeeMax: number | null;
  rating: number;
  reviewCount: number;
  createdAt: string;
  metrics: {
    classCount: number;
    openClassCount: number;
    activeEnrollmentCount: number;
  };
}

interface AcademyFormState {
  name: string;
  address: string;
  lat: string;
  lng: string;
  phone: string;
  categories: string;
  description: string;
  hasShuttle: boolean;
  hasParking: boolean;
  monthlyFeeMin: string;
  monthlyFeeMax: string;
}

const initialForm: AcademyFormState = {
  name: "",
  address: "",
  lat: "37.4918",
  lng: "127.0077",
  phone: "",
  categories: "",
  description: "",
  hasShuttle: false,
  hasParking: false,
  monthlyFeeMin: "",
  monthlyFeeMax: "",
};

function formatCurrency(amount: number | null) {
  if (amount === null) return "미입력";
  return `${amount.toLocaleString()}원`;
}

function toFormState(academy: OwnedAcademy): AcademyFormState {
  return {
    name: academy.name,
    address: academy.address,
    lat: String(academy.lat),
    lng: String(academy.lng),
    phone: academy.phone ?? "",
    categories: academy.categories.join(", "),
    description: academy.description ?? "",
    hasShuttle: academy.hasShuttle,
    hasParking: academy.hasParking,
    monthlyFeeMin: academy.monthlyFeeMin ? String(academy.monthlyFeeMin) : "",
    monthlyFeeMax: academy.monthlyFeeMax ? String(academy.monthlyFeeMax) : "",
  };
}

export default function StudioAcademiesPage() {
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);
  const [editingAcademyId, setEditingAcademyId] = useState<string | null>(null);
  const [form, setForm] = useState<AcademyFormState>(initialForm);

  const academiesQuery = useQuery({
    queryKey: ["my-academies"],
    queryFn: () => api.get<OwnedAcademy[]>("/academies/mine"),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const summary = useMemo(() => {
    const academies = academiesQuery.data ?? [];
    return {
      academyCount: academies.length,
      classCount: academies.reduce((sum, academy) => sum + academy.metrics.classCount, 0),
      activeEnrollments: academies.reduce(
        (sum, academy) => sum + academy.metrics.activeEnrollmentCount,
        0
      ),
    };
  }, [academiesQuery.data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        phone: form.phone.trim() || undefined,
        categories: form.categories
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        description: form.description.trim() || undefined,
        hasShuttle: form.hasShuttle,
        hasParking: form.hasParking,
        monthlyFeeMin: form.monthlyFeeMin ? Number(form.monthlyFeeMin) : undefined,
        monthlyFeeMax: form.monthlyFeeMax ? Number(form.monthlyFeeMax) : undefined,
      };

      if (editingAcademyId) {
        return api.patch<OwnedAcademy>(`/academies/${editingAcademyId}`, payload);
      }

      return api.post<OwnedAcademy>("/academies", payload);
    },
    onSuccess: () => {
      setEditingAcademyId(null);
      setForm(initialForm);
      void queryClient.invalidateQueries({ queryKey: ["my-academies"] });
      void queryClient.invalidateQueries({ queryKey: ["operator-summary"] });
    },
  });

  function startEdit(academy: OwnedAcademy) {
    setEditingAcademyId(academy.id);
    setForm(toFormState(academy));
  }

  function cancelEdit() {
    setEditingAcademyId(null);
    setForm(initialForm);
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
        <LoginRequiredCard description="학원 관리 화면은 로그인 후 이용할 수 있습니다." />
      </div>
    );
  }

  if (!isOperatorRole(user?.role)) {
    return (
      <div className="px-4 py-8">
        <Card className="py-12 text-center">
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary sm:text-2xl">
            강사 View 전용 화면입니다
          </h1>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            설정에서 `강사 View`로 전환하면 학원 등록과 관리 기능을 사용할 수 있습니다.
          </p>
          <Link
            href="/mypage/settings"
            className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
          >
            설정으로 이동
          </Link>
        </Card>
      </div>
    );
  }

  const canSubmit =
    form.name.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.categories
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length > 0 &&
    Number.isFinite(Number(form.lat)) &&
    Number.isFinite(Number(form.lng));

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
            학원 관리
          </h1>
          <p className="text-xs text-text-secondary">강사 View에서 운영 학원을 등록하고 기본 정보를 수정합니다.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-primary">{summary.academyCount}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">운영 학원</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-secondary">{summary.classCount}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">전체 반</p>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
          <p className="text-xl font-bold text-accent">{summary.activeEnrollments}</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">활성 수강</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-primary">등록된 학원</h2>
          <div className="mt-4 space-y-3">
            {(academiesQuery.data ?? []).length === 0 ? (
              <div className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                아직 등록된 학원이 없습니다.
              </div>
            ) : (
              academiesQuery.data?.map((academy) => (
                <Card
                  key={academy.id}
                  className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-blue-50 text-primary">
                      <Building2 size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{academy.name}</p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {academy.categories.join(" · ")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-text-secondary">
                            반 {academy.metrics.classCount}개
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => startEdit(academy)}
                          >
                            <PencilLine size={14} />
                            수정
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-text-secondary">
                        <p className="flex items-center gap-1.5">
                          <MapPin size={12} />
                          {academy.address}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone size={12} />
                          {academy.phone ?? "전화번호 미입력"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <School size={12} />
                          수강료 {formatCurrency(academy.monthlyFeeMin)} ~ {formatCurrency(academy.monthlyFeeMax)}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Truck size={12} />
                          {academy.hasShuttle ? "셔틀 운영" : "셔틀 없음"} · 활성 수강 {academy.metrics.activeEnrollmentCount}명
                        </p>
                      </div>
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
              {editingAcademyId ? "학원 수정" : "새 학원 등록"}
            </h2>
            {editingAcademyId ? (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={cancelEdit}>
                <X size={14} />
                취소
              </Button>
            ) : null}
          </div>

          {editingAcademyId ? (
            <div className="mt-4 rounded-[20px] bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] px-4 py-3 text-sm text-text-secondary">
              등록된 학원의 주소, 연락처, 카테고리, 셔틀 운영 여부를 수정합니다.
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">학원명</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                placeholder="예: 에듀픽 서초본원"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">주소</span>
              <input
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                placeholder="예: 서울 서초구 서초대로 123"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">위도</span>
                <input
                  value={form.lat}
                  onChange={(event) => setForm((current) => ({ ...current, lat: event.target.value }))}
                  className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">경도</span>
                <input
                  value={form.lng}
                  onChange={(event) => setForm((current) => ({ ...current, lng: event.target.value }))}
                  className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">전화번호</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                placeholder="예: 02-1234-5678"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">카테고리</span>
              <input
                value={form.categories}
                onChange={(event) =>
                  setForm((current) => ({ ...current, categories: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                placeholder="예: 영어, 수학, 논술"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">최소 수강료</span>
                <input
                  value={form.monthlyFeeMin}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, monthlyFeeMin: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                  placeholder="150000"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">최대 수강료</span>
                <input
                  value={form.monthlyFeeMax}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, monthlyFeeMax: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                  placeholder="300000"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">소개</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="mt-1.5 min-h-28 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                placeholder="학원 소개를 입력해 주세요."
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-[18px] bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
                <input
                  type="checkbox"
                  checked={form.hasShuttle}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, hasShuttle: event.target.checked }))
                  }
                />
                셔틀 운영
              </label>
              <label className="flex items-center gap-2 rounded-[18px] bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)]">
                <input
                  type="checkbox"
                  checked={form.hasParking}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, hasParking: event.target.checked }))
                  }
                />
                주차 가능
              </label>
            </div>
          </div>

          {submitMutation.error instanceof Error ? (
            <p className="mt-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
              {submitMutation.error.message}
            </p>
          ) : null}

          <Button
            className="mt-5 gap-2"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
          >
            <Save size={16} />
            {submitMutation.isPending
              ? editingAcademyId
                ? "수정 중..."
                : "등록 중..."
              : editingAcademyId
                ? "학원 수정 저장"
                : "학원 등록"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
