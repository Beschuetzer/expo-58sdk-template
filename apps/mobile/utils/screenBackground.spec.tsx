import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import {
  ScreenBackgroundProvider,
  useScreenBackground,
} from './screenBackground';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

function ScreenBackgroundProbe() {
  const {
    screenBackground,
    screenBackgroundColor,
    customScreenBackgroundColor,
    setScreenBackground,
    setScreenBackgroundColor,
    setCustomScreenBackgroundColor,
  } = useScreenBackground();

  return (
    <>
      <Text
        testID="screen-background"
        onPress={() => setScreenBackground('classic')}
      >
        {screenBackground}
      </Text>
      <Text
        testID="screen-background-color"
        onPress={() => setScreenBackgroundColor('sage')}
      >
        {screenBackgroundColor}
      </Text>
      <Text
        testID="screen-background-custom-color"
        onPress={() => setCustomScreenBackgroundColor('#123abc')}
      >
        {customScreenBackgroundColor}
      </Text>
    </>
  );
}

describe('ScreenBackgroundProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  });

  it('restores and persists the background choice and color', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementation((key) =>
        Promise.resolve(
          key === '@mobile/screen-background'
            ? 'futuristic'
            : key === '@mobile/screen-background-color'
              ? 'sage'
              : null,
        ),
      );

    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <ScreenBackgroundProvider>
          <ScreenBackgroundProbe />
        </ScreenBackgroundProvider>,
      );
      await Promise.resolve();
    });

    const backgroundProbe = () =>
      screen.root.findByProps({ testID: 'screen-background' });
    const colorProbe = () =>
      screen.root.findByProps({ testID: 'screen-background-color' });
    expect(backgroundProbe().props.children).toBe('futuristic');
    expect(colorProbe().props.children).toBe('sage');

    await act(async () => {
      backgroundProbe().props.onPress();
      colorProbe().props.onPress();
      await Promise.resolve();
    });

    expect(backgroundProbe().props.children).toBe('classic');
    expect(colorProbe().props.children).toBe('sage');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background',
      'classic',
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background-color',
      'sage',
    );

    act(() => screen.unmount());
  });

  it('ignores stored values outside the supported options', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockResolvedValue('unsupported-background');

    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <ScreenBackgroundProvider>
          <ScreenBackgroundProbe />
        </ScreenBackgroundProvider>,
      );
      await Promise.resolve();
    });

    expect(
      screen.root.findByProps({ testID: 'screen-background' }).props.children,
    ).toBe('none');
    expect(
      screen.root.findByProps({ testID: 'screen-background-color' }).props
        .children,
    ).toBe('cream');

    act(() => screen.unmount());
  });

  it('restores and persists a custom background color', async () => {
    jest
      .mocked(AsyncStorage.getItem)
      .mockImplementation((key) =>
        Promise.resolve(
          key === '@mobile/screen-background-color'
            ? 'custom'
            : key === '@mobile/screen-background-custom-color'
              ? '#abc123'
              : null,
        ),
      );

    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderer.create(
        <ScreenBackgroundProvider>
          <ScreenBackgroundProbe />
        </ScreenBackgroundProvider>,
      );
      await Promise.resolve();
    });

    const colorProbe = () =>
      screen.root.findByProps({ testID: 'screen-background-color' });
    const customColorProbe = () =>
      screen.root.findByProps({ testID: 'screen-background-custom-color' });

    expect(colorProbe().props.children).toBe('custom');
    expect(customColorProbe().props.children).toBe('#ABC123');

    await act(async () => {
      customColorProbe().props.onPress();
      await Promise.resolve();
    });

    expect(colorProbe().props.children).toBe('custom');
    expect(customColorProbe().props.children).toBe('#123ABC');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background-color',
      'custom',
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/screen-background-custom-color',
      '#123ABC',
    );

    act(() => screen.unmount());
  });
});
