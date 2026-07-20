import { AppointmentStatus } from '@prisma/client';
import { BLOCKING_APPOINTMENT_STATUSES } from './appointment-overlap.rules';

describe('appointment-overlap.rules', () => {
  it('CANCELLED không nằm trong danh sách blocking', () => {
    expect(BLOCKING_APPOINTMENT_STATUSES).not.toContain(AppointmentStatus.CANCELLED);
  });

  it('BOOKED và CONFIRMED đều blocking', () => {
    expect(BLOCKING_APPOINTMENT_STATUSES).toContain(AppointmentStatus.BOOKED);
    expect(BLOCKING_APPOINTMENT_STATUSES).toContain(AppointmentStatus.CONFIRMED);
  });
});
