import type {
  Budget,
  BudgetItem,
  RelationshipMember,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import BudgetDetailsScreen from '../app/(tabs)/(requests)/budget/[id]';

import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';

const mockAuth: {
  isAuthenticated: boolean;
  user?: { subject?: string };
} = {
  isAuthenticated: true,
  user: { subject: 'user-2' },
};
let mockRouteParams: {
  id?: string | string[];
  detailNavigationSource?: string | string[];
} = { id: 'budget-1' };
const mockRouterDismissTo = jest.fn();
const mockBudget: Budget = {
  id: 'budget-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  name: 'Shared groceries',
  currency: 'USD',
  amountMinorUnits: 50000,
  amountRemainingMinorUnits: 40000,
  period: 'monthly',
  periodStart: '2026-10-01T00:00:00.000Z',
  periodEnd: '2026-10-31T23:59:59.999Z',
  status: 'pending_approval',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  approvals: [{ memberUserId: 'user-2' }],
  items: [],
};
const budgetItemSearchFixtures: BudgetItem[] = [
  {
    id: 'item-market',
    budgetId: 'budget-1',
    name: 'Market',
    amountMinorUnits: 1250,
    date: '2026-10-12T00:00:00.000Z',
    createdAt: '2026-10-12T00:00:00.000Z',
    createdByUserId: 'user-1',
  },
  {
    id: 'item-transit',
    budgetId: 'budget-1',
    name: 'Transit',
    amountMinorUnits: 2500,
    date: '2026-10-10T00:00:00.000Z',
    createdAt: '2026-10-10T00:00:00.000Z',
    createdByUserId: 'user-1',
  },
];
const mockBudgetQuery = {
  data: mockBudget as Budget | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockMembers: RelationshipMember[] = [
  {
    id: 'member-1',
    relationshipId: 'relationship-1',
    userId: 'user-1',
    displayName: 'Alex',
    role: 'owner',
    active: true,
  },
  {
    id: 'member-2',
    relationshipId: 'relationship-1',
    userId: 'user-2',
    displayName: 'Sam',
    role: 'member',
    active: true,
  },
];
const mockMembersQuery = {
  data: mockMembers as RelationshipMember[] | undefined,
  error: null as Error | null,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};
const mockApproveMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
const mockDeleteMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
const mockUpdateMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
let screen: ReactTestRenderer | undefined;

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useLocalSearchParams: () => mockRouteParams,
    useRouter: () => ({ dismissTo: mockRouterDismissTo }),
  };
});

jest.mock('react-native', () => ({
  Keyboard: {
    addListener: jest.fn(),
  },
  TouchableOpacity: 'TouchableOpacityHost',
  useColorScheme: () => 'light',
  View: 'ViewHost',
}));

jest.mock('@/components/ui/EntityDeleteButton', () => ({
  EntityDeleteButton: 'EntityDeleteButtonHost',
}));

jest.mock('@/components/ui/ThemeAwareCollapsible', () => ({
  ThemeAwareCollapsible: 'ThemeAwareCollapsibleHost',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
}));

jest.mock('@/components/ui/ThemeAwareBadge', () => ({
  ThemeAwareBadge: 'ThemeAwareBadgeHost',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ThemeAwareButtonHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'ThemeAwareInputHost',
}));

jest.mock('@/components/ui/ThemeAwareDropdown', () => ({
  ThemeAwareDropdown: 'ThemeAwareDropdownHost',
}));

jest.mock('@/components/ui/ThemeAwareTimePicker', () => ({
  ThemeAwareTimePicker: 'ThemeAwareTimePickerHost',
}));

