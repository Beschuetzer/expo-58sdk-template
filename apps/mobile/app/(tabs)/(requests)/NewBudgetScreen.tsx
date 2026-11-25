import type {
  CurrencyCode,
  BudgetPeriod,
  RelationshipMember,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { isCurrencyCode } from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareDropdown } from '@/components/ui/ThemeAwareDropdown';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getBudgetCurrencyOptions } from '@/features/budgets/budgetFormatters';
import {
  getBudgetPeriodLabel,
  getBudgetPeriodRange,
  formatBudgetDateRange,
} from '@/features/budgets/dateUtils';
import { useCreateBudgetMutation } from '@/features/budgets/hooks/useBudgets';
import {
  useRelationshipMembersQuery,
  useRelationshipsQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipMemberSelector } from '@/features/relationships/components/RelationshipMemberSelector';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';
import {
  formatCurrencyInputAmount,
  parseAmountToMinorUnits,
} from '@/utils/money';

const BUDGET_PERIODS: BudgetPeriod[] = ['monthly', 'quarterly', 'yearly'];

function FormField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
      {children}
    </VStack>
  );
}

function CreateBudgetForm({
  currentUserId,
  members,
  relationship,
}: {
  currentUserId: string;
  members: RelationshipMember[];
  relationship: RelationshipSummary;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const createMutation = useCreateBudgetMutation(relationship.id);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const currencyOptions = useMemo(
    () => getBudgetCurrencyOptions(locale),
    [locale],
  );
  const [requiredApproverUserIds, setRequiredApproverUserIds] = useState<
    string[]
  >([]);
  const amountMinorUnits = parseAmountToMinorUnits(amount, currency);
  const periodRange = getBudgetPeriodRange(period);
  const hasEligibleApprover = members.some(
    (member) => member.active && member.userId !== currentUserId,
  );
  const canCreate =
    name.trim().length > 0 &&
    amountMinorUnits !== undefined &&
    requiredApproverUserIds.length > 0 &&
    hasEligibleApprover &&
    !createMutation.isPending;

  function create() {
    if (amountMinorUnits === undefined || !canCreate) return;
    createMutation.mutate(
      {
        name: name.trim(),
        currency,
        amountMinorUnits,
        period,
        requiredApproverUserIds,
      },
      {
        onSuccess: (budget) => {
          router.dismissTo(AppRoutePaths.budgets);
          router.navigate({
            pathname: AppRoutePaths.budgetDetails,
            params: {
              id: budget.id,
              detailNavigationSource: DetailNavigationSources.budgets,
            },
          });
        },
      },
    );
  }

  const submitButton = (
    <ThemeAwareButton isDisabled={!canCreate} onPress={create}>
      {t('budgets.create')}
    </ThemeAwareButton>
  );

  return (
    <ThemeAwareScreen bottomContent={submitButton}>
      <Stack.Screen options={{ title: t('budgets.create') }} />
      <VStack space="md">
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.budgeting}
          borderRadius="$sm"
          p="$4"
        >
          <VStack space="md">
            <VStack space="xs">
              <ThemeAwareHeading>{t('budgets.create')}</ThemeAwareHeading>
              <ThemeAwareText>{t('budgets.createDescription')}</ThemeAwareText>
            </VStack>
            <FormField label={t('budgets.name')}>
              <ThemeAwareInput
                value={name}
                onChangeText={setName}
                inputFieldProps={{
                  maxLength: 160,
                  placeholder: t('budgets.namePlaceholder'),
                }}
              />
            </FormField>
            <FormField label={t('budgets.currency')}>
              <ThemeAwareDropdown
                onValueChange={(value) => {
                  if (!isCurrencyCode(value)) {
                    throw new Error(
                      `Unsupported budget currency selected: ${value}.`,
                    );
                  }
                  setCurrency(value);
                }}
                options={currencyOptions}
                placeholder={t('budgets.currency')}
                selectedValue={currency}
              />
            </FormField>
            <FormField label={t('budgets.amount')}>
              <ThemeAwareInput
                inputType="number"
                value={amount}
                onChangeText={setAmount}
                inputFieldProps={{
                  placeholder: formatCurrencyInputAmount(0, currency, locale),
                }}
              />
              {amount && amountMinorUnits === undefined ? (
                <ThemeAwareText color="$error600" size="sm">
                  {t('budgets.amountInvalid')}
                </ThemeAwareText>
              ) : null}
            </FormField>
            <FormField label={t('budgets.period')}>
              <HStack space="xs">
                {BUDGET_PERIODS.map((option) => (
                  <ThemeAwareButton
                    key={option}
                    flex={1}
                    onPress={() => setPeriod(option)}
                    variant={period === option ? 'solid' : 'outline'}
                  >
                    {t(getBudgetPeriodLabel(option))}
                  </ThemeAwareButton>
                ))}
              </HStack>
              <ThemeAwareText size="sm">
                {t('budgets.periodDescription')}
              </ThemeAwareText>
              <ThemeAwareText fontWeight="$semibold">
                {formatBudgetDateRange(
                  periodRange.periodStart,
                  periodRange.periodEnd,
                  locale,
                )}
              </ThemeAwareText>
            </FormField>
            <RelationshipMemberSelector
              emptyMessage={
                hasEligibleApprover
                  ? undefined
                  : t('budgets.noEligibleApprovers')
              }
              excludedUserIds={[currentUserId]}
              hint={t('budgets.approversHint')}
              label={t('budgets.approvers')}
              members={members}
              onChange={setRequiredApproverUserIds}
              selectedUserIds={requiredApproverUserIds}
            />
            {createMutation.error ? (
              <ThemeAwareText color="$error600">
                {createMutation.error.message}
              </ThemeAwareText>
            ) : null}
          </VStack>
        </ThemeAwareCardSurface>
      </VStack>
    </ThemeAwareScreen>
  );
}

export default function NewBudgetScreen() {
  const { t } = useI18n();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );
  const membersQuery = useRelationshipMembersQuery(
    relationship?.id,
    Boolean(user?.subject),
  );

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!user?.subject) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (relationshipsQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (relationshipsQuery.error) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText color="$error600">
            {relationshipsQuery.error.message}
          </ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!relationship) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('budgets.noRelationship')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (membersQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (membersQuery.error) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText color="$error600">
            {membersQuery.error.message}
          </ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  const members = membersQuery.data ?? relationship.members;
  if (!members.length) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.create') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('budgets.noEligibleApprovers')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  return (
    <CreateBudgetForm
      currentUserId={user.subject}
      members={members}
      relationship={relationship}
    />
  );
}
