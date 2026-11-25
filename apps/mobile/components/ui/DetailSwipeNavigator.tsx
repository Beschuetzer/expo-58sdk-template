import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import type {
  PanGestureActiveEvent,
  PanGestureConfig,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemeAwareButton } from './ThemeAwareButton';
import { ThemeAwareLoadingIndicator } from './ThemeAwareLoadingIndicator';
import { ThemeAwareText } from './ThemeAwareText';
import { HStack } from './hstack';
import { VStack } from './vstack';

import { useI18n } from '@/utils/i18n';

const SWIPE_ACTIVATION_DISTANCE = 12;
const SWIPE_NAVIGATION_DISTANCE = 64;
const SWIPE_NAVIGATION_VELOCITY_POINTS_PER_SECOND = 500;
const SWIPE_EXIT_DURATION_MS = 220;

const swipeNavigatorStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

type NavigationDirection = 'next' | 'previous';
type PanGestureEndEvent = Parameters<
  NonNullable<PanGestureConfig['onDeactivate']>
>[0];

type DetailNavigationCollection = {
  readonly itemIds: readonly string[];
  hrefForId: (id: string) => Href;
  fetchNextPage?: () => void | Promise<unknown>;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isFetching: boolean;
  readonly isFetchNextPageError: boolean;
  readonly pageKey: string | number;
  readonly errorMessage?: string;
};

type RegisteredCollection = {
  collection: DetailNavigationCollection;
  signature: string;
};

type DetailNavigationRegistry = {
  collections: ReadonlyMap<string, RegisteredCollection>;
  register: (
    source: string,
    collection: DetailNavigationCollection,
    signature: string,
  ) => () => void;
};

const DetailNavigationRegistryContext =
  createContext<DetailNavigationRegistry | null>(null);

export type DetailNavigationCollectionRegistrationProps = {
  source: string;
  itemIds: readonly string[];
  hrefForId: (id: string) => Href;
  fetchNextPage?: () => void | Promise<unknown>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isFetching?: boolean;
  isFetchNextPageError?: boolean;
  pageKey?: string | number;
  errorMessage?: string;
};

export function DetailNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collections, setCollections] = useState<
    ReadonlyMap<string, RegisteredCollection>
  >(() => new Map());
  const register = useCallback(
    (
      source: string,
      collection: DetailNavigationCollection,
      signature: string,
    ) => {
      setCollections((current) => {
        const existing = current.get(source);
        if (
          existing?.collection === collection &&
          existing.signature === signature
        ) {
          return current;
        }

        const next = new Map(current);
        next.set(source, { collection, signature });
        return next;
      });

      return () => {
        setCollections((current) => {
          if (current.get(source)?.collection !== collection) {
            return current;
          }

          const next = new Map(current);
          next.delete(source);
          return next;
        });
      };
    },
    [],
  );
  const registry = useMemo(
    () => ({ collections, register }),
    [collections, register],
  );

  return (
    <DetailNavigationRegistryContext.Provider value={registry}>
      {children}
    </DetailNavigationRegistryContext.Provider>
  );
}

export function DetailNavigationCollectionRegistration({
  source,
  itemIds,
  hrefForId,
  fetchNextPage,
  hasNextPage = false,
  isFetchingNextPage = false,
  isFetching = false,
  isFetchNextPageError = false,
  pageKey,
  errorMessage,
}: DetailNavigationCollectionRegistrationProps) {
  const registry = useContext(DetailNavigationRegistryContext);
  const latest = useRef({
    itemIds,
    hrefForId,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isFetchNextPageError,
    pageKey,
    errorMessage,
  });
  latest.current = {
    itemIds,
    hrefForId,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isFetchNextPageError,
    pageKey,
    errorMessage,
  };
  const signature = JSON.stringify([
    itemIds,
    pageKey ?? itemIds.length,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isFetchNextPageError,
    errorMessage ?? null,
  ]);
  const collection = useMemo<DetailNavigationCollection>(
    () => ({
      get itemIds() {
        return latest.current.itemIds;
      },
      hrefForId: (id) => latest.current.hrefForId(id),
      get fetchNextPage() {
        const currentFetchNextPage = latest.current.fetchNextPage;
        return currentFetchNextPage ? () => currentFetchNextPage() : undefined;
      },
      get hasNextPage() {
        return latest.current.hasNextPage;
      },
      get isFetchingNextPage() {
        return latest.current.isFetchingNextPage;
      },
      get isFetching() {
        return latest.current.isFetching;
      },
      get isFetchNextPageError() {
        return latest.current.isFetchNextPageError;
      },
      get pageKey() {
        return latest.current.pageKey ?? latest.current.itemIds.length;
      },
      get errorMessage() {
        return latest.current.errorMessage;
      },
    }),
    [],
  );
  const register = registry?.register;

  useEffect(() => {
    if (!register) {
      return;
    }

    return register(source, collection, signature);
  }, [collection, register, signature, source]);

  return null;
}

