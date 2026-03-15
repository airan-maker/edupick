"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Megaphone, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoginRequiredCard } from "@/components/auth/LoginRequiredCard";
import { useProtectedPage } from "@/lib/use-protected-page";
import { isOperatorRole } from "@/lib/role-ui";

type AnnouncementChannel = "push" | "kakao_alimtalk";

interface MyClassOption {
  id: string;
  name: string;
  subject: string;
  academy: {
    id: string;
    name: string;
  };
}

interface SentAnnouncement {
  id: string;
  title: string;
  content: string;
  channels: AnnouncementChannel[];
  createdAt: string;
  isPinned: boolean;
  recipientCount: number;
  class: {
    id: string;
    name: string;
  } | null;
  academy: {
    id: string;
    name: string;
  } | null;
  sender: {
    id: string;
    name: string | null;
  };
}

const channelOptions: Array<{
  value: AnnouncementChannel;
  label: string;
}> = [
  { value: "push", label: "앱 푸시" },
  { value: "kakao_alimtalk", label: "카카오 알림톡" },
];

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function StudioAnnouncementsPage() {
  const queryClient = useQueryClient();
  const { mounted, canUseProtectedApi } = useProtectedPage();
  const user = useAuth((state) => state.user);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [historyClassId, setHistoryClassId] = useState("ALL");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [channels, setChannels] = useState<AnnouncementChannel[]>([
    "push",
    "kakao_alimtalk",
  ]);

  const classesQuery = useQuery({
    queryKey: ["my-classes", "announcements"],
    queryFn: () => api.get<MyClassOption[]>("/classes/mine"),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const announcementsQuery = useQuery({
    queryKey: ["sent-announcements", historyClassId],
    queryFn: () =>
      api.get<SentAnnouncement[]>("/notifications/announcements/mine", {
        classId: historyClassId === "ALL" ? undefined : historyClassId,
      }),
    enabled: canUseProtectedApi && isOperatorRole(user?.role),
  });

  const sendMutation = useMutation({
    mutationFn: async () =>
      api.post<{
        id: string;
        recipientCount: number;
      }>("/notifications/announcement", {
        classId: selectedClassId,
        title: title.trim(),
        content: content.trim(),
        channels,
      }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      void queryClient.invalidateQueries({ queryKey: ["sent-announcements"] });
    },
  });

  useEffect(() => {
    const firstClass = classesQuery.data?.[0];
    if (firstClass && !selectedClassId) {
      setSelectedClassId(firstClass.id);
    }
  }, [classesQuery.data, selectedClassId]);

  function toggleChannel(nextChannel: AnnouncementChannel) {
    setChannels((current) => {
      if (current.includes(nextChannel)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((channel) => channel !== nextChannel);
      }

      return [...current, nextChannel];
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
        <LoginRequiredCard description="공지 발송 화면은 로그인 후 이용할 수 있습니다." />
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
            강사 View에서만 반 공지를 발송할 수 있습니다.
          </p>
        </Card>
      </div>
    );
  }

  const canSend =
    selectedClassId.length > 0 &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    channels.length > 0;

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
            공지 발송
          </h1>
          <p className="text-xs text-text-secondary">
            반별 공지를 즉시 발송하고 최근 발송 이력을 확인합니다.
          </p>
        </div>
      </div>

      <Card className="mt-4 bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-primary">
            <Sparkles size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">즉시 발송 MVP</p>
            <p className="mt-1 text-xs leading-6 text-text-secondary">
              현재는 즉시 발송만 지원합니다. 예약 발송과 읽음 추적은 다음 배치에서 이어집니다.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.98fr_1.02fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text-primary">새 공지 작성</h2>
          </div>

          {(classesQuery.data ?? []).length === 0 ? (
            <div className="mt-4 rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
              발송 가능한 반이 없습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">반 선택</span>
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                >
                  <option value="">반을 선택해 주세요</option>
                  {classesQuery.data?.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.academy.name} · {classItem.name}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="text-xs font-semibold text-text-secondary">발송 채널</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {channelOptions.map((channel) => (
                    <FilterChip
                      key={channel.value}
                      selected={channels.includes(channel.value)}
                      onClick={() => toggleChannel(channel.value)}
                    >
                      {channel.label}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">제목</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1.5 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                  placeholder="예: 이번 주 준비물 안내"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-text-secondary">본문</span>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="mt-1.5 min-h-40 w-full rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-sm leading-6 text-text-primary shadow-[0_10px_18px_rgba(195,200,220,0.14)] outline-none"
                  placeholder="예: 실내용 운동화를 꼭 챙겨주세요."
                />
              </label>

              {sendMutation.data ? (
                <p className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                  공지를 발송했습니다. 현재 활성 수강자 {sendMutation.data.recipientCount}명에게 전달됩니다.
                </p>
              ) : null}

              {sendMutation.error instanceof Error ? (
                <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-500">
                  {sendMutation.error.message}
                </p>
              ) : null}

              <Button
                className="gap-2"
                onClick={() => sendMutation.mutate()}
                disabled={!canSend || sendMutation.isPending}
              >
                <Send size={16} />
                {sendMutation.isPending ? "발송 중..." : "즉시 발송"}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-text-primary">최근 발송 공지</h2>

          {(classesQuery.data ?? []).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <FilterChip
                selected={historyClassId === "ALL"}
                onClick={() => setHistoryClassId("ALL")}
              >
                전체 반
              </FilterChip>
              {classesQuery.data?.map((classItem) => (
                <FilterChip
                  key={classItem.id}
                  selected={historyClassId === classItem.id}
                  onClick={() => setHistoryClassId(classItem.id)}
                >
                  {classItem.name}
                </FilterChip>
              ))}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {(announcementsQuery.data ?? []).length === 0 ? (
              <div className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-4 py-10 text-center text-sm text-text-secondary">
                아직 발송한 공지가 없습니다.
              </div>
            ) : (
              announcementsQuery.data?.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary">
                          {announcement.title}
                        </p>
                        {announcement.isPinned ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-primary">
                            고정
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {announcement.academy?.name ?? "학원 미지정"} ·{" "}
                        {announcement.class?.name ?? "반 미지정"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-text-secondary">
                      {announcement.recipientCount}명
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-text-primary">
                    {announcement.content}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                    {announcement.channels.map((channel) => (
                      <span
                        key={channel}
                        className="rounded-full bg-white/80 px-2.5 py-1 font-semibold"
                      >
                        {channel === "push" ? "앱 푸시" : "카카오 알림톡"}
                      </span>
                    ))}
                    <span>{formatDateTime(announcement.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
