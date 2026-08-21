export interface AiIntegrationHerb {
  readonly name: string;
  readonly weight: string;
  readonly medicineId: string | null;
  readonly unit: string | null;
  readonly matchedFromCatalog: boolean;
}

export interface AiIntegrationSuggestResponse {
  readonly diagnosis: string;
  readonly prescriptionFormula: string;
  readonly prescriptionDosage: string;
  readonly herbs: AiIntegrationHerb[];
  readonly rationale: string;
  readonly warnings: string[];
  readonly model: string;
}

export interface AiIntegrationSuggestPayload {
  symptoms: string;
  bloodPressure?: string;
  pulse?: string;
  labResults?: string;
  pulseDiagnosis?: {
    ta?: string;
    huu?: string;
    bung?: string;
  };
  patient: {
    fullName: string;
    gender?: string | null;
    age?: number | null;
    dietRestrictions?: string[];
    tags?: string[];
  };
  recentVisits: Array<{
    visitNumber: number;
    visitDate: string;
    symptoms?: string | null;
    prescriptionFormula?: string | null;
    prescriptionDosage?: string | null;
    herbs: string[];
  }>;
  medicines: Array<{
    id: string;
    name: string;
    unit: string;
    unitPrice?: number;
  }>;
  formulas: Array<{
    name: string;
    dosage?: string | null;
    herbs: string[];
  }>;
}
