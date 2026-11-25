import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  BudgetSummary,
  BudgetStatus,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { DetailNavigationCollectionRegistration } from '@/components/ui/DetailSwipeNavigator';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSearch } from '@/components/ui/ThemeAwareSearch';
import type {
  ThemeAwareSearchSortConfig,
  ThemeAwareSearchSortOption,
} from '@/components/ui/ThemeAwareSearch';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { AddIcon, Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { formatBudgetAmountSummary } from '@/features/budgets/budgetFormatters';
import { BudgetItemModal } from '@/features/budgets/components/BudgetItemModal';
import { BudgetsListSkeleton } from '@/features/budgets/components/BudgetsListSkeleton';
import {
  formatBudgetDateRange,
  isBudgetActive,
} from '@/features/budgets/dateUtils';
import { useBudgetsQuery } from '@/features/budgets/hooks/useBudgets';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { resolveSelectedRelationship } from '@/features/relationships/utils';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n, type TranslationKey } from '@/utils/i18n';

function statusLabel(status: BudgetStatus): TranslationKey {
  return status === 'approved' ? 'budgets.approved' : 'budgets.pendingApproval';
}

type BudgetSearchFilters = {
  status: 'all' | BudgetStatus;
};

const INITIAL_BUDGET_SEARCH_FILTERS: BudgetSearchFilters = {
  status: 'all',
};

function BudgetCard({
  budget,
  onAddItem,
  onPress,
}: {
  budget: BudgetSummary;
  onAddItem: () => void;
  onPress: () => void;
}) {
  const { locale, t } = useI18n();
  const isApproved = budget.status === 'approved';
  const canAddItem = budget.status === 'approved' && isBudgetActive(budget);
  const periodRange = formatBudgetDateRange(
    budget.periodStart,
    budget.periodEnd,
    locale,
  );

  return (
    <ThemeAwareCardSurface
      backgroundImage={CARD_ARTWORK.budgeting}
      borderRadius="$sm"
      p="$4"
    >
      <VStack space="sm">
        <TouchableOpacity
          activeOpacity={0.75}
          accessibilityLabel={budget.name}
          accessibilityRole="button"
          onPress={onPress}
          style={{
            alignSelf: 'stretch',
            minWidth: 0,
          }}
        >
          <VStack space="sm">
            <HStack space="sm" className="items-start justify-between">
              <ThemeAwareText flex={1} fontWeight="$semibold" numberOfLines={2}>
                {budget.name}
              </ThemeAwareText>
              <ThemeAwareBadge
                darkBackground={isApproved ? '$success900' : '$warning900'}
                darkTextColor={isApproved ? '$success100' : '$warning100'}
                lightBackground={isApproved ? '$success100' : '$warning100'}
                lightTextColor={isApproved ? '$success800' : '$warning800'}
              >
                {t(statusLabel(budget.status))}
              </ThemeAwareBadge>
            </HStack>
            <ThemeAwareText
              adjustsFontSizeToFit
              fontWeight="$semibold"
              numberOfLines={1}
              size="sm"
            >
              {formatBudgetAmountSummary(budget, locale, t)}
            </ThemeAwareText>
          </VStack>
        </TouchableOpacity>
        <HStack space="sm" className="items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityLabel={`${budget.name}, ${periodRange}`}
            accessibilityRole="button"
            onPress={onPress}
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <ThemeAwareText numberOfLines={1} opacity={0.75} size="xs">
              {periodRange}
            </ThemeAwareText>
          </TouchableOpacity>
          {canAddItem ? (
            <ThemeAwareButton
              accessibilityLabel={`${t('budgets.addItem')} ${budget.name}`}
              onPress={onAddItem}
              size="xs"
              variant="outline"
            >
              <Icon as={AddIcon} size="sm" />
            </ThemeAwareButton>
          ) : null}
        </HStack>
      </VStack>
    </ThemeAwareCardSurface>
  );
}

