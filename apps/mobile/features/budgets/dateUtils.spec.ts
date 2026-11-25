import {
  formatBudgetDate,
  formatBudgetDateRange,
  formatLocalDateOnly,
  getBudgetPeriodLabel,
  getBudgetPeriodRange,
  isBudgetActive,
  parseDateOnlyToLocalDate,
} from './dateUtils';

describe('budget date utilities', () => {
  it('labels and calculates monthly, quarterly, and yearly periods', () => {
    const date = new Date('2026-11-15T12:00:00.000Z');

    expect(getBudgetPeriodLabel('monthly')).toBe('budgets.monthly');
    expect(getBudgetPeriodLabel('quarterly')).toBe('budgets.quarterly');
    expect(getBudgetPeriodLabel('yearly')).toBe('budgets.yearly');
    expect(getBudgetPeriodRange('monthly', date)).toEqual({
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
    });
    expect(getBudgetPeriodRange('quarterly', date)).toEqual({
      periodStart: '2026-10-01',
      periodEnd: '2026-12-31',
    });
    expect(getBudgetPeriodRange('yearly', date)).toEqual({
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
    });
  });

  it('uses the current date when period and activity dates are omitted', () => {
    const currentPeriod = getBudgetPeriodRange('monthly');

    expect(currentPeriod.periodStart).toMatch(/^\d{4}-\d{2}-01$/);
    expect(currentPeriod.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      isBudgetActive({
        periodStart: '0001-01-01',
        periodEnd: '9999-12-31',
      }),
    ).toBe(true);
  });

  it('parses valid local dates and rejects invalid calendar dates', () => {
    const expectedDate = new Date(2026, 2, 8);

    expect(formatLocalDateOnly(expectedDate)).toBe('2026-03-08');
    expect(parseDateOnlyToLocalDate('2026-03-08T12:00:00.000Z')).toEqual(
      expectedDate,
    );
    expect(parseDateOnlyToLocalDate('2026-02-30')).toBeUndefined();
    expect(parseDateOnlyToLocalDate('not-a-date')).toBeUndefined();
  });

  it('formats valid dates and preserves values that cannot be parsed', () => {
    const formattedDate = formatBudgetDate('2026-03-08', 'en');

    expect(formattedDate).not.toBe('2026-03-08');
    expect(formattedDate).toContain('2026');
    expect(formatBudgetDate('not-a-date', 'en')).toBe('not-a-date');
    expect(formatBudgetDateRange('not-a-date', 'also-invalid', 'en')).toBe(
      'not-a-date - also-invalid',
    );
  });

  it('treats the first and last day as active budget dates', () => {
    const budget = {
      periodStart: '2026-10-01T00:00:00.000Z',
      periodEnd: '2026-10-31T23:59:59.999Z',
    };

    expect(isBudgetActive(budget, new Date('2026-09-30T23:59:59.999Z'))).toBe(
      false,
    );
    expect(isBudgetActive(budget, new Date('2026-10-01T00:00:00.000Z'))).toBe(
      true,
    );
    expect(isBudgetActive(budget, new Date('2026-10-31T23:59:59.999Z'))).toBe(
      true,
    );
    expect(isBudgetActive(budget, new Date('2026-11-01T00:00:00.000Z'))).toBe(
      false,
    );
  });
});
