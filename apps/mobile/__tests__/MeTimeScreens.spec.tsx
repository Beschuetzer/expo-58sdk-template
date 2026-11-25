import type {
  MeTime,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import React, { type ReactNode } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import EditMeTimeScreen from '../app/(tabs)/(time)/EditMeTimeScreen';
import MeTimeDetailsScreen from '../app/(tabs)/(time)/MeTimeDetailsScreen';
import ViewAllMeTimeScreen from '../app/(tabs)/(time)/ViewAllMeTimeScreen';
import TimeHomeScreen from '../app/(tabs)/(time)/index';

import type {
  ThemeAwareSearchFilterState,
  ThemeAwareSearchRow,
} from '@/components/ui/ThemeAwareSearch';
import { AppRoutePaths } from '@/constants/navigation';
import type { MeTimeDateTimeFilters } from '@/features/time/filters';

const mockRouterNavigate = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterDismissTo = jest.fn();
const mockUpdateMeTime = jest.fn();
let mockTranslationOverrides: Record<string, string> = {};
const mockMeTime: MeTime = {
  id: 'me-time-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  startTime: '2026-10-29T10:00:00.000Z',
  endTime: '2026-10-29T11:00:00.000Z',
  description: 'Reading',
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
};
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
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
};
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string; claims: Record<string, unknown> } | null;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1', claims: {} },
};
let mockTimeRouteParams: {
  id?: string | string[];
  relationshipId?: string | string[];
  detailNavigationSource?: string | string[];
} = {
  id: 'me-time-1',
  relationshipId: 'relationship-1',
};
const mockRelationshipsQuery = {
  data: [mockRelationship] as RelationshipSummary[] | undefined,
  error: null as Error | null,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};
const mockMembersQuery: {
  data: RelationshipSummary['members'] | undefined;
  error: Error | null;
  isLoading: boolean;
} = {
  data: mockRelationship.members,
  error: null as Error | null,
  isLoading: false,
};
const mockMeTimeQuery = {
  data: { pages: [{ items: [mockMeTime] }] } as
    | { pages: { items: MeTime[] }[] }
    | undefined,
  error: null as Error | null,
  fetchNextPage: jest.fn().mockResolvedValue(undefined),
  hasNextPage: false,
  isFetchNextPageError: false,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};
const mockMeTimeCalendarQuery = {
  data: undefined as
    | {
        earliestStartTime: string | null;
        latestStartTime: string | null;
        entries: MeTime[];
      }
    | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockMeTimeEntryQuery = {
  data: mockMeTime as MeTime | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockUpdateMeTimeMutation = {
  error: null as Error | null,
  isPending: false,
  mutateAsync: mockUpdateMeTime,
};
const mockUseMeTimeCalendarQuery = jest.fn(
  (_relationshipId: string | undefined, _month: string, _enabled?: boolean) =>
    mockMeTimeCalendarQuery,
);
const mockUseMeTimeInfiniteQuery = jest.fn();
let mockSelectedRelationshipId: string | undefined = 'relationship-1';
let mockColorScheme: string | undefined = 'light';
const mockSearchState = {
  hasActiveFilters: false,
  isFilterStateValid: true,
  items: undefined as MeTime[] | undefined,
  searchControls: null as ReactNode,
};
type CapturedSearchProps = {
  clearFilters?: { label: string; variant?: string };
  filterItems?: (
    items: MeTime[],
    state: ThemeAwareSearchFilterState<MeTimeDateTimeFilters>,
  ) => MeTime[];
  filterRows?: readonly ThemeAwareSearchRow<MeTimeDateTimeFilters>[];
  initialFilters?: MeTimeDateTimeFilters;
  isFilterStateValid?: (
    state: ThemeAwareSearchFilterState<MeTimeDateTimeFilters>,
  ) => boolean;
  sort?: {
    field: {
      initialValue: string;
      options: { getValue: (item: MeTime) => unknown; value: string }[];
    };
    order: { initialValue: string; options: { value: string }[] };
    tieBreaker: (left: MeTime, right: MeTime) => number;
  };
};
let mockCapturedSearchProps: CapturedSearchProps | undefined;

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
    useLocalSearchParams: () => mockTimeRouteParams,
    useRouter: () => ({
      dismissTo: mockRouterDismissTo,
      navigate: mockRouterNavigate,
      push: mockRouterPush,
    }),
  };
});

jest.mock('@/features/time/components/MeTimeListSkeleton', () => ({
  MeTimeListSkeleton: 'MeTimeListSkeletonHost',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
}));

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicatorHost',
  ScrollView: 'ScrollViewHost',
  View: 'ViewHost',
  Text: 'TextHost',
  TouchableOpacity: 'TouchableOpacityHost',
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

jest.mock('@/components/ui/MainTabNavigationMenu', () => ({
  MainTabNavigationMenu: 'MainTabNavigationMenuHost',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/ThemeAwareInfiniteScrollList', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareInfiniteScrollList: ({
      children,
      data,
      renderItem,
      ...props
    }: {
      children?: ReactNode;
      data: MeTime[];
      renderItem: (info: { item: MeTime; index: number }) => ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        'ListHost',
        { ...props, data },
        ...data.map((item, index) => renderItem({ item, index })),
        children,
      ),
  };
});

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

