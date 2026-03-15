import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { KakaoCodeLoginDto } from './dto/kakao-code-login.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: '이메일 회원가입',
    description: '이메일/비밀번호로 회원가입 후 JWT 토큰 발급',
  })
  @ApiResponse({ status: 201, description: 'JWT 토큰 반환' })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: '이메일 로그인',
    description: '이메일/비밀번호로 로그인 후 JWT 토큰 발급',
  })
  @ApiResponse({ status: 201, description: 'JWT 토큰 반환' })
  @ApiResponse({ status: 401, description: '이메일 또는 비밀번호 불일치' })
  async login(@Body() dto: EmailLoginDto) {
    return this.authService.loginWithEmail(dto);
  }

  @Post('social')
  @ApiOperation({
    summary: '소셜 로그인',
    description: '소셜 access token으로 로그인/회원가입 처리',
  })
  @ApiResponse({ status: 201, description: 'JWT 토큰 반환' })
  @ApiResponse({ status: 401, description: '유효하지 않은 소셜 토큰' })
  async socialLogin(@Body() dto: SocialLoginDto) {
    return this.authService.socialLogin(dto);
  }

  @Post('kakao')
  @ApiOperation({
    summary: '카카오 로그인',
    description:
      '클라이언트에서 받은 카카오 accessToken으로 로그인/회원가입 처리',
  })
  @ApiResponse({ status: 201, description: 'JWT 토큰 반환' })
  @ApiResponse({ status: 401, description: '유효하지 않은 카카오 토큰' })
  async kakaoLogin(@Body() dto: KakaoLoginDto) {
    const kakaoProfile = await this.authService.validateKakaoToken(
      dto.accessToken,
    );
    return this.authService.loginOrRegister(kakaoProfile);
  }

  @Post('kakao/code')
  @ApiOperation({
    summary: '카카오 authorization code 로그인',
    description: '카카오 OAuth code를 access token으로 교환한 뒤 로그인 처리',
  })
  @ApiResponse({ status: 201, description: 'JWT 토큰 반환' })
  @ApiResponse({ status: 401, description: '유효하지 않은 카카오 code' })
  async kakaoCodeLogin(@Body() dto: KakaoCodeLoginDto) {
    return this.authService.loginWithKakaoCode(
      dto.code,
      dto.redirectUri,
      dto.role,
    );
  }

  @Post('refresh')
  @ApiOperation({
    summary: '토큰 갱신',
    description: 'Refresh token으로 새로운 access/refresh 토큰 발급',
  })
  @ApiResponse({ status: 201, description: '새 토큰 반환' })
  @ApiResponse({ status: 401, description: '유효하지 않은 refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '현재 사용자 정보',
    description: 'JWT 토큰으로 현재 로그인한 사용자 정보 반환',
  })
  @ApiResponse({ status: 200, description: '사용자 정보' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async me(@Req() req: Request) {
    return (req as any).user;
  }
}
