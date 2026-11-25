import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  PaymentRequestStatus,
  PaymentRequestSummary,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInfiniteScrollList } from '@/components/ui/ThemeAwareInfiniteScrollList';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  getAlphabeticalSortValue,
  ThemeAwareSearch,
} from '@/components/ui/ThemeAwareSearch';
import type {
  ThemeAwareSearchSortConfig,
  ThemeAwareSearchSortOption,
} from '@/components/ui/ThemeAwareSearch';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getDisplayNameFromClaims } from '@/features/auth/client';
import { PaymentRequestCalendarModal } from '@/features/payment-requests/components/PaymentRequestCalendarModal';
import { PaymentRequestListSkeleton } from '@/features/payment-requests/components/PaymentRequestListSkeleton';
import {
  filterPaymentRequests,
  parseAmountFilter,
  type PaymentRequestStatusFilter,
} from '@/features/payment-requests/filters';
import { getMemberDisplayName } from '@/features/payment-requests/form';
import {
  usePaymentRequestsInfiniteQuery,
  useCreateRelationshipMutation,
  useRelationshipsQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { resolveSelectedRelationship } from '@/features/relationships/utils';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n, type TranslationKey } from '@/utils/i18n';

type PaymentRequestSearchFilters = {
  category: string;
  createdByUserId: string;
  maximumAmountText: string;
  minimumAmountText: string;
  status: PaymentRequestStatusFilter;
};

const INITIAL_PAYMENT_REQUEST_SEARCH_FILTERS: PaymentRequestSearchFilters = {
  category: '',
  createdByUserId: 'all',
  maximumAmountText: '',
  minimumAmountText: '',
  status: 'all',
};

function hasInvalidAmountFilter(filters: PaymentRequestSearchFilters) {
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

function statusLabel(status: PaymentRequestStatus): TranslationKey {
  switch (status) {
    case 'approved':
      return 'paymentRequests.approved';
    case 'rejected':
      return 'paymentRequests.rejected';
    case 'cancelled':
      return 'paymentRequests.cancelled';
    case 'draft':
      return 'paymentRequests.draft';
    case 'pending_approval':
      return 'paymentRequests.submitted';
  }
}

function RelationshipSetup({ displayName }: { displayName?: string }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const mutation = useCreateRelationshipMutation();

  return (
    <ThemeAwareCardSurface
      backgroundImage={CARD_ARTWORK.relationships}
      borderRadius="$sm"
      p="$4"
    >
      <VStack space="md">
        <ThemeAwareHeading>
          {t('paymentRequests.createRelationship')}
        </ThemeAwareHeading>
        <ThemeAwareText>{t('paymentRequests.noRelationship')}</ThemeAwareText>
        <ThemeAwareInput
          value={name}
          onChangeText={setName}
          inputFieldProps={{
            placeholder: t('paymentRequests.relationshipName'),
          }}
        />
        <ThemeAwareButton
          isDisabled={mutation.isPending || name.trim().length === 0}
          onPress={() => mutation.mutate({ name, displayName })}
        >
          {t('paymentRequests.save')}
        </ThemeAwareButton>
        {mutation.error ? (
          <ThemeAwareText>{mutation.error.message}</ThemeAwareText>
        ) : null}
      </VStack>
    </ThemeAwareCardSurface>
  );
}

function RequestStatusBadge({ status }: { status: PaymentRequestStatus }) {
  const { t } = useI18n();
  const colors = {
    draft: {
      lightBackground: '$coolGray100',
      darkBackground: '$backgroundDark800',
      lightTextColor: '$coolGray700',
      darkTextColor: '$textDark50',
    },
    pending_approval: {
      lightBackground: '$warning100',
      darkBackground: '$warning900',
      lightTextColor: '$warning800',
      darkTextColor: '$warning100',
    },
    approved: {
      lightBackground: '$success100',
      darkBackground: '$success900',
      lightTextColor: '$success800',
      darkTextColor: '$success100',
    },
    rejected: {
      lightBackground: '$error100',
      darkBackground: '$error900',
      lightTextColor: '$error800',
      darkTextColor: '$error100',
    },
    cancelled: {
      lightBackground: '$coolGray100',
      darkBackground: '$backgroundDark800',
      lightTextColor: '$coolGray700',
      darkTextColor: '$textDark50',
    },
  }[status];

  return (
    <ThemeAwareBadge
      darkBackground={colors.darkBackground}
      darkTextColor={colors.darkTextColor}
      lightBackground={colors.lightBackground}
      lightTextColor={colors.lightTextColor}
    >
      {t(statusLabel(status))}
    </ThemeAwareBadge>
  );
}

function PaymentRequestRow({
  request,
  onPress,
}: {
  request: PaymentRequestSummary;
  onPress: () => void;
}) {
  const { locale } = useI18n();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityRole="button"
      onPress={onPress}
    >
      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.budgeting}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="sm">
          <HStack space="sm" className="items-center justify-between">
            <ThemeAwareText flex={1} fontWeight="$semibold" numberOfLines={2}>
              {request.title}
            </ThemeAwareText>
            <RequestStatusBadge status={request.status} />
          </HStack>
          {request.categories.length > 0 ? (
            <HStack space="sm" className="items-center flex-wrap">
              {request.categories.map((category, index) => (
                <ThemeAwareBadge key={`${category}-${index}`}>
                  {category}
                </ThemeAwareBadge>
              ))}
            </HStack>
          ) : null}
          <HStack space="sm" className="items-center justify-between">
            <ThemeAwareText
              flex={1}
              fontWeight="$bold"
              numberOfLines={1}
              size="lg"
            >
              {`${(request.amountMinorUnits / 100).toFixed(2)} ${request.currency}`}
            </ThemeAwareText>
            <ThemeAwareText
              flexShrink={0}
              numberOfLines={1}
              opacity={0.75}
              size="sm"
            >
              {new Date(request.purchaseDate).toLocaleDateString(locale)}
            </ThemeAwareText>
          </HStack>
        </VStack>
      </ThemeAwareCardSurface>
    </TouchableOpacity>
  );
}

