"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { WeekView } from "@/components/calendar/WeekView";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

function startOfWeek(date: Date) {
  const next = new Date(date);
  const diff = next.getDay() === 0 ? -6 : 1 - next.getDay();
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeek(date: Date) {
  const next = new Date(startOfWeek(date));
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRangeLabel(viewMode: "week" | "month", date: Date) {
  if (viewMode === "month") {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  }

  const weekStart = startOfWeek(date);
  const weekOfMonth = Math.ceil(weekStart.getDate() / 7);
  return `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekOfMonth}주`;
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

export default function CalendarPage() {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedChild, setSelectedChild] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const canUseProtectedApi = mounted && isAuthenticated;

  const range = useMemo(() => {
    return viewMode === "week"
      ? {
          startDate: formatDateKey(startOfWeek(currentDate)),
          endDate: formatDateKey(endOfWeek(currentDate)),
        }
      : {
          startDate: formatDateKey(startOfMonth(currentDate)),
          endDate: formatDateKey(endOfMonth(currentDate)),
        };
  }, [currentDate, viewMode]);

  const childrenQuery = useQuery({
    queryKey: ["calendar-children"],
    queryFn: () => api.get<ChildSummary[]>("/users/me/children"),
    enabled: canUseProtectedApi,
    retry: false,
  });

  useEffect(() => {
    const firstChild = childrenQuery.data?.[0];
    if (firstChild && !selectedChild) {
      setSelectedChild(firstChild.id);
    }
  }, [childrenQuery.data, selectedChild]);

  const eventsQuery = useQuery({
    queryKey: [
      "calendar-events",
      selectedChild,
      range.startDate,
      range.endDate,
      viewMode,
    ],
    queryFn: () =>
      api.get<CalendarEvent[]>("/calendar/family-calendar", {
        childId: selectedChild || undefined,
        startDate: range.startDate,
        endDate: range.endDate,
        view: viewMode,
      }),
    enabled: canUseProtectedApi,
  });

  const weekBlocks = useMemo(() => {
    return (eventsQuery.data ?? []).map((event) => {
      const start = new Date(event.startAt);
      const end = new Date(event.endAt);
      const durationMinutes = Math.max(
        Math.round((end.getTime() - start.getTime()) / 60000),
        30
      );

      return {
        id: event.id,
        name: event.subject,
        day: (start.getDay() + 6) % 7,
        startHour: start.getHours(),
        startMinute: start.getMinutes(),
        durationMinutes,
        color: event.color,
        academyName: event.academyName,
      };
    });
  }, [eventsQuery.data]);

  const monthGroups = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();

    (eventsQuery.data ?? []).forEach((event) => {
      const key = event.startAt.split("T")[0];
      const bucket = groups.get(key) ?? [];
      bucket.push(event);
      groups.set(key, bucket);
    });

    return Array.from(groups.entries()).sort(([left], [right]) =>
      left.localeCompare(right)
    );
  }, [eventsQuery.data]);

  const legendItems = useMemo(() => {
    const seen = new Map<string, string>();
    (eventsQuery.data ?? []).forEach((event) => {
      if (!seen.has(event.subject)) {
        seen.set(event.subject, event.color);
      }
    });
    return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
  }, [eventsQuery.data]);

  const shuttleAlert = useMemo(() => {
    return (eventsQuery.data ?? []).find((event) => event.hasShuttle) ?? null;
  }, [eventsQuery.data]);

  const nextEvent = useMemo(() => {
    return eventsQuery.data?.[0] ?? null;
  }, [eventsQuery.data]);

  if (!mounted) {
    return (
      <div className="px-4 py-8">
        <div className="soft-card h-48 animate-pulse rounded-[34px]" />
      </div>
    );
  }

  if (!canUseProtectedApi) {
    return (
      <div className="px-4 py-8">
        <Card className="py-12 text-center">
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary sm:text-2xl">
            로그인 후 이용 가능합니다
          </h1>
          <p className="mt-2 text-xs leading-6 text-text-secondary sm:text-sm">
            신청한 반과 자녀별 일정을 확인하려면 로그인해 주세요.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(106,168,255,0.28)]"
          >
            로그인으로 이동
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-8 pt-5">
      <div className="soft-panel rounded-[28px] px-4 py-4 sm:rounded-[34px] sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="display-font text-lg font-bold tracking-[-0.04em] text-text-primary sm:text-xl">
            통합 일정표
          </h1>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {viewMode === "week" ? "주간" : "월간"}
          </span>
        </div>

        {/* 다음 수업 */}
        <div className="mt-3 rounded-[20px] bg-amber-50/60 px-3.5 py-3 sm:rounded-[24px] sm:px-4 sm:py-3.5">
          <p className="text-[11px] font-semibold text-amber-600/70">
            다음 수업
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            {nextEvent
              ? `${nextEvent.subject} · ${nextEvent.academyName}`
              : "예정된 수업이 없어요"}
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            {nextEvent
              ? `${formatTime(nextEvent.startAt)} - ${formatTime(nextEvent.endAt)}`
              : "반을 신청하면 자동으로 들어옵니다."}
          </p>
        </div>

        {/* 뷰 모드 + 날짜 네비게이션 */}
        <div className="mt-3 rounded-[22px] bg-white/78 p-2.5 shadow-[0_12px_24px_rgba(196,201,219,0.14)] sm:rounded-[28px] sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex shrink-0 gap-1.5">
              <Button
                variant={viewMode === "week" ? "primary" : "outline"}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setViewMode("week")}
              >
                주간
              </Button>
              <Button
                variant={viewMode === "month" ? "primary" : "outline"}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setViewMode("month")}
              >
                월간
              </Button>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary sm:gap-3 sm:text-sm">
              <button
                className="rounded-full bg-white p-1.5 shadow-[0_8px_14px_rgba(196,201,219,0.14)] sm:p-2"
                aria-label="이전"
                onClick={() =>
                  setCurrentDate((date) => {
                    const next = new Date(date);
                    if (viewMode === "week") {
                      next.setDate(next.getDate() - 7);
                    } else {
                      next.setMonth(next.getMonth() - 1);
                    }
                    return next;
                  })
                }
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="min-w-0 truncate">{formatRangeLabel(viewMode, currentDate)}</span>
              <button
                className="rounded-full bg-white p-1.5 shadow-[0_8px_14px_rgba(196,201,219,0.14)] sm:p-2"
                aria-label="다음"
                onClick={() =>
                  setCurrentDate((date) => {
                    const next = new Date(date);
                    if (viewMode === "week") {
                      next.setDate(next.getDate() + 7);
                    } else {
                      next.setMonth(next.getMonth() + 1);
                    }
                    return next;
                  })
                }
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {childrenQuery.data && childrenQuery.data.length > 1 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {childrenQuery.data.map((child) => (
                <FilterChip
                  key={child.id}
                  selected={selectedChild === child.id}
                  onClick={() => setSelectedChild(child.id)}
                >
                  {child.name}
                </FilterChip>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {eventsQuery.isLoading ? (
          <div className="soft-card h-96 animate-pulse rounded-[34px]" />
        ) : eventsQuery.isError ? (
          <Card className="py-8 text-center text-sm text-red-500">
            {eventsQuery.error instanceof Error
              ? eventsQuery.error.message
              : "일정 정보를 불러오지 못했습니다."}
          </Card>
        ) : viewMode === "week" ? (
          <WeekView classes={weekBlocks} />
        ) : monthGroups.length > 0 ? (
          <div className="space-y-3">
            {monthGroups.map(([date, events]) => (
              <Card key={date} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">{date}</h3>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                    {events.length}개 일정
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-4 shadow-[0_10px_18px_rgba(195,200,220,0.12)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {event.subject}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {event.academyName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-text-primary">
                            {formatTime(event.startAt)} - {formatTime(event.endAt)}
                          </p>
                          <p className="mt-1 text-[11px] text-text-secondary">
                            {event.childName ?? "본인"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-10 text-center">
            <p className="text-xs font-semibold text-text-primary sm:text-sm">
              표시할 일정이 없습니다
            </p>
            <p className="mt-1.5 text-[11px] text-text-secondary sm:text-xs">
              반을 신청하면 자동으로 추가됩니다.
            </p>
          </Card>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.86fr_1.14fr]">
        {shuttleAlert ? (
          <Card className="bg-[linear-gradient(180deg,#f4f9ff_0%,#edf6ff_100%)] p-5">
            <div className="flex items-center gap-2 text-primary">
              <Bus size={16} />
              <p className="text-sm font-semibold">셔틀 챙기기</p>
            </div>
            <p className="mt-3 text-sm text-text-primary">
              {shuttleAlert.academyName} 수업이 {formatTime(shuttleAlert.startAt)}에 시작해요
            </p>
            <p className="mt-2 text-xs leading-6 text-text-secondary">
              셔틀 도착 알림은 다음 단계에서 더 정교하게 연결될 예정입니다.
            </p>
          </Card>
        ) : (
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
            <p className="text-xs font-semibold text-text-primary sm:text-sm">
              셔틀 일정 없음
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-text-secondary sm:text-xs">
              이번 기간에는 셔틀 연동 수업이 없습니다.
            </p>
          </Card>
        )}

        {legendItems.length > 0 ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-text-primary">과목 색상</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {legendItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-full bg-[#fafbfe] px-3 py-2"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-text-secondary">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
