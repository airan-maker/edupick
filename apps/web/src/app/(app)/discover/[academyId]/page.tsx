"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bus,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { saveRecentAcademy } from "@/lib/recent-academies";

interface AcademyDetailResponse {
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
  rating: number;
  reviewCount: number;
  monthlyFeeMin: number | null;
  monthlyFeeMax: number | null;
  reviewSummary: {
    averageRating: number;
    totalCount: number;
  };
  classes: Array<{
    id: string;
    name: string;
    subject: string;
    ageGroup: string | null;
    monthlyFee: number;
    currentStudents: number;
    maxStudents: number;
    status: "OPEN" | "FULL" | "CLOSED";
    spotsLeft: number;
    scheduleSummary: string;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    content: string | null;
    isVerified: boolean;
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      profileImageUrl: string | null;
    };
  }>;
}

interface ChildSummary {
  id: string;
  name: string;
}

interface EnrollmentResponse {
  id: string;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function formatFeeLabel(min: number | null, max: number | null) {
  if (min === null && max === null) {
    return "문의";
  }

  if (min !== null && max !== null && min !== max) {
    return `${min.toLocaleString()}원~${max.toLocaleString()}원`;
  }

  return `${(min ?? max ?? 0).toLocaleString()}원`;
}

export default function AcademyDetailPage() {
  const params = useParams<{ academyId: string }>();
  const router = useRouter();
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const canUseProtectedApi = mounted && isAuthenticated;

  const academyQuery = useQuery({
    queryKey: ["academy-detail", params.academyId],
    queryFn: () => api.get<AcademyDetailResponse>(`/academies/${params.academyId}`),
  });

  const childrenQuery = useQuery({
    queryKey: ["my-children"],
    queryFn: () => api.get<ChildSummary[]>("/users/me/children"),
    enabled: canUseProtectedApi,
    retry: false,
  });

  useEffect(() => {
    if (!academyQuery.data || selectedClassId) {
      return;
    }

    const nextClass =
      academyQuery.data.classes.find((classItem) => classItem.status === "OPEN") ??
      academyQuery.data.classes[0];
    setSelectedClassId(nextClass?.id ?? null);
  }, [academyQuery.data, selectedClassId]);

  useEffect(() => {
    const firstChild = childrenQuery.data?.[0];
    if (firstChild && !selectedChildId) {
      setSelectedChildId(firstChild.id);
    }
  }, [childrenQuery.data, selectedChildId]);

  const selectedClass = useMemo(
    () =>
      academyQuery.data?.classes.find((classItem) => classItem.id === selectedClassId) ??
      null,
    [academyQuery.data?.classes, selectedClassId]
  );

  const enrollmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId) {
        throw new Error("신청할 반을 먼저 선택해 주세요.");
      }

