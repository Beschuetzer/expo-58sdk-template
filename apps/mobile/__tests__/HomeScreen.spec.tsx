import type { RelationshipSummary } from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import HomeScreen from '../app/(tabs)/(home)/index';
import RelationshipDetailsScreen from '../app/(tabs)/(home)/relationship/[id]';
import RelationshipJoinRequestDetailsScreen from '../app/relationship-join-request/[id]';

import { AppRoutePaths } from '@/constants/navigation';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';

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
const mockJoinRequestsQuery = {
  data: [] as
    | {
        id: string;
        requesterDisplayName?: string;
        requesterUserId: string;
      }[]
    | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockDecisionMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
const mockInvitationMutation = {
  isPending: false,
  mutateAsync: jest.fn().mockResolvedValue({ token: 'invite-token' }),
};
type MockJoinRequestDetails = {
  id: string;
  relationshipId: string;
  requesterUserId: string;
  requesterDisplayName?: string;
  status: 'pending' | 'approved' | 'rejected';
};
const mockJoinRequestDetailsQuery: {
  data: MockJoinRequestDetails | undefined;
  error: Error | null;
  isLoading: boolean;
} = {
  data: {
    id: 'request-1',
    relationshipId: 'relationship-1',
    requesterUserId: 'user-2',
    requesterDisplayName: 'Sam',
    status: 'pending' as const,
  },
  error: null as Error | null,
  isLoading: false,
};
let mockRelationshipRouteParams: {
  id?: string | string[];
  relationshipId?: string | string[];
} = {
  id: 'relationship-1',
};
const mockRouterNavigate = jest.fn();
const mockRouterDismissTo = jest.fn();
const mockRouterPush = jest.fn();
const mockDispatch = jest.fn();
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string; claims: Record<string, unknown> } | null;
} = {
  isAuthenticated: true,
  user: null,
};
let mockSelectedRelationshipId: string | undefined = 'relationship-1';
let mockColorScheme: 'light' | 'dark' = 'light';
const mockCreateRelationshipMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutate: jest.fn(),
};

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('expo-image', () => ({
  Image: 'HomeCardImageHost',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'HomeCardGradientHost',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useLocalSearchParams: () => mockRelationshipRouteParams,
    useRouter: () => ({
      dismissTo: mockRouterDismissTo,
      navigate: mockRouterNavigate,
      push: mockRouterPush,
    }),
  };
});

jest.mock('react-native', () => ({
  FlatList: ({
    data,
    horizontal,
    renderItem,
    ...props
  }: {
    data: unknown[];
    horizontal?: boolean;
    renderItem: (info: {
      item: unknown;
      index: number;
    }) => import('react').ReactNode;
    [key: string]: unknown;
  }) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement(
      'FlatListHost',
      { ...props, data, horizontal },
      ...data.map((item, index) => renderItem({ item, index })),
    );
  },
  View: 'ViewHost',
  Text: 'TextHost',
  TouchableOpacity: 'TouchableOpacityHost',
  Share: {
    share: jest.fn(async () => ({ action: 'sharedAction' })),
  },
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    DetailNavigationCollectionRegistration:
      'DetailNavigationCollectionRegistrationHost',
    DetailSwipeNavigator: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('DetailSwipeNavigatorHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareLoadingIndicator', () => ({
  ThemeAwareLoadingIndicator: 'ThemeAwareLoadingIndicatorHost',
}));

jest.mock('@/components/ui/ThemedModal', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemedModal: ({
      children,
      isVisible,
      ...props
    }: Record<string, unknown> & {
      children?: React.ReactNode;
      isVisible: boolean;
    }) =>
      isVisible
        ? React.createElement('ThemedModalHost', props, children)
        : null,
  };
});

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

jest.mock('@/components/ui/MainTabNavigationMenu', () => ({
  MainTabNavigationMenu: 'MainTabNavigationMenuHost',
}));

jest.mock('@/components/ui/ThemeAwareDropdown', () => ({
  ThemeAwareDropdown: 'ThemeAwareDropdownHost',
}));

