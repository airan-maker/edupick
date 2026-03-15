import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { MineClassesQueryDto } from './dto/mine-classes-query.dto';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string, query: MineClassesQueryDto) {
    const ownedAcademies = await this.prisma.academy.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const ownedAcademyIds = ownedAcademies.map((academy) => academy.id);

    const classes = await this.prisma.class.findMany({
      where: {
        ...(query.academyId ? { academyId: query.academyId } : {}),
        OR: [
          { academyId: { in: ownedAcademyIds } },
          { instructorId: userId },
        ],
      },
      include: {
        schedules: true,
        academy: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const deduped = [...new Map(classes.map((classItem) => [classItem.id, classItem])).values()];

    return deduped.map((classItem) => {
      const pendingPayments = classItem.enrollments.flatMap((enrollment) =>
        enrollment.payments.filter((payment) => payment.status === 'PENDING'),
      ).length;

      return {
        id: classItem.id,
        academyId: classItem.academyId,
        name: classItem.name,
        subject: classItem.subject,
        ageGroup: classItem.ageGroup,
        monthlyFee: classItem.monthlyFee,
        maxStudents: classItem.maxStudents,
        currentStudents: classItem.currentStudents,
        status: classItem.status,
        createdAt: classItem.createdAt,
        academy: classItem.academy,
        instructor: classItem.instructor,
        schedules: classItem.schedules,
        metrics: {
          activeEnrollmentCount: classItem.enrollments.length,
          pendingPaymentCount: pendingPayments,
          spotsLeft: Math.max(classItem.maxStudents - classItem.currentStudents, 0),
        },
      };
    });
  }

  async findByAcademy(academyId: string) {
    return this.prisma.class.findMany({
      where: { academyId },
      include: {
        schedules: true,
        instructor: {
          select: { id: true, name: true, profileImageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id },
      include: {
        schedules: true,
        academy: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        instructor: {
          select: { id: true, name: true, profileImageUrl: true },
        },
      },
    });

    if (!classItem) {
      throw new NotFoundException('수업을 찾을 수 없습니다.');
    }

    return classItem;
  }

  async create(userId: string, dto: CreateClassDto) {
    // Verify the user owns the academy or is the instructor
    const academy = await this.prisma.academy.findUnique({
      where: { id: dto.academyId },
    });

    if (!academy) {
      throw new NotFoundException('학원을 찾을 수 없습니다.');
    }

    if (academy.ownerId !== userId && dto.instructorId !== userId) {
      throw new ForbiddenException('수업 생성 권한이 없습니다.');
    }

    const { schedules, ...classData } = dto;

    return this.prisma.class.create({
      data: {
        ...classData,
        schedules: schedules
          ? {
              create: schedules,
            }
          : undefined,
      },
      include: {
        schedules: true,
      },
    });
  }

  async update(classId: string, userId: string, dto: UpdateClassDto) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { academy: true },
    });

    if (!classItem) {
      throw new NotFoundException('수업을 찾을 수 없습니다.');
    }

    if (
      classItem.academy.ownerId !== userId &&
      classItem.instructorId !== userId
    ) {
      throw new ForbiddenException('수업 수정 권한이 없습니다.');
    }

    const { schedules, ...updateData } = dto;

    // If schedules are provided, replace them
    if (schedules) {
      await this.prisma.classSchedule.deleteMany({
        where: { classId },
      });

      return this.prisma.class.update({
        where: { id: classId },
        data: {
          ...updateData,
          schedules: {
            create: schedules,
          },
        },
        include: { schedules: true },
      });
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: updateData,
      include: { schedules: true },
    });
  }
}
