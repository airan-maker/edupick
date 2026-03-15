export enum ClassStatus {
  OPEN = 'OPEN',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
}

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

export interface ClassInfo {
  id: string;
  academyId: string;
  instructorId: string;
  name: string;
  subject: string;
  ageGroup: string | null;
  maxStudents: number;
  currentStudents: number;
  monthlyFee: number;
  status: ClassStatus;
  schedules: ClassSchedule[];
}

export interface ClassSchedule {
  id: string;
  classId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;
}
