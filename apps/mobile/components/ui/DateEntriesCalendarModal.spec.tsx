import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  DateEntriesCalendarModal,
  type PendingCalendarEntry,
} from './DateEntriesCalendarModal';

import {
  getCurrentCalendarMonthId,
  getLocalCalendarDayId,
  shiftCalendarMonth,
  type CalendarMonthData,
} from '@/utils/calendar';

type TestEntry = {
  id: string;
  date?: string;
  label: string;
};

type CalendarTestProps = {
  boundsKey: string;
  calendarMonthId: string;
  closeButtonText: string;
  data: CalendarMonthData<TestEntry> | undefined;
  emptyCalendarText: string;
  emptyMonthText: string;
  error: Error | null | undefined;
  errorFallbackText: string;
  getEntryDate: (entry: TestEntry) => string | undefined;
  getEntryId: (entry: TestEntry) => string;
  isCalendarLoading: boolean;
  isVisible: boolean;
  locale: string;
  loadingLabel: string;
  nextMonthLabel: string;
  onClose: () => void;
  onMonthChange: (monthId: string) => void;
  pendingEntries?: PendingCalendarEntry[];
  previousMonthLabel: string;
  renderEntry: (entry: TestEntry) => React.ReactNode;
  selectDayText: string;
  title: string;
};

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicatorHost',
  TouchableOpacity: 'TouchableOpacityHost',
  ScrollView: 'ScrollViewHost',
  View: 'ViewHost',
}));

jest.mock('react-native-reanimated', () => {
  const animation = {
    duration: () => animation,
    easing: () => animation,
    withInitialValues: () => animation,
  };

  return {
    __esModule: true,
    default: { createAnimatedComponent: (component: unknown) => component },
    Easing: { linear: jest.fn() },
    FadeIn: animation,
    FadeOut: animation,
    ZoomIn: animation,
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
    createModal: () =>
      Object.assign(createHost('ModalHost'), {
        Backdrop: createHost('ModalBackdropHost'),
        Body: createHost('ModalBodyHost'),
        CloseButton: createHost('ModalCloseButtonHost'),
        Content: createHost('ModalContentHost'),
        Footer: createHost('ModalFooterHost'),
        Header: createHost('ModalHeaderHost'),
      }),
  };
});

jest.mock('@/components/ui/ThemeAwareCalendar', () => ({
  ThemeAwareCalendar: 'CalendarHost',
}));

jest.mock('@/components/ui/button', () => {
  const React = jest.requireActual('react') as typeof import('react');

  const createHost =
    (name: string) =>
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(name, props, children);

  return {
    Button: createHost('ButtonHost'),
    ButtonText: createHost('ButtonTextHost'),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const Text = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('TextHost', props, children);

  return { Text };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: 'light',
    textColor: '#111111',
  }),
}));

jest.mock('@/components/ui/useThemeAwareTypography', () => ({
  useThemeAwareTypography: () => ({ fontFamily: 'TestFont' }),
}));

