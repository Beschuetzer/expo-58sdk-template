import {
  CURRENCY_SYMBOLS,
  CURRENCY_SYMBOLS_AFTER_AMOUNT,
  isCurrencyCode,
} from '@expo-50sdk-template/shared-types';
import type { CurrencyCode } from '@expo-50sdk-template/shared-types';

function normalizeCurrencyCode(
  currency: CurrencyCode | null | undefined,
): CurrencyCode {
  if (currency === null || currency === undefined) {
    return 'USD';
  }
  if (!isCurrencyCode(currency)) {
    throw new Error(`Unsupported currency code: ${currency}.`);
  }
  return currency;
}

export function getCurrencyFractionDigits(
  currency: CurrencyCode | null | undefined,
): number {
  const currencyCode = normalizeCurrencyCode(currency);
  const fractionDigits = new Intl.NumberFormat('en-US', {
    currency: currencyCode,
    style: 'currency',
  }).resolvedOptions().maximumFractionDigits;
  if (fractionDigits === undefined) {
    throw new Error(`Unable to determine ${currencyCode} currency precision.`);
  }
  return fractionDigits;
}

function toMajorUnits(amountMinorUnits: number, currency: CurrencyCode) {
  return amountMinorUnits / 10 ** getCurrencyFractionDigits(currency);
}

export function parseAmountToMinorUnits(
  value: string,
  currency: CurrencyCode = 'USD',
): number | undefined {
  const normalized = value.trim().replace(',', '.');
  const fractionDigits = getCurrencyFractionDigits(currency);
  const decimalPart =
    fractionDigits === 0 ? '' : `(?:\\.\\d{1,${fractionDigits}})?`;
  if (!new RegExp(`^\\d+${decimalPart}$`).test(normalized)) {
    return undefined;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  return Math.round(amount * 10 ** fractionDigits);
}

export function formatMinorUnits(
  amountMinorUnits: number,
  currency: CurrencyCode = 'USD',
): string {
  const fractionDigits = getCurrencyFractionDigits(currency);
  return toMajorUnits(amountMinorUnits, currency).toFixed(fractionDigits);
}

export function formatCurrencyInputAmount(
  amountMinorUnits: number,
  currency: CurrencyCode,
  locale: string,
): string {
  const fractionDigits = getCurrencyFractionDigits(currency);
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    useGrouping: false,
  }).format(toMajorUnits(amountMinorUnits, currency));
}

export function formatCurrencyMinorUnits(
  amountMinorUnits: number,
  currency: CurrencyCode | null | undefined,
  locale: string,
): string {
  const currencyCode = normalizeCurrencyCode(currency);
  const fractionDigits = getCurrencyFractionDigits(currencyCode);
  const amountParts = new Intl.NumberFormat(locale, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).formatToParts(toMajorUnits(amountMinorUnits, currencyCode));
  const amountStartIndex = amountParts.findIndex(
    (part) =>
      part.type === 'integer' ||
      part.type === 'infinity' ||
      part.type === 'nan',
  );
  const amountPrefix = amountParts
    .slice(0, amountStartIndex)
    .map((part) => part.value)
    .join('');
  const amount = amountParts
    .slice(amountStartIndex)
    .map((part) => part.value)
    .join('');
  const symbol = CURRENCY_SYMBOLS[currencyCode];

  return CURRENCY_SYMBOLS_AFTER_AMOUNT.has(currencyCode)
    ? `${amountPrefix}${amount}${symbol}`
    : `${amountPrefix}${symbol}${amount}`;
}

export function formatCurrencyAmountParts(
  amountMinorUnits: number,
  currency: CurrencyCode | null | undefined,
  locale: string,
): { amount: string; currencyName: string } {
  const currencyCode = normalizeCurrencyCode(currency);
  const parts = new Intl.NumberFormat(locale, {
    currency: currencyCode,
    currencyDisplay: 'name',
    style: 'currency',
  }).formatToParts(toMajorUnits(amountMinorUnits, currencyCode));
  const currencyPart = parts.find((part) => part.type === 'currency');
  if (!currencyPart) {
    throw new Error(`Unable to format the ${currencyCode} currency name.`);
  }
  return {
    amount: parts
      .filter((part) => part.type !== 'currency' && part.type !== 'literal')
      .map((part) => part.value)
      .join(''),
    currencyName: currencyPart.value,
  };
}

export function getCurrencyDisplayName(
  currency: CurrencyCode,
  locale: string,
): string {
  return formatCurrencyAmountParts(0, currency, locale).currencyName;
}
