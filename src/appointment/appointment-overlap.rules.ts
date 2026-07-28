import { AppointmentStatus } from '@prisma/client';

/**
 * Trạng thái lịch hẹn vẫn chiếm slot bác sĩ/trợ lý.
 * CANCELLED không chiếm slot — có thể đặt trùng khung giờ đó.
 */
export const BLOCKING_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.DONE,
  AppointmentStatus.NO_SHOW,
];
