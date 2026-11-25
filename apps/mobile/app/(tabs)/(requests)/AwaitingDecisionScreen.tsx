import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Href } from 'expo-router';
import { Stack, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { TouchableOpacity } from 'react-native';

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
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { AwaitingDecisionListSkeleton } from '@/features/awaiting-decision/components/AwaitingDecisionListSkeleton';
import {
  type AwaitingDecisionItem,
  useAwaitingDecisionItemsQuery,
} from '@/features/awaiting-decision/hooks/useAwaitingDecisionItems';
import {
  filterPaymentRequests,
  parseAmountFilter,
} from '@/features/payment-requests/filters';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n } from '@/utils/i18n';

type AwaitingDecisionSearchFilters = {
  fromPurchaseDate: Date | null;
  maximumAmountText: string;
  minimumAmountText: string;
  toPurchaseDate: Date | null;
};

const INITIAL_AWAITING_DECISION_SEARCH_FILTERS: AwaitingDecisionSearchFilters =
  {
    fromPurchaseDate: null,
    maximumAmountText: '',
    minimumAmountText: '',
    toPurchaseDate: null,
  };

function getAwaitingDecisionItemTitle(
  item: AwaitingDecisionItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  switch (item.kind) {
    case 'paymentRequest':
      return item.request.title;
    case 'relationshipRule':
      return item.rule.name;
    case 'joinRequest':
      return (
        item.request.requesterDisplayName ?? t('decisionInbox.joinRequest')
      );
    case 'task':
      return item.task.name;
  }
}

function getAwaitingDecisionItemTypeLabel(
  item: AwaitingDecisionItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  switch (item.kind) {
    case 'paymentRequest':
      return t('decisionInbox.paymentRequest');
    case 'relationshipRule':
      return t('decisionInbox.relationshipRule');
    case 'joinRequest':
      return t('decisionInbox.joinRequest');
    case 'task':
      return t('decisionInbox.task');
  }
}

function getAwaitingDecisionItemDate(item: AwaitingDecisionItem) {
  switch (item.kind) {
    case 'paymentRequest':
      return item.request.purchaseDate;
    case 'relationshipRule':
      return item.rule.createdAt;
    case 'joinRequest':
      return item.request.createdAt;
    case 'task':
      return item.task.createdAt;
  }
}

function getAwaitingDecisionItemSearchValues(
  item: AwaitingDecisionItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  switch (item.kind) {
    case 'paymentRequest':
      return [
        item.request.title,
        item.relationshipName,
        item.request.currency,
        item.request.purchaseDate,
        ...item.request.categories,
        t('decisionInbox.paymentRequest'),
      ];
    case 'relationshipRule':
      return [
        item.rule.name,
        item.rule.description,
        item.relationshipName,
        ...item.rule.labels,
        t('decisionInbox.relationshipRule'),
      ];
    case 'joinRequest':
      return [
        item.request.requesterDisplayName,
        item.request.requesterUserId,
        item.relationshipName,
        t('decisionInbox.joinRequest'),
      ];
    case 'task':
      return [item.task.name, item.relationshipName, t('decisionInbox.task')];
  }
}

function matchesSearch(
  item: AwaitingDecisionItem,
  search: string,
  t: ReturnType<typeof useI18n>['t'],
) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return (
    !normalizedSearch ||
    getAwaitingDecisionItemSearchValues(item, t).some((value) =>
      value?.toLocaleLowerCase().includes(normalizedSearch),
    )
  );
}

