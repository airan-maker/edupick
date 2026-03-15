"use client";

import Link from "next/link";
import {
  Star,
  MapPin,
  Bus,
  Clock,
  Sigma,
  Languages,
  Footprints,
  Piano,
  Palette,
  Code,
  Swords,
  School,
  type LucideIcon,
} from "lucide-react";
import { SoccerBall } from "@/components/icons/SoccerBall";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface AcademyCardProps {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  distance: string;
  hasShuttle: boolean;
  schedule: string;
  monthlyFee: number;
  thumbnail?: string;
  description?: string;
}

const categoryVisuals: Record<string, { icon: LucideIcon | typeof SoccerBall; tint: string; iconColor: string }> = {
  수학: { icon: Sigma, tint: "from-sky-100 to-sky-50", iconColor: "text-sky-500" },
  영어: { icon: Languages, tint: "from-teal-100 to-teal-50", iconColor: "text-teal-500" },
  발레: { icon: Footprints, tint: "from-pink-100 to-pink-50", iconColor: "text-pink-400" },
  축구: { icon: SoccerBall, tint: "from-amber-100 to-amber-50", iconColor: "text-amber-500" },
  태권도: { icon: Swords, tint: "from-orange-100 to-orange-50", iconColor: "text-orange-500" },
  피아노: { icon: Piano, tint: "from-indigo-100 to-indigo-50", iconColor: "text-indigo-400" },
  미술: { icon: Palette, tint: "from-orange-100 to-orange-50", iconColor: "text-orange-400" },
  코딩: { icon: Code, tint: "from-cyan-100 to-cyan-50", iconColor: "text-cyan-500" },
};

export function AcademyCard({
  id,
  name,
  category,
  rating,
  reviewCount,
  distance,
  hasShuttle,
  schedule,
  monthlyFee,
  thumbnail,
  description,
}: AcademyCardProps) {
  const visual = categoryVisuals[category] ?? {
    icon: School,
    tint: "from-slate-100 to-slate-50",
    iconColor: "text-slate-400",
  };
  const CategoryIcon = visual.icon;

  return (
    <Link
      href={`/discover/${id}`}
      className="block rounded-[30px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      <Card className="transition-transform hover:-translate-y-0.5">
        <div className="flex gap-3">
          <div
            className={`flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br ${visual.tint} sm:h-20 sm:w-20 sm:rounded-[22px]`}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <CategoryIcon size={28} className={visual.iconColor} aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold leading-5">{name}</h3>
                <Badge className="mt-0.5">{category}</Badge>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-primary sm:text-sm">
                {monthlyFee > 0 ? `${monthlyFee.toLocaleString()}원` : "가격 문의"}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-text-secondary">
              <Star size={11} className="text-accent fill-accent" aria-hidden="true" />
              <span className="font-medium text-text-primary">{rating.toFixed(1)}</span>
              <span>({reviewCount})</span>
              <span className="mx-0.5 text-gray-300">|</span>
              <MapPin size={11} aria-hidden="true" />
              <span>{distance}</span>
              {hasShuttle ? (
                <Badge variant="shuttle" className="ml-1">
                  <Bus size={10} aria-hidden="true" />
                  셔틀
                </Badge>
              ) : null}
            </div>

            <div className="mt-1.5 flex items-center gap-1 text-xs text-text-secondary">
              <Clock size={11} aria-hidden="true" />
              <span className="truncate">{schedule}</span>
            </div>

            {description ? (
              <p className="mt-1 truncate text-[11px] text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
