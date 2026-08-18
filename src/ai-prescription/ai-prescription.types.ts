export interface AiSuggestedHerb {
  readonly name: string;
  readonly weight: string;
  readonly medicineId: string | null;
  readonly unit: string | null;
  readonly matchedFromCatalog: boolean;
}

export interface SuggestPrescriptionResponse {
  readonly diagnosis: string;
  readonly prescriptionFormula: string;
  readonly prescriptionDosage: string;
  readonly herbs: AiSuggestedHerb[];
  readonly rationale: string;
  readonly warnings: string[];
  readonly model: string;
}

export interface RawLlmPrescriptionSuggestion {
  diagnosis?: unknown;
  prescriptionFormula?: unknown;
  prescriptionDosage?: unknown;
  herbs?: unknown;
  rationale?: unknown;
  warnings?: unknown;
}

export function parseLlmJsonContent(content: string): RawLlmPrescriptionSuggestion {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(jsonText) as RawLlmPrescriptionSuggestion;
}

export function asNonEmptyString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}
