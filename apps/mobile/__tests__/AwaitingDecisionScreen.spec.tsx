import type { FlashListProps } from '@shopify/flash-list';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import AwaitingDecisionScreen from '../app/(tabs)/(requests)/AwaitingDecisionScreen';

import { AppRoutePaths } from '@/constants/navigation';
import type { AwaitingDecisionItem } from '@/features/awaiting-decision/hooks/useAwaitingDecisionItems';

let mockKeyboardDidHide: (() => void) | undefined;
let mockAwaitingDecisionItems: AwaitingDecisionItem[] = [];
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string } | null;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1' },
};
const mockNavigate = jest.fn();
const mockRelationshipsQuery = {
  data: [] as { id: string }[] | undefined,
  error: null as Error | null,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};
const mockRequestsQuery = {
  error: null as Error | null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isError: false,
  isFetchNextPageError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
}));

jest.mock('react-native', () => {
  return {
    View: 'ViewHost',
    Text: 'TextHost',
    TouchableOpacity: 'TouchableOpacityHost',
    Keyboard: {
      addListener: jest.fn((event: string, listener: () => void) => {
        if (event === 'keyboardDidHide') {
          mockKeyboardDidHide = listener;
        }
        return { remove: jest.fn() };
      }),
    },
  };
});

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ButtonHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareTimePicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareTimePicker: (props: Record<string, unknown>) =>
      React.createElement('TimePickerHost', props),
  };
});

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
    }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareScreenHost',
        { ...props, fixedHeaderContent },
        fixedHeaderContent as React.ReactNode,
        children as React.ReactNode,
      ),
  };
});

jest.mock(
  '@/features/awaiting-decision/components/AwaitingDecisionListSkeleton',
  () => ({
    AwaitingDecisionListSkeleton: 'AwaitingDecisionListSkeletonHost',
  }),
);

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareText: ({ children }: { children: React.ReactNode }) =>
      React.createElement('TextHost', null, children),
  };
});

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

jest.mock('@/components/ui/ThemedModal', () => ({
  ThemedModal: 'ThemedModalHost',
}));

jest.mock('@/components/ui/hstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    HStack: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('HStackHost', props, children),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    VStack: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('VStackHost', props, children),
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

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipsQuery: () => mockRelationshipsQuery,
}));

