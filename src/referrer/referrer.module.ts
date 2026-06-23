import { Module } from '@nestjs/common';
import { ReferrerController } from './referrer.controller';
import { ReferrerService } from './referrer.service';

@Module({
  controllers: [ReferrerController],
  providers: [ReferrerService],
  exports: [ReferrerService],
})
export class ReferrerModule {}
