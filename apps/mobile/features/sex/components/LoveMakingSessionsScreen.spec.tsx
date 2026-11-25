import type {
  RelationshipSummary,
  SexCoinSide,
  SexDailyStatus,
  SexEvent,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { LoveMakingSessionsScreen as SexTabScreen } from './LoveMakingSessionsScreen';

const mockNavigate = jest.fn();
const mockFlipCoin = jest.fn();
const mockResetCoinFlip = jest.fn();
const mockCreateEvent = jest.fn();
let mockIsAuthenticated = true;
let mockAuthUser: { subject?: string } | null = { subject: 'user-1' };
let mockIsDevelopmentMode = false;
let mockRelationshipsLoading = false;
let mockRelationshipsError: Error | null = null;
let mockSexEvents: SexEvent[] = [];
let mockSexEventsLoadingMonth: string | null = null;
let mockSexEventQueryError: Error | null = null;
let mockLocale = 'en';
let mockSelectedRelationshipId = 'relationship-1';
const mockSexEventQueries: { enabled: boolean; month: string }[] = [];
let mockStatusQueryLoading = false;
let mockStatusQueryError: Error | null = null;
let mockFlipMutationPending = false;
let mockFlipMutationError: Error | null = null;
let mockResetMutationPending = false;
let mockResetMutationError: Error | null = null;
let mockEventMutationPending = false;
let mockEventMutationSuccess = false;
let mockEventMutationError: Error | null = null;
const mockRelationship: RelationshipSummary = {
  id: 'relationship-1',
  name: 'Shared space',
  shareCode: 'share-123',
  approvalPolicy: 'all_members',
  members: [
    {
      active: true,
      displayName: 'Alex',
      id: 'relationship-member-1',
      relationshipId: 'relationship-1',
      role: 'owner',
      userId: 'user-1',
    },
    {
      active: true,
      displayName: 'Taylor',
      id: 'relationship-member-2',
      relationshipId: 'relationship-1',
      role: 'member',
      userId: 'user-2',
    },
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
let mockRelationships: RelationshipSummary[] = [mockRelationship];

let mockStatus: SexDailyStatus = {
  today: '2026-10-29',
  memberUserIds: ['user-1', 'user-2'],
  lastSexEvent: null,
  daysSinceLastSex: null,
  coinFlip: null,
  requiresCoinFlip: true,
  canHaveSex: false,
};

function createCoinFlip(
  memberUserIds: string[],
  guess: SexCoinSide = 'heads',
  outcome: SexCoinSide = 'heads',
): NonNullable<SexDailyStatus['coinFlip']> {
  return {
    id: 'flip-1',
    relationshipId: 'relationship-1',
    day: '2026-10-29',
    memberUserIds,
    createdByUserId: 'user-1',
    guess,
    outcome,
    createdAt: '2026-10-29T12:00:00.000Z',
  };
}

function createSexEvent(day: string, memberUserIds: string[]): SexEvent {
  return {
    id: 'sex-event-1',
    relationshipId: 'relationship-1',
    day,
    memberUserIds,
    createdByUserId: 'user-1',
    createdAt: `${day}T12:00:00.000Z`,
  };
}

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useRouter: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('@/components/ui/hstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    HStack: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('HStackHost', props, children as React.ReactNode),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    VStack: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('VStackHost', props, children as React.ReactNode),
  };
});

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

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareScreenHost',
        props,
        children as React.ReactNode,
      ),
  };
});

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
    ThemedModal: ({ children, isVisible, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemedModalHost',
        { ...props, isVisible },
        isVisible ? (children as React.ReactNode) : null,
      ),
  };
});

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

jest.mock('@/components/ui/ThemeAwareTimePicker', () => ({
  ThemeAwareTimePicker: 'ThemeAwareTimePickerHost',
}));

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
    isAuthenticated: mockIsAuthenticated,
    user: mockAuthUser,
  }),
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipsQuery: () => ({
    data: mockRelationships,
    error: mockRelationshipsError,
    isLoading: mockRelationshipsLoading,
  }),
}));

