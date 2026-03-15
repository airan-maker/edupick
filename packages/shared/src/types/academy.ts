export enum AcademyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface Academy {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  categories: string[];
  description: string | null;
  hasShuttle: boolean;
  hasParking: boolean;
  rating: number;
  reviewCount: number;
  monthlyFeeMin: number | null;
  monthlyFeeMax: number | null;
  status: AcademyStatus;
  createdAt: string;
}

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string[];
  sortBy?: 'distance' | 'rating' | 'price';
  shuttleOnly?: boolean;
  priceMin?: number;
  priceMax?: number;
  timeAfter?: string;
  page?: number;
  limit?: number;
}

export interface NearbySearchResult {
  academies: (Academy & { distanceM: number })[];
  total: number;
  page: number;
  totalPages: number;
}
