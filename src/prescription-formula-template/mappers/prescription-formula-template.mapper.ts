import type { PrescriptionFormulaHerb, PrescriptionFormulaTemplate } from '@prisma/client';
/**
 * DTO cho herb trong công thức phiếu trị liệu
 */
export interface PrescriptionFormulaHerbResponse {
  readonly medicineId: string | null;
  readonly name: string;
  readonly weight: string;
  readonly unit: string | null;
  readonly quantity: number | null;
  readonly decoctionOrder: string | null;
  readonly decoctionPrep: string | null;
  readonly sortOrder: number;
}

/**
 * DTO cho công thức phiếu trị liệu
 */
export interface PrescriptionFormulaTemplateResponse {
  readonly id: string;
  readonly name: string;
  readonly dosage: string | null;
  readonly herbs: PrescriptionFormulaHerbResponse[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Công thức phiếu trị liệu với các vị thuốc
 */
type TemplateWithHerbs = PrescriptionFormulaTemplate & {
  herbs: PrescriptionFormulaHerb[];
};

function mapHerbToResponse(herb: PrescriptionFormulaHerb): PrescriptionFormulaHerbResponse {
  return {
    medicineId: herb.medicineId,
    name: herb.name,
    weight: herb.weight,
    unit: herb.unit,
    quantity: herb.quantity != null ? Number(herb.quantity) : null,
    decoctionOrder: herb.decoctionOrder,
    decoctionPrep: herb.decoctionPrep,
    sortOrder: herb.sortOrder,
  };
}

export function mapTemplateToResponse(
  template: TemplateWithHerbs,
): PrescriptionFormulaTemplateResponse {
  return {
    id: template.id,
    name: template.name,
    dosage: template.dosage,
    herbs: template.herbs.map(mapHerbToResponse),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}
