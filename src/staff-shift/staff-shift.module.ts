import { Module } from '@nestjs/common';
import { StaffShiftController } from './staff-shift.controller';
import { StaffShiftService } from './staff-shift.service';

@Module({
  controllers: [StaffShiftController],
  providers: [StaffShiftService],
  exports: [StaffShiftService],
})
export class StaffShiftModule {}
