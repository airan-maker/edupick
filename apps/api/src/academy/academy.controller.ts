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
import { AcademyService } from './academy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { Request } from 'express';

@ApiTags('Academies')
@Controller('academies')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 학원 목록',
    description: '현재 로그인한 사용자가 소유한 학원 목록과 운영 요약을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '소유 학원 목록' })
  async findMine(@Req() req: Request) {
    return this.academyService.findMine((req as any).user.id);
  }

  @Get('nearby')
  @ApiOperation({
    summary: '주변 학원 검색',
    description:
      '위치 기반으로 주변 학원을 검색합니다. Haversine 공식을 사용하여 거리 계산.',
  })
  @ApiResponse({ status: 200, description: '학원 목록' })
  async findNearby(@Query() query: NearbyQueryDto) {
    return this.academyService.findNearby(query);
  }

  @Get('highlights')
  @ApiOperation({
    summary: '공개 랜딩용 하이라이트',
    description:
      '공개 페이지에서 사용하는 추천 학원과 후기 하이라이트를 함께 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '공개 랜딩 하이라이트 데이터' })
  async findHighlights() {
    return this.academyService.findHighlights();
  }

  @Get(':id')
  @ApiOperation({
    summary: '학원 상세 조회',
    description: '학원 상세 정보 (수업, 스케줄, 리뷰 포함)',
  })
  @ApiResponse({ status: 200, description: '학원 상세 정보' })
  @ApiResponse({ status: 404, description: '학원을 찾을 수 없음' })
  async findById(@Param('id') id: string) {
    return this.academyService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '학원 등록',
    description: '새 학원을 등록합니다. 운영 계정에서 사용합니다.',
  })
  @ApiResponse({ status: 201, description: '생성된 학원 정보' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(@Req() req: Request, @Body() dto: CreateAcademyDto) {
    return this.academyService.create((req as any).user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '학원 정보 수정',
    description: '학원 정보를 수정합니다. 소유자만 가능.',
  })
  @ApiResponse({ status: 200, description: '수정된 학원 정보' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '학원을 찾을 수 없음' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAcademyDto>,
  ) {
    return this.academyService.update(id, (req as any).user.id, dto);
  }
}
