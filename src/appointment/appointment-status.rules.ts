import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

/** Mirror on FE: `appointments/constants/calendar.ts` — keep in sync. */
export const CHECK_IN_ALLOWED_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.CONFIRMED,
];

/** Chuyển trạng thái qua PATCH — CHECKED_IN chỉ qua check-in. */
export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  [AppointmentStatus.BOOKED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.BOOKED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.CHECKED_IN]: [AppointmentStatus.DONE],
  [AppointmentStatus.DONE]: [],
  [AppointmentStatus.NO_SHOW]: [],
  [AppointmentStatus.CANCELLED]: [],
};
// Hàm kiểm tra trạng thái chuyển đổi
// current: trạng thái hiện tại
// next: trạng thái chuyển đổi
// visitId: ID của lượt khám
// throw exception nếu không thể chuyển đổi
export function assertAppointmentStatusTransition(
  current: AppointmentStatus,
  next: AppointmentStatus,
  visitId: string | null,
): void {
  if (current === next) return;

  if (next === AppointmentStatus.CHECKED_IN) {
    throw new BadRequestException('Vui lòng dùng chức năng Tiếp nhận');
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new BadRequestException(`Không thể chuyển từ "${current}" sang "${next}"`);
  }

  if (
    visitId &&
    (next === AppointmentStatus.BOOKED ||
      next === AppointmentStatus.CONFIRMED ||
      next === AppointmentStatus.NO_SHOW)
  ) {
    throw new BadRequestException('Lịch đã tiếp nhận, không thể quay về trạng thái trước đó');
  }
}
