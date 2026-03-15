import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Search,
  Sparkles,
} from "lucide-react";
import {
  PublicHeader,
  type PublicHeaderNavItem,
} from "@/components/navigation/PublicHeader";
import { cn } from "@/lib/utils";
import characterDancer from "../../images/characters/edupick_character_1.png";
import characterSoccer from "../../images/characters/edupick_character_2.png";
import characterReader from "../../images/characters/edupick_character_3.png";
import characterMartial from "../../images/characters/edupick_character_4.png";
import characterTeacher from "../../images/characters/edupick_character_5.png";
import characterLaptop from "../../images/characters/edupick_character_8.png";

const introNavItems = [
  { href: "#why", label: "핵심 가치" },
  { href: "#flow", label: "이용 흐름" },
  { href: "#start", label: "시작하기" },
] satisfies readonly PublicHeaderNavItem[];

const heroCards = [
  {
    id: "today",
    label: "TODAY",
    title: "오늘 챙길 일정만 바로 보여줘요",
    description: "수업 시간, 원비 일정, 준비물 공지를 한 번에 확인할 수 있어요.",
    items: ["오늘 16:00 영어 회화 A", "원비 납부 3일 전", "준비물 공지"],
    panelTone:
      "sm:col-span-2 bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)]",
    image: characterReader,
    imageClassName: "right-4 top-4 w-[64px] sm:w-[72px]",
    contentClassName: "pr-20 sm:pr-24",
  },
  {
    id: "compare",
    label: "COMPARE",
    title: "아이에게 맞는 학원을 찾기 쉬워져요",
    description: "시간표, 셔틀, 월 수강료를 한눈에 비교할 수 있어요.",
    items: ["시간표", "셔틀 여부", "월 수강료"],
    panelTone: "bg-white/88",
    image: characterDancer,
    imageClassName: "right-4 top-4 w-[58px] sm:w-[66px]",
    contentClassName: "pr-18 sm:pr-20",
  },
  {
    id: "apply",
    label: "PAYMENT",
    title: "신청 후에도 계속 편하게",
    description: "등록한 뒤 일정 확인과 원비 납부까지 이어서 챙길 수 있어요.",
    items: ["납부 예정", "카드 결제", "최근 공지"],
    panelTone: "bg-[linear-gradient(180deg,#fffaf2_0%,#ffefdd_100%)]",
    image: characterSoccer,
    imageClassName: "right-4 top-4 w-[58px] sm:w-[66px]",
    contentClassName: "pr-18 sm:pr-20",
  },
] as const;

const coreBenefits = [
  {
    icon: Search,
    title: "아이에게 맞는 학원을 고르기 쉬워져요",
    description:
      "거리보다 더 중요한 시간표, 셔틀, 수강료를 먼저 보고 아이에게 맞는 수업만 빠르게 찾을 수 있어요.",
  },
  {
    icon: CreditCard,
    title: "마음에 드는 수업은 바로 신청할 수 있어요",
    description:
      "학원 상세에서 다시 헤매지 않고, 보고 있던 반 정보와 비용 그대로 신청까지 이어집니다.",
  },
  {
    icon: CalendarDays,
    title: "등록 후 일정과 원비도 편하게 챙길 수 있어요",
    description:
      "오늘 수업, 원비 납부, 최근 공지를 한 화면에서 확인해 놓치지 않게 도와드려요.",
  },
] satisfies readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[];

