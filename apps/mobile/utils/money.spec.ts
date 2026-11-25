import type { CurrencyCode } from '@expo-50sdk-template/shared-types';

import {
  formatCurrencyAmountParts,
  formatCurrencyInputAmount,
  formatCurrencyMinorUnits,
  formatMinorUnits,
  getCurrencyFractionDigits,
  parseAmountToMinorUnits,
} from './money';

describe('currency-aware money formatting', () => {
  it('uses each currency minor-unit precision when parsing amounts', () => {
    expect(parseAmountToMinorUnits('12.34')).toBe(1_234);
    expect(parseAmountToMinorUnits('12,34', 'EUR')).toBe(1_234);
    expect(parseAmountToMinorUnits('12', 'JPY')).toBe(12);
    expect(parseAmountToMinorUnits('12.345', 'KWD')).toBe(12_345);
    expect(parseAmountToMinorUnits('12.34', 'JPY')).toBeUndefined();
    expect(parseAmountToMinorUnits('12.3456', 'KWD')).toBeUndefined();
    expect(parseAmountToMinorUnits('0', 'USD')).toBeUndefined();
    expect(parseAmountToMinorUnits('9'.repeat(400), 'USD')).toBeUndefined();
  });

  it('formats raw minor units using currency-specific precision', () => {
    expect(getCurrencyFractionDigits('USD')).toBe(2);
    expect(getCurrencyFractionDigits('JPY')).toBe(0);
    expect(getCurrencyFractionDigits('KWD')).toBe(3);
    expect(formatMinorUnits(1_234)).toBe('12.34');
    expect(formatMinorUnits(12, 'JPY')).toBe('12');
    expect(formatMinorUnits(12_345, 'KWD')).toBe('12.345');
    expect(formatCurrencyInputAmount(0, 'JPY', 'en-US')).toBe('0');
    expect(formatCurrencyInputAmount(12_345, 'KWD', 'en-US')).toBe('12.345');
  });

  it('formats currency symbols and spelled-out currency names', () => {
    expect(formatCurrencyMinorUnits(1_234, 'USD', 'en-US')).toBe('$12.34');
    expect(formatCurrencyMinorUnits(1_234, 'EUR', 'en-US')).toBe('12.34€');
    expect(formatCurrencyMinorUnits(12, 'JPY', 'en-US')).toBe('¥12');
    expect(formatCurrencyMinorUnits(-1_234, 'USD', 'en-US')).toBe('-$12.34');
    expect(formatCurrencyMinorUnits(-1_234, 'EUR', 'en-US')).toBe('-12.34€');
    expect(formatCurrencyAmountParts(1_234, 'USD', 'en-US')).toEqual({
      amount: '12.34',
      currencyName: 'US dollars',
    });
  });

  it('defaults legacy budgets without a currency to USD', () => {
    expect(getCurrencyFractionDigits(undefined)).toBe(2);
    expect(getCurrencyFractionDigits(null)).toBe(2);
    expect(formatCurrencyMinorUnits(100, undefined, 'en-US')).toBe('$1.00');
    expect(formatCurrencyAmountParts(100, null, 'en-US')).toEqual({
      amount: '1.00',
      currencyName: 'US dollars',
    });
  });

  it('rejects unsupported currency codes before formatting', () => {
    expect(() => getCurrencyFractionDigits('ZZZ' as CurrencyCode)).toThrow(
      'Unsupported currency code: ZZZ.',
    );
  });
});
