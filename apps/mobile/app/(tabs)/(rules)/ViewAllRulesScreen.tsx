import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  RelationshipRule,
  RelationshipRuleStatus,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInfiniteScrollList } from '@/components/ui/ThemeAwareInfiniteScrollList';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  getAlphabeticalSortValue,
  ThemeAwareSearch,
} from '@/components/ui/ThemeAwareSearch';
import type {
  ThemeAwareSearchSortConfig,
  ThemeAwareSearchSortOption,
} from '@/components/ui/ThemeAwareSearch';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipRuleListSkeleton } from '@/features/relationship-rules/components/RelationshipRuleListSkeleton';
import {
  filterRelationshipRules,
  hasInvalidRelationshipRuleDateFilters,
  type RelationshipRuleFilters,
  type RelationshipRuleStatusFilter,
} from '@/features/relationship-rules/filters';
import { useRelationshipRulesInfiniteQuery } from '@/features/relationship-rules/hooks/useRelationshipRules';
import {
  getMemberDisplayName,
  resolveSelectedRelationship,
} from '@/features/relationships/utils';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n, type TranslationKey } from '@/utils/i18n';

type RelationshipRuleSearchFilters = {
  createdByUserId: string;
  createdFromDate: Date | null;
  createdToDate: Date | null;
  label: string;
  ratifiedFromDate: Date | null;
  ratifiedToDate: Date | null;
  requiredApproverUserId: string;
  status: RelationshipRuleStatusFilter;
};

const INITIAL_RELATIONSHIP_RULE_SEARCH_FILTERS: RelationshipRuleSearchFilters =
  {
    createdByUserId: 'all',
    createdFromDate: null,
    createdToDate: null,
    label: '',
    ratifiedFromDate: null,
    ratifiedToDate: null,
    requiredApproverUserId: 'all',
    status: 'all',
  };

function statusLabel(status: RelationshipRuleStatus): TranslationKey {
  return status === 'ratified' ? 'rules.ratified' : 'rules.pendingApproval';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateFilter(date: Date | null): string | undefined {
  if (!date) return undefined;

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelationshipRuleFilters(
  search: string,
  filters: RelationshipRuleSearchFilters,
): RelationshipRuleFilters {
  return {
    search,
    label: filters.label,
    status: filters.status,
    createdByUserId: filters.createdByUserId,
    requiredApproverUserId: filters.requiredApproverUserId,
    createdFromDate: formatDateFilter(filters.createdFromDate),
    createdToDate: formatDateFilter(filters.createdToDate),
    ratifiedFromDate: formatDateFilter(filters.ratifiedFromDate),
    ratifiedToDate: formatDateFilter(filters.ratifiedToDate),
  };
}

function RelationshipRuleRow({
  onPress,
  rule,
}: {
  onPress: () => void;
  rule: RelationshipRule;
}) {
  const { t } = useI18n();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityLabel={rule.name}
      accessibilityRole="button"
      onPress={onPress}
    >
      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.planning}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="sm">
          <HStack space="sm" className="items-start justify-between">
            <ThemeAwareText flex={1} fontWeight="$semibold" numberOfLines={2}>
              {rule.name}
            </ThemeAwareText>
            <ThemeAwareBadge>{t(statusLabel(rule.status))}</ThemeAwareBadge>
          </HStack>
          {rule.labels.length > 0 ? (
            <HStack space="xs" className="flex-wrap">
              {rule.labels.map((label) => (
                <ThemeAwareBadge key={label}>{label}</ThemeAwareBadge>
              ))}
            </HStack>
          ) : null}
          {/* <ThemeAwareText size="sm" opacity={0.75}>
            {`${t('rules.dateCreated')}: ${formatDate(rule.createdAt)}`}
          </ThemeAwareText>
          <ThemeAwareText size="sm" opacity={0.75}>
            {`${t('rules.dateRatified')}: ${
              rule.ratifiedAt
                ? formatDate(rule.ratifiedAt)
                : t('rules.notRatified')
            }`} */}
          {/* </ThemeAwareText> */}
        </VStack>
      </ThemeAwareCardSurface>
    </TouchableOpacity>
  );
}

