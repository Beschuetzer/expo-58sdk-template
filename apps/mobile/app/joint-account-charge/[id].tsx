import { format } from 'date-fns';
import { de, enUS, es } from 'date-fns/locale';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { DetailSwipeNavigator } from '@/components/ui/DetailSwipeNavigator';
import { EntityDeleteButton } from '@/components/ui/EntityDeleteButton';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareLoadingIndicator } from '@/components/ui/ThemeAwareLoadingIndicator';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { ThemeAwareTimePicker } from '@/components/ui/ThemeAwareTimePicker';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import {
  useJointAccountChargeQuery,
  useDeleteJointAccountChargeMutation,
  useMarkJointAccountChargePaidMutation,
  useUpdateJointAccountChargeMutation,
} from '@/features/joint-account-charges/hooks/useJointAccountCharges';
import { useRelationshipMembersQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { type Locale, useI18n } from '@/utils/i18n';
import { formatMinorUnits, parseAmountToMinorUnits } from '@/utils/money';

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
        {label}
      </ThemeAwareText>
      {children}
    </VStack>
  );
}

function formatDateTime(value: string, locale: Locale) {
  return format(new Date(value), 'PPpp', {
    locale: locale === 'de' ? de : locale === 'es' ? es : enUS,
  });
}

export default function JointAccountChargeDetailsScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const chargeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const chargeQuery = useJointAccountChargeQuery(
    chargeId,
    Boolean(user?.subject),
  );
  const charge = chargeQuery.data;
  const relationshipId = charge?.relationshipId;
  const membersQuery = useRelationshipMembersQuery(
    relationshipId,
    Boolean(user?.subject),
  );
  const updateMutation = useUpdateJointAccountChargeMutation(relationshipId);
  const deleteMutation = useDeleteJointAccountChargeMutation(relationshipId);
  const markPaidMutation =
    useMarkJointAccountChargePaidMutation(relationshipId);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [chargeDate, setChargeDate] = useState<Date>(new Date());
  const [isSaved, setIsSaved] = useState(false);
  const backToChargesButton = (
    <ThemeAwareButton
      onPress={() => router.dismissTo(AppRoutePaths.viewJointAccountCharges)}
    >
      {t('jointAccountCharges.viewAll')}
    </ThemeAwareButton>
  );

  useEffect(() => {
    if (!charge) return;
    setName(charge.name);
    setAmount(formatMinorUnits(charge.amountMinorUnits));
    setChargeDate(new Date(charge.chargeDate));
  }, [charge?.amountMinorUnits, charge?.chargeDate, charge?.id, charge?.name]);

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen bottomContent={backToChargesButton}>
        <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!user?.subject) {
    return (
      <ThemeAwareScreen bottomContent={backToChargesButton}>
        <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (chargeQuery.isLoading || !charge) {
    return (
      <ThemeAwareScreen bottomContent={backToChargesButton}>
        {!chargeQuery.error ? <ThemeAwareLoadingIndicator /> : null}
        <ThemeAwareText>
          {chargeQuery.error?.message ?? t('common.loading')}
        </ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  const canEdit = charge.createdByUserId === user.subject;
  const amountMinorUnits = parseAmountToMinorUnits(amount);
  const isAmountValid =
    amountMinorUnits !== undefined && amountMinorUnits <= 2_147_483_647;
  const paymentRequestId = charge.paymentRequestId;
  const canSave =
    canEdit &&
    name.trim().length > 0 &&
    isAmountValid &&
    Number.isFinite(chargeDate.getTime()) &&
    !updateMutation.isPending;
  const creatorName = getMemberDisplayName(
    charge.createdByUserId,
    membersQuery.data ?? [],
  );
  const isPaid = charge.status === 'paid';

  return (
    <>
      <Stack.Screen options={{ title: t('jointAccountCharges.details') }} />
      <ThemeAwareScreen
        fixedHeaderContent={
          <ThemeAwareHeading>{charge.name}</ThemeAwareHeading>
        }
        bottomContent={
          <VStack space="sm">
            {canEdit ? (
              <>
                {updateMutation.error ? (
                  <ThemeAwareText>
                    {updateMutation.error.message}
                  </ThemeAwareText>
                ) : null}
                {isSaved ? (
                  <ThemeAwareText color="$success600">
                    {t('jointAccountCharges.saved')}
                  </ThemeAwareText>
                ) : null}
                {!isPaid && markPaidMutation.error ? (
                  <ThemeAwareText>
                    {markPaidMutation.error.message}
                  </ThemeAwareText>
                ) : null}
                {!isPaid && markPaidMutation.isPending ? (
                  <ThemeAwareText>
                    {t('jointAccountCharges.paymentPending')}
                  </ThemeAwareText>
                ) : null}
                {deleteMutation.error ? (
                  <ThemeAwareText color="$error600">
                    {deleteMutation.error.message}
                  </ThemeAwareText>
                ) : null}
                <HStack space="sm">
                  <ThemeAwareButton
                    flex={1}
                    isDisabled={!canSave}
                    onPress={() => {
                      if (!isAmountValid || amountMinorUnits === undefined) {
                        return;
                      }
                      updateMutation.mutate(
                        {
                          chargeId: charge.id,
                          input: {
                            name: name.trim(),
                            amountMinorUnits,
                            chargeDate: chargeDate.toISOString(),
                          },
                        },
                        { onSuccess: () => setIsSaved(true) },
                      );
                    }}
                  >
                    {t('jointAccountCharges.save')}
                  </ThemeAwareButton>
                  {!isPaid ? (
                    <ThemeAwareButton
                      flex={1}
                      isDisabled={markPaidMutation.isPending}
                      onPress={() => markPaidMutation.mutate(charge.id)}
                    >
                      {t('jointAccountCharges.markPaid')}
                    </ThemeAwareButton>
                  ) : null}
                </HStack>
              </>
            ) : null}
            <HStack space="sm">
              <ThemeAwareButton
                flex={1}
                onPress={() =>
                  router.dismissTo(AppRoutePaths.viewJointAccountCharges)
                }
              >
                {t('jointAccountCharges.viewAll')}
              </ThemeAwareButton>
              {canEdit ? (
                <EntityDeleteButton
                  disabled={deleteMutation.isPending}
                  flex={1}
                  onDelete={() =>
                    deleteMutation.mutate(charge.id, {
                      onSuccess: () =>
                        router.dismissTo(AppRoutePaths.viewJointAccountCharges),
                    })
                  }
                />
              ) : null}
            </HStack>
          </VStack>
        }
      >
        <DetailSwipeNavigator
          itemId={charge.id}
          source={detailNavigationSource}
        >
          <VStack space="md">
            <ThemeAwareCardSurface
              backgroundImage={CARD_ARTWORK.budgeting}
              borderRadius="$sm"
              p="$4"
            >
              <VStack space="md">
                <HStack space="md" className="items-start justify-between">
                  <DetailField label={t('jointAccountCharges.status')}>
                    <ThemeAwareBadge
                      darkBackground={isPaid ? '$success900' : '$warning900'}
                      darkTextColor={isPaid ? '$success100' : '$warning100'}
                      lightBackground={isPaid ? '$success100' : '$warning100'}
                      lightTextColor={isPaid ? '$success800' : '$warning800'}
                    >
                      {t(
                        isPaid
                          ? 'jointAccountCharges.paid'
                          : 'jointAccountCharges.unpaid',
                      )}
                    </ThemeAwareBadge>
                  </DetailField>
                  <DetailField label={t('jointAccountCharges.createdBy')}>
                    <ThemeAwareText>{creatorName}</ThemeAwareText>
                  </DetailField>
                </HStack>
                {charge.updatedByUserId ? (
                  <DetailField label={t('jointAccountCharges.lastEditedBy')}>
                    <ThemeAwareText>
                      {getMemberDisplayName(
                        charge.updatedByUserId,
                        membersQuery.data ?? [],
                      )}
                    </ThemeAwareText>
                  </DetailField>
                ) : null}
                {charge.updatedByUserId ? (
                  <DetailField label={t('jointAccountCharges.lastEditedAt')}>
                    <ThemeAwareText>
                      {formatDateTime(charge.updatedAt, locale)}
                    </ThemeAwareText>
                  </DetailField>
                ) : null}
                <DetailField label={t('jointAccountCharges.name')}>
                  {canEdit ? (
                    <ThemeAwareInput
                      value={name}
                      onChangeText={(value) => {
                        setName(value);
                        setIsSaved(false);
                      }}
                      inputFieldProps={{ maxLength: 160 }}
                    />
                  ) : (
                    <ThemeAwareText>{charge.name}</ThemeAwareText>
                  )}
                </DetailField>
                <DetailField label={t('jointAccountCharges.amount')}>
                  {canEdit ? (
                    <ThemeAwareInput
                      value={amount}
                      onChangeText={(value) => {
                        setAmount(value);
                        setIsSaved(false);
                      }}
                      inputFieldProps={{
                        keyboardType: 'decimal-pad',
                        maxLength: 13,
                        placeholder: t('jointAccountCharges.amountPlaceholder'),
                      }}
                    />
                  ) : (
                    <ThemeAwareText fontWeight="$bold" size="lg">
                      {formatMinorUnits(charge.amountMinorUnits)}
                    </ThemeAwareText>
                  )}
                  {canEdit && amount.length > 0 && !isAmountValid ? (
                    <ThemeAwareText color="$error600" size="sm">
                      {t('jointAccountCharges.amountInvalid')}
                    </ThemeAwareText>
                  ) : null}
                </DetailField>
                <DetailField label={t('jointAccountCharges.chargeDate')}>
                  {canEdit ? (
                    <ThemeAwareTimePicker
                      value={chargeDate}
                      onChange={(_event, date) => {
                        if (date) {
                          setChargeDate(date);
                          setIsSaved(false);
                        }
                      }}
                    />
                  ) : (
                    <ThemeAwareText>
                      {new Date(charge.chargeDate).toLocaleDateString(locale)}
                    </ThemeAwareText>
                  )}
                </DetailField>
                {paymentRequestId ? (
                  <ThemeAwareButton
                    variant="outline"
                    onPress={() =>
                      router.push({
                        pathname: AppRoutePaths.paymentRequestDetails,
                        params: { id: paymentRequestId },
                      })
                    }
                  >
                    {t('jointAccountCharges.viewPaymentRequest')}
                  </ThemeAwareButton>
                ) : null}
              </VStack>
            </ThemeAwareCardSurface>
            {membersQuery.error ? (
              <ThemeAwareText>{membersQuery.error.message}</ThemeAwareText>
            ) : null}
          </VStack>
        </DetailSwipeNavigator>
      </ThemeAwareScreen>
    </>
  );
}
