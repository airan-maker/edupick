import Link from "next/link";
import {
  BellRing,
  Building2,
  CreditCard,
  UsersRound,
} from "lucide-react";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { Card } from "@/components/ui/Card";

const features = [
  {
    icon: Building2,
    title: "학원/반 운영",
    description: "학원 정보, 반 시간표, 정원, 상태를 한 화면에서 관리합니다.",
  },
  {
    icon: UsersRound,
    title: "원생 관리",
    description: "보호자 연락처, 메모, 수강 상태를 운영 화면에서 바로 수정합니다.",
  },
  {
    icon: BellRing,
    title: "공지/미납 알림",
    description: "반 공지와 미납 알림 발송 이력을 강사 화면에서 관리합니다.",
  },
  {
    icon: CreditCard,
    title: "수납/통계",
    description: "입금 대기, 최근 결제, 기간별 운영 통계를 한눈에 확인합니다.",
  },
] as const;

export default function InstructorEntryPage() {
  return (
    <div className="min-h-screen overflow-hidden px-4 py-5 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <PublicHeader />

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
          <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 sm:p-7">
            <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-primary">
              강사 전용
            </span>
            <h1 className="display-font mt-4 text-3xl font-bold leading-[1.06] tracking-[-0.06em] text-text-primary sm:text-4xl">
              강사 계정으로 로그인하면
              <br />
              운영 화면이 바로 열립니다
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-text-secondary">
              학원, 반, 원생, 공지, 원비 현황을 바로 확인하고 필요한 작업을 이어서
              처리할 수 있습니다
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login?role=INSTRUCTOR"
                className="rounded-full bg-[linear-gradient(135deg,#84b9ff_0%,#69a8ff_100%)] px-6 py-3.5 text-center text-sm font-semibold text-white shadow-[0_18px_34px_rgba(106,168,255,0.32)]"
              >
                강사 로그인
              </Link>
              <Link
                href="/signup?role=INSTRUCTOR"
                className="rounded-full border border-white/70 bg-white/80 px-6 py-3.5 text-center text-sm font-semibold text-text-primary shadow-[0_12px_24px_rgba(193,199,221,0.22)]"
              >
                강사 회원가입
              </Link>
            </div>
          </Card>

          <div className="grid gap-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-amber-50 text-accent">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-xs leading-6 text-text-secondary">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
