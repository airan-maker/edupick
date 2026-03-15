import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ClassStatus,
  DayOfWeek,
  EnrollmentStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ListManagedStudentsQueryDto } from './dto/list-managed-students-query.dto';
import { UpdateManagedEnrollmentDto } from './dto/update-managed-enrollment.dto';

type ManagedEnrollmentWithRelations = {
  id: string;
  status: EnrollmentStatus;
  autoPayEnabled: boolean;
  memo: string | null;
  nextPaymentDate: Date | null;
  enrolledAt: Date;
  cancelledAt: Date | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  child: {
    id: string;
    name: string;
    grade: string | null;
    schoolName: string | null;
  } | null;
  class: {
    id: string;
    name: string;
    subject: string;
    ageGroup: string | null;
    instructorId: string | null;
    schedules: Array<{
      id: string;
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    }>;
    maxStudents: number;
    currentStudents: number;
    status: ClassStatus;
    academy: {
      id: string;
      name: string;
      ownerId: string;
    };
  };
  payments: Array<{
    id: string;
    amount: number;
    status: PaymentStatus;
    createdAt: Date;
    paidAt: Date | null;
    lastReminderAt: Date | null;
  }>;
};

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, dto: CreateEnrollmentDto) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      include: {
        academy: {
          select: {
            id: true,
            name: true,
            hasShuttle: true,
            address: true,
          },
        },
        schedules: true,
      },
    });

    if (!classItem) {
      throw new NotFoundException('수업을 찾을 수 없습니다.');
    }

    if (classItem.status !== 'OPEN') {
      throw new BadRequestException('현재 수강 신청이 불가능한 수업입니다.');
    }

    if (classItem.currentStudents >= classItem.maxStudents) {
      throw new BadRequestException('정원이 초과되었습니다.');
    }

    if (dto.childId) {
      const child = await this.prisma.child.findFirst({
        where: {
          id: dto.childId,
          parentId: userId,
        },
      });

      if (!child) {
        throw new ForbiddenException('내 자녀만 수강 신청할 수 있습니다.');
      }
    }

    const existing = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        classId: dto.classId,
        childId: dto.childId ?? null,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      throw new BadRequestException('이미 수강 중인 수업입니다.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const nextPaymentDate = this.calculateNextPaymentDate();
      const enrollment = await tx.enrollment.create({
        data: {
          userId,
          classId: dto.classId,
          childId: dto.childId,
          autoPayEnabled: dto.autoPay ?? true,
          billingKey: dto.paymentMethod?.billingKey,
          nextPaymentDate,
        },
        include: {
          class: {
            include: {
              academy: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  hasShuttle: true,
                },
              },
              schedules: true,
            },
          },
          child: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const payment = await tx.payment.create({
        data: {
          enrollmentId: enrollment.id,
          userId,
          amount: classItem.monthlyFee,
          status: dto.paymentMethod?.type === 'bank_transfer' ? 'PENDING' : 'COMPLETED',
          paidAt: dto.paymentMethod?.type === 'bank_transfer' ? null : new Date(),
          portonePaymentId: `stub_${Date.now()}`,
        },
      });

      const updatedClass = await tx.class.update({
        where: { id: dto.classId },
        data: {
          currentStudents: { increment: 1 },
        },
      });

      if (updatedClass.currentStudents >= updatedClass.maxStudents) {
        await tx.class.update({
          where: { id: dto.classId },
          data: { status: 'FULL' },
        });
      }

      return {
        ...enrollment,
        payment,
      };
    });

    return result;
  }

  async listByUser(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        class: {
          include: {
            academy: {
              select: { id: true, name: true, address: true },
            },
            schedules: true,
          },
        },
        child: {
          select: { id: true, name: true },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async listManagedStudents(
    userId: string,
    query: ListManagedStudentsQueryDto,
  ) {
    const enrollments = (await this.prisma.enrollment.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        class: {
          ...(query.classId ? { id: query.classId } : {}),
          ...(query.academyId ? { academyId: query.academyId } : {}),
          OR: [
            { instructorId: userId },
            { academy: { is: { ownerId: userId } } },
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        child: {
          select: {
            id: true,
            name: true,
            grade: true,
            schoolName: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            ageGroup: true,
            instructorId: true,
            schedules: true,
            maxStudents: true,
            currentStudents: true,
            status: true,
            academy: {
              select: {
                id: true,
                name: true,
                ownerId: true,
              },
            },
          },
        },
        payments: {
          orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
      orderBy: [{ enrolledAt: 'desc' }],
    })) as unknown as ManagedEnrollmentWithRelations[];

    const items = enrollments.map((enrollment) =>
      this.toManagedEnrollmentItem(enrollment),
    );

    return {
      summary: {
        totalCount: items.length,
        activeCount: items.filter((item) => item.status === EnrollmentStatus.ACTIVE)
          .length,
        pausedCount: items.filter((item) => item.status === EnrollmentStatus.PAUSED)
          .length,
        cancelledCount: items.filter(
          (item) => item.status === EnrollmentStatus.CANCELLED,
        ).length,
        pendingPaymentCount: items.filter(
          (item) => item.latestPayment?.status === PaymentStatus.PENDING,
        ).length,
        autoPayEnabledCount: items.filter((item) => item.autoPayEnabled).length,
      },
      items,
    };
  }

  async updateManagedEnrollment(
    enrollmentId: string,
    userId: string,
    dto: UpdateManagedEnrollmentDto,
  ) {
    const enrollment = (await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: this.managedEnrollmentInclude,
    })) as ManagedEnrollmentWithRelations | null;

    if (!enrollment) {
      throw new NotFoundException('원생 정보를 찾을 수 없습니다.');
    }

    if (
      enrollment.class.academy.ownerId !== userId &&
      enrollment.class.instructorId !== userId
    ) {
      throw new ForbiddenException('원생 정보를 수정할 권한이 없습니다.');
    }

    if (
      dto.status === undefined &&
      dto.autoPayEnabled === undefined &&
      dto.memo === undefined
    ) {
      throw new BadRequestException('변경할 값을 하나 이상 전달해 주세요.');
    }

    const nextStatus = dto.status ?? enrollment.status;
    const beforeOccupiesSeat = this.occupiesSeat(enrollment.status);
    const afterOccupiesSeat = this.occupiesSeat(nextStatus);

    await this.prisma.$transaction(async (tx) => {
      if (!beforeOccupiesSeat && afterOccupiesSeat) {
        const classItem = await tx.class.findUnique({
          where: { id: enrollment.class.id },
          select: {
            id: true,
            maxStudents: true,
            currentStudents: true,
            status: true,
          },
        });

        if (!classItem) {
          throw new NotFoundException('반 정보를 찾을 수 없습니다.');
        }

        if (classItem.currentStudents >= classItem.maxStudents) {
          throw new BadRequestException('정원이 가득 차서 재활성화할 수 없습니다.');
        }

        const updatedClass = await tx.class.update({
          where: { id: classItem.id },
          data: { currentStudents: { increment: 1 } },
          select: {
            id: true,
            maxStudents: true,
            currentStudents: true,
            status: true,
          },
        });

        const nextClassStatus = this.getClassStatusAfterSeatChange(
          updatedClass.status,
          updatedClass.currentStudents,
          updatedClass.maxStudents,
        );

        if (nextClassStatus !== updatedClass.status) {
          await tx.class.update({
            where: { id: updatedClass.id },
            data: { status: nextClassStatus },
          });
        }
      }

      if (beforeOccupiesSeat && !afterOccupiesSeat) {
        const updatedClass = await tx.class.update({
          where: { id: enrollment.class.id },
          data: { currentStudents: { decrement: 1 } },
          select: {
            id: true,
            maxStudents: true,
            currentStudents: true,
            status: true,
          },
        });

        const nextClassStatus = this.getClassStatusAfterSeatChange(
          updatedClass.status,
          updatedClass.currentStudents,
          updatedClass.maxStudents,
        );

        if (nextClassStatus !== updatedClass.status) {
          await tx.class.update({
            where: { id: updatedClass.id },
            data: { status: nextClassStatus },
          });
        }
      }

      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: nextStatus,
          autoPayEnabled: dto.autoPayEnabled,
          memo: dto.memo?.trim() ?? dto.memo,
          cancelledAt:
            nextStatus === EnrollmentStatus.CANCELLED ? new Date() : null,
        } as any,
      });
    });

    const updatedEnrollment = (await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: this.managedEnrollmentInclude,
    })) as ManagedEnrollmentWithRelations | null;

    if (!updatedEnrollment) {
      throw new NotFoundException('원생 정보를 찾을 수 없습니다.');
    }

    return this.toManagedEnrollmentItem(updatedEnrollment);
  }

  async cancel(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('수강 정보를 찾을 수 없습니다.');
    }

    if (enrollment.userId !== userId) {
      throw new ForbiddenException('수강 취소 권한이 없습니다.');
    }

    if (enrollment.status === 'CANCELLED') {
      throw new BadRequestException('이미 취소된 수강입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      const classItem = await tx.class.update({
        where: { id: enrollment.classId },
        data: { currentStudents: { decrement: 1 } },
      });

      if (classItem.status === 'FULL') {
        await tx.class.update({
          where: { id: enrollment.classId },
          data: { status: 'OPEN' },
        });
      }

      return updated;
    });
  }

  private calculateNextPaymentDate() {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  private occupiesSeat(status: EnrollmentStatus) {
    return status !== EnrollmentStatus.CANCELLED;
  }

  private getClassStatusAfterSeatChange(
    currentStatus: ClassStatus,
    currentStudents: number,
    maxStudents: number,
  ) {
    if (currentStatus === ClassStatus.CLOSED) {
      return currentStatus;
    }

    return currentStudents >= maxStudents ? ClassStatus.FULL : ClassStatus.OPEN;
  }

  private toManagedEnrollmentItem(enrollment: ManagedEnrollmentWithRelations) {
    const latestPayment = enrollment.payments[0];

    return {
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      cancelledAt: enrollment.cancelledAt,
      autoPayEnabled: enrollment.autoPayEnabled,
      memo: enrollment.memo,
      nextPaymentDate: enrollment.nextPaymentDate,
      student: {
        id: enrollment.child?.id ?? enrollment.user.id,
        name: enrollment.child?.name ?? enrollment.user.name ?? '이름 미등록',
        grade: enrollment.child?.grade ?? null,
        schoolName: enrollment.child?.schoolName ?? null,
        kind: enrollment.child ? 'child' : 'self',
      },
      guardian: {
        id: enrollment.user.id,
        name: enrollment.user.name,
        phone: enrollment.user.phone,
      },
      class: {
        id: enrollment.class.id,
        name: enrollment.class.name,
        subject: enrollment.class.subject,
        ageGroup: enrollment.class.ageGroup,
        schedules: enrollment.class.schedules,
      },
      academy: {
        id: enrollment.class.academy.id,
        name: enrollment.class.academy.name,
      },
      latestPayment: latestPayment
        ? {
            id: latestPayment.id,
            amount: latestPayment.amount,
            status: latestPayment.status,
            effectiveDate: (
              latestPayment.paidAt ?? latestPayment.createdAt
            ).toISOString(),
            lastReminderAt: latestPayment.lastReminderAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  private managedEnrollmentInclude = {
    user: {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    },
    child: {
      select: {
        id: true,
        name: true,
        grade: true,
        schoolName: true,
      },
    },
    class: {
      select: {
        id: true,
        name: true,
        subject: true,
        ageGroup: true,
        instructorId: true,
        schedules: true,
        maxStudents: true,
        currentStudents: true,
        status: true,
        academy: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    },
    payments: {
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 1,
    },
  } satisfies Prisma.EnrollmentInclude;
}
