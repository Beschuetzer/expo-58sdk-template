import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { COLORS } from '@/constants/colors';

const THEME_STORAGE_KEY = '@mobile/theme-mode';

export const themeModes = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
} as const;

export type ThemeMode = keyof typeof themeModes;
export type ColorScheme = 'light' | 'dark';

export function getNavigationHeaderOptions(colorScheme: ColorScheme) {
  const colors = COLORS[colorScheme];

  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.tint,
  };
}

export function getNavigationTabBarOptions(colorScheme: ColorScheme) {
  const colors = COLORS[colorScheme];

  return {
    tabBarStyle: {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
    },
    tabBarActiveTintColor: colors.tint,
    tabBarInactiveTintColor: colors.tabIconDefault,
  };
}

export function resolveColorScheme(
  mode: ThemeMode,
  systemColorScheme: ColorScheme,
): ColorScheme {
  return mode === 'system' ? systemColorScheme : mode;
}

export function getStatusBarStyle(colorScheme: ColorScheme) {
  return colorScheme === 'dark' ? 'light' : 'dark';
}

export function getNavigationBarButtonStyle(
  colorScheme: ColorScheme,
): 'dark' | 'light' {
  return colorScheme === 'dark' ? 'light' : 'dark';
}

type ThemeContextValue = {
  colorScheme: ColorScheme;
  mode: ThemeMode;
  modes: typeof themeModes;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme() ?? 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');
  const colorScheme = resolveColorScheme(mode, systemColorScheme);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (
          storedMode === 'system' ||
          storedMode === 'light' ||
          storedMode === 'dark'
        ) {
          setModeState(storedMode);
        }
      })
      .catch(() => undefined);
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const value = useMemo(
    () => ({ colorScheme, mode, modes: themeModes, setMode }),
    [colorScheme, mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  const systemColorScheme = useSystemColorScheme() ?? 'light';

  if (!context) {
    return {
      colorScheme: systemColorScheme,
      mode: 'system' as const,
      modes: themeModes,
      setMode: (_mode: ThemeMode) => undefined,
    };
  }

  return context;
}
