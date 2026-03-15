export { CATEGORIES, type CategoryId } from './categories';

export const SUBJECT_COLORS: Record<string, string> = {
  math: '#3B82F6',
  english: '#EF4444',
  ballet: '#EC4899',
  soccer: '#22C55E',
  taekwondo: '#F97316',
  piano: '#8B5CF6',
  art: '#F59E0B',
  coding: '#06B6D4',
  swimming: '#0EA5E9',
  basketball: '#D97706',
  violin: '#7C3AED',
  science: '#14B8A6',
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const SEARCH = {
  DEFAULT_RADIUS_KM: 3,
  MAX_RADIUS_KM: 10,
  MIN_SHUTTLE_BUFFER_MINUTES: 15,
} as const;
