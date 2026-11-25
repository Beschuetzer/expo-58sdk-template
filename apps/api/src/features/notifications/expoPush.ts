import type { NotificationTarget } from '@expo-50sdk-template/shared-types';

export const MAX_EXPO_PUSH_BATCH_SIZE = 100;

const EXPO_PUSH_SERVICE_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_TIMEOUT_MS = 10_000;

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: string;
  data: {
    eventId: string;
    notificationId: string;
    target?: NotificationTarget;
  };
};

export type ExpoPushTicket =
  | { status: 'ok' }
  | { status: 'error'; message?: string; errorCode?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function sendExpoPushMessages(
  messages: readonly ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];
  if (messages.length > MAX_EXPO_PUSH_BATCH_SIZE) {
    throw new Error(
      `Expo push requests cannot exceed ${MAX_EXPO_PUSH_BATCH_SIZE} messages.`,
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXPO_PUSH_TIMEOUT_MS);
  try {
    const response = await fetch(EXPO_PUSH_SERVICE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Expo push service returned HTTP ${response.status}.`);
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw new Error('Expo push service returned an invalid response.');
    }
    if (payload.data.length !== messages.length) {
      throw new Error('Expo push service returned an unexpected ticket count.');
    }

    return payload.data.map((value, index): ExpoPushTicket => {
      if (!isRecord(value)) {
        throw new Error(`Expo push ticket ${index} is invalid.`);
      }
      if (value.status === 'ok') return { status: 'ok' };
      if (value.status !== 'error') {
        throw new Error(`Expo push ticket ${index} has an invalid status.`);
      }

      const details = isRecord(value.details) ? value.details : undefined;
      return {
        status: 'error',
        ...(typeof value.message === 'string'
          ? { message: value.message }
          : {}),
        ...(typeof details?.error === 'string'
          ? { errorCode: details.error }
          : {}),
      };
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
