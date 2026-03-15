export interface RecentAcademyItem {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  reviewCount: number;
  hasShuttle: boolean;
  feeLabel: string;
  viewedAt: string;
}

const STORAGE_KEY = "edupick_recent_academies";
const MAX_ITEMS = 6;

function isRecentAcademyItem(value: unknown): value is RecentAcademyItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.category === "string" &&
    typeof item.address === "string" &&
    typeof item.rating === "number" &&
    typeof item.reviewCount === "number" &&
    typeof item.hasShuttle === "boolean" &&
    typeof item.feeLabel === "string" &&
    typeof item.viewedAt === "string"
  );
}

export function readRecentAcademies() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isRecentAcademyItem)
      .sort((left, right) => right.viewedAt.localeCompare(left.viewedAt))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveRecentAcademy(
  item: Omit<RecentAcademyItem, "viewedAt">
) {
  if (typeof window === "undefined") {
    return;
  }

  const next = [
    {
      ...item,
      viewedAt: new Date().toISOString(),
    },
    ...readRecentAcademies().filter((entry) => entry.id !== item.id),
  ].slice(0, MAX_ITEMS);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
