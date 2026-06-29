/**
 * Seed 4 tài khoản nhân sự mẫu cho mỗi role để đăng nhập thử.
 * Chạy: npm run seed:staff
 * Idempotent — chạy lại sẽ cập nhật mật khẩu/role theo danh sách dưới đây.
 */
import { ClinicBranch, PrismaClient, StaffRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = '123456';

const STAFF_SEED: Array<{
  email: string;
  fullName: string;
  role: StaffRole;
  clinicBranch: ClinicBranch | null;
}> = [
  {
    email: 'admin@tyv.vn',
    fullName: 'Quản trị viên',
    role: StaffRole.ADMIN,
    clinicBranch: null,
  },
  {
    email: 'doctor@tyv.vn',
    fullName: 'BS. Nguyễn Hoàng Nam',
    role: StaffRole.DOCTOR,
    clinicBranch: ClinicBranch.HANG_BONG,
  },
  {
    email: 'assistant@tyv.vn',
    fullName: 'Trợ lý Trần Thị Lan',
    role: StaffRole.ASSISTANT,
    clinicBranch: ClinicBranch.HANG_BONG,
  },
  {
    email: 'staff@tyv.vn',
    fullName: 'Nhân viên Lê Văn Hùng',
    role: StaffRole.STAFF,
    clinicBranch: ClinicBranch.CAU_GIAY,
  },
];

async function main() {
  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  for (const staff of STAFF_SEED) {
    await prisma.staff.upsert({
      where: { email: staff.email },
      create: {
        email: staff.email,
        passwordHash,
        fullName: staff.fullName,
        role: staff.role,
        clinicBranch: staff.clinicBranch,
        isActive: true,
      },
      update: {
        passwordHash,
        fullName: staff.fullName,
        role: staff.role,
        clinicBranch: staff.clinicBranch,
        isActive: true,
      },
    });
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
