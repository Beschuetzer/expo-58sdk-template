import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  savePushTokenForSignOut,
  startPushTokenRegistration,
  stopPushTokenRegistration,
  unregisterPushTokenBeforeSignOut,
} from './pushTokenLifecycle';

import { unregisterPushToken } from '@/features/payment-requests/api';
import { logWarn } from '@/utils/logging';

jest.mock('@/features/payment-requests/api', () => ({
  unregisterPushToken: jest.fn(),
}));

jest.mock('@/utils/logging', () => ({
  logWarn: jest.fn(),
}));

describe('push token sign-out lifecycle', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs a push-token registration and exposes its abort signal', async () => {
    const operation = jest.fn().mockResolvedValue(undefined);
    const controller = startPushTokenRegistration(operation);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(operation).toHaveBeenCalledWith(controller.signal);
    expect(controller.signal.aborted).toBe(false);

    stopPushTokenRegistration(controller);

    expect(controller.signal.aborted).toBe(true);
    await unregisterPushTokenBeforeSignOut();
  });

  it('logs a failed registration without throwing from the lifecycle', async () => {
    const operation = jest
      .fn()
      .mockRejectedValue(new Error('registration failed'));
    startPushTokenRegistration(operation);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).toHaveBeenCalledWith('push_token_registration_failed', {
      errorMessage: 'registration failed',
      errorName: 'Error',
    });
  });

  it('uses fallback log metadata for non-Error registration failures', async () => {
    const operation = jest.fn().mockRejectedValue('registration failed');
    startPushTokenRegistration(operation);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).toHaveBeenCalledWith('push_token_registration_failed', {
      errorMessage: 'Unknown error',
      errorName: 'UnknownError',
    });
  });

  it('does not log a registration failure after its operation is aborted', async () => {
    let rejectRegistration: ((error: Error) => void) | undefined;
    const operation = jest.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectRegistration = reject;
        }),
    );
    const controller = startPushTokenRegistration(operation);

    await new Promise((resolve) => setTimeout(resolve, 0));
    stopPushTokenRegistration(controller);
    rejectRegistration?.(new Error('registration cancelled'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).not.toHaveBeenCalled();
  });

  it('aborts the previous registration before starting its replacement', async () => {
    let finishFirstRegistration: (() => void) | undefined;
    const firstOperation = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishFirstRegistration = resolve;
        }),
    );
    const firstController = startPushTokenRegistration(firstOperation);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const secondOperation = jest.fn().mockResolvedValue(undefined);
    const secondController = startPushTokenRegistration(secondOperation);
    expect(firstController.signal.aborted).toBe(true);
    expect(secondOperation).not.toHaveBeenCalled();

    finishFirstRegistration?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(secondOperation).toHaveBeenCalledWith(secondController.signal);

    stopPushTokenRegistration(secondController);
    await unregisterPushTokenBeforeSignOut();
  });

  it('unregisters the stored Expo token before removing it locally', async () => {
    await savePushTokenForSignOut('ExpoPushToken[device-123]');
    jest.mocked(unregisterPushToken).mockResolvedValueOnce(undefined);

    await unregisterPushTokenBeforeSignOut();

    expect(unregisterPushToken).toHaveBeenCalledWith({
      token: 'ExpoPushToken[device-123]',
    });
    await expect(
      AsyncStorage.getItem('@mobile/notification-push-token'),
    ).resolves.toBeNull();
  });

  it('continues local cleanup and logs when remote unregistration fails', async () => {
    await savePushTokenForSignOut('ExpoPushToken[device-123]');
    jest
      .mocked(unregisterPushToken)
      .mockRejectedValueOnce(new Error('API unavailable'));

    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).toHaveBeenCalledWith('push_token_unregistration_failed', {
      errorMessage: 'API unavailable',
      errorName: 'Error',
    });
    await expect(
      AsyncStorage.getItem('@mobile/notification-push-token'),
    ).resolves.toBeNull();
  });

  it('does nothing when there is no token to unregister', async () => {
    await unregisterPushTokenBeforeSignOut();

    expect(unregisterPushToken).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('logs storage read failures and leaves remote state unchanged', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));

    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).toHaveBeenCalledWith('push_token_storage_read_failed', {
      errorMessage: 'storage unavailable',
      errorName: 'Error',
    });
    expect(unregisterPushToken).not.toHaveBeenCalled();
  });

  it('uses fallback log metadata when storage reads reject with non-Errors', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce('storage unavailable');

    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).toHaveBeenCalledWith('push_token_storage_read_failed', {
      errorMessage: 'Unknown error',
      errorName: 'UnknownError',
    });
    expect(unregisterPushToken).not.toHaveBeenCalled();
  });

  it('logs local cleanup failures after attempting remote unregistration', async () => {
    await savePushTokenForSignOut('ExpoPushToken[device-123]');
    jest.mocked(unregisterPushToken).mockResolvedValueOnce(undefined);
    jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce(new Error('cleanup unavailable'));

    await unregisterPushTokenBeforeSignOut();

    expect(unregisterPushToken).toHaveBeenCalledWith({
      token: 'ExpoPushToken[device-123]',
    });
    expect(logWarn).toHaveBeenCalledWith('push_token_storage_cleanup_failed', {
      errorMessage: 'cleanup unavailable',
      errorName: 'Error',
    });
  });

  it('uses fallback log metadata when remote unregistration rejects with a non-Error', async () => {
    await savePushTokenForSignOut('ExpoPushToken[device-123]');
    jest.mocked(unregisterPushToken).mockRejectedValueOnce('API unavailable');

    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).toHaveBeenCalledWith('push_token_unregistration_failed', {
      errorMessage: 'Unknown error',
      errorName: 'UnknownError',
    });
    await expect(
      AsyncStorage.getItem('@mobile/notification-push-token'),
    ).resolves.toBeNull();
  });

  it('uses fallback log metadata when token cleanup rejects with a non-Error', async () => {
    await savePushTokenForSignOut('ExpoPushToken[device-123]');
    jest.mocked(unregisterPushToken).mockResolvedValueOnce(undefined);
    jest
      .spyOn(AsyncStorage, 'removeItem')
      .mockRejectedValueOnce('cleanup unavailable');

    await unregisterPushTokenBeforeSignOut();

    expect(logWarn).toHaveBeenCalledWith('push_token_storage_cleanup_failed', {
      errorMessage: 'Unknown error',
      errorName: 'UnknownError',
    });
  });
});
