import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { awaitWithAbort } from '@/features/auth/abort';
import { navigateToNotificationTarget } from '@/features/notifications/notificationNavigation';
import {
  savePushTokenForSignOut,
  startPushTokenRegistration,
  stopPushTokenRegistration,
} from '@/features/notifications/pushTokenLifecycle';
import {
  markNotificationRead,
  registerPushToken,
} from '@/features/payment-requests/api';
import { paymentRequestQueryKeys } from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n } from '@/utils/i18n';
import { logInfo, logWarn } from '@/utils/logging';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications(
  channelName: string,
  signal: AbortSignal,
) {
  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string' || projectId.length === 0) {
    logWarn('push_token_registration_skipped', {
      reason: 'missing_eas_project_id',
    });
    return;
  }

  if (platform === 'android') {
    await awaitWithAbort(
      Notifications.setNotificationChannelAsync('default', {
        name: channelName,
        importance: AndroidImportance.MAX,
        // Omitting sound uses Android's system default; a string is treated as a custom filename.
      }),
      signal,
    );
  }

  const currentPermission = await awaitWithAbort(
    Notifications.getPermissionsAsync(),
    signal,
  );
  let permissionStatus = currentPermission.status;
  if (permissionStatus !== 'granted') {
    const requestedPermission = await awaitWithAbort(
      Notifications.requestPermissionsAsync(),
      signal,
    );
    permissionStatus = requestedPermission.status;
  }
  if (permissionStatus !== 'granted') {
    logInfo('push_notifications_permission_not_granted', {
      platform,
      status: permissionStatus,
    });
    return;
  }

  const expoPushToken = await awaitWithAbort(
    Notifications.getExpoPushTokenAsync({ projectId }),
    signal,
  );
  if (signal.aborted) return;

  await awaitWithAbort(savePushTokenForSignOut(expoPushToken.data), signal);
  if (signal.aborted) return;

  await registerPushToken({ token: expoPushToken.data, platform }, signal);
  logInfo('push_token_registered', { platform });
}

export function PushNotificationRegistrar() {
  const { isAuthenticated, user } = useOAuth2Auth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const userId = user?.subject;
  const handledResponses = useRef(new Set<string>());
  const pendingResponse = useRef<Notifications.NotificationResponse | null>(
    null,
  );

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const controller = startPushTokenRegistration((signal) =>
      registerForPushNotifications(t('notifications.channelName'), signal),
    );
    return () => stopPushTokenRegistration(controller);
  }, [isAuthenticated, t, userId]);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (handledResponses.current.has(responseId)) return;
      if (!isAuthenticated || !userId) {
        pendingResponse.current = response;
        return;
      }

      handledResponses.current.add(responseId);
      pendingResponse.current = null;
      const data = response.notification.request.content.data;
      if (!data) {
        logWarn('push_notification_navigation_skipped', {
          reason: 'missing_data',
          responseId,
        });
        return;
      }

      if (!navigateToNotificationTarget(data.target, router)) {
        logWarn('push_notification_navigation_skipped', {
          reason: 'missing_or_invalid_target',
          responseId,
        });
      }

      if (typeof data.notificationId === 'string') {
        markNotificationRead(data.notificationId).then(
          () =>
            queryClient
              .invalidateQueries({
                queryKey: paymentRequestQueryKeys.notifications,
              })
              .catch((error) => {
                logWarn('push_notification_inbox_refresh_failed', {
                  errorName:
                    error instanceof Error ? error.name : 'UnknownError',
                });
              }),
          (error) => {
            logWarn('push_notification_mark_read_failed', {
              errorName: error instanceof Error ? error.name : 'UnknownError',
              notificationId: data.notificationId,
            });
          },
        );
      }
    };

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    if (isAuthenticated && userId) {
      if (pendingResponse.current) {
        handleResponse(pendingResponse.current);
      }
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) handleResponse(response);
        })
        .catch((error) => {
          logWarn('push_notification_response_lookup_failed', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
        });
    }

    return () => subscription.remove();
  }, [isAuthenticated, queryClient, router, userId]);

  return null;
}
