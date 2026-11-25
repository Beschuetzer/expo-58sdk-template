import type {
  ActivityEventType,
  PaymentRequest,
  RelationshipMember,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import PaymentRequestDetailsScreen from '../app/payment-request/[id]';

import { AppRoutePaths } from '@/constants/navigation';

const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string } | null;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1' },
};
const mockRequest: PaymentRequest = {
  id: 'request-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-2',
  title: 'Dinner',
  rationale: 'A shared meal',
  amountMinorUnits: 1250,
  currency: 'USD',
  purchaseDate: '2025-01-02T00:00:00.000Z',
  categories: ['Dining'],
  requestedSplit: [
    { memberUserId: 'user-1', percentage: 50 },
    { memberUserId: 'user-2', percentage: 50 },
  ],
  status: 'pending_approval',
  decisions: [
    {
      id: 'decision-1',
      memberUserId: 'user-2',
      decision: 'approved',
      comment: 'Looks good',
      createdAt: '2025-01-03T00:00:00.000Z',
    },
  ],
  activity: [
    {
      id: 'activity-1',
      actorUserId: 'user-2',
      eventType: 'created',
      metadata: {},
      createdAt: '2025-01-02T00:00:00.000Z',
    },
  ],
  evaluation: {
    answers: { necessary: true, note: 'Useful' },
  },
  createdAt: '2025-01-02T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
};
const mockRequestQuery = {
  data: mockRequest as PaymentRequest | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockMembersQuery: {
  data: RelationshipMember[] | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
} = {
  data: [
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
      displayName: 'Amy',
      role: 'member',
      active: true,
    },
  ],
  error: null,
  isError: false,
  isLoading: false,
};
const mockDecideMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
};
const mockCancelMutation = {
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
  reset: jest.fn(),
};
const mockDismissTo = jest.fn();
let mockRouteParams: { id?: string | string[] } = { id: 'request-1' };
let mockLocale = 'en';

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useLocalSearchParams: () => mockRouteParams,
    useRouter: () => ({ dismissTo: mockDismissTo }),
  };
});

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicatorHost',
  View: 'ViewHost',
  Text: 'TextHost',
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
}));

jest.mock('@/components/ui/ThemeAwareBadge', () => ({
  ThemeAwareBadge: 'BadgeHost',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));

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
    }: {
      bottomContent?: React.ReactNode;
      children?: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        'ScreenHost',
        { ...props, bottomContent },
        children,
        bottomContent,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'SkeletonHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareHeading: 'HeadingHost',
  ThemeAwareText: 'TextHost',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useCancelPaymentRequestMutation: () => mockCancelMutation,
  useDeletePaymentRequestMutation: () => mockDeleteMutation,
  useDecidePaymentRequestMutation: () => mockDecideMutation,
  usePaymentRequestQuery: () => mockRequestQuery,
  useRelationshipMembersQuery: () => mockMembersQuery,
  useUpdatePaymentRequestMutation: () => mockUpdateMutation,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ locale: mockLocale, t: (key: string) => key }),
}));