jest.mock('@/components/ui/ThemedModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemedModal: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ThemedModalHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({
      bottomContent,
      children,
      ...props
    }: {
      bottomContent?: React.ReactNode;
      children?: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        'ThemeAwareScreenHost',
        props,
        children,
        bottomContent,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'ThemeAwareSkeletonHost',
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'ThemeAwareSurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareHeading: 'ThemeAwareHeadingHost',
  ThemeAwareText: 'ThemeAwareTextHost',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/icon', () => ({
  AddIcon: 'AddIconHost',
  ChevronsUpDownIcon: 'ChevronsUpDownIconHost',
  ChevronDownIcon: 'ChevronDownIconHost',
  ChevronUpIcon: 'ChevronUpIconHost',
  FilterIcon: 'FilterIconHost',
  Icon: 'IconHost',
  SearchIcon: 'SearchIconHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: 'light',
    getTextColor: () => 'theme-text',
    textColor: 'theme-text',
  }),
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/budgets/components/BudgetItemModal', () => ({
  BudgetItemModal: 'BudgetItemModalHost',
}));

jest.mock('@/features/budgets/hooks/useBudgets', () => ({
  useApproveBudgetMutation: () => mockApproveMutation,
  useBudgetQuery: () => mockBudgetQuery,
  useDeleteBudgetMutation: () => mockDeleteMutation,
  useUpdateBudgetMutation: () => mockUpdateMutation,
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipMembersQuery: () => mockMembersQuery,
}));

jest.mock(
  '@/features/relationships/components/RelationshipMemberSelector',
  () => ({
    RelationshipMemberSelector: 'RelationshipMemberSelectorHost',
  }),
);

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string) => key,
  }),
}));

