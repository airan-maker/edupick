import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  MapPinned,
  MessagesSquare,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
} from "lucide-react";
import {
  PublicHeader,
  type PublicHeaderNavItem,
} from "@/components/navigation/PublicHeader";
import { PublicLandingDataSection } from "@/components/public/PublicLandingDataSection";
import { cn } from "@/lib/utils";
import heroBackground from "../../images/background.png";

const introNavItems = [
  { href: "#service", label: "서비스 소개" },
  { href: "#parent", label: "학부모 흐름" },
  { href: "#proof", label: "실제 데이터" },
  { href: "#instructor", label: "강사 운영" },
  { href: "#start", label: "시작하기" },
] satisfies readonly PublicHeaderNavItem[];

const quickStats = [
  { label: "첫 방문", value: "탐색부터 신청까지 이해" },
  { label: "학부모 진입", value: "/home" },
  { label: "강사 진입", value: "/studio" },
] as const;

const serviceStories = [
  {
    number: "01",
    eyebrow: "SEARCH FIRST",
    title: "찾을 때는 지도보다 반 정보가 먼저 보입니다",
    description:
      "학부모가 실제로 비교하는 기준은 거리만이 아니라 시간표, 셔틀, 수강료, 남은 자리입니다. 검색 결과를 한 화면에서 바로 읽게 정리했습니다.",
    bullets: [
      "필터를 다시 열지 않아도 중요한 조건이 카드 안에 남습니다.",
      "탐색 화면에서 반 선택과 신청으로 자연스럽게 이어집니다.",
    ],
    panelTone: "bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)]",
    panelLabel: "Nearby classes",
    panelValue: "도보 8분",
    panelHeading: "거리보다 실제 선택 정보가 먼저 보이는 탐색 화면",
    panelItems: [
      "영어 회화 A · 화/목 16:00 · 셔틀 가능",
      "피아노 입문 · 월/수 17:30 · 2자리 남음",
      "코딩 프로젝트 · 토 10:00 · 월 180,000원",
    ],
    chips: ["시간표 유지", "셔틀 여부", "남은 자리 확인"],
  },
  {
    number: "02",
    eyebrow: "NO DEAD END",
    title: "신청할 때는 비교하던 맥락이 끊기지 않습니다",
    description:
      "좋아 보이는 학원을 찾았더라도 신청 전에 조건이 사라지면 다시 비교하게 됩니다. EduPick은 반 정보와 비용을 유지한 채 결제로 이어집니다.",
    bullets: [
      "반 이름, 요일, 시간, 월 수강료를 결제 직전까지 유지합니다.",
      "처음부터 다시 탐색하지 않도록 화면 간 정보를 연결했습니다.",
    ],
    panelTone: "bg-[linear-gradient(180deg,#fff7eb_0%,#ffffff_100%)]",
    panelLabel: "Enrollment",
    panelValue: "3분 이내",
    panelHeading: "신청과 결제가 탐색의 연장선으로 이어지는 구조",
    panelItems: [
      "선택한 반: 초등 수학 심화반",
      "월 수강료 210,000원 · 카드 결제 가능",
      "등록 후 홈과 캘린더에 일정 자동 반영",
    ],
    chips: ["비용 확인", "신청 즉시 등록", "일정 자동 반영"],
  },
  {
    number: "03",
    eyebrow: "AFTER LOGIN",
    title: "등록 이후에는 설명이 아니라 실행 화면이 나옵니다",
    description:
      "공개 페이지는 소개에 집중하고, 로그인 후에는 바로 행동할 수 있는 대시보드가 열려야 합니다. 첫 방문자와 재방문자의 목적을 분리했습니다.",
    bullets: [
      "공지, 결제, 다음 수업을 `/home` 첫 화면에서 바로 확인합니다.",
      "학부모와 강사 모두 로그인 뒤에는 역할별 홈으로 즉시 이동합니다.",
    ],
    panelTone: "bg-[linear-gradient(180deg,#f3f7ff_0%,#ffffff_100%)]",
    panelLabel: "Home dashboard",
    panelValue: "오늘 할 일 4개",
    panelHeading: "로그인 뒤에는 바로 확인하고 바로 처리하는 홈",
    panelItems: [
      "오늘 16:00 영어 회화 A 수업",
      "이번 주 결제 예정 1건",
      "새 공지 2건 · 준비물 업데이트 포함",
    ],
    chips: ["공지 확인", "결제 예정", "자녀별 일정"],
  },
] as const;