      return api.post<EnrollmentResponse>("/enrollments", {
        classId: selectedClassId,
        childId: selectedChildId || undefined,
        autoPay: true,
        paymentMethod: {
          type: "card",
        },
      });
    },
    onSuccess: () => {
      router.push("/calendar");
    },
  });

  useEffect(() => {
    if (!academyQuery.data) {
      return;
    }

    const primaryCategory =
      academyQuery.data.categories[0] ??
      academyQuery.data.classes[0]?.subject ??
      "기타";

    saveRecentAcademy({
      id: academyQuery.data.id,
      name: academyQuery.data.name,
      category: primaryCategory,
      address: academyQuery.data.address,
      rating: academyQuery.data.rating,
      reviewCount: academyQuery.data.reviewCount,
      hasShuttle: academyQuery.data.hasShuttle,
      feeLabel: formatFeeLabel(
        academyQuery.data.monthlyFeeMin,
        academyQuery.data.monthlyFeeMax
      ),
    });
  }, [academyQuery.data]);

  if (academyQuery.isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="soft-card h-64 animate-pulse rounded-[34px]" />
      </div>
    );
  }

  if (academyQuery.isError || !academyQuery.data) {
    return (
      <div className="px-4 py-8">
        <Card className="py-12 text-center">
          <p className="text-sm font-medium text-red-500">
            {academyQuery.error instanceof Error
              ? academyQuery.error.message
              : "학원 정보를 불러오지 못했습니다."}
          </p>
          <Button className="mt-4" onClick={() => router.push("/discover")}>
            목록으로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  const academy = academyQuery.data;

  return (
    <div className="min-h-screen px-4 pb-28 pt-5">
      <div className="soft-panel sticky top-4 z-30 flex items-center gap-3 rounded-[28px] px-4 py-3">
        <button
          onClick={() => router.back()}
          aria-label="뒤로 가기"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/78 focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
            학원 상세
          </p>
          <h1 className="truncate text-sm font-semibold text-text-primary">
            {academy.name}
          </h1>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            {academy.categories.map((category) => (
              <Badge key={category}>{category}</Badge>
            ))}
          </div>

          <h2 className="display-font mt-4 text-2xl font-bold leading-[1.08] tracking-[-0.04em] text-text-primary sm:text-3xl">
            {academy.name}
          </h2>

          <div className="mt-3 flex items-center gap-2">
            <Star size={16} className="text-accent fill-accent" />
            <span className="text-sm font-semibold text-text-primary">
              {academy.rating.toFixed(1)}
            </span>
            <span className="text-sm text-text-secondary">
              ({academy.reviewSummary.totalCount}개 리뷰)
            </span>
          </div>

          <p className="mt-4 text-sm leading-7 text-text-secondary">
            {academy.description ?? "등록된 학원 소개가 아직 없습니다."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 text-primary" />
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                    학원 위치
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {academy.address}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] p-4">
              <div className="flex items-start gap-3">
                <Bus size={16} className="mt-0.5 text-secondary" />
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                    셔틀 여부
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {academy.hasShuttle ? "등하원 셔틀 운행" : "셔틀 정보 없음"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {academy.phone ? (
            <div className="mt-3 rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] p-4">
              <div className="flex items-start gap-3">
                <Phone size={16} className="mt-0.5 text-accent" />
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                    문의 전화
                  </p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">
                    {academy.phone}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-text-secondary">
                반 선택
              </p>
              <h3 className="mt-2 text-base font-semibold text-text-primary">
                시간표 & 남은 자리 확인
              </h3>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
              선택 가능한 반 {academy.classes.length}개
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {academy.classes.map((classItem) => {
              const isSelected = classItem.id === selectedClassId;
              const isAvailable = classItem.status === "OPEN";

              return (
                <button
                  key={classItem.id}
                  type="button"
                  className={`w-full rounded-[26px] p-4 text-left shadow-[0_12px_22px_rgba(195,200,220,0.14)] ${
                    isSelected
                      ? "bg-[linear-gradient(180deg,#f5f9ff_0%,#eef5ff_100%)] ring-2 ring-primary/20"
                      : "bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)]"
                  }`}
                  onClick={() => setSelectedClassId(classItem.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-text-primary">
                          {classItem.name}
                        </h4>
                        <Badge>{classItem.subject}</Badge>
                        {!isAvailable ? <Badge variant="popular">신청 마감</Badge> : null}
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs text-text-secondary">
                        <Clock size={12} />
                        <span>{classItem.scheduleSummary}</span>
                      </div>
                      {classItem.ageGroup ? (
                        <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                          <Users size={12} />
                          <span>{classItem.ageGroup}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        {classItem.monthlyFee.toLocaleString()}원
                      </p>
                      <p
                        className={`mt-1 text-[11px] font-semibold ${
                          isAvailable ? "text-secondary" : "text-rose-500"
                        }`}
                      >
                        {isAvailable ? `${classItem.spotsLeft}자리 남음` : "신청 마감"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {childrenQuery.data && childrenQuery.data.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-semibold text-text-primary">
                어느 아이로 신청할까요?
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {childrenQuery.data.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      selectedChildId === child.id
                        ? "bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] text-white"
                        : "bg-white/80 text-text-secondary shadow-[0_10px_18px_rgba(195,200,220,0.14)]"
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="mt-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">
              수강 후기 ({academy.reviewSummary.totalCount})
            </h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-secondary">
              최근 등록
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {academy.reviews.length > 0 ? (
              academy.reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4 shadow-[0_10px_18px_rgba(195,200,220,0.12)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {review.user.name ?? "익명"}
                      </span>
                      {review.isVerified ? (
                        <Badge variant="verified">
                          <CheckCircle2 size={10} />
                          인증 리뷰
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-text-secondary">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={12}
                        className={
                          index < Math.round(review.rating)
                            ? "text-accent fill-accent"
                            : "text-slate-200"
                        }
                      />
                    ))}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    {review.content ?? "리뷰 내용이 없습니다."}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[26px] bg-[#fafbfe] px-4 py-10 text-center text-sm text-text-secondary">
                아직 등록된 리뷰가 없습니다.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-40">
        <div className="soft-panel mx-auto max-w-lg rounded-[30px] px-4 py-4">
          {enrollmentMutation.isError ? (
            <p className="mb-2 text-xs text-rose-500">
              {enrollmentMutation.error instanceof Error
                ? enrollmentMutation.error.message
                : "수강 신청에 실패했습니다."}
            </p>
          ) : null}

          <Button
            size="lg"
            className="w-full"
            disabled={
              !selectedClass ||
              selectedClass.status !== "OPEN" ||
              enrollmentMutation.isPending
            }
            onClick={() => {
              if (!canUseProtectedApi) {
                router.push("/login");
                return;
              }

              enrollmentMutation.mutate();
            }}
          >
            {enrollmentMutation.isPending
              ? "신청 처리 중…"
              : selectedClass?.status === "OPEN"
                ? `${selectedClass.name} 신청하기`
                : "반을 선택해 주세요"}
          </Button>
        </div>
      </div>
    </div>
  );
}
