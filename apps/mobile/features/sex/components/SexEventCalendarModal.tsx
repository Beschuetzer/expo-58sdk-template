import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { RelationshipSummary } from '@expo-50sdk-template/shared-types';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { ThemeAwareCalendar } from '@/components/ui/ThemeAwareCalendar';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { COLORS } from '@/constants/colors';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { getLocalDayKey } from '@/features/sex/api';
import { useSexEventsQuery } from '@/features/sex/hooks/useSex';
import { getCalendarFirstDayOfWeek } from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';

type SexEventCalendarModalProps = {
  isVisible: boolean;
  onClose: () => void;
  relationship: RelationshipSummary;
};

function getMonthStartDayId(dayId: string) {
  return `${dayId.slice(0, 7)}-01`;
}

function shiftMonth(monthId: string, offset: number) {
  const [year, month] = monthId.split('-').map(Number);
  return getLocalDayKey(new Date(year, month - 1 + offset, 1, 12));
}

function getStableColorIndex(value: string, colorCount: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return colorCount > 0 ? hash % colorCount : 0;
}

function formatMonth(monthId: string, locale: string) {
  const [year, month] = monthId.split('-').map(Number);
  return new Date(year, month - 1, 1, 12).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export function SexEventCalendarModal({
  isVisible,
  onClose,
  relationship,
}: SexEventCalendarModalProps) {
  const { locale, t } = useI18n();
  const { colorScheme, textColor } = useThemeAwareColors();
  const themeColors = COLORS[colorScheme];
  const todayId = getLocalDayKey();
  const currentMonthId = getMonthStartDayId(todayId);
  const [calendarMonthId, setCalendarMonthId] = useState(() => currentMonthId);
  const visibleMonthId = getMonthStartDayId(calendarMonthId);
  const eventsQuery = useSexEventsQuery(
    relationship.id,
    visibleMonthId.slice(0, 7),
    isVisible,
  );
  const isCalendarLoading = eventsQuery.isLoading && !eventsQuery.data;
  const events = eventsQuery.data?.events ?? [];
  const queryEarliestEventDayId = eventsQuery.data?.earliestEventDayId;
  const [knownEarliestEventDayIds, setKnownEarliestEventDayIds] = useState<
    Record<string, string | null>
  >({});
  useEffect(() => {
    if (queryEarliestEventDayId === undefined) return;
    setKnownEarliestEventDayIds((knownDays) =>
      knownDays[relationship.id] === queryEarliestEventDayId
        ? knownDays
        : { ...knownDays, [relationship.id]: queryEarliestEventDayId },
    );
  }, [queryEarliestEventDayId, relationship.id]);
  const memberUserIds = useMemo(() => {
    const participants = new Set(
      events.flatMap((event) => event.memberUserIds),
    );
    const relationshipMembers = relationship.members
      .filter((member) => participants.has(member.userId))
      .map((member) => member.userId);
    const unlistedParticipants = [...participants]
      .filter(
        (userId) =>
          !relationship.members.some((member) => member.userId === userId),
      )
      .sort();
    return [...relationshipMembers, ...unlistedParticipants];
  }, [events, relationship.members]);
  const memberColorById = useMemo(() => {
    const palette = themeColors.buttonBackgrounds;
    const getColor = (index: number) =>
      palette.length > 0
        ? palette[index % palette.length] ?? themeColors.tint
        : themeColors.tint;
    const colors = new Map<string, string>();

    relationship.members
      .map((member) => member.userId)
      .sort()
      .forEach((userId, index) => colors.set(userId, getColor(index)));
    memberUserIds.forEach((userId) => {
      if (!colors.has(userId)) {
        colors.set(
          userId,
          getColor(getStableColorIndex(userId, palette.length)),
        );
      }
    });
    return colors;
  }, [memberUserIds, relationship.members, themeColors]);
  const calendarDayIndicatorsById = useMemo(() => {
    const participantsByDay = new Map<string, Set<string>>();
    for (const event of events) {
      const participants =
        participantsByDay.get(event.day) ?? new Set<string>();
      event.memberUserIds.forEach((userId) => participants.add(userId));
      participantsByDay.set(event.day, participants);
    }

    return Object.fromEntries(
      [...participantsByDay].map(([dayId, participants]) => [
        dayId,
        memberUserIds
          .filter((userId) => participants.has(userId))
          .map((userId) => ({
            color: memberColorById.get(userId) ?? themeColors.tint,
            id: userId,
          })),
      ]),
    );
  }, [events, memberColorById, memberUserIds]);
  const earliestEventDayId = eventsQuery.data
    ? eventsQuery.data.earliestEventDayId
    : knownEarliestEventDayIds[relationship.id];
  const calendarMinDateId = earliestEventDayId ?? currentMonthId;
  const minimumMonthId = getMonthStartDayId(calendarMinDateId);
  const isPreviousMonthDisabled = visibleMonthId <= minimumMonthId;
  const isNextMonthDisabled = visibleMonthId >= currentMonthId;
  const firstDayOfWeek = getCalendarFirstDayOfWeek(locale);

  return (
    <ThemedModal
      confirmButton={{
        action: 'secondary',
        onPress: onClose,
        text: t('sex.closeSessionCalendar'),
      }}
      isVisible={isVisible}
      onClose={onClose}
      title={t('sex.sessionCalendarTitle')}
    >
      {eventsQuery.error ? (
        <ThemeAwareText color="$error600">{t('sex.loadError')}</ThemeAwareText>
      ) : null}
      {eventsQuery.data || isCalendarLoading ? (
        <>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity
              accessibilityLabel={t('sex.previousCalendarMonth')}
              accessibilityRole="button"
              accessibilityState={{ disabled: isPreviousMonthDisabled }}
              disabled={isPreviousMonthDisabled}
              hitSlop={10}
              onPress={() => setCalendarMonthId(shiftMonth(visibleMonthId, -1))}
              style={{ padding: 10 }}
            >
              <FontAwesome
                color={
                  isPreviousMonthDisabled ? themeColors.mutedText : textColor
                }
                name="chevron-left"
                size={16}
              />
            </TouchableOpacity>
            <ThemeAwareHeading className="flex-1 text-center" fontSize={16}>
              {formatMonth(visibleMonthId, locale)}
            </ThemeAwareHeading>
            <TouchableOpacity
              accessibilityLabel={t('sex.nextCalendarMonth')}
              accessibilityRole="button"
              accessibilityState={{ disabled: isNextMonthDisabled }}
              disabled={isNextMonthDisabled}
              hitSlop={10}
              onPress={() => setCalendarMonthId(shiftMonth(visibleMonthId, 1))}
              style={{ padding: 10 }}
            >
              <FontAwesome
                color={isNextMonthDisabled ? themeColors.mutedText : textColor}
                name="chevron-right"
                size={16}
              />
            </TouchableOpacity>
          </View>
          <View style={{ position: 'relative' }}>
            <ThemeAwareCalendar
              calendarDayIndicatorsById={
                isCalendarLoading ? {} : calendarDayIndicatorsById
              }
              calendarFirstDayOfWeek={firstDayOfWeek}
              calendarFormatLocale={locale}
              calendarMaxDateId={todayId}
              calendarMinDateId={calendarMinDateId}
              calendarMonthId={visibleMonthId}
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
                  accessibilityLabel={t('common.loading')}
                  color={themeColors.tint}
                  size="large"
                />
              </View>
            ) : null}
          </View>
          {eventsQuery.data ? (
            events.length === 0 ? (
              <ThemeAwareText>
                {t(
                  eventsQuery.data.earliestEventDayId
                    ? 'sex.noSessionsThisMonth'
                    : 'sex.noRelationshipSessions',
                )}
              </ThemeAwareText>
            ) : (
              <View>
                <ThemeAwareText fontWeight="$semibold">
                  {t('sex.calendarLegend')}
                </ThemeAwareText>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 12,
                    paddingTop: 8,
                  }}
                >
                  {memberUserIds.map((userId) => (
                    <View
                      key={userId}
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        style={{
                          backgroundColor:
                            memberColorById.get(userId) ?? themeColors.tint,
                          borderRadius: 5,
                          height: 10,
                          width: 10,
                        }}
                      />
                      <ThemeAwareText>
                        {getMemberDisplayName(userId, relationship.members)}
                      </ThemeAwareText>
                    </View>
                  ))}
                </View>
              </View>
            )
          ) : null}
        </>
      ) : null}
    </ThemedModal>
  );
}
