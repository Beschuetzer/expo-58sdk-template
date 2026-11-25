import React from 'react';
import { View } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareCalendar } from './ThemeAwareCalendar';

import { COLORS } from '@/constants/colors';

let mockCalendarColorScheme: 'light' | 'dark' = 'light';

jest.mock('@marceloterreiro/flash-calendar', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createHost =
    (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children as React.ReactNode);
  const Day = Object.assign(createHost('CalendarDayHost'), {
    Container: createHost('CalendarDayContainerHost'),
  });
  const day = {
    date: new Date(2026, 9, 28),
    displayLabel: '28',
    id: '2026-10-28',
    isDifferentMonth: false,
    isDisabled: false,
    isEndOfMonth: false,
    isEndOfWeek: false,
    isRangeValid: true,
    isStartOfMonth: false,
    isStartOfWeek: false,
    isStartOfRange: true,
    isEndOfRange: true,
    isToday: false,
    isWeekend: false,
    state: 'active',
  };
  const dayWithoutIndicators = {
    ...day,
    displayLabel: '29',
    id: '2026-10-29',
    isEndOfRange: false,
    isStartOfRange: false,
    isToday: true,
  };
  const differentMonthDay = {
    ...day,
    displayLabel: '30',
    id: '2026-09-30',
    isDifferentMonth: true,
  };

  return {
    Calendar: {
      Item: {
        Day,
        Empty: createHost('CalendarEmptyHost'),
        WeekName: createHost('CalendarWeekNameHost'),
      },
      Row: {
        Week: createHost('CalendarWeekRowHost'),
      },
      VStack: createHost('CalendarVStackHost'),
    },
    useCalendar: () => ({
      weekDaysList: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      weeksList: [[day, dayWithoutIndicators, differentMonthDay]],
    }),
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: mockCalendarColorScheme,
    textColor: mockCalendarColorScheme === 'dark' ? '#fff' : '#000',
  }),
}));

describe('ThemeAwareCalendar', () => {
  beforeEach(() => {
    mockCalendarColorScheme = 'light';
  });

  it('marks session days and renders a colored indicator for each member', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ThemeAwareCalendar
          calendarDayIndicatorsById={{
            '2026-10-28': [
              { color: '#123456', id: 'user-1' },
              { color: '#abcdef', id: 'user-2' },
            ],
          }}
          calendarMonthId="2026-10-01"
        />,
      );
    });

    const dateCell = screen!.root.find(
      (instance) =>
        String(instance.type) === 'CalendarDayHost' &&
        instance.props.metadata.id === '2026-10-28',
    );
    expect(dateCell.props.metadata.id).toBe('2026-10-28');
    expect(
      dateCell.props.theme.active({
        isEndOfRange: true,
        isPressed: false,
        isStartOfRange: true,
        isToday: false,
      }).container.backgroundColor,
    ).toBe('#f1f5f9');

    const markerColors = screen!.root
      .findAll(
        (instance) =>
          instance.type === View &&
          ['#123456', '#abcdef'].includes(
            (instance.props.style as { backgroundColor?: string })
              ?.backgroundColor ?? '',
          ),
      )
      .map(
        (instance) =>
          (instance.props.style as { backgroundColor: string }).backgroundColor,
      );
    expect(markerColors).toEqual(['#123456', '#abcdef']);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'CalendarEmptyHost',
      ),
    ).toHaveLength(1);
  });

  it('handles empty days and applies themed calendar states', () => {
    mockCalendarColorScheme = 'dark';

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ThemeAwareCalendar
          calendarDayIndicatorsById={{ '2026-10-28': [] }}
          calendarMonthId="2026-10-01"
        />,
      );
    });

    const activeDay = screen!.root.find(
      (instance) =>
        String(instance.type) === 'CalendarDayHost' &&
        instance.props.metadata.id === '2026-10-28',
    );
    const activeTheme = activeDay.props.theme;
    expect(
      activeTheme.active({
        isEndOfRange: false,
        isPressed: true,
        isStartOfRange: false,
        isToday: true,
      }),
    ).toEqual({
      container: {
        backgroundColor: '#3f3f46',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderColor: COLORS.dark.tint,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderWidth: 1,
      },
      content: { color: '#fff' },
    });
    expect(
      activeTheme.active({
        isEndOfRange: false,
        isPressed: false,
        isStartOfRange: false,
        isToday: false,
      }).container.backgroundColor,
    ).toBe('#27272a');
    expect(activeTheme.disabled()).toEqual({
      container: { backgroundColor: 'transparent' },
      content: { color: COLORS.dark.mutedText },
    });
    expect(
      activeTheme.idle({ isPressed: true }).container.backgroundColor,
    ).toBe(COLORS.dark.border);
    expect(
      activeTheme.idle({ isPressed: false }).container.backgroundColor,
    ).toBe('transparent');
    expect(
      activeTheme.today({ isPressed: true }).container.backgroundColor,
    ).toBe(COLORS.dark.border);
    expect(activeTheme.today({ isPressed: false })).toEqual({
      container: {
        backgroundColor: 'transparent',
        borderColor: COLORS.dark.tint,
        borderWidth: 1,
      },
      content: { color: '#fff' },
    });

    const markerViews = screen!.root.findAll(
      (instance) =>
        instance.type === View &&
        typeof instance.props.style === 'object' &&
        'width' in instance.props.style &&
        instance.props.style.width === 6,
    );
    expect(markerViews).toHaveLength(0);
    act(() => screen!.unmount());
  });

  it('only invokes the day handler for days with indicators', () => {
    const onDayPress = jest.fn();
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ThemeAwareCalendar
          calendarDayIndicatorsById={{
            '2026-10-28': [{ color: '#123456', id: 'me-time-1' }],
          }}
          calendarMonthId="2026-10-01"
          onDayPress={onDayPress}
        />,
      );
    });

    const activeDay = screen!.root.find(
      (instance) =>
        String(instance.type) === 'CalendarDayHost' &&
        instance.props.metadata.id === '2026-10-28',
    );
    const emptyDay = screen!.root.find(
      (instance) =>
        String(instance.type) === 'CalendarDayHost' &&
        instance.props.metadata.id === '2026-10-29',
    );
    act(() => {
      activeDay.props.onPress();
      emptyDay.props.onPress();
    });

    expect(onDayPress).toHaveBeenCalledTimes(1);
    expect(onDayPress).toHaveBeenCalledWith('2026-10-28');
    act(() => screen!.unmount());
  });

  it('renders without day indicators when none are provided', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ThemeAwareCalendar calendarMonthId="2026-10-01" />,
      );
    });

    const day = screen!.root.find(
      (instance) =>
        String(instance.type) === 'CalendarDayHost' &&
        instance.props.metadata.id === '2026-10-28',
    );
    act(() => day.props.onPress());

    expect(
      screen!.root.findAll(
        (instance) =>
          instance.type === View &&
          typeof instance.props.style === 'object' &&
          'width' in instance.props.style &&
          instance.props.style.width === 6,
      ),
    ).toHaveLength(0);
    act(() => screen!.unmount());
  });
});