jest.mock(
  '@/features/relationships/components/RelationshipMemberSelector',
  () => {
    const React = jest.requireActual('react') as typeof import('react');
    return {
      RelationshipMemberSelector: (props: Record<string, unknown>) =>
        React.createElement('RelationshipMemberSelectorHost', props),
    };
  },
);

jest.mock(
  '@/features/relationships/components/SelectedRelationshipNotice',
  () => {
    const React = jest.requireActual('react') as typeof import('react');
    return {
      SelectedRelationshipNotice: (props: Record<string, unknown>) =>
        React.createElement('SelectedRelationshipNoticeHost', props),
    };
  },
);

jest.mock('@/features/sex/components/SexCoinSimulation', () => ({
  SexCoinSimulation: 'SexCoinSimulationHost',
}));

jest.mock('@/features/date-nights/components/DateNightTracker', () => ({
  DateNightTracker: 'DateNightTrackerHost',
}));

jest.mock('@/features/sex/hooks/useSex', () => ({
  useCreateSexEventMutation: () => ({
    error: mockEventMutationError,
    isPending: mockEventMutationPending,
    isSuccess: mockEventMutationSuccess,
    mutate: mockCreateEvent,
  }),
  useFlipSexCoinMutation: () => ({
    error: mockFlipMutationError,
    isPending: mockFlipMutationPending,
    mutate: mockFlipCoin,
  }),
  useResetTodaySexCoinFlipMutation: () => ({
    error: mockResetMutationError,
    isPending: mockResetMutationPending,
    mutate: mockResetCoinFlip,
  }),
  useSexDailyStatusQuery: () => ({
    data: mockStatus,
    error: mockStatusQueryError,
    isLoading: mockStatusQueryLoading,
  }),
  useSexEventsQuery: (
    _relationshipId: string,
    month: string,
    enabled: boolean,
  ) => {
    mockSexEventQueries.push({ enabled, month });
    const isLoading = enabled && month === mockSexEventsLoadingMonth;
    return {
      data: isLoading
        ? undefined
        : {
            earliestEventDayId:
              mockSexEvents.map(({ day }) => day).sort()[0] ?? null,
            events: mockSexEvents.filter(
              (event) => event.day.slice(0, 7) === month,
            ),
          },
      error: mockSexEventQueryError,
      isLoading,
    };
  },
}));

jest.mock('@/state/slices/generalSlice', () => ({
  selectedRelationshipIdSelector: 'selectedRelationshipIdSelector',
}));

jest.mock('@/state/store', () => ({
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: mockLocale,
    t: (key: string) => key,
  }),
}));

jest.mock('@/utils/environment', () => ({
  getIsDevelopmentMode: () => mockIsDevelopmentMode,
}));

function renderSexTabScreen() {
  let screen!: renderer.ReactTestRenderer;
  act(() => {
    screen = renderer.create(<SexTabScreen />);
  });
  return screen;
}

function getScreenText(screen: renderer.ReactTestRenderer) {
  return screen.root
    .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
    .map((instance) => instance.props.children);
}

