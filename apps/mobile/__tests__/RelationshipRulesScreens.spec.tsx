import type {
  PaymentRequestSummary,
  RelationshipRule,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import ViewAllRequestsScreen from '../app/(tabs)/(requests)/ViewAllRequestsScreen';
import EditRelationshipRuleScreen from '../app/(tabs)/(rules)/EditRelationshipRuleScreen';
import NewRelationshipRuleScreen from '../app/(tabs)/(rules)/NewRelationshipRuleScreen';
import ViewAllRulesScreen from '../app/(tabs)/(rules)/ViewAllRulesScreen';
import RulesHomeScreen from '../app/(tabs)/(rules)/index';
import RelationshipRuleDetailsScreen from '../app/relationship-rule/[id]';

import { AppRoutePaths } from '@/constants/navigation';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
let mockTranslationOverrides: Record<string, string> = {};
let mockLocale = 'en';
const mockDismissTo = jest.fn();
const mockMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();
const mockAgree = jest.fn();
const mockFetchNextPage = jest.fn();
let mockHasNextPage = false;
let mockUserSubject = 'user-1';
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
    {
      id: 'member-2',
      relationshipId: 'relationship-1',
      userId: 'user-2',
      displayName: 'Morgan',
      role: 'member',
      active: true,
    },
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};
let mockRelationships: RelationshipSummary[] | undefined = [mockRelationship];
let mockSelectedRelationshipId: string | null = 'relationship-1';
let mockPaymentRequests: PaymentRequestSummary[] = [];
let mockMembersData: RelationshipSummary['members'] | undefined =
  mockRelationship.members;
let mockMembersError: Error | undefined;
let mockRuleQueryLoading = false;
let mockRuleQueryError: Error | undefined;
let mockRouteParams: { id?: string | string[] } = { id: 'rule-1' };
const mockRule: RelationshipRule = {
  id: 'rule-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  name: 'Quiet hours',
  labels: ['Home', 'Finances'],
  description: 'Do not play loud music after 10 PM.',
  status: 'pending_approval',
  remindMeToReview: '2026-02-01T00:00:00.000Z',
  createdAt: '2025-02-01T00:00:00.000Z',
  updatedAt: '2025-02-01T00:00:00.000Z',
  approvals: [{ memberUserId: 'user-2' }],
};
let mockRuleForQuery: RelationshipRule | undefined = mockRule;
let mockRules = [mockRule];
type MockRulesListProps = {
  data: RelationshipRule[];
  onEndReached: () => void;
  renderItem: (info: { item: RelationshipRule }) => React.ReactElement;
};
type MockPaymentRequestsListProps = {
  data: PaymentRequestSummary[];
};
const mockCreateMutation = {
  error: undefined,
  isPending: false,
  mutateAsync: mockMutateAsync,
};
const mockUpdateMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutateAsync: mockUpdateMutateAsync,
};
const mockAgreementMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutate: mockAgree,
};
let mockAuthenticated = true;
let mockRelationshipsLoading = false;
let mockRelationshipsFetching = false;
let mockRelationshipsError: Error | undefined;
const mockRelationshipsRefetch = jest.fn();
const mockUseRelationshipRulesInfiniteQuery = jest.fn();
let mockRulesLoading = false;
let mockRulesError: Error | undefined;
let mockRulesFetchNextPageError = false;
let mockRulesFetchingNextPage = false;
let mockMembersLoading = false;

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useLocalSearchParams: () => mockRouteParams,
    useRouter: () => ({
      dismissTo: mockDismissTo,
      navigate: mockNavigate,
      push: mockPush,
    }),
  };
});

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock(
  '@/features/payment-requests/components/PaymentRequestCalendarModal',
  () => ({
    PaymentRequestCalendarModal: 'PaymentRequestCalendarModalHost',
  }),
);

jest.mock('@/components/ui/MainTabNavigationMenu', () => ({
  MainTabNavigationMenu: 'MainTabNavigationMenuHost',
}));

