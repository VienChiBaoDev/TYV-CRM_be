import { PartialType } from '@nestjs/mapped-types';
import { CreateConsumableDto } from './create-consumable.dto';

/**
 * Partial type giúp thêm dấu ? vào các fields của CreateConsumableDto
 */
export class UpdateConsumableDto extends PartialType(CreateConsumableDto) {}