export default function ViewAllRulesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data;
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const { relationship, relationshipId } = resolveSelectedRelationship(
    relationships,
    selectedRelationshipId,
    relationships === undefined ||
      relationshipsQuery.isFetching ||
      Boolean(relationshipsQuery.error),
  );
  const relationshipMembers = relationship?.members ?? [];
  const rulesQuery = useRelationshipRulesInfiniteQuery(
    relationshipId,
    Boolean(user?.subject),
  );
  const rules = rulesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const sortOptions: ThemeAwareSearchSortOption<RelationshipRule>[] = [
    {
      label: t('rules.name'),
      value: 'name',
      getValue: (rule) => rule.name,
    },
    {
      label: t('rules.labels'),
      value: 'labels',
      getValue: (rule) => getAlphabeticalSortValue(rule.labels),
    },
    {
      label: t('rules.dateCreated'),
      value: 'createdAt',
      getValue: (rule) => rule.createdAt,
    },
    {
      label: t('rules.dateRatified'),
      value: 'ratifiedAt',
      getValue: (rule) => rule.ratifiedAt,
    },
    {
      label: t('rules.status'),
      value: 'status',
      getValue: (rule) => rule.status,
    },
  ];
  const sortConfig: ThemeAwareSearchSortConfig<RelationshipRule> = {
    field: {
      label: t('paymentRequests.sortBy'),
      initialValue: 'createdAt',
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
    tieBreaker: (left, right) => left.id.localeCompare(right.id),
  };

  const screenOptions = {
    title: t('rules.viewAll'),
    headerRight: () => (
      <TouchableOpacity
        accessibilityLabel={t('rules.create')}
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => router.push(AppRoutePaths.createRule)}
        style={{ paddingHorizontal: 12, paddingVertical: 8 }}
      >
        <FontAwesome color={COLORS[colorScheme].text} name="plus" size={20} />
      </TouchableOpacity>
    ),
  };
  const listFooterComponent = rulesQuery.isFetchNextPageError ? (
    <VStack space="sm">
      <ThemeAwareText color="$error600">
        {rulesQuery.error?.message ?? t('rules.error')}
      </ThemeAwareText>
      <ThemeAwareButton
        isDisabled={rulesQuery.isFetchingNextPage}
        onPress={() => {
          rulesQuery.fetchNextPage();
        }}
        variant="outline"
      >
        {t('paymentRequests.retry')}
      </ThemeAwareButton>
    </VStack>
  ) : null;

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

  if (relationshipsQuery.error && !relationshipId) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <ThemeAwareText>{relationshipsQuery.error.message}</ThemeAwareText>
        <ThemeAwareButton
          isDisabled={relationshipsQuery.isFetching}
          onPress={() => relationshipsQuery.refetch()}
          variant="outline"
        >
          {t('paymentRequests.retry')}
        </ThemeAwareButton>
      </ThemeAwareScreen>
    );
  }

  if (
    !relationshipId &&
    (relationships === undefined || relationshipsQuery.isFetching) &&
    (relationshipsQuery.isLoading || relationshipsQuery.isFetching)
  ) {
    return (
      <ThemeAwareScreen fillAvailableSpace>
        <Stack.Screen options={screenOptions} />
        <RelationshipRuleListSkeleton />
      </ThemeAwareScreen>
    );
  }

  if (relationships?.length === 0 && !relationshipId) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <VStack space="md">
          <ThemeAwareText>{t('rules.noRelationship')}</ThemeAwareText>
          <ThemeAwareButton onPress={() => router.navigate(AppRoutePaths.home)}>
            {t('rules.openHome')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  if (!relationshipId) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <VStack space="md">
          <ThemeAwareText>
            {t('home.selectActiveRelationshipMessage')}
          </ThemeAwareText>
          <ThemeAwareButton onPress={() => router.navigate(AppRoutePaths.home)}>
            {t('home.selectActiveRelationship')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  return (
    <ThemeAwareSearch<RelationshipRule, RelationshipRuleSearchFilters>
      items={rules}
      controlsPresentation="modal"
      initialFilters={INITIAL_RELATIONSHIP_RULE_SEARCH_FILTERS}
      filterItems={(items, { filters, search }) =>
        filterRelationshipRules(
          [...items],
          getRelationshipRuleFilters(search, filters),
          relationshipMembers,
        )
      }
      isFilterStateValid={({ filters, search }) =>
        !hasInvalidRelationshipRuleDateFilters(
          getRelationshipRuleFilters(search, filters),
        )
      }
      loadMoreWhileFiltered={{
        fetchNextPage: () => rulesQuery.fetchNextPage(),
        hasNextPage: rulesQuery.hasNextPage,
        isFetchingNextPage: rulesQuery.isFetchingNextPage,
        isFetchNextPageError: rulesQuery.isFetchNextPageError,
      }}
      search={{
        label: t('rules.filterByName'),
        placeholder: t('rules.filterByNamePlaceholder'),
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
              label: t('rules.filterByStatus'),
              placeholder: t('rules.allStatuses'),
              options: [
                { label: t('rules.allStatuses'), value: 'all' },
                {
                  label: t('rules.pendingApproval'),
                  value: 'pending_approval',
                },
                { label: t('rules.ratified'), value: 'ratified' },
              ],
            },
          ],
        },
        {
          id: 'label',
          fields: [
            {
              type: 'input',
              filterKey: 'label',
              label: t('rules.filterByLabel'),
              inputFieldProps: {
                autoCapitalize: 'none',
                placeholder: t('rules.filterByLabelPlaceholder'),
                returnKeyType: 'search',
              },
            },
          ],
        },
        {
          id: 'creator',
          fields: [
            {
              type: 'dropdown',
              filterKey: 'createdByUserId',
              label: t('rules.filterByCreator'),
              placeholder: t('rules.allCreators'),
              options: [
                { label: t('rules.allCreators'), value: 'all' },
                ...relationshipMembers.map((member) => ({
                  label: getMemberDisplayName(
                    member.userId,
                    relationshipMembers,
                  ),
                  value: member.userId,
                })),
              ],
            },
          ],
        },
        {
          id: 'required-approver',
          fields: [
            {
              type: 'dropdown',
              filterKey: 'requiredApproverUserId',
              label: t('rules.filterByApprover'),
              placeholder: t('rules.allApprovers'),
              options: [
                { label: t('rules.allApprovers'), value: 'all' },
                ...relationshipMembers.map((member) => ({
                  label: getMemberDisplayName(
                    member.userId,
                    relationshipMembers,
                  ),
                  value: member.userId,
                })),
              ],
            },
          ],
        },
        {
          id: 'created-date-range',
          fields: [
            {
              type: 'date',
              filterKey: 'createdFromDate',
              label: t('rules.createdFromDate'),
              accessibilityLabel: t('rules.createdFromDate'),
              clearable: true,
            },
            {
              type: 'date',
              filterKey: 'createdToDate',
              label: t('rules.createdToDate'),
              accessibilityLabel: t('rules.createdToDate'),
              clearable: true,
            },
          ],
        },
        {
          id: 'ratified-date-range',
          fields: [
            {
              type: 'date',
              filterKey: 'ratifiedFromDate',
              label: t('rules.ratifiedFromDate'),
              accessibilityLabel: t('rules.ratifiedFromDate'),
              clearable: true,
            },
            {
              type: 'date',
              filterKey: 'ratifiedToDate',
              label: t('rules.ratifiedToDate'),
              accessibilityLabel: t('rules.ratifiedToDate'),
              clearable: true,
            },
          ],
        },
        {
          id: 'date-filter-error',
          message: t('rules.dateFilterInvalid'),
          showWhen: ({ filters, search }) =>
            hasInvalidRelationshipRuleDateFilters(
              getRelationshipRuleFilters(search, filters),
            ),
          textProps: { color: '$error600', size: 'sm' },
        },
      ]}
      sort={sortConfig}
      clearFilters={{
        label: t('rules.clearFilters'),
        variant: 'link',
      }}
    >
      {({
        items: sortedRules,
        searchControls,
        hasActiveFilters,
        isFilterStateValid,
      }) => {
        const hasUnloadedFilteredResults =
          hasActiveFilters &&
          isFilterStateValid &&
          sortedRules.length === 0 &&
          rulesQuery.hasNextPage &&
          !rulesQuery.isFetchNextPageError;
        const listEmptyComponent =
          rulesQuery.error && rules.length === 0 ? (
            <ThemeAwareText>
              {rulesQuery.error.message || t('rules.error')}
            </ThemeAwareText>
          ) : hasUnloadedFilteredResults ? null : rules.length === 0 &&
            !hasActiveFilters ? (
            <ThemeAwareText>{t('rules.emptyMessage')}</ThemeAwareText>
          ) : (
            <ThemeAwareText>{t('rules.noFilteredRules')}</ThemeAwareText>
          );

        return (
          <ThemeAwareInfiniteScrollList<RelationshipRule>
            data={sortedRules}
            fixedHeaderContent={searchControls}
            detailNavigation={{
              source: DetailNavigationSources.relationshipRules,
              hrefForId: (id) => ({
                pathname: AppRoutePaths.relationshipRuleDetails,
                params: {
                  id,
                  detailNavigationSource:
                    DetailNavigationSources.relationshipRules,
                },
              }),
              pageKey: rulesQuery.data?.pages.length ?? 0,
              isFetching: rulesQuery.isFetching,
              errorMessage: rulesQuery.error?.message,
            }}
            fetchNextPage={rulesQuery.fetchNextPage}
            hasNextPage={rulesQuery.hasNextPage}
            isLoading={rulesQuery.isLoading}
            isFetchNextPageError={rulesQuery.isFetchNextPageError}
            isFetchingNextPage={rulesQuery.isFetchingNextPage}
            onRefresh={rulesQuery.refetch}
            refreshing={rulesQuery.isRefetching}
            keyExtractor={(rule) => rule.id}
            ListEmptyComponent={listEmptyComponent}
            ListFooterComponent={listFooterComponent}
            loadingSpinner={<RelationshipRuleListSkeleton />}
            onEndReachedThreshold={0.5}
            bottomContent={({ scrollToTop }) => (
              <ThemeAwareButton
                accessibilityLabel={t('common.backToTop')}
                flex={1}
                onPress={scrollToTop}
                variant="outline"
              >
                {t('common.backToTop')}
              </ThemeAwareButton>
            )}
            renderItem={({ item }) => (
              <VStack className="pb-2">
                <RelationshipRuleRow
                  rule={item}
                  onPress={() =>
                    router.navigate({
                      pathname: AppRoutePaths.relationshipRuleDetails,
                      params: {
                        id: item.id,
                        detailNavigationSource:
                          DetailNavigationSources.relationshipRules,
                      },
                    })
                  }
                />
              </VStack>
            )}
          >
            <Stack.Screen options={screenOptions} />
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
          </ThemeAwareInfiniteScrollList>
        );
      }}
    </ThemeAwareSearch>
  );
}
