import FontAwesome from '@expo/vector-icons/FontAwesome';
import { createModal } from '@gluestack-ui/core/modal/creator';
import type { ReactNode } from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';

import { ThemeAwareCalendar } from '@/components/ui/ThemeAwareCalendar';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { useThemeAwareTypography } from '@/components/ui/useThemeAwareTypography';
import { COLORS } from '@/constants/colors';
import type { CalendarMonthData } from '@/utils/calendar';
import {
  formatCalendarDay,
  formatCalendarMonth,
  getCalendarFirstDayOfWeek,
  getCalendarMonthStartDayId,
  getLocalCalendarDayId,
  shiftCalendarMonth,
} from '@/utils/calendar';

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);
const CalendarModal = createModal({
  Root: View,
  Backdrop: AnimatedTouchableOpacity,
  Content: AnimatedView,
  Body: ScrollView,
  CloseButton: TouchableOpacity,
  Footer: View,
  Header: View,
});

type CalendarDateBounds = {
  earliestDayId: string | null;
  latestDayId: string | null;
};

export type PendingCalendarEntry = {
  content: ReactNode;
  dayId: string;
};

type DateEntriesCalendarModalProps<T> = {
  boundsKey: string;
  calendarMonthId: string;
  closeButtonText: string;
  data?: CalendarMonthData<T>;
  emptyCalendarText: string;
  emptyMonthText: string;
  error?: Error | null;
  errorFallbackText: string;
  getEntryDate: (entry: T) => string | undefined;
  getEntryId: (entry: T) => string;
  isCalendarLoading: boolean;
  isVisible: boolean;
  locale: string;
  loadingLabel: string;
  nextMonthLabel: string;
  onClose: () => void;
  onMonthChange: (monthId: string) => void;
  pendingEntries?: PendingCalendarEntry[];
  previousMonthLabel: string;
  renderEntry: (entry: T) => ReactNode;
  selectDayText: string;
  title: string;
};