jest.mock(
  '@/features/awaiting-decision/hooks/useAwaitingDecisionItems',
  () => ({
    useAwaitingDecisionItemsQuery: () => ({
      data: mockAwaitingDecisionItems,
      pageKey: '1:1:1',
      ...mockRequestsQuery,
    }),
  }),
);

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('AwaitingDecisionScreen', () => {
  afterEach(() => {
    mockKeyboardDidHide = undefined;
    mockAwaitingDecisionItems = [];
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockRelationshipsQuery.data = [];
    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.refetch.mockClear();
    mockRequestsQuery.hasNextPage = false;
    mockRequestsQuery.error = null;
    mockRequestsQuery.isError = false;
    mockRequestsQuery.isFetchNextPageError = false;
    mockRequestsQuery.isFetching = false;
    mockRequestsQuery.isFetchingNextPage = false;
    mockRequestsQuery.isLoading = false;
    mockRequestsQuery.isRefetching = false;
    jest.clearAllMocks();
  });

  it('scrolls search controls with the list and pins a back-to-top footer', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const list = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    );
    expect(list.props.fixedHeader).toBeUndefined();
    expect(list.props.backToTop).toBe(false);
    expect(list.props.stickyHeader).toBeUndefined();
    const scrollToTop = jest.fn();
    const bottomContent = list.props.bottomContent as (actions: {
      scrollToTop: () => void;
    }) => React.ReactElement<{
      accessibilityLabel: string;
      onPress: () => void;
    }>;
    const backToTopButton = bottomContent({ scrollToTop });
    expect(backToTopButton.props.accessibilityLabel).toBe('common.backToTop');
    act(() => backToTopButton.props.onPress());
    expect(scrollToTop).toHaveBeenCalledTimes(1);

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
    const toolbarLabels = screen!.root
      .findAll((instance) => String(instance.type) === 'TouchableOpacityHost')
      .map((control) => control.props.accessibilityLabel);
    expect(toolbarLabels).toEqual(
      expect.arrayContaining([
        'common.search',
        'common.filters',
        'common.sort',
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
        instance.props.placeholder === 'decisionInbox.searchPlaceholder',
    );
    expect(searchInput).toBeDefined();
    act(() => searchInput.props.onFocus());

    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(1);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'DropdownHost',
      ),
    ).toHaveLength(0);

    act(() => {
      mockKeyboardDidHide?.();
    });

    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(1);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'DropdownHost',
      ),
    ).toHaveLength(0);

    act(() => screen!.unmount());
  });

  it('adds vertical spacing between request cards', () => {
    const item = createAwaitingDecisionItem(
      'request-1',
      'Request',
      '2025-01-01',
      100,
    );
    mockAwaitingDecisionItems = [item];

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as FlashListProps<AwaitingDecisionItem>;
    const renderedItem = listProps.renderItem?.({
      item,
      index: 0,
      target: 'Cell',
    });

    if (
      !React.isValidElement<{
        children?: React.ReactNode;
        style?: { paddingHorizontal?: number };
      }>(renderedItem)
    ) {
      throw new Error('Expected the request card to render');
    }

    const rowContainer = renderedItem.props.children;
    if (!React.isValidElement<{ className?: string }>(rowContainer)) {
      throw new Error('Expected the request card to have a row container');
    }

    expect(rowContainer.props.className).toContain('pb-2');

    act(() => screen!.unmount());
  });

  it('sorts awaiting requests by the selected property and direction', () => {
    const items = [
      createAwaitingDecisionItem('request-3', 'Omega', '2025-03-01', 100, [
        'Zulu',
        'Gamma',
      ]),
      createAwaitingDecisionItem('request-2', 'Alpha', '2025-02-01', 300, [
        'beta',
      ]),
      createAwaitingDecisionItem('request-1', 'Beta', '2025-01-01', 200, [
        'Delta',
        'Alpha',
      ]),
    ];
    mockAwaitingDecisionItems = items;

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const getSortedRequestIds = () => {
      const { data } = screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      ).props.flashListProps as { data: AwaitingDecisionItem[] };
      return data.map(({ navigationId }) => navigationId);
    };

    expect(getSortedRequestIds()).toEqual([
      items[2].navigationId,
      items[1].navigationId,
      items[0].navigationId,
    ]);

    const sortControl = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'common.sort',
    );
    act(() => sortControl.props.onPress());

    const sortField = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'paymentRequests.sortBy',
    );
    act(() => sortField.props.onValueChange('amount'));
    expect(getSortedRequestIds()).toEqual([
      items[0].navigationId,
      items[2].navigationId,
      items[1].navigationId,
    ]);

    const sortOrder = screen!.root.find(
      (instance) =>
        String(instance.type) === 'DropdownHost' &&
        instance.props.placeholder === 'paymentRequests.sortOrder',
    );
    act(() => sortOrder.props.onValueChange('descending'));
    expect(getSortedRequestIds()).toEqual([
      items[1].navigationId,
      items[2].navigationId,
      items[0].navigationId,
    ]);

    act(() => sortField.props.onValueChange('categories'));
    act(() => sortOrder.props.onValueChange('ascending'));
    expect(getSortedRequestIds()).toEqual([
      items[2].navigationId,
      items[1].navigationId,
      items[0].navigationId,
    ]);

    act(() => sortOrder.props.onValueChange('descending'));
    expect(getSortedRequestIds()).toEqual([
      items[0].navigationId,
      items[1].navigationId,
      items[2].navigationId,
    ]);

    act(() => screen!.unmount());
  });

  it('shows rule approvals, join requests, and tasks in the same inbox', () => {
    const ruleItem: Extract<
      AwaitingDecisionItem,
      { kind: 'relationshipRule' }
    > = {
      kind: 'relationshipRule',
      navigationId: JSON.stringify([
        'relationshipRule',
        'relationship-1',
        'rule-1',
      ]),
      relationshipName: 'Shared home',
      rule: {
        id: 'rule-1',
        relationshipId: 'relationship-1',
        createdByUserId: 'user-2',
        name: 'Quiet hours',
        labels: [],
        description: 'Keep evenings quiet.',
        status: 'pending_approval',
        remindMeToReview: null,
        createdAt: '2025-01-02T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        approvals: [{ memberUserId: 'user-1' }],
      },
    };
    const joinRequestItem: Extract<
      AwaitingDecisionItem,
      { kind: 'joinRequest' }
    > = {
      kind: 'joinRequest',
      navigationId: JSON.stringify(['joinRequest', 'relationship-1', 'join-1']),
      relationshipName: 'Shared home',
      request: {
        id: 'join-1',
        relationshipId: 'relationship-1',
        requesterUserId: 'user-3',
        requesterDisplayName: 'Taylor',
        status: 'pending',
        createdAt: '2025-01-03T00:00:00.000Z',
      },
    };
    const taskItem: Extract<AwaitingDecisionItem, { kind: 'task' }> = {
      kind: 'task',
      navigationId: JSON.stringify(['task', 'relationship-1', 'task-1']),
      relationshipName: 'Shared home',
      task: {
        id: 'task-1',
        relationshipId: 'relationship-1',
        createdByUserId: 'user-2',
        name: 'Water the plants',
        visibleToUserIds: [],
        completableByUserIds: ['user-1'],
        createdAt: '2025-01-04T00:00:00.000Z',
        updatedAt: '2025-01-04T00:00:00.000Z',
      },
    };
    mockAwaitingDecisionItems = [
      ruleItem,
      joinRequestItem,
      taskItem,
      createAwaitingDecisionItem('request-1', 'Groceries', '2025-01-01', 1200),
    ];

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as FlashListProps<AwaitingDecisionItem>;
    expect(
      new Set(
        (listProps.data as AwaitingDecisionItem[]).map((item) => item.kind),
      ),
    ).toEqual(
      new Set(['paymentRequest', 'relationshipRule', 'joinRequest', 'task']),
    );

    const navigationCases = [
      {
        item: ruleItem,
        href: {
          pathname: AppRoutePaths.relationshipRuleDetails,
          params: {
            id: 'rule-1',
            detailNavigationId: ruleItem.navigationId,
            detailNavigationSource: 'awaitingDecision',
          },
        },
      },
      {
        item: joinRequestItem,
        href: {
          pathname: AppRoutePaths.relationshipJoinRequestDetails,
          params: {
            id: 'join-1',
            relationshipId: 'relationship-1',
            detailNavigationId: joinRequestItem.navigationId,
            detailNavigationSource: 'awaitingDecision',
          },
        },
      },
      {
        item: taskItem,
        href: {
          pathname: AppRoutePaths.taskDetails,
          params: {
            id: 'task-1',
            relationshipId: 'relationship-1',
            detailNavigationId: taskItem.navigationId,
            detailNavigationSource: 'awaitingDecision',
          },
        },
      },
    ];
    for (const { href, item } of navigationCases) {
      const renderedRow = listProps.renderItem?.({
        item,
        index: 0,
        target: 'Cell',
      });
      if (!React.isValidElement(renderedRow)) {
        throw new Error('Expected an awaiting-decision row to render.');
      }

      let rowScreen: renderer.ReactTestRenderer;
      act(() => {
        rowScreen = renderer.create(renderedRow);
      });
      const rowButton = rowScreen!.root.find(
        (instance) => String(instance.type) === 'TouchableOpacityHost',
      );
      act(() => rowButton.props.onPress());
      expect(mockNavigate).toHaveBeenLastCalledWith(href);
      act(() => rowScreen!.unmount());
    }

    act(() => screen!.unmount());
  });

  it('validates amount and date ranges while filtering unloaded results', () => {
    mockAwaitingDecisionItems = [
      createAwaitingDecisionItem('request-1', 'Lunch', '2025-01-01', 1200),
    ];
    mockRequestsQuery.hasNextPage = true;

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const filterControl = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'common.filters',
    );
    act(() => filterControl.props.onPress());

    const getAmountInputs = () =>
      screen!.root
        .findAll((instance) => String(instance.type) === 'InputHost')
        .filter(
          (input) =>
            input.props.placeholder === 'paymentRequests.amountPlaceholder',
        );
    const getFilterMessages = () =>
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children);

    let amountInputs = getAmountInputs();
    expect(amountInputs).toHaveLength(2);
    act(() => amountInputs[0].props.onChangeText('invalid'));
    expect(getFilterMessages()).toContain(
      'paymentRequests.amountFilterInvalid',
    );

    amountInputs = getAmountInputs();
    act(() => {
      amountInputs[0].props.onChangeText('3');
      amountInputs[1].props.onChangeText('2');
    });
    expect(getFilterMessages()).toContain(
      'paymentRequests.amountFilterInvalid',
    );

    amountInputs = getAmountInputs();
    act(() => {
      amountInputs[0].props.onChangeText('999');
      amountInputs[1].props.onChangeText('1000');
    });
    expect(mockRequestsQuery.fetchNextPage).toHaveBeenCalled();

    const datePickers = screen!.root.findAll(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    act(() => {
      datePickers[0].props.onChange({ type: 'set' }, new Date(2025, 1, 3));
      datePickers[1].props.onChange({ type: 'set' }, new Date(2025, 1, 2));
    });
    expect(getFilterMessages()).toContain('paymentRequests.dateFilterInvalid');

    const updatedDatePickers = screen!.root.findAll(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    act(() =>
      updatedDatePickers[1].props.onChange(
        { type: 'set' },
        new Date(2025, 1, 4),
      ),
    );
    expect(getFilterMessages()).not.toContain(
      'paymentRequests.dateFilterInvalid',
    );
    const clearedDatePickers = screen!.root.findAll(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    act(() => clearedDatePickers[0].props.onClear());

    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as FlashListProps<AwaitingDecisionItem>;
    expect(listProps.ListEmptyComponent).toBeNull();

    mockRequestsQuery.hasNextPage = false;
    act(() => getAmountInputs()[0].props.onChangeText('1001'));
    const updatedListProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as FlashListProps<AwaitingDecisionItem>;
    expect(
      React.isValidElement<{ children?: React.ReactNode }>(
        updatedListProps.ListEmptyComponent,
      )
        ? updatedListProps.ListEmptyComponent.props.children
        : updatedListProps.ListEmptyComponent,
    ).toBe('decisionInbox.noFilteredItems');

    act(() => screen!.unmount());
  });

  it('shows a loading spinner and empty message when there are no awaiting requests', () => {
    mockRequestsQuery.isLoading = true;

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const getEmptyComponent = () =>
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      ).props.flashListProps.ListEmptyComponent as React.ReactElement<{
        children?: React.ReactNode;
      }> | null;
    expect(getEmptyComponent()?.props.children).toEqual(
      expect.objectContaining({
        type: 'AwaitingDecisionListSkeletonHost',
      }),
    );

    mockRequestsQuery.isLoading = false;
    act(() => screen!.update(<AwaitingDecisionScreen />));
    expect(getEmptyComponent()?.props.children).toBe('decisionInbox.empty');
    act(() => screen!.unmount());
  });

  it('renders authentication, relationship, and request failure states', () => {
    mockAuth.isAuthenticated = false;
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const signInButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'paymentRequests.signIn',
    );
    act(() => signInButton.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.account);

    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    act(() => screen!.update(<AwaitingDecisionScreen />));
    let textValues = screen!.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
    expect(textValues).toEqual(['auth.signedIn', 'auth.profileUnavailable']);

    mockAuth.user = { subject: 'user-1' };
    mockRelationshipsQuery.data = undefined;
    mockRelationshipsQuery.isLoading = true;
    mockRelationshipsQuery.isFetching = true;
    act(() => screen!.update(<AwaitingDecisionScreen />));
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'AwaitingDecisionListSkeletonHost',
      ),
    ).not.toHaveLength(0);

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.error = new Error('Relationships unavailable');
    act(() => screen!.update(<AwaitingDecisionScreen />));
    textValues = screen!.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
    expect(textValues).toContain('Relationships unavailable');
    const relationshipsRetryButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'paymentRequests.retry',
    );
    act(() => relationshipsRetryButton.props.onPress());
    expect(mockRelationshipsQuery.refetch).toHaveBeenCalledTimes(1);

    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.data = [];
    mockRequestsQuery.error = new Error('Requests unavailable');
    mockRequestsQuery.isError = true;
    act(() => screen!.update(<AwaitingDecisionScreen />));
    textValues = screen!.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
    expect(textValues).toContain('Requests unavailable');

    mockAwaitingDecisionItems = [
      createAwaitingDecisionItem('request-1', 'Lunch', '2025-01-01', 1200),
    ];
    act(() => screen!.update(<AwaitingDecisionScreen />));
    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as FlashListProps<AwaitingDecisionItem>;
    expect(listProps.ListEmptyComponent).toBeNull();
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Requests unavailable');

    act(() => screen!.unmount());
  });

  it('navigates from request rows and retries failed next-page loads', () => {
    const item = createAwaitingDecisionItem(
      'request-1',
      'Lunch',
      '2025-01-01',
      1200,
    );
    mockAwaitingDecisionItems = [item];
    mockRequestsQuery.isFetchNextPageError = true;

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AwaitingDecisionScreen />);
    });

    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as FlashListProps<AwaitingDecisionItem>;
    const retryButton = listProps.ListFooterComponent;
    if (!React.isValidElement<{ onPress: () => void }>(retryButton)) {
      throw new Error('Expected the list to render a next-page retry button.');
    }

    act(() => retryButton.props.onPress());
    expect(mockRequestsQuery.fetchNextPage).toHaveBeenCalledTimes(1);

    const row = listProps.renderItem?.({
      item,
      index: 0,
      target: 'Cell',
    });
    if (!React.isValidElement(row)) {
      throw new Error('Expected an awaiting-decision row to render.');
    }
    let rowScreen: renderer.ReactTestRenderer;
    act(() => {
      rowScreen = renderer.create(row);
    });
    const rowButton = rowScreen!.root.find(
      (instance) => String(instance.type) === 'TouchableOpacityHost',
    );
    act(() => rowButton.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: {
        id: 'request-1',
        detailNavigationId: item.navigationId,
        detailNavigationSource: 'awaitingDecision',
      },
    });

    act(() => {
      rowScreen!.unmount();
      screen!.unmount();
    });
  });
});

function createAwaitingDecisionItem(
  id: string,
  title: string,
  purchaseDate: string,
  amountMinorUnits: number,
  categories: string[] = [],
): Extract<AwaitingDecisionItem, { kind: 'paymentRequest' }> {
  return {
    kind: 'paymentRequest',
    navigationId: JSON.stringify(['paymentRequest', 'relationship-1', id]),
    relationshipName: 'Shared home',
    request: {
      id,
      relationshipId: 'relationship-1',
      createdByUserId: 'user-1',
      title,
      amountMinorUnits,
      currency: 'USD',
      purchaseDate,
      categories,
      status: 'pending_approval',
      createdAt: `${purchaseDate}T00:00:00.000Z`,
      updatedAt: `${purchaseDate}T00:00:00.000Z`,
    },
  };
}
