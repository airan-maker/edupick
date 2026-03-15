import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { CalendarQueryDto } from './dto/calendar-query.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({
    summary: '캘린더 이벤트 조회',
    description:
      '수강 중인 수업의 스케줄을 날짜별 이벤트로 반환합니다. 반복 스케줄을 개별 날짜로 확장하여 제공.',
  })
  @ApiResponse({ status: 200, description: '캘린더 이벤트 목록' })
  async getEvents(
    @Req() req: Request,
    @Query() query?: CalendarQueryDto,
  ) {
    return this.calendarService.getEvents(
      (req as any).user.id,
      query,
    );
  }

  @Get('family-calendar')
  @ApiOperation({
    summary: '가족 캘린더 이벤트 조회',
    description: '구현 계획서 기준 가족 통합 캘린더 응답 형태를 제공합니다.',
  })
  @ApiResponse({ status: 200, description: '가족 캘린더 이벤트 목록' })
  async getFamilyCalendar(@Req() req: Request, @Query() query?: CalendarQueryDto) {
    return this.calendarService.getEvents((req as any).user.id, query);
  }
}
