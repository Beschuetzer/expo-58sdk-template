import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { Switch } from 'react-native';
import { Provider } from 'react-redux';
import renderer, { act } from 'react-test-renderer';

import SettingsScreen from '../app/(tabs)/(account)/SettingsScreen';

import generalReducer, {
  setTileGradientCustomization,
  setTileGradientsEnabled,
} from '@/state/slices/generalSlice';
import { I18nProvider } from '@/utils/i18n';
import {
  SCREEN_BACKGROUND_OPTIONS,
  ScreenBackgroundProvider,
} from '@/utils/screenBackground';
import { TileSetProvider } from '@/utils/tileSet';

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
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));
jest.mock('@/components/ui/ThemeAwareHeading', () => ({
  ThemeAwareHeading: 'HeadingHost',
}));
jest.mock('@/components/ui/ThemeAwareScreen', () => ({
  ThemeAwareScreen: 'ScreenHost',
}));
jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareText: 'TextHost',
}));
jest.mock('@/components/ui/hstack', () => ({ HStack: 'HStackHost' }));
jest.mock('@/components/ui/vstack', () => ({ VStack: 'VStackHost' }));
jest.mock('@/components/ui/TileGradientCustomizerModal', () => ({
  TileGradientCustomizerModal: 'GradientCustomizerModalHost',
}));
jest.mock('@/components/ui/ScreenBackgroundColorPickerModal', () => ({
  ScreenBackgroundColorPickerModal: 'ScreenBackgroundColorPickerModalHost',
}));

jest.mock('@/utils/font', () => ({
  useFont: () => ({
    font: 'codex',
    fonts: { codex: 'Codex' },
    setFont: jest.fn(),
  }),
}));
jest.mock('@/utils/theme', () => ({
  useThemeMode: () => ({
    colorScheme: 'light',
    mode: 'system',
    modes: { system: 'System', light: 'Light', dark: 'Dark' },
    setMode: jest.fn(),
  }),
}));

