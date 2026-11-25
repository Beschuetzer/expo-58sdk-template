import type {
  RelationshipMember,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { CURRENCY_CODES } from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import NewBudgetScreen from '../app/(tabs)/(requests)/NewBudgetScreen';

import { formatCurrencyInputAmount } from '@/utils/money';

const mockMember: RelationshipMember = {
  id: 'member-2',
  relationshipId: 'relationship-1',
  userId: 'user-2',
  displayName: 'Sam',
  role: 'member',
  active: true,
};
const mockRelationship: RelationshipSummary = {
  id: 'relationship-1',
  name: 'Shared space',
  shareCode: 'share-code',
  approvalPolicy: 'all_members',
  members: [mockMember],
  pendingJoinRequestCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const mockRouter = {
  dismissTo: jest.fn(),
  navigate: jest.fn(),
};
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string } | undefined;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1' },
};
const mockCreateMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
const mockRelationshipsQuery = {
  data: [mockRelationship] as RelationshipSummary[] | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockMembersQuery = {
  data: [mockMember] as RelationshipMember[] | undefined,
  error: null as Error | null,
  isLoading: false,
};
let mockSelectedRelationshipId: string | null = 'relationship-1';
let screen: ReactTestRenderer | undefined;

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));

jest.mock('@/components/ui/ThemeAwareCardSurface', () => ({
  ThemeAwareCardSurface: 'CardHost',
}));

jest.mock('@/components/ui/ThemeAwareDropdown', () => ({
  ThemeAwareDropdown: 'DropdownHost',
}));

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'InputHost',
}));

jest.mock('@/components/ui/ThemeAwareScreen', () => ({
  ThemeAwareScreen: 'ScreenHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareHeading: 'HeadingHost',
  ThemeAwareText: 'TextHost',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/budgets/hooks/useBudgets', () => ({
  useCreateBudgetMutation: () => mockCreateMutation,
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipMembersQuery: () => mockMembersQuery,
  useRelationshipsQuery: () => mockRelationshipsQuery,
}));

jest.mock(
  '@/features/relationships/components/RelationshipMemberSelector',
  () => ({
    RelationshipMemberSelector: 'MemberSelectorHost',
  }),
);

jest.mock('@/state/store', () => ({
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: 'en-US',
    t: (key: string) => key,
  }),
}));

function renderScreen() {
  act(() => {
    screen = renderer.create(<NewBudgetScreen />);
  });
}

function textChildren() {
  return screen!.root
    .findAll((instance) => String(instance.type) === 'TextHost')
    .map((instance) => instance.props.children);
}

function submitButton() {
  const screenHost = screen!.root.find(
    (instance) => String(instance.type) === 'ScreenHost',
  );
  return screenHost.props.bottomContent as React.ReactElement<{
    isDisabled: boolean;
    onPress: () => void;
  }>;
}

