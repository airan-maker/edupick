import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { Request } from 'express';
import { ListManagedStudentsQueryDto } from './dto/list-managed-students-query.dto';
import { UpdateManagedEnrollmentDto } from './dto/update-managed-enrollment.dto';

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({
    summary: '수강 신청',
    description: '수업에 수강 신청합니다. 결제 스텁이 함께 생성됩니다.',
  })
  @ApiResponse({ status: 201, description: '수강 신청 완료' })
  @ApiResponse({ status: 400, description: '정원 초과 또는 중복 수강' })
  @ApiResponse({ status: 404, description: '수업을 찾을 수 없음' })
  async enroll(@Req() req: Request, @Body() dto: CreateEnrollmentDto) {
    return this.enrollmentService.enroll((req as any).user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: '내 수강 목록',
    description: '현재 사용자의 수강 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '수강 목록' })
  async list(@Req() req: Request) {
    return this.enrollmentService.listByUser((req as any).user.id);
  }

  @Get('operator/students')
  @ApiOperation({
    summary: '운영 원생 목록',
    description: '강사 View에서 관리 중인 원생 목록과 미납 상태를 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '운영 원생 목록' })
  async listManagedStudents(
    @Req() req: Request,
    @Query() query: ListManagedStudentsQueryDto,
  ) {
    return this.enrollmentService.listManagedStudents(
      (req as any).user.id,
      query,
    );
  }

  @Patch(':id/operator')
  @ApiOperation({
    summary: '운영 원생 정보 수정',
    description: '강사 View에서 원생의 상태, 자동결제, 메모를 수정합니다.',
  })
  @ApiResponse({ status: 200, description: '수정된 원생 정보' })
  async updateManagedEnrollment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateManagedEnrollmentDto,
  ) {
    return this.enrollmentService.updateManagedEnrollment(
      id,
      (req as any).user.id,
      dto,
    );
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: '수강 취소',
    description: '수강을 취소합니다.',
  })
  @ApiResponse({ status: 200, description: '수강 취소 완료' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '수강 정보를 찾을 수 없음' })
  async cancel(@Req() req: Request, @Param('id') id: string) {
    return this.enrollmentService.cancel(id, (req as any).user.id);
  }
}