jest.mock('@/components/ui/ThemeAwareBadge', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareBadge: (props: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareBadgeHost',
        props,
        props.children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: (props: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareButtonHost',
        props,
        props.children as React.ReactNode,
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

jest.mock('@/components/ui/ThemeAwareDropdown', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareDropdown: (props: Record<string, unknown>) =>
      React.createElement('ThemeAwareDropdownHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareInput: (props: Record<string, unknown>) =>
      React.createElement('ThemeAwareInputHost', props),
  };
});

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
      fixedHeaderContent,
      ...props
    }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareScreenHost',
        { ...props, bottomContent, fixedHeaderContent },
        fixedHeaderContent as React.ReactNode,
        children as React.ReactNode,
        (typeof bottomContent === 'function'
          ? null
          : bottomContent) as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'ThemeAwareSkeletonHost',
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareSurface: (props: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareSurfaceHost',
        props,
        props.children as React.ReactNode,
      ),
  };
});

jest.mock(
  '@/features/relationship-rules/components/RelationshipRuleListSkeleton',
  () => ({
    RelationshipRuleListSkeleton: 'RelationshipRuleListSkeletonHost',
  }),
);

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
  useOAuth2Auth: () => ({
    isAuthenticated: mockAuthenticated,
    user: { subject: mockUserSubject, claims: {} },
  }),
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  usePaymentRequestsInfiniteQuery: () => ({
    data: { pages: [{ items: mockPaymentRequests }] },
    error: undefined,
    fetchNextPage: mockFetchNextPage,
    hasNextPage: false,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
  useRelationshipMembersQuery: () => ({
    data: mockMembersData,
    error: mockMembersError,
    isLoading: mockMembersLoading,
  }),
  useRelationshipsQuery: () => ({
    data: mockRelationships,
    error: mockRelationshipsError,
    isFetching: mockRelationshipsFetching,
    isLoading: mockRelationshipsLoading,
    refetch: mockRelationshipsRefetch,
  }),
}));

jest.mock('@/features/relationship-rules/hooks/useRelationshipRules', () => ({
  useAgreeToRelationshipRuleMutation: () => mockAgreementMutation,
  useCreateRelationshipRuleMutation: () => mockCreateMutation,
  useDeleteRelationshipRuleMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useUpdateRelationshipRuleMutation: () => mockUpdateMutation,
  useRelationshipRuleQuery: () => ({
    data: mockRuleForQuery,
    error: mockRuleQueryError,
    isLoading: mockRuleQueryLoading,
  }),
  useRelationshipRulesInfiniteQuery: (
    relationshipId: string | undefined,
    enabled: boolean,
  ) => {
    mockUseRelationshipRulesInfiniteQuery(relationshipId, enabled);
    return {
      data: { pages: [{ items: mockRules }] },
      error: mockRulesError,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: mockHasNextPage,
      isFetchNextPageError: mockRulesFetchNextPageError,
      isFetching: mockRulesLoading,
      isFetchingNextPage: mockRulesFetchingNextPage,
      isLoading: mockRulesLoading,
    };
  },
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
    locale: mockLocale,
    t: (key: string) => mockTranslationOverrides[key] ?? key,
  }),
}));

