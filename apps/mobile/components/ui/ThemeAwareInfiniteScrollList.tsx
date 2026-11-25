import type { FlashListProps } from '@shopify/flash-list';
import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';

import { DetailNavigationCollectionRegistration } from './DetailSwipeNavigator';
import {
  ThemeAwareScreen,
  type ThemeAwareScreenHeaderActions,
  type ThemeAwareScreenProps,
  type ThemeAwareScreenStickyHeader,
} from './ThemeAwareScreen';
import { ThemeAwareSurface } from './ThemeAwareSurface';
import { resolveLegacySpacing } from './legacyStyle';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { VStack } from '@/components/ui/vstack';
import { COLORS } from '@/constants/colors';
import { THEME_AWARE_CONTENT_HORIZONTAL_GUTTER } from '@/constants/layout';

type InfiniteScrollFlashListProps<ItemT> = Omit<
  FlashListProps<ItemT>,
  | 'data'
  | 'renderItem'
  | 'keyExtractor'
  | 'onEndReached'
  | 'onEndReachedThreshold'
  | 'onRefresh'
  | 'ListEmptyComponent'
  | 'ListFooterComponent'
  | 'ListHeaderComponent'
  | 'refreshing'
  | 'stickyHeaderIndices'
>;

export type ThemeAwareInfiniteScrollListHeaderActions =
  ThemeAwareScreenHeaderActions;

type ThemeAwareInfiniteScrollListHeader = ThemeAwareScreenStickyHeader;

export type ThemeAwareInfiniteScrollListDetailNavigation = {
  hrefForId: (id: string) => Href;
  source: string;
  errorMessage?: string;
  isFetching?: boolean;
  pageKey?: string | number;
};

export type ThemeAwareInfiniteScrollListProps<ItemT> = Omit<
  ThemeAwareScreenProps<ItemT>,
  'children' | 'contentContainerStyle' | 'flashListProps' | 'stickyHeader'
> & {
  children?: ReactNode;
  data: NonNullable<FlashListProps<ItemT>['data']>;
  fetchNextPage: () => void | Promise<unknown>;
  hasNextPage: boolean;
  isLoading?: boolean;
  isFetchNextPageError?: boolean;
  isFetchingNextPage: boolean;
  keyExtractor: NonNullable<FlashListProps<ItemT>['keyExtractor']>;
  ListEmptyComponent?: FlashListProps<ItemT>['ListEmptyComponent'];
  ListFooterComponent?: FlashListProps<ItemT>['ListFooterComponent'];
  loadingSpinner?: ReactNode;
  onRefresh?: FlashListProps<ItemT>['onRefresh'];
  onEndReachedThreshold?: number;
  refreshing?: FlashListProps<ItemT>['refreshing'];
  renderItem: NonNullable<FlashListProps<ItemT>['renderItem']>;
  stickyHeader?: ThemeAwareInfiniteScrollListHeader;
  detailNavigation?: ThemeAwareInfiniteScrollListDetailNavigation;
  flashListProps?: InfiniteScrollFlashListProps<ItemT>;
};

export function ThemeAwareInfiniteScrollList<ItemT>(
  props: ThemeAwareInfiniteScrollListProps<ItemT>,
) {
  const {
    children,
    data,
    fetchNextPage,
    hasNextPage,
    isLoading = false,
    isFetchNextPageError = false,
    isFetchingNextPage,
    keyExtractor,
    ListEmptyComponent,
    ListFooterComponent,
    loadingSpinner,
    onRefresh,
    onEndReachedThreshold = 0.5,
    refreshing = false,
    renderItem,
    stickyHeader,
    backToTop = false,
    p,
    px,
    detailNavigation,
    flashListProps,
    ...screenProps
  } = props;
  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchNextPageError) {
      return;
    }

    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage]);
  const listFooterComponent = isFetchingNextPage ? (
    <ThemeAwareSurface alignItems="center" py="$3">
      <DefaultLoadingSpinner />
    </ThemeAwareSurface>
  ) : (
    ListFooterComponent
  );
  const isInitialLoading =
    isLoading && data.length === 0 && !isFetchingNextPage;
  const fillLoadingViewport =
    isInitialLoading && loadingSpinner !== undefined && loadingSpinner !== null;
  const listEmptyComponent = isInitialLoading ? (
    <ThemeAwareSurface
      alignItems="center"
      flex={fillLoadingViewport ? 1 : undefined}
      py="$6"
    >
      {loadingSpinner ?? <DefaultLoadingSpinner size="large" />}
    </ThemeAwareSurface>
  ) : isFetchingNextPage ? null : (
    ListEmptyComponent
  );
  const itemHorizontalGutter =
    p === undefined ? px ?? THEME_AWARE_CONTENT_HORIZONTAL_GUTTER : p;
  const renderGutteredItem = useCallback<
    NonNullable<FlashListProps<ItemT>['renderItem']>
  >(
    (info) => (
      <VStack
        style={{
          paddingHorizontal: resolveLegacySpacing(itemHorizontalGutter),
        }}
      >
        {renderItem(info)}
      </VStack>
    ),
    [itemHorizontalGutter, renderItem],
  );

  return (
    <>
      {detailNavigation ? (
        <DetailNavigationCollectionRegistration
          source={detailNavigation.source}
          itemIds={Array.from(data, (item, index) => keyExtractor(item, index))}
          hrefForId={detailNavigation.hrefForId}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isFetching={detailNavigation.isFetching}
          isFetchNextPageError={isFetchNextPageError}
          pageKey={detailNavigation.pageKey ?? data.length}
          errorMessage={detailNavigation.errorMessage}
        />
      ) : null}
      <ThemeAwareScreen
        {...screenProps}
        p={p}
        px={px}
        backToTop={backToTop}
        stickyHeader={stickyHeader}
        flashListProps={{
          ...flashListProps,
          contentContainerStyle: fillLoadingViewport
            ? [flashListProps?.contentContainerStyle, { flexGrow: 1 }]
            : flashListProps?.contentContainerStyle,
          data,
          keyExtractor,
          ListEmptyComponent: listEmptyComponent,
          ListFooterComponent: listFooterComponent,
          onEndReached: handleEndReached,
          onEndReachedThreshold,
          onRefresh,
          refreshing,
          renderItem: renderGutteredItem,
        }}
      >
        {children}
      </ThemeAwareScreen>
    </>
  );
}

function DefaultLoadingSpinner({
  size = 'small',
}: {
  size?: 'small' | 'large';
}) {
  const colorScheme = useColorScheme() ?? 'light';

  return <ActivityIndicator color={COLORS[colorScheme].tint} size={size} />;
}
