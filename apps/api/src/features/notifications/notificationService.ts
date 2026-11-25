import type { NotificationTarget } from '@expo-50sdk-template/shared-types';
import { Prisma, PrismaClient } from '@prisma/client';

import {
  MAX_EXPO_PUSH_BATCH_SIZE,
  sendExpoPushMessages,
  type ExpoPushMessage,
} from './expoPush';
import { logInfo, logWarn } from '../../logging';

export type RelationshipNotificationInput = {
  body: string;
  eventId: string;
  excludedUserIds?: readonly string[];
  relationshipId: string;
  target: NotificationTarget;
  title: string;
};

export type UserNotificationInput = {
  body: string;
  eventId: string;
  recipientUserIds: readonly string[];
  target: NotificationTarget;
  title: string;
};

export function mapNotificationTarget(
  targetType: string | null,
  targetId: string | null,
  targetRelationshipId: string | null,
): NotificationTarget | undefined {
  if (!targetType || !targetId) return undefined;

  switch (targetType) {
    case 'relationship':
    case 'paymentRequest':
    case 'jointAccountCharge':
    case 'budget':
    case 'relationshipRule':
      return { type: targetType, id: targetId };
    case 'relationshipJoinRequest':
    case 'meTime':
    case 'relationshipTask':
      return targetRelationshipId
        ? {
            type: targetType,
            id: targetId,
            relationshipId: targetRelationshipId,
          }
        : undefined;
    default:
      return undefined;
  }
}

export class PrismaNotificationService {
  constructor(private readonly db: PrismaClient) {}

  async createForRelationshipMembers(
    transaction: Prisma.TransactionClient,
    input: RelationshipNotificationInput,
  ) {
    const excludedUserIds = [...new Set(input.excludedUserIds ?? [])];
    const recipients = await transaction.relationshipMember.findMany({
      where: {
        relationshipId: input.relationshipId,
        active: true,
        ...(excludedUserIds.length > 0
          ? { userId: { notIn: excludedUserIds } }
          : {}),
      },
      select: { userId: true },
    });

    await this.createForUsers(transaction, {
      ...input,
      recipientUserIds: recipients.map(({ userId }) => userId),
    });
  }

  async createForUsers(
    transaction: Prisma.TransactionClient,
    input: UserNotificationInput,
  ) {
    const recipientUserIds = [...new Set(input.recipientUserIds)];
    if (recipientUserIds.length === 0) return;

    await transaction.notification.createMany({
      data: recipientUserIds.map((recipientUserId) => ({
        recipientUserId,
        eventId: input.eventId,
        title: input.title,
        body: input.body,
        deliveryStatus: 'pending' as const,
        targetType: input.target.type,
        targetId: input.target.id,
        targetRelationshipId:
          'relationshipId' in input.target ? input.target.relationshipId : null,
      })),
    });
  }

  async deliver(eventId: string) {
    try {
      const notifications = await this.db.notification.findMany({
        where: { eventId, deliveryStatus: 'pending' },
        select: {
          id: true,
          recipientUserId: true,
          eventId: true,
          targetType: true,
          targetId: true,
          targetRelationshipId: true,
          title: true,
          body: true,
        },
      });
      if (notifications.length === 0) return;

      const recipientUserIds = [
        ...new Set(
          notifications.map((notification) => notification.recipientUserId),
        ),
      ];
      const pushTokens = await this.db.notificationPushToken.findMany({
        where: { userId: { in: recipientUserIds } },
        select: { userId: true, token: true },
      });
      const tokensByUser = new Map<string, string[]>();
      for (const pushToken of pushTokens) {
        const recipientTokens = tokensByUser.get(pushToken.userId) ?? [];
        recipientTokens.push(pushToken.token);
        tokensByUser.set(pushToken.userId, recipientTokens);
      }

      const deliveries: {
        notificationId: string;
        token: string;
        message: ExpoPushMessage;
      }[] = [];
      for (const notification of notifications) {
        const target = mapNotificationTarget(
          notification.targetType,
          notification.targetId,
          notification.targetRelationshipId,
        );
        const recipientTokens =
          tokensByUser.get(notification.recipientUserId) ?? [];
        for (const token of recipientTokens) {
          deliveries.push({
            notificationId: notification.id,
            token,
            message: {
              to: token,
              title: notification.title,
              body: notification.body,
              sound: 'default',
              channelId: 'default',
              data: {
                eventId: notification.eventId,
                notificationId: notification.id,
                ...(target ? { target } : {}),
              },
            },
          });
        }
      }

      const acceptedNotificationIds = new Set<string>();
      const invalidTokens = new Set<string>();
      const failedTicketErrorCodes = new Set<string>();
      let failedTicketCount = 0;
      for (
        let offset = 0;
        offset < deliveries.length;
        offset += MAX_EXPO_PUSH_BATCH_SIZE
      ) {
        const batch = deliveries.slice(
          offset,
          offset + MAX_EXPO_PUSH_BATCH_SIZE,
        );
        try {
          const tickets = await sendExpoPushMessages(
            batch.map((delivery) => delivery.message),
          );
          tickets.forEach((ticket, index) => {
            if (ticket.status === 'ok') {
              acceptedNotificationIds.add(batch[index].notificationId);
              return;
            }
            failedTicketCount += 1;
            if (ticket.errorCode === 'DeviceNotRegistered') {
              invalidTokens.add(batch[index].token);
            }
            if (ticket.errorCode) {
              failedTicketErrorCodes.add(ticket.errorCode);
            }
          });
        } catch (error) {
          failedTicketCount += batch.length;
          logWarn('push_notification_batch_failed', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            eventId,
            messageCount: batch.length,
          });
        }
      }

      if (invalidTokens.size > 0) {
        try {
          await this.db.notificationPushToken.deleteMany({
            where: { token: { in: [...invalidTokens] } },
          });
        } catch (error) {
          logWarn('invalid_push_token_cleanup_failed', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
            tokenCount: invalidTokens.size,
          });
        }
      }

      const notificationIds = notifications.map(
        (notification) => notification.id,
      );
      const deliveredIds = notificationIds.filter((id) =>
        acceptedNotificationIds.has(id),
      );
      const failedIds = notificationIds.filter(
        (id) => !acceptedNotificationIds.has(id),
      );
      if (deliveredIds.length > 0) {
        await this.db.notification.updateMany({
          where: { id: { in: deliveredIds } },
          data: { deliveryStatus: 'delivered' },
        });
      }
      if (failedIds.length > 0) {
        await this.db.notification.updateMany({
          where: { id: { in: failedIds }, readAt: null },
          data: { deliveryStatus: 'failed' },
        });
        logWarn('push_notification_delivery_incomplete', {
          eventId,
          ...(failedTicketErrorCodes.size > 0
            ? { errorCodes: [...failedTicketErrorCodes].join(',') }
            : {}),
          failedNotificationCount: failedIds.length,
          failedTicketCount,
          notificationCount: notifications.length,
        });
      } else {
        logInfo('push_notifications_accepted_by_expo', {
          eventId,
          notificationCount: notifications.length,
          pushTokenCount: deliveries.length,
        });
      }
    } catch (error) {
      logWarn('push_notification_dispatch_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        eventId,
      });
    }
  }
}
