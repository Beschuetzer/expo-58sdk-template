import type {
  PaymentRequest,
  PaymentRequestSummary,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import React, { type ReactNode } from 'react';
import renderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import ViewAllRequestsScreen from '../app/(tabs)/(requests)/ViewAllRequestsScreen';
import PaymentRequestDetailsScreen from '../app/payment-request/[id]';

import type {
  ThemeAwareSearchFilterState,
  ThemeAwareSearchProps,
} from '@/components/ui/ThemeAwareSearch';
import type { PaymentRequestStatusFilter } from '@/features/payment-requests/filters';

const mockRouterDismissTo = jest.fn();
const mockRouterNavigate = jest.fn();
const mockRouterPush = jest.fn();
const mockCreateRelationship = jest.fn();
const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn();
const mockScrollToTop = jest.fn();

type RequestSearchFilters = {
  category: string;
  createdByUserId: string;
  maximumAmountText: string;
  minimumAmountText: string;
  status: PaymentRequestStatusFilter;
};

let mockSearchFilterState: ThemeAwareSearchFilterState<RequestSearchFilters> = {
  search: '',
  filters: {
    category: '',
    createdByUserId: 'all',
    maximumAmountText: '',
    minimumAmountText: '',
    status: 'all',
  },
};
let mockSearchHasActiveFilters = false;
let mockSearchValidityOverride: boolean | undefined;
let mockSearchProps:
  | ThemeAwareSearchProps<PaymentRequestSummary, RequestSearchFilters>
  | undefined;

const mockRequest: PaymentRequestSummary = {
  id: 'request-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  title: 'Utility bill',
  amountMinorUnits: 4200,
  currency: 'USD',
  purchaseDate: '2026-01-01T00:00:00.000Z',
  categories: [],
  status: 'pending_approval',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const mockRequestDetails: PaymentRequest = {
  ...mockRequest,
  rationale: 'Shared utilities',
  requestedSplit: [],
  decisions: [],
  activity: [],
};
let mockPaymentRequestQueryData = mockRequestDetails;
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
      displayName: 'Alex',
      role: 'owner',
      active: true,
    },
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const mockMembersQuery = {
  data: mockRelationship.members as RelationshipSummary['members'] | undefined,
  error: null as Error | null,
  isLoading: false,
};
let mockIsAuthenticated = true;
let mockUser: { subject?: string; claims?: Record<string, unknown> } | null = {
  subject: 'user-1',
  claims: {},
};
let mockColorScheme: string | null = 'light';
let mockLocale = 'en';
let mockSelectedRelationshipId: string | null = 'relationship-1';
let mockRelationshipsData: RelationshipSummary[] | undefined = [
  mockRelationship,
];
let mockRelationshipsError: Error | null = null;
let mockRelationshipsLoading = false;
let mockRelationshipsFetching = false;
let mockCreateRelationshipPending = false;
let mockCreateRelationshipError: Error | null = null;
let mockRequestsData:
  | { pages: { items: PaymentRequestSummary[] }[] }
  | undefined = { pages: [{ items: [mockRequest] }] };
let mockRequestsError: Error | null = null;
let mockRequestsLoading = false;
let mockHasNextPage = false;
let mockIsFetchingNextPage = false;
let mockIsFetchNextPageError = false;
let mockIsRefetching = false;
const mockUsePaymentRequestsInfiniteQuery = jest.fn();

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
    useLocalSearchParams: () => ({ id: 'request-1' }),
    useRouter: () => ({
      dismissTo: mockRouterDismissTo,
      navigate: mockRouterNavigate,
      push: mockRouterPush,
      back: jest.fn(),
    }),
  };
});

jest.mock('react-native', () => ({
  View: 'ViewHost',
  Text: 'TextHost',
  TouchableOpacity: 'TouchableOpacityHost',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
}));

jest.mock(
  '@/features/payment-requests/components/PaymentRequestCalendarModal',
  () => ({
    PaymentRequestCalendarModal: 'PaymentRequestCalendarModalHost',
  }),
);

jest.mock(
  '@/features/payment-requests/components/PaymentRequestListSkeleton',
  () => ({
    PaymentRequestListSkeleton: 'PaymentRequestListSkeletonHost',
  }),
);

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

