import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AnnouncementChannel {
  PUSH = 'push',
  KAKAO_ALIMTALK = 'kakao_alimtalk',
}

export class SendAnnouncementDto {
  @ApiProperty({ description: '공지 대상 반 ID' })
  @IsUUID()
  classId: string;

  @ApiProperty({
    description: '공지 제목',
    example: '이번 주 준비물 안내',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @ApiProperty({
    description: '공지 본문',
    example: '실내용 운동화를 꼭 챙겨주세요.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiProperty({
    description: '발송 채널',
    enum: AnnouncementChannel,
    isArray: true,
    example: [AnnouncementChannel.PUSH, AnnouncementChannel.KAKAO_ALIMTALK],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AnnouncementChannel, { each: true })
  channels: AnnouncementChannel[];

  @ApiPropertyOptional({
    description: '예약 발송 시각. 현재 MVP에서는 즉시 발송만 지원합니다.',
    example: '2026-03-20T09:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  scheduleDatetime?: string;
}
