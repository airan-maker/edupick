import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { ListSentAnnouncementsQueryDto } from './dto/list-sent-announcements-query.dto';
import { ListUnpaidReminderLogsQueryDto } from './dto/list-unpaid-reminder-logs-query.dto';
import { SendAnnouncementDto } from './dto/send-announcement.dto';
import { SendUnpaidReminderDto } from './dto/send-unpaid-reminder.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 알림 목록',
    description: '로그인한 사용자의 알림을 최신순으로 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '알림 목록' })
  async listByUser(
    @Req() req: Request,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationService.listByUser((req as any).user.id, query);
  }

  @Get('announcements/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내가 발송한 공지 목록',
    description: '강사 View에서 발송한 최근 공지를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '공지 목록' })
  async listSentAnnouncements(
    @Req() req: Request,
    @Query() query: ListSentAnnouncementsQueryDto,
  ) {
    return this.notificationService.listSentAnnouncements(
      (req as any).user.id,
      query,
    );
  }

  @Get('unpaid-reminders/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 미납 알림 발송 로그',
    description: '강사 View에서 최근 미납 알림 발송 로그를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '미납 알림 발송 로그' })
  async listUnpaidReminderLogs(
    @Req() req: Request,
    @Query() query: ListUnpaidReminderLogsQueryDto,
  ) {
    return this.notificationService.listUnpaidReminderLogs(
      (req as any).user.id,
      query,
    );
  }

  @Post('announcement')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '공지 발송',
    description: '강사 View에서 반 수강생에게 공지를 즉시 발송합니다.',
  })
  @ApiResponse({ status: 201, description: '발송 결과' })
  async sendAnnouncement(
    @Req() req: Request,
    @Body() dto: SendAnnouncementDto,
  ) {
    return this.notificationService.sendAnnouncement((req as any).user.id, dto);
  }

  @Post('unpaid-reminder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '미납 알림 발송',
    description: '강사 View에서 미납 결제 대상자에게 입금 안내를 발송합니다.',
  })
  @ApiResponse({ status: 201, description: '미납 알림 발송 결과' })
  async sendUnpaidReminder(
    @Req() req: Request,
    @Body() dto: SendUnpaidReminderDto,
  ) {
    return this.notificationService.sendUnpaidReminder(
      (req as any).user.id,
      dto,
    );
  }
}
