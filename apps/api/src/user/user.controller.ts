import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Request } from 'express';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({
    summary: '내 프로필 조회',
    description: '현재 로그인한 사용자의 프로필 정보를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '사용자 프로필' })
  async getMe(@Req() req: Request) {
    return this.userService.findById((req as any).user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: '내 프로필 수정',
    description: '이름, 전화번호, 프로필 이미지를 수정합니다.',
  })
  @ApiResponse({ status: 200, description: '수정된 프로필' })
  async updateMe(@Req() req: Request, @Body() dto: UpdateUserDto) {
    return this.userService.update((req as any).user.id, dto);
  }

  @Patch('me/role')
  @ApiOperation({
    summary: '내 역할 설정',
    description: '온보딩 단계에서 사용자 역할을 설정합니다.',
  })
  @ApiResponse({ status: 200, description: '수정된 사용자 정보' })
  async updateRole(@Req() req: Request, @Body() dto: UpdateRoleDto) {
    return this.userService.updateRole((req as any).user.id, dto.role);
  }

  @Post('me/children')
  @ApiOperation({
    summary: '자녀 추가',
    description: '현재 사용자에게 자녀 정보를 추가합니다.',
  })
  @ApiResponse({ status: 201, description: '생성된 자녀 정보' })
  async addChild(@Req() req: Request, @Body() dto: CreateChildDto) {
    return this.userService.addChild((req as any).user.id, dto);
  }

  @Get('me/children')
  @ApiOperation({
    summary: '자녀 목록 조회',
    description: '현재 사용자의 자녀 목록을 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '자녀 목록' })
  async listChildren(@Req() req: Request) {
    return this.userService.listChildren((req as any).user.id);
  }

  @Patch('me/children/:id')
  @ApiOperation({
    summary: '자녀 정보 수정',
    description: '특정 자녀의 정보를 수정합니다.',
  })
  @ApiResponse({ status: 200, description: '수정된 자녀 정보' })
  @ApiResponse({ status: 404, description: '자녀를 찾을 수 없음' })
  async updateChild(
    @Req() req: Request,
    @Param('id') childId: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.userService.updateChild((req as any).user.id, childId, dto);
  }
}
