import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { JwtPayloadUser } from '../auth/types';
import { assertPatientAccess } from '../auth/access/patient-access';
import { PrismaService } from '../prisma/prisma.service';
import { DEEPSEEK_DEFAULT_MODEL, DeepSeekClient } from './deepseek.client';
import { SuggestPrescriptionDto } from './dto/suggest-prescription.dto';
import {
  asNonEmptyString,
  parseLlmJsonContent,
  SuggestPrescriptionResponse,
  type AiSuggestedHerb,
  type RawLlmPrescriptionSuggestion,
} from './ai-prescription.types';
import { ConfigService } from '@nestjs/config';

interface CatalogMedicine {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  normalizedName: string;
}

interface FormulaTemplateSummary {
  name: string;
  dosage: string | null;
  herbs: string[];
}

const SYSTEM_PROMPT = `Bạn là trợ lý YHCT (Đông y) hỗ trợ bác sĩ phòng khám TYV.
Nhiệm vụ: dựa trên triệu chứng, mạch/thiệt chẩn và danh mục thuốc/bài mẫu được cung cấp, gợi ý chẩn đoán YHCT và đơn thuốc.

Quy tắc bắt buộc:
1. Chỉ GỢI Ý — bác sĩ sẽ duyệt trước khi lưu.
2. Ưu tiên vị thuốc có trong "Danh mục thuốc kho". Nếu phải dùng vị ngoài kho, vẫn ghi tên nhưng hệ thống có thể loại bỏ.
3. Ưu tiên bài thuốc trong "Bài thuốc mẫu phòng khám" nếu khớp chứng.
4. Không bịa xét nghiệm/chẩn đoán Tây y chắc chắn khi thiếu dữ liệu.
5. Trả về ĐÚNG JSON object (không markdown), schema:
{
  "diagnosis": string,              // chẩn đoán YHCT / bát cương / tạng phủ ngắn gọn
  "prescriptionFormula": string,    // tên bài / phương
  "prescriptionDosage": string,     // cách sắc uống, số thang, túi...
  "herbs": [{ "name": string, "weight": string }],
  "rationale": string,              // giải thích ngắn vì sao chọn bài/vị
  "warnings": string[]              // lưu ý chống chỉ định / cần hỏi thêm
}
6. "weight" là khối lượng/liều vị (vd "12g", "8").
7. Viết tiếng Việt.`;

@Injectable()
export class AiPrescriptionService {
  private readonly logger = new Logger(AiPrescriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepSeek: DeepSeekClient,
    private readonly config: ConfigService,
  ) {}

