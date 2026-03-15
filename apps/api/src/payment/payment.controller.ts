import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentReportQueryDto } from './dto/payment-report-query.dto';
import { PaymentService } from './payment.service';
import { OperatorStatisticsQueryDto } from './dto/operator-statistics-query.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({
    summary: '내 결제 내역 조회',
    description: '현재 로그인한 사용자의 결제 내역과 수강 정보를 함께 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '결제 내역 목록' })
  async list(@Req() req: Request) {
    return this.paymentService.listByUser((req as any).user.id);
  }

  @Get('report')
  @ApiOperation({
    summary: '교육비 리포트 조회',
    description: '연/월 기준으로 결제 요약과 과목별 지출 통계를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '교육비 리포트' })
  async getReport(@Req() req: Request, @Query() query: PaymentReportQueryDto) {
    return this.paymentService.getReport((req as any).user.id, query);
  }

  @Get('operator/summary')
  @ApiOperation({
    summary: '운영자 결제 요약',
    description: '강사 View에서 운영 중인 반의 수납 요약을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '운영자 결제 요약' })
  async getOperatorSummary(@Req() req: Request) {
    return this.paymentService.getOperatorSummary((req as any).user.id);
  }

  @Get('operator/statistics')
  @ApiOperation({
    summary: '운영자 매출 통계',
    description: '강사 View에서 운영 중인 반의 연간 매출 및 수납 통계를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '운영자 매출 통계' })
  async getOperatorStatistics(
    @Req() req: Request,
    @Query() query: OperatorStatisticsQueryDto,
  ) {
    return this.paymentService.getOperatorStatistics(
      (req as any).user.id,
      query,
    );
  }
}
