import { Injectable } from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';

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

@Injectable()
export class CalendarService {
  private readonly dayOfWeekMap: Record<DayOfWeek, number> = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 0,
  };

  private readonly subjectColorMap: Record<string, string> = {
    수학: '#3B82F6',
    영어: '#EF4444',
    발레: '#EC4899',
    축구: '#22C55E',
    태권도: '#F97316',
    피아노: '#8B5CF6',
    미술: '#F59E0B',
    코딩: '#06B6D4',
    수영: '#0EA5E9',
  };

  constructor(private readonly prisma: PrismaService) {}

  async getEvents(
    userId: string,
    query?: CalendarQueryDto,
  ): Promise<CalendarEvent[]> {
    const start = query?.startDate
      ? this.parseDate(query.startDate)
      : this.parseDate(this.formatDate(new Date()));
    const end = query?.endDate
      ? this.parseDate(query.endDate)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const whereClause: any = {
      userId,
      status: 'ACTIVE',
    };

    if (query?.childId) {
      whereClause.childId = query.childId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: whereClause,
      include: {
        class: {
          include: {
            schedules: true,
            academy: {
              select: {
                id: true,
                name: true,
                address: true,
                hasShuttle: true,
              },
            },
          },
        },
        child: {
          select: { id: true, name: true },
        },
      },
    });

    const events: CalendarEvent[] = [];

    for (const enrollment of enrollments) {
      const classItem = enrollment.class;

      for (const schedule of classItem.schedules) {
        const targetDayJs = this.dayOfWeekMap[schedule.dayOfWeek];

        const current = new Date(start);
        while (current <= end) {
          if (current.getUTCDay() === targetDayJs) {
            const dateText = this.formatDate(current);
            events.push({
              id: `${enrollment.id}:${schedule.id}:${dateText}`,
              enrollmentId: enrollment.id,
              childId: enrollment.child?.id ?? null,
              childName: enrollment.child?.name ?? null,
              academyName: classItem.academy.name,
              subject: classItem.subject,
              color: this.getSubjectColor(classItem.subject),
              startAt: `${dateText}T${schedule.startTime}:00+09:00`,
              endAt: `${dateText}T${schedule.endTime}:00+09:00`,
              location: classItem.academy.address,
              hasShuttle: classItem.academy.hasShuttle,
              shuttlePickupTime: null,
              status: 'scheduled',
              memo: `${classItem.name}`,
            });
          }
          current.setUTCDate(current.getUTCDate() + 1);
        }
      }
    }

    events.sort((a, b) => {
      return a.startAt.localeCompare(b.startAt);
    });

    return events;
  }

  private getSubjectColor(subject: string) {
    return this.subjectColorMap[subject] ?? '#64748B';
  }

  private parseDate(dateText: string) {
    const [year, month, day] = dateText.split('-').map((value) => Number(value));
    return new Date(Date.UTC(year, month - 1, day));
  }

  private formatDate(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
