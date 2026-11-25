import type {
  CreateDateNightEventInput,
  DateNightEvent,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { useState } from 'react';

import {
  DateEntriesCalendarModal,
  type PendingCalendarEntry,
} from '@/components/ui/DateEntriesCalendarModal';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { useDateNightEventsQuery } from '@/features/date-nights/hooks/useDateNights';
import { getMemberDisplayName } from '@/features/relationships/utils';
import {
  getCalendarDateFromDayId,
  getCurrentCalendarMonthId,
} from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';

type DateNightCalendarModalProps = {
  isVisible: boolean;
  onClose: () => void;
  pendingEvent?: CreateDateNightEventInput;
  relationship: RelationshipSummary;
};

export function DateNightCalendarModal({
  isVisible,
  onClose,
  pendingEvent,
  relationship,
}: DateNightCalendarModalProps) {
  const { locale, t } = useI18n();
  const [calendarMonthId, setCalendarMonthId] = useState(
    getCurrentCalendarMonthId,
  );
  const calendarQuery = useDateNightEventsQuery(
    relationship.id,
    calendarMonthId.slice(0, 7),
    isVisible,
  );

  function renderEvent(event: DateNightEvent) {
    return (
      <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$4">
        <VStack space="xs">
          <ThemeAwareText fontWeight="$semibold">
            {event.description || t('dateNight.eventTitle')}
          </ThemeAwareText>
          <ThemeAwareText opacity={0.75} size="sm">
            {`${t('dateNight.createdBy')}: ${getMemberDisplayName(
              event.createdByUserId,
              relationship.members,
            )}`}
          </ThemeAwareText>
        </VStack>
      </ThemeAwareSurface>
    );
  }

  const pendingEntries: PendingCalendarEntry[] =
    pendingEvent && pendingEvent.day.slice(0, 7) === calendarMonthId.slice(0, 7)
      ? [
          {
            dayId: pendingEvent.day,
            content: (
              <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$4">
                <VStack space="xs">
                  <ThemeAwareText fontWeight="$semibold">
                    {pendingEvent.description || t('dateNight.eventTitle')}
                  </ThemeAwareText>
                  <ThemeAwareText opacity={0.75} size="sm">
                    {t('dateNight.eventPending')}
                  </ThemeAwareText>
                </VStack>
              </ThemeAwareSurface>
            ),
          },
        ]
      : [];

  return (
    <DateEntriesCalendarModal
      boundsKey={relationship.id}
      calendarMonthId={calendarMonthId}
      closeButtonText={t('dateNight.closeCalendar')}
      data={calendarQuery.data}
      emptyCalendarText={t('dateNight.emptyCalendar')}
      emptyMonthText={t('dateNight.emptyMonth')}
      error={calendarQuery.error}
      errorFallbackText={t('dateNight.loadError')}
      getEntryDate={(event) =>
        getCalendarDateFromDayId(event.day).toISOString()
      }
      getEntryId={(event) => event.id}
      isCalendarLoading={calendarQuery.isLoading && !calendarQuery.data}
      isVisible={isVisible}
      loadingLabel={t('common.loading')}
      locale={locale}
      nextMonthLabel={t('dateNight.nextCalendarMonth')}
      onClose={onClose}
      onMonthChange={setCalendarMonthId}
      pendingEntries={pendingEntries}
      previousMonthLabel={t('dateNight.previousCalendarMonth')}
      renderEntry={renderEvent}
      selectDayText={t('dateNight.selectDay')}
      title={t('dateNight.calendarTitle')}
    />
  );
}
