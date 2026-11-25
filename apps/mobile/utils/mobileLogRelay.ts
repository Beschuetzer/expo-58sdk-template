import type { LogEntry } from '@expo-50sdk-template/logging';
import type {
  MobileLogBatchRequest,
  MobileLogBatchResponse,
  MobileLogEntry,
} from '@expo-50sdk-template/shared-types';
import { AppState, Platform } from 'react-native';

import { getIsDevelopmentMode } from './environment';

const MAX_BATCH_SIZE = 25;
const MAX_PENDING_LOGS = 500;
const MAX_UNAUTHENTICATED_RETRIES = 1;
const FLUSH_DELAY_MS = 500;
const RETRY_DELAY_MS = 5000;
const relayEnabled = getIsDevelopmentMode();
const isWebPlatform = Platform?.OS === 'web';
const pendingEntries: LogEntry[] = [];

let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushInProgress = false;
let resolvingRelayToken = false;
let overflowWarningLogged = false;
let unauthenticatedRetryCount = 0;

function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  if (
    typeof timer === 'object' &&
    timer !== null &&
    'unref' in timer &&
    typeof timer.unref === 'function'
  ) {
    timer.unref();
  }
}

function scheduleFlush(delayMs = FLUSH_DELAY_MS, force = false): void {
  if (!relayEnabled || flushInProgress || pendingEntries.length === 0) return;
  if (flushTimer !== undefined) {
    if (!force) return;
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flushQueue();
  }, delayMs);
  unrefTimer(flushTimer);
}

function requeue(entries: LogEntry[]): void {
  pendingEntries.unshift(...entries);
  if (pendingEntries.length > MAX_PENDING_LOGS) {
    pendingEntries.length = MAX_PENDING_LOGS;
  }
}

function getHttpStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }
  return undefined;
}

function toMobileLogEntry(entry: LogEntry): MobileLogEntry {
  const { event, level, timestamp, ...fields } = entry;
  return {
    ...fields,
    timestamp,
    service: 'mobile',
    level,
    event,
  };
}

async function flushQueue(): Promise<void> {
  if (!relayEnabled || flushInProgress || pendingEntries.length === 0) return;

  flushInProgress = true;
  const batch = pendingEntries.splice(0, MAX_BATCH_SIZE);
  let shouldRetry = false;
  let tokenResolutionFailed = false;

  try {
    if (!isWebPlatform) {
      resolvingRelayToken = true;
      let accessToken: string | undefined;
      try {
        const { getValidAccessToken } =
          require('@/features/auth/tokenManager') as typeof import('@/features/auth/tokenManager');
        accessToken = (await getValidAccessToken())?.accessToken;
      } catch (error) {
        tokenResolutionFailed = true;
        throw error;
      } finally {
        resolvingRelayToken = false;
      }

      if (!accessToken) {
        requeue(batch);
        shouldRetry = unauthenticatedRetryCount < MAX_UNAUTHENTICATED_RETRIES;
        unauthenticatedRetryCount += 1;
        return;
      }
    }

    unauthenticatedRetryCount = 0;
    const { requestAuthenticatedJson } =
      require('@/features/auth/authenticatedClient') as typeof import('@/features/auth/authenticatedClient');
    const requestBody: MobileLogBatchRequest = {
      entries: batch.map(toMobileLogEntry),
    };
    resolvingRelayToken = true;
    try {
      await requestAuthenticatedJson<MobileLogBatchResponse>(
        '/api/v1/telemetry/logs',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
        { suppressLogging: true },
      );
    } finally {
      resolvingRelayToken = false;
    }
  } catch (error) {
    const statusCode = getHttpStatusCode(error);
    if ([400, 403, 404, 413, 415].includes(statusCode ?? 0)) {
      console.error('mobile_log_relay_rejected', { statusCode });
    } else if (tokenResolutionFailed) {
      requeue(batch);
      shouldRetry = unauthenticatedRetryCount < MAX_UNAUTHENTICATED_RETRIES;
      unauthenticatedRetryCount += 1;
      console.warn('mobile_log_relay_auth_unavailable', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    } else {
      requeue(batch);
      shouldRetry = true;
      console.warn('mobile_log_relay_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  } finally {
    flushInProgress = false;
    if (pendingEntries.length > 0) {
      scheduleFlush(shouldRetry ? RETRY_DELAY_MS : FLUSH_DELAY_MS);
    }
  }
}

export function queueMobileLogEntry(entry: LogEntry): void {
  if (!relayEnabled) return;
  if (resolvingRelayToken && entry.event.startsWith('auth_access_token_')) {
    return;
  }

  if (pendingEntries.length >= MAX_PENDING_LOGS) {
    pendingEntries.shift();
    if (!overflowWarningLogged) {
      overflowWarningLogged = true;
      console.warn('mobile_log_relay_queue_overflow');
    }
  }
  pendingEntries.push(entry);
  scheduleFlush();
}

if (relayEnabled) {
  AppState?.addEventListener?.('change', (state) => {
    if (state === 'active' || state === 'background') {
      scheduleFlush(0, true);
    }
  });
}
