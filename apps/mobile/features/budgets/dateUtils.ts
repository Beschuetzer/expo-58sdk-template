import type {
  BudgetPeriod,
  BudgetSummary,
} from '@expo-50sdk-template/shared-types';

import type { Locale, TranslationKey } from '@/utils/i18n';

export function getBudgetPeriodLabel(period: BudgetPeriod): TranslationKey {
  switch (period) {
    case 'monthly':
      return 'budgets.monthly';
    case 'quarterly':
      return 'budgets.quarterly';
    case 'yearly':
      return 'budgets.yearly';
  }
}

function formatUtcDateOnly(date: Date) {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalDateOnly(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnlyToLocalDate(value: string) {
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    !Number.isFinite(date.getTime()) ||
    formatLocalDateOnly(date) !== dateOnly
  ) {
    return undefined;
  }
  return date;
}

export function getBudgetPeriodRange(period: BudgetPeriod, date = new Date()) {
  const month = date.getUTCMonth();
  const monthCount = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
  const firstMonth =
    period === 'yearly'
      ? 0
      : period === 'quarterly'
        ? Math.floor(month / monthCount) * monthCount
        : month;
  const year = date.getUTCFullYear();

  return {
    periodStart: formatUtcDateOnly(new Date(Date.UTC(year, firstMonth, 1))),
    periodEnd: formatUtcDateOnly(
      new Date(Date.UTC(year, firstMonth + monthCount, 0)),
    ),
  };
}

export function formatBudgetDate(value: string, locale: Locale) {
  const date = parseDateOnlyToLocalDate(value);
  return date
    ? date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : value;
}

export function formatBudgetDateRange(
  periodStart: string,
  periodEnd: string,
  locale: Locale,
) {
  return `${formatBudgetDate(periodStart, locale)} - ${formatBudgetDate(periodEnd, locale)}`;
}

export function isBudgetActive(
  budget: Pick<BudgetSummary, 'periodStart' | 'periodEnd'>,
  date = new Date(),
) {
  const currentDate = formatUtcDateOnly(date);
  return (
    currentDate >= budget.periodStart.slice(0, 10) &&
    currentDate <= budget.periodEnd.slice(0, 10)
  );
}