describe('BudgetDetailsScreen', () => {
  beforeEach(() => {
    mockRouteParams = { id: 'budget-1' };
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-2' };
    mockBudgetQuery.data = mockBudget;
    mockBudgetQuery.error = null;
    mockBudgetQuery.isLoading = false;
    mockMembersQuery.data = mockMembers;
    mockMembersQuery.error = null;
    mockMembersQuery.isFetching = false;
    mockMembersQuery.isLoading = false;
    mockMembersQuery.refetch.mockReset();
    mockApproveMutation.error = null;
    mockApproveMutation.isPending = false;
    mockApproveMutation.mutate.mockReset();
    mockDeleteMutation.error = null;
    mockDeleteMutation.isPending = false;
    mockDeleteMutation.mutate.mockReset();
    mockUpdateMutation.error = null;
    mockUpdateMutation.isPending = false;
    mockUpdateMutation.mutate.mockReset();
    mockRouterDismissTo.mockReset();
  });

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  });

  it('shows a one-line remaining summary and an unlabeled budget period', () => {
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    const summary = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareTextHost' &&
        instance.props.children ===
          '$400.00 budgets.remainingOfTotal $500.00 budgets.remainingInline',
    );
    expect(summary.props.numberOfLines).toBe(1);
    expect(summary.props.adjustsFontSizeToFit).toBe(true);

    const textChildren = screen!.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((text) => text.props.children);
    expect(textChildren).toContain(
      'budgets.monthly | Oct 1, 2026 - Oct 31, 2026',
    );
    expect(textChildren).not.toContain('budgets.period');
  });

  it('shows approval as pending without changing the budget status', () => {
    mockApproveMutation.isPending = true;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).toContain('budgets.approvalPending');
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareBadgeHost')
        .map((badge) => badge.props.children),
    ).toContain('budgets.pendingApproval');
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'budgets.approve',
      ).props.isDisabled,
    ).toBe(true);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.accessibilityLabel ===
            'budgets.addItem Shared groceries',
      ),
    ).toHaveLength(0);
    expect(
      (
        screen!.root.find(
          (instance) => String(instance.type) === 'StackScreenHost',
        ).props.options as { headerRight?: () => React.ReactNode }
      ).headerRight,
    ).toBeUndefined();
  });

  it('adds an item from an active approved budget', () => {
    mockAuth.user = { subject: 'user-1' };
    const activeBudget: Budget = {
      ...mockBudget,
      createdByUserId: 'user-1',
      periodStart: '2000-01-01T00:00:00.000Z',
      periodEnd: '2999-12-31T23:59:59.999Z',
      status: 'approved',
    };
    mockBudgetQuery.data = activeBudget;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    const addItemButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.accessibilityLabel ===
          `budgets.addItem ${activeBudget.name}`,
    );
    expect(
      addItemButton.find((instance) => String(instance.type) === 'IconHost')
        .props.as,
    ).toBe('AddIconHost');
    act(() => addItemButton.props.onPress());

    const modal = screen!.root.find(
      (instance) => String(instance.type) === 'BudgetItemModalHost',
    );
    expect(modal.props.budget).toEqual(activeBudget);
    act(() => modal.props.onClose());
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'BudgetItemModalHost',
      ),
    ).toHaveLength(0);
  });

  it('adds an item from the top-right header action', () => {
    mockAuth.user = { subject: 'user-1' };
    const activeBudget: Budget = {
      ...mockBudget,
      createdByUserId: 'user-1',
      periodStart: '2000-01-01T00:00:00.000Z',
      periodEnd: '2999-12-31T23:59:59.999Z',
      status: 'approved',
    };
    mockBudgetQuery.data = activeBudget;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    const options = screen!.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    ).props.options as {
      headerRight: () => React.ReactElement;
    };
    const headerButton = options.headerRight() as React.ReactElement<{
      accessibilityLabel: string;
      onPress: () => void;
      children: React.ReactElement<{ name: string }>;
    }>;
    expect(headerButton.props.accessibilityLabel).toBe(
      `budgets.addItem ${activeBudget.name}`,
    );
    expect(headerButton.props.children.props.name).toBe('plus');
    act(() => headerButton.props.onPress());

    const modal = screen!.root.find(
      (instance) => String(instance.type) === 'BudgetItemModalHost',
    );
    expect(modal.props.budget).toEqual(activeBudget);
    act(() => modal.props.onClose());
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'BudgetItemModalHost',
      ),
    ).toHaveLength(0);
  });

  it('passes the budget collection into the detail swipe navigator', () => {
    mockRouteParams = {
      id: 'budget-1',
      detailNavigationSource: DetailNavigationSources.budgets,
    };
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'DetailSwipeNavigatorHost',
      ).props,
    ).toEqual(
      expect.objectContaining({
        itemId: 'budget-1',
        source: DetailNavigationSources.budgets,
      }),
    );
  });

  it('shows authentication, profile, route, and query states', () => {
    mockAuth.isAuthenticated = false;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    expect(textChildren()).toContain('paymentRequests.signIn');
    unmountScreen();

    mockAuth.isAuthenticated = true;
    mockAuth.user = undefined;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    expect(textChildren()).toContain('auth.profileUnavailable');
    unmountScreen();

    mockAuth.user = { subject: 'user-2' };
    mockRouteParams = {};
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    expect(textChildren()).toContain('budgets.notFound');
    unmountScreen();

    mockRouteParams = { id: 'budget-1' };
    mockBudgetQuery.data = undefined;
    mockBudgetQuery.isLoading = true;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    expect(textChildren()).toContain('common.loading');
    unmountScreen();

    mockBudgetQuery.isLoading = false;
    mockBudgetQuery.error = new Error('budget unavailable');
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    expect(textChildren()).toContain('budget unavailable');
    unmountScreen();

    mockBudgetQuery.error = null;
    mockBudgetQuery.data = mockBudget;
    mockMembersQuery.data = undefined;
    mockMembersQuery.isLoading = true;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    expect(textChildren()).toContain('budgets.status');
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareSkeletonHost',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockMembersQuery.isLoading = false;
    mockMembersQuery.error = new Error('members unavailable');
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    expect(textChildren()).toContain('members unavailable');
    expect(textChildren()).toContain('budgets.status');
    act(() => button('paymentRequests.retry').props.onPress());
    expect(mockMembersQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('disables budget editing until member metadata is available', () => {
    mockAuth.user = { subject: 'user-1' };
    mockMembersQuery.data = undefined;
    mockMembersQuery.isLoading = true;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    expect(button('budgets.edit').props.isDisabled).toBe(true);
  });

  it('validates and saves budget edits for the creator', () => {
    mockAuth.user = { subject: 'user-1' };
    mockBudgetQuery.data = {
      ...mockBudget,
      createdByUserId: 'user-1',
    };
    mockUpdateMutation.isPending = true;
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    act(() => button('budgets.edit').props.onPress());

    expect(button('budgets.saveChanges').props.isDisabled).toBe(true);
    mockUpdateMutation.isPending = false;

    const [nameInput, amountInput] = screen!.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareInputHost',
    );
    act(() => nameInput.props.onChangeText('   '));
    expect(button('budgets.saveChanges').props.isDisabled).toBe(true);

    act(() => nameInput.props.onChangeText('  Updated groceries  '));
    act(() => amountInput.props.onChangeText('not an amount'));
    expect(textChildren()).toContain('budgets.amountInvalid');
    expect(button('budgets.saveChanges').props.isDisabled).toBe(true);

    act(() => amountInput.props.onChangeText('123.45'));
    act(() => button('budgets.quarterly').props.onPress());
    const memberSelector = screen!.root.find(
      (instance) => String(instance.type) === 'RelationshipMemberSelectorHost',
    );
    act(() => memberSelector.props.onChange([]));
    expect(button('budgets.saveChanges').props.isDisabled).toBe(true);

    act(() => memberSelector.props.onChange(['user-2']));
    expect(button('budgets.saveChanges').props.isDisabled).toBe(false);
    act(() => button('budgets.saveChanges').props.onPress());

    expect(mockUpdateMutation.mutate).toHaveBeenCalledWith(
      {
        budgetId: 'budget-1',
        input: {
          name: 'Updated groceries',
          amountMinorUnits: 12345,
          period: 'quarterly',
          requiredApproverUserIds: ['user-2'],
        },
      },
      { onSuccess: expect.any(Function) },
    );

    const onSaved = mockUpdateMutation.mutate.mock.calls[0][1].onSuccess;
    act(() => onSaved());
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'budgets.saveChanges',
      ),
    ).toHaveLength(0);
  });

  it('requires another active member to approve creator edits', () => {
    mockAuth.user = { subject: 'user-1' };
    mockBudgetQuery.data = {
      ...mockBudget,
      createdByUserId: 'user-1',
    };
    mockMembersQuery.data = [mockMembers[0]];
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    act(() => button('budgets.edit').props.onPress());

    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'RelationshipMemberSelectorHost',
      ).props.emptyMessage,
    ).toBe('budgets.noEligibleApprovers');
    expect(button('budgets.saveChanges').props.isDisabled).toBe(true);
  });

  it('approves eligible budgets and deletes creator budgets', () => {
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });
    act(() => button('budgets.approve').props.onPress());
    expect(mockApproveMutation.mutate).toHaveBeenCalledWith('budget-1');
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'budgets.edit',
      ),
    ).toHaveLength(0);

    unmountScreen();
    mockAuth.user = { subject: 'user-1' };
    mockBudgetQuery.data = {
      ...mockBudget,
      createdByUserId: 'user-1',
    };
    mockDeleteMutation.error = new Error('delete failed');
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    expect(textChildren()).toContain('delete failed');
    const deleteButton = screen!.root.find(
      (instance) => String(instance.type) === 'EntityDeleteButtonHost',
    );
    act(() => deleteButton.props.onDelete());
    expect(mockDeleteMutation.mutate).toHaveBeenCalledWith('budget-1', {
      onSuccess: expect.any(Function),
    });

    const onDeleted = mockDeleteMutation.mutate.mock.calls[0][1].onSuccess;
    act(() => onDeleted());
    expect(mockRouterDismissTo).toHaveBeenCalledWith(AppRoutePaths.budgets);
  });

  it('renders approved budgets, approval history, and budget items', () => {
    mockAuth.user = { subject: 'user-1' };
    mockBudgetQuery.data = {
      ...mockBudget,
      createdByUserId: 'user-1',
      status: 'approved',
      approvals: [
        { memberUserId: 'user-1', approvedAt: '2026-10-02T00:00:00.000Z' },
        { memberUserId: 'user-2' },
      ],
      items: [
        {
          id: 'item-1',
          budgetId: 'budget-1',
          name: 'Market',
          amountMinorUnits: 1250,
          date: '2026-10-10T00:00:00.000Z',
          createdAt: '2026-10-10T00:00:00.000Z',
          createdByUserId: 'user-1',
        },
      ],
    };
    mockApproveMutation.error = new Error('approval failed');
    mockDeleteMutation.error = new Error('delete failed');
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareBadgeHost')
        .map((badge) => badge.props.children),
    ).toContain('budgets.approved');
    expect(textChildren()).toContain('budgets.approverApproved');
    expect(textChildren()).toContain('budgets.approverPending');
    expect(textChildren()).toContain('Market');
    expect(textChildren()).toContain('approval failed');
    expect(textChildren()).toContain('delete failed');
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'budgets.approve',
      ),
    ).toHaveLength(0);
  });

  it('filters budget items by name from the search icon', () => {
    mockBudgetQuery.data = {
      ...mockBudget,
      items: budgetItemSearchFixtures,
    };
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'TouchableOpacityHost' &&
          ['common.search', 'common.filters', 'common.sort'].includes(
            instance.props.accessibilityLabel as string,
          ),
      ),
    ).toHaveLength(3);

    const searchButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'common.search',
    );
    act(() => searchButton.props.onPress());

    const searchInput = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareInputHost' &&
        (
          instance.props.inputFieldProps as {
            placeholder?: string;
          }
        ).placeholder === 'budgets.itemNamePlaceholder',
    );
    act(() => searchInput.props.onChangeText('market'));

    expect(renderedBudgetItemNames()).toEqual(['Market']);
  });

  it('filters budget items by date and sorts them by amount', () => {
    mockBudgetQuery.data = {
      ...mockBudget,
      items: budgetItemSearchFixtures,
    };
    act(() => {
      screen = renderer.create(<BudgetDetailsScreen />);
    });

    const filterButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'common.filters',
    );
    act(() => filterButton.props.onPress());

    const fromDate = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareTimePickerHost' &&
        instance.props.accessibilityLabel === 'budgets.itemDateFrom',
    );
    act(() => fromDate.props.onChange({ type: 'set' }, new Date(2026, 9, 11)));
    expect(renderedBudgetItemNames()).toEqual(['Market']);
    act(() => fromDate.props.onClear());
    expect(renderedBudgetItemNames()).toEqual(['Market', 'Transit']);

    const sortButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'common.sort',
    );
    act(() => sortButton.props.onPress());

    const sortField = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareDropdownHost' &&
        instance.props.placeholder === 'paymentRequests.sortBy',
    );
    act(() => sortField.props.onValueChange('amount'));
    expect(renderedBudgetItemNames()).toEqual(['Transit', 'Market']);
  });
});

function textChildren() {
  return screen!.root
    .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
    .map((text) => text.props.children);
}

function button(label: string) {
  return screen!.root.find(
    (instance) =>
      String(instance.type) === 'ThemeAwareButtonHost' &&
      instance.props.children === label,
  );
}

function unmountScreen() {
  if (screen) {
    act(() => screen?.unmount());
    screen = undefined;
  }
}

function renderedBudgetItemNames() {
  return textChildren().filter(
    (child) => child === 'Market' || child === 'Transit',
  );
}
