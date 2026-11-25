import type { HealthResponse } from '@expo-50sdk-template/shared-types';

import { getBackendUrl, getIdentityProviderUrl } from '@/utils/helpers';
import { logDebug, logWarn } from '@/utils/logging';

export type ServiceConnectionStatus = 'connected' | 'unavailable';

export type ExternalServiceConnections = {
  backend: ServiceConnectionStatus;
  identityProvider: ServiceConnectionStatus;
};

const SERVICE_CHECK_TIMEOUT_MS = 10_000;

export async function getBackendHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const startedAt = Date.now();
  try {
    const response = signal
      ? await fetch(`${getBackendUrl()}/health`, { signal })
      : await fetch(`${getBackendUrl()}/health`);
    const result = (await response.json()) as HealthResponse;

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    logDebug('backend_health_check_completed', {
      durationMs: Date.now() - startedAt,
      statusCode: response.status,
      status: result.status,
    });
    return result;
  } catch (error) {
    logWarn('backend_health_check_failed', {
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
}

async function checkService(
  service: 'backend' | 'identity_provider',
  check: (signal: AbortSignal) => Promise<boolean>,
  issuerUrl?: string,
): Promise<ServiceConnectionStatus> {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SERVICE_CHECK_TIMEOUT_MS,
  );

  try {
    const status = (await check(controller.signal))
      ? 'connected'
      : 'unavailable';
    logDebug('external_service_check_completed', {
      durationMs: Date.now() - startedAt,
      ...(issuerUrl ? { issuerUrl } : {}),
      service,
      status,
    });
    return status;
  } catch (error) {
    logWarn('external_service_check_failed', {
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      ...(issuerUrl ? { issuerUrl } : {}),
      service,
    });
    return 'unavailable';
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkExternalServiceConnections(): Promise<ExternalServiceConnections> {
  const issuerUrl = getIdentityProviderUrl().replace(/\/+$/, '');
  const [backend, identityProvider] = await Promise.all([
    checkService('backend', async (signal) => {
      const health = await getBackendHealth(signal);
      return health.status === 'ok';
    }),
    checkService(
      'identity_provider',
      async (signal) => {
        const response = await fetch(
          `${issuerUrl}/.well-known/openid-configuration`,
          { signal },
        );
        return response.ok;
      },
      issuerUrl,
    ),
  ]);

  logDebug('external_service_checks_completed', {
    backend,
    identityProvider,
  });
  return { backend, identityProvider };
}
