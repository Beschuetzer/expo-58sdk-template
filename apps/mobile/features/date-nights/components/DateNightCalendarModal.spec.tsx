import type {
  CreateDateNightEventInput,
  DateNightEvent,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { DateNightCalendarModal } from './DateNightCalendarModal';

const mockUseDateNightEventsQuery = jest.fn();

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

jest.mock('@/components/ui/DateEntriesCalendarModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    DateEntriesCalendarModal: (props: Record<string, unknown>) =>
      React.createElement('DateEntriesCalendarModalHost', props),
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

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareText: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareTextHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    VStack: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('VStackHost', props, children as React.ReactNode),
  };
});

jest.mock('@/features/date-nights/hooks/useDateNights', () => ({
  useDateNightEventsQuery: (...args: unknown[]) =>
    mockUseDateNightEventsQuery(...args),
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string) => key,
  }),
}));

describe('DateNightCalendarModal', () => {
  let modal: ReactTestRenderer | undefined;
  let renderedEvent: ReactTestRenderer | undefined;

  afterEach(() => {
    if (modal) {
      act(() => modal?.unmount());
      modal = undefined;
    }
    if (renderedEvent) {
      act(() => renderedEvent?.unmount());
      renderedEvent = undefined;
    }
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('passes every loaded date-night instance and date bounds to the shared calendar', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 29, 12));
    const events: DateNightEvent[] = [
      {
        id: 'date-night-1',
        relationshipId: 'relationship-1',
        day: '2026-10-20',
        description: 'Dinner by the water',
        createdByUserId: 'user-1',
        createdAt: '2026-10-20T12:00:00.000Z',
      },
      {
        id: 'date-night-2',
        relationshipId: 'relationship-1',
        day: '2026-10-20',
        createdByUserId: 'user-1',
        createdAt: '2026-10-20T14:00:00.000Z',
      },
    ];
    const calendarData = {
      earliestDate: '2026-10-20T17:00:00.000Z',
      latestDate: '2026-10-20T17:00:00.000Z',
      entries: events,
    };
    mockUseDateNightEventsQuery.mockReturnValue({
      data: calendarData,
      error: null,
      isLoading: false,
    });

    act(() => {
      modal = renderer.create(
        <DateNightCalendarModal
          isVisible
          onClose={jest.fn()}
          relationship={relationship}
        />,
      );
    });

    expect(mockUseDateNightEventsQuery).toHaveBeenCalledWith(
      'relationship-1',
      '2026-10',
      true,
    );
    const calendar = modal!.root.find(
      (instance) => String(instance.type) === 'DateEntriesCalendarModalHost',
    );
    expect(calendar.props.data).toEqual(calendarData);
    expect(calendar.props.getEntryId(events[0])).toBe('date-night-1');
    expect(calendar.props.getEntryDate(events[0])).toBe(
      new Date(2026, 9, 20, 12).toISOString(),
    );
    expect(calendar.props.title).toBe('dateNight.calendarTitle');

    act(() => {
      renderedEvent = renderer.create(calendar.props.renderEntry(events[0]));
    });
    expect(
      renderedEvent!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toContain('Dinner by the water');
  });

  it('adds a pending entry only while its month is visible', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 29, 12));
    const pendingEvent: CreateDateNightEventInput = {
      day: '2026-09-20',
      description: 'Dinner by the water',
    };
    mockUseDateNightEventsQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    });

    act(() => {
      modal = renderer.create(
        <DateNightCalendarModal
          isVisible
          onClose={jest.fn()}
          pendingEvent={pendingEvent}
          relationship={relationship}
        />,
      );
    });

    let calendar = modal!.root.find(
      (instance) => String(instance.type) === 'DateEntriesCalendarModalHost',
    );
    expect(calendar.props.pendingEntries).toEqual([]);

    act(() => calendar.props.onMonthChange('2026-09-01'));
    calendar = modal!.root.find(
      (instance) => String(instance.type) === 'DateEntriesCalendarModalHost',
    );
    expect(calendar.props.pendingEntries).toHaveLength(1);
    expect(calendar.props.pendingEntries[0]).toMatchObject({
      dayId: pendingEvent.day,
    });
    expect(mockUseDateNightEventsQuery).toHaveBeenLastCalledWith(
      'relationship-1',
      '2026-09',
      true,
    );

    act(() => {
      renderedEvent = renderer.create(calendar.props.pendingEntries[0].content);
    });
    expect(
      renderedEvent!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((instance) => instance.props.children),
    ).toEqual(['Dinner by the water', 'dateNight.eventPending']);
  });
});
