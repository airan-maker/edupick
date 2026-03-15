import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentReportQueryDto } from './dto/payment-report-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  OperatorStatisticsQueryDto,
  OperatorStatisticsRange,
} from './dto/operator-statistics-query.dto';

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    enrollment: {
      include: {
        child: {
          select: {
            id: true;
            name: true;
          };
        };
        class: {
          select: {
            id: true;
            name: true;
            subject: true;
            academy: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type ManagedClassWithRelations = Prisma.ClassGetPayload<{
  include: {
    academy: {
      select: {
        id: true;
        name: true;
      };
    };
    enrollments: {
      include: {
        child: {
          select: {
            id: true;
            name: true;
          };
        };
        user: {
          select: {
            id: true;
            name: true;
            phone: true;
          };
        };
        payments: true;
      };
    };
  };
}>;

type ManagedClassWithReminderFields = Omit<
  ManagedClassWithRelations,
  'enrollments'
> & {
  enrollments: Array<
    Omit<ManagedClassWithRelations['enrollments'][number], 'payments'> & {
      payments: Array<
        ManagedClassWithRelations['enrollments'][number]['payments'][number] & {
          lastReminderAt: Date | null;
        }
      >;
    }
  >;
};

const subjectColorMap: Record<string, string> = {
  수학: '#3B82F6',
  영어: '#14B8A6',
  발레: '#EC4899',
  축구: '#F59E0B',
  태권도: '#F97316',
  피아노: '#6366F1',
  미술: '#FB923C',
  코딩: '#06B6D4',
  수영: '#0EA5E9',
};

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string) {
    const payments = await this.fetchPayments(userId);
    return payments.map((payment) => this.toPaymentListItem(payment));
  }

  async getReport(userId: string, query: PaymentReportQueryDto) {
    const payments = await this.fetchPayments(userId);
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month;

    const periodStart = month
      ? new Date(Date.UTC(year, month - 1, 1))
      : new Date(Date.UTC(year, 0, 1));
    const periodEnd = month
      ? new Date(Date.UTC(year, month, 1))
      : new Date(Date.UTC(year + 1, 0, 1));

    const paymentsInPeriod = payments.filter((payment) => {
      const targetDate = this.getEffectiveDate(payment);
      return targetDate >= periodStart && targetDate < periodEnd;
    });

    const completedPayments = paymentsInPeriod.filter(
      (payment) => payment.status === PaymentStatus.COMPLETED,
    );

    const bySubject = this.groupBySubject(completedPayments);
    const byAcademy = this.groupByAcademy(completedPayments);
    const monthlyTrend = this.buildMonthlyTrend(payments, year);

    return {
      period: {
        year,
        month: month ?? null,
        label: month ? `${year}년 ${month}월` : `${year}년 전체`,
      },
      totals: {
        completedAmount: completedPayments.reduce((sum, payment) => sum + payment.amount, 0),
        pendingAmount: paymentsInPeriod
          .filter((payment) => payment.status === PaymentStatus.PENDING)
          .reduce((sum, payment) => sum + payment.amount, 0),
        refundedAmount: paymentsInPeriod
          .filter((payment) => payment.status === PaymentStatus.REFUNDED)
          .reduce((sum, payment) => sum + payment.amount, 0),
        failedAmount: paymentsInPeriod
          .filter((payment) => payment.status === PaymentStatus.FAILED)
          .reduce((sum, payment) => sum + payment.amount, 0),
        paymentCount: paymentsInPeriod.length,
        completedCount: completedPayments.length,
        pendingCount: paymentsInPeriod.filter(
          (payment) => payment.status === PaymentStatus.PENDING,
        ).length,
      },
      bySubject,
      byAcademy,
      monthlyTrend,
      recentPayments: paymentsInPeriod
        .slice(0, 5)
        .map((payment) => this.toPaymentListItem(payment)),
    };
  }

  async getOperatorSummary(userId: string) {
    const managedClasses = await this.fetchManagedClasses(userId);
    const payments = managedClasses.flatMap((classItem) =>
      classItem.enrollments.flatMap((enrollment) =>
        enrollment.payments.map((payment) => ({
          ...payment,
          className: classItem.name,
          subject: classItem.subject,
          academy: classItem.academy,
          child: enrollment.child,
          user: enrollment.user,
        })),
      ),
    );

    const uniqueAcademies = new Map(
      managedClasses.map((classItem) => [classItem.academy.id, classItem.academy]),
    );

    const recentPayments = [...payments]
      .sort((left, right) => {
        const leftDate = (left.paidAt ?? left.createdAt).getTime();
        const rightDate = (right.paidAt ?? right.createdAt).getTime();
        return rightDate - leftDate;
      })
      .slice(0, 5)
      .map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        className: payment.className,
        subject: payment.subject,
        academy: payment.academy,
        child: payment.child,
        user: payment.user,
      }));

    return {
      metrics: {
        academyCount: uniqueAcademies.size,
        classCount: managedClasses.length,
        activeEnrollmentCount: managedClasses.reduce(
          (sum, classItem) =>
            sum +
            classItem.enrollments.filter(
              (enrollment) => enrollment.status === EnrollmentStatus.ACTIVE,
            ).length,
          0,
        ),
        pendingPaymentCount: payments.filter(
          (payment) => payment.status === PaymentStatus.PENDING,
        ).length,
        completedAmount: payments
          .filter((payment) => payment.status === PaymentStatus.COMPLETED)
          .reduce((sum, payment) => sum + payment.amount, 0),
      },
      academies: [...uniqueAcademies.values()],
      recentPayments,
      pendingPayments: payments
        .filter((payment) => payment.status === PaymentStatus.PENDING)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          createdAt: payment.createdAt,
          lastReminderAt: payment.lastReminderAt,
          className: payment.className,
          academy: payment.academy,
          child: payment.child,
          user: payment.user,
        })),
    };
  }

  async getOperatorStatistics(
    userId: string,
    query: OperatorStatisticsQueryDto,
  ) {
    const period = this.resolveStatisticsPeriod(query);
    const managedClasses = await this.fetchManagedClasses(userId);
    const payments = managedClasses.flatMap((classItem) =>
      classItem.enrollments.flatMap((enrollment) =>
        enrollment.payments.map((payment) => ({
          ...payment,
          classId: classItem.id,
          className: classItem.name,
          subject: classItem.subject,
          academy: classItem.academy,
          child: enrollment.child,
        })),
      ),
    );

    const paymentsInPeriod = payments.filter((payment) => {
      const targetDate = payment.paidAt ?? payment.createdAt;
      return targetDate >= period.start && targetDate < period.endExclusive;
    });
    const completedPayments = paymentsInPeriod.filter(
      (payment) => payment.status === PaymentStatus.COMPLETED,
    );
    const pendingPayments = payments.filter(
      (payment) => payment.status === PaymentStatus.PENDING,
    );
    const totalCapacity = managedClasses.reduce(
      (sum, classItem) => sum + classItem.maxStudents,
      0,
    );
    const totalCurrentStudents = managedClasses.reduce(
      (sum, classItem) => sum + classItem.currentStudents,
      0,
    );
    const academyBreakdown = this.buildOperatorAcademyBreakdown(
      managedClasses,
      paymentsInPeriod,
      payments,
    );
    const subjectBreakdown = this.buildOperatorSubjectBreakdown(
      managedClasses,
      paymentsInPeriod,
    );

    return {
      period: {
        range: period.range,
        year: period.year ?? null,
        label: period.label,
        startDate: period.start.toISOString(),
        endDate: new Date(period.endExclusive.getTime() - 1).toISOString(),
      },
      metrics: {
        academyCount: new Set(managedClasses.map((classItem) => classItem.academy.id))
          .size,
        classCount: managedClasses.length,
        activeEnrollmentCount: managedClasses.reduce(
          (sum, classItem) =>
            sum +
            classItem.enrollments.filter(
              (enrollment) => enrollment.status === EnrollmentStatus.ACTIVE,
            ).length,
          0,
        ),
        pendingPaymentCount: pendingPayments.length,
        completedAmount: completedPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        ),
        pendingAmount: payments
          .filter((payment) => payment.status === PaymentStatus.PENDING)
          .reduce((sum, payment) => sum + payment.amount, 0),
        averageClassFillRate:
          totalCapacity > 0
            ? Number(((totalCurrentStudents / totalCapacity) * 100).toFixed(1))
            : 0,
      },
      revenueTrend: this.buildRevenueTrend(payments, period),
      academyBreakdown,
      subjectBreakdown,
      paymentStatus: {
        completedAmount: completedPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        ),
        pendingAmount: payments
          .filter((payment) => payment.status === PaymentStatus.PENDING)
          .reduce((sum, payment) => sum + payment.amount, 0),
        refundedAmount: paymentsInPeriod
          .filter((payment) => payment.status === PaymentStatus.REFUNDED)
          .reduce((sum, payment) => sum + payment.amount, 0),
        failedAmount: paymentsInPeriod
          .filter((payment) => payment.status === PaymentStatus.FAILED)
          .reduce((sum, payment) => sum + payment.amount, 0),
      },
    };
  }

  private async fetchPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: {
        enrollment: {
          include: {
            child: {
              select: {
                id: true,
                name: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                subject: true,
                academy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async fetchManagedClasses(userId: string) {
    const ownedAcademies = await this.prisma.academy.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const ownedAcademyIds = ownedAcademies.map((academy) => academy.id);

    const classes = await this.prisma.class.findMany({
      where: {
        OR: [
          { academyId: { in: ownedAcademyIds } },
          { instructorId: userId },
        ],
      },
      include: {
        academy: {
          select: {
            id: true,
            name: true,
          },
        },
        enrollments: {
          include: {
            child: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            payments: true,
          },
        },
      },
    });

    return [
      ...new Map(classes.map((classItem) => [classItem.id, classItem])).values(),
    ] as ManagedClassWithReminderFields[];
  }

  private toPaymentListItem(payment: PaymentWithRelations) {
    return {
      id: payment.id,
      enrollmentId: payment.enrollmentId,
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      portonePaymentId: payment.portonePaymentId,
      className: payment.enrollment.class.name,
      subject: payment.enrollment.class.subject,
      academy: payment.enrollment.class.academy,
      child: payment.enrollment.child,
      effectiveDate: this.getEffectiveDate(payment).toISOString(),
    };
  }

  private groupBySubject(payments: PaymentWithRelations[]) {
    const summary = new Map<
      string,
      { subject: string; amount: number; count: number; color: string }
    >();

    for (const payment of payments) {
      const subject = payment.enrollment.class.subject;
      const current = summary.get(subject) ?? {
        subject,
        amount: 0,
        count: 0,
        color: subjectColorMap[subject] ?? '#64748B',
      };

      current.amount += payment.amount;
      current.count += 1;
      summary.set(subject, current);
    }

    return [...summary.values()].sort((left, right) => right.amount - left.amount);
  }

  private groupByAcademy(payments: PaymentWithRelations[]) {
    const summary = new Map<
      string,
      { academyId: string; academyName: string; amount: number; count: number }
    >();

    for (const payment of payments) {
      const academy = payment.enrollment.class.academy;
      const current = summary.get(academy.id) ?? {
        academyId: academy.id,
        academyName: academy.name,
        amount: 0,
        count: 0,
      };

      current.amount += payment.amount;
      current.count += 1;
      summary.set(academy.id, current);
    }

    return [...summary.values()].sort((left, right) => right.amount - left.amount);
  }

  private buildMonthlyTrend(payments: PaymentWithRelations[], year: number) {
    const months = Array.from({ length: 12 }, (_, index) => {
      const amount = payments
        .filter((payment) => payment.status === PaymentStatus.COMPLETED)
        .filter((payment) => {
          const date = this.getEffectiveDate(payment);
          return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === index
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

      return {
        month: index + 1,
        label: `${index + 1}월`,
        amount,
      };
    });

    return months;
  }

  private buildOperatorMonthlyRevenue(
    payments: Array<{
      amount: number;
      status: PaymentStatus;
      paidAt: Date | null;
      createdAt: Date;
    }>,
    year: number,
  ) {
    return Array.from({ length: 12 }, (_, index) => {
      const amount = payments
        .filter((payment) => payment.status === PaymentStatus.COMPLETED)
        .filter((payment) => {
          const targetDate = payment.paidAt ?? payment.createdAt;
          return (
            targetDate.getUTCFullYear() === year &&
            targetDate.getUTCMonth() === index
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

      return {
        month: index + 1,
        label: `${index + 1}월`,
        amount,
      };
    });
  }

  private buildRevenueTrend(
    payments: Array<{
      amount: number;
      status: PaymentStatus;
      paidAt: Date | null;
      createdAt: Date;
    }>,
    period: ReturnType<typeof this.resolveStatisticsPeriod>,
  ) {
    if (period.range === OperatorStatisticsRange.LAST_30_DAYS) {
      return Array.from({ length: 30 }, (_, index) => {
        const current = new Date(period.start);
        current.setUTCDate(period.start.getUTCDate() + index);
        const label = `${current.getUTCMonth() + 1}/${current.getUTCDate()}`;
        const amount = payments
          .filter((payment) => payment.status === PaymentStatus.COMPLETED)
          .filter((payment) => {
            const targetDate = payment.paidAt ?? payment.createdAt;
            return (
              targetDate.getUTCFullYear() === current.getUTCFullYear() &&
              targetDate.getUTCMonth() === current.getUTCMonth() &&
              targetDate.getUTCDate() === current.getUTCDate()
            );
          })
          .reduce((sum, payment) => sum + payment.amount, 0);

        return {
          label,
          amount,
        };
      });
    }

    const monthCount =
      period.range === OperatorStatisticsRange.LAST_6_MONTHS ? 6 : 12;

    return Array.from({ length: monthCount }, (_, index) => {
      const current = new Date(period.start);
      current.setUTCMonth(period.start.getUTCMonth() + index);
      const label = `${current.getUTCMonth() + 1}월`;
      const amount = payments
        .filter((payment) => payment.status === PaymentStatus.COMPLETED)
        .filter((payment) => {
          const targetDate = payment.paidAt ?? payment.createdAt;
          return (
            targetDate.getUTCFullYear() === current.getUTCFullYear() &&
            targetDate.getUTCMonth() === current.getUTCMonth()
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

      return {
        label,
        amount,
      };
    });
  }

  private buildOperatorAcademyBreakdown(
    managedClasses: ManagedClassWithRelations[],
    paymentsInPeriod: Array<{
      amount: number;
      status: PaymentStatus;
      academy: {
        id: string;
        name: string;
      };
    }>,
    allPayments: Array<{
      amount: number;
      status: PaymentStatus;
      academy: {
        id: string;
        name: string;
      };
    }>,
  ) {
    const academySummary = new Map<
      string,
      {
        academyId: string;
        academyName: string;
        classCount: number;
        activeEnrollmentCount: number;
        completedAmount: number;
        pendingAmount: number;
      }
    >();

    for (const classItem of managedClasses) {
      const current = academySummary.get(classItem.academy.id) ?? {
        academyId: classItem.academy.id,
        academyName: classItem.academy.name,
        classCount: 0,
        activeEnrollmentCount: 0,
        completedAmount: 0,
        pendingAmount: 0,
      };

      current.classCount += 1;
      current.activeEnrollmentCount += classItem.enrollments.filter(
        (enrollment) => enrollment.status === EnrollmentStatus.ACTIVE,
      ).length;
      academySummary.set(classItem.academy.id, current);
    }

    for (const payment of paymentsInPeriod) {
      const current = academySummary.get(payment.academy.id);

      if (!current) {
        continue;
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        current.completedAmount += payment.amount;
      }

    }

    for (const payment of allPayments) {
      if (payment.status !== PaymentStatus.PENDING) {
        continue;
      }

      const current = academySummary.get(payment.academy.id);

      if (!current) {
        continue;
      }

      current.pendingAmount += payment.amount;
    }

    return [...academySummary.values()].sort(
      (left, right) => right.completedAmount - left.completedAmount,
    );
  }

  private buildOperatorSubjectBreakdown(
    managedClasses: ManagedClassWithRelations[],
    paymentsInYear: Array<{
      amount: number;
      status: PaymentStatus;
      subject: string;
    }>,
  ) {
    const subjectSummary = new Map<
      string,
      {
        subject: string;
        color: string;
        classCount: number;
        activeEnrollmentCount: number;
        completedAmount: number;
      }
    >();

    for (const classItem of managedClasses) {
      const current = subjectSummary.get(classItem.subject) ?? {
        subject: classItem.subject,
        color: subjectColorMap[classItem.subject] ?? '#64748B',
        classCount: 0,
        activeEnrollmentCount: 0,
        completedAmount: 0,
      };

      current.classCount += 1;
      current.activeEnrollmentCount += classItem.enrollments.filter(
        (enrollment) => enrollment.status === EnrollmentStatus.ACTIVE,
      ).length;
      subjectSummary.set(classItem.subject, current);
    }

    for (const payment of paymentsInYear) {
      if (payment.status !== PaymentStatus.COMPLETED) {
        continue;
      }

      const current = subjectSummary.get(payment.subject);

      if (!current) {
        continue;
      }

      current.completedAmount += payment.amount;
    }

    return [...subjectSummary.values()].sort(
      (left, right) => right.completedAmount - left.completedAmount,
    );
  }

  private getEffectiveDate(payment: PaymentWithRelations) {
    return payment.paidAt ?? payment.createdAt;
  }

  private resolveStatisticsPeriod(query: OperatorStatisticsQueryDto) {
    const today = new Date();
    const utcToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const range = query.range ?? OperatorStatisticsRange.YEAR;

    if (range === OperatorStatisticsRange.LAST_30_DAYS) {
      const start = new Date(utcToday);
      start.setUTCDate(start.getUTCDate() - 29);
      const endExclusive = new Date(utcToday);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

      return {
        range,
        year: null,
        label: '최근 30일',
        start,
        endExclusive,
      };
    }

    if (range === OperatorStatisticsRange.LAST_6_MONTHS) {
      const start = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1),
      );
      const endExclusive = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
      );

      return {
        range,
        year: null,
        label: '최근 6개월',
        start,
        endExclusive,
      };
    }

    const year = query.year ?? today.getUTCFullYear();
    return {
      range,
      year,
      label: `${year}년`,
      start: new Date(Date.UTC(year, 0, 1)),
      endExclusive: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }
}