jest.mock('@/components/ui/button', () => ({
  ButtonIcon: 'ButtonIconHost',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareButtonHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareInfiniteScrollList', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareInfiniteScrollList: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ThemeAwareInfiniteScrollListHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'ThemeAwareInputHost',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({
      bottomContent,
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        'ThemeAwareScreenHost',
        { ...props, bottomContent },
        children,
        bottomContent as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareSurface: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareSurfaceHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createComponent =
    (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children as React.ReactNode);

  return {
    ThemeAwareHeading: createComponent('ThemeAwareHeadingHost'),
    ThemeAwareText: createComponent('ThemeAwareTextHost'),
  };
});

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/auth/client', () => ({
  createInvitationUrl: jest.fn(
    (token: string) => `https://example.test/invitations/${token}`,
  ),
  getDisplayNameFromClaims: jest.fn(),
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useCreateRelationshipInvitationMutation: () => mockInvitationMutation,
  useCreateRelationshipMutation: () => mockCreateRelationshipMutation,
  useDecideRelationshipJoinRequestMutation: () => mockDecisionMutation,
  useDeleteRelationshipJoinRequestMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useDeleteRelationshipMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useRelationshipJoinRequestQuery: () => mockJoinRequestDetailsQuery,
  useRelationshipJoinRequestsQuery: jest.fn(() => mockJoinRequestsQuery),
  useRelationshipMembersQuery: () => mockMembersQuery,
  useRelationshipsQuery: jest.fn(),
}));

jest.mock(
  '@/features/relationships/components/RelationshipActivationButton',
  () => ({
    RelationshipActivationButton: 'RelationshipActivationButtonHost',
  }),
);

jest.mock('@/state/slices/generalSlice', () => ({
  selectedRelationshipIdSelector: jest.fn(),
  setSelectedRelationshipId: (id: string) => ({
    payload: id,
    type: 'general/setSelectedRelationshipId',
  }),
}));

jest.mock('@/state/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ locale: 'en', t: (key: string) => key }),
}));

jest.mock('@/utils/logging', () => ({
  logError: jest.fn(),
}));

const mockUseRelationshipsQuery = jest.mocked(useRelationshipsQuery);
const mockUseJoinRequestsQuery = jest.requireMock(
  '@/features/payment-requests/hooks/usePaymentRequests',
).useRelationshipJoinRequestsQuery as jest.Mock;
const mockGetDisplayNameFromClaims = jest.requireMock('@/features/auth/client')
  .getDisplayNameFromClaims as jest.Mock;
const mockCreateInvitationUrl = jest.requireMock('@/features/auth/client')
  .createInvitationUrl as jest.Mock;
const mockShare = jest.requireMock('react-native').Share.share as jest.Mock;

