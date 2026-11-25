import type {
  JointAccountCharge,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { format } from 'date-fns';
import { de, enUS, es } from 'date-fns/locale';
import React from 'react';
import renderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import JointAccountChargesScreen from '../app/(tabs)/(requests)/JointAccountChargesScreen';
import JointAccountChargeDetailsScreen from '../app/joint-account-charge/[id]';

import { AppRoutePaths } from '@/constants/navigation';
import { JointAccountChargeListSkeleton } from '@/features/joint-account-charges/components/JointAccountChargeListSkeleton';
import { formatMinorUnits } from '@/utils/money';

const mockRouterDismissTo = jest.fn();
const mockRouterNavigate = jest.fn();
const mockRouterPush = jest.fn();
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string } | null;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1' },
};
let mockSelectedRelationshipId: string | undefined = 'relationship-1';
let mockLocale = 'en';
const mockCharge: JointAccountCharge = {
  id: 'charge-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  name: 'Dinner',
  amountMinorUnits: 3000,
  chargeDate: '2025-01-01T00:00:00.000Z',
  status: 'unpaid',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockCharges: JointAccountCharge[] = [
  mockCharge,
  {
    ...mockCharge,
    id: 'charge-2',
    createdByUserId: 'user-2',
    name: 'Groceries',
    amountMinorUnits: 1000,
    chargeDate: '2025-01-03T00:00:00.000Z',
    status: 'paid',
  },
  {
    ...mockCharge,
    id: 'charge-3',
    createdByUserId: 'user-3',
    name: 'Breakfast',
    amountMinorUnits: 2000,
    chargeDate: '2025-01-02T00:00:00.000Z',
  },
];
const DEFAULT_SORTED_MOCK_CHARGE_IDS = ['charge-2', 'charge-3', 'charge-1'];

const mockRelationship: RelationshipSummary = {
  id: 'relationship-1',
  name: 'Shared space',
  shareCode: 'share-code',
  approvalPolicy: 'all_members',
  members: [
    {
      id: 'member-1',
      relationshipId: 'relationship-1',
      userId: 'user-1',
      displayName: 'Zoe',
      role: 'owner',
      active: true,
    },
    {
      id: 'member-2',
      relationshipId: 'relationship-1',
      userId: 'user-2',
      displayName: 'Amy',
      role: 'member',
      active: true,
    },
    {
      id: 'member-3',
      relationshipId: 'relationship-1',
      userId: 'user-3',
      displayName: 'Mia',
      role: 'member',
      active: true,
    },
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockChargeQuery = {
  data: {
    pages: [
      {
        items: mockCharges,
        unpaidSummary: {
          totalAmountMinorUnits: 5000,
          currentUserChargeCount: 1,
        },
      },
    ],
  },
  fetchNextPage: jest.fn(),
  hasNextPage: true,
  isError: false,
  isFetchNextPageError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};
const mockChargeDetailsQuery = {
  data: mockCharge as JointAccountCharge | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockChargeMembersQuery = {
  data: mockRelationship.members,
  error: null as Error | null,
};
const mockUpdateChargeMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
const mockMarkPaidChargeMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
const mockMarkAllPaidMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
  reset: jest.fn(),
};
const mockUseChargesInfiniteQuery = jest.fn(
  (_relationshipId: string | undefined, _filters: unknown, _enabled: boolean) =>
    mockChargeQuery,
);
const mockRelationshipsQuery = {
  data: [mockRelationship] as RelationshipSummary[] | undefined,
  error: null as Error | null,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'IconHost',
}));

jest.mock('expo-router', () => ({
  Stack: {
    Screen: (props: Record<string, unknown>) => {
      const React = jest.requireActual('react') as typeof import('react');
      return React.createElement('StackScreenHost', props);
    },
  },
  useLocalSearchParams: () => ({ id: 'charge-1' }),
  useRouter: () => ({
    dismissTo: mockRouterDismissTo,
    navigate: mockRouterNavigate,
    push: mockRouterPush,
  }),
}));

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicatorHost',
  View: 'ViewHost',
  Text: 'TextHost',
  TouchableOpacity: 'TouchableOpacityHost',
}));

jest.mock(
  '@/features/joint-account-charges/components/JointAccountChargeCalendarModal',
  () => ({
    JointAccountChargeCalendarModal: 'JointAccountChargeCalendarModalHost',
  }),
);

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/ThemeAwareBadge', () => ({
  ThemeAwareBadge: 'BadgeHost',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));

jest.mock('@/components/ui/ThemedModal', () => ({
  ThemedModal: 'ThemedModalHost',
}));

jest.mock('@/components/ui/ThemeAwareTimePicker', () => ({
  ThemeAwareTimePicker: 'TimePickerHost',
}));

jest.mock('@/components/ui/ThemeAwareDropdown', () => ({
  ThemeAwareDropdown: 'DropdownHost',
}));

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'InputHost',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
}));

jest.mock('@/components/ui/ThemeAwareCollapsible', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareCollapsible: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('CollapsibleHost', props, children),
  };
});

