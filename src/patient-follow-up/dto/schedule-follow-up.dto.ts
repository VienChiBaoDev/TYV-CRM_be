import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class ScheduleFollowUpDto {
  @IsISO8601()
  scheduledAt!: string;

  @IsOptional()
  @IsISO8601()
  endedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  doctorName?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
