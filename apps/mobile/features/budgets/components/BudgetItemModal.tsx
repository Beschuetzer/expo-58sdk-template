import type { BudgetSummary } from '@expo-50sdk-template/shared-types';
import { startTransition, useOptimistic, useState } from 'react';
import type { ReactNode } from 'react';

import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { ThemeAwareTimePicker } from '@/components/ui/ThemeAwareTimePicker';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { VStack } from '@/components/ui/vstack';
import {
  formatLocalDateOnly,
  parseDateOnlyToLocalDate,
} from '@/features/budgets/dateUtils';
import { useCreateBudgetItemMutation } from '@/features/budgets/hooks/useBudgets';
import { useI18n } from '@/utils/i18n';
import {
  formatCurrencyInputAmount,
  formatCurrencyMinorUnits,
  parseAmountToMinorUnits,
} from '@/utils/money';

function FormField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
      {children}
    </VStack>
  );
}

export function BudgetItemModal({
  budget,
  onClose,
}: {
  budget: BudgetSummary;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const mutation = useCreateBudgetItemMutation(budget.relationshipId);
  const [optimisticRemainingMinorUnits, updateOptimisticRemaining] =
    useOptimistic(
      budget.amountRemainingMinorUnits,
      (remainingMinorUnits: number, amountMinorUnits: number) =>
        remainingMinorUnits - amountMinorUnits,
    );
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date());
  const amountMinorUnits = parseAmountToMinorUnits(amount, budget.currency);
  const dateValue = formatLocalDateOnly(date);
  const startDate = budget.periodStart.slice(0, 10);
  const endDate = budget.periodEnd.slice(0, 10);
  const isDateInBudget = dateValue >= startDate && dateValue <= endDate;
  const canSubmit =
    name.trim().length > 0 &&
    amountMinorUnits !== undefined &&
    isDateInBudget &&
    !mutation.isPending;

  function submit() {
    if (amountMinorUnits === undefined || !canSubmit) return;
    startTransition(async () => {
      updateOptimisticRemaining(amountMinorUnits);
      const succeeded = await mutation
        .mutateAsync({
          budgetId: budget.id,
          input: {
            name: name.trim(),
            amountMinorUnits,
            date: dateValue,
          },
        })
        .then(
          () => true,
          () => false,
        );
      if (succeeded) onClose();
    });
  }

  return (
    <ThemedModal
      cancelButton={{ text: t('budgets.cancel') }}
      confirmButton={{
        isEnabled: canSubmit,
        onPress: submit,
        text: t('budgets.addItem'),
      }}
      isVisible
      onClose={onClose}
      title={t('budgets.addItem')}
    >
      <VStack space="md">
        <FormField label={t('budgets.itemName')}>
          <ThemeAwareInput
            value={name}
            onChangeText={setName}
            inputFieldProps={{
              maxLength: 160,
              placeholder: t('budgets.itemNamePlaceholder'),
            }}
          />
        </FormField>
        <FormField label={t('budgets.itemAmount')}>
          <ThemeAwareInput
            value={amount}
            onChangeText={setAmount}
            inputFieldProps={{
              keyboardType: 'numeric',
              placeholder: formatCurrencyInputAmount(
                0,
                budget.currency,
                locale,
              ),
            }}
          />
          {amount && amountMinorUnits === undefined ? (
            <ThemeAwareText color="$error600" size="sm">
              {t('budgets.amountInvalid')}
            </ThemeAwareText>
          ) : null}
        </FormField>
        <FormField label={t('budgets.remaining')}>
          <ThemeAwareText fontWeight="$semibold">
            {formatCurrencyMinorUnits(
              optimisticRemainingMinorUnits,
              budget.currency,
              locale,
            )}
          </ThemeAwareText>
        </FormField>
        <FormField label={t('budgets.itemDate')}>
          <ThemeAwareTimePicker
            maximumDate={parseDateOnlyToLocalDate(budget.periodEnd)}
            minimumDate={parseDateOnlyToLocalDate(budget.periodStart)}
            mode="date"
            onChange={(_event, selectedDate) => {
              if (selectedDate) setDate(selectedDate);
            }}
            value={date}
          />
          {!isDateInBudget ? (
            <ThemeAwareText color="$error600" size="sm">
              {t('budgets.itemDateOutsideRange')}
            </ThemeAwareText>
          ) : null}
        </FormField>
        {mutation.error ? (
          <ThemeAwareText color="$error600">
            {mutation.error.message}
          </ThemeAwareText>
        ) : null}
      </VStack>
    </ThemedModal>
  );
}
