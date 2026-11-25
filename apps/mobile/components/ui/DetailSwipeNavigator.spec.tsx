import React, { useCallback, useState } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  DetailNavigationCollectionRegistration,
  DetailNavigationProvider,
  DetailSwipeNavigator,
} from './DetailSwipeNavigator';

import { AppRoutePaths } from '@/constants/navigation';

type MockPanGestureEvent = {
  canceled?: boolean;
  translationX: number;
  velocityX: number;
};

type MockPanGestureConfig = {
  enabled?: boolean;
  activeOffsetX?: number | [number, number];
  failOffsetY?: number | [number, number];
  onUpdate?: (event: MockPanGestureEvent) => void;
  onDeactivate?: (event: MockPanGestureEvent) => void;
};

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const configs: MockPanGestureConfig[] = [];
  const gesture = {};

  return {
    __esModule: true,
    GestureDetector: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('GestureDetectorHost', props, children),
    usePanGesture: (config: MockPanGestureConfig) => {
      configs.push(config);
      return gesture;
    },
    __mock: { configs },
  };
});

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const ReactNative = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  const sharedValues: { value: number }[] = [];
  const animatedStyleCallbacks: (() => object)[] = [];

  return {
    __esModule: true,
    default: { View: ReactNative.View },
    useAnimatedStyle: (callback: () => object) => {
      animatedStyleCallbacks.push(callback);
      return callback();
    },
    useSharedValue: (value: number) => {
      const sharedValue = React.useRef({ value }).current;
      sharedValues.push(sharedValue);
      return sharedValue;
    },
    withSpring: jest.fn((value: number) => value),
    withTiming: jest.fn(
      (
        value: number,
        _config: { duration: number },
        callback?: (finished: boolean) => void,
      ) => {
        callback?.(true);
        return value;
      },
    ),
    __mock: { animatedStyleCallbacks, sharedValues },
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN<Args extends unknown[], ReturnValue>(
    callback: (...args: Args) => ReturnValue,
    ...args: Args
  ) {
    callback(...args);
  },
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        'detailNavigation.loadMoreError': 'Could not load another item.',
        'detailNavigation.next': 'Next item',
        'detailNavigation.previous': 'Previous item',
        'common.loading': 'Loading',
        'paymentRequests.retry': 'Retry',
      })[key] ?? key,
  }),
}));

jest.mock('./ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ButtonHost', props, children),
  };
});

jest.mock('./hstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    HStack: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('HStackHost', props, children),
  };
});

jest.mock('./vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    VStack: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('VStackHost', props, children),
  };
});

jest.mock('./ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareText: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ThemeAwareTextHost', props, children),
  };
});

const gestureHandlerMock = jest.requireMock('react-native-gesture-handler') as {
  __mock: {
    configs: MockPanGestureConfig[];
  };
};
const reanimatedMock = jest.requireMock('react-native-reanimated') as {
  __mock: {
    animatedStyleCallbacks: (() => {
      transform: { translateX: number }[];
    })[];
    sharedValues: { value: number }[];
  };
  withSpring: jest.Mock;
  withTiming: jest.Mock;
};

type NavigationHarnessProps = {
  itemIds: readonly string[];
  itemId: string;
  fetchNextPage?: () => void | Promise<unknown>;
  hasNextPage?: boolean;
  isFetching?: boolean;
  isFetchingNextPage?: boolean;
  isFetchNextPageError?: boolean;
  errorMessage?: string;
  pageKey?: string | number;
};

function NavigationHarness({
  itemIds,
  itemId,
  fetchNextPage,
  hasNextPage = false,
  isFetching = false,
  isFetchingNextPage = false,
  isFetchNextPageError = false,
  errorMessage,
  pageKey,
}: NavigationHarnessProps) {
  return (
    <DetailNavigationProvider>
      <DetailNavigationCollectionRegistration
        source="testSource"
        itemIds={itemIds}
        hrefForId={(id) => ({
          pathname: AppRoutePaths.paymentRequestDetails,
          params: { id, detailNavigationSource: 'testSource' },
        })}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        isFetchNextPageError={isFetchNextPageError}
        errorMessage={errorMessage}
        pageKey={pageKey ?? itemIds.length}
      />
      <DetailSwipeNavigator itemId={itemId} source="testSource">
        <>Detail content</>
      </DetailSwipeNavigator>
    </DetailNavigationProvider>
  );
}

