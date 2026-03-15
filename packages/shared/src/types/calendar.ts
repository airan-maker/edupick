export interface CalendarEvent {
  id: string;
  enrollmentId: string;
  childId: string | null;
  childName: string | null;
  academyName: string;
  subject: string;
  color: string;
  startAt: string;
  endAt: string;
  location: string;
  hasShuttle: boolean;
  shuttlePickupTime: string | null;
  status: 'scheduled' | 'cancelled' | 'makeup';
  memo: string | null;
}

export interface CalendarQuery {
  childId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  view?: 'week' | 'month';
}