jest.mock('@/components/ui/ThemeAwareSearch', () => ({
  ThemeAwareSearch: ({
    clearFilters,
    children,
    filterItems,
    filterRows,
    initialFilters,
    isFilterStateValid,
    items,
    sort,
  }: {
    children: (props: {
      items: MeTime[];
      searchControls: ReactNode;
      hasActiveFilters: boolean;
      isFilterStateValid: boolean;
    }) => ReactNode;
    filterItems?: CapturedSearchProps['filterItems'];
    filterRows?: CapturedSearchProps['filterRows'];
    initialFilters: MeTimeDateTimeFilters;
    clearFilters?: CapturedSearchProps['clearFilters'];
    isFilterStateValid?: CapturedSearchProps['isFilterStateValid'];
    items: MeTime[];
    sort?: CapturedSearchProps['sort'];
  }) => {
    mockCapturedSearchProps = {
      clearFilters,
      filterItems,
      filterRows,
      initialFilters,
      isFilterStateValid,
      sort,
    };
    return children({
      items: mockSearchState.items ?? items,
      searchControls: mockSearchState.searchControls,
      hasActiveFilters: mockSearchState.hasActiveFilters,
      isFilterStateValid: mockSearchState.isFilterStateValid,
    });
  },
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'SkeletonHost',
}));

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'InputHost',
}));

jest.mock('@/components/ui/ThemeAwareTimePicker', () => ({
  ThemeAwareTimePicker: 'TimePickerHost',
}));

jest.mock('@/components/ui/ThemeAwareCalendar', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareCalendar: (props: Record<string, unknown>) =>
      React.createElement('ThemeAwareCalendarHost', props),
  };
});

jest.mock('@/components/ui/ThemedModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemedModal: ({
      children,
      ...props
    }: {
      children: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ThemedModalHost', props, children),
  };
});

jest.mock('@gluestack-ui/core/modal/creator', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createHost =
    (name: string) =>
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(name, props, children);

  return {
    createModal: () => {
      const Root = ({
        children,
        isOpen,
        ...props
      }: Record<string, unknown> & {
        children?: React.ReactNode;
        isOpen?: boolean;
      }) =>
        React.createElement(
          'ThemedModalHost',
          { ...props, isVisible: isOpen },
          children,
        );

      return Object.assign(Root, {
        Backdrop: createHost('CalendarBackdropHost'),
        Body: createHost('CalendarBodyHost'),
        CloseButton: createHost('CalendarCloseButtonHost'),
        Content: createHost('CalendarContentHost'),
        Footer: createHost('CalendarFooterHost'),
        Header: createHost('CalendarHeaderHost'),
      });
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const animation = {
    duration: () => animation,
    easing: () => animation,
    withInitialValues: () => animation,
  };

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component: unknown) => component,
    },
    Easing: { linear: 0 },
    FadeIn: animation,
    FadeOut: animation,
    ZoomIn: animation,
  };
});

jest.mock('@/components/ui/button', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createComponent =
    (name: string) =>
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(name, props, children);
  return {
    Button: createComponent('CalendarButtonHost'),
    ButtonText: createComponent('CalendarButtonTextHost'),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Text: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('TextHost', props, children),
  };
});

jest.mock('@/components/ui/useThemeAwareTypography', () => ({
  useThemeAwareTypography: () => ({ fontFamily: 'System' }),
}));

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: 'light',
    getTextColor: (onSolidBackground = false) =>
      onSolidBackground ? '#ffffff' : '#000',
    textColor: '#000',
  }),
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
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipMembersQuery: () => mockMembersQuery,
  useRelationshipsQuery: () => mockRelationshipsQuery,
}));

jest.mock('@/features/time/hooks/useTime', () => ({
  useDeleteMeTimeMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useMeTimeCalendarQuery: (
    relationshipId: string | undefined,
    month: string,
    enabled?: boolean,
  ) => mockUseMeTimeCalendarQuery(relationshipId, month, enabled),
  useMeTimeEntryQuery: () => mockMeTimeEntryQuery,
  useMeTimeInfiniteQuery: (
    relationshipId: string | undefined,
    enabled: boolean,
  ) => {
    mockUseMeTimeInfiniteQuery(relationshipId, enabled);
    return mockMeTimeQuery;
  },
  useUpdateMeTimeMutation: () => mockUpdateMeTimeMutation,
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
  useI18n: () => ({
    locale: 'en-US',
    t: (key: string) => mockTranslationOverrides[key] ?? key,
  }),
}));