describe('NewBudgetScreen currency selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    screen = undefined;
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockSelectedRelationshipId = 'relationship-1';
    mockCreateMutation.error = null;
    mockCreateMutation.isPending = false;
    mockRelationshipsQuery.data = [mockRelationship];
    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.isLoading = false;
    mockMembersQuery.data = [mockMember];
    mockMembersQuery.error = null;
    mockMembersQuery.isLoading = false;
  });

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  });

  it('defaults to USD, lists all currencies, and submits the selected currency', () => {
    renderScreen();

    let dropdown = screen!.root.find(
      (instance) => String(instance.type) === 'DropdownHost',
    );
    expect(dropdown.props.selectedValue).toBe('USD');
    expect(dropdown.props.options).toHaveLength(CURRENCY_CODES.length);
    expect(
      dropdown.props.options.map((option: { value: string }) => option.value),
    ).toEqual(CURRENCY_CODES);
    expect(() => dropdown.props.onValueChange('ZZZ')).toThrow(
      'Unsupported budget currency selected: ZZZ.',
    );
    act(() => dropdown.props.onValueChange('JPY'));

    const inputs = screen!.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    const nameInput = inputs.find(
      (input) =>
        (
          input.props.inputFieldProps as {
            placeholder?: string;
          }
        ).placeholder === 'budgets.namePlaceholder',
    );
    const amountInput = inputs.find(
      (input) =>
        (
          input.props.inputFieldProps as {
            placeholder?: string;
          }
        ).placeholder === formatCurrencyInputAmount(0, 'JPY', 'en-US'),
    );
    expect(nameInput).toBeDefined();
    expect(amountInput).toBeDefined();
    expect(submitButton().props.isDisabled).toBe(true);
    act(() => nameInput!.props.onChangeText('Groceries'));
    act(() => amountInput!.props.onChangeText('200'));

    const memberSelector = screen!.root.find(
      (instance) => String(instance.type) === 'MemberSelectorHost',
    );
    expect(submitButton().props.isDisabled).toBe(true);
    act(() => memberSelector.props.onChange(['user-2']));
    const quarterlyButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'budgets.quarterly',
    );
    act(() => quarterlyButton.props.onPress());

    act(() => submitButton().props.onPress());

    dropdown = screen!.root.find(
      (instance) => String(instance.type) === 'DropdownHost',
    );
    expect(dropdown.props.selectedValue).toBe('JPY');
    expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Groceries',
        currency: 'JPY',
        amountMinorUnits: 200,
        period: 'quarterly',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const onSuccess = mockCreateMutation.mutate.mock.calls[0]![1]
      .onSuccess as (budget: { id: string }) => void;
    act(() => onSuccess({ id: 'budget-1' }));
    expect(mockRouter.dismissTo).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalled();
  });

  it('shows amount validation and prevents an invalid budget submission', () => {
    renderScreen();

    const inputs = screen!.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    act(() => inputs[0]!.props.onChangeText('Groceries'));
    act(() => inputs[1]!.props.onChangeText('invalid'));

    expect(textChildren()).toContain('budgets.amountInvalid');
    expect(submitButton().props.isDisabled).toBe(true);
    act(() => submitButton().props.onPress());
    expect(mockCreateMutation.mutate).not.toHaveBeenCalled();
  });

  it('handles authentication and relationship loading/error states', () => {
    mockAuth.isAuthenticated = false;
    renderScreen();
    expect(textChildren()).toContain('paymentRequests.signIn');
    act(() => screen?.unmount());
    screen = undefined;

    mockAuth.isAuthenticated = true;
    mockAuth.user = undefined;
    renderScreen();
    expect(textChildren()).toContain('auth.profileUnavailable');
    act(() => screen?.unmount());
    screen = undefined;

    mockAuth.user = { subject: 'user-1' };
    mockRelationshipsQuery.isLoading = true;
    renderScreen();
    expect(textChildren()).toContain('common.loading');
    act(() => screen?.unmount());
    screen = undefined;

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.error = new Error('Relationships unavailable');
    renderScreen();
    expect(textChildren()).toContain('Relationships unavailable');
  });

  it('handles missing relationships and member loading/error/empty states', () => {
    mockSelectedRelationshipId = 'missing-relationship';
    renderScreen();
    expect(textChildren()).toContain('budgets.noRelationship');
    act(() => screen?.unmount());
    screen = undefined;

    mockSelectedRelationshipId = 'relationship-1';
    mockRelationshipsQuery.data = undefined;
    renderScreen();
    expect(textChildren()).toContain('budgets.noRelationship');
    act(() => screen?.unmount());
    screen = undefined;

    mockRelationshipsQuery.data = [mockRelationship];
    mockSelectedRelationshipId = 'relationship-1';
    mockMembersQuery.isLoading = true;
    renderScreen();
    expect(textChildren()).toContain('common.loading');
    act(() => screen?.unmount());
    screen = undefined;

    mockMembersQuery.isLoading = false;
    mockMembersQuery.error = new Error('Members unavailable');
    renderScreen();
    expect(textChildren()).toContain('Members unavailable');
    act(() => screen?.unmount());
    screen = undefined;

    mockMembersQuery.error = null;
    mockMembersQuery.data = undefined;
    mockRelationshipsQuery.data = [{ ...mockRelationship, members: [] }];
    renderScreen();
    expect(textChildren()).toContain('budgets.noEligibleApprovers');
  });

  it('requires an eligible approver and shows mutation errors', () => {
    mockMembersQuery.data = [{ ...mockMember, userId: 'user-1' }];
    mockCreateMutation.error = new Error('Budget unavailable');
    renderScreen();

    const memberSelector = screen!.root.find(
      (instance) => String(instance.type) === 'MemberSelectorHost',
    );
    expect(memberSelector.props.emptyMessage).toBe(
      'budgets.noEligibleApprovers',
    );
    const inputs = screen!.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    act(() => inputs[0]!.props.onChangeText('Groceries'));
    act(() => inputs[1]!.props.onChangeText('200'));
    act(() => memberSelector.props.onChange(['user-2']));

    expect(textChildren()).toContain('Budget unavailable');
    expect(submitButton().props.isDisabled).toBe(true);
    act(() => submitButton().props.onPress());
    expect(mockCreateMutation.mutate).not.toHaveBeenCalled();
  });

  it('keeps submission disabled while a create request is pending', () => {
    mockCreateMutation.isPending = true;
    renderScreen();

    const inputs = screen!.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    act(() => inputs[0]!.props.onChangeText('Groceries'));
    act(() => inputs[1]!.props.onChangeText('200'));
    const memberSelector = screen!.root.find(
      (instance) => String(instance.type) === 'MemberSelectorHost',
    );
    act(() => memberSelector.props.onChange(['user-2']));

    expect(submitButton().props.isDisabled).toBe(true);
    act(() => submitButton().props.onPress());
    expect(mockCreateMutation.mutate).not.toHaveBeenCalled();
  });
});
