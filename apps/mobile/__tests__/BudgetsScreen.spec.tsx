import type {
  BudgetSummary,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import BudgetsScreen from '../app/(tabs)/(requests)/BudgetsScreen';

import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';

const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string } | undefined;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1' },
};
const mockRouter = {
  navigate: jest.fn(),
  push: jest.fn(),
};
const mockRelationship: RelationshipSummary = {
  id: 'relationship-1',
  name: 'Shared space',
  shareCode: 'share-code',
  approvalPolicy: 'all_members',
  members: [],
  pendingJoinRequestCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const mockBudget: BudgetSummary = {
  id: 'budget-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  name: 'Shared groceries',
  currency: 'USD',
  amountMinorUnits: 50000,
  amountRemainingMinorUnits: 40000,
  period: 'monthly',
  periodStart: '2026-01-01T00:00:00.000Z',
  periodEnd: '2026-01-31T23:59:59.999Z',
  status: 'approved',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
let mockSelectedRelationshipId: string | null = 'relationship-1';
const mockRelationshipsQuery = {
  data: [mockRelationship] as RelationshipSummary[] | undefined,
  error: null as Error | null,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};
const mockBudgetsQuery = {
  data: { items: [mockBudget] } as { items: BudgetSummary[] } | undefined,
  error: null as Error | null,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};
const mockUseBudgetsQuery = jest.fn();
let screen: ReactTestRenderer | undefined;

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useRouter: () => mockRouter,
  };
});

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('react-native', () => ({
  TouchableOpacity: 'TouchableOpacityHost',
  useColorScheme: () => 'light',
  View: 'ViewHost',
}));

jest.mock('@/components/ui/ThemeAwareBadge', () => ({
  ThemeAwareBadge: 'BadgeHost',
}));

jest.mock('@/components/ui/ThemeAwareCollapsible', () => ({
  ThemeAwareCollapsible: 'CollapsibleHost',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ButtonHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareHeading', () => ({
  ThemeAwareHeading: 'HeadingHost',
}));

jest.mock('@/components/ui/ThemeAwareDropdown', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareDropdown: (props: Record<string, unknown>) =>
      React.createElement('DropdownHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareInput: (props: Record<string, unknown>) =>
      React.createElement('InputHost', {
        ...(props.inputFieldProps as Record<string, unknown> | undefined),
        ...props,
      }),
  };
});

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({
      children,
      fixedHeaderContent,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        'ScreenHost',
        { ...props, fixedHeaderContent },
        fixedHeaderContent as React.ReactNode,
        children,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'SkeletonHost',
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareTimePicker', () => ({
  ThemeAwareTimePicker: 'TimePickerHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createText =
    (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children as React.ReactNode);

  return {
    ThemeAwareHeading: createText('HeadingHost'),
    ThemeAwareText: createText('TextHost'),
  };
});

jest.mock('@/components/ui/ThemedModal', () => ({
  ThemedModal: 'ThemedModalHost',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/icon', () => ({
  AddIcon: 'AddIconHost',
  ChevronsUpDownIcon: 'ChevronsUpDownIconHost',
  FilterIcon: 'FilterIconHost',
  Icon: 'IconHost',
  SearchIcon: 'SearchIconHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/features/budgets/components/BudgetItemModal', () => ({
  BudgetItemModal: 'BudgetItemModalHost',
}));

jest.mock('@/features/budgets/components/BudgetsListSkeleton', () => ({
  BudgetsListSkeleton: 'BudgetsListSkeletonHost',
}));

jest.mock('@/features/budgets/hooks/useBudgets', () => ({
  useBudgetsQuery: (relationshipId: string | undefined, enabled: boolean) => {
    mockUseBudgetsQuery(relationshipId, enabled);
    return mockBudgetsQuery;
  },
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipsQuery: () => mockRelationshipsQuery,
}));

jest.mock('@/state/store', () => ({
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: 'light',
    getTextColor: () => '#ffffff',
    textColor: 'theme-text',
  }),
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string) => key,
  }),
}));

