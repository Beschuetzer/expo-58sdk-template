import {
  AndroidImportance,
  setNotificationChannelAsync,
} from 'expo-notifications';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { PushNotificationRegistrar } from '../features/notifications/PushNotificationRegistrar';

let mockProjectId: string | undefined = 'test-project';
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string } | null;
} = {
  isAuthenticated: true,
  user: { subject: 'test-user' },
};
const mockRouter = { navigate: jest.fn() };
const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
const mockRemoveListener = jest.fn();
const mockResponseHandler: { current?: (response: unknown) => void } = {};

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return {
        extra: {
          eas: {
            projectId: mockProjectId,
          },
        },
      };
    },
  },
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { MAX: 5 },
  addNotificationResponseReceivedListener: jest.fn(
    (handler: (response: unknown) => void) => {
      mockResponseHandler.current = handler;
      return { remove: mockRemoveListener };
    },
  ),
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ data: 'ExpoPushToken[test]' }),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/notifications/notificationNavigation', () => ({
  navigateToNotificationTarget: jest.fn(),
}));

jest.mock('@/features/payment-requests/api', () => ({
  markNotificationRead: jest.fn(),
  registerPushToken: jest.fn(),
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  paymentRequestQueryKeys: { notifications: ['notifications'] },
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/utils/logging', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

const mockMarkNotificationRead = jest.requireMock(
  '@/features/payment-requests/api',
).markNotificationRead as jest.Mock;
const mockRegisterPushToken = jest.requireMock(
  '@/features/payment-requests/api',
).registerPushToken as jest.Mock;
const mockNavigateToTarget = jest.requireMock(
  '@/features/notifications/notificationNavigation',
).navigateToNotificationTarget as jest.Mock;
const mockLogInfo = jest.requireMock('@/utils/logging').logInfo as jest.Mock;
const mockLogWarn = jest.requireMock('@/utils/logging').logWarn as jest.Mock;
const mockNotifications = jest.requireMock('expo-notifications') as {
  AndroidImportance: { MAX: number };
  addNotificationResponseReceivedListener: jest.Mock;
  getExpoPushTokenAsync: jest.Mock;
  getLastNotificationResponseAsync: jest.Mock;
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
};
const mockPlatform = jest.requireMock('react-native').Platform as {
  OS: string;
};

describe('PushNotificationRegistrar', () => {
  let screen: ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatform.OS = 'android';
    mockProjectId = 'test-project';
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'test-user' };
    mockResponseHandler.current = undefined;
    mockNotifications.getExpoPushTokenAsync
      .mockReset()
      .mockResolvedValue({ data: 'ExpoPushToken[test]' });
    mockNotifications.getLastNotificationResponseAsync
      .mockReset()
      .mockResolvedValue(null);
    mockNotifications.getPermissionsAsync
      .mockReset()
      .mockResolvedValue({ status: 'denied' });
    mockNotifications.requestPermissionsAsync
      .mockReset()
      .mockResolvedValue({ status: 'denied' });
    mockNotifications.setNotificationChannelAsync
      .mockReset()
      .mockResolvedValue(null);
    mockInvalidateQueries.mockReset().mockResolvedValue(undefined);
    mockMarkNotificationRead.mockReset().mockResolvedValue(undefined);
    mockRegisterPushToken.mockReset().mockResolvedValue(undefined);
    mockNavigateToTarget.mockReset().mockReturnValue(true);
  });

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  });

  async function renderAndFlushEffects() {
    await act(async () => {
      screen = renderer.create(React.createElement(PushNotificationRegistrar));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    return screen!;
  }

  function fireResponse(response: unknown) {
    if (!mockResponseHandler.current) {
      throw new Error('Notification response listener was not registered.');
    }

    act(() => mockResponseHandler.current?.(response));
  }

  function createResponse(data: unknown, identifier = 'response-1') {
    return {
      notification: {
        request: {
          identifier,
          content: { data },
        },
      },
    };
  }

  it('uses the Android default sound without passing it as a custom filename', async () => {
    await renderAndFlushEffects();

    expect(setNotificationChannelAsync).toHaveBeenCalledWith('default', {
      name: 'notifications.channelName',
      importance: AndroidImportance.MAX,
    });
  });

  it('skips platform setup and response listeners on unsupported platforms', async () => {
    mockPlatform.OS = 'web';

    await renderAndFlushEffects();

    expect(
      mockNotifications.setNotificationChannelAsync,
    ).not.toHaveBeenCalled();
    expect(
      mockNotifications.addNotificationResponseReceivedListener,
    ).not.toHaveBeenCalled();
  });

  it('skips registration when the EAS project ID is missing', async () => {
    mockProjectId = '';

    await renderAndFlushEffects();

    expect(mockLogWarn).toHaveBeenCalledWith(
      'push_token_registration_skipped',
      { reason: 'missing_eas_project_id' },
    );
    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('registers an iOS push token when permission is already granted', async () => {
    mockPlatform.OS = 'ios';
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });

    await renderAndFlushEffects();

    expect(
      mockNotifications.setNotificationChannelAsync,
    ).not.toHaveBeenCalled();
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'test-project',
    });
    expect(mockRegisterPushToken).toHaveBeenCalledWith(
      { token: 'ExpoPushToken[test]', platform: 'ios' },
      expect.any(AbortSignal),
    );
    expect(mockLogInfo).toHaveBeenCalledWith('push_token_registered', {
      platform: 'ios',
    });
  });

  it('requests notification access and registers after it is granted', async () => {
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });

    await renderAndFlushEffects();

    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockRegisterPushToken).toHaveBeenCalledWith(
      { token: 'ExpoPushToken[test]', platform: 'android' },
      expect.any(AbortSignal),
    );
  });

  it('logs when notification access remains denied', async () => {
    await renderAndFlushEffects();

    expect(mockLogInfo).toHaveBeenCalledWith(
      'push_notifications_permission_not_granted',
      { platform: 'android', status: 'denied' },
    );
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('handles a response, marks it read, and refreshes the notification inbox', async () => {
    await renderAndFlushEffects();
    const response = createResponse({
      target: {
        type: 'meTime',
        id: 'me-time-1',
        relationshipId: 'relationship-1',
      },
      notificationId: 'notification-1',
    });

    fireResponse(response);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockNavigateToTarget).toHaveBeenCalledWith(
      {
        type: 'meTime',
        id: 'me-time-1',
        relationshipId: 'relationship-1',
      },
      mockRouter,
    );
    expect(mockMarkNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications'],
    });
  });

  it('ignores a duplicate response and warns when response data is missing', async () => {
    await renderAndFlushEffects();
    const response = createResponse(
      {
        target: { type: 'paymentRequest', id: 'request-1' },
      },
      'duplicate-response',
    );

    fireResponse(response);
    fireResponse(response);
    fireResponse(createResponse(undefined, 'missing-data'));

    expect(mockNavigateToTarget).toHaveBeenCalledTimes(1);
    expect(mockLogWarn).toHaveBeenCalledWith(
      'push_notification_navigation_skipped',
      { reason: 'missing_data', responseId: 'missing-data' },
    );
  });

  it('warns for invalid targets but still marks identified notifications as read', async () => {
    mockNavigateToTarget.mockReturnValue(false);
    await renderAndFlushEffects();

    fireResponse(
      createResponse(
        {
          target: undefined,
          notificationId: 'notification-invalid-target',
        },
        'invalid-target',
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockLogWarn).toHaveBeenCalledWith(
      'push_notification_navigation_skipped',
      {
        reason: 'missing_or_invalid_target',
        responseId: 'invalid-target',
      },
    );
    expect(mockMarkNotificationRead).toHaveBeenCalledWith(
      'notification-invalid-target',
    );
  });

  it('logs notification read and inbox refresh failures', async () => {
    mockMarkNotificationRead.mockRejectedValueOnce(
      new Error('mark-read failed'),
    );
    await renderAndFlushEffects();

    fireResponse(
      createResponse(
        {
          target: { type: 'paymentRequest', id: 'request-1' },
          notificationId: 'notification-1',
        },
        'mark-read-failure',
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockLogWarn).toHaveBeenCalledWith(
      'push_notification_mark_read_failed',
      {
        errorName: 'Error',
        notificationId: 'notification-1',
      },
    );

    mockMarkNotificationRead.mockResolvedValue(undefined);
    mockInvalidateQueries.mockRejectedValueOnce(
      new Error('inbox refresh failed'),
    );
    fireResponse(
      createResponse(
        {
          notificationId: 'notification-2',
        },
        'refresh-failure',
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockLogWarn).toHaveBeenCalledWith(
      'push_notification_inbox_refresh_failed',
      { errorName: 'Error' },
    );
  });

  it('processes a pending response after authentication becomes available', async () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    await renderAndFlushEffects();

    const pendingResponse = createResponse(
      {
        target: { type: 'paymentRequest', id: 'request-1' },
      },
      'pending-response',
    );
    fireResponse(pendingResponse);
    expect(mockNavigateToTarget).not.toHaveBeenCalled();

    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'test-user' };
    await act(async () => {
      screen!.update(React.createElement(PushNotificationRegistrar));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockNavigateToTarget).toHaveBeenCalledWith(
      { type: 'paymentRequest', id: 'request-1' },
      mockRouter,
    );
  });

  it('logs failures to load the last notification response', async () => {
    mockNotifications.getLastNotificationResponseAsync.mockRejectedValueOnce(
      new Error('lookup failed'),
    );

    await renderAndFlushEffects();

    expect(mockLogWarn).toHaveBeenCalledWith(
      'push_notification_response_lookup_failed',
      { errorName: 'Error' },
    );
  });
});
