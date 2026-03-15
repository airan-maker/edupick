"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CircleHelp,
  MessageSquareQuote,
  Star,
} from "lucide-react";
import { AcademyCard } from "@/components/academy/AcademyCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { publicFaqItems } from "@/lib/public-faq";

interface LandingHighlightAcademy {
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
    ageGroup: string | null;
    monthlyFee: number;
    scheduleSummary: string;
    spotsLeft: number;
  } | null;
}

interface LandingHighlightReview {
  id: string;
  rating: number;
  content: string | null;
  isVerified: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
  academy: {
    id: string;
    name: string;
    address: string;
    category: string;
    hasShuttle: boolean;
  };
}

interface LandingHighlightsResponse {
  featuredAcademies: LandingHighlightAcademy[];
  featuredReviews: LandingHighlightReview[];
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

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

export function PublicLandingDataSection() {
  const highlightsQuery = useQuery({
    queryKey: ["public-landing-highlights"],
    queryFn: () => api.get<LandingHighlightsResponse>("/academies/highlights"),
  });

  const featuredAcademies = highlightsQuery.data?.featuredAcademies ?? [];
  const featuredReviews = highlightsQuery.data?.featuredReviews ?? [];

  const proofStats = [
    {
      label: "추천 학원",
      value: highlightsQuery.isLoading ? "로딩 중" : `${featuredAcademies.length}곳`,
    },
    {
      label: "최신 후기",
      value: highlightsQuery.isLoading ? "로딩 중" : `${featuredReviews.length}개`,
    },
    {
      label: "공개 FAQ",
      value: `${publicFaqItems.length}개`,
    },
  ] as const;

  return (
    <div className="mt-28 space-y-24">
      <section id="proof" className="scroll-mt-28">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[40px] border border-white/75 bg-[linear-gradient(135deg,#ffffff_0%,#f3f8ff_100%)] p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
              LIVE PROOF
            </p>
            <h2 className="display-font mt-4 text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
              설명만 있는 랜딩이 아니라
              <br />
              실제 데이터까지 바로 보여 줍니다
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
              공개 가능한 추천 학원과 최근 후기를 랜딩 페이지 안에 직접 붙였습니다.
              제품이 실제로 동작한다는 신호를 첫 방문자에게 바로 보여 줍니다.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3" aria-live="polite">
              {proofStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[28px] border border-white/75 bg-white/88 px-5 py-5 shadow-[0_14px_30px_rgba(148,163,184,0.14)]"
                >
                  <p className="text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              >
                학원 전체 보기
                <ChevronRight size={16} />
              </Link>
              <p className="text-sm text-text-secondary">
                공개 API 기준으로 자동 갱신되는 영역입니다.
              </p>
            </div>
          </div>

          <div className="rounded-[40px] bg-[#111823] p-6 text-white shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/60">
              WHAT USERS SEE
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
              검색 결과와 실제 후기까지 같은 톤으로 이어집니다
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/68 sm:text-base">
              랜딩 상단에서 서비스 흐름을 이해한 뒤, 아래에서 실제 검색 결과와
              후기를 곧바로 확인할 수 있어 설득력이 더 자연스럽게 이어집니다.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[26px] bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">추천 학원</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  카테고리, 거리, 수강료, 시간표를 함께 읽을 수 있습니다.
                </p>
              </div>
              <div className="rounded-[26px] bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">실제 후기</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  최신 후기와 인증 표시를 랜딩 안에서 바로 노출합니다.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[30px] bg-white/6 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">이 영역이 하는 일</p>
                <MessageSquareQuote size={18} className="text-blue-300" />
              </div>
              <p className="mt-3 text-sm leading-7 text-white/68">
                설명형 문장만 반복하지 않고, 실제로 공개 가능한 데이터가 서비스에
                어떻게 붙는지 한 번 더 증명하는 섹션입니다.
              </p>
            </div>
          </div>
        </div>

        <div
          aria-busy={highlightsQuery.isLoading}
          className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="rounded-[36px] border border-white/75 bg-white/88 p-5 shadow-[0_20px_56px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                  FEATURED ACADEMIES
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                  공개 검색 기준 추천 학원
                </h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                자동 반영
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {highlightsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="soft-card h-28 animate-pulse rounded-[30px]"
                  />
                ))
              ) : highlightsQuery.isError ? (
                <Card className="py-10 text-center" aria-live="polite">
                  <p className="text-sm font-semibold text-text-primary">
                    추천 학원을 아직 불러오지 못했습니다
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    공개 API 응답이 준비되면 이 영역이 자동으로 채워집니다.
                  </p>
                </Card>
              ) : featuredAcademies.length === 0 ? (
                <Card className="py-10 text-center" aria-live="polite">
                  <p className="text-sm font-semibold text-text-primary">
                    현재 추천 학원이 없습니다
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    등록된 공개 학원이 생기면 여기에서 바로 보이게 됩니다.
                  </p>
                </Card>
              ) : (
                featuredAcademies.map((academy) => (
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
          </div>

          <div className="rounded-[36px] border border-white/75 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-[0_20px_56px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
                  REAL REVIEWS
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                  실제 수강 후기
                </h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-text-primary">
                최신 노출
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {highlightsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="soft-card h-40 animate-pulse rounded-[30px]"
                  />
                ))
              ) : highlightsQuery.isError ? (
                <Card className="py-10 text-center" aria-live="polite">
                  <p className="text-sm font-semibold text-text-primary">
                    후기를 아직 불러오지 못했습니다
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    공개 가능한 최신 후기가 준비되면 이 영역이 자동으로 채워집니다.
                  </p>
                </Card>
              ) : featuredReviews.length === 0 ? (
                <Card className="py-10 text-center" aria-live="polite">
                  <p className="text-sm font-semibold text-text-primary">
                    공개할 후기가 아직 없습니다
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">
                    인증 후기나 최근 리뷰가 쌓이면 이 영역에 바로 반영됩니다.
                  </p>
                </Card>
              ) : (
                featuredReviews.map((review) => (
                  <Card
                    key={review.id}
                    className="rounded-[30px] border border-white/80 bg-white/92 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-text-primary">
                            {review.academy.name}
                          </p>
                          <Badge>{review.academy.category}</Badge>
                          {review.isVerified ? (
                            <Badge variant="verified">인증 후기</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs leading-6 text-text-secondary">
                          {review.academy.address}
                        </p>
                      </div>
                      <p className="text-[11px] font-semibold text-text-secondary">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-1 text-accent">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          className={
                            index < Math.round(review.rating)
                              ? "fill-current"
                              : "text-slate-200"
                          }
                        />
                      ))}
                      <span className="ml-1 text-xs font-semibold text-text-primary">
                        {review.rating.toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-text-secondary">
                      {review.content}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-text-secondary">
                        {review.user.name ?? "익명"} 님 후기
                      </p>
                      <Link
                        href={`/discover/${review.academy.id}`}
                        className="text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                      >
                        학원 상세 보기
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-28">
        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold tracking-[0.18em] text-text-secondary">
              FAQ
            </p>
            <h2 className="display-font mt-4 text-3xl font-bold tracking-[-0.06em] text-text-primary sm:text-4xl">
              현재 서비스 기준으로
              <br />
              바로 답할 수 있는 질문
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-text-secondary">
              가입 방식, 역할 분리, 로그인 후 이동 경로처럼 랜딩을 읽으면서
              바로 생길 질문들을 한곳에 정리했습니다.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_14px_28px_rgba(148,163,184,0.14)]">
              <CircleHelp size={16} className="text-primary" />
              FAQ {publicFaqItems.length}개
            </div>
          </div>

          <div className="grid gap-3">
            {publicFaqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,#ffffff_0%,#fafbfd_100%)] px-5 py-4 shadow-[0_16px_36px_rgba(148,163,184,0.14)]"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
                  <div>
                    <Badge className="bg-blue-50 text-primary shadow-none">
                      {item.label}
                    </Badge>
                    <p className="mt-3 text-sm font-semibold leading-6 text-text-primary">
                      {item.question}
                    </p>
                  </div>
                  <span className="mt-1 text-text-secondary transition-transform group-open:rotate-90">
                    <ChevronRight size={18} />
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-text-secondary">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
