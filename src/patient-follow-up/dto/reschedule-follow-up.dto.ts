import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RescheduleFollowUpDto {
  @IsDateString()
  rescheduledFollowUpDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