const parentJourney = [
  {
    title: "비교할 때는 조건을 먼저 좁힙니다",
    description:
      "거리, 셔틀, 시간표, 월 수강료를 기준으로 아이 일정에 맞는 반만 빠르게 추립니다.",
    highlight: "거리 · 셔틀 · 시간표",
  },
  {
    title: "신청할 때는 선택한 반이 그대로 이어집니다",
    description:
      "학원 상세에서 반을 다시 찾지 않고, 고른 반 정보와 가격을 유지한 채 등록과 결제로 연결합니다.",
    highlight: "반 정보 유지",
  },
  {
    title: "등록 뒤에는 홈에서 다시 챙깁니다",
    description:
      "오늘 수업, 이번 주 일정, 결제 예정, 최근 공지를 홈과 캘린더에서 한 번에 봅니다.",
    highlight: "홈 · 캘린더 자동 연결",
  },
] as const;

const instructorHighlights = [
  {
    icon: Building2,
    title: "학원과 반 운영",
    description: "학원 정보, 시간표, 정원, 상태를 스튜디오 화면에서 바로 수정합니다.",
  },
  {
    icon: UsersRound,
    title: "원생 관리",
    description: "수강 상태, 보호자 연락처, 특이사항을 운영 흐름 안에 남깁니다.",
  },
  {
    icon: Wallet,
    title: "수납 현황",
    description: "입금 대기와 최근 수납을 보고 미납 리마인더를 바로 보냅니다.",
  },
  {
    icon: MessagesSquare,
    title: "공지 이력",
    description: "반 공지와 채널별 발송 기록이 흩어지지 않고 한 곳에 남습니다.",
  },
] as const;

const trustPoints = [
  "공개 페이지에서는 서비스 구조만 설명하고, 앱 안에서는 실제 실행 화면을 보여 줍니다.",
  "학부모와 강사의 첫 화면을 분리해 정보 구조와 CTA를 더 단순하게 만들었습니다.",
  "추천 학원과 실제 후기를 랜딩 안에 바로 넣어 서비스 설명이 비어 보이지 않게 했습니다.",
] as const;

type CtaLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