function formatDateFilterValue(date: Date | null) {
  if (!date) return undefined;

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hasInvalidAmountFilter(filters: AwaitingDecisionSearchFilters) {
  const minimumAmount = parseAmountFilter(filters.minimumAmountText);
  const maximumAmount = parseAmountFilter(filters.maximumAmountText);

  return (
    minimumAmount === null ||
    maximumAmount === null ||
    (minimumAmount !== undefined &&
      maximumAmount !== undefined &&
      minimumAmount > maximumAmount)
  );
}

function hasInvalidDateFilter(filters: AwaitingDecisionSearchFilters) {
  const fromPurchaseDate = formatDateFilterValue(filters.fromPurchaseDate);
  const toPurchaseDate = formatDateFilterValue(filters.toPurchaseDate);

  return (
    fromPurchaseDate !== undefined &&
    toPurchaseDate !== undefined &&
    fromPurchaseDate > toPurchaseDate
  );
}

function getAwaitingDecisionItemHref(item: AwaitingDecisionItem): Href {
  const detailNavigationParams = {
    detailNavigationId: item.navigationId,
    detailNavigationSource: DetailNavigationSources.awaitingDecision,
  };

  switch (item.kind) {
    case 'paymentRequest':
      return {
        pathname: AppRoutePaths.paymentRequestDetails,
        params: {
          ...detailNavigationParams,
          id: item.request.id,
        },
      };
    case 'relationshipRule':
      return {
        pathname: AppRoutePaths.relationshipRuleDetails,
        params: {
          ...detailNavigationParams,
          id: item.rule.id,
        },
      };
    case 'joinRequest':
      return {
        pathname: AppRoutePaths.relationshipJoinRequestDetails,
        params: {
          ...detailNavigationParams,
          id: item.request.id,
          relationshipId: item.request.relationshipId,
        },
      };
    case 'task':
      return {
        pathname: AppRoutePaths.taskDetails,
        params: {
          ...detailNavigationParams,
          id: item.task.id,
          relationshipId: item.task.relationshipId,
        },
      };
  }
}

function getCategorySortValue(item: AwaitingDecisionItem) {
  switch (item.kind) {
    case 'paymentRequest':
      return getAlphabeticalSortValue(item.request.categories);
    case 'relationshipRule':
      return getAlphabeticalSortValue(item.rule.labels);
    case 'joinRequest':
    case 'task':
      return '';
  }
}

function getItemIcon(
  item: AwaitingDecisionItem,
): ComponentProps<typeof FontAwesome>['name'] {
  switch (item.kind) {
    case 'paymentRequest':
      return 'money';
    case 'relationshipRule':
      return 'gavel';
    case 'joinRequest':
      return 'user-plus';
    case 'task':
      return 'check-square';
  }
}

function getAwaitingDecisionItemArtwork(item: AwaitingDecisionItem) {
  switch (item.kind) {
    case 'paymentRequest':
      return CARD_ARTWORK.budgeting;
    case 'relationshipRule':
    case 'task':
      return CARD_ARTWORK.planning;
    case 'joinRequest':
      return CARD_ARTWORK.relationships;
  }
}

function AwaitingDecisionItemRow({
  item,
  onPress,
}: {
  item: AwaitingDecisionItem;
  onPress: () => void;
}) {
  const { locale, t } = useI18n();
  const { getTextColor } = useThemeAwareColors();
  const title = getAwaitingDecisionItemTitle(item, t);
  const itemType = getAwaitingDecisionItemTypeLabel(item, t);
  const date = new Date(getAwaitingDecisionItemDate(item)).toLocaleDateString(
    locale,
  );

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityLabel={`${title}, ${itemType}, ${item.relationshipName}`}
      accessibilityRole="button"
      onPress={onPress}
    >
      <ThemeAwareCardSurface
        backgroundImage={getAwaitingDecisionItemArtwork(item)}
        borderRadius="$sm"
        p="$4"
      >
        <HStack space="md" className="items-center justify-between">
          <VStack space="xs" className="flex-1 min-w-0">
            <ThemeAwareText fontWeight="$semibold" numberOfLines={2}>
              {title}
            </ThemeAwareText>
            <HStack space="xs" className="items-center">
              <FontAwesome
                color={getTextColor(true)}
                name={getItemIcon(item)}
                size={14}
              />
              <ThemeAwareText
                flex={1}
                numberOfLines={1}
                opacity={0.75}
                size="sm"
              >
                {`${itemType} · ${item.relationshipName}`}
              </ThemeAwareText>
            </HStack>
            <ThemeAwareText opacity={0.75} size="sm">
              {date}
            </ThemeAwareText>
          </VStack>
          {item.kind === 'paymentRequest' ? (
            <ThemeAwareText fontWeight="$bold">
              {`${(item.request.amountMinorUnits / 100).toFixed(2)} ${item.request.currency}`}
            </ThemeAwareText>
          ) : null}
          <FontAwesome
            color={getTextColor(true)}
            name="exclamation-circle"
            size={18}
          />
        </HStack>
      </ThemeAwareCardSurface>
    </TouchableOpacity>
  );
}

