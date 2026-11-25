import {
  Calendar,
  type CalendarActiveDateRange,
  type CalendarDayMetadata,
  type CalendarTheme,
  useCalendar,
} from '@marceloterreiro/flash-calendar';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { COLORS } from '@/constants/colors';

export type ThemeAwareCalendarDayIndicator = {
  id: string;
  color: string;
};

type ThemeAwareCalendarProps = {
  calendarDayIndicatorsById?: Readonly<
    Record<string, readonly ThemeAwareCalendarDayIndicator[]>
  >;
  calendarFirstDayOfWeek?: 'sunday' | 'monday';
  calendarFormatLocale?: string;
  calendarMaxDateId?: string;
  calendarMinDateId?: string;
  calendarMonthId: string;
  onDayPress?: (dayId: string) => void;
};

const DAY_HEIGHT = 44;
const DAY_SPACING = 6;
const ROW_SPACING = 6;

const ignoreDayPress = () => undefined;

function renderCalendarDay(
  day: CalendarDayMetadata,
  dayIndicators: readonly ThemeAwareCalendarDayIndicator[],
  theme: CalendarTheme,
  onDayPress?: (dayId: string) => void,
) {
  if (day.isDifferentMonth) {
    return (
      <Calendar.Item.Empty
        height={DAY_HEIGHT}
        key={day.id}
        theme={theme.itemEmpty}
      />
    );
  }

  return (
    <Calendar.Item.Day.Container
      dayHeight={DAY_HEIGHT}
      daySpacing={DAY_SPACING}
      isStartOfWeek={day.isStartOfWeek}
      key={day.id}
      metadata={day}
      shouldShowActiveDayFiller={false}
      theme={theme.itemDayContainer}
    >
      <View style={{ flex: 1, height: DAY_HEIGHT, position: 'relative' }}>
        <Calendar.Item.Day
          height={DAY_HEIGHT}
          metadata={day}
          onPress={
            dayIndicators.length > 0 && onDayPress
              ? () => onDayPress(day.id)
              : ignoreDayPress
          }
          theme={theme.itemDay}
        >
          {day.displayLabel}
        </Calendar.Item.Day>
        {dayIndicators.length > 0 ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={{
              alignItems: 'center',
              bottom: 3,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'center',
              left: 1,
              position: 'absolute',
              right: 1,
            }}
          >
            {dayIndicators.map(({ color, id }) => (
              <View
                key={id}
                style={{
                  backgroundColor: color,
                  borderRadius: 3,
                  height: 6,
                  width: 6,
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Calendar.Item.Day.Container>
  );
}

export function ThemeAwareCalendar({
  calendarDayIndicatorsById = {},
  calendarFirstDayOfWeek = 'sunday',
  calendarFormatLocale,
  calendarMaxDateId,
  calendarMinDateId,
  calendarMonthId,
  onDayPress,
}: ThemeAwareCalendarProps) {
  const { colorScheme, textColor } = useThemeAwareColors();
  const colors = COLORS[colorScheme];
  const calendarActiveDateRanges = useMemo<CalendarActiveDateRange[]>(
    () =>
      Object.entries(calendarDayIndicatorsById).flatMap(
        ([dateId, indicators]) =>
          indicators.length > 0 ? [{ endId: dateId, startId: dateId }] : [],
      ),
    [calendarDayIndicatorsById],
  );
  const calendarTheme = useMemo<CalendarTheme>(
    () => ({
      itemDay: {
        active: ({ isEndOfRange, isPressed, isStartOfRange, isToday }) => ({
          container: {
            backgroundColor:
              isPressed && colorScheme === 'dark'
                ? '#3f3f46'
                : colorScheme === 'dark'
                  ? '#27272a'
                  : '#f1f5f9',
            borderBottomLeftRadius: isStartOfRange ? 18 : 0,
            borderBottomRightRadius: isEndOfRange ? 18 : 0,
            borderColor: isToday ? colors.tint : 'transparent',
            borderTopLeftRadius: isStartOfRange ? 18 : 0,
            borderTopRightRadius: isEndOfRange ? 18 : 0,
            borderWidth: isToday ? 1 : 0,
          },
          content: {
            color: textColor,
          },
        }),
        disabled: () => ({
          container: { backgroundColor: 'transparent' },
          content: { color: colors.mutedText },
        }),
        idle: ({ isPressed }) => ({
          container: {
            backgroundColor: isPressed ? colors.border : 'transparent',
          },
          content: { color: textColor },
        }),
        today: ({ isPressed }) => ({
          container: {
            backgroundColor: isPressed ? colors.border : 'transparent',
            borderColor: colors.tint,
            borderWidth: 1,
          },
          content: { color: textColor },
        }),
      },
      itemDayContainer: {
        activeDayFiller: { backgroundColor: 'transparent' },
      },
      itemWeekName: {
        content: {
          color: colors.mutedText,
          fontWeight: '600',
        },
      },
      rowWeek: {
        container: { backgroundColor: 'transparent' },
      },
    }),
    [colorScheme, colors, textColor],
  );
  const { weekDaysList, weeksList } = useCalendar({
    calendarActiveDateRanges,
    calendarFirstDayOfWeek,
    calendarFormatLocale,
    calendarMaxDateId,
    calendarMinDateId,
    calendarMonthId,
  });

  return (
    <View style={{ backgroundColor: colors.background, width: '100%' }}>
      <Calendar.VStack alignItems="stretch" spacing={ROW_SPACING}>
        <Calendar.Row.Week spacing={8} theme={calendarTheme.rowWeek}>
          {weekDaysList.map((weekDay, index) => (
            <Calendar.Item.WeekName
              height={DAY_HEIGHT}
              key={`${weekDay}-${index}`}
              theme={calendarTheme.itemWeekName}
            >
              {weekDay}
            </Calendar.Item.WeekName>
          ))}
        </Calendar.Row.Week>
        {weeksList.map((week, index) => (
          <Calendar.Row.Week key={index}>
            {week.map((day) =>
              renderCalendarDay(
                day,
                calendarDayIndicatorsById[day.id] ?? [],
                calendarTheme,
                onDayPress,
              ),
            )}
          </Calendar.Row.Week>
        ))}
      </Calendar.VStack>
    </View>
  );
}
