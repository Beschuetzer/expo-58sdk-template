import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../store';

import { Error } from '@/types/errors';
import {
  createDefaultTileGradientSettings,
  type TileGradientCustomization,
  type TileGradientSettings,
} from '@/utils/tileGradient';

export const ERRORS_INITIAL = (() => [] as Error[])();

export type GeneralState = {
  errors: Error[];
  selectedRelationshipId: string | null;
  tileGradientSettings?: TileGradientSettings;
};

const initialState: GeneralState = {
  errors: ERRORS_INITIAL,
  selectedRelationshipId: null,
  tileGradientSettings: createDefaultTileGradientSettings(),
};

const normalizeError = (value: unknown): Error | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<Error>;
  const message =
    typeof candidate.message === 'string' && candidate.message.trim().length > 0
      ? candidate.message
      : 'Unknown error';

  return {
    message,
    statusCode:
      typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : undefined,
    stack: typeof candidate.stack === 'string' ? candidate.stack : undefined,
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
    code:
      typeof candidate.code === 'string' || typeof candidate.code === 'number'
        ? candidate.code
        : undefined,
    error:
      candidate.error && typeof candidate.error === 'object'
        ? {
            message:
              typeof candidate.error.message === 'string'
                ? candidate.error.message
                : undefined,
            stack:
              typeof candidate.error.stack === 'string'
                ? candidate.error.stack
                : undefined,
            name:
              typeof candidate.error.name === 'string'
                ? candidate.error.name
                : undefined,
            code:
              typeof candidate.error.code === 'string' ||
              typeof candidate.error.code === 'number'
                ? candidate.error.code
                : undefined,
          }
        : undefined,
  };
};

export const generalSlice = createSlice({
  name: 'general',
  initialState,
  reducers: {
    resetErrors: (state: GeneralState) => {
      state.errors = ERRORS_INITIAL;
    },
    setError: (
      state: GeneralState,
      action: PayloadAction<GeneralState['errors'][number]>,
    ) => {
      const error = normalizeError(action.payload);
      if (!error || !error.message) {
        return;
      }
      const currentErrors = Array.isArray(state.errors) ? state.errors : [];
      state.errors = [...currentErrors, error];
    },
    setErrors: (
      state: GeneralState,
      action: PayloadAction<GeneralState['errors']>,
    ) => {
      const currentErrors = Array.isArray(state.errors) ? state.errors : [];
      const errors = (action.payload || [])
        .map((error) => normalizeError(error))
        .filter(Boolean) as Error[];
      if (errors.length === 0) {
        state.errors = ERRORS_INITIAL;
        return;
      }
      state.errors = [...currentErrors, ...errors];
    },
    setSelectedRelationshipId: (
      state: GeneralState,
      action: PayloadAction<string | null>,
    ) => {
      state.selectedRelationshipId = action.payload;
    },
    setTileGradientsEnabled: (
      state: GeneralState,
      action: PayloadAction<boolean>,
    ) => {
      const settings =
        state.tileGradientSettings ?? createDefaultTileGradientSettings();
      settings.enabled = action.payload;
      state.tileGradientSettings = settings;
    },
    setTileGradientCustomization: (
      state: GeneralState,
      action: PayloadAction<TileGradientCustomization>,
    ) => {
      state.tileGradientSettings = {
        ...(state.tileGradientSettings ?? createDefaultTileGradientSettings()),
        ...action.payload,
      };
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  resetErrors,
  setError,
  setErrors,
  setSelectedRelationshipId,
  setTileGradientCustomization,
  setTileGradientsEnabled,
} = generalSlice.actions;

export default generalSlice.reducer;

export const errorSelector = (state: RootState) =>
  state[generalSlice.name].errors;

export const selectedRelationshipIdSelector = (state: RootState) =>
  state[generalSlice.name].selectedRelationshipId;

export const tileGradientSettingsSelector = (state: RootState) =>
  state[generalSlice.name].tileGradientSettings ??
  createDefaultTileGradientSettings();