jest.mock('@/components/ui/ThemeAwareBadge', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareBadge: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      React.createElement('BadgeHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));

jest.mock('@/components/ui/ThemeAwareInfiniteScrollList', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareInfiniteScrollList: (props: {
      data: PaymentRequestSummary[];
      renderItem: (info: {
        item: PaymentRequestSummary;
        index: number;
      }) => ReactNode;
      ListEmptyComponent?: ReactNode;
      ListFooterComponent?: ReactNode;
      bottomContent?: (props: { scrollToTop: () => void }) => ReactNode;
      children?: ReactNode;
      [key: string]: unknown;
    }) => {
      const {
        children: listContent,
        data,
        renderItem,
        ListEmptyComponent,
        ListFooterComponent,
        bottomContent,
      } = props;
      const children = data.map((item, index) => renderItem({ item, index }));
      if (listContent) children.unshift(listContent);
      if (data.length === 0 && ListEmptyComponent) {
        children.push(ListEmptyComponent);
      }
      if (ListFooterComponent) children.push(ListFooterComponent);
      if (bottomContent) {
        children.push(bottomContent({ scrollToTop: mockScrollToTop }));
      }

      return React.createElement('ListHost', props, ...children);
    },
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'InputHost',
}));

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({
      bottomContent,
      children,
      ...props
    }: Record<string, unknown>) =>
      React.createElement(
        'ScreenHost',
        { ...props, bottomContent },
        children as React.ReactNode,
        bottomContent as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'ThemeAwareSkeletonHost',
}));

jest.mock('@/components/ui/ThemeAwareSearch', () => {
  return {
    getAlphabeticalSortValue: (values: readonly string[]) =>
      [...values]
        .sort((left, right) =>
          left.toLocaleLowerCase().localeCompare(right.toLocaleLowerCase()),
        )
        .join(', '),
    ThemeAwareSearch: (
      props: ThemeAwareSearchProps<PaymentRequestSummary, RequestSearchFilters>,
    ) => {
      mockSearchProps = props;
      const items = props.filterItems(props.items, mockSearchFilterState);
      return props.children({
        items: [...items],
        searchControls: null,
        hasActiveFilters: mockSearchHasActiveFilters,
        isFilterStateValid:
          mockSearchValidityOverride ??
          props.isFilterStateValid?.(mockSearchFilterState) ??
          true,
      });
    },
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
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

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockUser,
  }),
}));

jest.mock('@/features/auth/client', () => ({
  getDisplayNameFromClaims: () => 'Alex',
}));

jest.mock('@/features/payment-requests/form', () => {
  const actual = jest.requireActual<
    typeof import('@/features/payment-requests/form')
  >('@/features/payment-requests/form');
  return {
    ...actual,
    getMemberDisplayName: (
      _userId: string,
      members: { displayName?: string }[],
    ) => members[0]?.displayName ?? 'Alex',
  };
});

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useCancelPaymentRequestMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useCreateRelationshipMutation: () => ({
    error: mockCreateRelationshipError,
    isPending: mockCreateRelationshipPending,
    mutate: mockCreateRelationship,
  }),
  useDecidePaymentRequestMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useDeletePaymentRequestMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useUpdatePaymentRequestMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
    reset: jest.fn(),
  }),
  usePaymentRequestsInfiniteQuery: (
    relationshipId: string | undefined,
    enabled: boolean,
  ) => {
    mockUsePaymentRequestsInfiniteQuery(relationshipId, enabled);
    return {
      data: mockRequestsData,
      error: mockRequestsError,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: mockHasNextPage,
      isFetchNextPageError: mockIsFetchNextPageError,
      isFetching: mockIsRefetching,
      isFetchingNextPage: mockIsFetchingNextPage,
      isLoading: mockRequestsLoading,
      isRefetching: mockIsRefetching,
      refetch: mockRefetch,
    };
  },
  usePaymentRequestQuery: () => ({
    data: mockPaymentRequestQueryData,
    error: null,
    isLoading: false,
  }),
  useRelationshipMembersQuery: () => mockMembersQuery,
  useRelationshipsQuery: () => ({
    data: mockRelationshipsData,
    error: mockRelationshipsError,
    isFetching: mockRelationshipsFetching,
    isLoading: mockRelationshipsLoading,
    refetch: mockRefetch,
  }),
}));

