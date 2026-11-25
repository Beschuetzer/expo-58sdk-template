import {
  CURRENCY_CODES,
  isCurrencyCode,
} from '@expo-50sdk-template/shared-types';

import {
  formatBudgetAmountSummary,
  getBudgetCurrencyOptions,
} from './budgetFormatters';

import type { TranslationKey } from '@/utils/i18n';

const translate: (key: TranslationKey) => string = (key) =>
  key === 'budgets.remainingOfTotal' ? 'of' : 'remaining';

describe('budget currency formatting', () => {
  it('uses the selected currency symbol in the remaining summary', () => {
    expect(
      formatBudgetAmountSummary(
        {
          amountMinorUnits: 20_000,
          amountRemainingMinorUnits: 10_000,
          currency: 'USD',
        },
        'en-US',
        translate,
      ),
    ).toBe('$100.00 of $200.00 remaining');

    expect(
      formatBudgetAmountSummary(
        {
          amountMinorUnits: 20_000,
          amountRemainingMinorUnits: 10_000,
          currency: 'EUR',
        },
        'en-US',
        translate,
      ),
    ).toBe('100.00€ of 200.00€ remaining');

    expect(
      formatBudgetAmountSummary(
        {
          amountMinorUnits: 200,
          amountRemainingMinorUnits: 100,
          currency: 'JPY',
        },
        'en-US',
        translate,
      ),
    ).toBe('¥100 of ¥200 remaining');
  });

  it('defaults a missing legacy budget currency to dollars', () => {
    expect(
      formatBudgetAmountSummary(
        {
          amountMinorUnits: 20_000,
          amountRemainingMinorUnits: 10_000,
        },
        'en-US',
        translate,
      ),
    ).toBe('$100.00 of $200.00 remaining');
  });

  it('offers every supported currency and validates currency codes', () => {
    const options = getBudgetCurrencyOptions('en-US');

    expect(options.map(({ value }) => value)).toEqual(CURRENCY_CODES);
    expect(options.find(({ value }) => value === 'USD')?.label).toBe(
      'USD - US dollars',
    );
    expect(isCurrencyCode('JPY')).toBe(true);
    expect(isCurrencyCode('ZZZ')).toBe(false);
  });
});
