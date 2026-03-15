"use client";

import { cn } from "@/lib/utils";

interface ClassBlock {
  id: string;
  name: string;
  day: number; // 0=Mon, 6=Sun
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  color: string;
  academyName: string;
}

interface WeekViewProps {
  classes: ClassBlock[];
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOUR_HEIGHT = 60; // px per hour

export function WeekView({ classes }: WeekViewProps) {
  if (classes.length === 0) {
    return (
      <div className="soft-card rounded-[30px] px-6 py-10 text-center text-sm text-text-secondary">
        <p>표시할 일정이 없습니다</p>
        <p className="mt-3">반을 신청하면 자동으로 추가됩니다.</p>
      </div>
    );
  }

  const earliestHour = Math.max(
    6,
    Math.min(...classes.map((item) => item.startHour)) - 1
  );
  const latestHour = Math.min(
    23,
    Math.max(
      ...classes.map((item) =>
        item.startHour + Math.ceil((item.startMinute + item.durationMinutes) / 60)
      )
    ) + 1
  );
  const hours = Array.from(
    { length: latestHour - earliestHour + 1 },
    (_, i) => earliestHour + i
  );

  function getBlockStyle(block: ClassBlock) {
    const top =
      (block.startHour - earliestHour) * HOUR_HEIGHT +
      (block.startMinute / 60) * HOUR_HEIGHT;
    const height = (block.durationMinutes / 60) * HOUR_HEIGHT;
    return { top: `${top}px`, height: `${height}px` };
  }

  return (
    <div className="soft-card overflow-hidden rounded-[34px] p-3">
      <div className="overflow-x-auto">
        <div className="min-w-[560px] sm:min-w-[620px]">
          <div className="mb-2 flex rounded-[24px] bg-[#fbfbfd] px-2 py-2">
            <div className="w-14 flex-shrink-0" />
            {DAYS.map((day, i) => (
              <div
                key={day}
                className={cn(
                  "flex-1 rounded-full py-2 text-center text-sm font-semibold",
                  i === 5
                    ? "text-primary"
                    : i === 6
                      ? "text-rose-500"
                      : "text-text-primary"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="relative flex rounded-[26px] bg-white/70">
            <div className="w-14 flex-shrink-0 rounded-l-[26px] bg-[#fbfbfd] py-2">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="pr-2 text-right text-[11px] text-text-secondary"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  {hour}:00
                </div>
              ))}
            </div>

            {DAYS.map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="relative flex-1 border-l border-white/60"
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-slate-100/80"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                {classes
                  .filter((c) => c.day === dayIndex)
                  .map((block) => (
                    <div
                      key={block.id}
                      className="absolute left-1 right-1 overflow-hidden rounded-[18px] px-2 py-2 shadow-[0_12px_22px_rgba(188,196,222,0.18)]"
                      style={{
                        ...getBlockStyle(block),
                        backgroundColor: `${block.color}22`,
                        border: `1px solid ${block.color}33`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 18px ${block.color}18`,
                      }}
                    >
                      <p
                        className="truncate text-[11px] font-semibold"
                        style={{ color: block.color }}
                      >
                        {block.name}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-text-secondary">
                        {block.academyName}
                      </p>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
