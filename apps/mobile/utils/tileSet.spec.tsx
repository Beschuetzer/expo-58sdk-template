import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';

import { TileSetProvider, useTileSet } from './tileSet';

import generalReducer, {
  setTileGradientsEnabled as setTileGradientsEnabledAction,
} from '@/state/slices/generalSlice';

const store = configureStore({
  reducer: { general: generalReducer },
});

jest.mock('react-redux', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');
  const mockStoreContext = mockReact.createContext<
    | {
        dispatch: (action: unknown) => unknown;
        getState: () => unknown;
        subscribe: (listener: () => void) => () => void;
      }
    | undefined
  >(undefined);
  const mockUseStore = () => {
    const store = mockReact.useContext(mockStoreContext);
    if (!store) {
      throw new Error('Test store provider is missing');
    }
    return store;
  };

  return {
    Provider: ({
      children,
      store,
    }: {
      children: import('react').ReactNode;
      store: {
        dispatch: (action: unknown) => unknown;
        getState: () => unknown;
        subscribe: (listener: () => void) => () => void;
      };
    }) =>
      mockReact.createElement(
        mockStoreContext.Provider,
        { value: store },
        children,
      ),
    useDispatch: () => mockUseStore().dispatch,
    useSelector: (selector: (state: unknown) => unknown) => {
      const store = mockUseStore();
      return mockReact.useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()),
      );
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  setItem: jest.fn(() => Promise.resolve()),
}));

function TileSetProbe() {
  const { tileSet, setTileSet, tileGradientsEnabled, setTileGradientsEnabled } =
    useTileSet();

  return (
    <>
      <Text testID="tile-set" onPress={() => setTileSet('futuristic')}>
        {tileSet}
      </Text>
      <Text
        testID="tile-gradients"
        onPress={() => setTileGradientsEnabled(false)}
      >
        {tileGradientsEnabled ? 'enabled' : 'disabled'}
      </Text>
    </>
  );
}

describe('TileSetProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
    jest.mocked(AsyncStorage.removeItem).mockResolvedValue(undefined);
    store.dispatch(setTileGradientsEnabledAction(true));
  });

  it('restores and persists tile sets while reading gradients from Redux state', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementation((key) =>
        Promise.resolve(key === '@mobile/tile-set' ? 'classic' : null),
      );

    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <Provider store={store}>
          <TileSetProvider>
            <TileSetProbe />
          </TileSetProvider>
        </Provider>,
      );
      await Promise.resolve();
    });

    const tileSetProbe = () => screen.root.findByProps({ testID: 'tile-set' });
    const tileGradientsProbe = () =>
      screen.root.findByProps({ testID: 'tile-gradients' });
    expect(tileSetProbe().props.children).toBe('classic');
    expect(tileGradientsProbe().props.children).toBe('enabled');

    await act(async () => {
      tileSetProbe().props.onPress();
      await Promise.resolve();
    });

    expect(tileSetProbe().props.children).toBe('futuristic');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/tile-set',
      'futuristic',
    );

    await act(async () => {
      tileGradientsProbe().props.onPress();
      await Promise.resolve();
    });

    expect(tileGradientsProbe().props.children).toBe('disabled');
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      '@mobile/tile-gradients-enabled',
      'false',
    );

    act(() => screen.unmount());
  });

  it('migrates the legacy gradient toggle into Redux and removes its old key', async () => {
    const legacyStore = configureStore({
      reducer: { general: generalReducer },
      preloadedState: {
        general: { errors: [], selectedRelationshipId: null },
      },
    });
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementation((key) =>
        Promise.resolve(
          key === '@mobile/tile-gradients-enabled' ? 'false' : null,
        ),
      );

    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <Provider store={legacyStore}>
          <TileSetProvider>
            <TileSetProbe />
          </TileSetProvider>
        </Provider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      screen.root.findByProps({ testID: 'tile-gradients' }).props.children,
    ).toBe('disabled');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@mobile/tile-gradients-enabled',
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      '@mobile/tile-gradients-enabled',
      'false',
    );

    act(() => screen.unmount());
  });
});