describe('SettingsScreen preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.dispatch(
      setTileGradientCustomization({
        angle: 0,
        colors: [null, null, null],
        locations: [0, 48, 100],
        opacity: 100,
      }),
    );
    store.dispatch(setTileGradientsEnabled(true));
  });

  it('lets the user select and persist German', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <Provider store={store}>
          <I18nProvider>
            <ScreenBackgroundProvider>
              <TileSetProvider>
                <SettingsScreen />
              </TileSetProvider>
            </ScreenBackgroundProvider>
          </I18nProvider>
        </Provider>,
      );
      await Promise.resolve();
    });

    const germanButton = () =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'Deutsch',
      );
    const englishButton = () =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'English',
      );
    const buttonByLabel = (label: string) =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === label,
      );
    expect(germanButton().props.variant).toBe('outline');
    expect(englishButton().props.disabled).toBe(true);
    expect(germanButton().props.disabled).toBe(false);
    expect(buttonByLabel('System').props.disabled).toBe(true);
    expect(buttonByLabel('Dark').props.disabled).toBe(false);
    expect(buttonByLabel('Codex').props.disabled).toBe(true);

    await act(async () => germanButton().props.onPress());

    expect(germanButton().props.variant).toBe('solid');
    expect(germanButton().props.disabled).toBe(true);
    expect(englishButton().props.disabled).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@mobile/locale', 'de');
    expect(
      screen.root
        .findAll((instance) => String(instance.type) === 'HeadingHost')
        .map((instance) => instance.props.children),
    ).toContain('Einstellungen');
    expect(
      screen.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Sprache');
    expect(germanButton().parent?.props.className).toContain('flex-wrap');

    act(() => screen.unmount());
  });

  it('lets the user select and persist the Futuristic tile set', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <Provider store={store}>
          <I18nProvider>
            <ScreenBackgroundProvider>
              <TileSetProvider>
                <SettingsScreen />
              </TileSetProvider>
            </ScreenBackgroundProvider>
          </I18nProvider>
        </Provider>,
      );
      await Promise.resolve();
    });

    const tileSetButton = (label: string) =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.testID === `tile-set-${label.toLowerCase()}`,
      );
    expect([
      tileSetButton('Default'),
      tileSetButton('Futuristic'),
      tileSetButton('Classic'),
      tileSetButton('None'),
    ]).toHaveLength(4);
    expect(tileSetButton('Default').props.variant).toBe('solid');
    expect(tileSetButton('Futuristic').props.variant).toBe('outline');
    expect(tileSetButton('Default').props.disabled).toBe(true);
    expect(tileSetButton('Futuristic').props.disabled).toBe(false);

    await act(async () => {
      tileSetButton('Futuristic').props.onPress();
      await Promise.resolve();
    });

    expect(tileSetButton('Futuristic').props.variant).toBe('solid');
    expect(tileSetButton('Futuristic').props.disabled).toBe(true);
    expect(tileSetButton('Default').props.disabled).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/tile-set',
      'futuristic',
    );

    act(() => screen.unmount());
  });

  it('lets the user choose and persist a screen background and color', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <Provider store={store}>
          <I18nProvider>
            <ScreenBackgroundProvider>
              <TileSetProvider>
                <SettingsScreen />
              </TileSetProvider>
            </ScreenBackgroundProvider>
          </I18nProvider>
        </Provider>,
      );
      await Promise.resolve();
    });

    const backgroundButton = (background: string) =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.testID === `screen-background-${background}`,
      );
    expect(SCREEN_BACKGROUND_OPTIONS).toHaveLength(5);
    expect(
      SCREEN_BACKGROUND_OPTIONS.map(
        (background) => backgroundButton(background).props.children,
      ),
    ).toEqual(['None', 'Color', 'Default', 'Futuristic', 'Classic']);
    expect(backgroundButton('none').props.variant).toBe('solid');
    expect(backgroundButton('none').props.disabled).toBe(true);
    expect(backgroundButton('classic').props.disabled).toBe(false);

    await act(async () => {
      backgroundButton('classic').props.onPress();
      await Promise.resolve();
    });
    expect(backgroundButton('classic').props.variant).toBe('solid');
    expect(backgroundButton('classic').props.disabled).toBe(true);
    expect(backgroundButton('none').props.disabled).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background',
      'classic',
    );

    await act(async () => backgroundButton('color').props.onPress());
    expect(backgroundButton('color').props.disabled).toBe(true);
    const sageSwatch = () =>
      screen.root.find(
        (instance) => instance.props.testID === 'screen-background-color-sage',
      );
    const creamSwatch = () =>
      screen.root.find(
        (instance) => instance.props.testID === 'screen-background-color-cream',
      );
    expect(creamSwatch().props.disabled).toBe(true);
    await act(async () => {
      sageSwatch().props.onPress();
      await Promise.resolve();
    });

    expect(sageSwatch().props.accessibilityState.selected).toBe(true);
    expect(sageSwatch().props.disabled).toBe(true);
    expect(creamSwatch().props.disabled).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background-color',
      'sage',
    );

    const customColorButton = () =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.testID === 'screen-background-custom-color',
      );
    expect(customColorButton().props.variant).toBe('outline');
    await act(async () => customColorButton().props.onPress());

    const colorPickerModal = () =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ScreenBackgroundColorPickerModalHost',
      );
    expect(colorPickerModal().props.isVisible).toBe(true);
    expect(colorPickerModal().props.initialColor).toBe('#E5ECDF');
    await act(async () => colorPickerModal().props.onSave('#123456'));

    expect(colorPickerModal().props.isVisible).toBe(false);
    expect(customColorButton().props.variant).toBe('solid');
    expect(customColorButton().props.disabled).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background-color',
      'custom',
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background-custom-color',
      '#123456',
    );

    const editCustomColorButton = () =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.testID === 'screen-background-custom-color-edit',
      );
    expect(editCustomColorButton().props.disabled).not.toBe(true);
    await act(async () => editCustomColorButton().props.onPress());
    expect(colorPickerModal().props.isVisible).toBe(true);
    await act(async () => colorPickerModal().props.onCancel());
    expect(colorPickerModal().props.isVisible).toBe(false);

    act(() => screen.unmount());
  });

  it('lets the user toggle and persist tile gradients', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <Provider store={store}>
          <I18nProvider>
            <ScreenBackgroundProvider>
              <TileSetProvider>
                <SettingsScreen />
              </TileSetProvider>
            </ScreenBackgroundProvider>
          </I18nProvider>
        </Provider>,
      );
      await Promise.resolve();
    });

    const gradientSwitch = () =>
      screen.root.find(
        (instance) =>
          instance.type === Switch &&
          instance.props.accessibilityLabel === 'Tile gradients',
      );
    expect(gradientSwitch().props.value).toBe(true);
    expect(gradientSwitch().props.accessibilityRole).toBe('switch');
    const gradientCustomizer = () =>
      screen.root.find(
        (instance) => String(instance.type) === 'GradientCustomizerModalHost',
      );
    expect(gradientCustomizer().props.isVisible).toBe(false);

    await act(async () => {
      gradientSwitch().props.onValueChange(false);
      await Promise.resolve();
    });

    expect(gradientSwitch().props.value).toBe(false);
    expect(gradientCustomizer().props.isVisible).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      '@mobile/tile-gradients-enabled',
      'false',
    );
    expect(store.getState().general.tileGradientSettings?.enabled).toBe(false);

    await act(async () => {
      gradientSwitch().props.onValueChange(true);
      await Promise.resolve();
    });

    expect(gradientSwitch().props.value).toBe(true);
    expect(gradientCustomizer().props.isVisible).toBe(true);

    const customization = {
      angle: 135,
      colors: ['#123456', null, '#ABCDEF'] as [string, null, string],
      locations: [0, 35, 100] as [number, number, number],
      opacity: 80,
    };
    await act(async () => {
      gradientCustomizer().props.onSave(customization);
      await Promise.resolve();
    });

    expect(gradientCustomizer().props.isVisible).toBe(false);
    expect(store.getState().general.tileGradientSettings).toEqual({
      enabled: true,
      ...customization,
    });

    act(() => screen.unmount());
  });
});
