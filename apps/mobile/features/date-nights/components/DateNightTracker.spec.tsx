import type {
  CreateDateNightEventInput,
  DateNightEvent,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { DateNightTracker } from './DateNightTracker';

const mockUseDateNightEventsQuery = jest.fn();
const mockMutation = {
  error: null as Error | null,
  isPending: false,
  isSuccess: false,
  variables: undefined as CreateDateNightEventInput | undefined,
  mutate: jest.fn(),
};

const relationship: RelationshipSummary = {
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
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'ThemeAwareInputHost',
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

jest.mock('@/components/ui/ThemeAwareTimePicker', () => ({
  ThemeAwareTimePicker: 'ThemeAwareTimePickerHost',
}));

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: 'light',
    getTextColor: (onSolidBackground = false) =>
      onSolidBackground ? '#ffffff' : '#000000',
    textColor: '#000000',
  }),
}));

jest.mock('@/features/date-nights/components/DateNightCalendarModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    DateNightCalendarModal: (props: Record<string, unknown>) =>
      React.createElement('DateNightCalendarModalHost', props),
  };
});

jest.mock('@/features/date-nights/hooks/useDateNights', () => ({
  useCreateDateNightEventMutation: () => mockMutation,
  useDateNightEventsQuery: (...args: unknown[]) =>
    mockUseDateNightEventsQuery(...args),
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string) => key,
  }),
}));

describe('DateNightTracker', () => {
  let screen: ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 29, 12));
    mockMutation.error = null;
    mockMutation.isPending = false;
    mockMutation.isSuccess = false;
    mockMutation.variables = undefined;
    mockMutation.mutate.mockReset();
    mockUseDateNightEventsQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    });
  });

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function renderTracker() {
    act(() => {
      screen = renderer.create(
        <DateNightTracker relationship={relationship} />,
      );
    });
    return screen!;
  }

  it('shows the latest date and opens its calendar from the first card', () => {
    mockUseDateNightEventsQuery.mockReturnValue({
      data: {
        earliestDate: '2026-09-30T17:00:00.000Z',
        latestDate: '2026-10-28T17:00:00.000Z',
        entries: [] as DateNightEvent[],
      },
      error: null,
      isLoading: false,
    });

    const tracker = renderTracker();
    expect(
      tracker.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
      ),
    ).toHaveLength(2);
    const text = tracker.root
      .findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' ||
          String(instance.type) === 'ThemeAwareHeadingHost',
      )
      .map((instance) => instance.props.children);
    expect(text).toContain('dateNight.lastRecordedTitle');
    expect(text).toContain('Wednesday, October 28, 2026');

    const calendarButton = tracker.root.find(
      (instance) =>
        instance.props.accessibilityLabel === 'dateNight.showCalendar',
    );
    act(() => calendarButton.props.onPress());

    const calendarModal = tracker.root.find(
      (instance) => String(instance.type) === 'DateNightCalendarModalHost',
    );
    expect(calendarModal.props).toMatchObject({
      isVisible: true,
      relationship,
    });
  });

  it('records the selected day and shows mutation feedback', () => {
    const tracker = renderTracker();
    const datePicker = tracker.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTimePickerHost',
    );
    const selectedDate = new Date(2026, 9, 27, 12);

    act(() => datePicker.props.onChange({}, selectedDate));
    expect(datePicker.props.value).toEqual(selectedDate);
    expect(datePicker.props.maximumDate).toEqual(new Date(2026, 9, 29, 12));

    const descriptionInput = tracker.root.find(
      (instance) => String(instance.type) === 'ThemeAwareInputHost',
    );
    expect(descriptionInput.props.inputFieldProps).toMatchObject({
      maxLength: 2_000,
      multiline: true,
      placeholder: 'dateNight.descriptionPlaceholder',
    });
    act(() => descriptionInput.props.onChangeText('  Dinner and a movie  '));

    const createButton = tracker.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'dateNight.create',
    );
    act(() => createButton.props.onPress());
    expect(mockMutation.mutate).toHaveBeenCalledWith({
      day: '2026-10-27',
      description: 'Dinner and a movie',
    });

    mockMutation.isPending = true;
    mockMutation.variables = {
      day: '2026-10-27',
      description: 'Dinner and a movie',
    };
    act(() => tracker.update(<DateNightTracker relationship={relationship} />));
    const pendingFeedback = tracker.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((instance) => instance.props.children);
    expect(pendingFeedback).toContain('dateNight.eventPending');
    expect(pendingFeedback).toContain('Tuesday, October 27, 2026');
    expect(
      tracker.root.find(
        (instance) => String(instance.type) === 'DateNightCalendarModalHost',
      ).props.pendingEvent,
    ).toEqual(mockMutation.variables);

    mockMutation.isSuccess = true;
    mockMutation.isPending = false;
    act(() => tracker.update(<DateNightTracker relationship={relationship} />));
    const feedback = tracker.root
      .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
      .map((instance) => instance.props.children);
    expect(feedback).toContain('dateNight.created');
    expect(feedback).not.toContain('dateNight.eventPending');
  });
});
