import type { PaymentRequestSummary } from '@expo-50sdk-template/shared-types';
import { useState } from 'react';

import { DateEntriesCalendarModal } from '@/components/ui/DateEntriesCalendarModal';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { usePaymentRequestCalendarQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import {
  getCurrentCalendarMonthId,
  type CalendarMonthData,
} from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';

type PaymentRequestCalendarModalProps = {
  isVisible: boolean;
  onClose: () => void;
  relationshipId: string;
};

function getStatusLabel(
  status: PaymentRequestSummary['status'],
  t: ReturnType<typeof useI18n>['t'],
) {
  switch (status) {
    case 'approved':
      return t('paymentRequests.approved');
    case 'rejected':
      return t('paymentRequests.rejected');
    case 'cancelled':
      return t('paymentRequests.cancelled');
    case 'draft':
      return t('paymentRequests.draft');
    case 'pending_approval':
      return t('paymentRequests.submitted');
  }
}

export function PaymentRequestCalendarModal({
  isVisible,
  onClose,
  relationshipId,
}: PaymentRequestCalendarModalProps) {
  const { locale, t } = useI18n();
  const [calendarMonthId, setCalendarMonthId] = useState(
    getCurrentCalendarMonthId,
  );
  const calendarQuery = usePaymentRequestCalendarQuery(
    relationshipId,
    calendarMonthId.slice(0, 7),
    isVisible,
  );

  function renderRequest(request: PaymentRequestSummary) {
    return (
      <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$4">
        <VStack space="xs">
          <ThemeAwareText fontWeight="$semibold">
            {request.title}
          </ThemeAwareText>
          <ThemeAwareText size="sm">
            {`${t('paymentRequests.amountMinorUnits')}: ${(
              request.amountMinorUnits / 100
            ).toFixed(2)} ${request.currency}`}
          </ThemeAwareText>
          <ThemeAwareText size="sm">
            {`${t('paymentRequests.statusLabel')}: ${getStatusLabel(
              request.status,
              t,
            )}`}
          </ThemeAwareText>
        </VStack>
      </ThemeAwareSurface>
    );
  }

  const calendarData: CalendarMonthData<PaymentRequestSummary> | undefined =
    calendarQuery.data;

  return (
    <DateEntriesCalendarModal
      boundsKey={relationshipId}
      calendarMonthId={calendarMonthId}
      closeButtonText={t('paymentRequests.closeCalendar')}
      data={calendarData}
      emptyCalendarText={t('paymentRequests.empty')}
      emptyMonthText={t('paymentRequests.noRequestsThisMonth')}
      error={calendarQuery.error}
      errorFallbackText={t('paymentRequests.error')}
      getEntryDate={(request) => request.purchaseDate}
      getEntryId={(request) => request.id}
      isCalendarLoading={calendarQuery.isLoading && !calendarQuery.data}
      isVisible={isVisible}
      loadingLabel={t('common.loading')}
      locale={locale}
      nextMonthLabel={t('paymentRequests.nextCalendarMonth')}
      onClose={onClose}
      onMonthChange={setCalendarMonthId}
      previousMonthLabel={t('paymentRequests.previousCalendarMonth')}
      renderEntry={renderRequest}
      selectDayText={t('paymentRequests.selectRequestDay')}
      title={t('paymentRequests.calendarTitle')}
    />
  );
}
