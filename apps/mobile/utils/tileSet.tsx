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
import { useDispatch, useSelector } from 'react-redux';

import { TILE_SETS, type TileSet } from '@/constants/homeTileArtwork';
import {
  setTileGradientCustomization as setTileGradientCustomizationAction,
  setTileGradientsEnabled as setTileGradientsEnabledAction,
} from '@/state/slices/generalSlice';
import type { AppDispatch, RootState } from '@/state/store';
import { logError } from '@/utils/logging';
import {
  DEFAULT_TILE_GRADIENT_SETTINGS,
  type TileGradientCustomization,
  type TileGradientSettings,
} from '@/utils/tileGradient';

const TILE_SET_STORAGE_KEY = '@mobile/tile-set';
const LEGACY_TILE_GRADIENTS_STORAGE_KEY = '@mobile/tile-gradients-enabled';

type TileSetContextValue = {
  tileSet: TileSet;
  tileSets: typeof TILE_SETS;
  setTileSet: (tileSet: TileSet) => void;
  tileGradientsEnabled: boolean;
  setTileGradientsEnabled: (enabled: boolean) => void;
  tileGradientSettings: TileGradientSettings;
  setTileGradientCustomization: (
    customization: TileGradientCustomization,
  ) => void;
};

const TileSetContext = createContext<TileSetContextValue | undefined>(
  undefined,
);

function isTileSet(value: string | null): value is TileSet {
  return (
    typeof value === 'string' &&
    TILE_SETS.some((availableTileSet) => availableTileSet === value)
  );
}

export function TileSetProvider({ children }: { children: ReactNode }) {
  const [tileSet, setTileSetState] = useState<TileSet>('default');
  const hasUserSelectedTileSet = useRef(false);
  const hasCheckedLegacyGradientSettings = useRef(false);
  const hasUserChangedGradientSettings = useRef(false);
  const dispatch = useDispatch<AppDispatch>();
  const tileGradientSettings = useSelector<RootState, TileGradientSettings>(
    (state) =>
      state.general.tileGradientSettings ?? DEFAULT_TILE_GRADIENT_SETTINGS,
  );
  const hasPersistedGradientSettings = useSelector(
    (state: RootState) => state.general.tileGradientSettings !== undefined,
  );

  useEffect(() => {
    AsyncStorage.getItem(TILE_SET_STORAGE_KEY)
      .then((storedTileSet) => {
        if (!hasUserSelectedTileSet.current && isTileSet(storedTileSet)) {
          setTileSetState(storedTileSet);
        }
      })
      .catch((error: unknown) => {
        logError('tile_set_load_failed', { error });
      });
  }, []);

  useEffect(() => {
    if (hasCheckedLegacyGradientSettings.current) {
      return;
    }

    hasCheckedLegacyGradientSettings.current = true;
    AsyncStorage.getItem(LEGACY_TILE_GRADIENTS_STORAGE_KEY)
      .then(async (storedValue) => {
        if (storedValue !== 'true' && storedValue !== 'false') {
          return;
        }

        if (
          !hasUserChangedGradientSettings.current &&
          !hasPersistedGradientSettings
        ) {
          dispatch(setTileGradientsEnabledAction(storedValue === 'true'));
        }

        await AsyncStorage.removeItem(LEGACY_TILE_GRADIENTS_STORAGE_KEY);
      })
      .catch((error: unknown) => {
        logError('tile_gradients_migration_failed', { error });
      });
  }, [dispatch, hasPersistedGradientSettings]);

  const setTileSet = useCallback((nextTileSet: TileSet) => {
    hasUserSelectedTileSet.current = true;
    setTileSetState(nextTileSet);
    AsyncStorage.setItem(TILE_SET_STORAGE_KEY, nextTileSet).catch(
      (error: unknown) => {
        logError('tile_set_save_failed', { error, tileSet: nextTileSet });
      },
    );
  }, []);

  const setTileGradientsEnabled = useCallback(
    (enabled: boolean) => {
      hasUserChangedGradientSettings.current = true;
      dispatch(setTileGradientsEnabledAction(enabled));
    },
    [dispatch],
  );
  const setTileGradientCustomization = useCallback(
    (customization: TileGradientCustomization) => {
      hasUserChangedGradientSettings.current = true;
      dispatch(setTileGradientCustomizationAction(customization));
    },
    [dispatch],
  );

  const value = useMemo(
    () => ({
      tileSet,
      tileSets: TILE_SETS,
      setTileSet,
      tileGradientsEnabled: tileGradientSettings.enabled,
      setTileGradientsEnabled,
      tileGradientSettings,
      setTileGradientCustomization,
    }),
    [
      tileSet,
      setTileSet,
      tileGradientSettings,
      setTileGradientsEnabled,
      setTileGradientCustomization,
    ],
  );

  return (
    <TileSetContext.Provider value={value}>{children}</TileSetContext.Provider>
  );
}

export function useTileSet() {
  const context = useContext(TileSetContext);
  if (!context) {
    return {
      tileSet: 'default' as const,
      tileSets: TILE_SETS,
      setTileSet: (_tileSet: TileSet) => undefined,
      tileGradientsEnabled: DEFAULT_TILE_GRADIENT_SETTINGS.enabled,
      setTileGradientsEnabled: (_enabled: boolean) => undefined,
      tileGradientSettings: DEFAULT_TILE_GRADIENT_SETTINGS,
      setTileGradientCustomization: (
        _customization: TileGradientCustomization,
      ) => undefined,
    };
  }

  return context;
}