describe('DateEntriesCalendarModal', () => {
  let modal: ReactTestRenderer | undefined;

  function renderCalendarModal(overrides: Partial<CalendarTestProps> = {}) {
    const props: CalendarTestProps = {
      boundsKey: 'relationship-1',
      calendarMonthId: '2026-10-01',
      closeButtonText: 'Close',
      data: undefined,
      emptyCalendarText: 'No entries',
      emptyMonthText: 'No entries this month',
      error: undefined,
      errorFallbackText: 'Could not load',
      getEntryDate: (entry) => entry.date,
      getEntryId: (entry) => entry.id,
      isCalendarLoading: false,
      isVisible: true,
      locale: 'en-US',
      loadingLabel: 'Loading',
      nextMonthLabel: 'Next month',
      onClose: jest.fn(),
      onMonthChange: jest.fn(),
      previousMonthLabel: 'Previous month',
      renderEntry: (entry) =>
        React.createElement('EntryHost', null, entry.label),
      selectDayText: 'Select a day',
      title: 'Calendar',
      ...overrides,
    };
    act(() => {
      modal = renderer.create(
        <DateEntriesCalendarModal<TestEntry> {...props} />,
      );
    });
    return modal!;
  }

  afterEach(() => {
    if (modal) {
      act(() => modal?.unmount());
      modal = undefined;
    }
    jest.useRealTimers();
  });

  it('shows all selected-day entries in a bounded nested scroll view', () => {
    const entries: TestEntry[] = [
      {
        id: 'entry-1',
        date: '2026-10-15T10:00:00.000Z',
        label: 'First entry',
      },
      {
        id: 'entry-2',
        date: '2026-10-15T12:00:00.000Z',
        label: 'Second entry',
      },
      {
        id: 'entry-3',
        date: '2026-10-16T10:00:00.000Z',
        label: 'Another day',
      },
    ];
    act(() => {
      modal = renderer.create(
        <DateEntriesCalendarModal
          boundsKey="relationship-1"
          calendarMonthId="2026-10-01"
          closeButtonText="Close"
          data={{
            earliestDate: '2026-10-01T10:00:00.000Z',
            latestDate: '2026-10-31T10:00:00.000Z',
            entries,
          }}
          emptyCalendarText="No entries"
          emptyMonthText="No entries this month"
          errorFallbackText="Could not load"
          getEntryDate={(entry) => entry.date}
          getEntryId={(entry) => entry.id}
          isCalendarLoading={false}
          isVisible
          locale="en-US"
          loadingLabel="Loading"
          nextMonthLabel="Next month"
          onClose={jest.fn()}
          onMonthChange={jest.fn()}
          previousMonthLabel="Previous month"
          renderEntry={(entry) =>
            React.createElement('EntryHost', null, entry.label)
          }
          selectDayText="Select a day"
          title="Calendar"
        />,
      );
    });

    const calendar = modal!.root.find(
      (instance) => String(instance.type) === 'CalendarHost',
    );
    expect(calendar.props.calendarDayIndicatorsById).toHaveProperty(
      '2026-10-15',
    );
    expect(calendar.props.calendarDayIndicatorsById).toHaveProperty(
      '2026-10-16',
    );

    act(() => calendar.props.onDayPress('2026-10-15'));

    const scrollView = modal!.root.find(
      (instance) => String(instance.type) === 'ScrollViewHost',
    );
    expect(scrollView.props).toMatchObject({
      nestedScrollEnabled: true,
      showsVerticalScrollIndicator: true,
      style: { maxHeight: 280 },
    });
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'EntryHost')
        .map((instance) => instance.props.children),
    ).toEqual(['First entry', 'Second entry']);
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'EntryHost')
        .map((instance) => instance.props.children),
    ).not.toContain('Another day');
    expect(
      modal!.root.find((instance) => String(instance.type) === 'ModalBodyHost')
        .props,
    ).toMatchObject({
      keyboardShouldPersistTaps: 'handled',
      scrollEnabled: true,
      showsVerticalScrollIndicator: true,
    });
  });

  it('only selects days with entries', () => {
    act(() => {
      modal = renderer.create(
        <DateEntriesCalendarModal
          boundsKey="relationship-1"
          calendarMonthId="2026-10-01"
          closeButtonText="Close"
          data={{
            earliestDate: '2026-10-01T10:00:00.000Z',
            latestDate: '2026-10-31T10:00:00.000Z',
            entries: [
              {
                id: 'entry-1',
                date: '2026-10-15T10:00:00.000Z',
                label: 'Entry',
              },
            ],
          }}
          emptyCalendarText="No entries"
          emptyMonthText="No entries this month"
          errorFallbackText="Could not load"
          getEntryDate={(entry) => entry.date}
          getEntryId={(entry) => entry.id}
          isCalendarLoading={false}
          isVisible
          locale="en-US"
          loadingLabel="Loading"
          nextMonthLabel="Next month"
          onClose={jest.fn()}
          onMonthChange={jest.fn()}
          previousMonthLabel="Previous month"
          renderEntry={(entry) =>
            React.createElement('EntryHost', null, entry.label)
          }
          selectDayText="Select a day"
          title="Calendar"
        />,
      );
    });

    const calendar = modal!.root.find(
      (instance) => String(instance.type) === 'CalendarHost',
    );
    act(() => calendar.props.onDayPress('2026-10-16'));

    expect(
      modal!.root.findAll((instance) => String(instance.type) === 'EntryHost'),
    ).toHaveLength(0);
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Select a day');
  });

  it('shows pending entries as selectable markers and expands past-day bounds', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 29, 12));
    const pendingEntries: PendingCalendarEntry[] = [
      {
        dayId: '2026-10-15',
        content: React.createElement('EntryHost', null, 'Pending entry'),
      },
    ];
    renderCalendarModal({
      pendingEntries,
    });

    const calendar = modal!.root.find(
      (instance) => String(instance.type) === 'CalendarHost',
    );
    expect(calendar.props.calendarDayIndicatorsById).toHaveProperty(
      '2026-10-15',
    );
    expect(calendar.props.calendarMinDateId).toBe('2026-10-15');

    act(() => calendar.props.onDayPress('2026-10-15'));
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'EntryHost')
        .map((instance) => instance.props.children),
    ).toContain('Pending entry');
  });

  it('shows loading indicators, localized weekdays, and error messages', () => {
    const calendarMonthId = getCurrentCalendarMonthId();
    renderCalendarModal({
      calendarMonthId,
      error: new Error('Calendar unavailable'),
      isCalendarLoading: true,
      locale: 'es-MX',
    });

    const calendar = modal!.root.find(
      (instance) => String(instance.type) === 'CalendarHost',
    );
    expect(calendar.props.calendarFirstDayOfWeek).toBe('monday');
    expect(calendar.props.calendarDayIndicatorsById).toEqual({});
    expect(
      modal!.root.findAll(
        (instance) => String(instance.type) === 'ActivityIndicatorHost',
      ),
    ).toHaveLength(1);
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Calendar unavailable');
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'TouchableOpacityHost')
        .map((instance) => instance.props.disabled),
    ).toEqual([true, true]);

    act(() => modal!.unmount());
    modal = undefined;
    renderCalendarModal({
      calendarMonthId,
      error: new Error(''),
      errorFallbackText: 'Fallback error',
    });

    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Fallback error');
    expect(
      modal!.root.findAll(
        (instance) => String(instance.type) === 'CalendarHost',
      ),
    ).toHaveLength(0);
    expect(
      modal!.root.findAll(
        (instance) => String(instance.type) === 'ActivityIndicatorHost',
      ),
    ).toHaveLength(0);
  });

  it.each([
    ['de', 'monday'],
    ['de-CH', 'monday'],
    ['es-MX', 'monday'],
    ['en-US', 'sunday'],
  ] as const)('uses the correct week start for %s', (locale, firstDay) => {
    renderCalendarModal({ isCalendarLoading: true, locale });

    const calendar = modal!.root.find(
      (instance) => String(instance.type) === 'CalendarHost',
    );
    expect(calendar.props.calendarFirstDayOfWeek).toBe(firstDay);
    expect(calendar.props.calendarFormatLocale).toBe(locale);
  });

  it('renders empty-month and empty-calendar states and closes the modal', () => {
    const calendarMonthId = getCurrentCalendarMonthId();
    const onClose = jest.fn();
    renderCalendarModal({
      calendarMonthId,
      data: {
        earliestDate: `${calendarMonthId}T12:00:00.000Z`,
        latestDate: `${calendarMonthId}T12:00:00.000Z`,
        entries: [],
      },
      onClose,
    });

    const renderedText = () =>
      modal!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children);
    expect(renderedText()).toContain('No entries this month');
    const modalHost = modal!.root.find(
      (instance) => String(instance.type) === 'ModalHost',
    );
    expect(modalHost.props).toMatchObject({
      closeOnOverlayClick: true,
      isOpen: true,
    });
    const closeButton = modal!.root.find(
      (instance) => String(instance.type) === 'ButtonHost',
    );
    act(() => closeButton.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => modal!.unmount());
    modal = undefined;
    renderCalendarModal({
      calendarMonthId,
      data: { earliestDate: null, latestDate: null, entries: [] },
    });
    expect(renderedText()).toContain('No entries');
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'TouchableOpacityHost')
        .map((instance) => instance.props.disabled),
    ).toEqual([true, true]);
  });

  it('navigates within date bounds and ignores entries without dates', () => {
    const calendarMonthId = getCurrentCalendarMonthId();
    const previousMonthId = shiftCalendarMonth(calendarMonthId, -1);
    const nextMonthId = shiftCalendarMonth(calendarMonthId, 1);
    const entryDate = `${calendarMonthId.slice(0, 7)}-15T12:00:00.000Z`;
    const entryDayId = getLocalCalendarDayId(entryDate);
    const onMonthChange = jest.fn();
    const entries: TestEntry[] = [
      { id: 'dated-entry', date: entryDate, label: 'Dated entry' },
      { id: 'undated-entry', label: 'Undated entry' },
    ];
    renderCalendarModal({
      calendarMonthId,
      data: {
        earliestDate: `${previousMonthId}T12:00:00.000Z`,
        latestDate: `${nextMonthId}T12:00:00.000Z`,
        entries,
      },
      onMonthChange,
    });

    const calendar = modal!.root.find(
      (instance) => String(instance.type) === 'CalendarHost',
    );
    expect(calendar.props.calendarDayIndicatorsById).toHaveProperty(entryDayId);
    expect(Object.keys(calendar.props.calendarDayIndicatorsById)).toHaveLength(
      1,
    );
    act(() => calendar.props.onDayPress(entryDayId));
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'EntryHost')
        .map((instance) => instance.props.children),
    ).toEqual(['Dated entry']);

    const previousButton = modal!.root.find(
      (instance) => instance.props.accessibilityLabel === 'Previous month',
    );
    const nextButton = modal!.root.find(
      (instance) => instance.props.accessibilityLabel === 'Next month',
    );
    expect(previousButton.props.disabled).toBe(false);
    expect(nextButton.props.disabled).toBe(false);
    act(() => previousButton.props.onPress());
    expect(onMonthChange).toHaveBeenLastCalledWith(previousMonthId);
    expect(
      modal!.root.findAll((instance) => String(instance.type) === 'EntryHost'),
    ).toHaveLength(0);
    expect(
      modal!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Select a day');
    act(() => nextButton.props.onPress());
    expect(onMonthChange).toHaveBeenLastCalledWith(nextMonthId);
  });
});
