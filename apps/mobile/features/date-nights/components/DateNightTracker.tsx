import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  CreateDateNightEventInput,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { ThemeAwareTimePicker } from '@/components/ui/ThemeAwareTimePicker';
import { HStack } from '@/components/ui/hstack';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { DateNightCalendarModal } from '@/features/date-nights/components/DateNightCalendarModal';
import {
  useCreateDateNightEventMutation,
  useDateNightEventsQuery,
} from '@/features/date-nights/hooks/useDateNights';
import {
  formatCalendarDay,
  getCalendarDateFromDayId,
  getLocalCalendarDayId,
} from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';

type DateNightTrackerProps = {
  relationship: RelationshipSummary;
};

export function DateNightTracker({ relationship }: DateNightTrackerProps) {
  const { locale, t } = useI18n();
  const { getTextColor } = useThemeAwareColors();
  const today = getLocalCalendarDayId(new Date());
  const [eventDay, setEventDay] = useState(today);
  const [description, setDescription] = useState('');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const eventsQuery = useDateNightEventsQuery(
    relationship.id,
    today.slice(0, 7),
  );
  const eventMutation = useCreateDateNightEventMutation(relationship.id);
  const latestDay = eventsQuery.data?.latestDate
    ? getLocalCalendarDayId(eventsQuery.data.latestDate)
    : null;
  const pendingEvent: CreateDateNightEventInput | undefined =
    eventMutation.isPending ? eventMutation.variables : undefined;
  const pendingEventIsLatest =
    pendingEvent !== undefined && (!latestDay || pendingEvent.day > latestDay);

  return (
    <VStack space="md">
      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.personalTime}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="sm">
          <HStack className="items-center justify-between">
            <ThemeAwareHeading className="flex-1">
              {t('dateNight.lastRecordedTitle')}
            </ThemeAwareHeading>
            <TouchableOpacity
              accessibilityLabel={t('dateNight.showCalendar')}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setIsCalendarVisible(true)}
              style={{ paddingHorizontal: 8, paddingVertical: 8 }}
            >
              <FontAwesome
                color={getTextColor(true)}
                name="calendar"
                size={20}
              />
            </TouchableOpacity>
          </HStack>
          {pendingEventIsLatest ? (
            <VStack space="xs">
              <ThemeAwareText>
                {formatCalendarDay(pendingEvent.day, locale)}
              </ThemeAwareText>
              <ThemeAwareText>{t('dateNight.eventPending')}</ThemeAwareText>
            </VStack>
          ) : eventsQuery.isLoading && !eventsQuery.data ? (
            <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
          ) : eventsQuery.error ? (
            <ThemeAwareText color="$error600">
              {t('dateNight.loadError')}
            </ThemeAwareText>
          ) : latestDay ? (
            <ThemeAwareText>
              {formatCalendarDay(latestDay, locale)}
            </ThemeAwareText>
          ) : eventsQuery.data ? (
            <ThemeAwareText>{t('dateNight.noLastDateNight')}</ThemeAwareText>
          ) : null}
        </VStack>
      </ThemeAwareCardSurface>

      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.personalTime}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="md">
          <ThemeAwareHeading>{t('dateNight.createTitle')}</ThemeAwareHeading>
          <ThemeAwareText>{t('dateNight.createDescription')}</ThemeAwareText>
          <ThemeAwareText fontWeight="$semibold">
            {t('dateNight.day')}
          </ThemeAwareText>
          <ThemeAwareTimePicker
            accessibilityLabel={t('dateNight.day')}
            formatDate={(date, currentLocale) =>
              date.toLocaleDateString(currentLocale)
            }
            maximumDate={getCalendarDateFromDayId(today)}
            mode="date"
            onChange={(_event, date) => {
              if (date) setEventDay(getLocalCalendarDayId(date));
            }}
            value={getCalendarDateFromDayId(eventDay)}
          />
          <ThemeAwareText fontWeight="$semibold">
            {t('dateNight.description')}
          </ThemeAwareText>
          <ThemeAwareInput
            inputFieldProps={{
              maxLength: 2_000,
              multiline: true,
              placeholder: t('dateNight.descriptionPlaceholder'),
              textAlignVertical: 'top',
            }}
            inputProps={{ height: 112 }}
            onChangeText={setDescription}
            value={description}
          />
          <ThemeAwareButton
            isDisabled={!eventDay || eventMutation.isPending}
            onPress={() =>
              eventMutation.mutate({
                day: eventDay,
                description: description.trim() || undefined,
              })
            }
          >
            {t('dateNight.create')}
          </ThemeAwareButton>
          {eventMutation.isSuccess ? (
            <ThemeAwareText>{t('dateNight.created')}</ThemeAwareText>
          ) : null}
          {eventMutation.error ? (
            <ThemeAwareText color="$error600">
              {t('dateNight.actionError')}
            </ThemeAwareText>
          ) : null}
        </VStack>
      </ThemeAwareCardSurface>

      <DateNightCalendarModal
        isVisible={isCalendarVisible}
        onClose={() => setIsCalendarVisible(false)}
        pendingEvent={pendingEvent}
        relationship={relationship}
      />
    </VStack>
  );
}
