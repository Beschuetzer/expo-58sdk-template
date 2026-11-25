import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { logError } from '@/utils/logging';

export const SCREEN_BACKGROUND_OPTIONS = [
  'none',
  'color',
  'default',
  'futuristic',
  'classic',
] as const;
export type ScreenBackgroundOption = (typeof SCREEN_BACKGROUND_OPTIONS)[number];

export const SCREEN_BACKGROUND_COLOR_OPTIONS = [
  'cream',
  'rose',
  'sage',
  'blue',
  'lavender',
  'slate',
] as const;
export type ScreenBackgroundColorPreset =
  (typeof SCREEN_BACKGROUND_COLOR_OPTIONS)[number];
export type ScreenBackgroundColor = ScreenBackgroundColorPreset | 'custom';

export const SCREEN_BACKGROUND_COLORS: Record<
  ScreenBackgroundColorPreset,
  { light: string; dark: string }
> = {
  cream: { light: '#F6F0E5', dark: '#28241C' },
  rose: { light: '#F4E4E6', dark: '#35232B' },
  sage: { light: '#E5ECDF', dark: '#253027' },
  blue: { light: '#E3EDF4', dark: '#22303B' },
  lavender: { light: '#EAE5F2', dark: '#2D2637' },
  slate: { light: '#E5E8ED', dark: '#282D35' },
};

const SCREEN_BACKGROUND_STORAGE_KEY = '@mobile/screen-background';
const SCREEN_BACKGROUND_COLOR_STORAGE_KEY = '@mobile/screen-background-color';
const SCREEN_BACKGROUND_CUSTOM_COLOR_STORAGE_KEY =
  '@mobile/screen-background-custom-color';
const DEFAULT_CUSTOM_SCREEN_BACKGROUND_COLOR = '#F6F0E5';

type ScreenBackgroundContextValue = {
  screenBackground: ScreenBackgroundOption;
  screenBackgroundColor: ScreenBackgroundColor;
  customScreenBackgroundColor: string;
  setScreenBackground: (background: ScreenBackgroundOption) => void;
  setScreenBackgroundColor: (color: ScreenBackgroundColorPreset) => void;
  setCustomScreenBackgroundColor: (color: string) => void;
};

const ScreenBackgroundContext = createContext<
  ScreenBackgroundContextValue | undefined
>(undefined);

function isScreenBackgroundOption(
  value: string | null,
): value is ScreenBackgroundOption {
  return SCREEN_BACKGROUND_OPTIONS.some(
    (availableBackground) => availableBackground === value,
  );
}

function isScreenBackgroundColor(
  value: string | null,
): value is ScreenBackgroundColorPreset {
  return SCREEN_BACKGROUND_COLOR_OPTIONS.some(
    (availableColor) => availableColor === value,
  );
}

function isValidCustomScreenBackgroundColor(
  value: string | null,
): value is string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}

