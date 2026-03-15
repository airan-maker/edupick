import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ChatMessageType,
  ChatRoomType,
  EnrollmentStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { ListSentAnnouncementsQueryDto } from './dto/list-sent-announcements-query.dto';
import {
  ListUnpaidReminderLogsQueryDto,
  UnpaidReminderTrigger,
} from './dto/list-unpaid-reminder-logs-query.dto';
import {
  AnnouncementChannel,
  SendAnnouncementDto,
} from './dto/send-announcement.dto';
import { SendUnpaidReminderDto } from './dto/send-unpaid-reminder.dto';

interface AnnouncementPayload {
  title: string;
  content: string;
  channels: AnnouncementChannel[];
}

type ReminderPayment = {
  id: string;
  userId: string;
  enrollmentId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
  paidAt: Date | null;
  lastReminderAt: Date | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
  };
  enrollment: {
    child: {
      id: string;
      name: string;
    } | null;
    class: {
      id: string;
      name: string;
      instructorId: string | null;
      academy: {
        id: string;
        name: string;
        ownerId: string;
      };
    };
  };
};

interface ReminderLogPayload {
  paymentId: string;
  enrollmentId: string;
  amount: number;
  classId: string;
  className: string;
  academyId: string;
  academyName: string;
  childId: string | null;
  childName: string | null;
  lastReminderAt: string | null;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string, query: ListNotificationsQueryDto) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 30, 1), 100);
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(typeof query.read === 'boolean' ? { isRead: query.read } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        data: item.data,
        isRead: item.isRead,
        createdAt: item.createdAt,
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  async listSentAnnouncements(
    userId: string,
    query: ListSentAnnouncementsQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 12, 1), 30);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        type: ChatMessageType.ANNOUNCEMENT,
        room: {
          is: {
            class: {
              is: {
                ...(query.classId ? { id: query.classId } : {}),
                OR: [
                  { instructorId: userId },
                  { academy: { is: { ownerId: userId } } },
                ],
              },
            },
          },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        room: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
                academy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                enrollments: {
                  where: { status: EnrollmentStatus.ACTIVE },
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.map((message) => {
      const payload = this.parseAnnouncementPayload(message.content);
      const classItem = message.room.class;

      return {
        id: message.id,
        title: payload.title,
        content: payload.content,
        channels: payload.channels,
        createdAt: message.createdAt,
        isPinned: message.isPinned,
        recipientCount: new Set(
          (classItem?.enrollments ?? []).map((enrollment) => enrollment.userId),
        ).size,
        class: classItem
          ? {
              id: classItem.id,
              name: classItem.name,
            }
          : null,
        academy: classItem
          ? {
              id: classItem.academy.id,
              name: classItem.academy.name,
            }
          : null,
        sender: message.sender,
      };
    });
  }

  async listUnpaidReminderLogs(
    userId: string,
    query: ListUnpaidReminderLogsQueryDto,
  ) {
    const limit = Math.min(Math.max(query.limit ?? 40, 1), 100);
    const managedClasses = await this.prisma.class.findMany({
      where: {
        ...(query.classId ? { id: query.classId } : {}),
        OR: [
          { instructorId: userId },
          { academy: { is: { ownerId: userId } } },
        ],
      },
      select: {
        id: true,
      },
    });
    const managedClassIds = new Set(managedClasses.map((classItem) => classItem.id));

    if (managedClassIds.size === 0) {
      return {
        summary: {
          totalCount: 0,
          manualCount: 0,
          autoCount: 0,
        },
        items: [],
      };
    }

    const types =
      query.trigger === UnpaidReminderTrigger.MANUAL
        ? ['unpaid_reminder_manual']
        : query.trigger === UnpaidReminderTrigger.AUTO
          ? ['unpaid_reminder_auto']
          : ['unpaid_reminder_manual', 'unpaid_reminder_auto'];

    const notifications = await this.prisma.notification.findMany({
      where: {
        type: { in: types },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 3,
    });

    const keyword = query.search?.trim().toLowerCase();
    const items = notifications
      .map((notification) => {
        const payload = this.parseReminderLogPayload(notification.data);

        if (!payload) {
          return null;
        }

        if (!managedClassIds.has(payload.classId)) {
          return null;
        }

        const item = {
          id: notification.id,
          trigger:
            notification.type === 'unpaid_reminder_auto' ? 'auto' : 'manual',
          title: notification.title,
          body: notification.body,
          createdAt: notification.createdAt,
          guardian: {
            id: notification.user.id,
            name: notification.user.name,
            phone: notification.user.phone,
          },
          class: {
            id: payload.classId,
            name: payload.className,
          },
          academy: {
            id: payload.academyId,
            name: payload.academyName,
          },
          student: {
            id: payload.childId,
            name: payload.childName ?? notification.user.name ?? '수강생',
          },
          amount: payload.amount,
          lastReminderAt: payload.lastReminderAt,
        };

        if (!keyword) {
          return item;
        }

        const haystack = [
          item.student.name,
          item.guardian.name ?? '',
          item.class.name,
          item.academy.name,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(keyword) ? item : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, limit);

    return {
      summary: {
        totalCount: items.length,
        manualCount: items.filter((item) => item.trigger === 'manual').length,
        autoCount: items.filter((item) => item.trigger === 'auto').length,
      },
      items,
    };
  }

  async sendAnnouncement(senderId: string, dto: SendAnnouncementDto) {
    if (dto.scheduleDatetime) {
      throw new BadRequestException(
        '예약 발송은 아직 지원하지 않습니다. 즉시 발송으로 이용해 주세요.',
      );
    }

    const classItem = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      include: {
        academy: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        chatRooms: {
          where: { type: ChatRoomType.CLASS_GROUP },
          select: { id: true },
          take: 1,
        },
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!classItem) {
      throw new NotFoundException('반을 찾을 수 없습니다.');
    }

    if (
      classItem.instructorId !== senderId &&
      classItem.academy.ownerId !== senderId
    ) {
      throw new ForbiddenException('공지 발송 권한이 없습니다.');
    }

    const recipientUserIds = [...new Set(classItem.enrollments.map((item) => item.userId))];

    const message = await this.prisma.$transaction(async (tx) => {
      const existingRoom =
        classItem.chatRooms[0] ??
        (await tx.chatRoom.create({
          data: {
            classId: classItem.id,
            type: ChatRoomType.CLASS_GROUP,
            name: `${classItem.name} 공지`,
          },
          select: { id: true },
        }));

      const announcementMessage = await tx.chatMessage.create({
        data: {
          roomId: existingRoom.id,
          senderId,
          type: ChatMessageType.ANNOUNCEMENT,
          content: JSON.stringify({
            title: dto.title.trim(),
            content: dto.content.trim(),
            channels: dto.channels,
          }),
          isPinned: true,
        },
      });

      if (recipientUserIds.length > 0) {
        await tx.notification.createMany({
          data: recipientUserIds.map((userId) => ({
            userId,
            type: 'announcement',
            title: dto.title.trim(),
            body: dto.content.trim(),
            data: {
              classId: classItem.id,
              className: classItem.name,
              academyId: classItem.academy.id,
              academyName: classItem.academy.name,
              announcementId: announcementMessage.id,
              channels: dto.channels,
            },
          })),
        });
      }

      return announcementMessage;
    });

    return {
      id: message.id,
      class: {
        id: classItem.id,
        name: classItem.name,
      },
      academy: {
        id: classItem.academy.id,
        name: classItem.academy.name,
      },
      recipientCount: recipientUserIds.length,
      channels: dto.channels,
      createdAt: message.createdAt,
    };
  }

  async sendUnpaidReminder(senderId: string, dto: SendUnpaidReminderDto) {
    const paymentIds = [...new Set(dto.paymentIds)];
    const payments = await this.fetchReminderPayments({
      id: {
        in: paymentIds,
      },
    });

    if (payments.length !== paymentIds.length) {
      throw new NotFoundException('일부 결제 정보를 찾을 수 없습니다.');
    }

    const hasForbiddenPayment = payments.some((payment) => {
      const classItem = payment.enrollment.class;
      return (
        classItem.instructorId !== senderId &&
        classItem.academy.ownerId !== senderId
      );
    });

    if (hasForbiddenPayment) {
      throw new ForbiddenException('미납 알림 발송 권한이 없습니다.');
    }

    const pendingPayments = payments.filter(
      (payment) => payment.status === PaymentStatus.PENDING,
    );

    if (pendingPayments.length === 0) {
      throw new BadRequestException('발송 가능한 미납 결제가 없습니다.');
    }

    const result = await this.persistUnpaidReminders(
      pendingPayments,
      'unpaid_reminder_manual',
    );

    return {
      sentCount: result.sentCount,
      skippedCount: payments.length - pendingPayments.length,
      items: result.items,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM, {
    timeZone: 'Asia/Seoul',
  })
  async handleAutoUnpaidReminder() {
    const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const payments = await this.fetchReminderPayments({
      status: PaymentStatus.PENDING,
      createdAt: { lte: threshold },
      lastReminderAt: null,
    } as any);

    if (payments.length === 0) {
      return;
    }

    const result = await this.persistUnpaidReminders(
      payments,
      'unpaid_reminder_auto',
    );

    this.logger.log(`자동 미납 알림 ${result.sentCount}건 발송`);
  }

  private parseAnnouncementPayload(content: string): AnnouncementPayload {
    try {
      const parsed = JSON.parse(content) as Partial<AnnouncementPayload>;
      return {
        title:
          typeof parsed.title === 'string' && parsed.title.trim().length > 0
            ? parsed.title
            : '공지',
        content:
          typeof parsed.content === 'string'
            ? parsed.content
            : content,
        channels: Array.isArray(parsed.channels)
          ? parsed.channels.filter((channel): channel is AnnouncementChannel =>
              Object.values(AnnouncementChannel).includes(
                channel as AnnouncementChannel,
              ),
            )
          : [],
      };
    } catch {
      return {
        title: '공지',
        content,
        channels: [],
      };
    }
  }

  private buildUnpaidReminderBody(
    studentName: string,
    className: string,
    amount: number,
  ) {
    return `${studentName}님의 ${className} 수업 미납 수강료 ${amount.toLocaleString(
      'ko-KR',
    )}원 입금을 부탁드립니다.`;
  }

  private parseReminderLogPayload(data: Prisma.JsonValue | null) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }

    const record = data as Record<string, unknown>;

    if (
      typeof record.paymentId !== 'string' ||
      typeof record.enrollmentId !== 'string' ||
      typeof record.classId !== 'string' ||
      typeof record.className !== 'string' ||
      typeof record.academyId !== 'string' ||
      typeof record.academyName !== 'string' ||
      typeof record.amount !== 'number'
    ) {
      return null;
    }

    return {
      paymentId: record.paymentId,
      enrollmentId: record.enrollmentId,
      amount: record.amount,
      classId: record.classId,
      className: record.className,
      academyId: record.academyId,
      academyName: record.academyName,
      childId: typeof record.childId === 'string' ? record.childId : null,
      childName: typeof record.childName === 'string' ? record.childName : null,
      lastReminderAt:
        typeof record.lastReminderAt === 'string' ? record.lastReminderAt : null,
    } satisfies ReminderLogPayload;
  }

  private async fetchReminderPayments(where: Prisma.PaymentWhereInput | Record<string, unknown>) {
    return (this.prisma.payment as any).findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
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
                instructorId: true,
                academy: {
                  select: {
                    id: true,
                    name: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<ReminderPayment[]>;
  }

  private async persistUnpaidReminders(
    payments: ReminderPayment[],
    notificationType: 'unpaid_reminder_auto' | 'unpaid_reminder_manual',
  ) {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.notification.createMany({
        data: payments.map((payment) => ({
          userId: payment.userId,
          type: notificationType,
          title: '수강료 입금 안내',
          body: this.buildUnpaidReminderBody(
            payment.enrollment.child?.name ?? payment.user.name ?? '수강생',
            payment.enrollment.class.name,
            payment.amount,
          ),
          data: {
            paymentId: payment.id,
            enrollmentId: payment.enrollmentId,
            amount: payment.amount,
            classId: payment.enrollment.class.id,
            className: payment.enrollment.class.name,
            academyId: payment.enrollment.class.academy.id,
            academyName: payment.enrollment.class.academy.name,
            childId: payment.enrollment.child?.id ?? null,
            childName: payment.enrollment.child?.name ?? null,
            lastReminderAt: now.toISOString(),
          },
        })),
      }),
      this.prisma.payment.updateMany({
        where: {
          id: {
            in: payments.map((payment) => payment.id),
          },
        },
        data: {
          lastReminderAt: now,
        } as any,
      }),
    ]);

    return {
      sentCount: payments.length,
      items: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        lastReminderAt: now.toISOString(),
        user: payment.user,
        child: payment.enrollment.child,
        class: {
          id: payment.enrollment.class.id,
          name: payment.enrollment.class.name,
        },
        academy: {
          id: payment.enrollment.class.academy.id,
          name: payment.enrollment.class.academy.name,
        },
      })),
    };
  }
}
