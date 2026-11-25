import type {
  MeTime,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { useState } from 'react';

import { DateEntriesCalendarModal } from '@/components/ui/DateEntriesCalendarModal';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { getMeTimeCreatedByDisplayName } from '@/features/time/filters';
import { useMeTimeCalendarQuery } from '@/features/time/hooks/useTime';
import {
  getCurrentCalendarMonthId,
  type CalendarMonthData,
} from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';

type MeTimeCalendarModalProps = {
  isVisible: boolean;
  members: RelationshipSummary['members'];
  onClose: () => void;
  relationshipId: string;
};

function formatTime(value: string, locale: string) {
  return new Date(value).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MeTimeCalendarModal({
  isVisible,
  members,
  onClose,
  relationshipId,
}: MeTimeCalendarModalProps) {
  const { locale, t } = useI18n();
  const [calendarMonthId, setCalendarMonthId] = useState(
    getCurrentCalendarMonthId,
  );
  const calendarQuery = useMeTimeCalendarQuery(
    relationshipId,
    calendarMonthId.slice(0, 7),
    isVisible,
  );
  const calendarData: CalendarMonthData<MeTime> | undefined = calendarQuery.data
    ? {
        earliestDate: calendarQuery.data.earliestStartTime,
        latestDate: calendarQuery.data.latestStartTime,
        entries: calendarQuery.data.entries,
      }
    : undefined;

  function renderMeTime(entry: MeTime) {
    return (
      <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$4">
        <VStack space="xs">
          <ThemeAwareText fontWeight="$semibold">
            {entry.description || t('time.meTime')}
          </ThemeAwareText>
          <ThemeAwareText size="sm">
            {`${t('time.startTime')}: ${formatTime(entry.startTime, locale)}`}
          </ThemeAwareText>
          <ThemeAwareText size="sm">
            {`${t('time.endTime')}: ${formatTime(entry.endTime, locale)}`}
          </ThemeAwareText>
          <ThemeAwareText opacity={0.75} size="sm">
            {`${t('time.createdBy')}: ${getMeTimeCreatedByDisplayName(
              entry,
              members,
            )}`}
          </ThemeAwareText>
        </VStack>
      </ThemeAwareSurface>
    );
  }

  return (
    <DateEntriesCalendarModal
      boundsKey={relationshipId}
      calendarMonthId={calendarMonthId}
      closeButtonText={t('time.closeMeTimeCalendar')}
      data={calendarData}
      emptyCalendarText={t('time.emptyMeTime')}
      emptyMonthText={t('time.noMeTimeThisMonth')}
      error={calendarQuery.error}
      errorFallbackText={t('time.meTimeError')}
      getEntryDate={(entry) => entry.startTime}
      getEntryId={(entry) => entry.id}
      isCalendarLoading={calendarQuery.isLoading && !calendarQuery.data}
      isVisible={isVisible}
      loadingLabel={t('common.loading')}
      locale={locale}
      nextMonthLabel={t('time.nextMeTimeCalendarMonth')}
      onClose={onClose}
      onMonthChange={setCalendarMonthId}
      previousMonthLabel={t('time.previousMeTimeCalendarMonth')}
      renderEntry={renderMeTime}
      selectDayText={t('time.selectMeTimeDay')}
      title={t('time.meTimeCalendarTitle')}
    />
  );
}