function DuplicateRegistrationHarness({ showFirst }: { showFirst: boolean }) {
  return (
    <DetailNavigationProvider>
      {showFirst ? (
        <DetailNavigationCollectionRegistration
          source="testSource"
          itemIds={['item-1']}
          hrefForId={(id) => ({
            pathname: AppRoutePaths.paymentRequestDetails,
            params: { id, detailNavigationSource: 'testSource' },
          })}
        />
      ) : null}
      <DetailNavigationCollectionRegistration
        source="testSource"
        itemIds={['item-2', 'item-3']}
        hrefForId={(id) => ({
          pathname: AppRoutePaths.paymentRequestDetails,
          params: { id, detailNavigationSource: 'testSource' },
        })}
      />
      <DetailSwipeNavigator itemId="item-2" source="testSource">
        <>Detail content</>
      </DetailSwipeNavigator>
    </DetailNavigationProvider>
  );
}

function RetryNavigationHarness({
  fetchNextPage,
}: {
  fetchNextPage: () => Promise<unknown>;
}) {
  const [itemIds, setItemIds] = useState(['item-1']);
  const [isFetchNextPageError, setIsFetchNextPageError] = useState(false);
  const loadNextPage = useCallback(async () => {
    try {
      await fetchNextPage();
      setIsFetchNextPageError(false);
      setItemIds(['item-1', 'item-2']);
    } catch (error) {
      setIsFetchNextPageError(true);
      throw error;
    }
  }, [fetchNextPage]);

  return (
    <DetailNavigationProvider>
      <DetailNavigationCollectionRegistration
        source="testSource"
        itemIds={itemIds}
        hrefForId={(id) => ({
          pathname: AppRoutePaths.paymentRequestDetails,
          params: { id, detailNavigationSource: 'testSource' },
        })}
        fetchNextPage={loadNextPage}
        hasNextPage
        isFetchNextPageError={isFetchNextPageError}
        errorMessage="Could not load the next page."
        pageKey={itemIds.length}
      />
      <DetailSwipeNavigator itemId="item-1" source="testSource">
        <>Detail content</>
      </DetailSwipeNavigator>
    </DetailNavigationProvider>
  );
}

function PaginatedNavigationHarness({
  onFetchNextPage,
}: {
  onFetchNextPage: () => void;
}) {
  const [itemIds, setItemIds] = useState(['item-1']);
  const fetchNextPage = useCallback(() => {
    onFetchNextPage();
    setItemIds((current) => [...current, 'item-2']);
    return Promise.resolve();
  }, [onFetchNextPage]);

  return (
    <NavigationHarness
      itemIds={itemIds}
      itemId="item-1"
      fetchNextPage={fetchNextPage}
      hasNextPage
      pageKey={itemIds.length}
    />
  );
}

function PageKeyOnlyAdvanceHarness() {
  const [pageKey, setPageKey] = useState(1);
  const fetchNextPage = useCallback(() => {
    setPageKey((current) => current + 1);
    return Promise.resolve();
  }, []);

  return (
    <NavigationHarness
      itemIds={['item-1']}
      itemId="item-1"
      fetchNextPage={fetchNextPage}
      hasNextPage
      pageKey={pageKey}
    />
  );
}

function getPanGestureConfig() {
  const configs = gestureHandlerMock.__mock.configs;
  const config = configs[configs.length - 1];
  if (!config) {
    throw new Error('Expected the pan gesture to be configured.');
  }

  return config;
}

function createPanGestureEvent(
  translationX: number,
  velocityX = 0,
  canceled = false,
): MockPanGestureEvent {
  return { canceled, translationX, velocityX };
}

function getButton(tree: ReactTestRenderer, label: string) {
  return tree.root.find(
    (instance) =>
      String(instance.type) === 'ButtonHost' &&
      (instance.props.accessibilityLabel === label ||
        instance.props.children === label),
  );
}

