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
  ApiQuery,
} from '@nestjs/swagger';
import { ClassService } from './class.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { MineClassesQueryDto } from './dto/mine-classes-query.dto';
import { Request } from 'express';

@ApiTags('Classes')
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 운영 반 목록',
    description: '강사 View에서 운영 중인 반 목록을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '내 반 목록' })
  async findMine(@Req() req: Request, @Query() query: MineClassesQueryDto) {
    return this.classService.findMine((req as any).user.id, query);
  }

  @Get()
  @ApiOperation({
    summary: '학원별 수업 목록',
    description: '특정 학원의 수업 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'academyId', required: true, description: '학원 ID' })
  @ApiResponse({ status: 200, description: '수업 목록' })
  async findByAcademy(@Query('academyId') academyId: string) {
    return this.classService.findByAcademy(academyId);
  }

  @Get(':id')
  @ApiOperation({
    summary: '수업 상세 조회',
    description: '수업 상세 정보 (스케줄, 학원 정보 포함)',
  })
  @ApiResponse({ status: 200, description: '수업 상세 정보' })
  @ApiResponse({ status: 404, description: '수업을 찾을 수 없음' })
  async findById(@Param('id') id: string) {
    return this.classService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '수업 생성',
    description: '새 수업을 생성합니다. 운영 학원 소유자 또는 담당 강사만 가능합니다.',
  })
  @ApiResponse({ status: 201, description: '생성된 수업 정보' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(@Req() req: Request, @Body() dto: CreateClassDto) {
    return this.classService.create((req as any).user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '수업 수정',
    description: '수업 정보를 수정합니다. 운영 학원 소유자 또는 담당 강사만 가능합니다.',
  })
  @ApiResponse({ status: 200, description: '수정된 수업 정보' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '수업을 찾을 수 없음' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classService.update(id, (req as any).user.id, dto);
  }
}