describe('Me Time screens', () => {
  let screen: ReactTestRenderer | undefined;

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
    mockTranslationOverrides = {};
    jest.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1', claims: {} };
    mockTimeRouteParams = {
      id: 'me-time-1',
      relationshipId: 'relationship-1',
      detailNavigationSource: undefined,
    };
    mockRelationshipsQuery.data = [mockRelationship];
    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.refetch.mockReset();
    mockMembersQuery.data = mockRelationship.members;
    mockMembersQuery.error = null;
    mockMembersQuery.isLoading = false;
    mockMeTimeQuery.data = { pages: [{ items: [mockMeTime] }] };
    mockMeTimeQuery.error = null;
    mockMeTimeQuery.fetchNextPage.mockReset().mockResolvedValue(undefined);
    mockMeTimeQuery.hasNextPage = false;
    mockMeTimeQuery.isFetchNextPageError = false;
    mockMeTimeQuery.isFetchingNextPage = false;
    mockMeTimeQuery.isLoading = false;
    mockMeTimeQuery.isRefetching = false;
    mockMeTimeQuery.refetch.mockReset();
    mockMeTimeCalendarQuery.data = undefined;
    mockMeTimeCalendarQuery.error = null;
    mockMeTimeCalendarQuery.isLoading = false;
    mockMeTimeEntryQuery.data = mockMeTime;
    mockMeTimeEntryQuery.error = null;
    mockMeTimeEntryQuery.isLoading = false;
    mockUpdateMeTime.mockReset().mockResolvedValue(mockMeTime);
    mockUpdateMeTimeMutation.error = null;
    mockUpdateMeTimeMutation.isPending = false;
    mockUseMeTimeCalendarQuery.mockClear();
    mockUseMeTimeInfiniteQuery.mockClear();
    jest.useRealTimers();
    mockSelectedRelationshipId = 'relationship-1';
    mockColorScheme = 'light';
    mockSearchState.hasActiveFilters = false;
    mockSearchState.isFilterStateValid = true;
    mockSearchState.items = undefined;
    mockSearchState.searchControls = null;
    mockCapturedSearchProps = undefined;
  });

  function renderViewAll() {
    act(() => {
      screen = renderer.create(<ViewAllMeTimeScreen />);
    });
    return screen!;
  }

  function renderMeTimeDetails() {
    act(() => {
      screen = renderer.create(<MeTimeDetailsScreen />);
    });
    return screen!;
  }

  function renderEditMeTime() {
    act(() => {
      screen = renderer.create(<EditMeTimeScreen />);
    });
    return screen!;
  }

  function unmountScreen() {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  }

  function getList() {
    return screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
  }

  function getEmptyMessage() {
    const empty = getList().props.ListEmptyComponent as React.ReactElement<{
      children?: ReactNode;
    }> | null;
    return empty?.props.children;
  }

  function renderMeTimeFixedHeader() {
    const fixedHeader = getList().props
      .fixedHeaderContent as React.ReactElement;
    let header: ReactTestRenderer;
    act(() => {
      header = renderer.create(fixedHeader);
    });
    return header!;
  }

  function getMeTimeTextChildren(testRenderer: ReactTestRenderer) {
    return testRenderer.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children)
      .join(' ');
  }

  it('sorts time actions by name and shows pressed feedback', () => {
    mockTranslationOverrides = {
      'time.viewAllMeTime': 'View all Me time',
      'time.createMeTime': 'Create Me time',
      'time.viewAllTasks': 'View incomplete tasks',
      'time.viewCompletedTasks': 'View completed tasks',
      'time.createTask': 'Create a task',
    };

    act(() => {
      screen = renderer.create(<TimeHomeScreen />);
    });

    const actions = screen!.root.findAll(
      (instance) =>
        typeof instance.props.accessibilityLabel === 'string' &&
        instance.props.accessibilityRole === 'button' &&
        typeof instance.props.onPress === 'function',
    );
    expect(actions.map((action) => action.props.accessibilityLabel)).toEqual([
      'Create a task',
      'Create Me time',
      'View all Me time',
      'View completed tasks',
      'View incomplete tasks',
    ]);
    expect(actions[0]?.props.activeOpacity).toBe(0.75);

    act(() => {
      actions.forEach((action) => action.props.onPress());
    });
    expect(mockRouterPush.mock.calls).toEqual([
      [AppRoutePaths.createTask],
      [AppRoutePaths.createMeTime],
    ]);
    expect(mockRouterNavigate.mock.calls).toEqual([
      [AppRoutePaths.viewAllMeTime],
      [AppRoutePaths.viewAllCompletedTasks],
      [AppRoutePaths.viewAllIncompleteTasks],
    ]);
  });

  it('opens the detail screen when an entry tile is pressed', () => {
    act(() => {
      screen = renderer.create(<ViewAllMeTimeScreen />);
    });

    const tile = screen!.root.find(
      (instance) => String(instance.type) === 'TouchableOpacityHost',
    );
    act(() => tile.props.onPress());

    expect(mockRouterNavigate).toHaveBeenCalledWith({
      pathname: '/(tabs)/(time)/MeTimeDetailsScreen',
      params: {
        id: mockMeTime.id,
        relationshipId: mockRelationship.id,
        detailNavigationSource: 'meTime',
      },
    });
  });

  it('shows the current month total in the fixed Me time header', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 12, 12));
    const firstEntry: MeTime = {
      ...mockMeTime,
      id: 'me-time-november-1',
      startTime: '2026-11-02T10:00:00.000Z',
      endTime: '2026-11-02T11:30:00.000Z',
    };
    const secondEntry: MeTime = {
      ...mockMeTime,
      id: 'me-time-november-2',
      startTime: '2026-11-05T12:00:00.000Z',
      endTime: '2026-11-05T12:45:00.000Z',
    };
    const otherMemberEntry: MeTime = {
      ...mockMeTime,
      id: 'me-time-november-other-member',
      createdByUserId: 'user-2',
      startTime: '2026-11-06T12:00:00.000Z',
      endTime: '2026-11-06T15:00:00.000Z',
    };
    mockMeTimeCalendarQuery.data = {
      earliestStartTime: firstEntry.startTime,
      latestStartTime: otherMemberEntry.startTime,
      entries: [firstEntry, secondEntry, otherMemberEntry],
    };

    renderViewAll();

    expect(mockUseMeTimeCalendarQuery).toHaveBeenCalledWith(
      'relationship-1',
      '2026-11',
      true,
    );
    const header = renderMeTimeFixedHeader();
    const headerText = getMeTimeTextChildren(header);

    expect(headerText).toContain('time.totalMeTimeThisMonth');
    expect(headerText).toContain('2 hr 15 min');
    act(() => header.unmount());
  });

  it('shows zero when current month entries belong only to another member', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 12, 12));
    const otherMemberEntry: MeTime = {
      ...mockMeTime,
      id: 'me-time-november-other-member',
      createdByUserId: 'user-2',
      startTime: '2026-11-06T12:00:00.000Z',
      endTime: '2026-11-06T15:00:00.000Z',
    };
    mockMeTimeCalendarQuery.data = {
      earliestStartTime: otherMemberEntry.startTime,
      latestStartTime: otherMemberEntry.startTime,
      entries: [otherMemberEntry],
    };

    renderViewAll();
    const header = renderMeTimeFixedHeader();

    expect(getMeTimeTextChildren(header)).toContain('0 min');
    act(() => header.unmount());
  });

  it('shows monthly-query errors and handles missing list cache data', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 12, 12));
    mockMeTimeQuery.data = undefined;
    mockMeTimeCalendarQuery.error = new Error('');

    renderViewAll();

    expect(getList().props.data).toEqual([]);
    expect(getList().props.detailNavigation.pageKey).toBe(0);
    let header = renderMeTimeFixedHeader();
    expect(getMeTimeTextChildren(header)).toContain('time.meTimeError');
    act(() => header.unmount());
    unmountScreen();

    mockMeTimeCalendarQuery.data = {
      earliestStartTime: null,
      latestStartTime: null,
      entries: [],
    };
    renderViewAll();
    header = renderMeTimeFixedHeader();
    const headerText = getMeTimeTextChildren(header);

    expect(headerText).toContain('0 min');
    expect(headerText).toContain('time.meTimeError');
    act(() => header.unmount());
  });

  it('shows and retries relationship refresh errors while entries stay available', () => {
    mockRelationshipsQuery.error = new Error('relationships refresh failed');
    renderViewAll();

    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'TextHost' &&
          instance.props.children === 'relationships refresh failed',
      ),
    ).not.toHaveLength(0);
    const retryButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'home.retry',
    );

    act(() => retryButton.props.onPress());

    expect(mockRelationshipsQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('renders the selected entry details', () => {
    renderMeTimeDetails();

    const renderedText = screen!.root
      .findAll(
        (instance) =>
          String(instance.type) === 'TextHost' ||
          String(instance.type) === 'HeadingHost',
      )
      .map((instance) => instance.props.children)
      .join(' ');

    expect(renderedText).toContain(mockMeTime.description);
    expect(renderedText).toContain('Alex');
    expect(renderedText).toContain('time.recordedAt');

    const themeAwareScreen = screen!.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    expect(themeAwareScreen.props.bottomContent).toBeDefined();
    const backButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.viewAllMeTime',
    );
    act(() => backButton.props.onPress());
    expect(mockRouterDismissTo).toHaveBeenCalledWith(
      '/(tabs)/(time)/ViewAllMeTimeScreen',
    );
  });

  it('shows who and when edited a Me Time entry', () => {
    const updatedAt = '2026-10-30T12:30:00.000Z';
    mockMeTimeEntryQuery.data = {
      ...mockMeTime,
      updatedAt,
      updatedByUserId: 'user-1',
    };
    renderMeTimeDetails();

    const renderedText = screen!.root
      .findAll(
        (instance) =>
          String(instance.type) === 'TextHost' ||
          String(instance.type) === 'HeadingHost',
      )
      .map((instance) => instance.props.children)
      .join(' ');

    expect(renderedText).toContain('time.lastEditedBy');
    expect(renderedText).toContain('time.lastEditedAt');
    expect(renderedText).toContain('Alex');
    expect(renderedText).toContain(new Date(updatedAt).toLocaleString('en-US'));
  });

  it('opens the edit screen with the selected Me Time entry', () => {
    renderMeTimeDetails();
    const editButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.editMeTime',
    );

    act(() => editButton.props.onPress());

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: AppRoutePaths.editMeTime,
      params: {
        id: mockMeTime.id,
        relationshipId: mockMeTime.relationshipId,
      },
    });
  });

  it('pins delete for the Me Time entry creator only', () => {
    renderMeTimeDetails();
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'time.editMeTime',
      ),
    ).toHaveLength(1);
    const deleteButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'common.delete',
    );
    expect(deleteButton.props.darkBackground).toBe('$error700');

    unmountScreen();
    mockAuth.user = { subject: 'user-2', claims: {} };
    renderMeTimeDetails();
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'common.delete',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'time.editMeTime',
      ),
    ).toHaveLength(0);
  });

  it('loads and saves edits to a Me Time entry', async () => {
    const updatedEntry = {
      ...mockMeTime,
      updatedAt: '2026-10-30T12:30:00.000Z',
      updatedByUserId: 'user-1',
    };
    mockUpdateMeTime.mockResolvedValue(updatedEntry);
    renderEditMeTime();

    const pickers = screen!.root.findAll(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    expect(pickers.map((picker) => picker.props.value.toISOString())).toEqual([
      mockMeTime.startTime,
      mockMeTime.endTime,
    ]);

    const saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.saveMeTime',
    );
    await act(async () => {
      saveButton.props.onPress();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(mockUpdateMeTime).toHaveBeenCalledWith({
      meTimeId: mockMeTime.id,
      input: {
        startTime: mockMeTime.startTime,
        endTime: mockMeTime.endTime,
        description: mockMeTime.description,
      },
    });
    expect(mockRouterDismissTo).toHaveBeenCalledWith({
      pathname: AppRoutePaths.meTimeDetails,
      params: {
        id: mockMeTime.id,
        relationshipId: mockMeTime.relationshipId,
      },
    });
  });

  it('resolves array route parameters and preserves the detail source', async () => {
    mockTimeRouteParams = {
      id: ['me-time-1'],
      relationshipId: ['relationship-1'],
      detailNavigationSource: ['meTime'],
    };
    renderEditMeTime();

    const saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.saveMeTime',
    );
    await act(async () => {
      saveButton.props.onPress();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(mockUpdateMeTime).toHaveBeenCalledWith({
      meTimeId: mockMeTime.id,
      input: {
        startTime: mockMeTime.startTime,
        endTime: mockMeTime.endTime,
        description: mockMeTime.description,
      },
    });
    expect(mockRouterDismissTo).toHaveBeenCalledWith({
      pathname: AppRoutePaths.meTimeDetails,
      params: {
        id: mockMeTime.id,
        relationshipId: mockMeTime.relationshipId,
        detailNavigationSource: 'meTime',
      },
    });
  });

  it('renders edit authentication, route, and query fallback states', () => {
    mockAuth.isAuthenticated = false;
    let edit = renderEditMeTime();
    expect(
      edit.root.findAll(
        (instance) => instance.props.children === 'paymentRequests.signIn',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockAuth.isAuthenticated = true;
    mockAuth.user = { claims: {} };
    edit = renderEditMeTime();
    expect(
      edit.root.findAll(
        (instance) => instance.props.children === 'auth.profileUnavailable',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockAuth.user = { subject: 'user-1', claims: {} };
    mockTimeRouteParams = { relationshipId: 'relationship-1' };
    edit = renderEditMeTime();
    expect(
      edit.root.findAll(
        (instance) => instance.props.children === 'time.meTimeNotFound',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockTimeRouteParams = {
      id: 'me-time-1',
      relationshipId: 'relationship-1',
    };
    mockMeTimeEntryQuery.isLoading = true;
    edit = renderEditMeTime();
    expect(
      edit.root.findAll(
        (instance) => instance.props.children === 'common.loading',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockMeTimeEntryQuery.isLoading = false;
    mockMeTimeEntryQuery.error = new Error('Me Time entry unavailable');
    edit = renderEditMeTime();
    expect(
      edit.root.findAll(
        (instance) => instance.props.children === 'Me Time entry unavailable',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockMeTimeEntryQuery.error = null;
    mockMeTimeEntryQuery.data = undefined;
    edit = renderEditMeTime();
    expect(
      edit.root.findAll(
        (instance) => instance.props.children === 'time.meTimeNotFound',
      ),
    ).not.toHaveLength(0);
  });

  it('prevents non-creators from opening the Me Time edit form', () => {
    mockAuth.user = { subject: 'user-2', claims: {} };
    const edit = renderEditMeTime();

    expect(
      edit.root.findAll(
        (instance) => instance.props.children === 'time.meTimeEditForbidden',
      ),
    ).not.toHaveLength(0);
    expect(
      edit.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'time.saveMeTime',
      ),
    ).toHaveLength(0);
  });

  it('renders detail authentication and route fallback states', () => {
    mockAuth.isAuthenticated = false;
    let details = renderMeTimeDetails();
    expect(
      details.root.findAll(
        (instance) => instance.props.children === 'paymentRequests.signIn',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    details = renderMeTimeDetails();
    expect(
      details.root.findAll(
        (instance) => instance.props.children === 'auth.profileUnavailable',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockAuth.user = { subject: 'user-1', claims: {} };
    mockTimeRouteParams = { relationshipId: 'relationship-1' };
    details = renderMeTimeDetails();
    expect(
      details.root.findAll(
        (instance) => instance.props.children === 'time.meTimeNotFound',
      ),
    ).not.toHaveLength(0);
  });

  it('renders detail query loading, error, and missing-entry states', () => {
    mockMeTimeEntryQuery.isLoading = true;
    let details = renderMeTimeDetails();
    expect(
      details.root.findAll(
        (instance) => instance.props.children === 'common.loading',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockMeTimeEntryQuery.isLoading = false;
    mockMeTimeEntryQuery.error = new Error('details unavailable');
    details = renderMeTimeDetails();
    expect(
      details.root.findAll(
        (instance) => instance.props.children === 'details unavailable',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockMeTimeEntryQuery.error = null;
    mockMeTimeEntryQuery.data = undefined;
    details = renderMeTimeDetails();
    expect(
      details.root.findAll(
        (instance) => instance.props.children === 'time.meTimeNotFound',
      ),
    ).not.toHaveLength(0);
  });

  it('renders an entry without a description and reports member lookup errors', () => {
    mockTimeRouteParams = {
      id: ['me-time-1'],
      relationshipId: ['relationship-1'],
    };
    mockMeTimeEntryQuery.data = { ...mockMeTime, description: undefined };
    mockMembersQuery.data = undefined;
    mockMembersQuery.error = new Error('members unavailable');

    const details = renderMeTimeDetails();
    const renderedText = details.root
      .findAll(
        (instance) =>
          String(instance.type) === 'TextHost' ||
          String(instance.type) === 'HeadingHost',
      )
      .map((instance) => instance.props.children)
      .join(' ');

    const screenHost = details.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    expect(screenHost.props.fixedHeaderContent.props.children).toBe(
      'time.meTime',
    );
    expect(renderedText).toContain('members unavailable');
    expect(renderedText).not.toContain('time.description');
  });

  it('keeps Me Time details visible while member names load', () => {
    mockMembersQuery.data = undefined;
    mockMembersQuery.error = null;
    mockMembersQuery.isLoading = true;
    const details = renderMeTimeDetails();

    expect(
      details.root.findAll(
        (instance) => String(instance.type) === 'SkeletonHost',
      ),
    ).not.toHaveLength(0);
    expect(
      details.root.findAll(
        (instance) => instance.props.children === 'time.createdBy',
      ),
    ).not.toHaveLength(0);
  });

  it('renders authentication and relationship fallback states', () => {
    mockAuth.isAuthenticated = false;
    let viewAll = renderViewAll();
    expect(
      viewAll.root.findAll(
        (instance) => instance.props.children === 'paymentRequests.signIn',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    viewAll = renderViewAll();
    expect(
      viewAll.root.findAll(
        (instance) => instance.props.children === 'auth.profileUnavailable',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockAuth.user = { subject: 'user-1', claims: {} };
    mockSelectedRelationshipId = undefined;
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isLoading = true;
    mockRelationshipsQuery.isFetching = true;
    viewAll = renderViewAll();
    expect(
      viewAll.root.findAll(
        (instance) => String(instance.type) === 'MeTimeListSkeletonHost',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.error = new Error('relationships unavailable');
    viewAll = renderViewAll();
    expect(
      viewAll.root.findAll(
        (instance) => instance.props.children === 'relationships unavailable',
      ),
    ).not.toHaveLength(0);
    unmountScreen();

    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.data = [];
    viewAll = renderViewAll();
    const openHomeButton = viewAll.root.find(
      (instance) => instance.props.children === 'rules.openHome',
    );
    act(() => openHomeButton.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(AppRoutePaths.home);
  });

  it('loads entries from the persisted relationship while metadata is pending', () => {
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isLoading = true;
    mockRelationshipsQuery.isFetching = true;
    renderViewAll();

    expect(mockUseMeTimeInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      true,
    );
    expect(getList().props.data).toEqual([mockMeTime]);
    expect(getList().props.loadingSpinner).toEqual(
      expect.objectContaining({
        type: 'MeTimeListSkeletonHost',
      }),
    );

    unmountScreen();
    mockRelationshipsQuery.data = [mockRelationship];
    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.isFetching = false;
    mockSelectedRelationshipId = 'stale-relationship';
    renderViewAll();
    expect(mockUseMeTimeInfiniteQuery).toHaveBeenLastCalledWith(
      undefined,
      true,
    );
    expect(
      screen!.root.findAll(
        (instance) =>
          instance.props.children === 'home.selectActiveRelationshipMessage',
      ),
    ).not.toHaveLength(0);
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'ListHost'),
    ).toHaveLength(0);
  });

  it('renders empty, loading, error, and filtered Me Time states', () => {
    mockMeTimeQuery.data = { pages: [{ items: [] }] };
    mockMeTimeQuery.isLoading = true;
    renderViewAll();
    expect(getList().props.isLoading).toBe(true);
    unmountScreen();

    mockMeTimeQuery.isLoading = false;
    mockMeTimeQuery.error = new Error('entries unavailable');
    renderViewAll();
    expect(getEmptyMessage()).toBe('entries unavailable');
    unmountScreen();

    mockMeTimeQuery.error = null;
    renderViewAll();
    expect(getEmptyMessage()).toBe('time.emptyMeTime');
    unmountScreen();

    mockSearchState.hasActiveFilters = true;
    mockSearchState.items = [];
    mockMeTimeQuery.hasNextPage = true;
    renderViewAll();
    expect(getEmptyMessage()).toBeFalsy();
    unmountScreen();

    mockMeTimeQuery.hasNextPage = false;
    mockMeTimeQuery.data = { pages: [{ items: [mockMeTime] }] };
    renderViewAll();
    expect(getEmptyMessage()).toBe('time.noFilteredMeTime');
  });

  it('renders load-more errors and invokes retry actions', () => {
    mockMeTimeQuery.isFetchNextPageError = true;
    mockMeTimeQuery.error = new Error('load-more failed');
    mockMeTimeQuery.isFetchingNextPage = true;
    renderViewAll();

    const footer = getList().props.ListFooterComponent as React.ReactElement;
    let footerScreen: ReactTestRenderer;
    act(() => {
      footerScreen = renderer.create(footer);
    });
    const retryButton = footerScreen!.root.find(
      (instance) => instance.props.children === 'home.retry',
    );
    expect(retryButton.props.isDisabled).toBe(true);
    expect(
      footerScreen!.root.findAll(
        (instance) => instance.props.children === 'load-more failed',
      ),
    ).not.toHaveLength(0);
    act(() => footerScreen!.unmount());
    unmountScreen();

    mockMeTimeQuery.error = null;
    mockMeTimeQuery.isFetchingNextPage = false;
    renderViewAll();
    const fallbackFooter = getList().props
      .ListFooterComponent as React.ReactElement;
    act(() => {
      footerScreen = renderer.create(fallbackFooter);
    });
    const retryAgain = footerScreen!.root.find(
      (instance) => instance.props.children === 'home.retry',
    );
    expect(
      footerScreen!.root.findAll(
        (instance) => instance.props.children === 'time.loadMoreMeTimeError',
      ),
    ).not.toHaveLength(0);
    act(() => retryAgain.props.onPress());
    expect(mockMeTimeQuery.fetchNextPage).toHaveBeenCalledTimes(1);
    act(() => footerScreen!.unmount());
  });

  it('configures search, sorting, header navigation, and row actions', () => {
    mockColorScheme = 'dark';
    const secondEntry = {
      ...mockMeTime,
      id: 'me-time-2',
      description: '',
    };
    mockMeTimeQuery.data = {
      pages: [{ items: [mockMeTime, secondEntry] }],
    };

    const viewAll = renderViewAll();
    const searchProps = mockCapturedSearchProps!;
    const noDateTimeFilters: MeTimeDateTimeFilters = {
      fromStartTime: null,
      toStartTime: null,
    };
    expect(
      searchProps.filterItems?.([mockMeTime, secondEntry], {
        search: 'reading',
        filters: noDateTimeFilters,
      }),
    ).toEqual([mockMeTime]);
    expect(
      searchProps.sort?.field.options.map((option) => option.value),
    ).toEqual(['startTime', 'createdBy']);
    expect(searchProps.sort?.field.options[0]?.getValue(mockMeTime)).toBe(
      mockMeTime.startTime,
    );
    expect(searchProps.sort?.field.options[1]?.getValue(mockMeTime)).toBe(
      'Alex',
    );
    expect(
      searchProps.sort?.tieBreaker(
        { ...mockMeTime, id: 'a' },
        { ...mockMeTime, id: 'b' },
      ),
    ).toBeLessThan(0);

    const list = getList();
    const stackScreen = viewAll.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const options = stackScreen.props.options as {
      headerRight: () => React.ReactElement;
    };
    let header: ReactTestRenderer;
    act(() => {
      header = renderer.create(options.headerRight());
    });
    const createButton = header!.root.find(
      (instance) => instance.props.accessibilityLabel === 'time.createMeTime',
    );
    act(() => createButton.props.onPress());
    expect(mockRouterPush).toHaveBeenCalledWith(AppRoutePaths.createMeTime);
    act(() => header!.unmount());

    const scrollToTop = jest.fn();
    const backToTop = (
      list.props.bottomContent as (props: {
        scrollToTop: () => void;
      }) => React.ReactElement<{ onPress: () => void }>
    )({ scrollToTop });
    act(() => backToTop.props.onPress());
    expect(scrollToTop).toHaveBeenCalledTimes(1);

    const blankDescriptionRow = viewAll.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'time.meTimeDetails' &&
        instance.props.accessibilityRole === 'button',
    );
    expect(blankDescriptionRow.props.activeOpacity).toBe(0.75);
    act(() => blankDescriptionRow.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith({
      pathname: AppRoutePaths.meTimeDetails,
      params: {
        id: secondEntry.id,
        relationshipId: mockRelationship.id,
        detailNavigationSource: 'meTime',
      },
    });
  });

  it('configures clearable start date-time range filters', () => {
    renderViewAll();

    const searchProps = mockCapturedSearchProps!;
    const dateTimeFields =
      searchProps.filterRows
        ?.flatMap((row) => ('fields' in row ? row.fields : []))
        .filter((field) => field.type === 'date') ?? [];
    const validFilters: MeTimeDateTimeFilters = {
      fromStartTime: new Date('2026-10-29T09:30:00.000Z'),
      toStartTime: new Date('2026-10-29T10:30:00.000Z'),
    };
    const invalidFilters: MeTimeDateTimeFilters = {
      fromStartTime: new Date('2026-10-29T11:00:00.000Z'),
      toStartTime: new Date('2026-10-29T10:00:00.000Z'),
    };
    const invalidDateTimeState = { filters: invalidFilters, search: '' };
    const invalidDateTimeMessage = searchProps.filterRows?.find(
      (row) => 'message' in row,
    );

    expect(searchProps.initialFilters).toEqual({
      fromStartTime: null,
      toStartTime: null,
    });
    expect(
      dateTimeFields.map(({ filterKey, label, mode, clearable }) => ({
        filterKey,
        label,
        mode,
        clearable,
      })),
    ).toEqual([
      {
        filterKey: 'fromStartTime',
        label: 'time.filterStartTimeFrom',
        mode: 'datetime',
        clearable: true,
      },
      {
        filterKey: 'toStartTime',
        label: 'time.filterStartTimeTo',
        mode: 'datetime',
        clearable: true,
      },
    ]);
    expect(searchProps.clearFilters).toEqual({
      label: 'time.clearFilters',
      variant: 'link',
    });
    expect(
      searchProps.isFilterStateValid?.({ filters: validFilters, search: '' }),
    ).toBe(true);
    expect(
      searchProps.filterItems?.([mockMeTime], {
        filters: validFilters,
        search: '',
      }),
    ).toEqual([mockMeTime]);
    expect(searchProps.isFilterStateValid?.(invalidDateTimeState)).toBe(false);
    expect(
      searchProps.filterItems?.([mockMeTime], invalidDateTimeState),
    ).toEqual([]);
    expect(
      invalidDateTimeMessage && 'showWhen' in invalidDateTimeMessage
        ? invalidDateTimeMessage.showWhen?.(invalidDateTimeState)
        : false,
    ).toBe(true);
  });

  it('opens the calendar and lists every Me time entry for a selected day', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 29, 12));
    const secondEntry: MeTime = {
      ...mockMeTime,
      id: 'me-time-2',
      startTime: '2026-10-29T11:00:00.000Z',
      endTime: '2026-10-29T12:00:00.000Z',
      description: 'Walking',
    };
    const entryWithoutDescription: MeTime = {
      ...mockMeTime,
      id: 'me-time-3',
      description: undefined,
    };
    mockMeTimeCalendarQuery.data = {
      earliestStartTime: mockMeTime.startTime,
      latestStartTime: secondEntry.startTime,
      entries: [mockMeTime, secondEntry, entryWithoutDescription],
    };
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isLoading = true;
    mockRelationshipsQuery.isFetching = true;

    const viewAll = renderViewAll();
    const stackScreen = viewAll.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const options = stackScreen.props.options as {
      headerRight: () => React.ReactElement;
    };
    let header: ReactTestRenderer;
    act(() => {
      header = renderer.create(options.headerRight());
    });
    const calendarButton = header!.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'time.showMeTimeCalendar',
    );
    act(() => calendarButton.props.onPress());

    expect(mockUseMeTimeCalendarQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      '2026-10',
      true,
    );
    const calendar = viewAll.root.find(
      (instance) => String(instance.type) === 'ThemeAwareCalendarHost',
    );
    expect(calendar.props.calendarMonthId).toBe('2026-10-01');
    act(() => calendar.props.onDayPress('2026-10-29'));

    const modal = viewAll.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.isVisible).toBe(true);
    expect(
      modal.findAll(
        (instance) =>
          String(instance.type) === 'TextHost' &&
          (instance.props.children === 'Reading' ||
            instance.props.children === 'Walking' ||
            instance.props.children === 'time.meTime'),
      ),
    ).toHaveLength(3);
    const itemScrollView = modal.find(
      (instance) => String(instance.type) === 'ScrollViewHost',
    );
    expect(itemScrollView.props.nestedScrollEnabled).toBe(true);
    expect(itemScrollView.props.style).toEqual({ maxHeight: 280 });
    expect(
      modal.find((instance) => String(instance.type) === 'CalendarBodyHost')
        .props.scrollEnabled,
    ).toBe(true);
    act(() => header!.unmount());
  });
});
