import { Stack, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useCreateJointAccountChargeMutation } from '@/features/joint-account-charges/hooks/useJointAccountCharges';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';
import { parseAmountToMinorUnits } from '@/utils/money';
import { createNavigationBackButton } from '@/utils/pageTitle';

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
      {children}
    </VStack>
  );
}

export default function NewJointAccountChargeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const amountMinorUnits = parseAmountToMinorUnits(amount);
  const isAmountValid =
    amountMinorUnits !== undefined && amountMinorUnits <= 2_147_483_647;
  const createMutation = useCreateJointAccountChargeMutation(
    relationship?.id ?? '',
  );
  const screenOptions = {
    title: t('jointAccountCharges.create'),
    headerLeft: createNavigationBackButton(AppRoutePaths.money),
  };

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <ThemeAwareButton
          onPress={() => router.navigate(AppRoutePaths.account)}
        >
          {t('paymentRequests.signIn')}
        </ThemeAwareButton>
      </ThemeAwareScreen>
    );
  }

  if (!user?.subject) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.isLoading) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.error) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <ThemeAwareText>{t('jointAccountCharges.error')}</ThemeAwareText>
        <ThemeAwareButton
          variant="outline"
          isDisabled={relationshipsQuery.isFetching}
          onPress={() => relationshipsQuery.refetch()}
        >
          {t('paymentRequests.retry')}
        </ThemeAwareButton>
      </ThemeAwareScreen>
    );
  }

  if (!relationship) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <VStack space="md">
          <ThemeAwareText>{t('paymentRequests.noRelationship')}</ThemeAwareText>
          <ThemeAwareButton
            onPress={() => router.navigate(AppRoutePaths.viewAllRequests)}
          >
            {t('paymentRequests.createRelationship')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  const submitButton = (
    <ThemeAwareButton
      isDisabled={
        createMutation.isPending || name.trim().length === 0 || !isAmountValid
      }
      onPress={() => {
        if (!isAmountValid || amountMinorUnits === undefined) return;
        createMutation.mutate(
          { name: name.trim(), amountMinorUnits },
          {
            onSuccess: (charge) => {
              router.dismissTo(AppRoutePaths.viewJointAccountCharges);
              router.navigate({
                pathname: AppRoutePaths.jointAccountChargeDetails,
                params: {
                  id: charge.id,
                  detailNavigationSource:
                    DetailNavigationSources.jointAccountCharges,
                },
              });
            },
          },
        );
      }}
    >
      {t('jointAccountCharges.create')}
    </ThemeAwareButton>
  );

  return (
    <ThemeAwareScreen bottomContent={submitButton}>
      <Stack.Screen options={screenOptions} />
      <VStack space="md">
        <FormField label={t('jointAccountCharges.name')}>
          <ThemeAwareInput
            value={name}
            onChangeText={setName}
            inputFieldProps={{
              autoCapitalize: 'sentences',
              maxLength: 160,
              placeholder: t('jointAccountCharges.namePlaceholder'),
            }}
          />
        </FormField>
        <FormField label={t('jointAccountCharges.amount')}>
          <ThemeAwareInput
            value={amount}
            onChangeText={setAmount}
            inputFieldProps={{
              keyboardType: 'decimal-pad',
              maxLength: 13,
              placeholder: t('jointAccountCharges.amountPlaceholder'),
            }}
          />
        </FormField>
        {amount.length > 0 && !isAmountValid ? (
          <ThemeAwareText color="$error600" size="sm">
            {t('jointAccountCharges.amountInvalid')}
          </ThemeAwareText>
        ) : null}
        <ThemeAwareText>
          {t('jointAccountCharges.dateAutoFilled')}
        </ThemeAwareText>
        {createMutation.error ? (
          <ThemeAwareText>{createMutation.error.message}</ThemeAwareText>
        ) : null}
      </VStack>
    </ThemeAwareScreen>
  );
}
