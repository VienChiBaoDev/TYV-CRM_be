/**
 * Seed 4 tài khoản nhân sự mẫu cho mỗi role để đăng nhập thử.
 * Chạy: npm run seed:staff
 * Idempotent — chạy lại sẽ cập nhật mật khẩu/role theo danh sách dưới đây.
 */
import { PrismaClient, StaffRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = '123456';

const STAFF_SEED: Array<{
  email: string;
  fullName: string;
  role: StaffRole;
  clinicCodes: string[];
}> = [
  {
    email: 'admin@tyv.vn',
    fullName: 'Quản trị viên',
    role: StaffRole.ADMIN,
    clinicCodes: [],
  },
  {
    email: 'doctor@tyv.vn',
    fullName: 'BS. Nguyễn Hoàng Nam',
    role: StaffRole.DOCTOR,
    clinicCodes: ['HANG_BONG', 'CAU_GIAY'],
  },
  {
    email: 'assistant@tyv.vn',
    fullName: 'Trợ lý Trần Thị Lan',
    role: StaffRole.ASSISTANT,
    clinicCodes: ['HANG_BONG'],
  },
  {
    email: 'staff@tyv.vn',
    fullName: 'Nhân viên Lê Văn Hùng',
    role: StaffRole.STAFF,
    clinicCodes: ['CAU_GIAY'],
  },
];

async function resolveClinicIds(codes: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const code of codes) {
    const clinic = await prisma.clinic.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!clinic) {
      throw new Error(`Clinic not found for code: ${code}`);
    }
    ids.push(clinic.id);
  }
  return ids;
}

async function syncStaffClinics(staffId: string, role: StaffRole, clinicIds: string[]) {
  await prisma.staffClinic.deleteMany({ where: { staffId } });
  if (role === StaffRole.ADMIN || clinicIds.length === 0) return;
  await prisma.staffClinic.createMany({
    data: clinicIds.map((clinicId) => ({ staffId, clinicId })),
  });
}

async function main() {
  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  for (const staff of STAFF_SEED) {
    const clinicIds = await resolveClinicIds(staff.clinicCodes);

    const row = await prisma.staff.upsert({
      where: { email: staff.email },
      create: {
        email: staff.email,
        passwordHash,
        fullName: staff.fullName,
        role: staff.role,
        isActive: true,
      },
      update: {
        passwordHash,
        fullName: staff.fullName,
        role: staff.role,
        isActive: true,
      },
    });

    await syncStaffClinics(row.id, staff.role, clinicIds);
    console.log(`✓ ${staff.role.padEnd(10)} ${staff.email}`);
  }

  console.log(`\nĐã seed ${STAFF_SEED.length} tài khoản. Mật khẩu chung: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