const journeyCards = [
  {
    id: "parent",
    label: "PARENT FLOW",
    title: "학부모는 필요한 정보만 빠르게 확인할 수 있어요",
    description:
      "아이에게 맞는 학원을 찾고, 신청하고, 일정과 원비까지 한 곳에서 챙길 수 있어요.",
    steps: [
      "시간표와 셔틀이 맞는 학원부터 쉽게 고를 수 있어요.",
      "마음에 드는 반은 월 수강료를 확인한 뒤 바로 신청할 수 있어요.",
      "등록 후에는 홈에서 일정, 원비, 공지를 함께 챙길 수 있어요.",
    ],
    ctaHref: "/discover",
    ctaLabel: "학원 둘러보기",
    panelTone: "bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)]",
    sprite: characterTeacher,
    spriteClassName: "right-[8px] top-[10px] w-[108px] sm:right-[12px] sm:top-[12px] sm:w-[128px]",
  },
  {
    id: "studio",
    label: "INSTRUCTOR FLOW",
    title: "강사와 원장은 운영을 더 가볍게 관리할 수 있어요",
    description:
      "반 운영과 원생 정보, 원비 현황을 한 화면에서 보고 아이들에게 더 집중할 수 있어요.",
    steps: [
      "강사 전용 화면으로 바로 들어갈 수 있어요.",
      "반, 원생, 일정 상태를 한 번에 확인하고 수정할 수 있어요.",
      "원비 현황과 공지도 같은 곳에서 챙길 수 있어요.",
    ],
    ctaHref: "/instructor",
    ctaLabel: "강사 전용 보기",
    panelTone: "bg-[linear-gradient(180deg,#fffaf2_0%,#ffefdd_100%)]",
    sprite: characterLaptop,
    spriteClassName: "right-[6px] top-[10px] w-[112px] sm:right-[12px] sm:top-[12px] sm:w-[128px]",
  },
] as const;

type CtaLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

type CharacterSpriteProps = {
  src: StaticImageData;
  className?: string;
  priority?: boolean;
  sizes?: string;
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
        variant === "ghost" && "px-0 py-0 text-text-primary hover:text-primary",
        className
      )}
    >
      {children}
    </Link>
  );
}

function CharacterSprite({
  src,
  className,
  priority = false,
  sizes = "(min-width: 1024px) 320px, 40vw",
}: CharacterSpriteProps) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      priority={priority}
      sizes={sizes}
      draggable={false}
      className={cn("pointer-events-none absolute h-auto select-none", className)}
      style={{ maxWidth: src.width }}
    />
  );
}

