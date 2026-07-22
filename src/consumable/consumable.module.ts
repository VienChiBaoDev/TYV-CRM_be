import { Module } from '@nestjs/common';
import { ConsumableController } from './consumable.controller';
import { ConsumableService } from './consumable.service';

@Module({
  controllers: [ConsumableController],
  providers: [ConsumableService],
  exports: [ConsumableService],
})
export class ConsumableModule {}
