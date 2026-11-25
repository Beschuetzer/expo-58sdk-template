import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  Budget,
  BudgetItem,
  BudgetPeriod,
  BudgetStatus,
  RelationshipMember,
} from '@expo-50sdk-template/shared-types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { DetailSwipeNavigator } from '@/components/ui/DetailSwipeNavigator';
import { EntityDeleteButton } from '@/components/ui/EntityDeleteButton';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareSearch,
  type ThemeAwareSearchSortConfig,
  type ThemeAwareSearchSortOption,
} from '@/components/ui/ThemeAwareSearch';
import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { formatBudgetAmountSummary } from '@/features/budgets/budgetFormatters';
import { BudgetItemModal } from '@/features/budgets/components/BudgetItemModal';
import {
  formatBudgetDate,
  formatBudgetDateRange,
  getBudgetPeriodLabel,
  getBudgetPeriodRange,
  isBudgetActive,
} from '@/features/budgets/dateUtils';
import {
  useApproveBudgetMutation,
  useBudgetQuery,
  useDeleteBudgetMutation,
  useUpdateBudgetMutation,
} from '@/features/budgets/hooks/useBudgets';
import { useRelationshipMembersQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipMemberSelector } from '@/features/relationships/components/RelationshipMemberSelector';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { useI18n, type TranslationKey } from '@/utils/i18n';
import {
  formatCurrencyMinorUnits,
  formatCurrencyInputAmount,
  parseAmountToMinorUnits,
} from '@/utils/money';

const BUDGET_PERIODS: BudgetPeriod[] = ['monthly', 'quarterly', 'yearly'];

type BudgetItemSearchFilters = {
  fromDate: Date | null;
  toDate: Date | null;
};

const INITIAL_BUDGET_ITEM_SEARCH_FILTERS: BudgetItemSearchFilters = {
  fromDate: null,
  toDate: null,
};

function formatLocalDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hasInvalidBudgetItemDateRange(
  fromDate: Date | null,
  toDate: Date | null,
) {
  return (
    fromDate !== null &&
    toDate !== null &&
    formatLocalDate(fromDate) > formatLocalDate(toDate)
  );
}

function statusLabel(status: BudgetStatus): TranslationKey {
  return status === 'approved' ? 'budgets.approved' : 'budgets.pendingApproval';
}

function DetailField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
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