describe('PaymentRequestDetailsScreen', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockRequestQuery.data = mockRequest;
    mockRequestQuery.error = null;
    mockRequestQuery.isLoading = false;
    mockMembersQuery.data = [
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
        displayName: 'Amy',
        role: 'member',
        active: true,
      },
    ];
    mockMembersQuery.error = null;
    mockMembersQuery.isError = false;
    mockMembersQuery.isLoading = false;
    mockDecideMutation.error = null;
    mockDecideMutation.isPending = false;
    mockCancelMutation.error = null;
    mockCancelMutation.isPending = false;
    mockDeleteMutation.error = null;
    mockDeleteMutation.isPending = false;
    mockUpdateMutation.error = null;
    mockUpdateMutation.isPending = false;
    mockRouteParams = { id: 'request-1' };
    mockLocale = 'en';
    jest.clearAllMocks();
  });

  function renderScreen() {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(<PaymentRequestDetailsScreen />);
    });
    return screen!;
  }

  function getTexts(screen: ReactTestRenderer) {
    return screen.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
  }

  function getButton(screen: ReactTestRenderer, label: string) {
    const button = screen.root.findAll(
      (instance) => String(instance.type) === 'ButtonHost',
    );
    const match = button.find((instance) => instance.props.children === label);
    if (!match) {
      throw new Error(`Could not find button "${label}".`);
    }
    return match;
  }

  it('renders request details and submits approve or reject decisions', () => {
    const screen = renderScreen();
    expect(
      screen.root
        .findAll((instance) => String(instance.type) === 'BadgeHost')
        .map((badge) => badge.props.children),
    ).toEqual(['paymentRequests.submitted', 'Dining']);
    expect(getTexts(screen)).toContain('12.50 USD');
    expect(getTexts(screen)).toContain(
      'Amy: paymentRequests.approved - Looks good',
    );
    expect(getTexts(screen)).toContain('necessary: true');
    expect(
      getTexts(screen).some((value) =>
        String(value).startsWith('paymentRequests.activityCreated:'),
      ),
    ).toBe(true);

    const commentInput = screen.root.find(
      (instance) => String(instance.type) === 'InputHost',
    );
    act(() => commentInput.props.onChangeText('Reviewed'));
    act(() => getButton(screen, 'paymentRequests.approve').props.onPress());
    expect(mockDecideMutation.mutate).toHaveBeenLastCalledWith({
      paymentRequestId: 'request-1',
      input: { decision: 'approved', comment: 'Reviewed' },
    });

    act(() => getButton(screen, 'paymentRequests.reject').props.onPress());
    expect(mockDecideMutation.mutate).toHaveBeenLastCalledWith({
      paymentRequestId: 'request-1',
      input: { decision: 'rejected', comment: 'Reviewed' },
    });

    act(() =>
      getButton(screen, 'paymentRequests.viewAllRequests').props.onPress(),
    );
    expect(mockDismissTo).toHaveBeenCalledWith(AppRoutePaths.viewAllRequests);

    act(() => screen.unmount());
  });

  it.each(['en', 'es', 'de'] as const)(
    'formats purchase and activity dates in the selected %s locale',
    (locale) => {
      mockLocale = locale;
      const editedAt = '2025-01-04T00:00:00.000Z';
      mockRequestQuery.data = {
        ...mockRequest,
        activity: [
          ...mockRequest.activity,
          {
            id: 'activity-2',
            actorUserId: 'user-2',
            eventType: 'edited',
            metadata: {},
            createdAt: editedAt,
          },
        ],
      };
      const screen = renderScreen();

      expect(getTexts(screen)).toContain(
        new Date(mockRequest.purchaseDate).toLocaleDateString(locale),
      );
      expect(getTexts(screen)).toContain(
        `Amy: ${new Date(editedAt).toLocaleString(locale)}`,
      );
      expect(getTexts(screen)).toContain(
        `paymentRequests.edited: ${new Date(editedAt).toLocaleString(locale)}`,
      );
      act(() => screen.unmount());
    },
  );

  it('uses translation keys for decisions and activity types', () => {
    mockLocale = 'de';
    const timestamp = '2025-01-04T00:00:00.000Z';
    const eventTypes = [
      ['created', 'paymentRequests.activityCreated'],
      ['edited', 'paymentRequests.edited'],
      ['submitted', 'paymentRequests.activitySubmitted'],
      ['approved', 'paymentRequests.approved'],
      ['rejected', 'paymentRequests.rejected'],
      ['changes_requested', 'paymentRequests.changesRequested'],
      ['cancelled', 'paymentRequests.cancelled'],
    ] as const;
    mockRequestQuery.data = {
      ...mockRequest,
      decisions: (['approved', 'rejected', 'changes_requested'] as const).map(
        (decision) => ({
          id: decision,
          memberUserId: 'user-2',
          decision,
          createdAt: timestamp,
        }),
      ),
      activity: [
        ...eventTypes.map(([eventType]) => ({
          id: eventType,
          actorUserId: 'user-2',
          eventType,
          metadata: {},
          createdAt: timestamp,
        })),
        {
          id: 'future',
          actorUserId: 'user-2',
          eventType: 'future_event' as ActivityEventType,
          metadata: {},
          createdAt: timestamp,
        },
        {
          id: 'prototype',
          actorUserId: 'user-2',
          eventType: 'constructor' as ActivityEventType,
          metadata: {},
          createdAt: timestamp,
        },
      ],
    };
    const screen = renderScreen();
    const texts = getTexts(screen);

    expect(texts).toContain('Amy: paymentRequests.approved');
    expect(texts).toContain('Amy: paymentRequests.rejected');
    expect(texts).toContain('Amy: paymentRequests.changesRequested');
    for (const [, label] of eventTypes) {
      expect(texts).toContain(
        `${label}: ${new Date(timestamp).toLocaleString('de')}`,
      );
    }
    expect(texts).toContain(
      `future_event: ${new Date(timestamp).toLocaleString('de')}`,
    );
    expect(texts).toContain(
      `constructor: ${new Date(timestamp).toLocaleString('de')}`,
    );
    act(() => screen.unmount());
  });

  it('shows pending feedback while a decision or cancellation is submitting', () => {
    mockDecideMutation.isPending = true;
    const decisionScreen = renderScreen();
    expect(getTexts(decisionScreen)).toContain(
      'paymentRequests.decisionPending',
    );
    expect(
      getButton(decisionScreen, 'paymentRequests.approve').props.isDisabled,
    ).toBe(true);
    act(() => decisionScreen.unmount());

    mockDecideMutation.isPending = false;
    mockRequestQuery.data = {
      ...mockRequest,
      createdByUserId: 'user-1',
      status: 'draft',
      decisions: [],
      categories: [],
      evaluation: undefined,
      activity: [],
    };
    mockCancelMutation.isPending = true;
    const cancellationScreen = renderScreen();
    expect(getTexts(cancellationScreen)).toContain(
      'paymentRequests.cancellationPending',
    );
    expect(
      getButton(cancellationScreen, 'paymentRequests.cancel').props.isDisabled,
    ).toBe(true);
    expect(
      cancellationScreen.root
        .findAll((instance) => String(instance.type) === 'BadgeHost')
        .map((badge) => badge.props.children),
    ).toContain('paymentRequests.draft');
    act(() => cancellationScreen.unmount());
  });

  it('lets an approver edit a pending request and shows the latest editor and time', () => {
    mockRequestQuery.data = {
      ...mockRequest,
      activity: [
        ...mockRequest.activity,
        {
          id: 'activity-2',
          actorUserId: 'user-2',
          eventType: 'edited',
          metadata: {},
          createdAt: '2025-01-04T00:00:00.000Z',
        },
      ],
    };
    const screen = renderScreen();

    expect(getButton(screen, 'paymentRequests.editRequest')).toBeDefined();
    expect(getTexts(screen)).toContain('paymentRequests.lastEdited');
    expect(
      getTexts(screen).some((value) => String(value).startsWith('Amy:')),
    ).toBe(true);
    expect(getTexts(screen)).toContain(
      `Amy: ${new Date('2025-01-04T00:00:00.000Z').toLocaleString('en')}`,
    );
    expect(
      getTexts(screen).some((value) =>
        String(value).startsWith('paymentRequests.edited:'),
      ),
    ).toBe(true);

    act(() => getButton(screen, 'paymentRequests.editRequest').props.onPress());
    const amountCurrencyColumns = screen.root.findAll(
      (instance) =>
        instance.props.className === 'flex-1' &&
        instance.findAll(
          (child) =>
            String(child.type) === 'InputHost' &&
            ['12.50', 'USD'].includes(child.props.value),
        ).length > 0,
    );
    expect(amountCurrencyColumns).toHaveLength(2);
    const inputs = screen.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    const findInput = (value: string) => {
      const input = inputs.find((instance) => instance.props.value === value);
      if (!input)
        throw new Error(`Could not find input with value "${value}".`);
      return input;
    };
    act(() => findInput('Dinner').props.onChangeText('Lunch'));
    act(() => findInput('A shared meal').props.onChangeText('A shared lunch'));
    act(() => findInput('12.50').props.onChangeText('18.25'));
    act(() => findInput('USD').props.onChangeText('eur'));
    act(() => findInput('Dining').props.onChangeText('Dining, Household'));
    act(() => findInput('50').props.onChangeText('60'));
    act(() => getButton(screen, 'paymentRequests.no').props.onPress());
    act(() => getButton(screen, 'paymentRequests.saveChanges').props.onPress());

    expect(mockUpdateMutation.mutate).toHaveBeenCalledWith(
      {
        paymentRequestId: 'request-1',
        input: {
          title: 'Lunch',
          rationale: 'A shared lunch',
          amountMinorUnits: 1825,
          currency: 'EUR',
          purchaseDate: '2025-01-02T00:00:00.000Z',
          categories: ['Dining', 'Household'],
          requestedSplit: [
            { memberUserId: 'user-1', percentage: 60 },
            { memberUserId: 'user-2', percentage: 40 },
          ],
          evaluation: {
            answers: { necessary: false, note: 'Useful' },
          },
        },
      },
      { onSuccess: expect.any(Function) },
    );

    act(() => screen.unmount());
  });

  it('lets the request creator decide again after another member edits', () => {
    mockAuth.user = { subject: 'user-2' };
    mockRequestQuery.data = {
      ...mockRequest,
      decisions: [
        ...mockRequest.decisions.filter(
          (decision) => decision.memberUserId !== 'user-2',
        ),
        {
          id: 'decision-2',
          memberUserId: 'user-1',
          decision: 'approved',
          createdAt: '2025-01-04T00:00:00.000Z',
        },
      ],
      activity: [
        ...mockRequest.activity,
        {
          id: 'activity-2',
          actorUserId: 'user-1',
          eventType: 'edited',
          metadata: {},
          createdAt: '2025-01-04T00:00:00.000Z',
        },
      ],
    };
    const screen = renderScreen();

    expect(getButton(screen, 'paymentRequests.approve')).toBeDefined();
    expect(getButton(screen, 'paymentRequests.reject')).toBeDefined();
    expect(getTexts(screen)).toContain('paymentRequests.requiredApprovers');
    expect(getTexts(screen)).toContain('Alex: paymentRequests.approved');
    expect(getTexts(screen)).toContain(
      'Amy: paymentRequests.awaitingApprovalStatus',
    );

    act(() => screen.unmount());
  });

  it('allows the creator to edit drafts but not resolved requests', () => {
    mockAuth.user = { subject: 'user-2' };
    mockRequestQuery.data = {
      ...mockRequest,
      createdByUserId: 'user-2',
      status: 'draft',
    };
    let screen = renderScreen();
    expect(getButton(screen, 'paymentRequests.editRequest')).toBeDefined();
    act(() => screen.unmount());

    mockRequestQuery.data = {
      ...mockRequest,
      createdByUserId: 'user-2',
      status: 'approved',
    };
    screen = renderScreen();
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'paymentRequests.editRequest',
      ),
    ).toHaveLength(0);
    act(() => screen.unmount());
  });

  it('renders authentication and request loading or error states', () => {
    mockAuth.isAuthenticated = false;
    let screen = renderScreen();
    expect(getTexts(screen)).toContain('paymentRequests.signIn');
    expect(getButton(screen, 'paymentRequests.viewAllRequests')).toBeDefined();
    act(() => screen.unmount());

    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    screen = renderScreen();
    expect(getTexts(screen)).toEqual([
      'auth.signedIn',
      'auth.profileUnavailable',
    ]);
    act(() => screen.unmount());

    mockAuth.user = { subject: 'user-1' };
    mockRequestQuery.data = undefined;
    mockRequestQuery.isLoading = true;
    screen = renderScreen();
    expect(getTexts(screen)).toContain('common.loading');
    act(() => screen.unmount());

    mockRequestQuery.isLoading = false;
    mockRequestQuery.error = new Error('Request unavailable');
    screen = renderScreen();
    expect(getTexts(screen)).toContain('Request unavailable');
    act(() => screen.unmount());
  });

  it('shows all request statuses and enables cancellation only for its creator', () => {
    const statuses = [
      ['approved', 'paymentRequests.approved'],
      ['rejected', 'paymentRequests.rejected'],
      ['cancelled', 'paymentRequests.cancelled'],
      ['draft', 'paymentRequests.draft'],
      ['pending_approval', 'paymentRequests.submitted'],
    ] as const;

    for (const [status, label] of statuses) {
      mockRequestQuery.data = {
        ...mockRequest,
        createdByUserId: 'user-2',
        status,
      };
      const screen = renderScreen();
      expect(
        screen.root
          .findAll((instance) => String(instance.type) === 'BadgeHost')
          .map((badge) => badge.props.children),
      ).toContain(label);
      expect(
        screen.root.findAll(
          (instance) =>
            String(instance.type) === 'ButtonHost' &&
            instance.props.children === 'paymentRequests.cancel',
        ),
      ).toHaveLength(0);
      act(() => screen.unmount());
    }

    mockRequestQuery.data = {
      ...mockRequest,
      createdByUserId: 'user-1',
      status: 'draft',
      decisions: [],
      categories: [],
      evaluation: undefined,
      activity: [],
    };
    const creatorScreen = renderScreen();
    expect(getTexts(creatorScreen)).toContain(
      'paymentRequests.awaitingApprovalStatus',
    );
    act(() =>
      getButton(creatorScreen, 'paymentRequests.cancel').props.onPress(),
    );
    expect(mockCancelMutation.mutate).toHaveBeenCalledWith('request-1');
    expect(
      creatorScreen.root.findAll(
        (instance) => String(instance.type) === 'BadgeHost',
      ),
    ).toHaveLength(1);
    act(() => creatorScreen.unmount());
  });

  it('pins a destructive delete button only for the request creator', () => {
    mockRequestQuery.data = {
      ...mockRequest,
      createdByUserId: 'user-2',
    };
    const memberScreen = renderScreen();
    expect(
      memberScreen.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'common.delete',
      ),
    ).toHaveLength(0);
    act(() => memberScreen.unmount());

    mockRequestQuery.data = {
      ...mockRequest,
      createdByUserId: 'user-1',
    };
    const creatorScreen = renderScreen();
    const deleteButton = getButton(creatorScreen, 'common.delete');
    expect(deleteButton.props.darkBackground).toBe('$error700');
    expect(deleteButton.props.lightBackground).toBe('$error600');
    expect(
      creatorScreen.root.find(
        (instance) => String(instance.type) === 'ScreenHost',
      ).props.bottomContent,
    ).toBeDefined();
    act(() => creatorScreen.unmount());
  });

  it('shows decision loading and errors and displays mutation failures', () => {
    mockMembersQuery.isLoading = true;
    mockRequestQuery.data = {
      ...mockRequest,
      decisions: [mockRequest.decisions[0]!],
    };
    let screen = renderScreen();
    expect(getTexts(screen)).toContain('12.50 USD');
    expect(
      screen.root.findAll(
        (instance) => String(instance.type) === 'SkeletonHost',
      ),
    ).not.toHaveLength(0);
    act(() => screen.unmount());

    mockMembersQuery.isLoading = false;
    mockMembersQuery.isError = true;
    mockMembersQuery.error = new Error('Member list unavailable');
    mockDecideMutation.error = new Error('Decision failed');
    screen = renderScreen();
    expect(getTexts(screen)).toContain('Member list unavailable');
    expect(getTexts(screen)).toContain('Decision failed');
    act(() => screen.unmount());

    mockMembersQuery.isError = false;
    mockMembersQuery.error = null;
    mockDecideMutation.error = null;
    mockCancelMutation.error = new Error('Cancellation failed');
    mockRequestQuery.data = {
      ...mockRequest,
      createdByUserId: 'user-1',
      status: 'draft',
      decisions: [],
    };
    screen = renderScreen();
    expect(getTexts(screen)).toContain('Cancellation failed');
    act(() => screen.unmount());
  });
});
