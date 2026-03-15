"use client";

import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bus,
  Compass,
  List,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { FilterChip } from "@/components/ui/FilterChip";
import { Button } from "@/components/ui/Button";
import { AcademyCard } from "@/components/academy/AcademyCard";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

const DEFAULT_LOCATION = {
  lat: 37.4918,
  lng: 127.0077,
  label: "서초역 기준",
};

const categories = [
  "전체",
  "수학",
  "영어",
  "발레",
  "축구",
  "태권도",
  "피아노",
  "미술",
  "코딩",
  "수영",
  "국어",
];

const sortOptions = [
  { key: "distance", label: "가까운 순" },
  { key: "rating", label: "평점순" },
  { key: "price", label: "낮은 가격순" },
] as const;

interface NearbyAcademyItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
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

interface NearbyAcademyResponse {
  data: NearbyAcademyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function formatDistance(distanceM: number) {
  if (distanceM < 1000) return `${distanceM}m`;
  return `${(distanceM / 1000).toFixed(1)}km`;
}

function formatFee(min: number | null, max: number | null) {
  if (min === null && max === null) return "문의";
  if (min !== null && max !== null && min !== max) {
    return `${min.toLocaleString()}원~${max.toLocaleString()}원`;
  }
  return `${(min ?? max ?? 0).toLocaleString()}원`;
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory && categories.includes(initialCategory)
      ? initialCategory
      : "전체"
  );
  const [sortBy, setSortBy] =
    useState<(typeof sortOptions)[number]["key"]>("distance");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [shuttleOnly, setShuttleOnly] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    const category = searchParams.get("category");
    if (category && categories.includes(category)) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  const academiesQuery = useQuery({
    queryKey: [
      "academies",
      selectedCategory,
      deferredSearchQuery,
      shuttleOnly,
      sortBy,
    ],
    queryFn: () =>
      api.get<NearbyAcademyResponse>("/academies/nearby", {
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        category: selectedCategory === "전체" ? undefined : selectedCategory,
        keyword: deferredSearchQuery,
        shuttle: shuttleOnly ? true : undefined,
        sortBy,
        limit: 20,
      }),
  });