function BudgetEditor({
  budget,
  currentUserId,
  members,
  onCancel,
  onSaved,
}: {
  budget: Budget;
  currentUserId: string;
  members: RelationshipMember[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { locale, t } = useI18n();
  const updateMutation = useUpdateBudgetMutation();
  const [name, setName] = useState(budget.name);
  const [amount, setAmount] = useState(
    formatCurrencyInputAmount(budget.amountMinorUnits, budget.currency, locale),
  );
  const [period, setPeriod] = useState<BudgetPeriod>(budget.period);
  const [requiredApproverUserIds, setRequiredApproverUserIds] = useState(() =>
    budget.approvals
      .map((approval) => approval.memberUserId)
      .filter((userId) =>
        members.some((member) => member.active && member.userId === userId),
      ),
  );
  const amountMinorUnits = parseAmountToMinorUnits(amount, budget.currency);
  const hasEligibleApprover = members.some(
    (member) => member.active && member.userId !== currentUserId,
  );
  const periodRange = getBudgetPeriodRange(
    period,
    new Date(budget.periodStart),
  );
  const canSave =
    name.trim().length > 0 &&
    amountMinorUnits !== undefined &&
    requiredApproverUserIds.length > 0 &&
    hasEligibleApprover &&
    !updateMutation.isPending;

  function save() {
    if (amountMinorUnits === undefined || !canSave) return;
    updateMutation.mutate(
      {
        budgetId: budget.id,
        input: {
          name: name.trim(),
          amountMinorUnits,
          period,
          requiredApproverUserIds,
        },
      },
      { onSuccess: onSaved },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('budgets.edit') }} />
      <ThemeAwareScreen
        fixedHeaderContent={
          <ThemeAwareHeading>{budget.name}</ThemeAwareHeading>
        }
        bottomContent={
          <VStack space="sm">
            <ThemeAwareButton isDisabled={!canSave} onPress={save}>
              {t('budgets.saveChanges')}
            </ThemeAwareButton>
            <ThemeAwareButton onPress={onCancel} variant="outline">
              {t('budgets.cancel')}
            </ThemeAwareButton>
          </VStack>
        }
      >
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.budgeting}
          borderRadius="$sm"
          p="$4"
        >
          <VStack space="md">
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
            <FormField label={t('budgets.amount')}>
              <ThemeAwareInput
                inputType="number"
                value={amount}
                onChangeText={setAmount}
                inputFieldProps={{
                  placeholder: formatCurrencyInputAmount(
                    0,
                    budget.currency,
                    locale,
                  ),
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
            {updateMutation.error ? (
              <ThemeAwareText color="$error600">
                {updateMutation.error.message}
              </ThemeAwareText>
            ) : null}
          </VStack>
        </ThemeAwareCardSurface>
      </ThemeAwareScreen>
    </>
  );
}

export default function BudgetDetailsScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const budgetId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const budgetQuery = useBudgetQuery(budgetId, Boolean(user?.subject));
  const budget = budgetQuery.data;
  const membersQuery = useRelationshipMembersQuery(
    budget?.relationshipId,
    Boolean(user?.subject),
  );
  const approveMutation = useApproveBudgetMutation();
  const deleteMutation = useDeleteBudgetMutation(budget?.relationshipId ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.details') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!user?.subject) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.details') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!budgetId) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.details') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('budgets.notFound')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (budgetQuery.isLoading || !budget) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.details') }} />
        <ThemeAwareScreen>
          <ThemeAwareText color={budgetQuery.error ? '$error600' : undefined}>
            {budgetQuery.error?.message ?? t('common.loading')}
          </ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  const members = membersQuery.data ?? [];
  const isCreator = budget.createdByUserId === user.subject;
  const currentApproval = budget.approvals.find(
    (approval) => approval.memberUserId === user.subject,
  );
  const canApprove =
    budget.status === 'pending_approval' &&
    currentApproval !== undefined &&
    !currentApproval.approvedAt;
  const canAddItem = budget.status === 'approved' && isBudgetActive(budget);
  const detailsScreenOptions = {
    title: t('budgets.details'),
    headerRight: canAddItem
      ? () => (
          <TouchableOpacity
            accessibilityLabel={`${t('budgets.addItem')} ${budget.name}`}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setIsAddingItem(true)}
            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <FontAwesome
              color={COLORS[colorScheme].text}
              name="plus"
              size={20}
            />
          </TouchableOpacity>
        )
      : undefined,
  };
  const itemSortOptions: ThemeAwareSearchSortOption<BudgetItem>[] = [
    {
      label: t('budgets.itemDate'),
      value: 'date',
      getValue: (item) => item.date,
    },
    {
      label: t('budgets.itemName'),
      value: 'name',
      getValue: (item) => item.name,
    },
    {
      label: t('budgets.itemAmount'),
      value: 'amount',
      getValue: (item) => item.amountMinorUnits,
    },
  ];
  const itemSortConfig: ThemeAwareSearchSortConfig<BudgetItem> = {
    field: {
      label: t('paymentRequests.sortBy'),
      initialValue: 'date',
      placeholder: t('paymentRequests.sortBy'),
      options: itemSortOptions,
    },
    order: {
      label: t('paymentRequests.sortOrder'),
      initialValue: 'descending',
      placeholder: t('paymentRequests.sortOrder'),
      options: [
        {
          label: t('paymentRequests.ascending'),
          value: 'ascending',
        },
        {
          label: t('paymentRequests.descending'),
          value: 'descending',
        },
      ],
    },
    tieBreaker: (left, right, order) =>
      left.id.localeCompare(right.id) * (order === 'descending' ? -1 : 1),
  };

  if (
    isEditing &&
    isCreator &&
    !membersQuery.isLoading &&
    !membersQuery.error
  ) {
    return (
      <BudgetEditor
        budget={budget}
        currentUserId={user.subject}
        members={members}
        onCancel={() => setIsEditing(false)}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={detailsScreenOptions} />
      <ThemeAwareScreen
        fixedHeaderContent={
          <ThemeAwareHeading>{budget.name}</ThemeAwareHeading>
        }
        bottomContent={
          <VStack space="sm">
            {approveMutation.isPending ? (
              <ThemeAwareText>{t('budgets.approvalPending')}</ThemeAwareText>
            ) : null}
            {canApprove ? (
              <ThemeAwareButton
                isDisabled={approveMutation.isPending}
                onPress={() => approveMutation.mutate(budget.id)}
              >
                {t('budgets.approve')}
              </ThemeAwareButton>
            ) : null}
            {isCreator ? (
              <ThemeAwareButton
                isDisabled={
                  membersQuery.isLoading || Boolean(membersQuery.error)
                }
                onPress={() => setIsEditing(true)}
              >
                {t('budgets.edit')}
              </ThemeAwareButton>
            ) : null}
            <HStack space="sm">
              <ThemeAwareButton
                flex={1}
                onPress={() => router.dismissTo(AppRoutePaths.budgets)}
                variant="outline"
              >
                {t('budgets.viewAll')}
              </ThemeAwareButton>
              {isCreator ? (
                <EntityDeleteButton
                  confirmationMessage={t('budgets.deleteConfirmation')}
                  disabled={deleteMutation.isPending}
                  flex={1}
                  onDelete={() =>
                    deleteMutation.mutate(budget.id, {
                      onSuccess: () => router.dismissTo(AppRoutePaths.budgets),
                    })
                  }
                />
              ) : null}
            </HStack>
          </VStack>
        }
      >
        <DetailSwipeNavigator
          itemId={budget.id}
          source={detailNavigationSource}
        >
          <VStack space="md">
            {membersQuery.error ? (
              <VStack space="sm">
                <ThemeAwareText color="$error600">
                  {membersQuery.error.message}
                </ThemeAwareText>
                <ThemeAwareButton
                  isDisabled={membersQuery.isFetching}
                  onPress={() => membersQuery.refetch()}
                  variant="outline"
                >
                  {t('paymentRequests.retry')}
                </ThemeAwareButton>
              </VStack>
            ) : null}
            <ThemeAwareCardSurface
              backgroundImage={CARD_ARTWORK.budgeting}
              borderRadius="$sm"
              p="$4"
            >
              <VStack space="md">
                <HStack space="md" className="items-start justify-between">
                  <DetailField label={t('budgets.status')}>
                    <ThemeAwareBadge>
                      {t(statusLabel(budget.status))}
                    </ThemeAwareBadge>
                  </DetailField>
                  <DetailField label={t('budgets.createdBy')}>
                    {membersQuery.isLoading ? (
                      <ThemeAwareSkeleton height={14} width={92} />
                    ) : (
                      <ThemeAwareText>
                        {getMemberDisplayName(budget.createdByUserId, members)}
                      </ThemeAwareText>
                    )}
                  </DetailField>
                </HStack>
                <VStack space="xs">
                  <ThemeAwareText
                    adjustsFontSizeToFit
                    fontWeight="$bold"
                    numberOfLines={1}
                    size="sm"
                  >
                    {formatBudgetAmountSummary(budget, locale, t)}
                  </ThemeAwareText>
                  <ThemeAwareText numberOfLines={1} opacity={0.75} size="xs">
                    {`${t(getBudgetPeriodLabel(budget.period))} | ${formatBudgetDateRange(
                      budget.periodStart,
                      budget.periodEnd,
                      locale,
                    )}`}
                  </ThemeAwareText>
                </VStack>
                <DetailField label={t('budgets.createdAt')}>
                  <ThemeAwareText>
                    {formatBudgetDate(budget.createdAt, locale)}
                  </ThemeAwareText>
                </DetailField>
              </VStack>
            </ThemeAwareCardSurface>
            <DetailField label={t('budgets.approvers')}>
              <VStack space="xs">
                {budget.approvals.map((approval) => (
                  <HStack
                    key={approval.memberUserId}
                    space="sm"
                    className="items-center justify-between"
                  >
                    {membersQuery.isLoading ? (
                      <ThemeAwareSkeleton height={14} width={92} />
                    ) : (
                      <ThemeAwareText>
                        {getMemberDisplayName(approval.memberUserId, members)}
                      </ThemeAwareText>
                    )}
                    <ThemeAwareText size="sm">
                      {t(
                        approval.approvedAt
                          ? 'budgets.approverApproved'
                          : 'budgets.approverPending',
                      )}
                    </ThemeAwareText>
                  </HStack>
                ))}
              </VStack>
            </DetailField>
            <ThemeAwareSearch<BudgetItem, BudgetItemSearchFilters>
              items={budget.items}
              controlsPresentation="modal"
              initialFilters={INITIAL_BUDGET_ITEM_SEARCH_FILTERS}
              filterItems={(items, { filters, search }) => {
                const normalizedSearch = search.trim().toLocaleLowerCase();
                const fromDate =
                  filters.fromDate === null
                    ? null
                    : formatLocalDate(filters.fromDate);
                const toDate =
                  filters.toDate === null
                    ? null
                    : formatLocalDate(filters.toDate);

                if (
                  hasInvalidBudgetItemDateRange(
                    filters.fromDate,
                    filters.toDate,
                  )
                ) {
                  return [];
                }

                return items.filter((item) => {
                  const itemDate = item.date.slice(0, 10);
                  return (
                    (!normalizedSearch ||
                      item.name
                        .toLocaleLowerCase()
                        .includes(normalizedSearch)) &&
                    (fromDate === null || itemDate >= fromDate) &&
                    (toDate === null || itemDate <= toDate)
                  );
                });
              }}
              isFilterStateValid={({ filters }) =>
                !hasInvalidBudgetItemDateRange(filters.fromDate, filters.toDate)
              }
              search={{
                label: t('budgets.itemName'),
                placeholder: t('budgets.itemNamePlaceholder'),
                inputFieldProps: {
                  autoCapitalize: 'none',
                  returnKeyType: 'search',
                },
              }}
              filterRows={[
                {
                  id: 'item-date-range',
                  fields: [
                    {
                      type: 'date',
                      filterKey: 'fromDate',
                      label: t('budgets.itemDateFrom'),
                      accessibilityLabel: t('budgets.itemDateFrom'),
                      clearable: true,
                    },
                    {
                      type: 'date',
                      filterKey: 'toDate',
                      label: t('budgets.itemDateTo'),
                      accessibilityLabel: t('budgets.itemDateTo'),
                      clearable: true,
                    },
                  ],
                },
                {
                  id: 'item-date-filter-error',
                  message: t('budgets.itemDateFilterInvalid'),
                  showWhen: ({ filters }) =>
                    hasInvalidBudgetItemDateRange(
                      filters.fromDate,
                      filters.toDate,
                    ),
                  textProps: { color: '$error600', size: 'sm' },
                },
              ]}
              sort={itemSortConfig}
              clearFilters={{
                label: t('paymentRequests.clearFilters'),
                variant: 'link',
              }}
            >
              {({ items: filteredItems, hasActiveFilters, searchControls }) => (
                <VStack space="xs">
                  <HStack space="sm" className="items-center justify-between">
                    <ThemeAwareText
                      fontWeight="$semibold"
                      opacity={0.75}
                      size="sm"
                    >
                      {t('budgets.items')}
                    </ThemeAwareText>
                    {canAddItem ? (
                      <ThemeAwareButton
                        accessibilityLabel={`${t('budgets.addItem')} ${budget.name}`}
                        onPress={() => setIsAddingItem(true)}
                        size="sm"
                        variant="outline"
                      >
                        <Icon as={AddIcon} />
                      </ThemeAwareButton>
                    ) : null}
                  </HStack>
                  {searchControls}
                  {budget.items.length === 0 ? (
                    <ThemeAwareText>{t('budgets.noItems')}</ThemeAwareText>
                  ) : filteredItems.length === 0 ? (
                    <ThemeAwareText>
                      {hasActiveFilters
                        ? t('budgets.noFilteredItems')
                        : t('budgets.noItems')}
                    </ThemeAwareText>
                  ) : (
                    <VStack space="sm">
                      {filteredItems.map((item) => (
                        <ThemeAwareCardSurface
                          backgroundImage={CARD_ARTWORK.budgeting}
                          key={item.id}
                          borderRadius="$sm"
                          p="$3"
                        >
                          <HStack
                            space="sm"
                            className="items-center justify-between"
                          >
                            <VStack space="xs" className="flex-1">
                              <ThemeAwareText fontWeight="$semibold">
                                {item.name}
                              </ThemeAwareText>
                              <ThemeAwareText opacity={0.75} size="sm">
                                {formatBudgetDate(item.date, locale)}
                              </ThemeAwareText>
                            </VStack>
                            <ThemeAwareText fontWeight="$semibold">
                              {formatCurrencyMinorUnits(
                                item.amountMinorUnits,
                                budget.currency,
                                locale,
                              )}
                            </ThemeAwareText>
                          </HStack>
                        </ThemeAwareCardSurface>
                      ))}
                    </VStack>
                  )}
                </VStack>
              )}
            </ThemeAwareSearch>
            {approveMutation.error ? (
              <ThemeAwareText color="$error600">
                {approveMutation.error.message}
              </ThemeAwareText>
            ) : null}
            {deleteMutation.error ? (
              <ThemeAwareText color="$error600">
                {deleteMutation.error.message}
              </ThemeAwareText>
            ) : null}
          </VStack>
        </DetailSwipeNavigator>
      </ThemeAwareScreen>
      {isAddingItem && canAddItem ? (
        <BudgetItemModal
          budget={budget}
          onClose={() => setIsAddingItem(false)}
        />
      ) : null}
    </>
  );
}