describe('LoveMakingSessionsScreen', () => {
  afterEach(() => {
    jest.useRealTimers();
    mockIsAuthenticated = true;
    mockAuthUser = { subject: 'user-1' };
    mockIsDevelopmentMode = false;
    mockRelationshipsLoading = false;
    mockRelationshipsError = null;
    mockRelationships = [mockRelationship];
    mockSelectedRelationshipId = 'relationship-1';
    mockStatusQueryLoading = false;
    mockStatusQueryError = null;
    mockFlipMutationPending = false;
    mockFlipMutationError = null;
    mockResetMutationPending = false;
    mockResetMutationError = null;
    mockEventMutationPending = false;
    mockEventMutationSuccess = false;
    mockEventMutationError = null;
    mockStatus = {
      today: '2026-10-29',
      memberUserIds: ['user-1', 'user-2'],
      lastSexEvent: null,
      daysSinceLastSex: null,
      coinFlip: null,
      requiresCoinFlip: true,
      canHaveSex: false,
    };
    mockSexEvents = [];
    mockSexEventsLoadingMonth = null;
    mockSexEventQueryError = null;
    mockLocale = 'en';
    mockSexEventQueries.length = 0;
    jest.clearAllMocks();
  });

  it('opens the rules from the header and starts one shared flip for selected members', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<SexTabScreen />);
    });

    const text = screen!.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((instance) => instance.props.children);
    expect(text).not.toContain('sex.rulesDescription');
    expect(text).toContain('sex.flipRequired');
    expect(text).toContain('sex.createEventDescription');

    const stackScreen = screen!.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    expect(stackScreen.props.options.title).toBe('sex.sessionsTitle');
    const helpButton = stackScreen.props.options.headerRight();
    expect(helpButton.props.accessibilityLabel).toBe('sex.showHowItWorks');
    expect(helpButton.props.accessibilityRole).toBe('button');
    expect(helpButton.props.children.props.name).toBe('question-circle');

    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemedModalHost' &&
          instance.props.title === 'sex.rulesTitle',
      ).props.isVisible,
    ).toBe(false);
    act(() => helpButton.props.onPress());

    const rulesModal = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemedModalHost' &&
        instance.props.title === 'sex.rulesTitle',
    );
    expect(rulesModal.props.isVisible).toBe(true);
    expect(rulesModal.props.title).toBe('sex.rulesTitle');
    expect(rulesModal.props.confirmButton.text).toBe('sex.closeRules');
    expect(
      rulesModal
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('sex.rulesDescription');
    act(() => rulesModal.props.confirmButton.onPress());
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemedModalHost' &&
          instance.props.title === 'sex.rulesTitle',
      ).props.isVisible,
    ).toBe(false);
    act(() => helpButton.props.onPress());
    const reopenedRulesModal = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemedModalHost' &&
        instance.props.title === 'sex.rulesTitle',
    );
    act(() => reopenedRulesModal.props.onClose());
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemedModalHost' &&
          instance.props.title === 'sex.rulesTitle',
      ).props.isVisible,
    ).toBe(false);

    const tailsButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.tails',
    );
    act(() => tailsButton.props.onPress());
    expect(tailsButton.props.accessibilityState.checked).toBe(true);
    const headsButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.heads',
    );
    act(() => headsButton.props.onPress());
    expect(headsButton.props.accessibilityState.checked).toBe(true);

    const flipButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.flipButton',
    );
    act(() => flipButton.props.onPress());

    expect(mockFlipCoin).toHaveBeenCalledWith(
      { guess: 'heads', memberUserIds: ['user-1', 'user-2'] },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );

    const createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.createEvent',
    );
    expect(createButton.props.isDisabled).toBe(true);

    act(() => screen!.unmount());
  });

  it('opens the relationship session calendar with a color for each participant', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-29T12:00:00.000Z'));
    mockSexEvents = [
      {
        createdAt: '2026-10-28T12:00:00.000Z',
        createdByUserId: 'user-1',
        day: '2026-10-28',
        id: 'sex-event-1',
        memberUserIds: ['user-1', 'user-2', 'unlisted-user'],
        relationshipId: 'relationship-1',
      },
      {
        createdAt: '2026-09-30T12:00:00.000Z',
        createdByUserId: 'user-1',
        day: '2026-09-30',
        id: 'sex-event-2',
        memberUserIds: ['user-1', 'user-2'],
        relationshipId: 'relationship-1',
      },
    ];

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<SexTabScreen />);
    });

    const calendarButton = screen!.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'sex.showSessionCalendar',
    );
    expect(calendarButton.props.accessibilityRole).toBe('button');
    expect(calendarButton.props.children.props.name).toBe('question-circle');

    act(() => calendarButton.props.onPress());

    expect(mockSexEventQueries).toContainEqual({
      enabled: true,
      month: '2026-10',
    });
    const calendarModal = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemedModalHost' &&
        instance.props.title === 'sex.sessionCalendarTitle',
    );
    expect(calendarModal.props.isVisible).toBe(true);
    expect(calendarModal.props.confirmButton.text).toBe(
      'sex.closeSessionCalendar',
    );

    const calendar = calendarModal.find(
      (instance) => String(instance.type) === 'ThemeAwareCalendarHost',
    );
    expect(
      calendar.props.calendarDayIndicatorsById['2026-10-28'].map(
        (indicator: { id: string }) => indicator.id,
      ),
    ).toEqual(['user-1', 'user-2', 'unlisted-user']);

    const modalText = calendarModal
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((instance) => instance.props.children);
    expect(modalText).toContain('Alex');
    expect(modalText).toContain('Taylor');
    expect(modalText).toContain('unlisted-user');

    const previousMonthButton = calendarModal.find(
      (instance) =>
        instance.props.accessibilityLabel === 'sex.previousCalendarMonth',
    );
    expect(previousMonthButton.props.accessibilityState.disabled).toBe(false);
    mockSexEventsLoadingMonth = '2026-09';
    act(() => previousMonthButton.props.onPress());
    expect(mockSexEventQueries[mockSexEventQueries.length - 1]).toEqual({
      enabled: true,
      month: '2026-09',
    });
    const loadingCalendar = calendarModal.find(
      (instance) => String(instance.type) === 'ThemeAwareCalendarHost',
    );
    expect(loadingCalendar.props.calendarMonthId).toBe('2026-09-01');
    expect(loadingCalendar.props.calendarDayIndicatorsById).toEqual({});
    expect(
      calendarModal.find(
        (instance) => instance.props.accessibilityLabel === 'common.loading',
      ),
    ).toBeDefined();

    act(() => calendarModal.props.confirmButton.onPress());
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemedModalHost' &&
          instance.props.title === 'sex.sessionCalendarTitle',
      ).props.isVisible,
    ).toBe(false);
  });

  it('does not offer another flip after one has already been recorded', () => {
    mockStatus = {
      ...mockStatus,
      coinFlip: {
        id: 'flip-1',
        relationshipId: 'relationship-1',
        day: '2026-10-29',
        memberUserIds: ['user-1', 'user-2'],
        createdByUserId: 'user-1',
        guess: 'heads',
        outcome: 'tails',
        createdAt: '2026-10-29T12:00:00.000Z',
      },
    };

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<SexTabScreen />);
    });

    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'sex.flipButton',
      ),
    ).toHaveLength(0);
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'sex.guessMissed',
      ),
    ).toHaveLength(1);
    const resultLabels = screen!.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareTextHost',
    );
    expect(
      resultLabels.find(
        (instance) => instance.props.children === 'sex.guessResult',
      ),
    ).toBeDefined();
    expect(
      resultLabels.find(
        (instance) => instance.props.children === 'sex.coinResult',
      ),
    ).toBeDefined();
    const guessValue = resultLabels.find(
      (instance) => instance.props.children === 'sex.heads',
    );
    const outcomeValue = resultLabels.find(
      (instance) => instance.props.children === 'sex.tails',
    );
    expect(guessValue?.props.fontSize).toBe(24);
    expect(outcomeValue?.props.color).toBe('$error600');

    act(() => screen!.unmount());
  });

  it('starts the German calendar week on Monday', () => {
    mockLocale = 'de';
    const screen = renderSexTabScreen();
    const openCalendarButton = screen.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'sex.showSessionCalendar',
    );
    act(() => openCalendarButton.props.onPress());

    const calendar = screen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareCalendarHost',
    );
    expect(calendar.props.calendarFirstDayOfWeek).toBe('monday');
    expect(calendar.props.calendarFormatLocale).toBe('de');
    act(() => screen.unmount());
  });

  it('uses localized calendar weeks and displays empty and loading states', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-29T12:00:00.000Z'));
    mockLocale = 'es';
    mockSexEvents = [createSexEvent('2026-09-30', ['user-2'])];

    let screen = renderSexTabScreen();
    const openCalendarButton = screen.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'sex.showSessionCalendar',
    );
    act(() => openCalendarButton.props.onPress());

    let calendarModal = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemedModalHost' &&
        instance.props.title === 'sex.sessionCalendarTitle',
    );
    const calendar = calendarModal.find(
      (instance) => String(instance.type) === 'ThemeAwareCalendarHost',
    );
    expect(calendar.props.calendarFirstDayOfWeek).toBe('monday');
    expect(
      calendarModal
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('sex.noSessionsThisMonth');

    act(() => calendarModal.props.confirmButton.onPress());
    act(() => screen.unmount());

    mockLocale = 'en';
    mockSexEvents = [];
    screen = renderSexTabScreen();
    const emptyCalendarButton = screen.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'sex.showSessionCalendar',
    );
    act(() => emptyCalendarButton.props.onPress());
    calendarModal = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemedModalHost' &&
        instance.props.title === 'sex.sessionCalendarTitle',
    );
    expect(
      calendarModal
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('sex.noRelationshipSessions');

    act(() => calendarModal.props.confirmButton.onPress());
    act(() => screen.unmount());

    mockSexEventQueryError = new Error('Calendar unavailable');
    mockSexEventsLoadingMonth = '2026-10';
    screen = renderSexTabScreen();
    const retryCalendarButton = screen.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'sex.showSessionCalendar',
    );
    act(() => retryCalendarButton.props.onPress());
    calendarModal = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemedModalHost' &&
        instance.props.title === 'sex.sessionCalendarTitle',
    );
    expect(
      calendarModal
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('sex.loadError');
    expect(
      calendarModal.find(
        (instance) => String(instance.type) === 'ThemeAwareCalendarHost',
      ),
    ).toBeDefined();
    expect(
      calendarModal.find(
        (instance) => instance.props.accessibilityLabel === 'common.loading',
      ),
    ).toBeDefined();
    act(() => screen.unmount());
  });

  it('offers the daily coin reset only in development mode', () => {
    mockStatus = {
      ...mockStatus,
      coinFlip: {
        id: 'flip-1',
        relationshipId: 'relationship-1',
        day: '2026-10-29',
        memberUserIds: ['user-1', 'user-2'],
        createdByUserId: 'user-1',
        guess: 'heads',
        outcome: 'tails',
        createdAt: '2026-10-29T12:00:00.000Z',
      },
    };

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<SexTabScreen />);
    });

    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === 'sex.resetDailyFlip',
      ),
    ).toHaveLength(0);
    act(() => screen!.unmount());

    mockIsDevelopmentMode = true;
    act(() => {
      screen = renderer.create(<SexTabScreen />);
    });

    const resetButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.resetDailyFlip',
    );
    act(() => resetButton.props.onPress());

    expect(mockResetCoinFlip).toHaveBeenCalledTimes(1);
    act(() => screen!.unmount());
  });

  it('renders authentication and relationship query states', () => {
    const cases: {
      configure: () => void;
      expectedText: string;
      navigateHome?: boolean;
    }[] = [
      {
        configure: () => {
          mockIsAuthenticated = false;
        },
        expectedText: 'paymentRequests.signIn',
      },
      {
        configure: () => {
          mockAuthUser = null;
        },
        expectedText: 'auth.profileUnavailable',
      },
      {
        configure: () => {
          mockRelationshipsLoading = true;
        },
        expectedText: 'common.loading',
      },
      {
        configure: () => {
          mockRelationshipsError = new Error('Request failed');
        },
        expectedText: 'common.relationshipLoadError',
      },
      {
        configure: () => {
          mockRelationships = [];
        },
        expectedText: 'sex.noRelationship',
        navigateHome: true,
      },
    ];

    for (const testCase of cases) {
      mockIsAuthenticated = true;
      mockAuthUser = { subject: 'user-1' };
      mockRelationships = [mockRelationship];
      mockRelationshipsLoading = false;
      mockRelationshipsError = null;
      testCase.configure();

      const screen = renderSexTabScreen();
      expect(getScreenText(screen)).toContain(testCase.expectedText);

      if (testCase.navigateHome) {
        const homeButton = screen.root.find(
          (instance) =>
            String(instance.type) === 'ThemeAwareButtonHost' &&
            instance.props.children === 'rules.openHome',
        );
        act(() => homeButton.props.onPress());
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        mockNavigate.mockClear();
      }

      act(() => screen.unmount());
    }
  });

  it('shows status messages for recorded days and member-specific flips', () => {
    const defaultStatus = { ...mockStatus };
    const cases: { status: SexDailyStatus; message: string }[] = [
      {
        status: {
          ...defaultStatus,
          coinFlip: createCoinFlip(['user-1', 'user-2']),
          lastSexEvent: createSexEvent(defaultStatus.today, [
            'user-1',
            'user-2',
          ]),
        },
        message: 'sex.alreadyRecordedToday',
      },
      {
        status: { ...defaultStatus, requiresCoinFlip: false },
        message: 'sex.noFlipRequired',
      },
      {
        status: {
          ...defaultStatus,
          coinFlip: createCoinFlip(['unknown-user']),
        },
        message: 'sex.flipRecordedForDifferentMembers',
      },
      {
        status: {
          ...defaultStatus,
          canHaveSex: true,
          coinFlip: createCoinFlip(['user-2', 'user-1']),
        },
        message: 'sex.guessMatched',
      },
    ];

    for (const testCase of cases) {
      mockStatus = testCase.status;
      const screen = renderSexTabScreen();
      const text = getScreenText(screen);

      expect(text).toContain(testCase.message);
      if (testCase.status.lastSexEvent) {
        expect(text).toContain(
          new Date(2026, 9, 29, 12).toLocaleDateString('en', {
            dateStyle: 'long',
          }),
        );
        expect(text).toContain('sex.lastRecordedMembers: Alex, Taylor');
      }
      if (testCase.status.coinFlip?.memberUserIds[0] === 'unknown-user') {
        expect(text).toContain(
          'sex.flipRecorded sex.memberSelection: unknown-user',
        );
      }

      act(() => screen.unmount());
    }
  });

  it('creates an event for today using the default date', () => {
    mockStatus = {
      ...mockStatus,
      requiresCoinFlip: false,
      canHaveSex: true,
    };

    const screen = renderSexTabScreen();
    const datePicker = screen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    );
    const createButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.createEvent',
    );

    expect(datePicker.props.value).toEqual(new Date(2026, 9, 29, 12));
    expect(createButton.props.isDisabled).toBe(false);

    act(() => createButton.props.onPress());
    expect(mockCreateEvent).toHaveBeenCalledWith({
      day: '2026-10-29',
      memberUserIds: ['user-1', 'user-2'],
    });

    act(() => screen.unmount());
  });

  it('creates an event for a selected day only with enough members', () => {
    const screen = renderSexTabScreen();
    const datePicker = screen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    );
    const memberSelector = screen.root.find(
      (instance) => String(instance.type) === 'RelationshipMemberSelectorHost',
    );
    const createButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.createEvent',
    );
    const flipButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.flipButton',
    );
    const selectedDate = new Date(2026, 9, 28, 12);

    act(() => datePicker.props.onChange({}, undefined));
    act(() => createButton.props.onPress());
    expect(mockCreateEvent).not.toHaveBeenCalled();

    act(() => datePicker.props.onChange({}, selectedDate));
    expect(datePicker.props.value).toEqual(selectedDate);
    expect(datePicker.props.maximumDate).toEqual(new Date(2026, 9, 29, 12));
    expect(datePicker.props.formatDate(selectedDate, 'en')).toBe(
      selectedDate.toLocaleDateString('en'),
    );

    act(() => memberSelector.props.onChange(['user-1']));
    expect(getScreenText(screen)).toContain('sex.needAtLeastTwoMembers');
    expect(createButton.props.isDisabled).toBe(true);
    act(() => flipButton.props.onPress());
    act(() => createButton.props.onPress());
    expect(mockFlipCoin).not.toHaveBeenCalled();
    expect(mockCreateEvent).not.toHaveBeenCalled();

    act(() => memberSelector.props.onChange(['user-2', 'user-1']));
    act(() => createButton.props.onPress());
    expect(mockCreateEvent).toHaveBeenCalledWith({
      day: '2026-10-28',
      memberUserIds: ['user-2', 'user-1'],
    });

    mockEventMutationSuccess = true;
    act(() => screen.update(<SexTabScreen />));
    expect(getScreenText(screen)).toContain('sex.eventCreated');
    act(() => screen.unmount());
  });

  it('shows query and mutation errors while actions are pending', () => {
    mockIsDevelopmentMode = true;
    mockStatus = {
      ...mockStatus,
      coinFlip: createCoinFlip(['user-1', 'user-2']),
    };
    mockStatusQueryLoading = true;
    mockStatusQueryError = new Error('Status failed');
    mockFlipMutationPending = true;
    mockFlipMutationError = new Error('Flip failed');
    mockResetMutationPending = true;
    mockResetMutationError = new Error('Reset failed');
    mockEventMutationPending = true;
    mockEventMutationError = new Error('Event failed');

    const screen = renderSexTabScreen();
    const text = getScreenText(screen);

    expect(text).toContain('common.loading');
    expect(text).toContain('sex.loadError');
    expect(text.filter((value) => value === 'sex.actionError')).toHaveLength(3);

    const resetButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.resetDailyFlip',
    );
    const createButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.createEvent',
    );
    expect(resetButton.props.isDisabled).toBe(true);
    expect(createButton.props.isDisabled).toBe(true);

    act(() => screen.unmount());
  });

  it('keeps a flip active until its latest settle timer finishes', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-29T12:00:00.000Z'));

    const screen = renderSexTabScreen();
    const flipButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.flipButton',
    );
    act(() => flipButton.props.onPress());
    act(() => flipButton.props.onPress());
    expect(mockFlipCoin).toHaveBeenCalledTimes(1);
    expect(getScreenText(screen)).toContain('sex.flipping');

    const mutationOptions = mockFlipCoin.mock.calls[0][1] as {
      onSettled: () => void;
    };
    act(() => mutationOptions.onSettled());
    act(() => jest.advanceTimersByTime(300));
    act(() => mutationOptions.onSettled());
    act(() => jest.advanceTimersByTime(599));
    expect(getScreenText(screen)).toContain('sex.flipping');
    act(() => jest.advanceTimersByTime(1));
    expect(getScreenText(screen)).not.toContain('sex.flipping');

    act(() => screen.unmount());
  });

  it('clears a pending flip settle timer when unmounted', () => {
    jest.useFakeTimers();

    const screen = renderSexTabScreen();
    const flipButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'sex.flipButton',
    );
    act(() => flipButton.props.onPress());
    const mutationOptions = mockFlipCoin.mock.calls[0][1] as {
      onSettled: () => void;
    };
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    act(() => mutationOptions.onSettled());
    const animationTimer =
      setTimeoutSpy.mock.results[setTimeoutSpy.mock.results.length - 1]?.value;
    expect(animationTimer).toBeDefined();
    act(() => screen.unmount());
    expect(clearTimeoutSpy).toHaveBeenCalledWith(animationTimer);
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});
