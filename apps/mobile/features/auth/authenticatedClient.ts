import { Platform } from 'react-native';

import { getValidAccessToken } from './tokenManager';
import {
  ApiRequestTimeoutError,
  AuthenticatedRequestError,
  AUTH_REQUEST_TIMEOUT_MS,
} from './errors';

import { getBackendUrl } from '@/utils/platform';
import { logWarn } from '@/utils/logging';

export { ApiRequestTimeoutError, AuthenticatedRequestError };

type RequestOptions = {
  fallbackErrorMessage?: (statusCode: number) => string;
};

type AuthenticatedRequestResult<T> = {
  data: T;
  token: { idToken?: string } | null;
};

export async function requestAuthenticatedJson<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<AuthenticatedRequestResult<T>> {
  const controller = new AbortController();
  const externalSignal = init.signal ?? undefined;
  const abortFromExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, {
      once: true,
    });
  }

  let requestTimedOut = false;
  const timeoutId = setTimeout(() => {
    requestTimedOut = true;
    controller.abort();
  }, AUTH_REQUEST_TIMEOUT_MS);

  try {
    let token = Platform.OS === 'web' ? null : await getValidAccessToken();
    if (Platform.OS !== 'web' && !token?.accessToken) {
      throw new Error('Authentication is required.');
    }

    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    if (Platform.OS !== 'web' && token?.accessToken) {
      headers.set('authorization', `Bearer ${token.accessToken}`);
    }

    const requestInit: RequestInit = {
      ...init,
      credentials: Platform.OS === 'web' ? 'include' : undefined,
      headers,
      signal: controller.signal,
    };

    const backendUrl = getBackendUrl();
    let response = await fetch(`${backendUrl}${path}`, requestInit);
    if (response.status === 401) {
      const refreshedToken = await getValidAccessToken({
        forceRefresh: true,
        ...(token?.accessToken
          ? { rejectedAccessToken: token.accessToken }
          : {}),
      });
      const canRetry =
        Platform.OS === 'web' ||
        Boolean(
          refreshedToken?.accessToken &&
            refreshedToken.accessToken !== token?.accessToken,
        );
      if (refreshedToken && canRetry) {
        token = refreshedToken;
        if (Platform.OS !== 'web' && token.accessToken) {
          headers.set('authorization', `Bearer ${token.accessToken}`);
        }
        response = await fetch(`${backendUrl}${path}`, requestInit);
      }
    }

    const text = await response.text();
    let data: unknown;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch (error) {
        if (response.ok) throw error;
      }
    }

    if (!response.ok) {
      const message =
        data &&
        typeof data === 'object' &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : options.fallbackErrorMessage?.(response.status) ??
            `Request failed with HTTP ${response.status}.`;
      throw new AuthenticatedRequestError(response.status, message);
    }

    return {
      data: data as T,
      token: token ? { idToken: token.idToken } : null,
    };
  } catch (error) {
    if (requestTimedOut) throw new ApiRequestTimeoutError();
    logWarn('authenticated_request_failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      method: init.method ?? 'GET',
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }
}
