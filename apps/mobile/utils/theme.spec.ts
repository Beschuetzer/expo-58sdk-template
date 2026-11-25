import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { useColorScheme } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import {
  getNavigationBarButtonStyle,
  getNavigationHeaderOptions,
  getNavigationTabBarOptions,
  getStatusBarStyle,
  ThemeModeProvider,
  resolveColorScheme,
  themeModes,
  useThemeMode,
} from './theme';

import { COLORS } from '@/constants/colors';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(() => 'dark'),
}));

function getContrastRatio(foreground: string, background: string) {
  const getRelativeLuminance = (color: string) => {
    const hex = color.slice(1);
    const normalizedHex =
      hex.length === 3
        ? [...hex].map((channel) => `${channel}${channel}`).join('')
        : hex;
    const channels = [0, 2, 4].map((start) => {
      const channel = Number.parseInt(
        normalizedHex.slice(start, start + 2),
        16,
      );
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('supports system, light, and dark modes', () => {
    expect(Object.keys(themeModes)).toEqual(['system', 'light', 'dark']);
  });

  it('follows the system scheme only in system mode', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });

  it('uses status bar content colors that contrast with the selected theme', () => {
    expect(getStatusBarStyle('light')).toBe('dark');
    expect(getStatusBarStyle('dark')).toBe('light');
  });

  it('uses navigation bar buttons that contrast with the selected theme', () => {
    expect(getNavigationBarButtonStyle('light')).toBe('dark');
    expect(getNavigationBarButtonStyle('dark')).toBe('light');
  });

  it('preserves dark-mode AAA contrast and configured light gray tokens', () => {
    const darkGrayTextColors = [
      [COLORS.dark.mutedText, COLORS.dark.background],
      [COLORS.dark.mutedText, '#262626'],
      [COLORS.dark.disabled, COLORS.dark.background],
      [COLORS.dark.disabled, '#262626'],
      [COLORS.dark.tabIconDefault, COLORS.dark.background],
    ];

    darkGrayTextColors.forEach(([foreground, background]) => {
      expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(
        7,
      );
    });
    expect(COLORS.light.mutedText).toBe('#d0d0d0');
    expect(COLORS.light.disabled).toBe('#d0d0d0');
    expect(COLORS.light.tabIconDefault).toBe('#666');
  });

  it('applies the selected colors to navigation headers and tab bars', () => {
    expect(getNavigationHeaderOptions('light')).toEqual({
      headerStyle: { backgroundColor: '#fff' },
      headerTintColor: '#1a1a1a',
    });
    expect(getNavigationHeaderOptions('dark')).toEqual({
      headerStyle: { backgroundColor: '#000' },
      headerTintColor: '#fff',
    });
    expect(getNavigationTabBarOptions('light')).toEqual({
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#ccc' },
      tabBarActiveTintColor: '#1a1a1a',
      tabBarInactiveTintColor: '#666',
    });
    expect(getNavigationTabBarOptions('dark')).toEqual({
      tabBarStyle: { backgroundColor: '#000', borderTopColor: '#222' },
      tabBarActiveTintColor: '#fff',
      tabBarInactiveTintColor: '#ccc',
    });
  });

  it('hydrates the persisted theme mode and exposes the active mode', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');

    let current: ReturnType<typeof useThemeMode> | undefined;

    const TestConsumer = () => {
      current = useThemeMode();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          ThemeModeProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(current?.mode).toBe('light');
    expect(current?.colorScheme).toBe('light');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@mobile/theme-mode');
  });

  it('updates the theme mode and persists it', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    let current: ReturnType<typeof useThemeMode> | undefined;

    const TestConsumer = () => {
      current = useThemeMode();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          ThemeModeProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => current?.setMode('dark'));

    expect(current?.mode).toBe('dark');
    expect(current?.colorScheme).toBe('dark');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/theme-mode',
      'dark',
    );
  });

  it('provides the system fallback when no provider is present', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');

    let current: ReturnType<typeof useThemeMode> | undefined;

    const TestConsumer = () => {
      current = useThemeMode();
      return null;
    };

    renderer.create(React.createElement(TestConsumer));

    expect(current).toEqual({
      colorScheme: 'light',
      mode: 'system',
      modes: themeModes,
      setMode: expect.any(Function),
    });
  });

  it('falls back to light when the system scheme is unavailable', async () => {
    (useColorScheme as jest.Mock).mockReturnValue(null);

    let current: ReturnType<typeof useThemeMode> | undefined;

    const TestConsumer = () => {
      current = useThemeMode();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          ThemeModeProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(resolveColorScheme('system', 'light')).toBe('light');
    expect(current).toEqual({
      colorScheme: 'light',
      mode: 'system',
      modes: themeModes,
      setMode: expect.any(Function),
    });
  });

  it('hydrates valid persisted themes and ignores invalid values', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid');
    let current: ReturnType<typeof useThemeMode> | undefined;

    const TestConsumer = () => {
      current = useThemeMode();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          ThemeModeProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(current?.mode).toBe('system');

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');

    await act(async () => {
      renderer.create(
        React.createElement(
          ThemeModeProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(current?.mode).toBe('dark');
  });

  it('accepts system and dark persisted values and keeps the fallback setter safe without a provider', async () => {
    const persistedModes: ('system' | 'dark')[] = ['system', 'dark'];

    for (const persistedMode of persistedModes) {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(persistedMode);

      let current: ReturnType<typeof useThemeMode> | undefined;
      const TestConsumer = () => {
        current = useThemeMode();
        return null;
      };

      await act(async () => {
        renderer.create(
          React.createElement(
            ThemeModeProvider,
            null,
            React.createElement(TestConsumer, null),
          ),
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(current?.mode).toBe(persistedMode);
      expect(current?.colorScheme).toBe('dark');
    }

    (useColorScheme as jest.Mock).mockReturnValue('light');

    let fallback: ReturnType<typeof useThemeMode> | undefined;
    const FallbackConsumer = () => {
      fallback = useThemeMode();
      return null;
    };

    renderer.create(React.createElement(FallbackConsumer));

    expect(fallback).toEqual({
      colorScheme: 'light',
      mode: 'system',
      modes: themeModes,
      setMode: expect.any(Function),
    });
    expect(() => fallback?.setMode('dark')).not.toThrow();
  });

  it('honors a persisted system mode before falling back to the device scheme', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('system');
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    let current: ReturnType<typeof useThemeMode> | undefined;

    const TestConsumer = () => {
      current = useThemeMode();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          ThemeModeProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(current?.mode).toBe('system');
    expect(current?.colorScheme).toBe('dark');
  });

  it('ignores storage failures while updating the theme mode', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
      new Error('read failed'),
    );
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
      new Error('set failed'),
    );

    let current: ReturnType<typeof useThemeMode> | undefined;

    const TestConsumer = () => {
      current = useThemeMode();
      return null;
    };

    await act(async () => {
      renderer.create(
        React.createElement(
          ThemeModeProvider,
          null,
          React.createElement(TestConsumer, null),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      expect(() => current?.setMode('dark')).not.toThrow();
    });

    expect(current?.mode).toBe('dark');
    expect(current?.colorScheme).toBe('dark');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@mobile/theme-mode',
      'dark',
    );
  });
});