function useDetailNavigationCollection(source?: string) {
  const registry = useContext(DetailNavigationRegistryContext);
  return source ? registry?.collections.get(source) ?? null : null;
}

export function DetailSwipeNavigator({
  children,
  itemId,
  source,
}: {
  children: ReactNode;
  itemId?: string;
  source?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const swipeTranslation = useSharedValue(0);
  const animatedSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslation.value }],
  }));
  const registered = useDetailNavigationCollection(source);
  const collection = registered?.collection;
  const itemIds = collection?.itemIds ?? [];
  const currentIndex = itemId ? itemIds.indexOf(itemId) : -1;
  const [pendingDirection, setPendingDirection] =
    useState<NavigationDirection | null>(null);
  const [pendingPageKey, setPendingPageKey] = useState<string | number>();
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [isWaitingForIdle, setIsWaitingForIdle] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [isSwipeNavigationPending, setIsSwipeNavigationPending] =
    useState(false);
  const [isSwipeNavigationLoading, setIsSwipeNavigationLoading] =
    useState(false);

  const resetSwipeNavigation = useCallback(() => {
    setIsSwipeNavigationPending(false);
    setIsSwipeNavigationLoading(false);
    swipeTranslation.value = withSpring(0);
  }, [swipeTranslation]);
  const handleNavigationFailure = useCallback(
    (error: unknown) => {
      setNavigationError(
        error instanceof Error
          ? error.message
          : t('detailNavigation.loadMoreError'),
      );
      resetSwipeNavigation();
    },
    [resetSwipeNavigation, t],
  );

  const getNeighborId = useCallback(
    (direction: NavigationDirection) => {
      if (!collection || currentIndex < 0) {
        return undefined;
      }

      return collection.itemIds[currentIndex + (direction === 'next' ? 1 : -1)];
    },
    [collection, currentIndex],
  );

  const navigate = useCallback(
    async (direction: NavigationDirection, retry = false) => {
      if (!collection || currentIndex < 0 || isLoadingNavigation) {
        return;
      }

      const neighborId = getNeighborId(direction);
      if (neighborId) {
        setPendingDirection(null);
        setPendingPageKey(undefined);
        setIsWaitingForIdle(false);
        setNavigationError(null);
        try {
          router.replace(collection.hrefForId(neighborId));
        } catch (error) {
          handleNavigationFailure(error);
        }
        return;
      }

      const fetchNextPage = collection.fetchNextPage;
      if (
        direction !== 'next' ||
        !fetchNextPage ||
        !collection.hasNextPage ||
        collection.isFetching ||
        collection.isFetchingNextPage ||
        (collection.isFetchNextPageError && !retry)
      ) {
        return;
      }

      setPendingDirection(direction);
      setPendingPageKey(collection.pageKey);
      setIsWaitingForIdle(false);
      setNavigationError(null);
      setIsLoadingNavigation(true);

      try {
        const fetchResult = fetchNextPage();
        if (fetchResult === undefined) {
          if (collection.isFetching || collection.isFetchingNextPage) {
            setIsWaitingForIdle(true);
          } else {
            setPendingDirection(null);
            setPendingPageKey(undefined);
            resetSwipeNavigation();
          }
          return;
        }

        await fetchResult;
      } catch (error) {
        handleNavigationFailure(error);
      } finally {
        setIsLoadingNavigation(false);
      }
    },
    [
      collection,
      currentIndex,
      getNeighborId,
      handleNavigationFailure,
      isLoadingNavigation,
      resetSwipeNavigation,
      router,
    ],
  );

  const handlePanUpdate = useCallback(
    (event: PanGestureActiveEvent) => {
      'worklet';
      swipeTranslation.value = event.translationX;
    },
    [swipeTranslation],
  );

  useEffect(() => {
    swipeTranslation.value = 0;
    setIsSwipeNavigationPending(false);
    setIsSwipeNavigationLoading(false);
    setPendingDirection(null);
    setPendingPageKey(undefined);
    setIsLoadingNavigation(false);
    setIsWaitingForIdle(false);
    setNavigationError(null);
  }, [itemId, source, swipeTranslation]);

  useEffect(() => {
    if (!pendingDirection || !collection || currentIndex < 0) {
      return;
    }

    const neighborId = getNeighborId(pendingDirection);
    if (neighborId) {
      setPendingDirection(null);
      setPendingPageKey(undefined);
      setIsWaitingForIdle(false);
      setNavigationError(null);
      try {
        router.replace(collection.hrefForId(neighborId));
      } catch (error) {
        handleNavigationFailure(error);
      }
      return;
    }

    if (collection.isFetchNextPageError) {
      setNavigationError(
        collection.errorMessage ?? t('detailNavigation.loadMoreError'),
      );
      resetSwipeNavigation();
      return;
    }

    if (!collection.hasNextPage) {
      setPendingDirection(null);
      setPendingPageKey(undefined);
      setIsWaitingForIdle(false);
      resetSwipeNavigation();
      return;
    }

    if (
      isLoadingNavigation ||
      collection.isFetching ||
      collection.isFetchingNextPage
    ) {
      return;
    }

    if (isWaitingForIdle) {
      setIsWaitingForIdle(false);
      navigate(pendingDirection).catch(handleNavigationFailure);
      return;
    }

    if (collection.pageKey !== pendingPageKey) {
      setPendingDirection(null);
      setPendingPageKey(undefined);
      setNavigationError(null);
      resetSwipeNavigation();
    }
  }, [
    collection,
    currentIndex,
    getNeighborId,
    handleNavigationFailure,
    isLoadingNavigation,
    isWaitingForIdle,
    navigate,
    pendingDirection,
    pendingPageKey,
    registered,
    resetSwipeNavigation,
    router,
    t,
  ]);

  const canNavigate = useCallback(
    (direction: NavigationDirection) => {
      if (!collection || currentIndex < 0 || isLoadingNavigation) {
        return false;
      }

      if (getNeighborId(direction)) {
        return true;
      }

      return Boolean(
        direction === 'next' &&
          collection.fetchNextPage &&
          collection.hasNextPage &&
          !collection.isFetching &&
          !collection.isFetchingNextPage &&
          !collection.isFetchNextPageError &&
          !pendingDirection,
      );
    },
    [
      collection,
      currentIndex,
      getNeighborId,
      isLoadingNavigation,
      pendingDirection,
    ],
  );

  const navigateAfterSwipe = useCallback(
    (direction: NavigationDirection) => {
      if (!canNavigate(direction)) {
        resetSwipeNavigation();
        return;
      }

      setIsSwipeNavigationLoading(true);
      navigate(direction).catch(handleNavigationFailure);
    },
    [canNavigate, handleNavigationFailure, navigate, resetSwipeNavigation],
  );
  const handleSwipeRelease = useCallback(
    (translationX: number, velocityX: number) => {
      const distance = Math.abs(translationX);
      const velocity = Math.abs(velocityX);
      const shouldNavigate =
        distance >= SWIPE_NAVIGATION_DISTANCE ||
        (distance > SWIPE_ACTIVATION_DISTANCE &&
          velocity >= SWIPE_NAVIGATION_VELOCITY_POINTS_PER_SECOND);
      const direction = translationX < 0 ? 'next' : 'previous';

      if (!shouldNavigate || !canNavigate(direction)) {
        resetSwipeNavigation();
        return;
      }

      setIsSwipeNavigationPending(true);
      setNavigationError(null);
      const exitDistance = Math.max(screenWidth, SWIPE_NAVIGATION_DISTANCE);
      swipeTranslation.value = withTiming(
        direction === 'next' ? -exitDistance : exitDistance,
        { duration: SWIPE_EXIT_DURATION_MS },
        (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(navigateAfterSwipe, direction);
          } else {
            scheduleOnRN(resetSwipeNavigation);
          }
        },
      );
    },
    [
      canNavigate,
      navigateAfterSwipe,
      resetSwipeNavigation,
      screenWidth,
      swipeTranslation,
    ],
  );
  const handlePanDeactivate = useCallback(
    (event: PanGestureEndEvent) => {
      'worklet';
      if (event.canceled) {
        swipeTranslation.value = withSpring(0);
      } else {
        scheduleOnRN(handleSwipeRelease, event.translationX, event.velocityX);
      }
    },
    [handleSwipeRelease, swipeTranslation],
  );

  const hasSwipeTarget =
    currentIndex >= 0 &&
    (currentIndex > 0 ||
      currentIndex < itemIds.length - 1 ||
      Boolean(collection?.hasNextPage));
  const swipeGesture = usePanGesture({
    enabled: Boolean(collection && hasSwipeTarget && !isSwipeNavigationPending),
    activeOffsetX: [-SWIPE_ACTIVATION_DISTANCE, SWIPE_ACTIVATION_DISTANCE],
    failOffsetY: [-SWIPE_ACTIVATION_DISTANCE, SWIPE_ACTIVATION_DISTANCE],
    onUpdate: handlePanUpdate,
    onDeactivate: handlePanDeactivate,
  });

  const showControls =
    currentIndex >= 0 &&
    (itemIds.length > 1 ||
      Boolean(collection?.hasNextPage) ||
      pendingDirection);
  const loadMoreError =
    navigationError ??
    (collection?.isFetchNextPageError
      ? collection.errorMessage ?? t('detailNavigation.loadMoreError')
      : null);

  return (
    <View style={swipeNavigatorStyles.container}>
      <GestureDetector gesture={swipeGesture} touchAction="pan-y">
        <Animated.View
          collapsable={false}
          pointerEvents={isSwipeNavigationPending ? 'none' : 'auto'}
          style={animatedSwipeStyle}
        >
          <VStack space="md" testID="detail-swipe-navigator">
            {showControls ? (
              <HStack space="sm">
                <ThemeAwareButton
                  accessibilityLabel={t('detailNavigation.previous')}
                  flex={1}
                  isDisabled={!canNavigate('previous')}
                  onPress={() => navigate('previous')}
                  variant="outline"
                >
                  {t('detailNavigation.previous')}
                </ThemeAwareButton>
                <ThemeAwareButton
                  accessibilityLabel={t('detailNavigation.next')}
                  flex={1}
                  isDisabled={!canNavigate('next')}
                  onPress={() => navigate('next')}
                  variant="outline"
                >
                  {t('detailNavigation.next')}
                </ThemeAwareButton>
              </HStack>
            ) : null}
            {loadMoreError ? (
              <VStack space="xs">
                <ThemeAwareText color="$error600">
                  {loadMoreError}
                </ThemeAwareText>
                {pendingDirection ? (
                  <ThemeAwareButton
                    isDisabled={
                      isLoadingNavigation ||
                      Boolean(collection?.isFetchingNextPage) ||
                      Boolean(collection?.isFetching)
                    }
                    onPress={() => navigate(pendingDirection, true)}
                    variant="outline"
                  >
                    {t('paymentRequests.retry')}
                  </ThemeAwareButton>
                ) : null}
              </VStack>
            ) : null}
            {children}
          </VStack>
        </Animated.View>
      </GestureDetector>
      {isSwipeNavigationLoading ? (
        <View pointerEvents="none" style={swipeNavigatorStyles.loadingOverlay}>
          <ThemeAwareLoadingIndicator testID="detail-swipe-loading-indicator" />
        </View>
      ) : null}
    </View>
  );
}
