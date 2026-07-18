import { isRangeCoveredByWorkShifts, rangesOverlap } from './staff-shift.rules';

describe('staff-shift.rules', () => {
  const d = (h: number, m = 0) =>
    new Date(`2026-07-16T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);

  it('rangesOverlap detects overlap', () => {
    expect(
      rangesOverlap({ startAt: d(9), endAt: d(10) }, { startAt: d(9, 30), endAt: d(11) }),
    ).toBe(true);
  });

  it('single WORK shift covers appointment', () => {
    const target = { startAt: d(9), endAt: d(9, 30) };
    const work = [{ startAt: d(8), endAt: d(12) }];
    expect(isRangeCoveredByWorkShifts(target, work)).toBe(true);
  });

  it('split shifts with lunch gap fails', () => {
    const target = { startAt: d(11, 30), endAt: d(13) };
    const work = [
      { startAt: d(8), endAt: d(12) },
      { startAt: d(13, 30), endAt: d(17, 30) },
    ];
    expect(isRangeCoveredByWorkShifts(target, work)).toBe(false);
  });

  it('split shifts without gap passes', () => {
    const target = { startAt: d(11), endAt: d(11, 30) };
    const work = [{ startAt: d(8), endAt: d(12) }];
    expect(isRangeCoveredByWorkShifts(target, work)).toBe(true);
  });
});
