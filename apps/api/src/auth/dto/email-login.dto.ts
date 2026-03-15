import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class EmailLoginDto {
  @ApiProperty({
    description: '로그인 이메일',
    example: 'teacher@edupick.kr',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '비밀번호',
    example: 'edupick1234',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