describe('relationship rule screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTranslationOverrides = {};
    mockLocale = 'en';
    mockRelationships = [mockRelationship];
    mockSelectedRelationshipId = 'relationship-1';
    mockPaymentRequests = [];
    mockRuleForQuery = mockRule;
    mockRules = [mockRule];
    mockMembersData = mockRelationship.members;
    mockMembersError = undefined;
    mockMembersLoading = false;
    mockRuleQueryLoading = false;
    mockRuleQueryError = undefined;
    mockRouteParams = { id: 'rule-1' };
    mockAgreementMutation.error = undefined;
    mockAgreementMutation.isPending = false;
    mockUpdateMutation.error = undefined;
    mockUpdateMutation.isPending = false;
    mockAuthenticated = true;
    mockUserSubject = 'user-1';
    mockRelationshipsLoading = false;
    mockRelationshipsFetching = false;
    mockRelationshipsError = undefined;
    mockRelationshipsRefetch.mockReset();
    mockUseRelationshipRulesInfiniteQuery.mockClear();
    mockRulesLoading = false;
    mockRulesError = undefined;
    mockRulesFetchNextPageError = false;
    mockRulesFetchingNextPage = false;
    mockMutateAsync.mockResolvedValue(mockRule);
    mockUpdateMutateAsync.mockResolvedValue(mockRule);
    mockFetchNextPage.mockResolvedValue(undefined);
    mockHasNextPage = false;
  });

  it('sorts the landing cards alphabetically and shows pressed feedback', () => {
    mockTranslationOverrides = {
      'rules.create': 'Create a rule',
      'rules.viewAll': 'View all rules',
    };

    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<RulesHomeScreen />);
    });

    const actions = screen!.root.findAll(
      (instance) =>
        instance.type === TouchableOpacity &&
        typeof instance.props.accessibilityLabel === 'string' &&
        instance.props.accessibilityRole === 'button' &&
        instance.props.activeOpacity === 0.75 &&
        typeof instance.props.onPress === 'function',
    );
    expect(actions.map((action) => action.props.accessibilityLabel)).toEqual([
      'Create a rule',
      'View all rules',
    ]);
    expect(actions[0]?.props.activeOpacity).toBe(0.75);

    act(() => {
      actions.forEach((action) => action.props.onPress());
    });
    expect(mockPush).toHaveBeenCalledWith(AppRoutePaths.createRule);
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.viewAllRules);

    act(() => screen!.unmount());
  });

  it('requires another active member and opens details after creating a rule', async () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<NewRelationshipRuleScreen />);
    });

    const createButton = () =>
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'rules.create',
      );
    expect(createButton().props.isDisabled).toBe(true);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'Alex',
      ),
    ).toHaveLength(0);

    const setInputValue = (placeholder: string, value: string) => {
      const input = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareInputHost' &&
          (
            instance.props.inputFieldProps as
              | { placeholder?: string }
              | undefined
          )?.placeholder === placeholder,
      );
      act(() => input.props.onChangeText(value));
    };

    setInputValue('rules.namePlaceholder', 'Quiet hours');
    setInputValue('rules.labelsPlaceholder', 'Home, Finances');
    setInputValue(
      'rules.descriptionPlaceholder',
      'Do not play loud music after 10 PM.',
    );
    const reminderPicker = () =>
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
      );
    expect(reminderPicker().props.mode).toBe('datetime');
    expect(reminderPicker().props.value).toBeInstanceOf(Date);
    expect((reminderPicker().props.value as Date).getFullYear()).toBe(
      new Date().getFullYear() + 1,
    );
    act(() => reminderPicker().props.onClear());
    expect(reminderPicker().props.value).toBeNull();
    expect(createButton().props.isDisabled).toBe(true);

    const otherMember = screen!.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'Morgan' &&
        typeof instance.props.onValueChange === 'function',
    );
    act(() => otherMember.props.onValueChange(true));
    expect(createButton().props.isDisabled).toBe(false);

    act(() =>
      reminderPicker().props.onChange(
        { type: 'set' },
        new Date(Date.now() - 60_000),
      ),
    );
    expect(createButton().props.isDisabled).toBe(true);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'rules.reminderMustBeFuture',
      ),
    ).toHaveLength(1);
    act(() => reminderPicker().props.onClear());
    expect(createButton().props.isDisabled).toBe(false);

    setInputValue('rules.labelsPlaceholder', `Home, ${'x'.repeat(81)}`);
    expect(createButton().props.isDisabled).toBe(true);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'rules.labelsTooLong',
      ),
    ).toHaveLength(1);
    setInputValue('rules.labelsPlaceholder', 'Home, Finances');
    expect(createButton().props.isDisabled).toBe(false);

    await act(async () => {
      await createButton().props.onPress();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: 'Quiet hours',
      labels: ['Home', 'Finances'],
      description: 'Do not play loud music after 10 PM.',
      requiredApproverUserIds: ['user-2'],
      remindMeToReview: null,
    });
    expect(mockDismissTo).toHaveBeenCalledWith(AppRoutePaths.viewAllRules);
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: AppRoutePaths.relationshipRuleDetails,
      params: {
        id: 'rule-1',
        detailNavigationSource: 'relationshipRules',
      },
    });

    act(() => screen!.unmount());
  });

  it('shows the relationship-selection empty state when none is selected', () => {
    mockRelationships = [];
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<NewRelationshipRuleScreen />);
    });

    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'rules.noRelationship',
      ),
    ).toHaveLength(1);
    const homeButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.openHome',
    );
    act(() => homeButton.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.home);

    act(() => screen!.unmount());
  });

  it('renders authentication and relationship query states for all rules', () => {
    mockAuthenticated = false;
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    const signInButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'paymentRequests.signIn',
    );
    act(() => signInButton.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.account);
    act(() => screen!.unmount());

    mockAuthenticated = true;
    mockUserSubject = '';
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toEqual(['auth.signedIn', 'auth.profileUnavailable']);
    act(() => screen!.unmount());

    mockUserSubject = 'user-1';
    mockSelectedRelationshipId = null;
    mockRelationships = undefined;
    mockRelationshipsLoading = true;
    mockRelationshipsFetching = true;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'RelationshipRuleListSkeletonHost',
      ),
    ).not.toHaveLength(0);
    act(() => screen!.unmount());

    mockRelationshipsLoading = false;
    mockRelationshipsFetching = false;
    mockRelationshipsError = new Error('Relationships unavailable');
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('Relationships unavailable');
    act(() => screen!.unmount());

    mockRelationshipsError = undefined;
    mockRelationships = [];
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('rules.noRelationship');
    const homeButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.openHome',
    );
    act(() => homeButton.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.home);
    act(() => screen!.unmount());
  });

  it('loads scoped rules while relationship metadata is pending and rejects stale selections', () => {
    mockRules = [];
    mockRulesLoading = true;
    mockRelationships = undefined;
    mockRelationshipsLoading = true;
    mockRelationshipsFetching = true;
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });

    expect(mockUseRelationshipRulesInfiniteQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      true,
    );
    const emptyState = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps.ListEmptyComponent as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    expect(emptyState.props.children).toEqual(
      expect.objectContaining({
        type: 'RelationshipRuleListSkeletonHost',
      }),
    );
    act(() => screen!.unmount());

    mockRulesLoading = false;
    mockRelationships = [mockRelationship];
    mockRelationshipsLoading = false;
    mockRelationshipsFetching = false;
    mockSelectedRelationshipId = 'stale-relationship';
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    expect(mockUseRelationshipRulesInfiniteQuery).toHaveBeenLastCalledWith(
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
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareScreenHost' &&
          instance.props.flashListProps,
      ),
    ).toHaveLength(0);
    act(() => screen!.unmount());
  });

  it('renders rule loading, error, empty, and next-page retry states', () => {
    mockRules = [];
    mockRulesLoading = true;
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });

    const getListProps = () =>
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      ).props.flashListProps as {
        ListEmptyComponent?: React.ReactNode;
        ListFooterComponent?: React.ReactNode;
      };
    const getEmptyMessage = () => {
      const empty = getListProps().ListEmptyComponent;
      if (!React.isValidElement<{ children?: React.ReactNode }>(empty)) {
        throw new Error('Expected the rules list to render an empty state.');
      }
      return empty.props.children;
    };

    expect(getEmptyMessage()).toEqual(
      expect.objectContaining({
        type: 'RelationshipRuleListSkeletonHost',
      }),
    );
    act(() => screen!.unmount());

    mockRulesLoading = false;
    mockRulesError = new Error('Rules unavailable');
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    expect(getEmptyMessage()).toBe('Rules unavailable');
    act(() => screen!.unmount());

    mockRulesError = undefined;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    expect(getEmptyMessage()).toBe('rules.emptyMessage');
    act(() => screen!.unmount());

    mockRulesError = new Error('More rules unavailable');
    mockRulesFetchNextPageError = true;
    mockRulesFetchingNextPage = false;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });
    const footer = getListProps().ListFooterComponent;
    if (!React.isValidElement(footer)) {
      throw new Error('Expected the list to render a next-page error footer.');
    }

    let footerRenderer: ReactTestRenderer;
    act(() => {
      footerRenderer = renderer.create(footer);
    });
    const retryButton = footerRenderer!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'paymentRequests.retry',
    );
    expect(
      footerRenderer!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('More rules unavailable');
    act(() => retryButton.props.onPress());
    expect(mockFetchNextPage).toHaveBeenCalled();

    act(() => {
      footerRenderer!.unmount();
      screen!.unmount();
    });
  });

  it('renders ratified rules without labels and navigates to their details', () => {
    mockRules = [
      {
        ...mockRule,
        id: 'ratified-rule',
        labels: [],
        status: 'ratified',
      },
    ];

    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });

    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as MockRulesListProps;
    let row: ReactTestRenderer;
    act(() => {
      row = renderer.create(listProps.renderItem({ item: mockRules[0]! }));
    });
    expect(
      row!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareBadgeHost')
        .map((badge) => badge.props.children),
    ).toEqual(['rules.ratified']);

    const tile = row!.root.find(
      (instance) =>
        instance.props.accessibilityLabel === mockRules[0]!.name &&
        typeof instance.props.onPress === 'function',
    );
    act(() => tile.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: AppRoutePaths.relationshipRuleDetails,
      params: {
        id: 'ratified-rule',
        detailNavigationSource: 'relationshipRules',
      },
    });

    act(() => {
      row!.unmount();
      screen!.unmount();
    });
  });

  it('keeps rule descriptions off list tiles and opens the selected rule', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });

    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as MockRulesListProps;
    let ruleRow: ReactTestRenderer;
    act(() => {
      ruleRow = renderer.create(listProps.renderItem({ item: mockRule }));
    });

    const renderedText = ruleRow!.root
      .findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' ||
          String(instance.type) === 'ThemeAwareBadgeHost',
      )
      .map((instance) => String(instance.props.children))
      .join(' ');
    expect(renderedText).toContain(mockRule.name);
    expect(renderedText).not.toContain(mockRule.description);

    const ruleTile = ruleRow!.root.find(
      (instance) =>
        instance.props.accessibilityLabel === mockRule.name &&
        typeof instance.props.onPress === 'function',
    );
    act(() => ruleTile.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: AppRoutePaths.relationshipRuleDetails,
      params: {
        id: 'rule-1',
        detailNavigationSource: 'relationshipRules',
      },
    });

    act(() => {
      ruleRow!.unmount();
      screen!.unmount();
    });
  });

  function createPaymentRequest(
    id: string,
    title: string,
    purchaseDate: string,
    amountMinorUnits: number,
  ): PaymentRequestSummary {
    const timestamp = `${purchaseDate}T00:00:00.000Z`;

    return {
      id,
      relationshipId: 'relationship-1',
      createdByUserId: 'user-1',
      title,
      amountMinorUnits,
      currency: 'USD',
      purchaseDate,
      categories: [],
      status: 'pending_approval',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  it('fetches the next page when the list is scrolled to its end', () => {
    mockHasNextPage = true;
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });

    const listProps = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    ).props.flashListProps as MockRulesListProps;
    act(() => listProps.onEndReached());

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    act(() => screen!.unmount());
  });

  it('sorts relationship rules by property and direction', () => {
    mockRules = [
      {
        ...mockRule,
        id: 'rule-alpha',
        name: 'Alpha rule',
        labels: ['Zulu', 'Gamma'],
        createdAt: '2025-03-01T00:00:00.000Z',
      },
      {
        ...mockRule,
        id: 'rule-zulu',
        name: 'Zulu rule',
        labels: ['beta'],
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });

    const sortButton = screen!.root.find(
      (instance) =>
        instance.type === TouchableOpacity &&
        instance.props.accessibilityLabel === 'common.sort',
    );
    act(() => sortButton.props.onPress());

    const getRuleNames = () => {
      const { data } = screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      ).props.flashListProps as MockRulesListProps;
      return data.map(({ name }) => name);
    };
    expect(getRuleNames()).toEqual(['Alpha rule', 'Zulu rule']);

    const sortField = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareDropdownHost' &&
        instance.props.placeholder === 'paymentRequests.sortBy',
    );
    act(() => sortField.props.onValueChange('name'));
    expect(getRuleNames()).toEqual(['Zulu rule', 'Alpha rule']);

    const sortOrder = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareDropdownHost' &&
        instance.props.placeholder === 'paymentRequests.sortOrder',
    );
    act(() => sortOrder.props.onValueChange('ascending'));
    expect(getRuleNames()).toEqual(['Alpha rule', 'Zulu rule']);

    act(() => sortOrder.props.onValueChange('descending'));
    expect(getRuleNames()).toEqual(['Zulu rule', 'Alpha rule']);

    act(() => sortField.props.onValueChange('labels'));
    act(() => sortOrder.props.onValueChange('ascending'));
    expect(getRuleNames()).toEqual(['Zulu rule', 'Alpha rule']);

    act(() => sortOrder.props.onValueChange('descending'));
    expect(getRuleNames()).toEqual(['Alpha rule', 'Zulu rule']);

    act(() => screen!.unmount());
  });

  it('sorts payment requests by property and direction', () => {
    mockPaymentRequests = [
      {
        ...createPaymentRequest('request-3', 'Omega', '2025-03-01', 100),
        categories: ['Zulu', 'Gamma'],
      },
      {
        ...createPaymentRequest('request-2', 'Alpha', '2025-02-01', 300),
        categories: ['beta'],
      },
      {
        ...createPaymentRequest('request-1', 'Beta', '2025-01-01', 200),
        categories: ['Delta', 'Alpha'],
      },
    ];

    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRequestsScreen />);
    });

    const sortButton = screen!.root.find(
      (instance) =>
        instance.type === TouchableOpacity &&
        instance.props.accessibilityLabel === 'common.sort',
    );
    act(() => sortButton.props.onPress());

    const getRequestTitles = () =>
      (
        screen!.root.find(
          (instance) => String(instance.type) === 'ThemeAwareScreenHost',
        ).props.flashListProps as MockPaymentRequestsListProps
      ).data.map(({ title }) => title);

    expect(getRequestTitles()).toEqual(['Omega', 'Alpha', 'Beta']);

    const sortField = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareDropdownHost' &&
        instance.props.placeholder === 'paymentRequests.sortBy',
    );
    act(() => sortField.props.onValueChange('amount'));
    expect(getRequestTitles()).toEqual(['Alpha', 'Beta', 'Omega']);

    const sortOrder = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareDropdownHost' &&
        instance.props.placeholder === 'paymentRequests.sortOrder',
    );
    act(() => sortOrder.props.onValueChange('ascending'));
    expect(getRequestTitles()).toEqual(['Omega', 'Beta', 'Alpha']);

    act(() => sortOrder.props.onValueChange('descending'));
    expect(getRequestTitles()).toEqual(['Alpha', 'Beta', 'Omega']);

    act(() => sortField.props.onValueChange('categories'));
    act(() => sortOrder.props.onValueChange('ascending'));
    expect(getRequestTitles()).toEqual(['Beta', 'Alpha', 'Omega']);

    act(() => sortOrder.props.onValueChange('descending'));
    expect(getRequestTitles()).toEqual(['Omega', 'Alpha', 'Beta']);

    act(() => screen!.unmount());
  });

  it('pushes to create a payment request from the list header', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRequestsScreen />);
    });

    const stackScreen = screen!.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const headerRight = stackScreen.props.options
      .headerRight as () => React.ReactElement;
    let header: ReactTestRenderer;
    act(() => {
      header = renderer.create(headerRight());
    });
    const createButton = header!.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'paymentRequests.createRequest',
    );

    act(() => createButton.props.onPress());

    expect(mockPush).toHaveBeenCalledWith(AppRoutePaths.createRequest);
    act(() => header!.unmount());
    act(() => screen!.unmount());
  });

  it('uses clearable date pickers to filter rule dates', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ViewAllRulesScreen />);
    });

    const filterButton = screen!.root.find(
      (instance) =>
        instance.type === TouchableOpacity &&
        instance.props.accessibilityLabel === 'common.filters',
    );
    act(() => filterButton.props.onPress());

    const getDatePicker = (accessibilityLabel: string) =>
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareTimePickerHost' &&
          instance.props.accessibilityLabel === accessibilityLabel,
      );
    const labels = [
      'rules.createdFromDate',
      'rules.createdToDate',
      'rules.ratifiedFromDate',
      'rules.ratifiedToDate',
    ];
    expect(
      screen!.root
        .findAll(
          (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
        )
        .map((picker) => picker.props.accessibilityLabel),
    ).toEqual(labels);

    for (const label of labels) {
      expect(getDatePicker(label).props.clearable).toBe(true);
      expect(getDatePicker(label).props.value).toBeNull();
    }

    const createdFromPicker = getDatePicker('rules.createdFromDate');
    const pickedDate = new Date(2025, 1, 2);
    act(() => createdFromPicker.props.onChange({ type: 'set' }, pickedDate));

    expect(getDatePicker('rules.createdFromDate').props.value).toEqual(
      pickedDate,
    );
    expect(
      (
        screen!.root.find(
          (instance) => String(instance.type) === 'ThemeAwareScreenHost',
        ).props.flashListProps as MockRulesListProps
      ).data,
    ).toEqual([]);

    act(() => getDatePicker('rules.createdFromDate').props.onClear());
    expect(getDatePicker('rules.createdFromDate').props.value).toBeNull();
    expect(
      (
        screen!.root.find(
          (instance) => String(instance.type) === 'ThemeAwareScreenHost',
        ).props.flashListProps as MockRulesListProps
      ).data,
    ).toEqual([mockRule]);

    act(() => screen!.unmount());
  });

  it('lets a required member agree to the rule from its detail page', () => {
    mockUserSubject = 'user-2';
    mockRouteParams = { id: ['rule-1'] };
    mockAgreementMutation.isPending = true;
    const screen: ReactTestRenderer = renderer.create(
      <RelationshipRuleDetailsScreen />,
    );
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'rules.agreementPending',
      ),
    ).toHaveLength(1);
    let agreeButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.agree',
    );
    expect(agreeButton.props.isDisabled).toBe(true);

    mockAgreementMutation.isPending = false;
    act(() => screen.update(<RelationshipRuleDetailsScreen />));
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'rules.agreementPending',
      ),
    ).toHaveLength(0);
    agreeButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.agree',
    );

    act(() => agreeButton.props.onPress());
    expect(mockAgree).toHaveBeenCalledWith(mockRule.id);

    act(() => screen.unmount());
  });

  it('lets the creator and required approvers open the edit form', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });

    const editButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.edit',
    );
    act(() => editButton.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: AppRoutePaths.editRule,
      params: { id: mockRule.id },
    });
    act(() => screen!.unmount());

    mockUserSubject = 'user-2';
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'rules.edit',
      ),
    ).toHaveLength(1);
    act(() => screen!.unmount());

    mockUserSubject = 'user-3';
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'rules.edit',
      ),
    ).toHaveLength(0);
    act(() => screen!.unmount());
  });

  it('updates a rule name, labels, and description and returns to its details', async () => {
    mockUserSubject = 'user-2';
    let screen: ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(<EditRelationshipRuleScreen />);
    });

    const inputs = screen!.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareInputHost',
    );
    expect(inputs.map((input) => input.props.value)).toEqual([
      mockRule.name,
      'Home, Finances',
      mockRule.description,
    ]);
    let saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.saveChanges',
    );
    expect(saveButton.props.isDisabled).toBe(true);
    act(() => {
      inputs[1]?.props.onChangeText('Home, Money');
    });

    saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.saveChanges',
    );
    expect(saveButton.props.isDisabled).toBe(false);
    act(() => {
      inputs[1]?.props.onChangeText('a'.repeat(81));
    });
    saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.saveChanges',
    );
    expect(saveButton.props.isDisabled).toBe(true);
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('rules.labelsTooLong');

    act(() => {
      inputs[1]?.props.onChangeText('Home, Finances');
    });
    saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.saveChanges',
    );
    expect(saveButton.props.isDisabled).toBe(true);

    act(() => {
      inputs[0]?.props.onChangeText('Quiet hours at home');
      inputs[1]?.props.onChangeText('Home, Money');
      inputs[2]?.props.onChangeText('Keep noise low after 9 PM.');
    });
    saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.saveChanges',
    );
    expect(saveButton.props.isDisabled).toBe(false);
    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      ruleId: mockRule.id,
      input: {
        name: 'Quiet hours at home',
        labels: ['Home', 'Money'],
        description: 'Keep noise low after 9 PM.',
      },
    });
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: AppRoutePaths.relationshipRuleDetails,
      params: { id: mockRule.id },
    });
    act(() => screen!.unmount());
  });

  it('blocks rule editing when the user is neither creator nor approver', async () => {
    mockUserSubject = 'user-3';
    let screen: ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(<EditRelationshipRuleScreen />);
    });

    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('rules.editNotAuthorized');
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'rules.saveChanges',
      ),
    ).toHaveLength(0);
    act(() => screen!.unmount());
  });

  it('pins a destructive delete button for the rule creator only', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });

    const deleteButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'common.delete',
    );
    expect(deleteButton.props.darkBackground).toBe('$error700');
    expect(deleteButton.props.lightBackground).toBe('$error600');
    expect(
      screen!.root.find(
        (instance) => String(instance.type) === 'ThemeAwareScreenHost',
      ).props.bottomContent,
    ).toBeDefined();
    act(() => screen!.unmount());

    mockUserSubject = 'user-2';
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'common.delete',
      ),
    ).toHaveLength(0);
    act(() => screen!.unmount());
  });

  it('renders rule detail authentication, missing-id, and query states', () => {
    mockAuthenticated = false;
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('paymentRequests.signIn');
    act(() => screen!.unmount());

    mockAuthenticated = true;
    mockUserSubject = '';
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toEqual(['auth.signedIn', 'auth.profileUnavailable']);
    act(() => screen!.unmount());

    mockUserSubject = 'user-1';
    mockRouteParams = {};
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('rules.notFound');
    act(() => screen!.unmount());

    mockRouteParams = { id: 'rule-1' };
    mockRuleQueryLoading = true;
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('common.loading');
    act(() => screen!.unmount());

    mockRuleQueryLoading = false;
    mockRuleForQuery = undefined;
    mockRuleQueryError = new Error('Rule unavailable');
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('Rule unavailable');
    act(() => screen!.unmount());
  });

  it('renders ratified rule dates, approval badges, and query errors', () => {
    mockUserSubject = 'user-3';
    mockMembersData = undefined;
    mockMembersError = new Error('Member list unavailable');
    mockAgreementMutation.error = new Error('Agreement failed');
    mockRuleForQuery = {
      ...mockRule,
      createdAt: 'not-a-date',
      labels: [],
      ratifiedAt: '2025-03-01T00:00:00.000Z',
      status: 'ratified',
      approvals: [
        {
          memberUserId: 'user-2',
          agreedAt: '2025-03-02T00:00:00.000Z',
        },
        { memberUserId: 'user-1' },
      ],
    };

    const screen: ReactTestRenderer = renderer.create(
      <RelationshipRuleDetailsScreen />,
    );
    const textValues = screen.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((instance) => instance.props.children);
    const badges = screen.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareBadgeHost')
      .map((badge) => badge.props.children);

    expect(textValues).toContain('not-a-date');
    expect(textValues).toContain('Member list unavailable');
    expect(textValues).toContain('Agreement failed');
    expect(textValues).toContain('user-1');
    expect(badges).toEqual([
      'rules.ratified',
      'rules.agreed',
      'rules.awaitingAgreement',
    ]);
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'rules.agree',
      ),
    ).toHaveLength(0);

    act(() => screen.unmount());
  });

  it('formats rule creation, ratification, and approval dates in German', () => {
    mockLocale = 'de';
    const ratifiedAt = '2025-03-01T00:00:00.000Z';
    const agreedAt = '2025-03-02T00:00:00.000Z';
    mockRuleForQuery = {
      ...mockRule,
      ratifiedAt,
      approvals: [{ memberUserId: 'user-2', agreedAt }],
    };

    let details!: ReactTestRenderer;
    act(() => {
      details = renderer.create(<RelationshipRuleDetailsScreen />);
    });
    const detailText = details.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((instance) => instance.props.children);
    expect(detailText).toContain(
      new Date(mockRule.createdAt).toLocaleDateString('de'),
    );
    expect(detailText).toContain(new Date(ratifiedAt).toLocaleDateString('de'));
    expect(detailText).toContain(new Date(agreedAt).toLocaleDateString('de'));
    act(() => details.unmount());

    let create!: ReactTestRenderer;
    act(() => {
      create = renderer.create(<NewRelationshipRuleScreen />);
    });
    expect(
      create.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain(new Date().toLocaleDateString('de'));
    act(() => create.unmount());
  });

  it('skeletonizes creator and approver names while member metadata loads', () => {
    mockMembersData = undefined;
    mockMembersLoading = true;
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<RelationshipRuleDetailsScreen />);
    });

    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareSkeletonHost',
      ),
    ).toHaveLength(2);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === mockRule.description,
      ),
    ).not.toHaveLength(0);
    act(() => screen!.unmount());
  });

  it('returns rule details to the all-rules screen from the pinned footer', () => {
    const screen: ReactTestRenderer = renderer.create(
      <RelationshipRuleDetailsScreen />,
    );
    const backButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.viewAll',
    );

    act(() => backButton.props.onPress());
    expect(mockDismissTo).toHaveBeenCalledWith(AppRoutePaths.viewAllRules);

    act(() => screen.unmount());
  });
});
