import type { BudgetSummary } from '@expo-50sdk-template/shared-types';
import { CURRENCY_CODES } from '@expo-50sdk-template/shared-types';

import type { TranslationKey } from '@/utils/i18n';
import {
  formatCurrencyMinorUnits,
  getCurrencyDisplayName,
} from '@/utils/money';

type BudgetAmounts = Pick<
  BudgetSummary,
  'amountMinorUnits' | 'amountRemainingMinorUnits'
> & {
  currency?: BudgetSummary['currency'] | null;
};

export function formatBudgetAmountSummary(
  budget: BudgetAmounts,
  locale: string,
  t: (key: TranslationKey) => string,
) {
  const remaining = formatCurrencyMinorUnits(
    budget.amountRemainingMinorUnits,
    budget.currency,
    locale,
  );
  const total = formatCurrencyMinorUnits(
    budget.amountMinorUnits,
    budget.currency,
    locale,
  );
  return `${remaining} ${t('budgets.remainingOfTotal')} ${total} ${t(
    'budgets.remainingInline',
  )}`;
}

export function getBudgetCurrencyOptions(locale: string) {
  return CURRENCY_CODES.map((value) => ({
    label: `${value} - ${getCurrencyDisplayName(value, locale)}`,
    value,
  }));
}