jest.mock('@/components/ui/icon', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ChevronsUpDownIcon: 'ChevronsUpDownIconHost',
    ChevronDownIcon: 'ChevronDownIconHost',
    ChevronUpIcon: 'ChevronUpIconHost',
    FilterIcon: 'FilterIconHost',
    Icon: (props: Record<string, unknown>) =>
      React.createElement('IconHost', props),
    SearchIcon: 'SearchIconHost',
  };
});

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareScreen: ({
      backToTop,
      bottomContent,
      children,
      fixedHeaderContent,
      flashListProps,
    }: {
      backToTop?: boolean;
      bottomContent?:
        | React.ReactNode
        | ((actions: { scrollToTop: () => void }) => React.ReactNode);
      children: React.ReactNode;
      fixedHeaderContent?: React.ReactNode;
      flashListProps?: Record<string, unknown>;
    }) => {
      const renderedBottomContent =
        typeof bottomContent === 'function' ? null : bottomContent;

      return React.createElement(
        'ThemeAwareScreenHost',
        { backToTop, bottomContent, fixedHeaderContent, flashListProps },
        fixedHeaderContent,
        children,
        renderedBottomContent,
      );
    },
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareHeading: 'HeadingHost',
  ThemeAwareText: 'TextHost',
}));

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: 'light',
    getTextColor: (onSolidBackground = false) =>
      onSolidBackground ? '#ffffff' : 'theme-text',
    textColor: 'theme-text',
  }),
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock(
  '@/features/joint-account-charges/hooks/useJointAccountCharges',
  () => ({
    useDeleteJointAccountChargeMutation: () => ({
      error: null,
      isPending: false,
      mutate: jest.fn(),
    }),
    useJointAccountChargeQuery: () => mockChargeDetailsQuery,
    useJointAccountChargesInfiniteQuery: (
      relationshipId: string | undefined,
      filters: unknown,
      enabled: boolean,
    ) => mockUseChargesInfiniteQuery(relationshipId, filters, enabled),
    useMarkAllJointAccountChargesPaidMutation: () => mockMarkAllPaidMutation,
    useMarkJointAccountChargePaidMutation: () => mockMarkPaidChargeMutation,
    useUpdateJointAccountChargeMutation: () => mockUpdateChargeMutation,
  }),
);

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipMembersQuery: () => mockChargeMembersQuery,
  useRelationshipsQuery: () => mockRelationshipsQuery,
}));

jest.mock('@/state/store', () => ({
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ locale: mockLocale, t: (key: string) => key }),
}));

