import { isValidMeTimeRange } from './form';

describe('isValidMeTimeRange', () => {
  it('accepts a valid range', () => {
    expect(
      isValidMeTimeRange(
        new Date('2026-10-29T10:00:00.000Z'),
        new Date('2026-10-29T11:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('rejects equal, reversed, and invalid dates', () => {
    const startTime = new Date('2026-10-29T10:00:00.000Z');
    expect(isValidMeTimeRange(startTime, startTime)).toBe(false);
    expect(
      isValidMeTimeRange(new Date('2026-10-29T11:00:00.000Z'), startTime),
    ).toBe(false);
    expect(isValidMeTimeRange(new Date(Number.NaN), startTime)).toBe(false);
  });
});
