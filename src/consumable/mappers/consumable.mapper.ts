import type { Consumable } from '@prisma/client';

/**
 * Mapper để chuyển đổi dữ liệu vật tư tiêu hao thành dữ liệu phản hồi
 */
export interface ConsumableResponse {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  readonly stockQuantity: number;
  readonly note: string | null;
  readonly sessionQuotaText: string | null;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

/**
 * Mapper để chuyển đổi dữ liệu vật tư tiêu hao thành dữ liệu phản hồi
 */
export interface ConsumableOptionResponse {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  readonly stockQuantity: number;
  readonly sessionQuotaText: string | null;
}

export interface ConsumableUsageResponse {
  readonly id: string;
  readonly consumableName: string;
  readonly unit: string;
  readonly quantity: number;
  readonly performedAt: string;
  readonly patientName: string;
  readonly patientCode: string;
  readonly serviceName: string;
  readonly sessionNumber: number;
  readonly performedByName: string | null;
}

export function mapConsumableToResponse(row: Consumable): ConsumableResponse {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    stockQuantity: Number(row.stockQuantity),
    note: row.note,
    sessionQuotaText: row.sessionQuotaText,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export function mapConsumableToOption(row: Consumable): ConsumableOptionResponse {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    stockQuantity: Number(row.stockQuantity),
    sessionQuotaText: row.sessionQuotaText,
  };
}