describe('JointAccountChargesScreen infinite scroll', () => {
  let screen: ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChargeQuery.data = {
      pages: [
        {
          items: mockCharges,
          unpaidSummary: {
            totalAmountMinorUnits: 5000,
            currentUserChargeCount: 1,
          },
        },
      ],
    };
    mockChargeQuery.hasNextPage = true;
    mockChargeQuery.isError = false;
    mockChargeQuery.isFetchNextPageError = false;
    mockChargeQuery.isFetching = false;
    mockChargeQuery.isFetchingNextPage = false;
    mockChargeQuery.isLoading = false;
    mockChargeQuery.isRefetching = false;
    mockChargeDetailsQuery.data = mockCharge;
    mockChargeDetailsQuery.error = null;
    mockChargeDetailsQuery.isLoading = false;
    mockChargeMembersQuery.data = mockRelationship.members;
    mockChargeMembersQuery.error = null;
    mockUpdateChargeMutation.error = null;
    mockUpdateChargeMutation.isPending = false;
    mockMarkPaidChargeMutation.error = null;
    mockMarkPaidChargeMutation.isPending = false;
    mockMarkAllPaidMutation.error = null;
    mockMarkAllPaidMutation.isPending = false;
    mockRelationshipsQuery.data = [mockRelationship];
    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.isLoading = false;
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockSelectedRelationshipId = 'relationship-1';
    mockLocale = 'en';
  });

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  });

  function renderScreen() {
    act(() => {
      screen = renderer.create(<JointAccountChargesScreen />);
    });

    return screen!;
  }

  function getListProps(testScreen: ReactTestRenderer) {
    return testScreen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as {
      data: JointAccountCharge[];
      ListEmptyComponent?: React.ReactElement | null;
      ListFooterComponent?: React.ReactElement | null;
      onEndReached?: () => void;
      renderItem?: (info: {
        item: JointAccountCharge;
        index: number;
        target: string;
      }) => React.ReactNode;
    };
  }

  function getListEmptyComponent(testScreen: ReactTestRenderer) {
    const emptyComponent = getListProps(testScreen).ListEmptyComponent;

    if (!React.isValidElement(emptyComponent)) {
      throw new Error('Expected the list to have an empty-state component.');
    }

    return emptyComponent as React.ReactElement<{
      children?: React.ReactNode;
    }>;
  }

  function getTextValues(testScreen: ReactTestRenderer) {
    return testScreen.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
  }

  function getElementTextValues(element: React.ReactNode): string[] {
    return React.Children.toArray(element).flatMap((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return [String(child)];
      }
      if (!React.isValidElement(child)) return [];
      return getElementTextValues(
        (child.props as { children?: React.ReactNode }).children,
      );
    });
  }

  function getButtonByText(
    testScreen: ReactTestRenderer,
    label: string,
  ): ReactTestInstance {
    const button = testScreen.root
      .findAll((instance) => String(instance.type) === 'ButtonHost')
      .find((instance) => instance.props.children === label);

    if (!button) {
      throw new Error(`Could not find button "${label}".`);
    }

    return button;
  }

  function getSearchControl(testScreen: ReactTestRenderer, label: string) {
    return testScreen.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === label,
    );
  }

  function openSearchModal(testScreen: ReactTestRenderer, label: string) {
    act(() => getSearchControl(testScreen, label).props.onPress());
  }

  function closeSearchModal(testScreen: ReactTestRenderer) {
    const modal = testScreen.root
      .findAll((instance) => String(instance.type) === 'ThemedModalHost')
      .find(
        (instance) =>
          instance.props.title === 'common.search' ||
          instance.props.title === 'common.filters' ||
          instance.props.title === 'common.sort',
      );

    if (!modal) {
      throw new Error('Could not find an active search modal.');
    }

    act(() => modal.props.confirmButton.onPress());
  }

  function getInputByPlaceholder(
    testScreen: ReactTestRenderer,
    placeholder: string,
    index = 0,
  ): ReactTestInstance {
    const inputs = testScreen.root
      .findAll((instance) => String(instance.type) === 'InputHost')
      .filter(
        (instance) =>
          (
            instance.props.inputFieldProps as
              | { placeholder?: string }
              | undefined
          )?.placeholder === placeholder,
      );
    const input = inputs[index];

    if (!input) {
      throw new Error(
        `Could not find input with placeholder "${placeholder}".`,
      );
    }

    return input;
  }

  function getOnEndReached(testScreen: ReactTestRenderer) {
    return testScreen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps.onEndReached as (() => void) | undefined;
  }

  function getDropdownByOption(
    testScreen: ReactTestRenderer,
    optionValue: string,
  ): ReactTestInstance {
    const dropdown = testScreen.root
      .findAll((instance) => String(instance.type) === 'DropdownHost')
      .find(
        (instance) =>
          Array.isArray(instance.props.options) &&
          instance.props.options.some(
            (option: { value: string }) => option.value === optionValue,
          ),
      );

    if (!dropdown) {
      throw new Error(`Could not find dropdown option "${optionValue}".`);
    }

    return dropdown;
  }

  function getChargeIds(testScreen: ReactTestRenderer) {
    return testScreen.root
      .find((instance) => String(instance.type) === 'ThemeAwareScreenHost')
      .props.flashListProps.data.map((charge: JointAccountCharge) => charge.id);
  }

  it('opens the joint-account-charge calendar from the header', () => {
    const testScreen = renderScreen();
    const stackScreen = testScreen.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const headerRight = stackScreen.props.options
      .headerRight as () => React.ReactElement;
    let header: ReactTestRenderer | undefined;
    act(() => {
      header = renderer.create(headerRight());
    });
    const calendarButton = header!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel ===
          'jointAccountCharges.showCalendar',
    );

    act(() => calendarButton.props.onPress());

    expect(
      testScreen.root.find(
        (instance) =>
          String(instance.type) === 'JointAccountChargeCalendarModalHost',
      ).props,
    ).toMatchObject({
      isVisible: true,
      relationship: mockRelationship,
    });
    act(() => header?.unmount());
  });

  it('shows sign-in and profile fallback states', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    const signedOutScreen = renderScreen();
    expect(() =>
      getButtonByText(signedOutScreen, 'paymentRequests.signIn'),
    ).not.toThrow();
    act(() =>
      getButtonByText(
        signedOutScreen,
        'paymentRequests.signIn',
      ).props.onPress(),
    );
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      '/(tabs)/(account)/AccountScreen',
    );
    act(() => signedOutScreen.unmount());
    screen = undefined;

    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    const profileScreen = renderScreen();
    expect(getTextValues(profileScreen)).toContain('auth.profileUnavailable');
  });

  it('prompts for a relationship when the selected relationship is stale', () => {
    mockSelectedRelationshipId = 'missing-relationship';

    const testScreen = renderScreen();

    expect(getTextValues(testScreen)).toContain(
      'jointAccountCharges.noRelationshipSelected',
    );
    act(() =>
      getButtonByText(
        testScreen,
        'home.selectActiveRelationship',
      ).props.onPress(),
    );
    expect(mockRouterNavigate).toHaveBeenCalledWith('/(tabs)/(home)');
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      undefined,
      { status: 'unpaid' },
      true,
    );
  });

  it('uses the persisted selection while an empty cached relationship list refreshes', () => {
    mockRelationshipsQuery.data = [];
    mockRelationshipsQuery.isFetching = true;
    const testScreen = renderScreen();

    expect(getChargeIds(testScreen)).toEqual(DEFAULT_SORTED_MOCK_CHARGE_IDS);
    expect(getTextValues(testScreen)).not.toContain(
      'jointAccountCharges.noRelationshipSelected',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      { status: 'unpaid' },
      true,
    );
  });

  it('renders charges with fallback creator IDs while relationship metadata loads', () => {
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isFetching = true;
    mockRelationshipsQuery.isLoading = true;
    const testScreen = renderScreen();

    expect(getChargeIds(testScreen)).toEqual(DEFAULT_SORTED_MOCK_CHARGE_IDS);
    expect(getTextValues(testScreen)).not.toContain('common.loading');
    expect(getTextValues(testScreen)).toContain(formatMinorUnits(5000));
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      { status: 'unpaid' },
      true,
    );

    const renderItem = getListProps(testScreen).renderItem;
    if (!renderItem) {
      throw new Error('Expected the charge list to render its items.');
    }

    let renderedRow: ReactTestRenderer;
    act(() => {
      renderedRow = renderer.create(
        <>{renderItem({ item: mockCharge, index: 0, target: 'Cell' })}</>,
      );
    });
    expect(getTextValues(renderedRow!)).toContain('user-1');

    act(() => renderedRow!.unmount());
  });

  it('shows total and charge-row skeletons while the first charges page loads', () => {
    mockChargeQuery.data = { pages: [] };
    mockChargeQuery.isLoading = true;
    const testScreen = renderScreen();
    openSearchModal(testScreen, 'common.search');

    expect(getTextValues(testScreen)).toContain(
      'jointAccountCharges.totalOwed',
    );
    expect(
      testScreen.root.find(
        (instance) =>
          instance.props.testID === 'joint-account-charge-total-placeholder',
      ),
    ).toBeDefined();
    expect(
      getInputByPlaceholder(
        testScreen,
        'jointAccountCharges.filterByNamePlaceholder',
      ),
    ).toBeDefined();
    expect(getListEmptyComponent(testScreen).props.children).toEqual(
      expect.objectContaining({ type: JointAccountChargeListSkeleton }),
    );
  });

  it('defaults to showing unpaid charges', () => {
    const testScreen = renderScreen();
    openSearchModal(testScreen, 'common.filters');

    expect(getDropdownByOption(testScreen, 'unpaid').props.selectedValue).toBe(
      'unpaid',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      { status: 'unpaid' },
      true,
    );
  });

  it('shows the total owed and confirms bulk payment for the signed-in user', () => {
    const testScreen = renderScreen();

    expect(getTextValues(testScreen)).toContain(
      'jointAccountCharges.totalOwed',
    );
    expect(getTextValues(testScreen)).toContain(formatMinorUnits(5000));

    act(() =>
      getButtonByText(
        testScreen,
        'jointAccountCharges.markAllPaid',
      ).props.onPress(),
    );
    const modal = testScreen.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.isVisible).toBe(true);
    expect(getElementTextValues(modal.props.children)).toContain(
      'jointAccountCharges.markAllPaidConfirmation',
    );

    act(() => modal.props.confirmButton.onPress());

    expect(mockMarkAllPaidMutation.mutate).toHaveBeenCalledWith(
      'relationship-1',
      { onSuccess: expect.any(Function) },
    );
  });

  it('does not offer bulk payment when the current user has no unpaid charges', () => {
    mockChargeQuery.data.pages[0]!.unpaidSummary.currentUserChargeCount = 0;
    const testScreen = renderScreen();

    expect(() =>
      getButtonByText(testScreen, 'jointAccountCharges.markAllPaid'),
    ).toThrow();
  });

  it('renders charge rows, status badges, and detail navigation', () => {
    const testScreen = renderScreen();
    const renderItem = getListProps(testScreen).renderItem;

    if (!renderItem) {
      throw new Error('Expected the charges list to render its rows.');
    }

    for (const [charge, expectedStatus] of [
      [mockCharges[1]!, 'jointAccountCharges.paid'],
      [mockCharges[2]!, 'jointAccountCharges.unpaid'],
    ] as const) {
      let row: ReactTestRenderer;
      const renderedRow = renderItem({
        item: charge,
        index: 0,
        target: 'Cell',
      });
      if (!React.isValidElement(renderedRow)) {
        throw new Error(
          'Expected the charge row renderer to return an element.',
        );
      }

      act(() => {
        row = renderer.create(renderedRow);
      });

      expect(
        row!.root.find((instance) => String(instance.type) === 'BadgeHost')
          .props.children,
      ).toBe(expectedStatus);

      const touchableOpacity = row!.root.find(
        (instance) =>
          String(instance.type) === 'TouchableOpacityHost' &&
          instance.props.accessibilityRole === 'button',
      );
      act(() => touchableOpacity.props.onPress());
      expect(mockRouterNavigate).toHaveBeenLastCalledWith({
        pathname: '/(tabs)/(requests)/joint-account-charge/[id]',
        params: {
          id: charge.id,
          detailNavigationSource: 'jointAccountCharges',
        },
      });
      act(() => row!.unmount());
    }
  });

  it('uses a pinned back-to-top footer for the infinite charges list', () => {
    const testScreen = renderScreen();
    const screenHost = testScreen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    );
    const scrollToTop = jest.fn();
    const bottomContent = screenHost.props.bottomContent as (actions: {
      scrollToTop: () => void;
    }) => React.ReactElement<{
      accessibilityLabel: string;
      onPress: () => void;
    }>;
    const backToTopButton = bottomContent({ scrollToTop });

    expect(screenHost.props.backToTop).toBe(false);
    expect(backToTopButton.props.accessibilityLabel).toBe('common.backToTop');
    act(() => backToTopButton.props.onPress());
    expect(scrollToTop).toHaveBeenCalledTimes(1);
  });

  it('pins compact search, filter, and sort icons in the fixed header', () => {
    const testScreen = renderScreen();
    const screenHost = testScreen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    );
    const expectedControls = [
      ['common.search', 'SearchIconHost'],
      ['common.filters', 'FilterIconHost'],
      ['common.sort', 'ChevronsUpDownIconHost'],
    ] as const;
    const controls = testScreen.root.findAll(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        expectedControls.some(
          ([label]) => instance.props.accessibilityLabel === label,
        ),
    );

    expect(screenHost.props.fixedHeaderContent).toBeDefined();
    expect(controls.map((control) => control.props.accessibilityLabel)).toEqual(
      expectedControls.map(([label]) => label),
    );
    expect(
      controls.map(
        (control) =>
          control.find((instance) => String(instance.type) === 'IconHost').props
            .as,
      ),
    ).toEqual(expectedControls.map(([, icon]) => icon));
  });

  it('fetches another page when the list reaches its end', () => {
    const testScreen = renderScreen();

    act(() => getOnEndReached(testScreen)?.());

    expect(mockChargeQuery.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when there is no next page', () => {
    mockChargeQuery.hasNextPage = false;
    const testScreen = renderScreen();

    act(() => getOnEndReached(testScreen)?.());

    expect(mockChargeQuery.fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not fetch while another request is in flight', () => {
    mockChargeQuery.isFetching = true;
    const testScreen = renderScreen();

    act(() => getOnEndReached(testScreen)?.());

    expect(mockChargeQuery.fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not automatically retry a failed next-page request', () => {
    mockChargeQuery.isFetchNextPageError = true;
    const testScreen = renderScreen();

    act(() => getOnEndReached(testScreen)?.());

    expect(mockChargeQuery.fetchNextPage).not.toHaveBeenCalled();
  });

  it('offers a retry button after a failed next-page request', () => {
    mockChargeQuery.isFetchNextPageError = true;
    const testScreen = renderScreen();
    const retryButton = getListProps(testScreen).ListFooterComponent as
      | React.ReactElement<{
          children: string;
          isDisabled: boolean;
          onPress: () => void;
        }>
      | undefined;

    expect(retryButton?.props.children).toBe('paymentRequests.retry');
    expect(retryButton?.props.isDisabled).toBe(false);
    act(() => retryButton?.props.onPress());

    expect(mockChargeQuery.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('keeps charges visible during relationship loading and offers retry if metadata fails', () => {
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isFetching = true;
    mockRelationshipsQuery.isLoading = true;
    const testScreen = renderScreen();

    expect(getChargeIds(testScreen)).toEqual(DEFAULT_SORTED_MOCK_CHARGE_IDS);
    expect(getTextValues(testScreen)).not.toContain('common.loading');

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.error = new Error('Unable to load relationships');
    act(() => testScreen.update(<JointAccountChargesScreen />));

    expect(getTextValues(testScreen)).toContain('jointAccountCharges.error');
    act(() =>
      getButtonByText(testScreen, 'paymentRequests.retry').props.onPress(),
    );

    expect(mockRelationshipsQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('offers relationship retry if the lookup fails before a selection is available', () => {
    mockSelectedRelationshipId = undefined;
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.error = new Error('Unable to load relationships');
    const testScreen = renderScreen();

    expect(getTextValues(testScreen)).toContain('jointAccountCharges.error');
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      undefined,
      { status: 'unpaid' },
      true,
    );
    act(() =>
      getButtonByText(testScreen, 'paymentRequests.retry').props.onPress(),
    );
    expect(mockRelationshipsQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('explains when no relationship exists and links to relationship setup', () => {
    mockRelationshipsQuery.data = [];
    const testScreen = renderScreen();

    expect(getTextValues(testScreen)).toContain(
      'paymentRequests.noRelationship',
    );
    act(() =>
      getButtonByText(
        testScreen,
        'paymentRequests.createRelationship',
      ).props.onPress(),
    );

    expect(mockRouterNavigate).toHaveBeenCalledWith(
      '/(tabs)/(requests)/ViewAllRequestsScreen',
    );
  });

  it('renders loading, empty, and filtered-empty charge list states', () => {
    mockChargeQuery.data = {
      pages: [
        {
          items: [],
          unpaidSummary: {
            totalAmountMinorUnits: 0,
            currentUserChargeCount: 0,
          },
        },
      ],
    };
    mockChargeQuery.isLoading = true;
    const testScreen = renderScreen();

    expect(getListEmptyComponent(testScreen).props.children).toEqual(
      expect.objectContaining({ type: JointAccountChargeListSkeleton }),
    );

    mockChargeQuery.isLoading = false;
    act(() => testScreen.update(<JointAccountChargesScreen />));
    expect(getListEmptyComponent(testScreen).props.children).toBe(
      'jointAccountCharges.empty',
    );

    openSearchModal(testScreen, 'common.search');
    act(() =>
      getInputByPlaceholder(
        testScreen,
        'jointAccountCharges.filterByNamePlaceholder',
      ).props.onChangeText('coffee'),
    );

    expect(getListEmptyComponent(testScreen).props.children).toBe(
      'jointAccountCharges.noFilteredCharges',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      expect.objectContaining({ name: 'coffee' }),
      true,
    );

    closeSearchModal(testScreen);
    openSearchModal(testScreen, 'common.filters');
    act(() =>
      getButtonByText(
        testScreen,
        'jointAccountCharges.clearFilters',
      ).props.onPress(),
    );
    closeSearchModal(testScreen);
    openSearchModal(testScreen, 'common.search');

    expect(
      getInputByPlaceholder(
        testScreen,
        'jointAccountCharges.filterByNamePlaceholder',
      ).props.value,
    ).toBe('');
    expect(getListEmptyComponent(testScreen).props.children).toBe(
      'jointAccountCharges.empty',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      { status: 'unpaid' },
      true,
    );
  });

  it('retains loaded rows while the charge query refetches', () => {
    mockChargeQuery.isRefetching = true;
    const testScreen = renderScreen();

    expect(getChargeIds(testScreen)).toEqual(DEFAULT_SORTED_MOCK_CHARGE_IDS);
    expect(getTextValues(testScreen)).toContain(formatMinorUnits(5000));
    expect(getListEmptyComponent(testScreen).props.children).toBe(
      'jointAccountCharges.empty',
    );
  });

  it('retries a failed charge-list query from its empty state', () => {
    mockChargeQuery.data = {
      pages: [
        {
          items: [],
          unpaidSummary: {
            totalAmountMinorUnits: 0,
            currentUserChargeCount: 0,
          },
        },
      ],
    };
    mockChargeQuery.isError = true;
    const testScreen = renderScreen();
    const emptyState = getListEmptyComponent(testScreen);
    const [errorText, retryButton] = React.Children.toArray(
      emptyState.props.children,
    ) as React.ReactElement<{
      children?: React.ReactNode;
      isDisabled?: boolean;
      onPress?: () => void;
    }>[];

    expect(errorText.props.children).toBe('jointAccountCharges.error');
    expect(retryButton.props.children).toBe('paymentRequests.retry');
    expect(retryButton.props.isDisabled).toBe(false);
    act(() => retryButton.props.onPress?.());

    expect(mockChargeQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('blocks invalid amount ranges and applies corrected bounds', () => {
    const testScreen = renderScreen();
    openSearchModal(testScreen, 'common.filters');
    const minimumInput = getInputByPlaceholder(
      testScreen,
      'jointAccountCharges.amountPlaceholder',
      0,
    );
    const maximumInput = getInputByPlaceholder(
      testScreen,
      'jointAccountCharges.amountPlaceholder',
      1,
    );

    act(() => {
      minimumInput.props.onChangeText('25');
      maximumInput.props.onChangeText('20');
    });

    expect(getTextValues(testScreen)).toContain(
      'jointAccountCharges.amountFilterInvalid',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      expect.objectContaining({
        minimumAmountMinorUnits: 2500,
        maximumAmountMinorUnits: 2000,
      }),
      false,
    );

    act(() =>
      getInputByPlaceholder(
        testScreen,
        'jointAccountCharges.amountPlaceholder',
        1,
      ).props.onChangeText('30'),
    );

    expect(getTextValues(testScreen)).not.toContain(
      'jointAccountCharges.amountFilterInvalid',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      expect.objectContaining({
        minimumAmountMinorUnits: 2500,
        maximumAmountMinorUnits: 3000,
      }),
      true,
    );
  });

  it('validates date and amount bounds, applies member filters, and clears them', () => {
    const testScreen = renderScreen();
    openSearchModal(testScreen, 'common.filters');
    const minimumInput = getInputByPlaceholder(
      testScreen,
      'jointAccountCharges.amountPlaceholder',
      0,
    );
    const maximumInput = getInputByPlaceholder(
      testScreen,
      'jointAccountCharges.amountPlaceholder',
      1,
    );

    act(() => minimumInput.props.onChangeText('99999999999'));
    expect(getTextValues(testScreen)).toContain(
      'jointAccountCharges.amountFilterInvalid',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      expect.any(Object),
      false,
    );

    act(() => {
      minimumInput.props.onChangeText('5');
      maximumInput.props.onChangeText('10');
    });

    const [fromPicker, toPicker] = testScreen.root.findAll(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    const fromDate = new Date(2025, 0, 3);
    const earlierToDate = new Date(2025, 0, 1);
    act(() => {
      fromPicker?.props.onChange({ type: 'set' }, fromDate);
      toPicker?.props.onChange({ type: 'set' }, earlierToDate);
    });

    expect(getTextValues(testScreen)).toContain(
      'jointAccountCharges.dateFilterInvalid',
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      expect.objectContaining({
        minimumAmountMinorUnits: 500,
        maximumAmountMinorUnits: 1000,
      }),
      false,
    );

    const updatedDatePickers = testScreen.root.findAll(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    const toDate = new Date(2025, 0, 4);
    act(() => updatedDatePickers[1]?.props.onChange({ type: 'set' }, toDate));
    expect(getTextValues(testScreen)).not.toContain(
      'jointAccountCharges.dateFilterInvalid',
    );

    const lastFilters = mockUseChargesInfiniteQuery.mock.calls[
      mockUseChargesInfiniteQuery.mock.calls.length - 1
    ]?.[1] as {
      fromDate?: string;
      toDate?: string;
    };
    expect(lastFilters.fromDate).toBe(fromDate.toISOString());
    expect(lastFilters.toDate).toBe(
      new Date(2025, 0, 4, 23, 59, 59, 999).toISOString(),
    );

    act(() =>
      getDropdownByOption(testScreen, 'paid').props.onValueChange('paid'),
    );
    act(() =>
      getDropdownByOption(testScreen, 'user-2').props.onValueChange('user-2'),
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      expect.objectContaining({
        status: 'paid',
        createdByUserId: 'user-2',
      }),
      true,
    );

    closeSearchModal(testScreen);
    openSearchModal(testScreen, 'common.sort');
    act(() =>
      getDropdownByOption(testScreen, 'chargeDate').props.onValueChange(
        'unsupported',
      ),
    );
    act(() =>
      getDropdownByOption(testScreen, 'ascending').props.onValueChange(
        'unsupported',
      ),
    );
    expect(
      getDropdownByOption(testScreen, 'chargeDate').props.selectedValue,
    ).toBe('chargeDate');
    expect(
      getDropdownByOption(testScreen, 'ascending').props.selectedValue,
    ).toBe('descending');

    closeSearchModal(testScreen);
    openSearchModal(testScreen, 'common.filters');
    act(() =>
      getButtonByText(
        testScreen,
        'jointAccountCharges.clearFilters',
      ).props.onPress(),
    );
    expect(mockUseChargesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      { status: 'unpaid' },
      true,
    );
    expect(
      getInputByPlaceholder(
        testScreen,
        'jointAccountCharges.amountPlaceholder',
        0,
      ).props.value,
    ).toBe('');
  });

  it('does not render the active relationship card', () => {
    const testScreen = renderScreen();
    const headingValues = testScreen.root
      .findAll((instance) => String(instance.type) === 'HeadingHost')
      .map((instance) => instance.props.children);
    const textValues = testScreen.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);

    expect(headingValues).not.toContain(
      'relationshipContext.activeRelationship',
    );
    expect(textValues).not.toContain('relationshipContext.changeRelationship');
  });

  it('offers sorting by each displayed field in both directions', () => {
    const testScreen = renderScreen();
    openSearchModal(testScreen, 'common.sort');
    const sortFieldDropdown = getDropdownByOption(testScreen, 'chargeDate');
    const sortOrderDropdown = getDropdownByOption(testScreen, 'ascending');

    expect(
      sortFieldDropdown.props.options.map(
        (option: { value: string }) => option.value,
      ),
    ).toEqual(['chargeDate', 'name', 'amount', 'status', 'createdBy']);
    expect(sortFieldDropdown.props.selectedValue).toBe('chargeDate');
    expect(
      sortOrderDropdown.props.options.map(
        (option: { value: string }) => option.value,
      ),
    ).toEqual(['ascending', 'descending']);
    expect(sortOrderDropdown.props.selectedValue).toBe('descending');
  });

  it('re-sorts loaded charges when the sort field and order change', () => {
    const testScreen = renderScreen();
    openSearchModal(testScreen, 'common.sort');

    expect(getChargeIds(testScreen)).toEqual([
      'charge-2',
      'charge-3',
      'charge-1',
    ]);

    act(() => {
      getDropdownByOption(testScreen, 'chargeDate').props.onValueChange(
        'amount',
      );
    });

    expect(getChargeIds(testScreen)).toEqual([
      'charge-1',
      'charge-3',
      'charge-2',
    ]);

    act(() => {
      getDropdownByOption(testScreen, 'ascending').props.onValueChange(
        'ascending',
      );
    });

    expect(getChargeIds(testScreen)).toEqual([
      'charge-2',
      'charge-3',
      'charge-1',
    ]);
  });

  it('pins charge edit and navigation actions to the bottom bar', () => {
    let detailsScreen: ReactTestRenderer;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });

    const screenHost = detailsScreen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    );
    expect(screenHost.props.bottomContent).toBeDefined();
    expect(
      getElementTextValues(screenHost.props.bottomContent as React.ReactNode),
    ).toEqual(
      expect.arrayContaining([
        'jointAccountCharges.save',
        'jointAccountCharges.markPaid',
        'jointAccountCharges.viewAll',
      ]),
    );

    const backButton = detailsScreen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'jointAccountCharges.viewAll',
    );
    const deleteButton = detailsScreen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'common.delete',
    );
    expect(deleteButton.props.lightBackground).toBe('$error600');
    act(() => backButton.props.onPress());

    expect(mockRouterDismissTo).toHaveBeenCalledWith(
      '/(tabs)/(requests)/JointAccountChargesScreen',
    );

    act(() => detailsScreen!.unmount());
  });

  it('links automatically created charges to their payment request', () => {
    let detailsScreen: ReactTestRenderer;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });

    expect(
      detailsScreen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'jointAccountCharges.viewPaymentRequest',
      ),
    ).toHaveLength(0);

    mockChargeDetailsQuery.data = {
      ...mockCharge,
      paymentRequestId: 'payment-request-1',
    };
    act(() => detailsScreen!.update(<JointAccountChargeDetailsScreen />));

    const paymentRequestButton = getButtonByText(
      detailsScreen!,
      'jointAccountCharges.viewPaymentRequest',
    );
    act(() => paymentRequestButton.props.onPress());

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'payment-request-1' },
    });

    act(() => detailsScreen!.unmount());
  });

  it('validates and saves an unpaid charge and can mark it paid', () => {
    let detailsScreen: ReactTestRenderer;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });

    const [nameInput, amountInput] = detailsScreen!.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    expect(nameInput?.props.value).toBe('Dinner');
    expect(amountInput?.props.value).toBe('30.00');

    act(() => {
      nameInput?.props.onChangeText(' ');
      amountInput?.props.onChangeText('not an amount');
    });
    expect(getTextValues(detailsScreen!)).toContain(
      'jointAccountCharges.amountInvalid',
    );

    const saveButton = getButtonByText(
      detailsScreen!,
      'jointAccountCharges.save',
    );
    expect(saveButton.props.isDisabled).toBe(true);
    act(() => saveButton.props.onPress());
    expect(mockUpdateChargeMutation.mutate).not.toHaveBeenCalled();

    const chargeDate = new Date('2025-01-03T10:20:30.000Z');
    const timePicker = detailsScreen!.root.find(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    act(() => {
      nameInput?.props.onChangeText('  Brunch  ');
      amountInput?.props.onChangeText('12.50');
      timePicker.props.onChange(undefined, chargeDate);
    });

    expect(
      getButtonByText(detailsScreen!, 'jointAccountCharges.save').props
        .isDisabled,
    ).toBe(false);
    act(() =>
      getButtonByText(
        detailsScreen!,
        'jointAccountCharges.save',
      ).props.onPress(),
    );
    expect(mockUpdateChargeMutation.mutate).toHaveBeenCalledWith(
      {
        chargeId: 'charge-1',
        input: {
          name: 'Brunch',
          amountMinorUnits: 1250,
          chargeDate: chargeDate.toISOString(),
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const updateOptions = mockUpdateChargeMutation.mutate.mock.calls[0]?.[1] as
      | { onSuccess?: () => void }
      | undefined;
    act(() => updateOptions?.onSuccess?.());
    expect(getTextValues(detailsScreen!)).toContain(
      'jointAccountCharges.saved',
    );

    act(() =>
      getButtonByText(
        detailsScreen!,
        'jointAccountCharges.markPaid',
      ).props.onPress(),
    );
    expect(mockMarkPaidChargeMutation.mutate).toHaveBeenCalledWith('charge-1');

    mockMarkPaidChargeMutation.isPending = true;
    act(() => detailsScreen!.update(<JointAccountChargeDetailsScreen />));
    expect(getTextValues(detailsScreen!)).toContain(
      'jointAccountCharges.paymentPending',
    );
    expect(
      detailsScreen!.root
        .findAll((instance) => String(instance.type) === 'BadgeHost')
        .map((badge) => badge.props.children),
    ).toContain('jointAccountCharges.unpaid');
    expect(
      getButtonByText(detailsScreen!, 'jointAccountCharges.markPaid').props
        .isDisabled,
    ).toBe(true);
    mockMarkPaidChargeMutation.isPending = false;

    act(() => detailsScreen!.unmount());
  });

  it('shows who last edited the charge and when', () => {
    const updatedAt = '2025-01-02T03:04:05.000Z';
    mockChargeDetailsQuery.data = {
      ...mockCharge,
      updatedByUserId: 'user-2',
      updatedAt,
    };

    let detailsScreen: ReactTestRenderer;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });

    expect(getTextValues(detailsScreen!)).toContain(
      'jointAccountCharges.lastEditedBy',
    );
    expect(getTextValues(detailsScreen!)).toContain('Amy');
    expect(getTextValues(detailsScreen!)).toContain(
      'jointAccountCharges.lastEditedAt',
    );
    expect(getTextValues(detailsScreen!)).toContain(
      format(new Date(updatedAt), 'PPpp', { locale: enUS }),
    );

    act(() => detailsScreen!.unmount());
  });

  it.each([
    ['en', enUS],
    ['es', es],
    ['de', de],
  ] as const)(
    'formats charge dates for %s in the list and details',
    (locale, dateLocale) => {
      mockLocale = locale;
      const listScreen = renderScreen();
      const renderItem = getListProps(listScreen).renderItem;
      if (!renderItem) throw new Error('Expected a charge list renderer.');

      let row!: ReactTestRenderer;
      act(() => {
        row = renderer.create(
          <>{renderItem({ item: mockCharge, index: 0, target: 'Cell' })}</>,
        );
      });
      expect(getTextValues(row)).toContain(
        new Date(mockCharge.chargeDate).toLocaleDateString(locale),
      );
      act(() => row.unmount());

      const updatedAt = '2025-01-02T03:04:05.000Z';
      mockChargeDetailsQuery.data = {
        ...mockCharge,
        createdByUserId: 'user-2',
        updatedByUserId: 'user-2',
        updatedAt,
      };
      let details!: ReactTestRenderer;
      act(() => {
        details = renderer.create(<JointAccountChargeDetailsScreen />);
      });
      expect(getTextValues(details)).toContain(
        new Date(mockCharge.chargeDate).toLocaleDateString(locale),
      );
      expect(getTextValues(details)).toContain(
        format(new Date(updatedAt), 'PPpp', { locale: dateLocale }),
      );
      act(() => details.unmount());
    },
  );

  it('renders charge detail authentication, loading, and error states', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    let detailsScreen: ReactTestRenderer;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });
    expect(getTextValues(detailsScreen!)).toContain('paymentRequests.signIn');
    act(() => detailsScreen!.unmount());

    mockAuth.isAuthenticated = true;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });
    expect(getTextValues(detailsScreen!)).toEqual([
      'auth.signedIn',
      'auth.profileUnavailable',
    ]);
    act(() => detailsScreen!.unmount());

    mockAuth.user = { subject: 'user-1' };
    mockChargeDetailsQuery.data = undefined;
    mockChargeDetailsQuery.isLoading = true;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });
    expect(getTextValues(detailsScreen!)).toContain('common.loading');
    act(() => detailsScreen!.unmount());

    mockChargeDetailsQuery.isLoading = false;
    mockChargeDetailsQuery.error = new Error('Charge unavailable');
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });
    expect(getTextValues(detailsScreen!)).toContain('Charge unavailable');
    act(() => detailsScreen!.unmount());
  });

  it('shows a paid charge read-only to another member and reports member errors', () => {
    mockChargeDetailsQuery.data = {
      ...mockCharge,
      createdByUserId: 'user-2',
      status: 'paid',
    };
    mockChargeMembersQuery.error = new Error('Members unavailable');

    let detailsScreen: ReactTestRenderer;
    act(() => {
      detailsScreen = renderer.create(<JointAccountChargeDetailsScreen />);
    });

    expect(
      detailsScreen!.root
        .findAll((instance) => String(instance.type) === 'BadgeHost')
        .map((badge) => badge.props.children),
    ).toContain('jointAccountCharges.paid');
    expect(getTextValues(detailsScreen!)).toContain('Members unavailable');
    expect(
      detailsScreen!.root.findAll(
        (instance) => String(instance.type) === 'InputHost',
      ),
    ).toHaveLength(0);
    expect(
      detailsScreen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'common.delete',
      ),
    ).toHaveLength(0);
    expect(
      detailsScreen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'jointAccountCharges.save',
      ),
    ).toHaveLength(0);
    expect(
      detailsScreen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'jointAccountCharges.markPaid',
      ),
    ).toHaveLength(0);

    act(() => detailsScreen!.unmount());
  });
});