export function DateEntriesCalendarModal<T>({
  boundsKey,
  calendarMonthId,
  closeButtonText,
  data,
  emptyCalendarText,
  emptyMonthText,
  error,
  errorFallbackText,
  getEntryDate,
  getEntryId,
  isCalendarLoading,
  isVisible,
  locale,
  loadingLabel,
  nextMonthLabel,
  onClose,
  onMonthChange,
  pendingEntries = [],
  previousMonthLabel,
  renderEntry,
  selectDayText,
  title,
}: DateEntriesCalendarModalProps<T>) {
  const { colorScheme, textColor } = useThemeAwareColors();
  const { fontFamily } = useThemeAwareTypography();
  const themeColors = COLORS[colorScheme];
  const errorColor = colorScheme === 'dark' ? '#fca5a5' : '#dc2626';
  const todayId = getLocalCalendarDayId(new Date());
  const visibleMonthId = getCalendarMonthStartDayId(calendarMonthId);
  const [selectedDayId, setSelectedDayId] = useState<string>();
  const [knownDateBoundsByKey, setKnownDateBoundsByKey] = useState<
    Record<string, CalendarDateBounds>
  >({});
  const entries = data?.entries ?? [];
  const entriesByDayId = useMemo(() => {
    const entriesByDay = new Map<string, T[]>();
    entries.forEach((entry) => {
      const date = getEntryDate(entry);
      if (!date) return;
      const dayId = getLocalCalendarDayId(date);
      const dayEntries = entriesByDay.get(dayId) ?? [];
      dayEntries.push(entry);
      entriesByDay.set(dayId, dayEntries);
    });
    return entriesByDay;
  }, [entries, getEntryDate]);
  const pendingEntriesByDayId = useMemo(() => {
    const pendingEntriesByDay = new Map<string, ReactNode[]>();
    pendingEntries.forEach(({ content, dayId }) => {
      if (dayId.slice(0, 7) !== visibleMonthId.slice(0, 7)) return;
      const dayEntries = pendingEntriesByDay.get(dayId) ?? [];
      dayEntries.push(content);
      pendingEntriesByDay.set(dayId, dayEntries);
    });
    return pendingEntriesByDay;
  }, [pendingEntries, visibleMonthId]);
  const calendarDayIndicatorsById = useMemo(() => {
    const dayIds = new Set(pendingEntriesByDayId.keys());
    if (!isCalendarLoading) {
      entriesByDayId.forEach((_dayEntries, dayId) => dayIds.add(dayId));
    }
    return Object.fromEntries(
      [...dayIds].map((dayId) => [
        dayId,
        [{ color: themeColors.tint, id: dayId }],
      ]),
    );
  }, [
    entriesByDayId,
    isCalendarLoading,
    pendingEntriesByDayId,
    themeColors.tint,
  ]);
  const queryDateBounds = data
    ? {
        earliestDayId: data.earliestDate
          ? getLocalCalendarDayId(data.earliestDate)
          : null,
        latestDayId: data.latestDate
          ? getLocalCalendarDayId(data.latestDate)
          : null,
      }
    : undefined;

  useEffect(() => {
    if (!queryDateBounds) return;
    setKnownDateBoundsByKey((knownBounds) => {
      const previousBounds = knownBounds[boundsKey];
      if (
        previousBounds?.earliestDayId === queryDateBounds.earliestDayId &&
        previousBounds.latestDayId === queryDateBounds.latestDayId
      ) {
        return knownBounds;
      }
      return {
        ...knownBounds,
        [boundsKey]: queryDateBounds,
      };
    });
  }, [boundsKey, queryDateBounds]);

  useEffect(() => {
    setSelectedDayId(undefined);
  }, [boundsKey]);

  const baseDateBounds = queryDateBounds ?? knownDateBoundsByKey[boundsKey];
  const pendingDayIds = [...pendingEntriesByDayId.keys()].sort();
  const pendingEarliestDayId = pendingDayIds[0] ?? null;
  const pendingLatestDayId = pendingDayIds[pendingDayIds.length - 1] ?? null;
  const dateBounds =
    baseDateBounds || pendingEarliestDayId || pendingLatestDayId
      ? {
          earliestDayId:
            baseDateBounds?.earliestDayId &&
            (!pendingEarliestDayId ||
              baseDateBounds.earliestDayId <= pendingEarliestDayId)
              ? baseDateBounds.earliestDayId
              : pendingEarliestDayId ?? baseDateBounds?.earliestDayId ?? null,
          latestDayId:
            baseDateBounds?.latestDayId &&
            (!pendingLatestDayId ||
              baseDateBounds.latestDayId >= pendingLatestDayId)
              ? baseDateBounds.latestDayId
              : pendingLatestDayId ?? baseDateBounds?.latestDayId ?? null,
        }
      : undefined;
  const calendarMinDateId =
    dateBounds?.earliestDayId && dateBounds.earliestDayId < todayId
      ? dateBounds.earliestDayId
      : todayId;
  const calendarMaxDateId =
    dateBounds?.latestDayId && dateBounds.latestDayId > todayId
      ? dateBounds.latestDayId
      : todayId;
  const minimumMonthId = getCalendarMonthStartDayId(calendarMinDateId);
  const maximumMonthId = getCalendarMonthStartDayId(calendarMaxDateId);
  const isPreviousMonthDisabled = visibleMonthId <= minimumMonthId;
  const isNextMonthDisabled = visibleMonthId >= maximumMonthId;
  const firstDayOfWeek = getCalendarFirstDayOfWeek(locale);
  const selectedEntries = selectedDayId
    ? entriesByDayId.get(selectedDayId) ?? []
    : [];
  const selectedPendingEntries = selectedDayId
    ? pendingEntriesByDayId.get(selectedDayId) ?? []
    : [];

  function closeCalendar() {
    setSelectedDayId(undefined);
    onClose();
  }

  function changeMonth(offset: number) {
    setSelectedDayId(undefined);
    onMonthChange(shiftCalendarMonth(visibleMonthId, offset));
  }

  return (
    <CalendarModal
      closeOnOverlayClick
      isOpen={isVisible}
      onClose={closeCalendar}
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <CalendarModal.Backdrop
        entering={FadeIn.duration(200).easing(Easing.linear)}
        exiting={FadeOut.duration(200).easing(Easing.linear)}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <CalendarModal.Content
        entering={ZoomIn.duration(200).withInitialValues({
          transform: [{ scale: 0.9 }],
        })}
        exiting={FadeOut.duration(200)}
        pointerEvents="auto"
        style={{
          backgroundColor: themeColors.background,
          borderColor: themeColors.border,
          borderRadius: 6,
          borderWidth: 1,
          elevation: 8,
          maxHeight: '90%',
          overflow: 'hidden',
          padding: 24,
          shadowColor: '#000',
          shadowOffset: { height: 2, width: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          width: '90%',
        }}
      >
        <CalendarModal.Header
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: textColor,
              flex: 1,
              fontFamily,
              fontSize: 14,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
        </CalendarModal.Header>
        <CalendarModal.Body
          keyboardShouldPersistTaps="handled"
          scrollEnabled
          showsVerticalScrollIndicator
          style={{ flexShrink: 1, marginBottom: 24, marginTop: 8 }}
        >
          {error ? (
            <Text style={{ color: errorColor, fontFamily }}>
              {error.message || errorFallbackText}
            </Text>
          ) : null}
          {data || isCalendarLoading || pendingEntriesByDayId.size > 0 ? (
            <>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <TouchableOpacity
                  accessibilityLabel={previousMonthLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isPreviousMonthDisabled }}
                  disabled={isPreviousMonthDisabled}
                  hitSlop={10}
                  onPress={() => changeMonth(-1)}
                  style={{ padding: 10 }}
                >
                  <FontAwesome
                    color={
                      isPreviousMonthDisabled
                        ? themeColors.mutedText
                        : textColor
                    }
                    name="chevron-left"
                    size={16}
                  />
                </TouchableOpacity>
                <Text
                  style={{
                    color: textColor,
                    flex: 1,
                    fontFamily,
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  {formatCalendarMonth(visibleMonthId, locale)}
                </Text>
                <TouchableOpacity
                  accessibilityLabel={nextMonthLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isNextMonthDisabled }}
                  disabled={isNextMonthDisabled}
                  hitSlop={10}
                  onPress={() => changeMonth(1)}
                  style={{ padding: 10 }}
                >
                  <FontAwesome
                    color={
                      isNextMonthDisabled ? themeColors.mutedText : textColor
                    }
                    name="chevron-right"
                    size={16}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ position: 'relative' }}>
                <ThemeAwareCalendar
                  calendarDayIndicatorsById={calendarDayIndicatorsById}
                  calendarFirstDayOfWeek={firstDayOfWeek}
                  calendarFormatLocale={locale}
                  calendarMaxDateId={calendarMaxDateId}
                  calendarMinDateId={calendarMinDateId}
                  calendarMonthId={visibleMonthId}
                  onDayPress={(dayId) => {
                    if (
                      entriesByDayId.has(dayId) ||
                      pendingEntriesByDayId.has(dayId)
                    ) {
                      setSelectedDayId(dayId);
                    }
                  }}
                />
                {isCalendarLoading ? (
                  <View
                    pointerEvents="none"
                    style={{
                      alignItems: 'center',
                      bottom: 0,
                      justifyContent: 'center',
                      left: 0,
                      position: 'absolute',
                      right: 0,
                      top: 0,
                    }}
                  >
                    <ActivityIndicator
                      accessibilityLabel={loadingLabel}
                      color={themeColors.tint}
                      size="large"
                    />
                  </View>
                ) : null}
              </View>
              {data || pendingEntriesByDayId.size > 0 ? (
                entriesByDayId.size === 0 &&
                pendingEntriesByDayId.size === 0 ? (
                  <Text style={{ color: textColor, fontFamily }}>
                    {data?.earliestDate ? emptyMonthText : emptyCalendarText}
                  </Text>
                ) : selectedDayId &&
                  (selectedEntries.length > 0 ||
                    selectedPendingEntries.length > 0) ? (
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: textColor,
                        fontFamily,
                        fontSize: 18,
                        fontWeight: '600',
                      }}
                    >
                      {formatCalendarDay(selectedDayId, locale)}
                    </Text>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      style={{ maxHeight: 280 }}
                    >
                      <View style={{ gap: 8 }}>
                        {selectedEntries.map((entry) => (
                          <Fragment key={getEntryId(entry)}>
                            {renderEntry(entry)}
                          </Fragment>
                        ))}
                        {selectedPendingEntries.map((content, index) => (
                          <Fragment key={`pending-${selectedDayId}-${index}`}>
                            {content}
                          </Fragment>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : (
                  <Text style={{ color: textColor, fontFamily }}>
                    {selectDayText}
                  </Text>
                )
              ) : null}
            </>
          ) : null}
        </CalendarModal.Body>
        <CalendarModal.Footer
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Button
            accessibilityLabel={closeButtonText}
            onPress={closeCalendar}
            style={{
              backgroundColor: themeColors.muted,
              minHeight: 40,
              paddingVertical: 8,
            }}
            variant="secondary"
          >
            <ButtonText
              style={{
                color: themeColors.text,
                flexShrink: 1,
                fontFamily,
                textAlign: 'center',
              }}
            >
              {closeButtonText}
            </ButtonText>
          </Button>
        </CalendarModal.Footer>
      </CalendarModal.Content>
    </CalendarModal>
  );
}
