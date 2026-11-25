import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  MeTime,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInfiniteScrollList } from '@/components/ui/ThemeAwareInfiniteScrollList';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSearch } from '@/components/ui/ThemeAwareSearch';
import type {
  ThemeAwareSearchSortConfig,
  ThemeAwareSearchSortOption,
} from '@/components/ui/ThemeAwareSearch';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { resolveSelectedRelationship } from '@/features/relationships/utils';
import { MeTimeCalendarModal } from '@/features/time/components/MeTimeCalendarModal';
import { MeTimeListSkeleton } from '@/features/time/components/MeTimeListSkeleton';
import {
  filterMeTime,
  getMeTimeCreatedByDisplayName,
  hasInvalidMeTimeDateTimeFilters,
  type MeTimeDateTimeFilters,
} from '@/features/time/filters';
import {
  useMeTimeCalendarQuery,
  useMeTimeInfiniteQuery,
} from '@/features/time/hooks/useTime';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { getCurrentCalendarMonthId } from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';

const INITIAL_ME_TIME_FILTERS: MeTimeDateTimeFilters = {
  fromStartTime: null,
  toStartTime: null,
};

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

function formatDuration(durationMs: number, locale: string) {
  const totalMinutes = Math.round(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourFormatter = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'hour',
    unitDisplay: 'short',
  });
  const minuteFormatter = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'short',
  });
  const parts: string[] = [];

  if (hours > 0) parts.push(hourFormatter.format(hours));
  if (minutes > 0 || hours === 0) parts.push(minuteFormatter.format(minutes));

  return parts.join(' ');
}

function MeTimeRow({
  entry,
  members,
  locale,
  onPress,
}: {
  entry: MeTime;
  members: RelationshipSummary['members'];
  locale: string;
  onPress: () => void;
}) {
  const { t } = useI18n();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityLabel={entry.description || t('time.meTimeDetails')}
      accessibilityRole="button"
      onPress={onPress}
    >
      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.personalTime}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="xs">
          {entry.description ? (
            <ThemeAwareText fontWeight="$semibold">
              {entry.description}
            </ThemeAwareText>
          ) : null}
          <ThemeAwareText size="sm">
            {`${t('time.startTime')}: ${formatDateTime(entry.startTime, locale)}`}
          </ThemeAwareText>
          <ThemeAwareText size="sm">
            {`${t('time.endTime')}: ${formatDateTime(entry.endTime, locale)}`}
          </ThemeAwareText>
          <ThemeAwareText opacity={0.75} size="sm">
            {`${t('time.createdBy')}: ${getMeTimeCreatedByDisplayName(
              entry,
              members,
            )}`}
          </ThemeAwareText>
        </VStack>
      </ThemeAwareCardSurface>
    </TouchableOpacity>
  );
}

function renderScreenMessage(title: string, message: string) {
  return (
    <ThemeAwareScreen>
      <Stack.Screen options={{ title }} />
      <ThemeAwareText>{message}</ThemeAwareText>
    </ThemeAwareScreen>
  );
}

