export enum FundingStatus {
  RECRUITING = 'RECRUITING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WishStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  ENROLLED = 'ENROLLED',
  EXPIRED = 'EXPIRED',
}

export interface Funding {
  id: string;
  academyId: string;
  subject: string;
  minStudents: number;
  maxStudents: number;
  currentStudents: number;
  monthlyFee: number;
  deadline: string;
  status: FundingStatus;
  createdAt: string;
}

export interface Wish {
  id: string;
  userId: string;
  childId: string | null;
  subject: string;
  preferredDays: string[];
  preferredTime: string | null;
  lat: number;
  lng: number;
  areaName: string | null;
  status: WishStatus;
  createdAt: string;
}
