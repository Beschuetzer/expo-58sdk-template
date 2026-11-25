import type { Notification } from '@expo-50sdk-template/shared-types';
import { Checkbox } from 'expo-checkbox';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { startTransition, useOptimistic, useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInfiniteScrollList } from '@/components/ui/ThemeAwareInfiniteScrollList';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { navigateToNotificationTarget } from '@/features/notifications/notificationNavigation';
import {
  useCompleteNotificationMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n } from '@/utils/i18n';
import { logWarn } from '@/utils/logging';

type InboxNotice =
  | 'notifications.destinationUnavailable'
  | 'notifications.markReadFailed'
  | 'notifications.markSelectedCompleteFailed';

const EMPTY_NOTIFICATIONS: Notification[] = [];

function formatCreatedAt(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale);
}

function renderScreenMessage(
  title: string,
  message: string,
  action?: ReactNode,
) {
  return (
    <>
      <ThemeAwareScreen>
        <ThemeAwareHeading>{title}</ThemeAwareHeading>
        <ThemeAwareText>{message}</ThemeAwareText>
        {action}
      </ThemeAwareScreen>
    </>
  );
}

export default function NotificationsInboxScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const notificationsQuery = useNotificationsQuery(
    isAuthenticated && Boolean(user?.subject),
  );
  const completeNotificationMutation = useCompleteNotificationMutation();
  const markReadMutation = useMarkNotificationReadMutation();
  const [optimisticNotifications, markOptimisticCompleted] = useOptimistic(
    notificationsQuery.data?.items ?? EMPTY_NOTIFICATIONS,
    (currentNotifications, completedIds: string[]) =>
      currentNotifications.filter(
        (notification) => !completedIds.includes(notification.id),
      ),
  );
  const optimisticReadIds = new Set(
    notificationsQuery.data?.optimisticReadIds ?? [],
  );
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<
    Set<string>
  >(() => new Set());
  const [isCompletingSelected, setIsCompletingSelected] = useState(false);
  const [notice, setNotice] = useState<InboxNotice | null>(null);
  const title = t('notifications.inbox');
  const colorScheme = useColorScheme() ?? 'light';
  const isUpdatingNotification =
    markReadMutation.isPending ||
    completeNotificationMutation.isPending ||
    isCompletingSelected;

  const openTarget = (notification: Notification) => {
    try {
      if (
        notification.target &&
        navigateToNotificationTarget(notification.target, router)
      ) {
        return;
      }
    } catch (error) {
      logWarn('notification_inbox_navigation_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        notificationId: notification.id,
      });
    }

    logWarn('notification_inbox_navigation_skipped', {
      notificationId: notification.id,
      reason: 'missing_or_invalid_target',
    });
    setNotice('notifications.destinationUnavailable');
  };

  const openNotification = (notification: Notification) => {
    setNotice(null);
    openTarget(notification);
    if (!notification.readAt && !optimisticReadIds.has(notification.id)) {
      markReadMutation.mutateAsync(notification.id).catch((error) => {
        logWarn('notification_inbox_mark_read_failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
          notificationId: notification.id,
        });
        setNotice('notifications.markReadFailed');
      });
    }
  };

  const retryLoading = () => {
    notificationsQuery.refetch().catch((error) => {
      logWarn('notification_inbox_retry_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    });
  };

  if (!isAuthenticated) {
    return renderScreenMessage(title, t('notifications.signInRequired'));
  }

  if (!user?.subject) {
    return renderScreenMessage(title, t('auth.profileUnavailable'));
  }

  if (notificationsQuery.isError) {
    return renderScreenMessage(
      title,
      t('notifications.loadFailed'),
      <ThemeAwareButton onPress={retryLoading} variant="outline">
        {t('notifications.retry')}
      </ThemeAwareButton>,
    );
  }

  if (notificationsQuery.isLoading || !notificationsQuery.data) {
    return renderScreenMessage(title, t('common.loading'));
  }

  const notifications = notificationsQuery.data.items;
  const unreadCount = Math.max(
    0,
    notificationsQuery.data.unreadCount -
      notifications.filter(
        (notification) =>
          !notification.readAt && optimisticReadIds.has(notification.id),
      ).length,
  );
  const selectedNotifications = notifications.filter((notification) =>
    selectedNotificationIds.has(notification.id),
  );
  const areAllNotificationsSelected =
    notifications.length > 0 &&
    notifications.every((notification) =>
      selectedNotificationIds.has(notification.id),
    );

  const toggleAllNotifications = () => {
    setSelectedNotificationIds((selectedIds) =>
      notifications.every((notification) => selectedIds.has(notification.id))
        ? new Set()
        : new Set(notifications.map((notification) => notification.id)),
    );
  };

  const toggleNotificationSelection = (
    notificationId: string,
    isSelected: boolean,
  ) => {
    setSelectedNotificationIds((selectedIds) => {
      const nextSelectedIds = new Set(selectedIds);
      if (isSelected) {
        nextSelectedIds.add(notificationId);
      } else {
        nextSelectedIds.delete(notificationId);
      }
      return nextSelectedIds;
    });
  };

  const completeSelectedNotifications = () => {
    if (isCompletingSelected || selectedNotifications.length === 0) return;

    setNotice(null);
    setIsCompletingSelected(true);
    const selectedIds = selectedNotifications.map(
      (notification) => notification.id,
    );
    let completionPromise = Promise.resolve();

    startTransition(() => {
      markOptimisticCompleted(selectedIds);
      completionPromise = (async () => {
        try {
          const results = await Promise.allSettled(
            selectedIds.map((notificationId) =>
              completeNotificationMutation.mutateAsync(notificationId),
            ),
          );
          const failedIds = results.flatMap((result, index) =>
            result.status === 'rejected' ? [selectedIds[index]] : [],
          );

          if (failedIds.length > 0) {
            const firstFailure = results.find(
              (result) => result.status === 'rejected',
            );
            logWarn('notification_inbox_mark_selected_complete_failed', {
              errorName:
                firstFailure?.status === 'rejected' &&
                firstFailure.reason instanceof Error
                  ? firstFailure.reason.name
                  : 'UnknownError',
              notificationCount: failedIds.length,
            });
            setSelectedNotificationIds(new Set(failedIds));
            setNotice('notifications.markSelectedCompleteFailed');
          } else {
            setSelectedNotificationIds(new Set());
          }
        } finally {
          setIsCompletingSelected(false);
        }
      })();
      return completionPromise;
    });

    return completionPromise;
  };

  return (
    <>
      <ThemeAwareInfiniteScrollList<Notification>
        data={optimisticNotifications}
        fetchNextPage={() => undefined}
        hasNextPage={false}
        isFetchingNextPage={false}
        onRefresh={retryLoading}
        refreshing={notificationsQuery.isRefetching}
        keyExtractor={(notification) => notification.id}
        ListEmptyComponent={
          optimisticNotifications.length === 0 && !isCompletingSelected ? (
            <ThemeAwareCardSurface
              backgroundImage={CARD_ARTWORK.relationships}
              borderRadius="$sm"
              p="$4"
            >
              <ThemeAwareText>{t('notifications.empty')}</ThemeAwareText>
            </ThemeAwareCardSurface>
          ) : null
        }
        bottomContent={
          notifications.length > 0 ? (
            <HStack space="sm">
              <ThemeAwareButton
                accessibilityLabel={t(
                  areAllNotificationsSelected
                    ? 'notifications.deselectAll'
                    : 'notifications.selectAll',
                )}
                isDisabled={isUpdatingNotification}
                onPress={toggleAllNotifications}
                variant="outline"
              >
                {t(
                  areAllNotificationsSelected
                    ? 'notifications.deselectAll'
                    : 'notifications.selectAll',
                )}
              </ThemeAwareButton>
              <ThemeAwareButton
                accessibilityLabel={t('notifications.markComplete')}
                isDisabled={
                  isUpdatingNotification || selectedNotifications.length === 0
                }
                onPress={completeSelectedNotifications}
              >
                {t('notifications.markComplete')}
              </ThemeAwareButton>
            </HStack>
          ) : null
        }
        stickyHeader={
          <VStack space="sm">
            <ThemeAwareHeading>{title}</ThemeAwareHeading>
            {unreadCount > 0 ? (
              <ThemeAwareBadge>
                {unreadCount} {t('notifications.unread')}
              </ThemeAwareBadge>
            ) : null}
            {notice ? (
              <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$3">
                <ThemeAwareText>{t(notice)}</ThemeAwareText>
              </ThemeAwareSurface>
            ) : null}
          </VStack>
        }
        renderItem={({ item: notification }) => {
          const isSelected = selectedNotificationIds.has(notification.id);

          return (
            <VStack className="pb-2">
              <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$4">
                <HStack space="md" className="items-center">
                  <TouchableOpacity
                    activeOpacity={0.75}
                    accessibilityHint={t('notifications.open')}
                    accessibilityRole="button"
                    disabled={isUpdatingNotification}
                    onPress={() => openNotification(notification)}
                    style={{ flex: 1 }}
                  >
                    <VStack space="sm">
                      <HStack
                        space="sm"
                        className="items-start justify-between"
                      >
                        <ThemeAwareText
                          flex={1}
                          fontWeight="$semibold"
                          numberOfLines={2}
                        >
                          {notification.title}
                        </ThemeAwareText>
                        {!notification.readAt &&
                        !optimisticReadIds.has(notification.id) ? (
                          <ThemeAwareBadge>
                            {t('notifications.unread')}
                          </ThemeAwareBadge>
                        ) : null}
                      </HStack>
                      <ThemeAwareText>{notification.body}</ThemeAwareText>
                      <ThemeAwareText opacity={0.75} size="sm">
                        {formatCreatedAt(notification.createdAt, locale)}
                      </ThemeAwareText>
                    </VStack>
                  </TouchableOpacity>
                  <Checkbox
                    accessibilityLabel={`${t(
                      isSelected
                        ? 'notifications.deselectNotification'
                        : 'notifications.selectNotification',
                    )}: ${notification.title}`}
                    color={COLORS[colorScheme].tint}
                    disabled={isUpdatingNotification}
                    onValueChange={(isSelectedNow) =>
                      toggleNotificationSelection(
                        notification.id,
                        isSelectedNow,
                      )
                    }
                    value={isSelected}
                  />
                </HStack>
              </ThemeAwareSurface>
            </VStack>
          );
        }}
      />
    </>
  );
}