export default function PaymentRequestsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const { isAuthenticated, user } = useOAuth2Auth();
  const displayName = getDisplayNameFromClaims(user?.claims ?? {});
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
  const requestsQuery = usePaymentRequestsInfiniteQuery(
    relationshipId,
    Boolean(user?.subject),
  );
  const requests =
    requestsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const sortOptions: ThemeAwareSearchSortOption<PaymentRequestSummary>[] = [
    {
      label: t('paymentRequests.purchaseDate'),
      value: 'date',
      getValue: (request) => request.purchaseDate,
    },
    {
      label: t('paymentRequests.requestTitle'),
      value: 'name',
      getValue: (request) => request.title,
    },
    {
      label: t('paymentRequests.categories'),
      value: 'categories',
      getValue: (request) => getAlphabeticalSortValue(request.categories),
    },
    {
      label: t('paymentRequests.amountMinorUnits'),
      value: 'amount',
      getValue: (request) => request.amountMinorUnits,
    },
  ];
  const sortConfig: ThemeAwareSearchSortConfig<PaymentRequestSummary> = {
    field: {
      label: t('paymentRequests.sortBy'),
      initialValue: 'date',
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
    title: t('paymentRequests.viewAllRequests'),
  };

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <VStack space="md">
          <ThemeAwareButton
            onPress={() => router.navigate(AppRoutePaths.account)}
          >
            {t('paymentRequests.signIn')}
          </ThemeAwareButton>
        </VStack>
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
        <ThemeAwareText>{t('paymentRequests.error')}</ThemeAwareText>
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

  if (
    !relationshipId &&
    (relationships === undefined || relationshipsQuery.isFetching) &&
    (relationshipsQuery.isLoading || relationshipsQuery.isFetching)
  ) {
    return (
      <ThemeAwareScreen fillAvailableSpace>
        <Stack.Screen options={screenOptions} />
        <PaymentRequestListSkeleton />
      </ThemeAwareScreen>
    );
  }

  if (relationships?.length === 0 && !relationshipId) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <RelationshipSetup displayName={displayName} />
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
    <>
      <ThemeAwareSearch<PaymentRequestSummary, PaymentRequestSearchFilters>
        items={requests}
        controlsPresentation="modal"
        initialFilters={INITIAL_PAYMENT_REQUEST_SEARCH_FILTERS}
        filterItems={(items, { filters, search }) => {
          const minimumAmount = parseAmountFilter(filters.minimumAmountText);
          const maximumAmount = parseAmountFilter(filters.maximumAmountText);

          return filterPaymentRequests([...items], {
            search,
            category: filters.category,
            status: filters.status,
            createdByUserId:
              filters.createdByUserId === 'all'
                ? undefined
                : filters.createdByUserId,
            minimumAmountMinorUnits: minimumAmount,
            maximumAmountMinorUnits: maximumAmount,
          });
        }}
        isFilterStateValid={({ filters }) => !hasInvalidAmountFilter(filters)}
        loadMoreWhileFiltered={{
          fetchNextPage: requestsQuery.fetchNextPage,
          hasNextPage: requestsQuery.hasNextPage,
          isFetchingNextPage: requestsQuery.isFetchingNextPage,
          isFetchNextPageError: requestsQuery.isFetchNextPageError,
        }}
        search={{
          label: t('paymentRequests.filterByName'),
          placeholder: t('paymentRequests.filterByNamePlaceholder'),
          inputFieldProps: {
            autoCapitalize: 'none',
            returnKeyType: 'search',
          },
        }}
        filterRows={[
          {
            id: 'amount-range',
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
            id: 'amount-filter-error',
            message: t('paymentRequests.amountFilterInvalid'),
            showWhen: ({ filters }) => hasInvalidAmountFilter(filters),
            textProps: { color: '$error600', size: 'sm' },
          },
          {
            id: 'category',
            fields: [
              {
                type: 'input',
                filterKey: 'category',
                label: t('paymentRequests.filterByCategory'),
                inputFieldProps: {
                  autoCapitalize: 'none',
                  placeholder: t('paymentRequests.filterByCategoryPlaceholder'),
                  returnKeyType: 'search',
                },
              },
            ],
          },
          {
            id: 'status',
            fields: [
              {
                type: 'dropdown',
                filterKey: 'status',
                label: t('paymentRequests.filterByStatus'),
                placeholder: t('paymentRequests.allStatuses'),
                options: [
                  {
                    label: t('paymentRequests.allStatuses'),
                    value: 'all',
                  },
                  { label: t('paymentRequests.draft'), value: 'draft' },
                  {
                    label: t('paymentRequests.submitted'),
                    value: 'pending_approval',
                  },
                  {
                    label: t('paymentRequests.approved'),
                    value: 'approved',
                  },
                  {
                    label: t('paymentRequests.rejected'),
                    value: 'rejected',
                  },
                  {
                    label: t('paymentRequests.cancelled'),
                    value: 'cancelled',
                  },
                ],
              },
            ],
          },
          {
            id: 'creator',
            fields: [
              {
                type: 'dropdown',
                filterKey: 'createdByUserId',
                label: t('paymentRequests.filterByCreator'),
                placeholder: t('paymentRequests.allCreators'),
                options: [
                  {
                    label: t('paymentRequests.allCreators'),
                    value: 'all',
                  },
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
        ]}
        sort={sortConfig}
        clearFilters={{
          label: t('paymentRequests.clearFilters'),
          variant: 'link',
        }}
      >
        {({
          items: sortedRequests,
          searchControls,
          hasActiveFilters,
          isFilterStateValid,
        }) => {
          const hasUnloadedFilteredResults =
            hasActiveFilters &&
            isFilterStateValid &&
            sortedRequests.length === 0 &&
            requestsQuery.hasNextPage &&
            !requestsQuery.isFetchNextPageError;
          const listEmptyComponent =
            requestsQuery.error && requests.length === 0 ? (
              <ThemeAwareText>{t('paymentRequests.error')}</ThemeAwareText>
            ) : hasUnloadedFilteredResults ? null : requests.length === 0 ? (
              <ThemeAwareText>{t('paymentRequests.empty')}</ThemeAwareText>
            ) : (
              <ThemeAwareText>
                {t('paymentRequests.noFilteredRequests')}
              </ThemeAwareText>
            );
          const listFooterComponent = requestsQuery.isFetchNextPageError ? (
            <VStack space="sm" className="px-4 pb-2">
              <ThemeAwareText>{t('paymentRequests.error')}</ThemeAwareText>
              <ThemeAwareButton
                isDisabled={requestsQuery.isFetchingNextPage}
                onPress={() => {
                  requestsQuery.fetchNextPage();
                }}
              >
                {t('paymentRequests.retry')}
              </ThemeAwareButton>
            </VStack>
          ) : null;

          return (
            <ThemeAwareInfiniteScrollList<PaymentRequestSummary>
              data={sortedRequests}
              fixedHeaderContent={searchControls}
              detailNavigation={{
                source: DetailNavigationSources.paymentRequests,
                hrefForId: (id) => ({
                  pathname: AppRoutePaths.paymentRequestDetails,
                  params: {
                    id,
                    detailNavigationSource:
                      DetailNavigationSources.paymentRequests,
                  },
                }),
                pageKey: requestsQuery.data?.pages.length ?? 0,
                isFetching: requestsQuery.isFetching,
                errorMessage: requestsQuery.error?.message,
              }}
              fetchNextPage={requestsQuery.fetchNextPage}
              hasNextPage={requestsQuery.hasNextPage}
              isLoading={requestsQuery.isLoading}
              isFetchNextPageError={requestsQuery.isFetchNextPageError}
              isFetchingNextPage={requestsQuery.isFetchingNextPage}
              onRefresh={requestsQuery.refetch}
              refreshing={requestsQuery.isRefetching}
              keyExtractor={(request) => request.id}
              ListEmptyComponent={listEmptyComponent}
              ListFooterComponent={listFooterComponent}
              loadingSpinner={<PaymentRequestListSkeleton />}
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
              renderItem={({ item: request }) => (
                <VStack className="pb-2">
                  <PaymentRequestRow
                    request={request}
                    onPress={() =>
                      router.navigate({
                        pathname: AppRoutePaths.paymentRequestDetails,
                        params: {
                          id: request.id,
                          detailNavigationSource:
                            DetailNavigationSources.paymentRequests,
                        },
                      })
                    }
                  />
                </VStack>
              )}
            >
              <Stack.Screen
                options={{
                  ...screenOptions,
                  headerRight: () => (
                    <View
                      style={{ alignItems: 'center', flexDirection: 'row' }}
                    >
                      <TouchableOpacity
                        accessibilityLabel={t('paymentRequests.showCalendar')}
                        accessibilityRole="button"
                        hitSlop={10}
                        onPress={() => setIsCalendarVisible(true)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                      >
                        <FontAwesome
                          color={COLORS[colorScheme].text}
                          name="calendar"
                          size={20}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityLabel={t('paymentRequests.createRequest')}
                        accessibilityRole="button"
                        hitSlop={10}
                        onPress={() => router.push(AppRoutePaths.createRequest)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                      >
                        <FontAwesome
                          color={COLORS[colorScheme].text}
                          name="plus"
                          size={20}
                        />
                      </TouchableOpacity>
                    </View>
                  ),
                }}
              />
              {relationshipsQuery.error ? (
                <VStack space="sm">
                  <ThemeAwareText color="$error600">
                    {t('paymentRequests.error')}
                  </ThemeAwareText>
                  <ThemeAwareButton
                    variant="outline"
                    isDisabled={relationshipsQuery.isFetching}
                    onPress={() => relationshipsQuery.refetch()}
                  >
                    {t('paymentRequests.retry')}
                  </ThemeAwareButton>
                </VStack>
              ) : null}
              <VStack space="md">
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityLabel={t('paymentRequests.awaitingDecision')}
                  accessibilityRole="link"
                  onPress={() =>
                    router.navigate(AppRoutePaths.awaitingDecision)
                  }
                >
                  <ThemeAwareText
                    color={COLORS[colorScheme].tint}
                    size="sm"
                    textDecorationLine="underline"
                  >
                    {t('paymentRequests.awaitingDecision')}
                  </ThemeAwareText>
                </TouchableOpacity>
              </VStack>
            </ThemeAwareInfiniteScrollList>
          );
        }}
      </ThemeAwareSearch>
      <PaymentRequestCalendarModal
        isVisible={isCalendarVisible}
        onClose={() => setIsCalendarVisible(false)}
        relationshipId={relationshipId}
      />
    </>
  );
}