describe('BudgetsScreen', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockSelectedRelationshipId = 'relationship-1';
    mockRelationshipsQuery.data = [mockRelationship];
    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.refetch.mockReset();
    mockBudgetsQuery.data = { items: [mockBudget] };
    mockBudgetsQuery.error = null;
    mockBudgetsQuery.isFetching = false;
    mockBudgetsQuery.isLoading = false;
    mockBudgetsQuery.refetch.mockReset();
    mockUseBudgetsQuery.mockClear();
    mockRouter.navigate.mockReset();
    mockRouter.push.mockReset();
  });

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  });

  function renderScreen() {
    act(() => {
      screen = renderer.create(<BudgetsScreen />);
    });
    return screen!;
  }

  function textChildren() {
    return screen!.root
      .findAll(
        (instance) =>
          String(instance.type) === 'TextHost' ||
          String(instance.type) === 'HeadingHost',
      )
      .map((instance) => instance.props.children);
  }

  it('uses compact search, filter, and sort controls to search budgets', () => {
    const travelBudget = {
      ...mockBudget,
      id: 'budget-2',
      name: 'Shared travel',
    };
    mockBudgetsQuery.data = { items: [mockBudget, travelBudget] };
    renderScreen();

    expect(
      screen!.root.find((instance) => String(instance.type) === 'ScreenHost')
        .props.fixedHeaderContent,
    ).toBeDefined();
    const toolbarIcons = screen!.root
      .findAll((instance) => String(instance.type) === 'IconHost')
      .map((icon) => icon.props.as);
    expect(toolbarIcons).toEqual(
      expect.arrayContaining([
        'SearchIconHost',
        'FilterIconHost',
        'ChevronsUpDownIconHost',
      ]),
    );

    const searchControl = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'common.search',
    );
    act(() => searchControl.props.onPress());

    const searchInput = screen!.root.find(
      (instance) =>
        String(instance.type) === 'InputHost' &&
        instance.props.placeholder === 'budgets.namePlaceholder',
    );
    act(() => searchInput.props.onChangeText('travel'));

    expect(textChildren()).toContain('Shared travel');
    expect(textChildren()).not.toContain('Shared groceries');
  });

  it('places the create action in the top-right header as a plus icon', () => {
    renderScreen();

    const stackScreen = screen!.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const { headerRight } = stackScreen.props.options as {
      headerRight: () => React.ReactElement;
    };
    let header: ReactTestRenderer | undefined;
    act(() => {
      header = renderer.create(headerRight());
    });

    const createButton = header!.root.find(
      (instance) => String(instance.type) === 'TouchableOpacityHost',
    );
    expect(createButton.props.accessibilityLabel).toBe('budgets.create');
    expect(
      header!.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props.name,
    ).toBe('plus');

    act(() => createButton.props.onPress());
    expect(mockRouter.push).toHaveBeenCalledWith(AppRoutePaths.createBudget);

    act(() => header!.unmount());
  });

  it('filters budgets by approval status', () => {
    const pendingBudget = {
      ...mockBudget,
      id: 'budget-pending',
      name: 'Pending groceries',
      status: 'pending_approval' as const,
    };
    mockBudgetsQuery.data = { items: [mockBudget, pendingBudget] };
    renderScreen();

    const filterControl = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'common.filters',
    );
    act(() => filterControl.props.onPress());

    const statusDropdown = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'paymentRequests.allStatuses',
    );
    act(() => statusDropdown.props.onValueChange('pending_approval'));

    expect(textChildren()).toContain('Pending groceries');
    expect(textChildren()).not.toContain('Shared groceries');
  });

  it('loads budgets for the persisted selection while relationship metadata is pending', () => {
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isLoading = true;
    mockRelationshipsQuery.isFetching = true;

    renderScreen();

    expect(mockUseBudgetsQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      true,
    );
    expect(textChildren()).toContain('Shared groceries');
  });

  it('keeps budgets visible and allows relationship metadata retry on error', () => {
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.error = new Error('Relationships unavailable');

    renderScreen();

    expect(textChildren()).toContain('Shared groceries');
    expect(textChildren()).toContain('Relationships unavailable');
    const retryButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'paymentRequests.retry',
    );
    act(() => retryButton.props.onPress());
    expect(mockRelationshipsQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a relationship-selection state and stops a stale scoped query', () => {
    mockSelectedRelationshipId = 'stale-relationship';

    renderScreen();

    expect(mockUseBudgetsQuery).toHaveBeenLastCalledWith(undefined, true);
    expect(textChildren()).toContain('home.selectActiveRelationshipMessage');
    expect(textChildren()).not.toContain('Shared groceries');
  });

  it('shows authentication and unavailable-profile states', () => {
    mockAuth.isAuthenticated = false;
    renderScreen();

    expect(textChildren()).toContain('paymentRequests.signIn');

    act(() => screen?.unmount());
    screen = undefined;
    mockAuth.isAuthenticated = true;
    mockAuth.user = {};
    renderScreen();

    expect(textChildren()).toContain('auth.signedIn');
    expect(textChildren()).toContain('auth.profileUnavailable');
  });

  it('shows relationship loading, empty, and retry states', () => {
    mockSelectedRelationshipId = null;
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isLoading = true;
    mockRelationshipsQuery.isFetching = true;
    renderScreen();

    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'BudgetsListSkeletonHost',
      ),
    ).not.toHaveLength(0);
    expect(mockUseBudgetsQuery).toHaveBeenLastCalledWith(undefined, true);

    act(() => screen?.unmount());
    screen = undefined;
    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.data = [];
    renderScreen();

    expect(textChildren()).toContain('budgets.noRelationship');
    const openHomeButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'budgets.openHome',
    );
    act(() => openHomeButton.props.onPress());
    expect(mockRouter.navigate).toHaveBeenCalledWith(AppRoutePaths.home);

    act(() => screen?.unmount());
    screen = undefined;
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.error = new Error('Relationships unavailable');
    renderScreen();

    expect(textChildren()).toContain('Relationships unavailable');
    const retryButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'paymentRequests.retry',
    );
    expect(retryButton.props.isDisabled).toBe(false);
    act(() => retryButton.props.onPress());
    expect(mockRelationshipsQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows budget errors and empty results and retries failed requests', () => {
    mockRelationshipsQuery.error = new Error('Relationship refresh failed');
    mockRelationshipsQuery.isFetching = true;
    mockBudgetsQuery.error = new Error('Budgets unavailable');
    renderScreen();

    expect(textChildren()).toContain('Relationship refresh failed');
    expect(textChildren()).toContain('Budgets unavailable');
    const retryButtons = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'paymentRequests.retry',
    );
    expect(retryButtons).toHaveLength(2);
    expect(retryButtons[0].props.isDisabled).toBe(true);
    expect(retryButtons[1].props.isDisabled).toBe(false);
    act(() => retryButtons[1].props.onPress());
    expect(mockBudgetsQuery.refetch).toHaveBeenCalledTimes(1);

    act(() => screen?.unmount());
    screen = undefined;
    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.isFetching = false;
    mockBudgetsQuery.error = null;
    mockBudgetsQuery.data = { items: [] };
    renderScreen();

    expect(textChildren()).toContain('budgets.empty');
  });

  it('shows pending budgets without item actions and navigates to details', () => {
    const pendingBudget = {
      ...mockBudget,
      status: 'pending_approval' as const,
    };
    mockBudgetsQuery.data = { items: [pendingBudget] };
    renderScreen();

    const statusBadge = screen!.root.find(
      (instance) => String(instance.type) === 'BadgeHost',
    );
    expect(statusBadge.props.children).toBe('budgets.pendingApproval');
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          String(instance.props.accessibilityLabel).startsWith(
            'budgets.addItem',
          ),
      ),
    ).toHaveLength(0);

    const budgetCard = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === pendingBudget.name,
    );
    const navigationCollection = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DetailNavigationCollectionRegistrationHost',
    );
    expect(navigationCollection.props.source).toBe(
      DetailNavigationSources.budgets,
    );
    expect(navigationCollection.props.itemIds).toEqual([pendingBudget.id]);
    expect(navigationCollection.props.hrefForId(pendingBudget.id)).toEqual({
      pathname: AppRoutePaths.budgetDetails,
      params: {
        id: pendingBudget.id,
        detailNavigationSource: DetailNavigationSources.budgets,
      },
    });
    act(() => budgetCard.props.onPress());
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: AppRoutePaths.budgetDetails,
      params: {
        id: pendingBudget.id,
        detailNavigationSource: DetailNavigationSources.budgets,
      },
    });

    const periodButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel ===
          `${pendingBudget.name}, Jan 1, 2026 - Jan 31, 2026`,
    );
    act(() => periodButton.props.onPress());
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: AppRoutePaths.budgetDetails,
      params: {
        id: pendingBudget.id,
        detailNavigationSource: DetailNavigationSources.budgets,
      },
    });
  });

  it('shows a one-line remaining summary and an unlabeled date range', () => {
    renderScreen();

    const summary = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TextHost' &&
        instance.props.children ===
          '$400.00 budgets.remainingOfTotal $500.00 budgets.remainingInline',
    );
    expect(summary.props.numberOfLines).toBe(1);
    expect(summary.props.adjustsFontSizeToFit).toBe(true);
    expect(textChildren()).toContain('Jan 1, 2026 - Jan 31, 2026');
  });

  it('opens and dismisses the add-item modal for an active approved budget', () => {
    const activeBudget = {
      ...mockBudget,
      periodStart: '2000-01-01T00:00:00.000Z',
      periodEnd: '2999-12-31T23:59:59.999Z',
    };
    mockBudgetsQuery.data = { items: [activeBudget] };
    renderScreen();

    const addItemButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.accessibilityLabel ===
          `budgets.addItem ${activeBudget.name}`,
    );
    expect(addItemButton.props.size).toBe('xs');
    expect(
      addItemButton.find((instance) => String(instance.type) === 'IconHost')
        .props.size,
    ).toBe('sm');
    const periodRow = screen!.root.find(
      (instance) =>
        String(instance.type) === 'HStackHost' &&
        instance.props.className === 'items-center justify-between' &&
        instance.findAll(
          (child) =>
            String(child.type) === 'TextHost' &&
            String(child.props.children).includes(' - '),
        ).length === 1,
    );
    expect(
      periodRow.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.accessibilityLabel ===
            `budgets.addItem ${activeBudget.name}`,
      ),
    ).toHaveLength(1);
    const statusRow = screen!.root.find(
      (instance) =>
        String(instance.type) === 'HStackHost' &&
        instance.props.className === 'items-start justify-between' &&
        instance.findAll((child) => String(child.type) === 'BadgeHost')
          .length === 1,
    );
    expect(statusRow.props.className).toBe('items-start justify-between');
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

  it('shows a list skeleton while the first budgets response loads', () => {
    mockBudgetsQuery.data = undefined;
    mockBudgetsQuery.isLoading = true;

    renderScreen();

    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'BudgetsListSkeletonHost',
      ),
    ).not.toHaveLength(0);
    const loadingScreen = screen!.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    expect(loadingScreen.props.fillAvailableSpace).toBe(true);
    expect(
      loadingScreen.find((instance) => String(instance.type) === 'VStackHost')
        .props.style,
    ).toEqual({ flex: 1 });
  });
});
