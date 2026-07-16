import { StaffShiftType } from '@prisma/client';

export interface TimeRange {
  startAt: Date;
  endAt: Date;
}
/**
 * Kiểm tra xem thời gian kết thúc có lớn hơn thời gian bắt đầu không.
 */
export function assertValidTimeRange(startAt: Date, endAt: Date): void {
  if (endAt <= startAt) {
    throw new Error('INVALID_TIME_RANGE');
  }
}

/** Hai khoảng [start, end) chồng nhau. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

/**
 * Kiểm tra xem có cần kiểm tra tính chồng lấn khi loại ca là WORK không.
 */
export function shouldCheckWorkOverlap(type: StaffShiftType): boolean {
  return type === StaffShiftType.WORK;
}