export default function BudgetsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data;
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const { relationshipId } = resolveSelectedRelationship(
    relationships,
    selectedRelationshipId,
    relationships === undefined ||
      relationshipsQuery.isFetching ||
      Boolean(relationshipsQuery.error),
  );
  const budgetsQuery = useBudgetsQuery(relationshipId, Boolean(user?.subject));
  const isInitialBudgetsLoading = budgetsQuery.isLoading && !budgetsQuery.data;
  const budgets = budgetsQuery.data?.items ?? [];
  const [budgetForItem, setBudgetForItem] = useState<BudgetSummary>();
  const sortOptions: ThemeAwareSearchSortOption<BudgetSummary>[] = [
    {
      label: t('budgets.periodStart'),
      value: 'periodStart',
      getValue: (budget) => budget.periodStart,
    },
    {
      label: t('budgets.name'),
      value: 'name',
      getValue: (budget) => budget.name,
    },
    {
      label: t('budgets.amount'),
      value: 'amount',
      getValue: (budget) => budget.amountMinorUnits,
    },
    {
      label: t('budgets.remaining'),
      value: 'remaining',
      getValue: (budget) => budget.amountRemainingMinorUnits,
    },
  ];
  const sortConfig: ThemeAwareSearchSortConfig<BudgetSummary> = {
    field: {
      label: t('paymentRequests.sortBy'),
      initialValue: 'periodStart',
      placeholder: t('paymentRequests.sortBy'),
      options: sortOptions,
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
  };
  const screenOptions = {
    title: t('budgets.title'),
    headerRight: () => (
      <TouchableOpacity
        accessibilityLabel={t('budgets.create')}
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => router.push(AppRoutePaths.createBudget)}
        style={{ paddingHorizontal: 12, paddingVertical: 8 }}
      >
        <FontAwesome color={COLORS[colorScheme].text} name="plus" size={20} />
      </TouchableOpacity>
    ),
  };

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.title') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!user?.subject) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.title') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (relationshipsQuery.error && !relationshipId) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.title') }} />
        <ThemeAwareScreen>
          <ThemeAwareText color="$error600">
            {relationshipsQuery.error.message}
          </ThemeAwareText>
          <ThemeAwareButton
            isDisabled={relationshipsQuery.isFetching}
            onPress={() => relationshipsQuery.refetch()}
            variant="outline"
          >
            {t('paymentRequests.retry')}
          </ThemeAwareButton>
        </ThemeAwareScreen>
      </>
    );
  }

  if (
    !relationshipId &&
    (relationships === undefined || relationshipsQuery.isFetching) &&
    (relationshipsQuery.isLoading || relationshipsQuery.isFetching)
  ) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.title') }} />
        <ThemeAwareScreen fillAvailableSpace>
          <VStack space="md" style={{ flex: 1 }}>
            <ThemeAwareHeading>{t('budgets.title')}</ThemeAwareHeading>
            <ThemeAwareText>{t('budgets.description')}</ThemeAwareText>
            <BudgetsListSkeleton />
          </VStack>
        </ThemeAwareScreen>
      </>
    );
  }

  if (relationships?.length === 0 && !relationshipId) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.title') }} />
        <ThemeAwareScreen fillAvailableSpace={isInitialBudgetsLoading}>
          <VStack
            space="md"
            style={isInitialBudgetsLoading ? { flex: 1 } : undefined}
          >
            <ThemeAwareText>{t('budgets.noRelationship')}</ThemeAwareText>
            <ThemeAwareButton
              onPress={() => router.navigate(AppRoutePaths.home)}
            >
              {t('budgets.openHome')}
            </ThemeAwareButton>
          </VStack>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!relationshipId) {
    return (
      <>
        <Stack.Screen options={{ title: t('budgets.title') }} />
        <ThemeAwareScreen>
          <VStack space="md">
            <ThemeAwareText>
              {t('home.selectActiveRelationshipMessage')}
            </ThemeAwareText>
            <ThemeAwareButton
              onPress={() => router.navigate(AppRoutePaths.home)}
            >
              {t('home.selectActiveRelationship')}
            </ThemeAwareButton>
          </VStack>
        </ThemeAwareScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <DetailNavigationCollectionRegistration
        source={DetailNavigationSources.budgets}
        itemIds={budgets.map((budget) => budget.id)}
        hrefForId={(id) => ({
          pathname: AppRoutePaths.budgetDetails,
          params: {
            id,
            detailNavigationSource: DetailNavigationSources.budgets,
          },
        })}
      />
      <ThemeAwareSearch<BudgetSummary, BudgetSearchFilters>
        items={budgets}
        controlsPresentation="modal"
        initialFilters={INITIAL_BUDGET_SEARCH_FILTERS}
        filterItems={(items, { filters, search }) => {
          const normalizedSearch = search.trim().toLocaleLowerCase();

          return items.filter(
            (budget) =>
              (filters.status === 'all' || budget.status === filters.status) &&
              budget.name.toLocaleLowerCase().includes(normalizedSearch),
          );
        }}
        search={{
          label: t('budgets.name'),
          placeholder: t('budgets.namePlaceholder'),
          inputFieldProps: {
            autoCapitalize: 'none',
            returnKeyType: 'search',
          },
        }}
        filterRows={[
          {
            id: 'status',
            fields: [
              {
                type: 'dropdown',
                filterKey: 'status',
                label: t('budgets.status'),
                placeholder: t('paymentRequests.allStatuses'),
                options: [
                  {
                    label: t('paymentRequests.allStatuses'),
                    value: 'all',
                  },
                  {
                    label: t('budgets.approved'),
                    value: 'approved',
                  },
                  {
                    label: t('budgets.pendingApproval'),
                    value: 'pending_approval',
                  },
                ],
              },
            ],
          },
        ]}
        sort={sortConfig}
        clearFilters={{
          label: t('paymentRequests.clearFilters'),
          variant: 'link',
        }}
      >
        {({ items: filteredBudgets, hasActiveFilters, searchControls }) => (
          <ThemeAwareScreen
            fillAvailableSpace={isInitialBudgetsLoading}
            fixedHeaderContent={searchControls}
          >
            <VStack
              space="md"
              style={isInitialBudgetsLoading ? { flex: 1 } : undefined}
            >
              <ThemeAwareText>{t('budgets.description')}</ThemeAwareText>
              {relationshipsQuery.error ? (
                <VStack space="sm">
                  <ThemeAwareText color="$error600">
                    {relationshipsQuery.error.message}
                  </ThemeAwareText>
                  <ThemeAwareButton
                    isDisabled={relationshipsQuery.isFetching}
                    onPress={() => relationshipsQuery.refetch()}
                    variant="outline"
                  >
                    {t('paymentRequests.retry')}
                  </ThemeAwareButton>
                </VStack>
              ) : null}
              {budgetsQuery.error ? (
                <VStack space="sm">
                  <ThemeAwareText color="$error600">
                    {budgetsQuery.error.message}
                  </ThemeAwareText>
                  <ThemeAwareButton
                    isDisabled={budgetsQuery.isFetching}
                    onPress={() => budgetsQuery.refetch()}
                    variant="outline"
                  >
                    {t('paymentRequests.retry')}
                  </ThemeAwareButton>
                </VStack>
              ) : null}
              {isInitialBudgetsLoading ? (
                <BudgetsListSkeleton />
              ) : budgets.length === 0 ? (
                budgetsQuery.error ? null : (
                  <ThemeAwareText>{t('budgets.empty')}</ThemeAwareText>
                )
              ) : filteredBudgets.length === 0 && hasActiveFilters ? (
                <ThemeAwareText>
                  {t('budgets.noFilteredBudgets')}
                </ThemeAwareText>
              ) : (
                <VStack space="sm">
                  {filteredBudgets.map((budget) => (
                    <BudgetCard
                      budget={budget}
                      key={budget.id}
                      onAddItem={() => setBudgetForItem(budget)}
                      onPress={() =>
                        router.push({
                          pathname: AppRoutePaths.budgetDetails,
                          params: {
                            id: budget.id,
                            detailNavigationSource:
                              DetailNavigationSources.budgets,
                          },
                        })
                      }
                    />
                  ))}
                </VStack>
              )}
            </VStack>
          </ThemeAwareScreen>
        )}
      </ThemeAwareSearch>
      {budgetForItem ? (
        <BudgetItemModal
          budget={budgetForItem}
          onClose={() => setBudgetForItem(undefined)}
        />
      ) : null}
    </>
  );
}
