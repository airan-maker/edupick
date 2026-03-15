import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KakaoLoginDto {
  @ApiProperty({
    description: '카카오 SDK에서 발급받은 access token',
    example: 'kakao_access_token_here',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