function CtaLink({
  href,
  children,
  variant = "primary",
  className,
}: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-base",
        variant === "primary" &&
          "bg-[linear-gradient(135deg,#4b97ff_0%,#3182f6_100%)] text-white shadow-[0_22px_44px_rgba(49,130,246,0.28)] hover:-translate-y-0.5",
        variant === "secondary" &&
          "border border-white/75 bg-white/88 text-text-primary shadow-[0_16px_32px_rgba(148,163,184,0.18)] hover:-translate-y-0.5 hover:bg-white",
        variant === "ghost" &&
          "px-0 py-0 text-text-primary hover:text-primary",
        className
      )}
    >
      {children}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="relative overflow-hidden px-4 pb-20 pt-4 sm:px-6 sm:pb-24 lg:px-8"
    >
      <div className="mx-auto max-w-[1180px]">
        <PublicHeader
          navItems={introNavItems}
          subtitle="학원 탐색부터 강사 운영까지 하나의 흐름으로"
        />

        <section className="relative isolate mt-5 overflow-hidden rounded-[44px] border border-white/75 bg-[linear-gradient(135deg,#f9fbff_0%,#eef4ff_54%,#f7fbff_100%)] px-6 py-8 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <Image
              src={heroBackground}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-[0.18]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(249,251,255,0.96)_0%,rgba(249,251,255,0.9)_24%,rgba(249,251,255,0.74)_48%,rgba(249,251,255,0.82)_70%,rgba(249,251,255,0.96)_100%)]" />
            <div className="absolute -left-12 top-0 h-48 w-48 rounded-full bg-white/80 blur-3xl" />
            <div className="absolute right-[-8%] top-[12%] h-56 w-56 rounded-full bg-sky-200/55 blur-3xl" />
            <div className="absolute bottom-[-18%] left-[36%] h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/84 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-text-secondary shadow-[0_14px_28px_rgba(148,163,184,0.14)]">
                <Sparkles size={14} className="text-primary" />
                BETTER FIRST IMPRESSION
              </span>
              <h1 className="display-font mt-6 text-4xl font-bold leading-[0.98] tracking-[-0.07em] text-text-primary sm:text-5xl lg:text-[4.35rem]">
                학원 탐색부터 등록 뒤 일정까지,
                <br />
                한 번에 이어지는 랜딩.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
                카드만 늘어선 소개 페이지 대신, 첫 화면에서 서비스 흐름과 실제
                앱 경험이 함께 보이도록 재구성했습니다. 학부모는 비교와 신청을,
                강사는 운영과 수납을 바로 이해할 수 있습니다.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <CtaLink href="/signup">
                  학부모로 시작하기
                  <ArrowRight size={18} />
                </CtaLink>
                <CtaLink href="/discover" variant="secondary">
                  학원 둘러보기
                </CtaLink>
                <CtaLink href="/instructor" variant="secondary">
                  강사 전용 보기
                </CtaLink>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {quickStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[28px] border border-white/75 bg-white/84 px-5 py-5 shadow-[0_16px_32px_rgba(148,163,184,0.14)]"
                  >
                    <p className="text-lg font-semibold text-text-primary">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[32px] border border-white/70 bg-white/72 p-5 shadow-[0_18px_36px_rgba(148,163,184,0.12)] backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                    탐색
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-text-secondary">
                    신청
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-text-secondary">
                    일정
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-text-secondary">
                    공지
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
                  소개 페이지는 흐름을 보여 주고, 로그인 뒤에는 각 역할의 홈으로
                  즉시 진입합니다. 랜딩과 제품 화면이 따로 놀지 않게 연결했습니다.
                </p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[470px]">
              <div className="absolute -left-2 top-8 rounded-full bg-white px-4 py-2 text-xs font-semibold text-text-primary shadow-[0_18px_36px_rgba(148,163,184,0.18)] sm:-left-10">
                <span className="inline-flex items-center gap-2">
                  <MapPinned size={14} className="text-primary" />
                  도보 8분 학원 추천
                </span>
              </div>
              <div className="absolute right-0 top-0 rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_34px_rgba(15,23,42,0.22)] sm:right-2">
                <span className="inline-flex items-center gap-2">
                  <BellRing size={14} className="text-blue-300" />
                  새 공지 2건
                </span>
              </div>

              <div className="relative rounded-[42px] bg-[#111827] p-3 shadow-[0_32px_80px_rgba(15,23,42,0.24)]">
                <div className="rounded-[34px] bg-white p-5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                    <span>EduPick mobile</span>
                    <span>09:41</span>
                  </div>

                  <div className="mt-5 rounded-[28px] bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                          SEARCH
                        </p>
                        <p className="mt-1 text-lg font-semibold text-text-primary">
                          가까운 반을 먼저 추천
                        </p>
                      </div>
                      <span className="rounded-full bg-white p-2 text-primary shadow-[0_10px_22px_rgba(148,163,184,0.14)]">
                        <Search size={18} />
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-[22px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                        <p className="text-sm font-semibold text-text-primary">
                          초등 영어 회화 A
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          화/목 16:00 · 셔틀 가능 · 리뷰 42개
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                        <p className="text-sm font-semibold text-text-primary">
                          피아노 입문반
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          월/수 17:30 · 도보 8분 · 월 170,000원
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[26px] bg-[linear-gradient(180deg,#fff7eb_0%,#ffffff_100%)] p-4">
                      <div className="flex items-center gap-3">
                        <span className="rounded-[18px] bg-white p-2 text-accent">
                          <CreditCard size={16} />
                        </span>
                        <p className="text-sm font-semibold text-text-primary">
                          결제 예정
                        </p>
                      </div>
                      <p className="mt-4 text-xs leading-6 text-text-secondary">
                        이번 주 결제 1건과 입금 상태를 홈에서 바로 확인합니다.
                      </p>
                    </div>
                    <div className="rounded-[26px] bg-[linear-gradient(180deg,#eefbf4_0%,#ffffff_100%)] p-4">
                      <div className="flex items-center gap-3">
                        <span className="rounded-[18px] bg-white p-2 text-secondary">
                          <CalendarDays size={16} />
                        </span>
                        <p className="text-sm font-semibold text-text-primary">
                          다음 수업
                        </p>
                      </div>
                      <p className="mt-4 text-xs leading-6 text-text-secondary">
                        등록 직후 일정이 홈과 캘린더에 자동 반영됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 right-0 w-[72%] rounded-[30px] bg-[#172033] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
                <p className="text-xs font-semibold tracking-[0.16em] text-white/60">
                  OPERATOR SNAPSHOT
                </p>
                <p className="mt-2 text-lg font-semibold">오늘 운영 현황</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-[22px] bg-white/8 px-3 py-3">
                    <p className="text-white/60">미납</p>
                    <p className="mt-1 font-semibold">6건</p>
                  </div>
                  <div className="rounded-[22px] bg-white/8 px-3 py-3">
                    <p className="text-white/60">공지</p>
                    <p className="mt-1 font-semibold">2건</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="service"
          className="mt-24 grid gap-8 scroll-mt-28 lg:grid-cols-[0.82fr_1.18fr]"
        >
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
              SERVICE STORY
            </p>
            <h2 className="display-font mt-4 text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
              화면이 곧 설명이 되도록,
              <br />
              카드 나열형 소개를 걷어냈습니다.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-text-secondary">
              토스 랜딩처럼 큰 메시지와 실제 제품 장면을 번갈아 배치해 읽는
              흐름을 만들었습니다. 각 섹션은 하나의 주장과 하나의 화면 인상을
              담당합니다.
            </p>
          </div>

          <div className="space-y-5">
            {serviceStories.map((story) => (
              <article
                key={story.title}
                className="grid gap-6 rounded-[40px] border border-white/75 bg-white/88 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center"
              >
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary">
                    {story.eyebrow}
                  </p>
                  <div className="mt-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-text-primary">
                    {story.number}
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                    {story.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
                    {story.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {story.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-secondary"
                        />
                        <span className="text-sm leading-6 text-text-secondary">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={cn("rounded-[34px] p-5 sm:p-6", story.panelTone)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-text-primary shadow-[0_10px_20px_rgba(148,163,184,0.12)]">
                      {story.panelLabel}
                    </span>
                    <span className="text-xs font-semibold text-text-secondary">
                      {story.panelValue}
                    </span>
                  </div>
                  <p className="mt-6 text-xl font-semibold tracking-[-0.03em] text-text-primary">
                    {story.panelHeading}
                  </p>

                  <div className="mt-5 space-y-3">
                    {story.panelItems.map((item) => (
                      <div
                        key={item}
                        className="rounded-[24px] border border-white/80 bg-white/92 px-4 py-3 text-sm leading-6 text-text-secondary shadow-[0_10px_24px_rgba(148,163,184,0.12)]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {story.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-text-secondary"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="parent"
          className="mt-28 overflow-hidden rounded-[44px] border border-white/75 bg-[linear-gradient(180deg,#f7fbff_0%,#edf5ff_100%)] px-6 py-8 shadow-[0_26px_70px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 lg:px-12 lg:py-12"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:items-center">
            <div className="relative order-2 min-h-[470px] lg:order-1">
              <div className="absolute left-0 top-10 w-[82%] rounded-[36px] border border-white/85 bg-white/92 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                      PARENT HOME
                    </p>
                    <p className="mt-2 text-xl font-semibold text-text-primary">
                      로그인 뒤에는 오늘 해야 할 일만 먼저
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                    `/home`
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[26px] bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] p-4">
                    <p className="text-sm font-semibold text-text-primary">오늘 수업</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                      16:00
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-secondary">
                      초등 영어 회화 A 수업과 준비물을 함께 확인합니다.
                    </p>
                  </div>
                  <div className="rounded-[26px] bg-[linear-gradient(180deg,#fff7eb_0%,#ffffff_100%)] p-4">
                    <p className="text-sm font-semibold text-text-primary">다음 결제</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                      3일 후
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-secondary">
                      이번 주 결제 예정과 최근 공지를 한 화면에 보여 줍니다.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[28px] bg-slate-50 px-5 py-4">
                  <p className="text-sm font-semibold text-text-primary">
                    새 공지
                  </p>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">
                    토요일 공개 수업 준비물 안내가 업데이트되었습니다. 학원별
                    공지가 카톡방 대신 서비스 안에 남습니다.
                  </p>
                </div>
              </div>

              <div className="absolute right-0 top-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-text-primary shadow-[0_16px_34px_rgba(148,163,184,0.16)]">
                신청 완료 후 일정 자동 반영
              </div>

              <div className="absolute bottom-0 right-0 w-[64%] rounded-[30px] bg-[#172033] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold tracking-[0.16em] text-white/60">
                  CALENDAR
                </p>
                <p className="mt-2 text-lg font-semibold">이번 주 일정</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-[22px] bg-white/8 px-4 py-3">
                    화 16:00 · 영어 회화 A
                  </div>
                  <div className="rounded-[22px] bg-white/8 px-4 py-3">
                    목 17:30 · 피아노 입문반
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                PARENT FLOW
              </p>
              <h2 className="display-font mt-4 text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
                학부모는 탐색에서 끝나지 않고
                <br />
                홈으로 자연스럽게 이어집니다
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
                첫 방문에서는 서비스 구조를 이해하고, 로그인 후에는 다시 설명을
                읽지 않도록 바로 사용할 수 있는 화면으로 이동합니다.
              </p>

              <div className="mt-8 space-y-4">
                {parentJourney.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-[30px] border border-white/70 bg-white/80 p-5 shadow-[0_14px_30px_rgba(148,163,184,0.12)]"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-text-secondary">
                          {item.description}
                        </p>
                        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-text-secondary">
                          {item.highlight}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[32px] border border-white/70 bg-white/78 p-5">
                <div className="flex items-start gap-3">
                  <span className="rounded-[18px] bg-emerald-50 p-3 text-secondary">
                    <ShieldCheck size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      소개 페이지와 앱 홈의 역할을 분리했습니다
                    </p>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">
                      공개 페이지는 설득, 로그인 후 홈은 실행에 집중합니다. 이
                      구분이 있어야 랜딩도 더 간결해지고 앱도 더 빠르게 씁니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PublicLandingDataSection />

        <section
          id="instructor"
          className="mt-28 overflow-hidden rounded-[44px] bg-[#111823] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:px-8 sm:py-10 lg:px-12 lg:py-12"
        >
          <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-white/60">
                INSTRUCTOR FLOW
              </p>
              <h2 className="display-font mt-4 text-3xl font-bold tracking-[-0.06em] text-white sm:text-4xl">
                강사 화면은 따로 빼서
                <br />
                운영에 맞는 리듬을 줬습니다
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/68">
                학부모에게는 탐색과 신청이 중요하고, 강사에게는 반 운영과 수납이
                중요합니다. 첫 화면부터 두 역할의 문법을 분리해야 혼선이 줄어듭니다.
              </p>

              <div className="mt-8 divide-y divide-white/10">
                {instructorHighlights.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <span className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/8 text-blue-300">
                        <Icon size={20} />
                      </span>
                      <div>
                        <p className="text-base font-semibold text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-7 text-white/65">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <CtaLink href="/instructor">
                  강사 전용 페이지 열기
                  <ArrowRight size={18} />
                </CtaLink>
              </div>
            </div>

            <div className="relative">
              <div className="absolute right-0 top-2 rounded-full bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_36px_rgba(49,130,246,0.28)]">
                미납 리마인더 6건
              </div>

              <div className="rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_100%)] p-5 backdrop-blur-xl sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] bg-white/7 px-4 py-4">
                    <p className="text-xs font-semibold text-white/55">오늘 수업</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                      12개
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-white/7 px-4 py-4">
                    <p className="text-xs font-semibold text-white/55">입금 완료</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                      24건
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-white/7 px-4 py-4">
                    <p className="text-xs font-semibold text-white/55">공지 발송</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                      2건
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-[30px] bg-white/7 p-5">
                    <p className="text-sm font-semibold text-white">오늘 처리할 일</p>
                    <div className="mt-4 space-y-3 text-sm text-white/68">
                      <div className="rounded-[22px] bg-white/6 px-4 py-3">
                        초등 수학 심화반 정원 2자리 남음
                      </div>
                      <div className="rounded-[22px] bg-white/6 px-4 py-3">
                        금요일 반 공지 발송 예약 확인
                      </div>
                      <div className="rounded-[22px] bg-white/6 px-4 py-3">
                        3월 미납 보호자 6명 리마인더 전송
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] bg-white p-5 text-text-primary shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                          STUDIO SNAPSHOT
                        </p>
                        <p className="mt-2 text-lg font-semibold text-text-primary">
                          운영과 수납이 한 화면에 정리됩니다
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                        `/studio`
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-text-primary">
                          최근 입금
                        </p>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          14:22 김민준 보호자 · 영어 회화 A · 카드 승인 완료
                        </p>
                      </div>
                      <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-text-primary">
                          공지 이력
                        </p>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          이번 주 휴강 안내가 카카오 알림과 앱 공지에 동시에 남습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="start"
          className="mt-24 overflow-hidden rounded-[40px] border border-white/75 bg-[linear-gradient(135deg,#ffffff_0%,#f4f8ff_56%,#eef5ff_100%)] px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                GET STARTED
              </p>
              <h2 className="display-font mt-4 text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
                역할에 맞는 첫 화면만 남겨
                <br />
                랜딩의 리듬을 정리했습니다
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
                이제 공개 페이지는 서비스 흐름과 실제 데이터에 집중하고, 제품
                화면은 로그인 후 역할별 홈으로 바로 이어집니다. 읽기보다 바로
                움직일 수 있는 랜딩을 목표로 했습니다.
              </p>

              <div className="mt-8 space-y-3">
                {trustPoints.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      size={18}
                      className="mt-1 shrink-0 text-secondary"
                    />
                    <p className="text-sm leading-7 text-text-secondary">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <CtaLink href="/signup" className="justify-between">
                학부모 회원가입
                <ArrowRight size={18} />
              </CtaLink>
              <CtaLink href="/login" variant="secondary" className="justify-between">
                로그인
                <ArrowRight size={18} />
              </CtaLink>
              <CtaLink
                href="/instructor"
                variant="secondary"
                className="justify-between"
              >
                강사 전용 진입
                <ArrowRight size={18} />
              </CtaLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
