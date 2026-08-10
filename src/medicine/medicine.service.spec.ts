import { MedicineService } from './medicine.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('MedicineService.importMany', () => {
  const mockPrisma = {
    medicine: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const service = new MedicineService(mockPrisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tạo mới khi chưa tồn tại', async () => {
    mockPrisma.medicine.findFirst.mockResolvedValue(null);
    mockPrisma.medicine.create.mockResolvedValue({});

    const result = await service.importMany({
      items: [{ name: 'Sài hồ', unit: 'g', unitPrice: 500 }],
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('skip khi trùng trong file', async () => {
    const result = await service.importMany({
      items: [
        { name: 'Sài hồ', unit: 'g', unitPrice: 500 },
        { name: 'Sài hồ', unit: 'g', unitPrice: 500 },
      ],
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors[0].message).toContain('Trùng tên + đơn vị trong file');
  });
});