function createRelationshipsQueryResult(
  data: RelationshipSummary[],
): ReturnType<typeof useRelationshipsQuery> {
  const result: ReturnType<typeof useRelationshipsQuery> = {
    data,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    refetch: jest.fn(),
    status: 'success',
    fetchStatus: 'idle',
    promise: Promise.resolve(data),
  };

  return result;
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    mockSelectedRelationshipId = 'relationship-1';
    mockColorScheme = 'light';
    mockCreateRelationshipMutation.error = undefined;
    mockCreateRelationshipMutation.isPending = false;
    mockCreateRelationshipMutation.mutate.mockReset();
    mockGetDisplayNameFromClaims.mockReturnValue('Alex');
    mockUseRelationshipsQuery.mockReturnValue(
      createRelationshipsQueryResult([mockRelationship]),
    );
  });

  it('renders home items with bundled artwork and theme-aware gradients', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    const images = screen!.root.findAll(
      (instance) => String(instance.type) === 'HomeCardImageHost',
    );
    const lightGradients = screen!.root.findAll(
      (instance) => String(instance.type) === 'HomeCardGradientHost',
    );
    expect(images).toHaveLength(19);
    expect(new Set(images.map((image) => image.props.source)).size).toBe(19);
    expect(lightGradients).toHaveLength(images.length);

    const lightGradientColors = lightGradients[0].props.colors;
    mockColorScheme = 'dark';
    act(() => screen!.update(<HomeScreen />));

    const darkGradients = screen!.root.findAll(
      (instance) => String(instance.type) === 'HomeCardGradientHost',
    );
    expect(darkGradients).toHaveLength(images.length);
    expect(darkGradients[0].props.colors).not.toEqual(lightGradientColors);

    act(() => screen!.unmount());
  });

  it('shows the active relationship heading and selector before home sections', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    const activeRelationshipTitle = 'home.activeRelationshipHeader';
    const dropdown = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareDropdownHost',
    );
    expect(dropdown.props).toEqual(
      expect.objectContaining({
        options: [
          { label: 'home.addRelationship', value: '__add_relationship__' },
          { label: 'Shared space', value: 'relationship-1' },
        ],
        placeholder: 'home.selectActiveRelationship',
        selectedValue: 'relationship-1',
      }),
    );
    const relationshipCardSurface = screen!.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
    )[0];
    expect(relationshipCardSurface.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ elevation: 2, zIndex: 2 }),
      ]),
    );

    const contentOrder = screen!.root
      .findAll((instance) =>
        [
          'ThemeAwareHeadingHost',
          'ThemeAwareDropdownHost',
          'TouchableOpacityHost',
        ].includes(String(instance.type)),
      )
      .map((instance) => {
        const type = String(instance.type);
        if (type === 'ThemeAwareHeadingHost') {
          return instance.props.children;
        }
        return type === 'ThemeAwareDropdownHost'
          ? type
          : instance.props.accessibilityLabel;
      });
    expect(contentOrder.slice(0, 3)).toEqual([
      activeRelationshipTitle,
      'ThemeAwareDropdownHost',
      'home.awaitingDecision',
    ]);

    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareInfiniteScrollListHost',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      ),
    ).toHaveLength(1);
    expect(
      screen!.root
        .findAll(
          (instance) => String(instance.type) === 'ThemeAwareHeadingHost',
        )
        .map((heading) => heading.props.children),
    ).toEqual([
      activeRelationshipTitle,
      'home.awaitingDecision',
      'home.relationshipsTitle',
      'time.tasks',
      'paymentRequests.requests',
      'jointAccountCharges.title',
      'budgets.title',
      'time.meTime',
      'tabs.sex',
      'rules.title',
    ]);
    expect(
      screen!.root
        .findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareHeadingHost' &&
            instance.props.children !== activeRelationshipTitle,
        )
        .every((heading) => heading.props.accessibilityRole === 'header'),
    ).toBe(true);
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).not.toEqual(
      expect.arrayContaining([
        'home.relationshipsTitle',
        'home.relationshipSelectionHint',
        'home.createAnotherSpace',
      ]),
    );

    act(() => screen!.unmount());
  });

  it('keeps the relationship heading static when no relationship is active', () => {
    mockSelectedRelationshipId = undefined;

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    expect(
      screen!.root
        .findAll(
          (instance) => String(instance.type) === 'ThemeAwareHeadingHost',
        )
        .map((heading) => heading.props.children),
    ).toContain('home.activeRelationshipHeader');
    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareDropdownHost',
      ).props.selectedValue,
    ).toBe('');

    act(() => screen!.unmount());
  });

  it('renders item-type sections in horizontal lists and preserves navigation', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    const homePageLists = screen!.root.findAll(
      (instance) => String(instance.type) === 'FlatListHost',
    );
    expect(homePageLists).toHaveLength(9);
    expect(homePageLists.every((list) => list.props.horizontal)).toBe(true);
    expect(
      homePageLists.map((list) =>
        (list.props.data as { id: string }[]).map(({ id }) => id),
      ),
    ).toEqual([
      ['awaiting-decision'],
      ['find-relationship', 'create-relationship'],
      ['incomplete-tasks', 'completed-tasks', 'create-task'],
      ['view-requests', 'create-request'],
      ['view-joint-account-charges', 'create-joint-account-charge'],
      ['view-budgets', 'create-budget'],
      ['view-me-time', 'create-me-time'],
      ['love-making-sessions', 'date-nights'],
      ['view-rules', 'create-rule'],
    ]);

    const homePageItems = screen!.root.findAll(
      (instance) => String(instance.type) === 'TouchableOpacityHost',
    );
    const itemWithLabel = (label: string) =>
      homePageItems.find((item) => item.props.accessibilityLabel === label)!;

    act(() => itemWithLabel('home.awaitingDecision').props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      AppRoutePaths.awaitingDecision,
    );
    act(() => itemWithLabel('time.viewAllTasks').props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      AppRoutePaths.viewAllIncompleteTasks,
    );
    act(() => itemWithLabel('sex.sessionsTitle').props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      AppRoutePaths.loveMakingSessions,
    );
    act(() => itemWithLabel('dateNight.title').props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(AppRoutePaths.dateNights);
    act(() =>
      itemWithLabel('paymentRequests.createRelationship').props.onPress(),
    );
    expect(mockRouterPush).toHaveBeenCalledWith(
      AppRoutePaths.createRelationship,
    );
    act(() => screen!.unmount());
  });

  it('sizes horizontal lists to fit two full items and their separator', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    const findListByItemCount = (count: number) =>
      screen!.root
        .findAll((instance) => String(instance.type) === 'FlatListHost')
        .find((list) => (list.props.data as unknown[]).length === count)!;
    const singleItemList = findListByItemCount(1);
    const twoItemList = findListByItemCount(2);
    const layoutEvent = { nativeEvent: { layout: { width: 360 } } };

    act(() => {
      singleItemList.props.onLayout(layoutEvent);
      twoItemList.props.onLayout(layoutEvent);
    });

    const getCardViews = (itemCount: number) =>
      findListByItemCount(itemCount).findAll(
        (instance) =>
          String(instance.type) === 'ViewHost' &&
          typeof instance.props.onLayout === 'function',
      );
    const singleItemCard = getCardViews(1)[0];
    const twoItemCards = getCardViews(2);

    act(() => {
      singleItemCard.props.onLayout({
        nativeEvent: { layout: { height: 128 } },
      });
      twoItemCards[0].props.onLayout({
        nativeEvent: { layout: { height: 128 } },
      });
      twoItemCards[1].props.onLayout({
        nativeEvent: { layout: { height: 144 } },
      });
    });

    const getItemStyles = (itemCount: number) =>
      findListByItemCount(itemCount)
        .findAll((instance) => String(instance.type) === 'ViewHost')
        .map((item) => item.props.style)
        .filter(
          (style) => typeof style?.width === 'number' && style.width > 44,
        );

    expect(getItemStyles(1).map((style) => style.width)).toEqual([360]);
    expect(getItemStyles(2).map((style) => style.width)).toEqual([174, 174]);
    expect(getCardViews(1).map((card) => card.props.style.height)).toEqual([
      128,
    ]);
    expect(getCardViews(2).map((card) => card.props.style.height)).toEqual([
      144, 144,
    ]);
    expect(findListByItemCount(2).props.showsHorizontalScrollIndicator).toBe(
      false,
    );
    expect(findListByItemCount(3).props.showsHorizontalScrollIndicator).toBe(
      true,
    );
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).toContain('home.swipeForMore');
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'HStackHost' &&
          instance.props.className === 'items-center justify-between',
      ),
    ).not.toHaveLength(0);

    act(() => screen!.unmount());
  });

  it('opens the full item description from the help button without navigating', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    const helpButton = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'home.showDescription',
    )[0];
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).not.toContain('home.awaitingDecisionDescription');

    act(() => helpButton.props.onPress());

    const descriptionModal = screen!.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(descriptionModal.props.title).toBe('home.awaitingDecision');
    expect(
      descriptionModal
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).toContain('home.awaitingDecisionDescription');
    expect(descriptionModal.props.confirmButton.text).toBe(
      'home.closeDescription',
    );
    expect(mockRouterNavigate).not.toHaveBeenCalled();

    act(() => descriptionModal.props.confirmButton.onPress());
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemedModalHost',
      ),
    ).toHaveLength(0);

    act(() => screen!.unmount());
  });

  it('sorts relationship selector options by name', () => {
    mockSelectedRelationshipId = 'relationship-a';
    mockUseRelationshipsQuery.mockReturnValue(
      createRelationshipsQueryResult([
        { ...mockRelationship, id: 'relationship-z', name: 'Zulu space' },
        { ...mockRelationship, id: 'relationship-a', name: 'alpha space' },
        { ...mockRelationship, id: 'relationship-m', name: 'Middle space' },
      ]),
    );

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    const dropdown = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareDropdownHost',
    );
    expect(dropdown.props.options).toEqual([
      { label: 'home.addRelationship', value: '__add_relationship__' },
      { label: 'alpha space', value: 'relationship-a' },
      { label: 'Middle space', value: 'relationship-m' },
      { label: 'Zulu space', value: 'relationship-z' },
    ]);
    expect(dropdown.props.selectedValue).toBe('relationship-a');

    act(() => screen!.unmount());
  });

  describe('RelationshipDetailsScreen', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAuth.isAuthenticated = true;
      mockAuth.user = { subject: 'user-1', claims: {} };
      mockSelectedRelationshipId = 'relationship-1';
      mockRelationshipRouteParams = { id: 'relationship-1' };
      mockMembersQuery.data = mockRelationship.members;
      mockMembersQuery.error = null;
      mockMembersQuery.isLoading = false;
      mockJoinRequestsQuery.data = [];
      mockJoinRequestsQuery.error = null;
      mockJoinRequestsQuery.isLoading = false;
      mockDecisionMutation.error = null;
      mockDecisionMutation.isPending = false;
      mockInvitationMutation.isPending = false;
      mockInvitationMutation.mutateAsync.mockReset();
      mockInvitationMutation.mutateAsync.mockResolvedValue({
        token: 'invite-token',
      });
      mockUseRelationshipsQuery.mockReturnValue(
        createRelationshipsQueryResult([mockRelationship]),
      );
    });

    it('renders relationship details and lets owners manage requests and invitations', async () => {
      mockRelationshipRouteParams = { id: ['relationship-1', 'ignored'] };
      mockAuth.user = { subject: 'user-1', claims: {} };
      mockJoinRequestsQuery.data = [
        {
          id: 'request-1',
          requesterDisplayName: 'Sam',
          requesterUserId: 'user-2',
        },
      ];

      let screen: renderer.ReactTestRenderer;
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });

      expect(
        screen!.root
          .findAll(
            (instance) => String(instance.type) === 'ThemeAwareHeadingHost',
          )
          .map((heading) => heading.props.children),
      ).toContain('Shared space');
      expect(
        screen!.root
          .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
          .map((text) => text.props.children),
      ).toEqual(
        expect.arrayContaining(['share-code', 'Alex', 'home.owner', 'Sam']),
      );
      expect(mockUseRelationshipsQuery).toHaveBeenCalledWith(true);
      expect(mockMembersQuery.data).toBe(mockRelationship.members);

      const activationButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'RelationshipActivationButtonHost',
      );
      const deleteButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'common.delete',
      );
      expect(deleteButton.props.darkBackground).toBe('$error700');
      expect(activationButton.props.isActive).toBe(true);
      act(() => activationButton.props.onActivate());
      expect(mockDispatch).toHaveBeenCalledWith({
        payload: 'relationship-1',
        type: 'general/setSelectedRelationshipId',
      });

      const requestDetailsButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.variant === 'link' &&
          instance.props.children?.props?.children === 'Sam',
      );
      act(() => requestDetailsButton.props.onPress());
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: AppRoutePaths.relationshipJoinRequestDetails,
        params: {
          id: 'request-1',
          relationshipId: 'relationship-1',
          detailNavigationSource: 'relationshipJoinRequests:relationship-1',
        },
      });

      const approveButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.approveJoinRequest',
      );
      const rejectButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.rejectJoinRequest',
      );
      expect(approveButton.props.disabled).toBe(false);
      act(() => {
        approveButton.props.onPress();
        rejectButton.props.onPress();
      });
      expect(mockDecisionMutation.mutate).toHaveBeenNthCalledWith(1, {
        requestId: 'request-1',
        input: { decision: 'approved' },
      });
      expect(mockDecisionMutation.mutate).toHaveBeenNthCalledWith(2, {
        requestId: 'request-1',
        input: { decision: 'rejected' },
      });

      const inviteButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.inviteMember',
      );
      await act(async () => inviteButton.props.onPress());
      expect(mockInvitationMutation.mutateAsync).toHaveBeenCalledWith({});
      expect(mockCreateInvitationUrl).toHaveBeenCalledWith('invite-token');
      expect(mockShare).toHaveBeenCalledWith({
        message:
          'home.invitationShareMessage\n\nShared space\n\nhttps://example.test/invitations/invite-token',
        title: 'home.invitationShareTitle',
      });

      const viewRequestsButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.viewRequests',
      );
      act(() => viewRequestsButton.props.onPress());
      expect(mockRouterNavigate).toHaveBeenCalledWith(
        AppRoutePaths.viewAllRequests,
      );

      act(() => screen!.unmount());
    });

    it('shows sign-in, loading, query errors, and missing relationship states', () => {
      mockAuth.isAuthenticated = false;

      let screen: renderer.ReactTestRenderer;
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(mockUseRelationshipsQuery).toHaveBeenCalledWith(false);
      const signInButton = screen!.root.find(
        (instance) => instance.props.children === 'home.signIn',
      );
      act(() => signInButton.props.onPress());
      expect(mockRouterNavigate).toHaveBeenCalledWith(AppRoutePaths.account);
      const screenHost = screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      );
      act(() => screenHost.props.bottomContent.props.onPress());
      expect(mockRouterDismissTo).toHaveBeenCalledWith(AppRoutePaths.home);
      act(() => screen!.unmount());

      mockAuth.isAuthenticated = true;
      mockUseRelationshipsQuery.mockReturnValue({
        ...createRelationshipsQueryResult([]),
        data: undefined,
        isLoading: true,
        isPending: true,
        isSuccess: false,
        status: 'pending',
        fetchStatus: 'fetching',
      } as ReturnType<typeof useRelationshipsQuery>);
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'common.loading',
        ),
      ).not.toHaveLength(0);
      act(() => screen!.unmount());

      mockUseRelationshipsQuery.mockReturnValue({
        ...createRelationshipsQueryResult([mockRelationship]),
        error: new Error('relationships failed'),
        isError: true,
        isSuccess: false,
        status: 'error',
      } as ReturnType<typeof useRelationshipsQuery>);
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'relationships failed',
        ),
      ).not.toHaveLength(0);
      act(() => screen!.unmount());

      mockUseRelationshipsQuery.mockReturnValue(
        createRelationshipsQueryResult([mockRelationship]),
      );
      mockMembersQuery.error = new Error('members failed');
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'members failed',
        ),
      ).not.toHaveLength(0);
      act(() => screen!.unmount());

      mockMembersQuery.error = null;
      mockRelationshipRouteParams = {};
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'home.relationshipNotFound',
        ),
      ).not.toHaveLength(0);
      act(() => screen!.unmount());
    });

    it('limits owner controls to owners and renders join-request states', () => {
      mockAuth.user = { subject: 'user-2', claims: {} };
      mockMembersQuery.data = [
        {
          ...mockRelationship.members[0],
          displayName: undefined,
        },
      ];

      let screen: renderer.ReactTestRenderer;
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'RelationshipActivationButtonHost',
        )[0]?.props.isActive,
      ).toBe(true);
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'user-1',
        ),
      ).not.toHaveLength(0);
      expect(mockUseJoinRequestsQuery).toHaveBeenCalledWith(
        'relationship-1',
        false,
      );
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'home.inviteMember',
        ),
      ).toHaveLength(0);
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareButtonHost' &&
            instance.props.children === 'common.delete',
        ),
      ).toHaveLength(0);
      expect(mockJoinRequestsQuery.isLoading).toBe(false);
      act(() => screen!.unmount());

      mockAuth.user = { subject: 'user-1', claims: {} };
      mockJoinRequestsQuery.isLoading = true;
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'common.loading',
        ),
      ).not.toHaveLength(0);
      act(() => screen!.unmount());

      mockJoinRequestsQuery.isLoading = false;
      mockJoinRequestsQuery.error = new Error('join request failure');
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'home.joinRequestError',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());

      mockJoinRequestsQuery.error = null;
      mockJoinRequestsQuery.data = [];
      mockDecisionMutation.error = new Error('decision failure');
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            instance.props.children === 'home.noPendingJoinRequests',
        ),
      ).not.toHaveLength(0);
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'home.joinRequestError',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());
    });

    it('reports invitation failures and disables pending mutations', async () => {
      mockInvitationMutation.isPending = true;
      mockDecisionMutation.isPending = true;
      mockJoinRequestsQuery.data = [
        { id: 'request-1', requesterUserId: 'user-2' },
      ];

      let screen: renderer.ReactTestRenderer;
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      const approveButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.approveJoinRequest',
      );
      expect(approveButton.props.disabled).toBe(true);
      const pendingInviteButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.invitationCreating',
      );
      expect(pendingInviteButton.props.isDisabled).toBe(true);
      act(() => screen!.unmount());

      mockInvitationMutation.isPending = false;
      mockDecisionMutation.isPending = false;
      mockInvitationMutation.mutateAsync.mockRejectedValueOnce(
        new Error('invitation failed'),
      );
      act(() => {
        screen = renderer.create(<RelationshipDetailsScreen />);
      });
      const inviteButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.inviteMember',
      );
      await act(async () => inviteButton.props.onPress());
      expect(
        screen!.root.findAll(
          (instance) => instance.props.children === 'home.invitationFailed',
        ),
      ).not.toHaveLength(0);
      expect(jest.requireMock('@/utils/logging').logError).toHaveBeenCalledWith(
        'relationship_invitation_failed',
        {
          errorName: 'Error',
        },
      );
      act(() => screen!.unmount());
    });
  });

  describe('RelationshipJoinRequestDetailsScreen', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAuth.isAuthenticated = true;
      mockAuth.user = { subject: 'user-1', claims: {} };
      mockRelationshipRouteParams = {
        id: 'request-1',
        relationshipId: 'relationship-1',
      };
      mockJoinRequestDetailsQuery.data = {
        id: 'request-1',
        relationshipId: 'relationship-1',
        requesterUserId: 'user-2',
        requesterDisplayName: 'Sam',
        status: 'pending',
      };
      mockJoinRequestDetailsQuery.error = null;
      mockJoinRequestDetailsQuery.isLoading = false;
      mockDecisionMutation.error = null;
      mockDecisionMutation.isPending = false;
      mockUseRelationshipsQuery.mockReturnValue(
        createRelationshipsQueryResult([mockRelationship]),
      );
    });

    it('renders pending request details and lets relationship owners decide', () => {
      mockRelationshipRouteParams = {
        id: ['request-1', 'ignored'],
        relationshipId: ['relationship-1', 'ignored'],
      };

      let screen: renderer.ReactTestRenderer;
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });

      const screenHost = screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      );
      expect(screenHost.props.fixedHeaderContent.props.children).toBe('Sam');
      expect(
        screen!.root
          .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
          .map((text) => text.props.children),
      ).toEqual(
        expect.arrayContaining([
          'home.joinRequestStatus',
          'home.joinRequestPending',
          'home.relationshipName',
          'Shared space',
        ]),
      );

      const approveButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.approveJoinRequest',
      );
      const rejectButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.rejectJoinRequest',
      );
      act(() => {
        approveButton.props.onPress();
        rejectButton.props.onPress();
      });
      expect(mockDecisionMutation.mutate).toHaveBeenNthCalledWith(1, {
        requestId: 'request-1',
        input: { decision: 'approved' },
      });
      expect(mockDecisionMutation.mutate).toHaveBeenNthCalledWith(2, {
        requestId: 'request-1',
        input: { decision: 'rejected' },
      });

      const backButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.pendingJoinRequestsTitle',
      );
      act(() => backButton.props.onPress());
      expect(mockRouterDismissTo).toHaveBeenCalledWith({
        pathname: AppRoutePaths.relationshipDetails,
        params: {
          id: 'relationship-1',
          detailNavigationSource: 'homeRelationships',
        },
      });
      act(() => screen!.unmount());
    });

    it('shows all request statuses and hides decisions from non-owners', () => {
      mockAuth.user = { subject: 'user-2', claims: {} };

      const expectedStatusByRequestState = {
        approved: 'home.joinRequestApproved',
        rejected: 'home.joinRequestRejected',
      } as const;
      for (const [status, message] of Object.entries(
        expectedStatusByRequestState,
      )) {
        mockJoinRequestDetailsQuery.data = {
          ...mockJoinRequestDetailsQuery.data!,
          status: status as 'approved' | 'rejected',
        };

        let screen: renderer.ReactTestRenderer;
        act(() => {
          screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
        });
        expect(
          screen!.root.findAll(
            (instance) =>
              String(instance.type) === 'ThemeAwareTextHost' &&
              instance.props.children === message,
          ),
        ).toHaveLength(1);
        expect(
          screen!.root.findAll(
            (instance) =>
              String(instance.type) === 'ThemeAwareButtonHost' &&
              instance.props.children === 'common.delete',
          ),
        ).toHaveLength(1);
        expect(
          screen!.root.findAll(
            (instance) =>
              String(instance.type) === 'ThemeAwareButtonHost' &&
              (instance.props.children === 'home.approveJoinRequest' ||
                instance.props.children === 'home.rejectJoinRequest'),
          ),
        ).toHaveLength(0);
        act(() => screen!.unmount());
      }

      mockAuth.user = { subject: 'user-1', claims: {} };
      mockJoinRequestDetailsQuery.data = {
        ...mockJoinRequestDetailsQuery.data!,
        status: 'pending',
        requesterDisplayName: undefined,
      };
      mockDecisionMutation.isPending = true;
      mockDecisionMutation.error = new Error('Decision failed');
      let screen: renderer.ReactTestRenderer;
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });
      const approveButton = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'home.approveJoinRequest',
      );
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareButtonHost' &&
            instance.props.children === 'common.delete',
        ),
      ).toHaveLength(0);
      expect(approveButton.props.disabled).toBe(true);
      expect(
        screen!.root.find(
          (instance) => String(instance.type) === 'ThemeAwareScreenHost',
        ).props.fixedHeaderContent.props.children,
      ).toBe('home.pendingJoinRequestsTitle');
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'Decision failed',
        ),
      ).toHaveLength(1);
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'home.joinRequestDecisionPending',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());
    });

    it('renders authentication, parameter, loading, and request-query states', () => {
      mockAuth.isAuthenticated = false;
      let screen: renderer.ReactTestRenderer;
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'paymentRequests.signIn',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());

      mockAuth.isAuthenticated = true;
      mockAuth.user = { claims: {} };
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'auth.profileUnavailable',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());

      mockAuth.user = { subject: 'user-1', claims: {} };
      mockRelationshipRouteParams.id = undefined;
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'home.joinRequestError',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());

      mockRelationshipRouteParams.id = 'request-1';
      mockJoinRequestDetailsQuery.isLoading = true;
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'common.loading',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());

      mockJoinRequestDetailsQuery.isLoading = false;
      mockJoinRequestDetailsQuery.error = new Error('Request unavailable');
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'Request unavailable',
        ),
      ).toHaveLength(1);
      act(() => screen!.unmount());

      mockJoinRequestDetailsQuery.error = null;
      mockJoinRequestDetailsQuery.data = undefined;
      act(() => {
        screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
      });
      expect(
        screen!.root.findAll(
          (instance) =>
            String(instance.type) === 'ThemeAwareTextHost' &&
            instance.props.children === 'home.joinRequestError',
        ),
      ).toHaveLength(1);
    });
  });

  it('shows the empty state with an add-relationship selector and no list', () => {
    mockUseRelationshipsQuery.mockReturnValue(
      createRelationshipsQueryResult([]),
    );

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareInfiniteScrollListHost',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).toContain('home.noSpacesMessage');
    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareDropdownHost',
      ).props.options,
    ).toEqual([
      { label: 'home.addRelationship', value: '__add_relationship__' },
    ]);

    act(() => screen!.unmount());
  });

  it('shows sign-in actions when authentication is unavailable', () => {
    mockAuth.isAuthenticated = false;

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    expect(mockUseRelationshipsQuery).toHaveBeenCalledWith(false);
    const signInButton = screen!.root.find(
      (instance) => instance.props.children === 'home.signIn',
    );

    act(() => signInButton.props.onPress());

    expect(mockRouterNavigate).toHaveBeenCalledWith(AppRoutePaths.account);
    act(() => screen!.unmount());
  });

  it('renders loading, query errors, and retries relationship loading', () => {
    mockUseRelationshipsQuery.mockReturnValue({
      ...createRelationshipsQueryResult([]),
      data: undefined,
      isLoading: true,
      isPending: true,
      isSuccess: false,
      status: 'pending',
      fetchStatus: 'fetching',
    } as ReturnType<typeof useRelationshipsQuery>);

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) => instance.props.children === 'common.loading',
      ),
    ).not.toHaveLength(0);
    act(() => screen!.unmount());

    const refetch = jest.fn();
    mockUseRelationshipsQuery.mockReturnValue({
      ...createRelationshipsQueryResult([]),
      error: new Error('spaces unavailable'),
      isError: true,
      isLoadingError: true,
      isSuccess: false,
      status: 'error',
      refetch,
    } as ReturnType<typeof useRelationshipsQuery>);

    act(() => {
      screen = renderer.create(<HomeScreen />);
    });
    const retryButton = screen!.root.find(
      (instance) => instance.props.children === 'home.retry',
    );

    act(() => retryButton.props.onPress());

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(
      screen!.root.findAll(
        (instance) => instance.props.children === 'spaces unavailable',
      ),
    ).not.toHaveLength(0);
    act(() => screen!.unmount());
  });

  it('creates a relationship from the empty state and passes the display name', () => {
    mockAuth.user = { subject: 'user-1', claims: { name: 'Alex' } };
    mockCreateRelationshipMutation.isPending = true;
    mockUseRelationshipsQuery.mockReturnValue(
      createRelationshipsQueryResult([]),
    );

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });

    const input = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareInputHost',
    );
    const submitButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'home.createSpace',
    );
    expect(submitButton.props.isDisabled).toBe(true);

    mockCreateRelationshipMutation.isPending = false;
    act(() => {
      input.props.onChangeText('  New space  ');
    });

    const enabledButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'home.createSpace',
    );
    expect(enabledButton.props.isDisabled).toBe(false);

    act(() => enabledButton.props.onPress());

    expect(mockCreateRelationshipMutation.mutate).toHaveBeenCalledWith(
      { name: 'New space', displayName: 'Alex' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const mutationOptions = mockCreateRelationshipMutation.mutate.mock
      .calls[0]?.[1] as {
      onSuccess: () => void;
    };
    act(() => mutationOptions.onSuccess());
    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareInputHost',
      ).props.value,
    ).toBe('');
    expect(mockGetDisplayNameFromClaims).toHaveBeenCalledWith({
      name: 'Alex',
    });
    act(() => screen!.unmount());
  });

  it('shows mutation errors in the empty-state create form', () => {
    mockCreateRelationshipMutation.error = new Error('create failed');
    mockUseRelationshipsQuery.mockReturnValue(
      createRelationshipsQueryResult([]),
    );

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) => instance.props.children === 'create failed',
      ),
    ).not.toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareInputHost',
      ),
    ).toHaveLength(1);
    act(() => screen!.unmount());
  });

  it('updates the active relationship id when a dropdown option is selected', () => {
    const otherRelationship = {
      ...mockRelationship,
      id: 'relationship-a',
      name: 'Alpha space',
    };
    const currentRelationship = {
      ...mockRelationship,
      id: 'relationship-b',
      name: 'Beta space',
    };
    mockSelectedRelationshipId = currentRelationship.id;
    mockUseRelationshipsQuery.mockReturnValue(
      createRelationshipsQueryResult([otherRelationship, currentRelationship]),
    );

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeScreen />);
    });
    const dropdown = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareDropdownHost',
    );

    const [addRelationshipOption] = dropdown.props.options as {
      label: string;
      value: string;
    }[];
    act(() => dropdown.props.onValueChange(addRelationshipOption.value));

    expect(mockRouterPush).toHaveBeenCalledWith(
      AppRoutePaths.createRelationship,
    );
    expect(mockDispatch).not.toHaveBeenCalled();

    act(() => dropdown.props.onValueChange(otherRelationship.id));

    expect(mockDispatch).toHaveBeenCalledWith({
      payload: otherRelationship.id,
      type: 'general/setSelectedRelationshipId',
    });
    act(() => screen!.unmount());
  });
});