  async suggest(
    patientId: string,
    dto: SuggestPrescriptionDto,
    user: JwtPayloadUser,
  ): Promise<SuggestPrescriptionResponse> {
    const symptoms = dto.symptoms?.trim();
    if (!symptoms) {
      throw new BadRequestException(
        'Cần nhập triệu chứng & bệnh sử trước khi gợi ý AI.',
      );
    }

    await assertPatientAccess(this.prisma, user, patientId);

    const [patient, recentVisits, medicines, formulaTemplates] =
      await Promise.all([
        this.prisma.patient.findUnique({
          where: { id: patientId },
          select: {
            fullName: true,
            gender: true,
            birthDate: true,
            dietRestrictions: true,
            tags: true,
          },
        }),
        this.prisma.medicalVisit.findMany({
          where: { patientId },
          orderBy: { visitDate: 'desc' },
          take: 3,
          select: {
            visitNumber: true,
            visitDate: true,
            symptoms: true,
            prescriptionFormula: true,
            prescriptionDosage: true,
            herbs: {
              orderBy: { sortOrder: 'asc' },
              select: { name: true, weight: true },
            },
          },
        }),
        this.prisma.medicine.findMany({
          orderBy: { name: 'asc' },
          take: 400,
          select: {
            id: true,
            name: true,
            unit: true,
            unitPrice: true,
          },
        }),
        this.prisma.prescriptionFormulaTemplate.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 40,
          select: {
            name: true,
            dosage: true,
            herbs: {
              orderBy: { sortOrder: 'asc' },
              select: { name: true, weight: true },
            },
          },
        }),
      ]);

    const catalog: CatalogMedicine[] = medicines.map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      unitPrice: Number(m.unitPrice),
      normalizedName: normalizeMedicineName(m.name),
    }));

    const formulas: FormulaTemplateSummary[] = formulaTemplates.map((f) => ({
      name: f.name,
      dosage: f.dosage,
      herbs: f.herbs.map((h) => `${h.name} ${h.weight}`.trim()),
    }));

    const age = patient?.birthDate
      ? calcAgeYears(patient.birthDate)
      : null;

    const userPrompt = buildUserPrompt({
      patientName: patient?.fullName ?? 'Không rõ',
      gender: patient?.gender ?? null,
      age,
      dietRestrictions: patient?.dietRestrictions ?? [],
      tags: patient?.tags ?? [],
      dto,
      recentVisits: recentVisits.map((v) => ({
        visitNumber: v.visitNumber,
        visitDate: v.visitDate.toISOString().slice(0, 10),
        symptoms: v.symptoms,
        prescriptionFormula: v.prescriptionFormula,
        prescriptionDosage: v.prescriptionDosage,
        herbs: v.herbs.map((h) => `${h.name} ${h.weight}`.trim()),
      })),
      catalogNames: catalog.map((m) => `${m.name} (${m.unit})`),
      formulas,
    });

    const rawContent = await this.deepSeek.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    let parsed: RawLlmPrescriptionSuggestion;
    try {
      parsed = parseLlmJsonContent(rawContent);
    } catch (error) {
      this.logger.warn(
        `Failed to parse DeepSeek JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.',
      );
    }

    const warnings: string[] = Array.isArray(parsed.warnings)
      ? parsed.warnings
          .map((w) => asNonEmptyString(w))
          .filter(Boolean)
          .slice(0, 8)
      : [];

    const herbs = this.mapHerbs(parsed.herbs, catalog, warnings);
    const model =
      (this.config.get<string>('DEEPSEEK_MODEL') ?? DEEPSEEK_DEFAULT_MODEL).trim() ||
      DEEPSEEK_DEFAULT_MODEL;

    return {
      diagnosis: asNonEmptyString(parsed.diagnosis, 'Chưa xác định — cần bác sĩ bổ sung'),
      prescriptionFormula: asNonEmptyString(parsed.prescriptionFormula),
      prescriptionDosage: asNonEmptyString(parsed.prescriptionDosage),
      herbs,
      rationale: asNonEmptyString(parsed.rationale),
      warnings,
      model,
    };
  }

  private mapHerbs(
    rawHerbs: unknown,
    catalog: CatalogMedicine[],
    warnings: string[],
  ): AiSuggestedHerb[] {
    if (!Array.isArray(rawHerbs)) return [];

    const result: AiSuggestedHerb[] = [];
    const unmatched: string[] = [];

    for (const item of rawHerbs.slice(0, 40)) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const name = asNonEmptyString(record.name);
      if (!name) continue;
      const weight = asNonEmptyString(record.weight, '—');
      const matched = findCatalogMedicine(name, catalog);

      if (matched) {
        result.push({
          name: matched.name,
          weight,
          medicineId: matched.id,
          unit: matched.unit,
          matchedFromCatalog: true,
        });
      } else {
        unmatched.push(name);
        result.push({
          name,
          weight,
          medicineId: null,
          unit: null,
          matchedFromCatalog: false,
        });
      }
    }

    if (unmatched.length > 0) {
      warnings.push(
        `Các vị chưa khớp kho thuốc (cần chọn lại từ danh mục): ${unmatched.join(', ')}`,
      );
    }

    return result;
  }
}

function normalizeMedicineName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCatalogMedicine(
  name: string,
  catalog: CatalogMedicine[],
): CatalogMedicine | null {
  const normalized = normalizeMedicineName(name);
  if (!normalized) return null;

  const exact = catalog.find((m) => m.normalizedName === normalized);
  if (exact) return exact;

  const contains = catalog.find(
    (m) =>
      m.normalizedName.includes(normalized) ||
      normalized.includes(m.normalizedName),
  );
  return contains ?? null;
}

function calcAgeYears(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function buildUserPrompt(input: {
  patientName: string;
  gender: string | null;
  age: number | null;
  dietRestrictions: string[];
  tags: string[];
  dto: SuggestPrescriptionDto;
  recentVisits: Array<{
    visitNumber: number;
    visitDate: string;
    symptoms: string | null;
    prescriptionFormula: string | null;
    prescriptionDosage: string | null;
    herbs: string[];
  }>;
  catalogNames: string[];
  formulas: FormulaTemplateSummary[];
}): string {
  const pulse = input.dto.pulseDiagnosis;
  const lines: string[] = [
    '## Bệnh nhân',
    `- Họ tên: ${input.patientName}`,
    `- Giới tính: ${input.gender ?? 'Không rõ'}`,
    `- Tuổi: ${input.age ?? 'Không rõ'}`,
    `- Kiêng: ${input.dietRestrictions.join(', ') || 'Không'}`,
    `- Tags: ${input.tags.join(', ') || 'Không'}`,
    '',
    '## Lần khám hiện tại',
    `- Triệu chứng & bệnh sử:\n${input.dto.symptoms.trim()}`,
    `- Huyết áp: ${input.dto.bloodPressure?.trim() || 'Không có'}`,
    `- Mạch (số): ${input.dto.pulse?.trim() || 'Không có'}`,
    `- Mạch tả: ${pulse?.ta?.trim() || 'Không có'}`,
    `- Mạch hữu: ${pulse?.huu?.trim() || 'Không có'}`,
    `- Thiệt chẩn: ${pulse?.bung?.trim() || 'Không có'}`,
    `- Xét nghiệm/ghi chú: ${input.dto.labResults?.trim() || 'Không có'}`,
    '',
    '## Lần khám gần đây',
  ];

  if (input.recentVisits.length === 0) {
    lines.push('- Chưa có lịch sử khám trong hệ thống.');
  } else {
    for (const v of input.recentVisits) {
      lines.push(
        `- Lần ${v.visitNumber} (${v.visitDate}): ${v.symptoms || '—'} | Đơn: ${v.prescriptionFormula || '—'} ${v.prescriptionDosage || ''} | Vị: ${v.herbs.join('; ') || '—'}`,
      );
    }
  }

  lines.push('', '## Bài thuốc mẫu phòng khám (ưu tiên nếu khớp)');
  if (input.formulas.length === 0) {
    lines.push('- Chưa có bài mẫu.');
  } else {
    for (const f of input.formulas) {
      lines.push(
        `- ${f.name}${f.dosage ? ` | Liều: ${f.dosage}` : ''} | ${f.herbs.join('; ')}`,
      );
    }
  }

  lines.push(
    '',
    '## Danh mục thuốc kho (ưu tiên chọn từ đây)',
    input.catalogNames.length > 0
      ? input.catalogNames.join(', ')
      : '- Kho thuốc trống — gợi ý tên vị thông dụng, hệ thống sẽ cảnh báo chưa khớp kho.',
    '',
    'Hãy trả về JSON gợi ý chẩn đoán + đơn thuốc theo schema đã nêu.',
  );

  return lines.join('\n');
}
