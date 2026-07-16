import type { Medicine } from '@prisma/client';

export interface MedicineResponse {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  readonly unitPrice: number;
  readonly category: string | null;
}

export function mapMedicineToResponse(medicine: Medicine): MedicineResponse {
  return {
    id: medicine.id,
    name: medicine.name,
    unit: medicine.unit,
    unitPrice: medicine.unitPrice.toNumber(),
    category: medicine.category,
  };
}
// normalizeCategory là hàm để loại bỏ khoảng trắng ở đầu và cuối của chuỗi category
export function normalizeCategory(category?: string): string | null {
  const trimmed = category?.trim();
  return trimmed ? trimmed : null;
}
