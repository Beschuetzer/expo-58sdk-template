import type {
  JointAccountCharge,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { useState } from 'react';

import { DateEntriesCalendarModal } from '@/components/ui/DateEntriesCalendarModal';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { useJointAccountChargeCalendarQuery } from '@/features/joint-account-charges/hooks/useJointAccountCharges';
import { getMemberDisplayName } from '@/features/relationships/utils';
import {
  getCurrentCalendarMonthId,
  type CalendarMonthData,
} from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';
import { formatMinorUnits } from '@/utils/money';

type JointAccountChargeCalendarModalProps = {
  isVisible: boolean;
  onClose: () => void;
  relationship: RelationshipSummary;
};

export function JointAccountChargeCalendarModal({
  isVisible,
  onClose,
  relationship,
}: JointAccountChargeCalendarModalProps) {
  const { locale, t } = useI18n();
  const [calendarMonthId, setCalendarMonthId] = useState(
    getCurrentCalendarMonthId,
  );
  const calendarQuery = useJointAccountChargeCalendarQuery(
    relationship.id,
    calendarMonthId.slice(0, 7),
    isVisible,
  );

  function renderCharge(charge: JointAccountCharge) {
    return (
      <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$4">
        <VStack space="xs">
          <ThemeAwareText fontWeight="$semibold">{charge.name}</ThemeAwareText>
          <ThemeAwareText size="sm">
            {`${t('jointAccountCharges.amount')}: ${formatMinorUnits(
              charge.amountMinorUnits,
            )}`}
          </ThemeAwareText>
          <ThemeAwareText size="sm">
            {`${t('jointAccountCharges.status')}: ${t(
              charge.status === 'paid'
                ? 'jointAccountCharges.paid'
                : 'jointAccountCharges.unpaid',
            )}`}
          </ThemeAwareText>
          <ThemeAwareText opacity={0.75} size="sm">
            {`${t('jointAccountCharges.createdBy')}: ${getMemberDisplayName(
              charge.createdByUserId,
              relationship.members,
            )}`}
          </ThemeAwareText>
        </VStack>
      </ThemeAwareSurface>
    );
  }

  const calendarData: CalendarMonthData<JointAccountCharge> | undefined =
    calendarQuery.data;

  return (
    <DateEntriesCalendarModal
      boundsKey={relationship.id}
      calendarMonthId={calendarMonthId}
      closeButtonText={t('jointAccountCharges.closeCalendar')}
      data={calendarData}
      emptyCalendarText={t('jointAccountCharges.empty')}
      emptyMonthText={t('jointAccountCharges.noChargesThisMonth')}
      error={calendarQuery.error}
      errorFallbackText={t('jointAccountCharges.error')}
      getEntryDate={(charge) => charge.chargeDate}
      getEntryId={(charge) => charge.id}
      isCalendarLoading={calendarQuery.isLoading && !calendarQuery.data}
      isVisible={isVisible}
      loadingLabel={t('common.loading')}
      locale={locale}
      nextMonthLabel={t('jointAccountCharges.nextCalendarMonth')}
      onClose={onClose}
      onMonthChange={setCalendarMonthId}
      previousMonthLabel={t('jointAccountCharges.previousCalendarMonth')}
      renderEntry={renderCharge}
      selectDayText={t('jointAccountCharges.selectChargeDay')}
      title={t('jointAccountCharges.calendarTitle')}
    />
  );
}