export default function AwaitingDecisionScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const itemsQuery = useAwaitingDecisionItemsQuery(
    relationships,
    user?.subject ?? undefined,
  );
  const items = itemsQuery.data ?? [];
  const sortOptions: ThemeAwareSearchSortOption<AwaitingDecisionItem>[] = [
    {
      label: t('decisionInbox.sortDate'),
      value: 'date',
      getValue: getAwaitingDecisionItemDate,
    },
    {
      label: t('decisionInbox.sortTitle'),
      value: 'name',
      getValue: (item) => getAwaitingDecisionItemTitle(item, t),
    },
    {
      label: t('decisionInbox.sortCategories'),
      value: 'categories',
      getValue: getCategorySortValue,
    },
    {
      label: t('paymentRequests.amountMinorUnits'),
      value: 'amount',
      getValue: (item) =>
        item.kind === 'paymentRequest'
          ? item.request.amountMinorUnits
          : undefined,
    },
  ];
  const sortConfig: ThemeAwareSearchSortConfig<AwaitingDecisionItem> = {
    field: {
      label: t('paymentRequests.sortBy'),
      initialValue: 'date',
      placeholder: t('paymentRequests.sortBy'),
      options: sortOptions,
    },
    order: {
      label: t('paymentRequests.sortOrder'),
      initialValue: 'ascending',
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
    tieBreaker: (left, right) =>
      left.navigationId.localeCompare(right.navigationId),
  };
  const listFooterComponent = itemsQuery.isFetchNextPageError ? (
    <ThemeAwareButton onPress={itemsQuery.fetchNextPage}>
      {t('paymentRequests.retry')}
    </ThemeAwareButton>
  ) : null;

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('decisionInbox.title') }} />
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
        <Stack.Screen options={{ title: t('decisionInbox.title') }} />
        <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (
    relationshipsQuery.error &&
    relationshipsQuery.data === undefined &&
    items.length === 0
  ) {
    const error = relationshipsQuery.error;
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : t('decisionInbox.error');
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('decisionInbox.title') }} />
        <ThemeAwareText>{message}</ThemeAwareText>
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
    relationshipsQuery.data === undefined &&
    (relationshipsQuery.isLoading || relationshipsQuery.isFetching) &&
    items.length === 0
  ) {
    return (
      <ThemeAwareScreen fillAvailableSpace>
        <Stack.Screen options={{ title: t('decisionInbox.title') }} />
        <AwaitingDecisionListSkeleton />
      </ThemeAwareScreen>
    );
  }

  if (itemsQuery.isError && items.length === 0) {
    const error = itemsQuery.error;
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : t('decisionInbox.error');
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('decisionInbox.title') }} />
        <ThemeAwareText>{message}</ThemeAwareText>
        <ThemeAwareButton
          isDisabled={itemsQuery.isFetching}
          onPress={() => itemsQuery.refetch()}
          variant="outline"
        >
          {t('paymentRequests.retry')}
        </ThemeAwareButton>
      </ThemeAwareScreen>
    );
  }

  const itemsByNavigationId = new Map(
    items.map((item) => [item.navigationId, item]),
  );
  const hrefForNavigationId = (navigationId: string): Href => {
    const item = itemsByNavigationId.get(navigationId);
    if (!item) {
      throw new Error(
        `Awaiting-decision item ${navigationId} is no longer available.`,
      );
    }
    return getAwaitingDecisionItemHref(item);
  };

  return (
    <ThemeAwareSearch<AwaitingDecisionItem, AwaitingDecisionSearchFilters>
      items={items}
      controlsPresentation="modal"
      initialFilters={INITIAL_AWAITING_DECISION_SEARCH_FILTERS}
      filterItems={(unfilteredItems, { filters, search }) => {
        const minimumAmount = parseAmountFilter(filters.minimumAmountText);
        const maximumAmount = parseAmountFilter(filters.maximumAmountText);
        const fromPurchaseDate = formatDateFilterValue(
          filters.fromPurchaseDate,
        );
        const toPurchaseDate = formatDateFilterValue(filters.toPurchaseDate);
        const hasPaymentSpecificFilters =
          minimumAmount !== undefined ||
          maximumAmount !== undefined ||
          fromPurchaseDate !== undefined ||
          toPurchaseDate !== undefined;
        const matchingPaymentRequests = new Set(
          filterPaymentRequests(
            unfilteredItems.flatMap((item) =>
              item.kind === 'paymentRequest' ? [item.request] : [],
            ),
            {
              search,
              status: 'all',
              minimumAmountMinorUnits: minimumAmount,
              maximumAmountMinorUnits: maximumAmount,
              fromPurchaseDate,
              toPurchaseDate,
            },
          ),
        );

        return unfilteredItems.filter((item) => {
          if (item.kind === 'paymentRequest') {
            return matchingPaymentRequests.has(item.request);
          }
          return !hasPaymentSpecificFilters && matchesSearch(item, search, t);
        });
      }}
      isFilterStateValid={({ filters }) =>
        !hasInvalidAmountFilter(filters) && !hasInvalidDateFilter(filters)
      }
      loadMoreWhileFiltered={{
        fetchNextPage: itemsQuery.fetchNextPage,
        hasNextPage: itemsQuery.hasNextPage,
        isFetchingNextPage: itemsQuery.isFetchingNextPage,
        isFetchNextPageError: itemsQuery.isFetchNextPageError,
      }}
      compactOnKeyboard
      search={{
        label: t('decisionInbox.searchLabel'),
        placeholder: t('decisionInbox.searchPlaceholder'),
        inputFieldProps: {
          autoCapitalize: 'none',
          returnKeyType: 'search',
        },
      }}
      filterRows={[
        {
          id: 'purchase-date-range',
          fields: [
            {
              type: 'date',
              filterKey: 'fromPurchaseDate',
              label: t('paymentRequests.fromPurchaseDate'),
              accessibilityLabel: t('paymentRequests.fromPurchaseDate'),
              clearable: true,
            },
            {
              type: 'date',
              filterKey: 'toPurchaseDate',
              label: t('paymentRequests.toPurchaseDate'),
              accessibilityLabel: t('paymentRequests.toPurchaseDate'),
              clearable: true,
            },
          ],
        },
        {
          id: 'amount-range',
          keyboardGroup: 'amount',
          fields: [
            {
              type: 'input',
              filterKey: 'minimumAmountText',
              label: t('paymentRequests.minimumAmount'),
              inputFieldProps: {
                keyboardType: 'decimal-pad',
                placeholder: t('paymentRequests.amountPlaceholder'),
              },
            },
            {
              type: 'input',
              filterKey: 'maximumAmountText',
              label: t('paymentRequests.maximumAmount'),
              inputFieldProps: {
                keyboardType: 'decimal-pad',
                placeholder: t('paymentRequests.amountPlaceholder'),
              },
            },
          ],
        },
        {
          id: 'date-filter-error',
          message: t('paymentRequests.dateFilterInvalid'),
          showWhen: ({ filters }) => hasInvalidDateFilter(filters),
          textProps: { color: '$error600', size: 'sm' },
        },
        {
          id: 'amount-filter-error',
          keyboardGroup: 'amount',
          message: t('paymentRequests.amountFilterInvalid'),
          showWhen: ({ filters }) => hasInvalidAmountFilter(filters),
          textProps: { color: '$error600', size: 'sm' },
        },
      ]}
      sort={sortConfig}
      clearFilters={{
        label: t('paymentRequests.clearFilters'),
        variant: 'outline',
      }}
    >
      {({
        items: sortedItems,
        searchControls,
        hasActiveFilters,
        isFilterStateValid,
      }) => {
        const hasUnloadedFilteredResults =
          hasActiveFilters &&
          isFilterStateValid &&
          sortedItems.length === 0 &&
          itemsQuery.hasNextPage &&
          !itemsQuery.isFetchNextPageError;
        const listEmptyComponent =
          sortedItems.length > 0 || hasUnloadedFilteredResults ? null : (
            <ThemeAwareText>
              {hasActiveFilters
                ? t('decisionInbox.noFilteredItems')
                : t('decisionInbox.empty')}
            </ThemeAwareText>
          );

        return (
          <ThemeAwareInfiniteScrollList<AwaitingDecisionItem>
            data={sortedItems}
            fixedHeaderContent={searchControls}
            detailNavigation={{
              source: DetailNavigationSources.awaitingDecision,
              hrefForId: hrefForNavigationId,
              pageKey: itemsQuery.pageKey,
              isFetching: itemsQuery.isFetching,
              errorMessage: itemsQuery.error?.message,
            }}
            fetchNextPage={itemsQuery.fetchNextPage}
            hasNextPage={itemsQuery.hasNextPage}
            isLoading={itemsQuery.isLoading}
            isFetchNextPageError={itemsQuery.isFetchNextPageError}
            isFetchingNextPage={itemsQuery.isFetchingNextPage}
            onRefresh={itemsQuery.refetch}
            refreshing={itemsQuery.isRefetching}
            keyExtractor={(item) => item.navigationId}
            ListEmptyComponent={listEmptyComponent}
            ListFooterComponent={listFooterComponent}
            loadingSpinner={<AwaitingDecisionListSkeleton />}
            space="md"
            pb="$2"
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
                <AwaitingDecisionItemRow
                  item={item}
                  onPress={() =>
                    router.navigate(getAwaitingDecisionItemHref(item))
                  }
                />
              </VStack>
            )}
          >
            <Stack.Screen options={{ title: t('decisionInbox.title') }} />
            {relationshipsQuery.error ? (
              <VStack space="sm">
                <ThemeAwareText color="$error600">
                  {relationshipsQuery.error.message || t('decisionInbox.error')}
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
            {itemsQuery.error ? (
              <ThemeAwareText color="$error600">
                {itemsQuery.error.message || t('decisionInbox.error')}
              </ThemeAwareText>
            ) : null}
          </ThemeAwareInfiniteScrollList>
        );
      }}
    </ThemeAwareSearch>
  );
}
