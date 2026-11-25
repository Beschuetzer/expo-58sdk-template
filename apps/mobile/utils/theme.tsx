import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import Colors from '@/constants/Colors';

const THEME_STORAGE_KEY = '@expo-58sdk-template/theme-mode';

export const themeModes = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
} as const;

export type ThemeMode = keyof typeof themeModes;
export type ColorScheme = 'light' | 'dark';

export function resolveColorScheme(
  mode: ThemeMode,
  systemColorScheme: ColorScheme,
): ColorScheme {
  return mode === 'system' ? systemColorScheme : mode;
}

export function getNavigationHeaderOptions(colorScheme: ColorScheme) {
  return {
    headerStyle: { backgroundColor: Colors[colorScheme].background },
    headerTintColor: Colors[colorScheme].tint,
  };
}

export function getNavigationTabBarOptions(colorScheme: ColorScheme) {
  return {
    tabBarStyle: {
      backgroundColor: Colors[colorScheme].background,
      borderTopColor: Colors[colorScheme].border,
    },
    tabBarActiveTintColor: Colors[colorScheme].tint,
    tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
  };
}

type ThemeContextValue = {
  colorScheme: ColorScheme;
  mode: ThemeMode;
  modes: typeof themeModes;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme() ?? 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (isMounted && isThemeMode(storedMode)) {
          setModeState(storedMode);
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load the saved theme preference.', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(
      (error: unknown) => {
        console.error('Unable to save the theme preference.', error);
      },
    );
  }, []);

  const value = useMemo(
    () => ({
      colorScheme: resolveColorScheme(mode, systemColorScheme),
      mode,
      modes: themeModes,
      setMode,
    }),
    [mode, setMode, systemColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const systemColorScheme = useSystemColorScheme() ?? 'light';

  if (context) return context;

  return {
    colorScheme: systemColorScheme,
    mode: 'system',
    modes: themeModes,
    setMode: () => {
      console.error('ThemeModeProvider is required to change the theme.');
    },
  };
}
