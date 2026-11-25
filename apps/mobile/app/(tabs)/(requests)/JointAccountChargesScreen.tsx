import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  JointAccountCharge,
  JointAccountChargeListFilters,
  JointAccountChargeStatus,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInfiniteScrollList } from '@/components/ui/ThemeAwareInfiniteScrollList';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareSearch,
  type ThemeAwareSearchFilterState,
  type ThemeAwareSearchSortConfig,
  type ThemeAwareSearchSortOption,
} from '@/components/ui/ThemeAwareSearch';
import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { JointAccountChargeCalendarModal } from '@/features/joint-account-charges/components/JointAccountChargeCalendarModal';
import { JointAccountChargeListSkeleton } from '@/features/joint-account-charges/components/JointAccountChargeListSkeleton';
import {
  useJointAccountChargesInfiniteQuery,
  useMarkAllJointAccountChargesPaidMutation,
} from '@/features/joint-account-charges/hooks/useJointAccountCharges';
import { parseAmountFilter } from '@/features/payment-requests/filters';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';
import { formatMinorUnits } from '@/utils/money';

type ChargeStatusFilter = JointAccountChargeStatus | 'all';

type JointAccountChargeSearchFilters = {
  createdByUserId: string;
  fromDate: Date | null;
  maximumAmountText: string;
  minimumAmountText: string;
  status: ChargeStatusFilter;
  toDate: Date | null;
};

const INITIAL_JOINT_ACCOUNT_CHARGE_SEARCH_FILTERS: JointAccountChargeSearchFilters =
  {
    createdByUserId: 'all',
    fromDate: null,
    maximumAmountText: '',
    minimumAmountText: '',
    status: 'unpaid',
    toDate: null,
  };

function formatLocalDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateBound(date: Date, endOfDay: boolean) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ).toISOString();
}

function hasInvalidAmountRange(
  minimumAmountText: string,
  maximumAmountText: string,
) {
  const minimumAmount = parseAmountFilter(minimumAmountText);
  const maximumAmount = parseAmountFilter(maximumAmountText);

  return (
    minimumAmount === null ||
    maximumAmount === null ||
    (minimumAmount !== undefined &&
      maximumAmount !== undefined &&
      minimumAmount > maximumAmount) ||
    (minimumAmount !== undefined && minimumAmount > 2_147_483_647) ||
    (maximumAmount !== undefined && maximumAmount > 2_147_483_647)
  );
}

function hasInvalidDateRange(fromDate: Date | null, toDate: Date | null) {
  return (
    fromDate !== null &&
    toDate !== null &&
    formatLocalDate(fromDate) > formatLocalDate(toDate)
  );
}

function ChargeStatusBadge({ status }: { status: JointAccountChargeStatus }) {
  const { t } = useI18n();
  const isPaid = status === 'paid';

  return (
    <ThemeAwareBadge
      darkBackground={isPaid ? '$success900' : '$warning900'}
      darkTextColor={isPaid ? '$success100' : '$warning100'}
      lightBackground={isPaid ? '$success100' : '$warning100'}
      lightTextColor={isPaid ? '$success800' : '$warning800'}
    >
      {t(isPaid ? 'jointAccountCharges.paid' : 'jointAccountCharges.unpaid')}
    </ThemeAwareBadge>
  );
}

function ChargeRow({
  charge,
  creatorName,
  onPress,
}: {
  charge: JointAccountCharge;
  creatorName: string;
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
          <HStack space="sm" className="items-start justify-between">
            <ThemeAwareText flex={1} fontWeight="$semibold" numberOfLines={2}>
              {charge.name}
            </ThemeAwareText>
            <ChargeStatusBadge status={charge.status} />
          </HStack>
          <ThemeAwareText fontWeight="$bold" size="lg">
            {formatMinorUnits(charge.amountMinorUnits)}
          </ThemeAwareText>
          <HStack space="sm" className="justify-between">
            <ThemeAwareText opacity={0.75} size="sm">
              {new Date(charge.chargeDate).toLocaleDateString(locale)}
            </ThemeAwareText>
            <ThemeAwareText flex={1} opacity={0.75} size="sm" textAlign="right">
              {creatorName}
            </ThemeAwareText>
          </HStack>
        </VStack>
      </ThemeAwareCardSurface>
    </TouchableOpacity>
  );
}