describe('DetailSwipeNavigator', () => {
  let mountedTree: ReactTestRenderer | undefined;

  afterEach(() => {
    if (mountedTree) {
      act(() => mountedTree?.unmount());
      mountedTree = undefined;
    }

    mockReplace.mockClear();
    gestureHandlerMock.__mock.configs.length = 0;
    reanimatedMock.__mock.animatedStyleCallbacks.length = 0;
    reanimatedMock.__mock.sharedValues.length = 0;
    reanimatedMock.withSpring.mockClear();
    reanimatedMock.withTiming.mockClear();
    jest.restoreAllMocks();
  });

  it('navigates to adjacent items in the registered list order', async () => {
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-3', 'item-2', 'item-1']}
          itemId="item-2"
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });
    expect(mockReplace).toHaveBeenLastCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-1', detailNavigationSource: 'testSource' },
    });

    await act(async () => {
      await getButton(tree, 'Previous item').props.onPress();
    });
    expect(mockReplace).toHaveBeenLastCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-3', detailNavigationSource: 'testSource' },
    });
  });

  it('keeps content off-screen and shows a spinner after a committed swipe', () => {
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-1', 'item-2', 'item-3']}
          itemId="item-2"
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    const config = getPanGestureConfig();
    if (!config.onUpdate || !config.onDeactivate) {
      throw new Error('Expected swipe animation handlers to be configured.');
    }

    let finishSwipeAnimation: ((finished: boolean) => void) | undefined;
    reanimatedMock.withTiming.mockImplementationOnce(
      (
        _value: number,
        _config: { duration: number },
        callback?: (finished: boolean) => void,
      ) => {
        finishSwipeAnimation = callback;
        return -400;
      },
    );

    expect(config.enabled).toBe(true);
    expect(config.activeOffsetX).toEqual([-12, 12]);
    expect(config.failOffsetY).toEqual([-12, 12]);
    expect(
      tree.root.findAllByProps({ testID: 'detail-swipe-loading-indicator' }),
    ).toHaveLength(0);

    act(() => {
      config.onUpdate?.(createPanGestureEvent(-32));
    });
    const sharedValues = reanimatedMock.__mock.sharedValues;
    const swipeTranslation = sharedValues[sharedValues.length - 1];
    const animatedStyles = reanimatedMock.__mock.animatedStyleCallbacks;
    const animatedStyle = animatedStyles[animatedStyles.length - 1];
    if (!swipeTranslation || !animatedStyle) {
      throw new Error('Expected the swipe animation to be initialized.');
    }

    expect(swipeTranslation.value).toBe(-32);
    expect(animatedStyle()).toEqual({ transform: [{ translateX: -32 }] });

    act(() => {
      config.onDeactivate?.(createPanGestureEvent(-80));
    });

    expect(reanimatedMock.withTiming).toHaveBeenLastCalledWith(
      expect.any(Number),
      { duration: 220 },
      expect.any(Function),
    );
    expect(swipeTranslation.value).toBeLessThan(-32);
    expect(animatedStyle()).toEqual({
      transform: [{ translateX: swipeTranslation.value }],
    });
    expect(
      tree.root.findAllByProps({ testID: 'detail-swipe-loading-indicator' }),
    ).toHaveLength(0);
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      finishSwipeAnimation?.(true);
    });

    expect(
      tree.root.findAllByProps({ testID: 'detail-swipe-loading-indicator' })
        .length,
    ).toBeGreaterThan(0);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-3', detailNavigationSource: 'testSource' },
    });

    act(() => {
      tree.update(
        <NavigationHarness
          itemIds={['item-1', 'item-2', 'item-3']}
          itemId="item-3"
        />,
      );
    });

    expect(swipeTranslation.value).toBe(0);
    expect(
      tree.root.findAllByProps({ testID: 'detail-swipe-loading-indicator' }),
    ).toHaveLength(0);
  });

  it('maps left and right swipes to next and previous items', () => {
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-1', 'item-2', 'item-3']}
          itemId="item-2"
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    const config = getPanGestureConfig();
    if (!config.onDeactivate) {
      throw new Error('Expected swipe navigation to be configured.');
    }

    act(() => {
      config.onDeactivate?.(createPanGestureEvent(-80));
    });

    expect(mockReplace).toHaveBeenNthCalledWith(1, {
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-3', detailNavigationSource: 'testSource' },
    });

    act(() => {
      tree.update(
        <NavigationHarness
          itemIds={['item-1', 'item-2', 'item-3']}
          itemId="item-3"
        />,
      );
    });
    const previousGestureConfig = getPanGestureConfig();
    if (!previousGestureConfig.onDeactivate) {
      throw new Error('Expected swipe navigation to be configured.');
    }

    act(() => {
      previousGestureConfig.onDeactivate?.(createPanGestureEvent(80));
    });
    expect(mockReplace).toHaveBeenNthCalledWith(2, {
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-2', detailNavigationSource: 'testSource' },
    });
  });

  it('ignores canceled and short swipes but accepts a fast deliberate swipe', () => {
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness itemIds={['item-1', 'item-2']} itemId="item-1" />,
      );
    });
    const config = getPanGestureConfig();
    if (!config.onDeactivate) {
      throw new Error('Expected swipe navigation to be configured.');
    }

    act(() => {
      config.onDeactivate?.(createPanGestureEvent(-80, 0, true));
      config.onDeactivate?.(createPanGestureEvent(10));
      config.onDeactivate?.(createPanGestureEvent(-20, -499));
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(
      mountedTree!.root.findAllByProps({
        testID: 'detail-swipe-loading-indicator',
      }),
    ).toHaveLength(0);

    act(() => {
      config.onDeactivate?.(createPanGestureEvent(-20, -500));
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-2', detailNavigationSource: 'testSource' },
    });
    expect(
      mountedTree!.root.findAllByProps({
        testID: 'detail-swipe-loading-indicator',
      }).length,
    ).toBeGreaterThan(0);
  });

  it('does not fetch a later page when no previous item exists', async () => {
    const fetchNextPage = jest.fn();
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-1']}
          itemId="item-1"
          fetchNextPage={fetchNextPage}
          hasNextPage
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    const previousButton = getButton(tree, 'Previous item');
    expect(previousButton.props.isDisabled).toBe(true);
    await act(async () => {
      await previousButton.props.onPress();
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('disables next navigation while a page cannot be fetched', async () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());
    const fetchStates: {
      fetchNextPage?: () => Promise<void>;
      isFetchNextPageError?: boolean;
      isFetching?: boolean;
      isFetchingNextPage?: boolean;
    }[] = [
      { isFetching: true },
      { isFetchingNextPage: true },
      { isFetchNextPageError: true },
      { fetchNextPage: undefined },
    ];

    for (const fetchState of fetchStates) {
      act(() => {
        mountedTree = renderer.create(
          <NavigationHarness
            itemIds={['item-1']}
            itemId="item-1"
            fetchNextPage={fetchNextPage}
            hasNextPage
            {...fetchState}
          />,
        );
      });
      const tree = mountedTree;
      if (!tree) {
        throw new Error('Expected the detail navigator to be rendered.');
      }

      expect(getButton(tree, 'Next item').props.isDisabled).toBe(true);
      await act(async () => {
        await getButton(tree, 'Next item').props.onPress();
      });
      expect(fetchNextPage).not.toHaveBeenCalled();
      act(() => tree.unmount());
      mountedTree = undefined;
      fetchNextPage.mockClear();
    }
  });

  it('clears pending navigation when loading does not return a promise', async () => {
    const fetchNextPage = jest.fn(() => undefined);
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-1']}
          itemId="item-1"
          fetchNextPage={fetchNextPage}
          hasNextPage
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(getButton(tree, 'Next item').props.isDisabled).toBe(false);
  });

  it('ignores another next press while a page request is pending', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchNextPage = jest.fn(
      () =>
        new Promise<unknown>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-1']}
          itemId="item-1"
          fetchNextPage={fetchNextPage}
          hasNextPage
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    let firstPress: Promise<void> | undefined;
    act(() => {
      firstPress = getButton(tree, 'Next item').props.onPress();
    });
    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    if (!firstPress) {
      throw new Error('Expected the first navigation request to be pending.');
    }
    await act(async () => {
      resolveFetch(undefined);
      await firstPress;
    });
  });

  it('clears pending navigation when a page advances without a new item', async () => {
    act(() => {
      mountedTree = renderer.create(<PageKeyOnlyAdvanceHarness />);
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(getButton(tree, 'Next item').props.isDisabled).toBe(false);
  });

  it('fetches the next page through the registered callback before navigating', async () => {
    const onFetchNextPage = jest.fn();
    act(() => {
      mountedTree = renderer.create(
        <PaginatedNavigationHarness onFetchNextPage={onFetchNextPage} />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });

    expect(onFetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-2', detailNavigationSource: 'testSource' },
    });
  });

  it('keeps the newest collection registered when an older one unmounts', async () => {
    act(() => {
      mountedTree = renderer.create(<DuplicateRegistrationHarness showFirst />);
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    act(() => {
      tree.update(<DuplicateRegistrationHarness showFirst={false} />);
    });
    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-3', detailNavigationSource: 'testSource' },
    });
  });

  it('renders without controls when there is no registered navigation target', () => {
    act(() => {
      mountedTree = renderer.create(
        <DetailSwipeNavigator itemId="item-1" source="missing">
          <>Detail content</>
        </DetailSwipeNavigator>,
      );
    });
    expect(
      mountedTree!.root.findAll(
        (instance) => String(instance.type) === 'ButtonHost',
      ),
    ).toHaveLength(0);

    act(() => {
      mountedTree!.unmount();
      mountedTree = renderer.create(
        <NavigationHarness itemIds={['item-1']} itemId="missing-item" />,
      );
    });
    expect(
      mountedTree!.root.findAll(
        (instance) => String(instance.type) === 'ButtonHost',
      ),
    ).toHaveLength(0);
  });

  it('renders safely without a navigation registry or source', () => {
    act(() => {
      mountedTree = renderer.create(
        <>
          <DetailNavigationCollectionRegistration
            source="testSource"
            itemIds={['item-1']}
            hrefForId={(id) => ({
              pathname: AppRoutePaths.paymentRequestDetails,
              params: { id },
            })}
          />
          <DetailSwipeNavigator itemId="item-1">
            <>Detail content</>
          </DetailSwipeNavigator>
        </>,
      );
    });

    expect(
      mountedTree!.root.findAll(
        (instance) => String(instance.type) === 'ButtonHost',
      ),
    ).toHaveLength(0);
  });

  it('shows a navigation error when routing to an adjacent item fails', async () => {
    mockReplace.mockImplementationOnce(() => {
      throw new Error('Route unavailable.');
    });
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness itemIds={['item-1', 'item-2']} itemId="item-1" />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });

    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareTextHost',
      )[0].props.children,
    ).toBe('Route unavailable.');
    expect(
      tree.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'Retry',
      ),
    ).toHaveLength(0);
  });

  it('retries a failed next-page request and navigates after it succeeds', async () => {
    const fetchNextPage = jest
      .fn<Promise<unknown>, []>()
      .mockRejectedValueOnce(new Error('Temporary failure.'))
      .mockResolvedValueOnce(undefined);
    act(() => {
      mountedTree = renderer.create(
        <RetryNavigationHarness fetchNextPage={fetchNextPage} />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });
    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareTextHost',
      )[0].props.children,
    ).toBe('Could not load the next page.');
    expect(getButton(tree, 'Next item').props.isDisabled).toBe(true);

    await act(async () => {
      await getButton(tree, 'Retry').props.onPress();
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: AppRoutePaths.paymentRequestDetails,
      params: { id: 'item-2', detailNavigationSource: 'testSource' },
    });
  });

  it('uses the fallback message when a page request rejects with a non-Error', async () => {
    const fetchNextPage = jest
      .fn<Promise<unknown>, []>()
      .mockRejectedValueOnce('network unavailable');
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-1']}
          itemId="item-1"
          fetchNextPage={fetchNextPage}
          hasNextPage
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    await act(async () => {
      await getButton(tree, 'Next item').props.onPress();
    });

    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareTextHost',
      )[0].props.children,
    ).toBe('Could not load another item.');
    expect(getButton(tree, 'Retry').props.isDisabled).toBe(false);
  });

  it('uses the default message when a collection has no load error text', () => {
    act(() => {
      mountedTree = renderer.create(
        <NavigationHarness
          itemIds={['item-1']}
          itemId="item-1"
          hasNextPage
          isFetchNextPageError
        />,
      );
    });
    const tree = mountedTree;
    if (!tree) {
      throw new Error('Expected the detail navigator to be rendered.');
    }

    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareTextHost',
      )[0].props.children,
    ).toBe('Could not load another item.');
  });
});
