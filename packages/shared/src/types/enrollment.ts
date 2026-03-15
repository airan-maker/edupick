export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface Enrollment {
  id: string;
  userId: string;
  childId: string | null;
  classId: string;
  status: EnrollmentStatus;
  autoPayEnabled: boolean;
  nextPaymentDate: string | null;
  enrolledAt: string;
  cancelledAt: string | null;
}

export interface Payment {
  id: string;
  enrollmentId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  portonePaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
}