export default function JointAccountChargesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isBulkPaidConfirmationVisible, setIsBulkPaidConfirmationVisible] =
    useState(false);
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );
  const canUsePersistedRelationshipId =
    relationshipsQuery.data === undefined ||
    relationshipsQuery.isFetching ||
    Boolean(relationshipsQuery.error);
  const activeRelationshipId =
    relationship?.id ??
    (canUsePersistedRelationshipId
      ? selectedRelationshipId ?? undefined
      : undefined);
  const relationshipMembers = relationship?.members ?? [];
  const [searchFilterState, setSearchFilterState] = useState<
    ThemeAwareSearchFilterState<JointAccountChargeSearchFilters>
  >({
    search: '',
    filters: INITIAL_JOINT_ACCOUNT_CHARGE_SEARCH_FILTERS,
  });
  const { filters: searchFilters, search: name } = searchFilterState;
  const {
    createdByUserId,
    fromDate,
    maximumAmountText,
    minimumAmountText,
    status,
    toDate,
  } = searchFilters;
  const minimumAmount = parseAmountFilter(minimumAmountText);
  const maximumAmount = parseAmountFilter(maximumAmountText);
  const hasInvalidAmountFilter = hasInvalidAmountRange(
    minimumAmountText,
    maximumAmountText,
  );
  const hasInvalidDateFilter = hasInvalidDateRange(fromDate, toDate);
  const filters = useMemo<JointAccountChargeListFilters>(
    () => ({
      ...(name.trim() ? { name: name.trim() } : {}),
      ...(status === 'all' ? {} : { status }),
      ...(createdByUserId === 'all' ? {} : { createdByUserId }),
      ...(minimumAmount === undefined || minimumAmount === null
        ? {}
        : { minimumAmountMinorUnits: minimumAmount }),
      ...(maximumAmount === undefined || maximumAmount === null
        ? {}
        : { maximumAmountMinorUnits: maximumAmount }),
      ...(fromDate ? { fromDate: dateBound(fromDate, false) } : {}),
      ...(toDate ? { toDate: dateBound(toDate, true) } : {}),
    }),
    [
      createdByUserId,
      fromDate,
      maximumAmount,
      minimumAmount,
      name,
      status,
      toDate,
    ],
  );
  const chargesQuery = useJointAccountChargesInfiniteQuery(
    activeRelationshipId,
    filters,
    Boolean(user?.subject) && !hasInvalidAmountFilter && !hasInvalidDateFilter,
  );
  const markAllPaidMutation = useMarkAllJointAccountChargesPaidMutation();
  const charges = chargesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const unpaidSummary = chargesQuery.data?.pages[0]?.unpaidSummary;
  const listFooterComponent = chargesQuery.isFetchNextPageError ? (
    <ThemeAwareButton
      variant="outline"
      isDisabled={chargesQuery.isFetching}
      onPress={() => chargesQuery.fetchNextPage()}
    >
      {t('paymentRequests.retry')}
    </ThemeAwareButton>
  ) : null;

  const screenOptions = {
    title: t('jointAccountCharges.title'),
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

  if (relationshipsQuery.error && !activeRelationshipId) {
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

  if (
    !activeRelationshipId &&
    (relationshipsQuery.isLoading || relationshipsQuery.isFetching)
  ) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.data?.length === 0 && !activeRelationshipId) {
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

  if (!activeRelationshipId) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <VStack space="md">
          <ThemeAwareText>
            {t('jointAccountCharges.noRelationshipSelected')}
          </ThemeAwareText>
          <ThemeAwareButton onPress={() => router.navigate(AppRoutePaths.home)}>
            {t('home.selectActiveRelationship')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  const sortOptions: ThemeAwareSearchSortOption<JointAccountCharge>[] = [
    {
      label: t('jointAccountCharges.chargeDate'),
      value: 'chargeDate',
      getValue: (charge) => charge.chargeDate,
    },
    {
      label: t('jointAccountCharges.name'),
      value: 'name',
      getValue: (charge) => charge.name,
    },
    {
      label: t('jointAccountCharges.amount'),
      value: 'amount',
      getValue: (charge) => charge.amountMinorUnits,
    },
    {
      label: t('jointAccountCharges.status'),
      value: 'status',
      getValue: (charge) => charge.status,
    },
    {
      label: t('jointAccountCharges.createdBy'),
      value: 'createdBy',
      getValue: (charge) =>
        getMemberDisplayName(charge.createdByUserId, relationshipMembers),
    },
  ];
  const sortConfig: ThemeAwareSearchSortConfig<JointAccountCharge> = {
    field: {
      initialValue: 'chargeDate',
      label: t('paymentRequests.sortBy'),
      options: sortOptions,
      placeholder: t('paymentRequests.sortBy'),
    },
    order: {
      initialValue: 'descending',
      label: t('paymentRequests.sortOrder'),
      options: [
        { label: t('paymentRequests.ascending'), value: 'ascending' },
        { label: t('paymentRequests.descending'), value: 'descending' },
      ],
      placeholder: t('paymentRequests.sortOrder'),
    },
    tieBreaker: (left, right, order) =>
      left.id.localeCompare(right.id) * (order === 'descending' ? -1 : 1),
  };

  return (
    <>
      <ThemeAwareSearch<JointAccountCharge, JointAccountChargeSearchFilters>
        items={charges}
        controlsPresentation="modal"
        initialFilters={INITIAL_JOINT_ACCOUNT_CHARGE_SEARCH_FILTERS}
        onFilterStateChange={setSearchFilterState}
        filterItems={(items) => items}
        isFilterStateValid={({ filters }) =>
          !hasInvalidAmountRange(
            filters.minimumAmountText,
            filters.maximumAmountText,
          ) && !hasInvalidDateRange(filters.fromDate, filters.toDate)
        }
        search={{
          label: t('jointAccountCharges.filterByName'),
          placeholder: t('jointAccountCharges.filterByNamePlaceholder'),
          inputFieldProps: {
            autoCapitalize: 'none',
            maxLength: 160,
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
                label: t('jointAccountCharges.minimumAmount'),
                inputFieldProps: {
                  keyboardType: 'decimal-pad',
                  placeholder: t('jointAccountCharges.amountPlaceholder'),
                },
              },
              {
                type: 'input',
                filterKey: 'maximumAmountText',
                label: t('jointAccountCharges.maximumAmount'),
                inputFieldProps: {
                  keyboardType: 'decimal-pad',
                  placeholder: t('jointAccountCharges.amountPlaceholder'),
                },
              },
            ],
          },
          {
            id: 'amount-filter-error',
            message: t('jointAccountCharges.amountFilterInvalid'),
            showWhen: ({ filters }) =>
              hasInvalidAmountRange(
                filters.minimumAmountText,
                filters.maximumAmountText,
              ),
            textProps: { color: '$error600', size: 'sm' },
          },
          {
            id: 'date-range',
            fields: [
              {
                type: 'date',
                filterKey: 'fromDate',
                label: t('jointAccountCharges.fromDate'),
                accessibilityLabel: t('jointAccountCharges.fromDate'),
                clearable: true,
              },
              {
                type: 'date',
                filterKey: 'toDate',
                label: t('jointAccountCharges.toDate'),
                accessibilityLabel: t('jointAccountCharges.toDate'),
                clearable: true,
              },
            ],
          },
          {
            id: 'date-filter-error',
            message: t('jointAccountCharges.dateFilterInvalid'),
            showWhen: ({ filters }) =>
              hasInvalidDateRange(filters.fromDate, filters.toDate),
            textProps: { color: '$error600', size: 'sm' },
          },
          {
            id: 'status',
            fields: [
              {
                type: 'dropdown',
                filterKey: 'status',
                label: t('jointAccountCharges.filterByStatus'),
                placeholder: t('jointAccountCharges.allStatuses'),
                options: [
                  {
                    label: t('jointAccountCharges.allStatuses'),
                    value: 'all',
                  },
                  {
                    label: t('jointAccountCharges.unpaid'),
                    value: 'unpaid',
                  },
                  {
                    label: t('jointAccountCharges.paid'),
                    value: 'paid',
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
                label: t('jointAccountCharges.filterByCreator'),
                placeholder: t('jointAccountCharges.allCreators'),
                options: [
                  {
                    label: t('jointAccountCharges.allCreators'),
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
          label: t('jointAccountCharges.clearFilters'),
          variant: 'link',
        }}
      >
        {({ items: sortedCharges, searchControls, hasActiveFilters }) => {
          const listEmptyComponent = chargesQuery.isError ? (
            <VStack space="sm">
              <ThemeAwareText>{t('jointAccountCharges.error')}</ThemeAwareText>
              <ThemeAwareButton
                variant="outline"
                isDisabled={chargesQuery.isFetching}
                onPress={() => chargesQuery.refetch()}
              >
                {t('paymentRequests.retry')}
              </ThemeAwareButton>
            </VStack>
          ) : (
            <ThemeAwareText>
              {hasActiveFilters
                ? t('jointAccountCharges.noFilteredCharges')
                : t('jointAccountCharges.empty')}
            </ThemeAwareText>
          );

          return (
            <ThemeAwareInfiniteScrollList<JointAccountCharge>
              data={sortedCharges}
              fixedHeaderContent={
                <VStack space="sm">
                  {relationshipsQuery.error ? (
                    <VStack space="sm">
                      <ThemeAwareText>
                        {t('jointAccountCharges.error')}
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
                  {unpaidSummary ? (
                    <ThemeAwareSurface
                      borderRadius="$sm"
                      borderWidth="$1"
                      p="$3"
                    >
                      <VStack space="sm">
                        <HStack
                          space="sm"
                          className="items-center justify-between"
                        >
                          <ThemeAwareText opacity={0.75} size="sm">
                            {t('jointAccountCharges.totalOwed')}
                          </ThemeAwareText>
                          <ThemeAwareText fontWeight="$bold" size="lg">
                            {formatMinorUnits(
                              unpaidSummary.totalAmountMinorUnits,
                            )}
                          </ThemeAwareText>
                        </HStack>
                        {unpaidSummary.currentUserChargeCount > 0 ? (
                          <ThemeAwareButton
                            isDisabled={markAllPaidMutation.isPending}
                            onPress={() => {
                              markAllPaidMutation.reset();
                              setIsBulkPaidConfirmationVisible(true);
                            }}
                            variant="outline"
                          >
                            {t('jointAccountCharges.markAllPaid')}
                          </ThemeAwareButton>
                        ) : null}
                      </VStack>
                    </ThemeAwareSurface>
                  ) : chargesQuery.isLoading ? (
                    <ThemeAwareSurface
                      borderRadius="$sm"
                      borderWidth="$1"
                      p="$3"
                      testID="joint-account-charge-total-placeholder"
                    >
                      <HStack
                        space="sm"
                        className="items-center justify-between"
                      >
                        <ThemeAwareText opacity={0.75} size="sm">
                          {t('jointAccountCharges.totalOwed')}
                        </ThemeAwareText>
                        <ThemeAwareSkeleton
                          height={22}
                          shape="text"
                          width={84}
                        />
                      </HStack>
                    </ThemeAwareSurface>
                  ) : null}
                  {searchControls}
                </VStack>
              }
              detailNavigation={{
                source: DetailNavigationSources.jointAccountCharges,
                hrefForId: (id) => ({
                  pathname: AppRoutePaths.jointAccountChargeDetails,
                  params: {
                    id,
                    detailNavigationSource:
                      DetailNavigationSources.jointAccountCharges,
                  },
                }),
                pageKey: chargesQuery.data?.pages.length ?? 0,
                isFetching: chargesQuery.isFetching,
                errorMessage: chargesQuery.error?.message,
              }}
              fetchNextPage={() =>
                chargesQuery.isFetching
                  ? undefined
                  : chargesQuery.fetchNextPage()
              }
              hasNextPage={chargesQuery.hasNextPage}
              isLoading={chargesQuery.isLoading}
              isFetchNextPageError={chargesQuery.isFetchNextPageError}
              isFetchingNextPage={chargesQuery.isFetchingNextPage}
              onRefresh={chargesQuery.refetch}
              refreshing={chargesQuery.isRefetching}
              keyExtractor={(charge) => charge.id}
              ListEmptyComponent={listEmptyComponent}
              ListFooterComponent={listFooterComponent}
              loadingSpinner={<JointAccountChargeListSkeleton />}
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
                  <ChargeRow
                    charge={item}
                    creatorName={getMemberDisplayName(
                      item.createdByUserId,
                      relationshipMembers,
                    )}
                    onPress={() =>
                      router.navigate({
                        pathname: AppRoutePaths.jointAccountChargeDetails,
                        params: {
                          id: item.id,
                          detailNavigationSource:
                            DetailNavigationSources.jointAccountCharges,
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
                        accessibilityLabel={t(
                          'jointAccountCharges.showCalendar',
                        )}
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
                        accessibilityLabel={t('jointAccountCharges.create')}
                        accessibilityRole="button"
                        hitSlop={10}
                        onPress={() =>
                          router.push(AppRoutePaths.createJointAccountCharge)
                        }
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
            </ThemeAwareInfiniteScrollList>
          );
        }}
      </ThemeAwareSearch>
      <ThemedModal
        isVisible={isBulkPaidConfirmationVisible}
        title={t('jointAccountCharges.markAllPaidTitle')}
        closeOnOverlayClick={!markAllPaidMutation.isPending}
        onClose={() => {
          if (!markAllPaidMutation.isPending) {
            setIsBulkPaidConfirmationVisible(false);
          }
        }}
        cancelButton={{
          action: 'secondary',
          isEnabled: !markAllPaidMutation.isPending,
          text: t('common.cancel'),
        }}
        confirmButton={{
          isEnabled: !markAllPaidMutation.isPending,
          onPress: () => {
            markAllPaidMutation.mutate(activeRelationshipId, {
              onSuccess: () => setIsBulkPaidConfirmationVisible(false),
            });
          },
          text: t('jointAccountCharges.markAllPaidConfirm'),
        }}
      >
        <VStack space="sm">
          <ThemeAwareText>
            {t('jointAccountCharges.markAllPaidConfirmation')}
          </ThemeAwareText>
          {markAllPaidMutation.error ? (
            <ThemeAwareText color="$error600">
              {markAllPaidMutation.error.message}
            </ThemeAwareText>
          ) : null}
        </VStack>
      </ThemedModal>
      {relationship ? (
        <JointAccountChargeCalendarModal
          isVisible={isCalendarVisible}
          onClose={() => setIsCalendarVisible(false)}
          relationship={relationship}
        />
      ) : null}
    </>
  );
}
