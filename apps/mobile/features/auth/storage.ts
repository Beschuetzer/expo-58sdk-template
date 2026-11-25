import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getBackendUrl } from '@/utils/platform';
import { logWarn } from '@/utils/logging';

export type StoredAccessToken = {
  accessToken: string;
  expiresAt: number;
  idToken?: string;
  refreshToken?: string;
  scope: string;
  tokenType: 'Bearer';
};

const ACCESS_TOKEN_STORAGE_KEY = 'expo58template.oauth.access-token';
const ID_TOKEN_STORAGE_KEY = 'expo58template.oauth.id-token';
const EXPIRY_SAFETY_WINDOW_MS = 30_000;

const webSessionToken: StoredAccessToken = {
  accessToken: '',
  expiresAt: Number.MAX_SAFE_INTEGER,
  scope: '',
  tokenType: 'Bearer',
};

let tokenSessionRevision = 0;
let tokenStorageQueue: Promise<void> = Promise.resolve();

function serializeAccessTokenOperation<T>(operation: () => Promise<T>) {
  const result = tokenStorageQueue.then(operation, operation);
  tokenStorageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function isStoredAccessToken(value: unknown): value is StoredAccessToken {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const token = value as Partial<StoredAccessToken>;
  return (
    typeof token.accessToken === 'string' &&
    token.tokenType === 'Bearer' &&
    typeof token.scope === 'string' &&
    typeof token.expiresAt === 'number' &&
    Number.isFinite(token.expiresAt)
  );
}

async function ensureSecureStoreAvailable() {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error('Secure storage is unavailable on this device.');
  }
}

async function clearNativeAccessTokenUnlocked() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
  await SecureStore.deleteItemAsync(ID_TOKEN_STORAGE_KEY);
}

async function loadNativeAccessToken(revision: number) {
  if (revision !== tokenSessionRevision) return null;
  await ensureSecureStoreAvailable();

  const serializedToken = await SecureStore.getItemAsync(
    ACCESS_TOKEN_STORAGE_KEY,
  );
  if (revision !== tokenSessionRevision || !serializedToken) return null;

  let parsedToken: unknown;
  try {
    parsedToken = JSON.parse(serializedToken) as unknown;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    await clearNativeAccessTokenUnlocked();
    return null;
  }

  if (!isStoredAccessToken(parsedToken)) {
    await clearNativeAccessTokenUnlocked();
    return null;
  }
  if (isAccessTokenExpiring(parsedToken) && !parsedToken.refreshToken) {
    await clearNativeAccessTokenUnlocked();
    return null;
  }

  const idToken = await SecureStore.getItemAsync(ID_TOKEN_STORAGE_KEY);
  if (revision !== tokenSessionRevision) return null;
  return idToken ? { ...parsedToken, idToken } : parsedToken;
}

export function isAccessTokenExpiring(token: StoredAccessToken) {
  return token.expiresAt <= Date.now() + EXPIRY_SAFETY_WINDOW_MS;
}

export function getAccessTokenSessionRevision() {
  return tokenSessionRevision;
}

export function loadAccessToken(): Promise<StoredAccessToken | null> {
  const revision = tokenSessionRevision;

  if (Platform.OS === 'web') {
    return fetch(`${getBackendUrl()}/auth/session`, {
      credentials: 'include',
    }).then((response) =>
      revision === tokenSessionRevision && response.ok ? webSessionToken : null,
    );
  }

  return serializeAccessTokenOperation(() => loadNativeAccessToken(revision));
}

export function saveAccessToken(token: StoredAccessToken): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();

  const revision = ++tokenSessionRevision;
  return serializeAccessTokenOperation(async () => {
    if (revision !== tokenSessionRevision) return;
    await ensureSecureStoreAvailable();

    const { idToken, ...tokenWithoutIdToken } = token;
    try {
      await SecureStore.setItemAsync(
        ACCESS_TOKEN_STORAGE_KEY,
        JSON.stringify(tokenWithoutIdToken),
        {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
      if (revision !== tokenSessionRevision) return;

      if (idToken) {
        await SecureStore.setItemAsync(ID_TOKEN_STORAGE_KEY, idToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } else {
        await SecureStore.deleteItemAsync(ID_TOKEN_STORAGE_KEY);
      }
    } catch (error) {
      if (revision === tokenSessionRevision) {
        try {
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
          await SecureStore.deleteItemAsync(ID_TOKEN_STORAGE_KEY);
        } catch (cleanupError) {
          logWarn('auth_access_token_cleanup_failed', {
            errorName:
              cleanupError instanceof Error
                ? cleanupError.name
                : 'UnknownError',
          });
        }
      }
      throw error;
    }
  });
}

export function persistRefreshedAccessTokenIfCurrent(
  refreshedToken: StoredAccessToken,
  originalToken: StoredAccessToken,
  expectedRevision: number,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(tokenSessionRevision === expectedRevision);
  }

  return serializeAccessTokenOperation(async () => {
    if (tokenSessionRevision !== expectedRevision) return false;
    const currentToken = await loadNativeAccessToken(expectedRevision);
    if (
      !currentToken ||
      tokenSessionRevision !== expectedRevision ||
      currentToken.accessToken !== originalToken.accessToken ||
      currentToken.refreshToken !== originalToken.refreshToken
    ) {
      return false;
    }

    const nextRevision = ++tokenSessionRevision;
    const { idToken, ...tokenWithoutIdToken } = refreshedToken;
    await ensureSecureStoreAvailable();
    await SecureStore.setItemAsync(
      ACCESS_TOKEN_STORAGE_KEY,
      JSON.stringify(tokenWithoutIdToken),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
    if (nextRevision !== tokenSessionRevision) return false;

    if (idToken) {
      await SecureStore.setItemAsync(ID_TOKEN_STORAGE_KEY, idToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await SecureStore.deleteItemAsync(ID_TOKEN_STORAGE_KEY);
    }
    return nextRevision === tokenSessionRevision;
  });
}

export function clearAccessToken(): Promise<void> {
  const revision = ++tokenSessionRevision;

  if (Platform.OS === 'web') {
    return fetch(`${getBackendUrl()}/auth/logout`, {
      credentials: 'include',
      method: 'POST',
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Session logout failed with HTTP ${response.status}.`);
      }
    });
  }

  return serializeAccessTokenOperation(async () => {
    if (revision !== tokenSessionRevision) return;
    await ensureSecureStoreAvailable();
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(ID_TOKEN_STORAGE_KEY);
  });
}

export async function clearAuthenticatedSession() {
  await clearAccessToken();
}
