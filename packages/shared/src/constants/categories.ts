export const CATEGORIES = [
  { id: 'math', label: '수학', emoji: '📐', color: '#3B82F6' },
  { id: 'english', label: '영어', emoji: '🔤', color: '#EF4444' },
  { id: 'ballet', label: '발레', emoji: '🩰', color: '#EC4899' },
  { id: 'soccer', label: '축구', emoji: '⚽', color: '#22C55E' },
  { id: 'taekwondo', label: '태권도', emoji: '🥋', color: '#F97316' },
  { id: 'piano', label: '피아노', emoji: '🎹', color: '#8B5CF6' },
  { id: 'art', label: '미술', emoji: '🎨', color: '#F59E0B' },
  { id: 'coding', label: '코딩', emoji: '💻', color: '#06B6D4' },
  { id: 'swimming', label: '수영', emoji: '🏊', color: '#0EA5E9' },
  { id: 'basketball', label: '농구', emoji: '🏀', color: '#D97706' },
  { id: 'violin', label: '바이올린', emoji: '🎻', color: '#7C3AED' },
  { id: 'science', label: '과학', emoji: '🔬', color: '#14B8A6' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
