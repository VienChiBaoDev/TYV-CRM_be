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

/**
 * Toàn bộ khoảng target có nằm trong hợp các ca WORK chồng/overlap không?
 * Hỗ trợ ca sáng + ca chiều; fail nếu có gap (vd: nghỉ trưa 12:00–13:30).
 */
export function isRangeCoveredByWorkShifts(target: TimeRange, workShifts: TimeRange[]): boolean {
  const overlapping = workShifts
    .filter((shift) => rangesOverlap(target, shift))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  let cursor = target.startAt;

  for (const shift of overlapping) {
    if (shift.startAt > cursor) {
      return false; // gap
    }
    if (shift.endAt > cursor) {
      cursor = shift.endAt;
    }
    if (cursor >= target.endAt) {
      return true;
    }
  }

  return cursor >= target.endAt;
}