jest.mock(
  '@/features/relationships/components/SelectedRelationshipNotice',
  () => ({
    SelectedRelationshipNotice: 'SelectedRelationshipNoticeHost',
  }),
);

jest.mock('@/state/store', () => ({
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ locale: mockLocale, t: (key: string) => key }),
}));

describe('ViewAllRequestsScreen', () => {
  let screen: ReactTestRenderer | undefined;

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockUser = { subject: 'user-1', claims: {} };
    mockColorScheme = 'light';
    mockLocale = 'en';
    mockSelectedRelationshipId = 'relationship-1';
    mockRelationshipsData = [mockRelationship];
    mockRelationshipsError = null;
    mockRelationshipsLoading = false;
    mockRelationshipsFetching = false;
    mockCreateRelationshipPending = false;
    mockCreateRelationshipError = null;
    mockRequestsData = { pages: [{ items: [mockRequest] }] };
    mockRequestsError = null;
    mockRequestsLoading = false;
    mockHasNextPage = false;
    mockIsFetchingNextPage = false;
    mockIsFetchNextPageError = false;
    mockIsRefetching = false;
    mockSearchFilterState = {
      search: '',
      filters: {
        category: '',
        createdByUserId: 'all',
        maximumAmountText: '',
        minimumAmountText: '',
        status: 'all',
      },
    };
    mockSearchHasActiveFilters = false;
    mockSearchValidityOverride = undefined;
    mockSearchProps = undefined;
    mockUsePaymentRequestsInfiniteQuery.mockClear();
    mockPaymentRequestQueryData = mockRequestDetails;
    mockMembersQuery.data = mockRelationship.members;
    mockMembersQuery.error = null;
    mockMembersQuery.isLoading = false;
  });

  function renderScreen() {
    if (screen) act(() => screen?.unmount());
    act(() => {
      screen = renderer.create(<ViewAllRequestsScreen />);
    });
    return screen!;
  }

  function getTextContents() {
    return screen!.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
  }

  it('renders the request status to the right of its title', () => {
    act(() => {
      screen = renderer.create(<ViewAllRequestsScreen />);
    });

    const titleRow = screen!.root
      .findAll((instance) => String(instance.type) === 'ViewHost')
      .find(
        (row) =>
          String(row.props.className).includes('justify-between') &&
          row.findAll(
            (instance) =>
              String(instance.type) === 'TextHost' &&
              instance.props.children === mockRequest.title,
          ).length > 0,
      );

    expect(titleRow).toBeDefined();
    expect(titleRow?.props.className).toContain('justify-between');

    const children = titleRow!.children.filter(
      (child): child is ReactTestInstance => typeof child !== 'string',
    );
    expect(children).toHaveLength(2);

    const title = children[0].find(
      (instance) => String(instance.type) === 'TextHost',
    );
    const status = children[1].find(
      (instance) => String(instance.type) === 'BadgeHost',
    );
    expect(title.props.children).toBe(mockRequest.title);
    expect(title.props.flex).toBe(1);
    expect(status.props.children).toBe('paymentRequests.submitted');
  });

  it('formats request dates in the selected German locale', () => {
    mockLocale = 'de';
    renderScreen();

    expect(getTextContents()).toContain(
      new Date(mockRequest.purchaseDate).toLocaleDateString('de'),
    );
  });

  it('renders authentication and relationship query states', () => {
    const cases: {
      configure: () => void;
      expectedChild: string;
      expectedType?: string;
      pressSignIn?: boolean;
    }[] = [
      {
        configure: () => {
          mockIsAuthenticated = false;
        },
        expectedChild: 'paymentRequests.signIn',
        pressSignIn: true,
      },
      {
        configure: () => {
          mockUser = { claims: {} };
        },
        expectedChild: 'auth.profileUnavailable',
      },
      {
        configure: () => {
          mockRelationshipsLoading = true;
          mockRelationshipsData = undefined;
          mockRelationshipsFetching = true;
          mockSelectedRelationshipId = null;
        },
        expectedChild: '',
        expectedType: 'PaymentRequestListSkeletonHost',
      },
      {
        configure: () => {
          mockRelationshipsError = new Error('Relationships unavailable');
        },
        expectedChild: 'paymentRequests.error',
      },
      {
        configure: () => {
          mockRelationshipsData = [];
        },
        expectedChild: 'paymentRequests.createRelationship',
      },
      {
        configure: () => {
          mockSelectedRelationshipId = 'missing-relationship';
        },
        expectedChild: 'home.selectActiveRelationshipMessage',
      },
    ];

    for (const testCase of cases) {
      mockIsAuthenticated = true;
      mockUser = { subject: 'user-1', claims: {} };
      mockRelationshipsData = [mockRelationship];
      mockRelationshipsError = null;
      mockRelationshipsLoading = false;
      mockRelationshipsFetching = false;
      mockSelectedRelationshipId = 'relationship-1';
      testCase.configure();

      renderScreen();
      const expectedElement = screen!.root.findAll(
        (instance) =>
          (testCase.expectedType !== undefined &&
            String(instance.type) === testCase.expectedType) ||
          (testCase.expectedChild !== '' &&
            instance.props.children === testCase.expectedChild),
      );
      expect(expectedElement).not.toHaveLength(0);

      if (testCase.pressSignIn) {
        act(() => expectedElement[0].props.onPress());
        expect(mockRouterNavigate).toHaveBeenCalledTimes(1);
        mockRouterNavigate.mockClear();
      }
    }
  });

  it('loads scoped requests while relationship metadata is pending or unavailable', () => {
    mockRelationshipsData = undefined;
    mockRelationshipsLoading = true;
    mockRelationshipsFetching = true;
    renderScreen();

    let list = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    expect(list.props.data).toEqual([mockRequest]);
    expect(mockUsePaymentRequestsInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      true,
    );
    expect(
      screen!.root.findAll(
        (instance) =>
          instance.props.children === 'home.selectActiveRelationshipMessage',
      ),
    ).toHaveLength(0);

    mockRelationshipsLoading = false;
    mockRelationshipsFetching = false;
    mockRelationshipsError = new Error('Relationships unavailable');
    renderScreen();
    list = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    expect(list.props.data).toEqual([mockRequest]);
    expect(getTextContents()).toContain('paymentRequests.error');
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'paymentRequests.retry',
      ),
    ).not.toHaveLength(0);
    expect(mockUsePaymentRequestsInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      true,
    );
  });

  it('creates a relationship only for a nonblank name and shows mutation states', () => {
    mockRelationshipsData = [];
    renderScreen();

    const getInput = () =>
      screen!.root.find((instance) => String(instance.type) === 'InputHost');
    const getSaveButton = () =>
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'paymentRequests.save',
      );

    expect(getInput().props.inputFieldProps.placeholder).toBe(
      'paymentRequests.relationshipName',
    );
    expect(getSaveButton().props.isDisabled).toBe(true);

    act(() => getInput().props.onChangeText('  Shared space  '));
    expect(getSaveButton().props.isDisabled).toBe(false);
    act(() => getSaveButton().props.onPress());
    expect(mockCreateRelationship).toHaveBeenCalledWith({
      name: '  Shared space  ',
      displayName: 'Alex',
    });

    mockCreateRelationshipPending = true;
    act(() => screen!.update(<ViewAllRequestsScreen />));
    expect(getSaveButton().props.isDisabled).toBe(true);

    mockCreateRelationshipPending = false;
    mockCreateRelationshipError = new Error('Unable to create relationship');
    act(() => screen!.update(<ViewAllRequestsScreen />));
    expect(getTextContents()).toContain('Unable to create relationship');
  });

  it('renders all request statuses and wires list navigation controls', () => {
    const statuses: PaymentRequestSummary['status'][] = [
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'cancelled',
    ];
    const requests: PaymentRequestSummary[] = statuses.map((status, index) => ({
      ...mockRequest,
      id: `request-${status}`,
      title: `Request ${status}`,
      status,
      categories: index === 0 ? ['Utilities', 'Water'] : [],
    }));
    mockRequestsData = { pages: [{ items: requests }] };
    renderScreen();

    const badges = screen!.root.findAll(
      (instance) => String(instance.type) === 'BadgeHost',
    );
    expect(badges.map((badge) => badge.props.children)).toEqual(
      expect.arrayContaining([
        'paymentRequests.draft',
        'paymentRequests.submitted',
        'paymentRequests.approved',
        'paymentRequests.rejected',
        'paymentRequests.cancelled',
        'Utilities',
        'Water',
      ]),
    );
    const approvedBadge = badges.find(
      (badge) => badge.props.children === 'paymentRequests.approved',
    );
    expect(approvedBadge?.props.lightBackground).toBe('$success100');
    expect(approvedBadge?.props.darkBackground).toBe('$success900');

    const row = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityRole === 'button' &&
        !instance.props.accessibilityLabel,
    )[0];
    expect(row.props.activeOpacity).toBe(0.75);
    act(() => row.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          id: 'request-draft',
          detailNavigationSource: 'paymentRequests',
        },
      }),
    );

    const stackScreen = screen!.root.find(
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
        instance.props.accessibilityLabel === 'paymentRequests.showCalendar',
    );
    act(() => calendarButton.props.onPress());
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'PaymentRequestCalendarModalHost',
      ).props.isVisible,
    ).toBe(true);

    const createRequestButton = header!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'paymentRequests.createRequest',
    );
    expect(createRequestButton.props.accessibilityLabel).toBe(
      'paymentRequests.createRequest',
    );
    act(() => createRequestButton.props.onPress());
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    act(() => header?.unmount());

    const awaitingDecisionLink = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel ===
          'paymentRequests.awaitingDecision',
    );
    act(() => awaitingDecisionLink.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledTimes(2);

    const list = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    expect(list.props.keyExtractor(requests[0])).toBe(requests[0].id);
    act(() => list.props.fetchNextPage());
    act(() => list.props.onRefresh());
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    const backToTopButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'common.backToTop',
    );
    act(() => backToTopButton.props.onPress());
    expect(mockScrollToTop).toHaveBeenCalledTimes(1);
  });

  it('filters requests and exposes the configured sort values', () => {
    const waterRequest: PaymentRequestSummary = {
      ...mockRequest,
      id: 'request-water',
      title: 'Water bill',
      status: 'approved',
      createdByUserId: 'user-2',
      amountMinorUnits: 5000,
      purchaseDate: '2025-03-01T00:00:00.000Z',
      categories: ['Water', 'Utilities'],
    };
    const groceryRequest: PaymentRequestSummary = {
      ...mockRequest,
      id: 'request-grocery',
      title: 'Groceries',
      status: 'pending_approval',
      amountMinorUnits: 1500,
      purchaseDate: '2025-01-03T00:00:00.000Z',
      categories: ['Food'],
    };
    const requests = [waterRequest, groceryRequest];
    mockRequestsData = { pages: [{ items: requests }] };
    renderScreen();

    const searchProps = mockSearchProps!;
    const filters = {
      category: '',
      createdByUserId: 'user-2',
      maximumAmountText: '60.00',
      minimumAmountText: '40.00',
      status: 'approved' as const,
    };
    expect(
      searchProps.filterRows?.some(
        (row) =>
          'fields' in row &&
          row.fields.some((field) => field.filterKey === 'category'),
      ),
    ).toBe(true);
    expect(searchProps.clearFilters?.label).toBe(
      'paymentRequests.clearFilters',
    );
    expect(
      searchProps
        .filterItems(requests, { search: 'utilities', filters })
        .map(({ id }) => id),
    ).toEqual(['request-water']);
    expect(
      searchProps
        .filterItems(requests, {
          search: '',
          filters: { ...filters, category: 'UTIL' },
        })
        .map(({ id }) => id),
    ).toEqual(['request-water']);
    expect(
      searchProps.filterItems(requests, {
        search: '',
        filters: { ...filters, minimumAmountText: 'invalid' },
      }),
    ).toEqual([]);
    expect(
      searchProps.filterItems(requests, {
        search: '',
        filters: {
          ...filters,
          maximumAmountText: '40',
          minimumAmountText: '60',
        },
      }),
    ).toEqual([]);

    const isFilterStateValid = searchProps.isFilterStateValid!;
    expect(isFilterStateValid({ search: '', filters })).toBe(true);
    expect(
      isFilterStateValid({
        search: '',
        filters: { ...filters, minimumAmountText: 'invalid' },
      }),
    ).toBe(false);
    expect(
      isFilterStateValid({
        search: '',
        filters: {
          ...filters,
          maximumAmountText: '40',
          minimumAmountText: '60',
        },
      }),
    ).toBe(false);

    const sort = searchProps.sort!;
    expect(
      sort.field.options.map(({ getValue }) => getValue(waterRequest)),
    ).toEqual([
      waterRequest.purchaseDate,
      waterRequest.title,
      'Utilities, Water',
      waterRequest.amountMinorUnits,
    ]);
    expect(sort.tieBreaker?.(waterRequest, groceryRequest)).toBe(
      waterRequest.id.localeCompare(groceryRequest.id),
    );
  });

  it('renders request empty states and retries failed next-page requests', () => {
    mockRequestsData = { pages: [{ items: [] }] };
    mockRequestsLoading = true;
    renderScreen();
    expect(
      screen!.root.find((instance) => String(instance.type) === 'ListHost')
        .props.isLoading,
    ).toBe(true);

    mockRequestsLoading = false;
    mockRequestsData = undefined;
    mockRequestsError = new Error('Requests unavailable');
    renderScreen();
    expect(getTextContents()).toContain('paymentRequests.error');

    mockRequestsError = null;
    mockRequestsData = { pages: [{ items: [] }] };
    renderScreen();
    expect(getTextContents()).toContain('paymentRequests.empty');

    mockRequestsData = { pages: [{ items: [mockRequest] }] };
    mockSearchFilterState = {
      search: 'missing request',
      filters: {
        category: '',
        createdByUserId: 'all',
        maximumAmountText: '',
        minimumAmountText: '',
        status: 'all',
      },
    };
    mockSearchHasActiveFilters = true;
    renderScreen();
    expect(getTextContents()).toContain('paymentRequests.noFilteredRequests');

    mockHasNextPage = true;
    renderScreen();
    expect(getTextContents()).not.toContain(
      'paymentRequests.noFilteredRequests',
    );

    mockSearchFilterState = {
      search: '',
      filters: {
        category: '',
        createdByUserId: 'all',
        maximumAmountText: '',
        minimumAmountText: 'invalid',
        status: 'all',
      },
    };
    renderScreen();
    expect(getTextContents()).toContain('paymentRequests.noFilteredRequests');

    mockSearchFilterState = {
      search: '',
      filters: {
        category: '',
        createdByUserId: 'all',
        maximumAmountText: '',
        minimumAmountText: '',
        status: 'all',
      },
    };
    mockIsFetchNextPageError = true;
    mockIsFetchingNextPage = false;
    renderScreen();
    const retryButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'paymentRequests.retry',
    );
    expect(retryButton.props.isDisabled).toBe(false);
    act(() => retryButton.props.onPress());
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);

    mockIsFetchingNextPage = true;
    renderScreen();
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'paymentRequests.retry',
      ).props.isDisabled,
    ).toBe(true);
  });

  it('keeps request details visible while member-name fields load', () => {
    mockPaymentRequestQueryData = {
      ...mockRequestDetails,
      decisions: [
        {
          id: 'decision-1',
          memberUserId: 'user-2',
          decision: 'approved',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      activity: [
        {
          id: 'event-1',
          actorUserId: 'user-2',
          eventType: 'edited',
          metadata: {},
          createdAt: '2026-01-03T00:00:00.000Z',
        },
      ],
    };
    mockMembersQuery.data = undefined;
    mockMembersQuery.isLoading = true;

    act(() => {
      screen = renderer.create(<PaymentRequestDetailsScreen />);
    });

    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareSkeletonHost',
      ),
    ).toHaveLength(2);
    expect(
      screen!.root.findAll(
        (instance) =>
          ['TextHost', 'HeadingHost'].includes(String(instance.type)) &&
          instance.props.children === mockRequestDetails.rationale,
      ),
    ).not.toHaveLength(0);
  });

  it('pins a button that returns payment request details to all requests', () => {
    act(() => {
      screen = renderer.create(<PaymentRequestDetailsScreen />);
    });

    const screenHost = screen!.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    expect(screenHost.props.bottomContent).toBeDefined();

    const backButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'paymentRequests.viewAllRequests',
    );
    act(() => backButton.props.onPress());

    expect(mockRouterDismissTo).toHaveBeenCalledWith(
      '/(tabs)/(requests)/ViewAllRequestsScreen',
    );
  });
});