export default function ViewAllMeTimeScreen() {
  const { locale, t } = useI18n();
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
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
  const entriesQuery = useMeTimeInfiniteQuery(
    relationshipId,
    Boolean(user?.subject),
  );
  const currentMonth = getCurrentCalendarMonthId().slice(0, 7);
  const currentMonthQuery = useMeTimeCalendarQuery(
    relationshipId,
    currentMonth,
    Boolean(user?.subject),
  );
  const currentMonthDurationMs = currentMonthQuery.data?.entries
    .filter((entry) => entry.createdByUserId === user?.subject)
    .reduce(
      (total, entry) =>
        total + Date.parse(entry.endTime) - Date.parse(entry.startTime),
      0,
    );
  const entries = entriesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const sortOptions: ThemeAwareSearchSortOption<MeTime>[] = [
    {
      label: t('time.startTime'),
      value: 'startTime',
      getValue: (entry) => entry.startTime,
    },
    {
      label: t('time.createdBy'),
      value: 'createdBy',
      getValue: (entry) =>
        getMeTimeCreatedByDisplayName(entry, relationshipMembers),
    },
  ];
  const sortConfig: ThemeAwareSearchSortConfig<MeTime> = {
    field: {
      label: t('paymentRequests.sortBy'),
      initialValue: 'startTime',
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
    title: t('time.viewAllMeTime'),
    headerRight: () => (
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        {relationshipId ? (
          <TouchableOpacity
            accessibilityLabel={t('time.showMeTimeCalendar')}
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
        ) : null}
        <TouchableOpacity
          accessibilityLabel={t('time.createMeTime')}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.push(AppRoutePaths.createMeTime)}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <FontAwesome color={COLORS[colorScheme].text} name="plus" size={20} />
        </TouchableOpacity>
      </View>
    ),
  };
  const listFooterComponent = entriesQuery.isFetchNextPageError ? (
    <VStack space="sm" className="px-4 pb-4">
      <ThemeAwareText color="$error600">
        {entriesQuery.error?.message ?? t('time.loadMoreMeTimeError')}
      </ThemeAwareText>
      <ThemeAwareButton
        isDisabled={entriesQuery.isFetchingNextPage}
        onPress={() => {
          entriesQuery.fetchNextPage().catch(() => undefined);
        }}
        variant="outline"
      >
        {t('home.retry')}
      </ThemeAwareButton>
    </VStack>
  ) : undefined;

  if (!isAuthenticated) {
    return renderScreenMessage(
      t('time.viewAllMeTime'),
      t('paymentRequests.signIn'),
    );
  }

  if (!user?.subject) {
    return renderScreenMessage(
      t('time.viewAllMeTime'),
      t('auth.profileUnavailable'),
    );
  }

  if (relationshipsQuery.error && !relationshipId) {
    return renderScreenMessage(
      t('time.viewAllMeTime'),
      relationshipsQuery.error.message,
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
        <MeTimeListSkeleton />
      </ThemeAwareScreen>
    );
  }

  if (relationships?.length === 0 && !relationshipId) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <VStack space="md">
          <ThemeAwareText>{t('time.noRelationship')}</ThemeAwareText>
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
    <>
      <ThemeAwareSearch<MeTime, MeTimeDateTimeFilters>
        items={entries}
        controlsPresentation="modal"
        initialFilters={INITIAL_ME_TIME_FILTERS}
        filterItems={(items, { filters, search }) =>
          filterMeTime(items, search, relationshipMembers, filters)
        }
        filterRows={[
          {
            id: 'start-time-range',
            fields: [
              {
                type: 'date',
                filterKey: 'fromStartTime',
                label: t('time.filterStartTimeFrom'),
                accessibilityLabel: t('time.filterStartTimeFrom'),
                mode: 'datetime',
                clearable: true,
              },
              {
                type: 'date',
                filterKey: 'toStartTime',
                label: t('time.filterStartTimeTo'),
                accessibilityLabel: t('time.filterStartTimeTo'),
                mode: 'datetime',
                clearable: true,
              },
            ],
          },
          {
            id: 'date-time-filter-error',
            message: t('time.dateTimeFilterInvalid'),
            showWhen: ({ filters }) => hasInvalidMeTimeDateTimeFilters(filters),
            textProps: { color: '$error600', size: 'sm' },
          },
        ]}
        isFilterStateValid={({ filters }) =>
          !hasInvalidMeTimeDateTimeFilters(filters)
        }
        loadMoreWhileFiltered={{
          fetchNextPage: entriesQuery.fetchNextPage,
          hasNextPage: entriesQuery.hasNextPage,
          isFetchingNextPage: entriesQuery.isFetchingNextPage,
          isFetchNextPageError: entriesQuery.isFetchNextPageError,
        }}
        search={{
          label: t('time.searchMeTime'),
          placeholder: t('time.searchMeTimePlaceholder'),
          inputFieldProps: {
            autoCapitalize: 'none',
            returnKeyType: 'search',
          },
        }}
        clearFilters={{
          label: t('time.clearFilters'),
          variant: 'link',
        }}
        sort={sortConfig}
      >
        {({
          items: filteredEntries,
          searchControls,
          hasActiveFilters,
          isFilterStateValid,
        }) => {
          const hasUnloadedFilteredResults =
            hasActiveFilters &&
            isFilterStateValid &&
            filteredEntries.length === 0 &&
            entriesQuery.hasNextPage &&
            !entriesQuery.isFetchNextPageError;
          const listEmptyComponent =
            entriesQuery.error && entries.length === 0 ? (
              <ThemeAwareText>
                {entriesQuery.error.message || t('time.meTimeError')}
              </ThemeAwareText>
            ) : hasUnloadedFilteredResults ? null : entries.length === 0 &&
              !hasActiveFilters ? (
              <ThemeAwareText>{t('time.emptyMeTime')}</ThemeAwareText>
            ) : (
              <ThemeAwareText>{t('time.noFilteredMeTime')}</ThemeAwareText>
            );

          return (
            <ThemeAwareInfiniteScrollList<MeTime>
              data={filteredEntries}
              fixedHeaderContent={
                <VStack space="sm">
                  <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$3">
                    <VStack space="xs">
                      <ThemeAwareText opacity={0.75} size="sm">
                        {t('time.totalMeTimeThisMonth')}
                      </ThemeAwareText>
                      {currentMonthDurationMs !== undefined ? (
                        <>
                          <ThemeAwareText fontWeight="$semibold" size="xl">
                            {formatDuration(currentMonthDurationMs, locale)}
                          </ThemeAwareText>
                          {currentMonthQuery.error ? (
                            <ThemeAwareText color="$error600" size="sm">
                              {currentMonthQuery.error.message ||
                                t('time.meTimeError')}
                            </ThemeAwareText>
                          ) : null}
                        </>
                      ) : currentMonthQuery.error ? (
                        <ThemeAwareText color="$error600" size="sm">
                          {currentMonthQuery.error.message ||
                            t('time.meTimeError')}
                        </ThemeAwareText>
                      ) : (
                        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
                      )}
                    </VStack>
                  </ThemeAwareSurface>
                  {searchControls}
                </VStack>
              }
              detailNavigation={{
                source: DetailNavigationSources.meTime,
                hrefForId: (id) => ({
                  pathname: AppRoutePaths.meTimeDetails,
                  params: {
                    id,
                    relationshipId,
                    detailNavigationSource: DetailNavigationSources.meTime,
                  },
                }),
                pageKey: entriesQuery.data?.pages.length ?? 0,
                isFetching: entriesQuery.isFetching,
                errorMessage: entriesQuery.error?.message,
              }}
              fetchNextPage={entriesQuery.fetchNextPage}
              hasNextPage={entriesQuery.hasNextPage}
              isLoading={entriesQuery.isLoading}
              isFetchNextPageError={entriesQuery.isFetchNextPageError}
              isFetchingNextPage={entriesQuery.isFetchingNextPage}
              onRefresh={entriesQuery.refetch}
              refreshing={entriesQuery.isRefetching}
              keyExtractor={(entry) => entry.id}
              ListEmptyComponent={listEmptyComponent}
              ListFooterComponent={listFooterComponent}
              loadingSpinner={<MeTimeListSkeleton />}
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
                  <MeTimeRow
                    entry={item}
                    locale={locale}
                    members={relationshipMembers}
                    onPress={() =>
                      router.navigate({
                        pathname: AppRoutePaths.meTimeDetails,
                        params: {
                          id: item.id,
                          relationshipId,
                          detailNavigationSource:
                            DetailNavigationSources.meTime,
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
                    {t('home.retry')}
                  </ThemeAwareButton>
                </VStack>
              ) : null}
            </ThemeAwareInfiniteScrollList>
          );
        }}
      </ThemeAwareSearch>
      <MeTimeCalendarModal
        isVisible={isCalendarVisible}
        onClose={() => setIsCalendarVisible(false)}
        relationshipId={relationshipId}
        members={relationshipMembers}
      />
    </>
  );
}
