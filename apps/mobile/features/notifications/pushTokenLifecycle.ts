import AsyncStorage from '@react-native-async-storage/async-storage';

import { unregisterPushToken as unregisterPushTokenApi } from '@/features/payment-requests/api';
import { logWarn } from '@/utils/logging';

const PUSH_TOKEN_STORAGE_KEY = '@mobile/notification-push-token';

type PushRegistrationOperation = (signal: AbortSignal) => Promise<void>;

type ActivePushRegistration = {
  controller: AbortController;
  completion: Promise<void>;
};

let activePushRegistration: ActivePushRegistration | null = null;

export function startPushTokenRegistration(
  operation: PushRegistrationOperation,
) {
  const previousRegistration = activePushRegistration;
  previousRegistration?.controller.abort();

  const controller = new AbortController();
  const registration: ActivePushRegistration = {
    controller,
    completion: Promise.resolve(),
  };
  registration.completion = Promise.resolve()
    .then(async () => {
      if (previousRegistration) await previousRegistration.completion;
      if (!controller.signal.aborted) {
        await operation(controller.signal);
      }
    })
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        logWarn('push_token_registration_failed', {
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    })
    .finally(() => {
      if (activePushRegistration === registration) {
        activePushRegistration = null;
      }
    });
  activePushRegistration = registration;
  return controller;
}

export function stopPushTokenRegistration(controller: AbortController) {
  controller.abort();
}

export async function savePushTokenForSignOut(token: string) {
  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}

async function cancelPushTokenRegistration() {
  const registration = activePushRegistration;
  if (!registration) return;
  registration.controller.abort();
  await registration.completion;
}

export async function unregisterPushTokenBeforeSignOut() {
  await cancelPushTokenRegistration();

  let token: string | null;
  try {
    token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    logWarn('push_token_storage_read_failed', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return;
  }
  if (!token) return;

  try {
    await unregisterPushTokenApi({ token });
  } catch (error) {
    logWarn('push_token_unregistration_failed', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  }

  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    logWarn('push_token_storage_cleanup_failed', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  }
}
