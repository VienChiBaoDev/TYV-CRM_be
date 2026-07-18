import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ScheduleFollowUpDto {
  // thời gian bắt đầu
  @IsISO8601()
  scheduledAt!: string;
  // thời gian kết thúc
  @IsOptional()
  @IsISO8601()
  endedAt?: string;

  @IsUUID()
  doctorId!: string;

  @IsOptional()
  @IsUUID()
  assistantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assistantName?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