export function ScreenBackgroundProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [screenBackground, setScreenBackgroundState] =
    useState<ScreenBackgroundOption>('none');
  const [screenBackgroundColor, setScreenBackgroundColorState] =
    useState<ScreenBackgroundColor>('cream');
  const [customScreenBackgroundColor, setCustomScreenBackgroundColorState] =
    useState(DEFAULT_CUSTOM_SCREEN_BACKGROUND_COLOR);
  const hasUserSelectedBackground = useRef(false);
  const hasUserSelectedColor = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(SCREEN_BACKGROUND_STORAGE_KEY)
      .then((storedBackground) => {
        if (
          !hasUserSelectedBackground.current &&
          isScreenBackgroundOption(storedBackground)
        ) {
          setScreenBackgroundState(storedBackground);
        }
      })
      .catch((error: unknown) => {
        logError('screen_background_load_failed', { error });
      });
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SCREEN_BACKGROUND_COLOR_STORAGE_KEY),
      AsyncStorage.getItem(SCREEN_BACKGROUND_CUSTOM_COLOR_STORAGE_KEY),
    ])
      .then(([storedColor, storedCustomColor]) => {
        if (!hasUserSelectedColor.current) {
          if (isScreenBackgroundColor(storedColor)) {
            setScreenBackgroundColorState(storedColor);
          } else if (
            storedColor === 'custom' &&
            isValidCustomScreenBackgroundColor(storedCustomColor)
          ) {
            setScreenBackgroundColorState('custom');
          }

          if (isValidCustomScreenBackgroundColor(storedCustomColor)) {
            setCustomScreenBackgroundColorState(
              storedCustomColor.toUpperCase(),
            );
          }
        }
      })
      .catch((error: unknown) => {
        logError('screen_background_color_load_failed', { error });
      });
  }, []);

  const setScreenBackground = useCallback(
    (nextBackground: ScreenBackgroundOption) => {
      hasUserSelectedBackground.current = true;
      setScreenBackgroundState(nextBackground);
      AsyncStorage.setItem(SCREEN_BACKGROUND_STORAGE_KEY, nextBackground).catch(
        (error: unknown) => {
          logError('screen_background_save_failed', {
            error,
            screenBackground: nextBackground,
          });
        },
      );
    },
    [],
  );

  const setScreenBackgroundColor = useCallback(
    (nextColor: ScreenBackgroundColorPreset) => {
      hasUserSelectedColor.current = true;
      setScreenBackgroundColorState(nextColor);
      AsyncStorage.setItem(
        SCREEN_BACKGROUND_COLOR_STORAGE_KEY,
        nextColor,
      ).catch((error: unknown) => {
        logError('screen_background_color_save_failed', {
          error,
          screenBackgroundColor: nextColor,
        });
      });
    },
    [],
  );
  const setCustomScreenBackgroundColor = useCallback((nextColor: string) => {
    if (!isValidCustomScreenBackgroundColor(nextColor)) {
      logError('screen_background_custom_color_invalid', {
        screenBackgroundColor: nextColor,
      });
      return;
    }

    const normalizedColor = nextColor.toUpperCase();
    hasUserSelectedColor.current = true;
    setScreenBackgroundColorState('custom');
    setCustomScreenBackgroundColorState(normalizedColor);
    AsyncStorage.setItem(SCREEN_BACKGROUND_COLOR_STORAGE_KEY, 'custom').catch(
      (error: unknown) => {
        logError('screen_background_color_save_failed', {
          error,
          screenBackgroundColor: 'custom',
        });
      },
    );
    AsyncStorage.setItem(
      SCREEN_BACKGROUND_CUSTOM_COLOR_STORAGE_KEY,
      normalizedColor,
    ).catch((error: unknown) => {
      logError('screen_background_custom_color_save_failed', {
        error,
        screenBackgroundColor: normalizedColor,
      });
    });
  }, []);

  const value = useMemo(
    () => ({
      screenBackground,
      screenBackgroundColor,
      customScreenBackgroundColor,
      setScreenBackground,
      setScreenBackgroundColor,
      setCustomScreenBackgroundColor,
    }),
    [
      screenBackground,
      screenBackgroundColor,
      customScreenBackgroundColor,
      setScreenBackground,
      setScreenBackgroundColor,
      setCustomScreenBackgroundColor,
    ],
  );

  return (
    <ScreenBackgroundContext.Provider value={value}>
      {children}
    </ScreenBackgroundContext.Provider>
  );
}

export function useScreenBackground(): ScreenBackgroundContextValue {
  const context = useContext(ScreenBackgroundContext);
  if (!context) {
    return {
      screenBackground: 'none',
      screenBackgroundColor: 'cream',
      customScreenBackgroundColor: DEFAULT_CUSTOM_SCREEN_BACKGROUND_COLOR,
      setScreenBackground: () => undefined,
      setScreenBackgroundColor: () => undefined,
      setCustomScreenBackgroundColor: () => undefined,
    };
  }

  return context;
}
