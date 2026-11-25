import type {
  BudgetItem,
  BudgetSummary,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { BudgetItemModal } from './BudgetItemModal';

import {
  formatCurrencyInputAmount,
  formatCurrencyMinorUnits,
} from '@/utils/money';

const mockMutateAsync = jest.fn(
  (_variables: {
    budgetId: string;
    input: { amountMinorUnits: number; date: string; name: string };
  }): Promise<BudgetItem> => Promise.resolve(budgetItem),
);
let mockMutationError: Error | null = null;
let mockMutationPending = false;

const budgetItem: BudgetItem = {
  id: 'item-1',
  budgetId: 'budget-1',
  name: 'Groceries',
  amountMinorUnits: 1_000,
  date: '2026-11-09',
  createdAt: '2026-11-09T12:00:00.000Z',
  createdByUserId: 'user-1',
};

const budget: BudgetSummary = {
  id: 'budget-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  name: 'Household',
  currency: 'USD',
  amountMinorUnits: 10_000,
  amountRemainingMinorUnits: 5_000,
  period: 'yearly',
  periodStart: '2020-01-01T00:00:00.000Z',
  periodEnd: '2099-12-31T23:59:59.999Z',
  status: 'approved',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const amountPlaceholder = formatCurrencyInputAmount(0, budget.currency, 'en');

jest.mock('@/components/ui/ThemeAwareInput', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareInput: (props: Record<string, unknown>) =>
      React.createElement('ThemeAwareInputHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareText: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareTextHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareTimePicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareTimePicker: (props: Record<string, unknown>) =>
      React.createElement('ThemeAwareTimePickerHost', props),
  };
});

jest.mock('@/components/ui/ThemedModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemedModal: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemedModalHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    VStack: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('VStackHost', props, children as React.ReactNode),
  };
});

jest.mock('@/features/budgets/hooks/useBudgets', () => ({
  useCreateBudgetItemMutation: () => ({
    error: mockMutationError,
    isPending: mockMutationPending,
    mutateAsync: mockMutateAsync,
  }),
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string) => key,
  }),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('BudgetItemModal optimistic remaining balance', () => {
  let modal: ReactTestRenderer | undefined;
  let onClose: jest.Mock;

  beforeEach(() => {
    onClose = jest.fn();
    mockMutationError = null;
    mockMutationPending = false;
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue(budgetItem);
  });

  afterEach(() => {
    if (modal) {
      act(() => modal?.unmount());
      modal = undefined;
    }
    jest.clearAllMocks();
  });

  function mountModal() {
    act(() => {
      modal = renderer.create(
        <BudgetItemModal budget={budget} onClose={onClose} />,
      );
    });
  }

  function updateInput(placeholder: string, value: string) {
    const input = modal!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareInputHost' &&
        (
          instance.props.inputFieldProps as {
            placeholder?: string;
          }
        ).placeholder === placeholder,
    );
    const onChangeText = input.props.onChangeText as (
      inputValue: string,
    ) => void;
    act(() => onChangeText(value));
  }

  function submit() {
    const modalHost = modal!.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    const confirmButton = modalHost.props.confirmButton as {
      onPress: () => void;
    };
    act(() => confirmButton.onPress());
  }

  function renderedTexts() {
    return modal!.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((instance) => instance.props.children);
  }

  function fillForm() {
    updateInput('budgets.itemNamePlaceholder', 'Groceries');
    updateInput(amountPlaceholder, '10');
  }

  it('uses a numeric keyboard without number controls for the item amount', () => {
    mountModal();

    const amountInput = modal!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareInputHost' &&
        (
          instance.props.inputFieldProps as {
            placeholder?: string;
          }
        ).placeholder === amountPlaceholder,
    );

    expect(amountInput.props.inputType).toBeUndefined();
    expect(amountInput.props.inputFieldProps).toEqual(
      expect.objectContaining({ keyboardType: 'numeric' }),
    );
  });

  it('rejects invalid amounts and dates outside the budget period', () => {
    mountModal();
    updateInput(amountPlaceholder, 'invalid');
    expect(renderedTexts()).toContain('budgets.amountInvalid');

    const timePicker = modal!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    );
    act(() =>
      timePicker.props.onChange({}, new Date('2200-01-01T12:00:00.000Z')),
    );
    expect(renderedTexts()).toContain('budgets.itemDateOutsideRange');
  });

  it('updates the date only when the picker returns a selection', () => {
    mountModal();
    const initialDate = modal!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    ).props.value as Date;
    let timePicker = modal!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    );
    act(() => timePicker.props.onChange({}, undefined));
    timePicker = modal!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    );
    expect(timePicker.props.value).toEqual(initialDate);

    const selectedDate = new Date('2026-11-10T12:00:00.000Z');
    act(() => timePicker.props.onChange({}, selectedDate));
    timePicker = modal!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    );
    expect(timePicker.props.value).toEqual(selectedDate);
  });

  it('disables submission while adding an item is pending', () => {
    mockMutationPending = true;
    mountModal();
    fillForm();

    const modalHost = modal!.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(
      (modalHost.props.confirmButton as { isEnabled: boolean }).isEnabled,
    ).toBe(false);
    submit();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('updates the displayed remaining balance while the item request is pending', async () => {
    const pendingMutation = createDeferred<BudgetItem>();
    mockMutateAsync.mockReturnValue(pendingMutation.promise);
    mountModal();
    fillForm();

    await act(async () => {
      submit();
      await Promise.resolve();
    });

    expect(renderedTexts()).toContain(
      formatCurrencyMinorUnits(4_000, budget.currency, 'en'),
    );
    expect(mockMutateAsync).toHaveBeenCalledWith({
      budgetId: budget.id,
      input: expect.objectContaining({
        name: 'Groceries',
        amountMinorUnits: 1_000,
      }),
    });

    await act(async () => {
      pendingMutation.resolve(budgetItem);
      await pendingMutation.promise;
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rolls back the displayed balance when adding an item fails', async () => {
    const pendingMutation = createDeferred<BudgetItem>();
    const error = new Error('Unable to add budget item');
    mockMutateAsync.mockReturnValue(pendingMutation.promise);
    mountModal();
    fillForm();

    await act(async () => {
      submit();
      await Promise.resolve();
    });
    expect(renderedTexts()).toContain(
      formatCurrencyMinorUnits(4_000, budget.currency, 'en'),
    );

    mockMutationError = error;
    await act(async () => {
      pendingMutation.reject(error);
      await pendingMutation.promise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(renderedTexts()).toContain(
      formatCurrencyMinorUnits(5_000, budget.currency, 'en'),
    );
    expect(renderedTexts()).toContain(error.message);
    expect(onClose).not.toHaveBeenCalled();
  });
});
