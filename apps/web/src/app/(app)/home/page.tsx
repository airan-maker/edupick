"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  Bus,
  CalendarDays,
  ChevronRight,
  Compass,
  CreditCard,
  History,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { AcademyCard } from "@/components/academy/AcademyCard";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  readRecentAcademies,
  type RecentAcademyItem,
} from "@/lib/recent-academies";
import { isOperatorRole } from "@/lib/role-ui";
import { useProtectedPage } from "@/lib/use-protected-page";

interface ChildSummary {
  id: string;
  name: string;
}

interface CalendarEvent {
  id: string;
  enrollmentId: string;
  childId: string | null;
  childName: string | null;
  academyName: string;
  subject: string;
  color: string;
  startAt: string;
  endAt: string;
  location: string;
  hasShuttle: boolean;
  shuttlePickupTime: string | null;
  status: "scheduled" | "cancelled" | "makeup";
  memo: string | null;
}

interface EnrollmentItem {
  id: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  autoPayEnabled: boolean;
  nextPaymentDate: string | null;
  child: {
    id: string;
    name: string;
  } | null;
  class: {
    id: string;
    name: string;
    subject: string;
    monthlyFee: number;
    academy: {
      id: string;
      name: string;
      address: string;
    };
  };
}

interface PaymentItem {
  id: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  className: string;
  child: {
    id: string;
    name: string;
  } | null;
  effectiveDate: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface NearbyAcademyItem {
  id: string;
  name: string;
  address: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  hasShuttle: boolean;
  monthlyFeeMin: number | null;
  monthlyFeeMax: number | null;
  distanceM: number;
  openClassCount: number;
  representativeClass: {
    id: string;
    name: string;
    subject: string;
    monthlyFee: number;
    scheduleSummary: string;
  } | null;
}

interface NearbyAcademyResponse {
  data: NearbyAcademyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_LOCATION = {
  lat: 37.4918,
  lng: 127.0077,
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}원`;
}

function formatDistance(distanceM: number) {
  if (distanceM < 1000) {
    return `${distanceM}m`;
  }

  return `${(distanceM / 1000).toFixed(1)}km`;
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

function formatRelativeDate(dateString: string) {
  const target = new Date(dateString);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );
  const diff = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86400000
  );

  if (diff === 0) {
    return "오늘";
  }

  if (diff === 1) {
    return "내일";
  }

  if (diff > 1) {
    return `${diff}일 후`;
  }

  return `${Math.abs(diff)}일 전`;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(left: string, rightDate: Date) {
  const leftDate = new Date(left);
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

const quickActions = [
  {
    href: "/calendar",
    title: "일정 보기",
    description: "이번 주 수업과 셔틀 확인",
    icon: CalendarDays,
  },
  {
    href: "/mypage/payments",
    title: "결제 확인",
    description: "입금 대기와 최근 납부 내역",
    icon: CreditCard,
  },
  {
    href: "/chat",
    title: "선생님 톡",
    description: "읽지 않은 대화와 공지 확인",
    icon: MessageCircle,
  },
  {
    href: "/discover",
    title: "주변 학원 찾기",
    description: "가까운 반 더 살펴보기",
    icon: Search,
  },
] as const;

export default function ParentHomePage() {
  const user = useAuth((state) => state.user);
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const [selectedChild, setSelectedChild] = useState<string>("ALL");
  const [recentAcademies, setRecentAcademies] = useState<RecentAcademyItem[]>([]);

  const childrenQuery = useQuery({
    queryKey: ["home-children"],
    queryFn: () => api.get<ChildSummary[]>("/users/me/children"),
    enabled: canUseProtectedApi,
  });

  useEffect(() => {
    if (selectedChild !== "ALL") {
      return;
    }

    if ((childrenQuery.data ?? []).length === 1) {
      setSelectedChild(childrenQuery.data?.[0].id ?? "ALL");
    }
  }, [childrenQuery.data, selectedChild]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const syncRecentAcademies = () => {
      setRecentAcademies(readRecentAcademies());
    };

    syncRecentAcademies();
    window.addEventListener("focus", syncRecentAcademies);
    window.addEventListener("storage", syncRecentAcademies);

    return () => {
      window.removeEventListener("focus", syncRecentAcademies);
      window.removeEventListener("storage", syncRecentAcademies);
    };
  }, [mounted]);

  const eventsQuery = useQuery({
    queryKey: ["home-events", selectedChild],
    queryFn: () =>
      api.get<CalendarEvent[]>("/calendar/family-calendar", {
        childId: selectedChild === "ALL" ? undefined : selectedChild,
        startDate: formatDateKey(new Date()),
        endDate: formatDateKey(
          new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        ),
        view: "week",
      }),
    enabled: canUseProtectedApi,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["home-enrollments"],
    queryFn: () => api.get<EnrollmentItem[]>("/enrollments"),
    enabled: canUseProtectedApi,
  });

  const paymentsQuery = useQuery({
    queryKey: ["home-payments"],
    queryFn: () => api.get<PaymentItem[]>("/payments"),
    enabled: canUseProtectedApi,
  });

  const unreadNotificationsQuery = useQuery({
    queryKey: ["home-notifications-unread"],
    queryFn: () =>
      api.get<NotificationListResponse>("/notifications", {
        read: false,
        limit: 5,
      }),
    enabled: canUseProtectedApi,
  });

  const notificationsQuery = useQuery({
    queryKey: ["home-notifications"],
    queryFn: () =>
      api.get<NotificationListResponse>("/notifications", {
        limit: 4,
      }),
    enabled: canUseProtectedApi,
  });

  const recommendedAcademiesQuery = useQuery({
    queryKey: ["home-recommended-academies"],
    queryFn: () =>
      api.get<NearbyAcademyResponse>("/academies/nearby", {
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        sortBy: "distance",
        limit: 6,
      }),
    enabled: canUseProtectedApi,
  });

  const homeData = useMemo(() => {
    const now = new Date();
    const events = (eventsQuery.data ?? []).filter(
      (event) => new Date(event.startAt).getTime() >= now.getTime()
    );
    const todayEvents = events.filter((event) => isSameDay(event.startAt, now));
    const nextEvent = events[0] ?? null;
    const activeEnrollments = (enrollmentsQuery.data ?? []).filter(
      (item) => item.status === "ACTIVE"
    );
    const pendingPayments = (paymentsQuery.data ?? []).filter(
      (payment) => payment.status === "PENDING"
    );
    const nextPayment = [...activeEnrollments]
      .filter((item) => item.nextPaymentDate)
      .sort((left, right) =>
        (left.nextPaymentDate ?? "").localeCompare(right.nextPaymentDate ?? "")
      )[0] ?? null;
    const recentNotifications = notificationsQuery.data?.items ?? [];

    return {
      todayEvents,
      nextEvent,
      activeEnrollments,
      pendingPayments,
      nextPayment,
      unreadCount: unreadNotificationsQuery.data?.total ?? 0,
      recentNotifications,
      upcomingEvents: events.slice(0, 4),
    };
  }, [
    enrollmentsQuery.data,
    eventsQuery.data,
    notificationsQuery.data?.items,
    paymentsQuery.data,
    unreadNotificationsQuery.data?.total,
  ]);

  const recommendedAcademies = useMemo(() => {
    const enrolledAcademyIds = new Set(
      homeData.activeEnrollments.map((item) => item.class.academy.id)
    );

    return (recommendedAcademiesQuery.data?.data ?? [])
      .filter((academy) => !enrolledAcademyIds.has(academy.id))
      .slice(0, 3);
  }, [homeData.activeEnrollments, recommendedAcademiesQuery.data?.data]);

  if (!mounted) {
    return (
      <div className="px-4 py-8">
        <div className="soft-card h-64 animate-pulse rounded-[34px]" />
      </div>
    );
  }

  if (!canUseProtectedApi) {
    return (
      <div className="px-4 py-8">
        <LoginRequiredCard description="학부모 홈에서는 오늘 수업, 읽지 않은 알림, 결제 상태를 한 번에 확인할 수 있습니다." />
      </div>
    );
  }

  if (isOperatorRole(user?.role)) {
    return (
      <div className="px-4 py-8">
        <Card className="py-12 text-center">
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary sm:text-2xl">
            강사 계정은 스튜디오를 사용합니다
          </h1>
          <p className="mt-2 text-sm leading-7 text-text-secondary">
            현재 계정은 운영용 하단 네비가 활성화되어 있습니다.
          </p>
          <Link
            href="/studio"
            className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
          >
            스튜디오로 이동
          </Link>
        </Card>
      </div>
    );
  }

  const hasChildren = (childrenQuery.data?.length ?? 0) > 0;
  const hasActiveEnrollment = homeData.activeEnrollments.length > 0;

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="soft-panel rounded-[30px] px-5 py-5">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-primary">
          Today Dashboard
        </span>
        <h1 className="display-font mt-3 text-2xl font-bold tracking-[-0.05em] text-text-primary">
          {user?.name ?? "학부모"}님, 오늘 확인할 내용
        </h1>
        <p className="mt-2 text-sm leading-7 text-text-secondary">
          일정, 알림, 결제, 다음 행동을 홈에서 바로 처리할 수 있게 정리했습니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            selected={selectedChild === "ALL"}
            onClick={() => setSelectedChild("ALL")}
          >
            전체
          </FilterChip>
          {(childrenQuery.data ?? []).map((child) => (
            <FilterChip
              key={child.id}
              selected={selectedChild === child.id}
              onClick={() => setSelectedChild(child.id)}
            >
              {child.name}
            </FilterChip>
          ))}
        </div>

        <Card className="mt-4 bg-[linear-gradient(180deg,#fff8dc_0%,#fffdf1_100%)] p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-amber-700/70">
            다음 수업
          </p>
          <p className="mt-2 text-base font-semibold text-text-primary">
            {homeData.nextEvent
              ? `${homeData.nextEvent.subject} · ${homeData.nextEvent.academyName}`
              : hasActiveEnrollment
                ? "다가오는 수업이 없습니다"
                : "아직 신청한 반이 없습니다"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {homeData.nextEvent
              ? `${formatRelativeDate(homeData.nextEvent.startAt)} ${formatTime(homeData.nextEvent.startAt)} - ${formatTime(homeData.nextEvent.endAt)}`
              : hasActiveEnrollment
                ? "일정표에서 이번 달 전체 일정을 확인해 주세요."
                : "탐색에서 반을 찾고 신청하면 일정이 자동으로 채워집니다."}
          </p>
          {homeData.nextEvent ? (
            <div className="mt-3 space-y-1 text-xs text-text-secondary">
              <p className="flex items-center gap-1.5">
                <UserRound size={12} />
                {homeData.nextEvent.childName ?? "본인"}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin size={12} />
                {homeData.nextEvent.location}
              </p>
              {homeData.nextEvent.hasShuttle ? (
                <p className="flex items-center gap-1.5 text-primary">
                  <Bus size={12} />
                  셔틀 이용 수업입니다
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-primary">
              {homeData.todayEvents.length}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">오늘 수업</p>
          </Card>
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fff9_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-secondary">
              {homeData.unreadCount}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">읽지 않은 알림</p>
          </Card>
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf3_100%)] text-center" padding="sm">
            <p className="text-xl font-bold text-accent">
              {homeData.pendingPayments.length}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">입금 대기</p>
          </Card>
        </div>
      </div>

      {!hasChildren ? (
        <Card className="mt-4 bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-5">
          <p className="text-sm font-semibold text-text-primary">
            자녀 정보부터 등록하면 홈이 훨씬 정확해집니다
          </p>
          <p className="mt-1 text-xs leading-6 text-text-secondary">
            자녀를 추가하면 일정, 공지, 결제 정보가 자녀 기준으로 정리됩니다.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/mypage/children"
              className="rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
            >
              자녀 등록하기
            </Link>
            <Link
              href="/discover"
              className="rounded-full border border-white/70 bg-white/80 px-5 py-3 text-center text-sm font-semibold text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)]"
            >
              주변 학원 먼저 보기
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="h-full rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-blue-50 text-primary">
                      <Icon size={20} />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-text-primary">
                      {action.title}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-text-secondary">
                      {action.description}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-text-secondary" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                이번 주 일정
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                가까운 수업부터 확인합니다.
              </p>
            </div>
            <Link href="/calendar" className="text-xs font-semibold text-primary">
              전체 일정 보기
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {homeData.upcomingEvents.length === 0 ? (
              <div className="rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-8 text-center text-sm text-text-secondary">
                {hasActiveEnrollment
                  ? "이번 주 예정된 일정이 없습니다."
                  : "반을 신청하면 여기에 일정이 자동으로 표시됩니다."}
              </div>
            ) : (
              homeData.upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-4 shadow-[0_10px_18px_rgba(195,200,220,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {event.subject}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {event.academyName}
                        {event.childName ? ` · ${event.childName}` : ""}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        color: event.color,
                        backgroundColor: `${event.color}14`,
                      }}
                    >
                      {formatRelativeDate(event.startAt)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-text-secondary">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays size={12} />
                      {formatDate(event.startAt)} · {formatTime(event.startAt)} - {formatTime(event.endAt)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin size={12} />
                      {event.location}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  지금 처리할 일
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  놓치기 쉬운 항목부터 위로 올렸습니다.
                </p>
              </div>
              <Sparkles size={18} className="text-accent" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] bg-[linear-gradient(180deg,#fffaf3_0%,#ffffff_100%)] px-4 py-4">
                <p className="text-sm font-semibold text-text-primary">
                  입금 대기 {homeData.pendingPayments.length}건
                </p>
                <p className="mt-1 text-xs leading-6 text-text-secondary">
                  {homeData.pendingPayments.length > 0
                    ? `${homeData.pendingPayments[0].className} 결제가 대기 중입니다.`
                    : "대기 중인 결제가 없으면 홈에서 바로 확인만 하면 됩니다."}
                </p>
                <Link href="/mypage/payments" className="mt-3 inline-flex text-xs font-semibold text-primary">
                  결제 내역 보기
                </Link>
              </div>

              <div className="rounded-[22px] bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] px-4 py-4">
                <p className="text-sm font-semibold text-text-primary">
                  읽지 않은 알림 {homeData.unreadCount}건
                </p>
                <p className="mt-1 text-xs leading-6 text-text-secondary">
                  공지, 신청 상태, 결제 알림을 먼저 정리해 두었습니다.
                </p>
                <Link href="/chat" className="mt-3 inline-flex text-xs font-semibold text-primary">
                  톡/알림 확인
                </Link>
              </div>

              {homeData.nextPayment ? (
                <div className="rounded-[22px] bg-[linear-gradient(180deg,#f7fff9_0%,#ffffff_100%)] px-4 py-4">
                  <p className="text-sm font-semibold text-text-primary">
                    다음 결제 예정
                  </p>
                  <p className="mt-1 text-xs leading-6 text-text-secondary">
                    {homeData.nextPayment.child?.name ?? "본인"} ·{" "}
                    {homeData.nextPayment.class.name} ·{" "}
                    {formatDate(homeData.nextPayment.nextPaymentDate ?? new Date().toISOString())}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  최근 알림
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  가장 최근 업데이트를 요약합니다.
                </p>
              </div>
              <BellRing size={18} className="text-primary" />
            </div>

            <div className="mt-4 space-y-3">
              {homeData.recentNotifications.length === 0 ? (
                <div className="rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-8 text-center text-sm text-text-secondary">
                  아직 확인할 알림이 없습니다.
                </div>
              ) : (
                homeData.recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-4 shadow-[0_10px_18px_rgba(195,200,220,0.12)]"
                  >
                    <p className="text-sm font-semibold text-text-primary">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-text-secondary">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-text-secondary">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                집 근처 추천 학원
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                현재 수강 중이지 않은 가까운 학원을 먼저 보여 줍니다.
              </p>
            </div>
            <Compass size={18} className="text-primary" />
          </div>

          <div className="space-y-3">
            {recommendedAcademiesQuery.isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="soft-card h-28 animate-pulse rounded-[30px]"
                />
              ))
            ) : recommendedAcademies.length === 0 ? (
              <Card className="py-10 text-center">
                <p className="text-sm font-semibold text-text-primary">
                  지금 보여 줄 추천 학원이 없습니다
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  탐색에서 조건을 바꾸거나 새로운 학원을 확인해 보세요.
                </p>
              </Card>
            ) : (
              recommendedAcademies.map((academy) => (
                <AcademyCard
                  key={academy.id}
                  id={academy.id}
                  name={academy.name}
                  category={
                    academy.representativeClass?.subject ??
                    academy.categories[0] ??
                    "기타"
                  }
                  rating={academy.rating}
                  reviewCount={academy.reviewCount}
                  distance={formatDistance(academy.distanceM)}
                  hasShuttle={academy.hasShuttle}
                  schedule={
                    academy.representativeClass?.scheduleSummary ?? "일정 문의"
                  }
                  monthlyFee={
                    academy.representativeClass?.monthlyFee ??
                    academy.monthlyFeeMin ??
                    academy.monthlyFeeMax ??
                    0
                  }
                  description={`${academy.openClassCount}개 반 · ${formatFeeLabel(
                    academy.monthlyFeeMin,
                    academy.monthlyFeeMax
                  )}`}
                />
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                최근 본 학원
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                상세 페이지에서 확인한 학원을 다시 열 수 있습니다.
              </p>
            </div>
            <History size={18} className="text-accent" />
          </div>

          <div className="space-y-3">
            {recentAcademies.length === 0 ? (
              <Card className="py-10 text-center">
                <p className="text-sm font-semibold text-text-primary">
                  최근 본 학원이 아직 없습니다
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  탐색에서 관심 있는 학원을 열어 보면 여기에서 이어서 볼 수 있습니다.
                </p>
              </Card>
            ) : (
              recentAcademies.slice(0, 3).map((academy) => (
                <Link key={academy.id} href={`/discover/${academy.id}`}>
                  <Card className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {academy.name}
                          </p>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-primary">
                            {academy.category}
                          </span>
                          {academy.hasShuttle ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                              셔틀
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs leading-6 text-text-secondary">
                          {academy.address}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-text-secondary">
                          <span>평점 {academy.rating.toFixed(1)}</span>
                          <span>리뷰 {academy.reviewCount}개</span>
                          <span>월 {academy.feeLabel}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-text-secondary">
                        {formatRelativeDate(academy.viewedAt)}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {!hasActiveEnrollment ? (
        <Card className="mt-4 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5">
          <p className="text-sm font-semibold text-text-primary">
            아직 수강 중인 반이 없으면 탐색부터 시작하는 게 가장 빠릅니다
          </p>
          <p className="mt-1 text-xs leading-6 text-text-secondary">
            집 근처, 원하는 과목, 시간표 기준으로 바로 비교하고 신청까지 이어갈 수 있습니다.
          </p>
          <Link href="/discover" className="mt-4 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]">
            주변 학원 찾아보기
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
