import type { DiscoveryDocument } from 'expo-auth-session';
import { Platform } from 'react-native';

import {
  fetchIdentityProviderDiscovery,
  normalizeIdentityProviderDiscovery,
  refreshAccessToken,
} from './client';
import {
  clearAuthenticatedSession,
  getAccessTokenSessionRevision,
  isAccessTokenExpiring,
  loadAccessToken,
  persistRefreshedAccessTokenIfCurrent,
  type StoredAccessToken,
} from './storage';
import {
  DefinitiveOAuthRejectionError,
  MissingTokenEndpointError,
  RefreshOutcomeUnknownError,
} from './errors';

import { logWarn } from '@/utils/logging';
import { getIdentityProviderUrl } from '@/utils/platform';

export class MissingRefreshTokenError extends Error {
  constructor() {
    super('No refresh token is available.');
    this.name = 'MissingRefreshTokenError';
  }
}

let cachedDiscovery:
  | { issuerUrl: string; discovery: DiscoveryDocument }
  | undefined;

let pendingRefresh:
  | {
      sessionRevision: number;
      promise: Promise<StoredAccessToken | null>;
    }
  | undefined;

export async function getIdentityProviderDiscovery(
  signal?: AbortSignal,
): Promise<DiscoveryDocument> {
  if (signal?.aborted) {
    const error = new Error('The request was cancelled.');
    error.name = 'AbortError';
    throw error;
  }

  const issuerUrl = getIdentityProviderUrl();
  if (cachedDiscovery?.issuerUrl === issuerUrl) return cachedDiscovery.discovery;

  const discovery = normalizeIdentityProviderDiscovery(
    await fetchIdentityProviderDiscovery(issuerUrl, signal),
    issuerUrl,
  );
  if (signal?.aborted) {
    const error = new Error('The request was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
  cachedDiscovery = { issuerUrl, discovery };
  return discovery;
}

async function refreshCurrentToken(
  token: StoredAccessToken | null,
  sessionRevision: number,
): Promise<StoredAccessToken | null> {
  const existingRefresh = pendingRefresh;
  if (existingRefresh?.sessionRevision === sessionRevision) {
    return existingRefresh.promise;
  }

  const promise = (async () => {
    const discovery = await getIdentityProviderDiscovery();
    if (Platform.OS !== 'web' && !discovery.tokenEndpoint) {
      throw new MissingTokenEndpointError();
    }

    let refreshedToken: StoredAccessToken;
    try {
      refreshedToken = await refreshAccessToken(token ?? undefined, discovery);
    } catch (error) {
      if (error instanceof DefinitiveOAuthRejectionError) {
        await clearAuthenticatedSession();
        throw error;
      }

      await clearAuthenticatedSession();
      throw new RefreshOutcomeUnknownError();
    }

    if (getAccessTokenSessionRevision() !== sessionRevision) {
      return loadAccessToken();
    }
    if (Platform.OS === 'web') return refreshedToken;

    if (!token) return null;
    const persisted = await persistRefreshedAccessTokenIfCurrent(
      refreshedToken,
      token,
      sessionRevision,
    );
    return persisted ? refreshedToken : loadAccessToken();
  })();

  const pending = { sessionRevision, promise };
  pendingRefresh = pending;
  const clearPending = () => {
    if (pendingRefresh === pending) pendingRefresh = undefined;
  };
  promise.then(clearPending, clearPending);
  return promise;
}

export async function getValidAccessToken(options: {
  rejectedAccessToken?: string;
  forceRefresh?: boolean;
} = {}): Promise<StoredAccessToken | null> {
  const sessionRevision = getAccessTokenSessionRevision();
  const token = await loadAccessToken();
  if (getAccessTokenSessionRevision() !== sessionRevision) {
    return loadAccessToken();
  }

  if (Platform.OS === 'web') {
    if (!options.forceRefresh && options.rejectedAccessToken === undefined) {
      return token;
    }
    return refreshCurrentToken(token, sessionRevision);
  }
  if (!token) return null;
  if (
    options.rejectedAccessToken !== undefined &&
    token.accessToken !== options.rejectedAccessToken
  ) {
    return token;
  }

  const shouldRefresh =
    options.forceRefresh ||
    token.accessToken === options.rejectedAccessToken ||
    isAccessTokenExpiring(token);
  if (!shouldRefresh) return token;
  if (!token.refreshToken) {
    if (options.forceRefresh) throw new MissingRefreshTokenError();
    return null;
  }
  return refreshCurrentToken(token, sessionRevision);
}