  const academies = academiesQuery.data?.data ?? [];
  const [activeMapAcademyId, setActiveMapAcademyId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setActiveMapAcademyId(academies[0]?.id ?? null);
  }, [academies]);

  const activeMapAcademy =
    academies.find((a) => a.id === activeMapAcademyId) ?? academies[0] ?? null;

  const latitudes = academies.map((a) => a.lat);
  const longitudes = academies.map((a) => a.lng);
  const minLat = latitudes.length > 0 ? Math.min(...latitudes) : DEFAULT_LOCATION.lat;
  const maxLat = latitudes.length > 0 ? Math.max(...latitudes) : DEFAULT_LOCATION.lat;
  const minLng = longitudes.length > 0 ? Math.min(...longitudes) : DEFAULT_LOCATION.lng;
  const maxLng = longitudes.length > 0 ? Math.max(...longitudes) : DEFAULT_LOCATION.lng;

  return (
    <div className="min-h-screen pb-10">
      {/* Sticky Header — 모바일에서 최소화 */}
      <div className="soft-panel sticky top-0 z-30 px-4 pb-3 pt-4 sm:mx-4 sm:mt-4 sm:rounded-[34px] sm:pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="display-font text-xl font-bold tracking-[-0.04em] text-text-primary sm:text-2xl">
            주변 학원
          </h1>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-[0_8px_16px_rgba(196,201,219,0.16)]">
              <Compass size={12} className="mr-1 inline text-primary" />
              {DEFAULT_LOCATION.label}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-primary">
              {academiesQuery.data?.total ?? 0}
            </span>
          </div>
        </div>

        {/* Search + Shuttle filter */}
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              name="academy-search"
              autoComplete="off"
              spellCheck={false}
              placeholder="학원명, 과목, 지역…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-white/70 bg-white/82 py-2.5 pl-10 pr-4 text-sm text-text-primary shadow-[0_12px_20px_rgba(195,200,220,0.14)] outline-none placeholder:text-text-secondary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          <button
            type="button"
            onClick={() => setShuttleOnly((c) => !c)}
            aria-label={shuttleOnly ? "셔틀 필터 해제" : "셔틀 있는 학원만 보기"}
            aria-pressed={shuttleOnly}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-semibold transition-colors ${
              shuttleOnly
                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                : "bg-white/80 text-text-secondary shadow-[0_12px_20px_rgba(195,200,220,0.14)]"
            }`}
          >
            <Bus size={14} />
            셔틀
          </button>
        </div>

        {/* View Toggle + Sort */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <Button
              variant={viewMode === "list" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-1"
              aria-label="리스트 뷰"
            >
              <List size={14} aria-hidden="true" />
              리스트
            </Button>
            <Button
              variant={viewMode === "map" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="gap-1"
              aria-label="지도 뷰"
            >
              <Map size={14} aria-hidden="true" />
              지도
            </Button>
          </div>
          <div className="flex gap-1.5">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? "bg-white text-text-primary shadow-[0_8px_16px_rgba(195,200,220,0.16)]"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Chips */}
      <div className="mt-3 px-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <FilterChip
              key={category}
              selected={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mt-3 px-4">
        {academiesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="soft-card h-28 animate-pulse rounded-[30px]"
              />
            ))}
          </div>
        ) : academiesQuery.isError ? (
          <Card className="py-8 text-center text-sm text-red-500">
            {academiesQuery.error instanceof Error
              ? academiesQuery.error.message
              : "학원 목록을 불러오지 못했습니다."}
          </Card>
        ) : academies.length === 0 ? (
          <Card className="py-10 text-center">
            <p className="text-sm font-semibold text-text-primary">
              조건에 맞는 학원이 없습니다
            </p>
            <p className="mt-2 text-xs text-text-secondary">
              검색어나 필터를 바꿔 보세요.
            </p>
          </Card>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {academies.map((academy) => (
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
                schedule={academy.representativeClass?.scheduleSummary ?? "일정 문의"}
                monthlyFee={
                  academy.representativeClass?.monthlyFee ??
                  academy.monthlyFeeMin ??
                  academy.monthlyFeeMax ??
                  0
                }
                description={`${academy.openClassCount}개 반 · ${formatFee(
                  academy.monthlyFeeMin,
                  academy.monthlyFeeMax
                )}`}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="relative h-[380px] overflow-hidden bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.9),transparent_28%),linear-gradient(180deg,#f9fbff_0%,#eef3ff_52%,#f5f3ef_100%)] p-4 sm:h-[420px] sm:p-5">
              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-text-secondary">
                  {DEFAULT_LOCATION.label}
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-text-secondary">
                  {academies.length}개 표시
                </span>
              </div>

              {academies.map((academy) => {
                const leftRange = maxLng - minLng || 0.01;
                const topRange = maxLat - minLat || 0.01;
                const left = 12 + ((academy.lng - minLng) / leftRange) * 76;
                const top = 18 + ((maxLat - academy.lat) / topRange) * 60;
                const isActive = academy.id === activeMapAcademy?.id;

                return (
                  <button
                    key={academy.id}
                    type="button"
                    onClick={() => setActiveMapAcademyId(academy.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${left}%`, top: `${top}%` }}
                    aria-label={`${academy.name} ${academy.hasShuttle ? "(셔틀)" : ""}`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white text-base shadow-[0_14px_24px_rgba(154,166,203,0.28)] sm:h-12 sm:w-12 sm:text-lg ${
                        isActive
                          ? "bg-[linear-gradient(135deg,#7fb6ff_0%,#5f9efb_100%)]"
                          : "bg-[linear-gradient(135deg,#8fd9a5_0%,#70c58b_100%)]"
                      }`}
                    >
                      {academy.hasShuttle ? <Bus size={18} className="text-white" /> : <MapPin size={18} className="text-white" />}
                    </span>
                  </button>
                );
              })}

              {activeMapAcademy ? (
                <div className="absolute bottom-3 left-3 right-3 z-10 rounded-[26px] bg-white/88 p-2.5 shadow-[0_18px_30px_rgba(167,175,205,0.22)] backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-5 sm:p-3">
                  <AcademyCard
                    id={activeMapAcademy.id}
                    name={activeMapAcademy.name}
                    category={
                      activeMapAcademy.representativeClass?.subject ??
                      activeMapAcademy.categories[0] ??
                      "기타"
                    }
                    rating={activeMapAcademy.rating}
                    reviewCount={activeMapAcademy.reviewCount}
                    distance={formatDistance(activeMapAcademy.distanceM)}
                    hasShuttle={activeMapAcademy.hasShuttle}
                    schedule={
                      activeMapAcademy.representativeClass?.scheduleSummary ??
                      "일정 문의"
                    }
                    monthlyFee={
                      activeMapAcademy.representativeClass?.monthlyFee ??
                      activeMapAcademy.monthlyFeeMin ??
                      activeMapAcademy.monthlyFeeMax ??
                      0
                    }
                    description={`${activeMapAcademy.address} · ${formatFee(
                      activeMapAcademy.monthlyFeeMin,
                      activeMapAcademy.monthlyFeeMax
                    )}`}
                  />
                </div>
              ) : null}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6">
          <div className="soft-card h-16 animate-pulse rounded-[34px]" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="soft-card h-28 animate-pulse rounded-[30px]" />
            ))}
          </div>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
