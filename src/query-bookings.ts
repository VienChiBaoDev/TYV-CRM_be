import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const bookings = await prisma.meetingBooking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log(JSON.stringify(bookings, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
