import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SocialLoginDto } from './dto/social-login.dto';
import { normalizeRoleToView, SupportedViewRole } from '../user/role-view.util';
import { RegisterDto } from './dto/register.dto';
import { EmailLoginDto } from './dto/email-login.dto';

interface KakaoProfile {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

interface TokenPayload {
  sub: string;
  role: string;
}

type AuthUserRecord = User & {
  passwordHash?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async socialLogin(dto: SocialLoginDto) {
    if (dto.provider !== 'kakao') {
      throw new UnauthorizedException('지원하지 않는 로그인 제공자입니다.');
    }

    const kakaoProfile = await this.validateKakaoToken(dto.accessToken);
    const role = dto.role ? (dto.role as SupportedViewRole) : undefined;
    return this.loginOrRegister(kakaoProfile, role);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('이미 가입된 이메일입니다. 로그인해 주세요.');
    }

    const user = (await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        passwordHash: this.hashPassword(dto.password),
        role: normalizeRoleToView(dto.role),
      } as any,
    })) as AuthUserRecord;

    return this.buildAuthResponse(user, true);
  }

  async loginWithEmail(dto: EmailLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        '비밀번호 로그인 계정이 아닙니다. 카카오 로그인을 이용해 주세요.',
      );
    }

    if (!this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Validate a Kakao access token by calling the Kakao user info API.
   */
  async validateKakaoToken(accessToken: string): Promise<KakaoProfile> {
    try {
      const response = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });

      if (!response.ok) {
        throw new UnauthorizedException('유효하지 않은 카카오 토큰입니다.');
      }

      return (await response.json()) as KakaoProfile;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(
        '카카오 인증 서버 연결에 실패했습니다.',
      );
    }
  }

  async loginWithKakaoCode(
    code: string,
    redirectUri: string,
    role?: Role | SupportedViewRole,
  ) {
    const accessToken = await this.exchangeKakaoCode(code, redirectUri);
    const kakaoProfile = await this.validateKakaoToken(accessToken);
    return this.loginOrRegister(kakaoProfile, role);
  }

  private async exchangeKakaoCode(code: string, redirectUri: string) {
    const clientId = this.configService.get<string>('KAKAO_REST_API_KEY');
    const clientSecret =
      this.configService.get<string>('KAKAO_CLIENT_SECRET') ?? undefined;

    if (!clientId) {
      throw new InternalServerErrorException(
        'KAKAO_REST_API_KEY 환경 변수가 설정되지 않았습니다.',
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    });

    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    try {
      const response = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body,
      });

      if (!response.ok) {
        throw new UnauthorizedException(
          '카카오 로그인 코드를 access token으로 교환하지 못했습니다.',
        );
      }

      const data = (await response.json()) as { access_token?: string };
      if (!data.access_token) {
        throw new UnauthorizedException('카카오 access token이 비어 있습니다.');
      }

      return data.access_token;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        '카카오 인증 서버 연결에 실패했습니다.',
      );
    }
  }

  /**
   * Find an existing user by kakaoId or create a new one,
   * then issue JWT access + refresh tokens.
   */
  async loginOrRegister(
    kakaoProfile: KakaoProfile,
    role?: Role | SupportedViewRole,
  ) {
    const kakaoId = String(kakaoProfile.id);
    const email = kakaoProfile.kakao_account?.email?.toLowerCase() ?? null;
    const name = kakaoProfile.kakao_account?.profile?.nickname ?? null;
    const profileImageUrl =
      kakaoProfile.kakao_account?.profile?.profile_image_url ?? null;

    let user = (await this.prisma.user.findUnique({
      where: { kakaoId },
    })) as AuthUserRecord | null;

    if (!user && email) {
      user = await this.findUserByEmail(email);
    }

    const isNewUser = !user;

    if (!user) {
      user = (await this.prisma.user.create({
        data: {
          kakaoId,
          email,
          name,
          profileImageUrl,
          role: normalizeRoleToView(role),
        },
      })) as AuthUserRecord;
    } else if (
      user.kakaoId !== kakaoId ||
      user.email !== email ||
      user.name !== name ||
      user.profileImageUrl !== profileImageUrl
    ) {
      user = (await this.prisma.user.update({
        where: { id: user.id },
        data: {
          kakaoId,
          email,
          name,
          profileImageUrl,
        },
      })) as AuthUserRecord;
    }

    return this.buildAuthResponse(user, isNewUser);
  }

  /**
   * Validate a refresh token and issue a new token pair.
   */
  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      return this.issueTokens(user);
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 refresh token입니다.');
    }
  }

  private async findUserByEmail(email: string) {
    return (await this.prisma.user.findUnique({
      where: { email },
    })) as AuthUserRecord | null;
  }

  private buildAuthResponse(user: AuthUserRecord, isNewUser = false) {
    return {
      ...this.issueTokens(user),
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizeRoleToView(user.role),
        profileImageUrl: user.profileImageUrl,
      },
    };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string) {
    const [salt, storedHash] = passwordHash.split(':');

    if (!salt || !storedHash) {
      return false;
    }

    const derivedKey = scryptSync(password, salt, 64);
    const storedKey = Buffer.from(storedHash, 'hex');

    if (storedKey.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(storedKey, derivedKey);
  }

  private issueTokens(user: Pick<User, 'id' | 'role'>) {
    const payload: TokenPayload = {
      sub: user.id,
      role: normalizeRoleToView(user.role),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