function trimSentenceEnding(text: string) {
  return text.replace(/[.!?]+$/u, "");
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
          subtitle="학원 탐색부터 원비 납부까지 한 곳에서"
        />

        <section className="relative mt-5 overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(180deg,#fbfdff_0%,#eef5ff_100%)] px-5 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:px-7 sm:py-8 lg:rounded-[44px] lg:px-12 lg:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_24%),radial-gradient(circle_at_85%_16%,rgba(90,166,255,0.24),transparent_18%),radial-gradient(circle_at_48%_74%,rgba(255,194,122,0.2),transparent_22%)]"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:items-center lg:gap-10">
            <div className="max-w-[560px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/84 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-text-secondary shadow-[0_14px_28px_rgba(148,163,184,0.14)]">
                <Sparkles size={14} className="text-primary" />
                FOR BUSY PARENTS
              </span>

              <h1 className="display-font mt-5 text-[2.45rem] font-bold leading-[0.97] tracking-[-0.07em] text-text-primary sm:text-[3.4rem] lg:text-[4.25rem]">
                아이 학원 일정,
                <br />
                아직도 따로 챙기고 계신가요?
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-7 text-text-secondary sm:text-base sm:leading-8 lg:text-lg">
                {trimSentenceEnding(
                  "EduPick 하나면 학원 탐색부터 신청, 일정 확인, 원비 납부까지 한 곳에서 할 수 있어요."
                )}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <CtaLink href="/signup">
                  학부모로 시작하기
                  <ArrowRight size={18} />
                </CtaLink>
                <CtaLink href="/instructor" variant="secondary">
                  강사 전용 보기
                </CtaLink>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
              {heroCards.map((card) => (
                <article
                  key={card.id}
                  className={cn(
                    "relative overflow-hidden rounded-[30px] border border-white/75 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6",
                    card.panelTone
                  )}
                >
                  <CharacterSprite
                    src={card.image}
                    className={cn(
                      "drop-shadow-[0_16px_24px_rgba(120,146,193,0.14)]",
                      card.imageClassName
                    )}
                    priority={card.id === "today"}
                    sizes="(min-width: 1024px) 72px, 18vw"
                  />

                  <div className={cn("relative z-10", card.contentClassName)}>
                    <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                      {card.label}
                    </p>
                    <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-text-primary sm:text-2xl">
                      {card.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-text-secondary">
                      {trimSentenceEnding(card.description)}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {card.items.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-[0_10px_18px_rgba(148,163,184,0.12)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="why" className="mt-16 scroll-mt-28">
          <div className="max-w-[640px]">
            <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
              WHY EDU PICK
            </p>
            <h2 className="display-font mt-3 text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
              처음부터 복잡하지 않게 시작할 수 있어요
            </h2>
            <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base sm:leading-8">
              {trimSentenceEnding(
                "꼭 필요한 정보만 먼저 보여드려서 학원 찾기와 일정 관리가 훨씬 쉬워져요."
              )}
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {coreBenefits.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-[30px] border border-white/75 bg-white/86 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_100%)] text-primary shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
                    {trimSentenceEnding(item.description)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="flow" className="mt-16 scroll-mt-28">
          <div className="max-w-[680px] lg:max-w-[860px] xl:max-w-[920px]">
            <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
              CLEAR ENTRY
            </p>
            <h2 className="display-font mt-3 text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
              학부모와 강사 모두를 위한 EduPick
            </h2>
            <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base sm:leading-8">
              학부모는 아이 학원 탐색 및 일정 관리를 간편하게 할 수 있어요. 강사는
              학원 운영보다는 아이들에게 집중할 수 있어요.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {journeyCards.map((card) => (
              <article
                key={card.id}
                className={cn(
                  "relative overflow-hidden rounded-[34px] border border-white/75 p-5 shadow-[0_20px_52px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7",
                  card.panelTone
                )}
              >
                <div className="relative z-10">
                  <div className="max-w-[430px] pr-16 sm:pr-24 lg:max-w-[460px] lg:pr-28">
                    <span className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                      {card.label}
                    </span>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
                      {trimSentenceEnding(card.description)}
                    </p>
                  </div>

                  <ol className="mt-6 space-y-3">
                    {card.steps.map((step, index) => (
                      <li
                        key={step}
                        className="flex items-start gap-3 rounded-[24px] border border-white/80 bg-white/78 px-4 py-4 shadow-[0_12px_26px_rgba(148,163,184,0.12)]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#192338] text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="text-sm leading-6 text-text-secondary">
                          {trimSentenceEnding(step)}
                        </span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-6">
                    <CtaLink href={card.ctaHref} variant="ghost" className="gap-2">
                      {card.ctaLabel}
                      <ArrowRight size={16} />
                    </CtaLink>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.74),transparent_60%)]"
                />
                <CharacterSprite
                  src={card.sprite}
                  className={cn(
                    "float-gentle-slow drop-shadow-[0_16px_26px_rgba(120,146,193,0.14)]",
                    card.spriteClassName
                  )}
                  sizes="(min-width: 1024px) 180px, 20vw"
                />
              </article>
            ))}
          </div>
        </section>

        <section
          id="start"
          className="relative mt-16 overflow-hidden rounded-[36px] bg-[#121b2d] px-5 py-7 text-white shadow-[0_28px_72px_rgba(15,23,42,0.18)] sm:px-7 sm:py-8 lg:rounded-[40px] lg:px-10 lg:py-10"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.12),transparent_18%),radial-gradient(circle_at_86%_78%,rgba(78,156,255,0.22),transparent_22%)]"
          />
          <div className="relative max-w-[680px]">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/60">
              START HERE
            </p>
            <h2 className="display-font mt-3 text-3xl font-bold tracking-[-0.06em] text-white sm:text-4xl">
              학원 찾기부터 원비 납부까지, 한 번에 할 수 있어요
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/72 sm:text-base sm:leading-8">
              {trimSentenceEnding(
                "우리 아이에게 맞는 수업을 찾고, 일정과 원비까지 편하게 챙겨보세요."
              )}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CtaLink href="/signup">
                학부모로 시작하기
                <ArrowRight size={18} />
              </CtaLink>
              <CtaLink
                href="/login"
                variant="secondary"
                className="border-white/16 bg-white/10 text-white hover:bg-white/16"
              >
                로그인
              </CtaLink>
            </div>
          </div>

          <CharacterSprite
            src={characterMartial}
            className="float-gentle-delayed bottom-[-44px] right-[-16px] w-[138px] opacity-90 drop-shadow-[0_18px_30px_rgba(24,35,56,0.34)] sm:w-[168px] lg:w-[192px]"
            sizes="(min-width: 1024px) 160px, 18vw"
          />
        </section>
      </div>
    </main>
  );
}
