import type {
  NotificationTarget,
  SplitAllocation,
} from '@expo-50sdk-template/shared-types';
import type { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PrismaPaymentRequestService } from './service';

type NotificationInput = {
  recipientUserId: string;
  eventId: string;
  title: string;
  body: string;
  targetType: NotificationTarget['type'];
  targetId: string;
  targetRelationshipId: string | null;
  deliveryStatus?: 'pending' | 'delivered' | 'failed';
};

type StoredNotification = NotificationInput & {
  id: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  readAt: null;
};

type CapturedPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: string;
  channelId: string;
  data: {
    eventId: string;
    notificationId: string;
    target?: NotificationTarget;
  };
};

function createNotificationStore(
  pushTokens: { userId: string; token: string }[],
) {
  const notifications: StoredNotification[] = [];
  const notification = {
    createMany: async ({ data }: { data: NotificationInput[] }) => {
      data.forEach((item) => {
        notifications.push({
          ...item,
          id: `notification-${notifications.length + 1}`,
          deliveryStatus: item.deliveryStatus ?? 'pending',
          readAt: null,
        });
      });
      return { count: data.length };
    },
    create: async ({ data }: { data: NotificationInput }) => {
      const created = {
        ...data,
        id: `notification-${notifications.length + 1}`,
        deliveryStatus: data.deliveryStatus ?? 'pending',
        readAt: null,
      };
      notifications.push(created);
      return created;
    },
    findMany: async () =>
      notifications.filter((item) => item.deliveryStatus === 'pending'),
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: { in: string[] }; readAt?: null };
      data: { deliveryStatus: 'delivered' | 'failed' };
    }) => {
      let count = 0;
      for (const item of notifications) {
        if (
          where.id.in.includes(item.id) &&
          (where.readAt === undefined || item.readAt === null)
        ) {
          item.deliveryStatus = data.deliveryStatus;
          count += 1;
        }
      }
      return { count };
    },
  };
  const notificationPushToken = {
    findMany: async () => pushTokens,
    deleteMany: async () => ({ count: 0 }),
  };

  return { notification, notificationPushToken, notifications };
}

function createPaymentRequestFixture(status: 'draft' | 'pending_approval') {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'payment-request-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'creator-1',
    title: 'Shared utility bill',
    rationale: 'Monthly utility cost',
    amountMinorUnits: 4200,
    currency: 'USD',
    purchaseDate: now,
    categories: ['Utilities'],
    status,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    rubricVersionId: 'rubric-1',
    requestedSplit: [] as SplitAllocation[],
    evaluation: null,
    decisions: [],
    activity: [],
  };
}

function createPaymentRequestServiceDb(
  request: ReturnType<typeof createPaymentRequestFixture>,
  store: ReturnType<typeof createNotificationStore>,
  options: {
    approvedDecisionCount?: number;
    charges?: {
      relationshipId: string;
      createdByUserId: string;
      paymentRequestId: string;
      name: string;
      amountMinorUnits: number;
    }[];
    memberCount?: number;
  } = {},
) {
  const transaction = {
    paymentRequest: {
      create: async () => request,
      updateMany: async () => ({ count: 1 }),
      update: async () => request,
    },
    paymentRequestDecision: {
      create: async () => ({}),
      count: async () => options.approvedDecisionCount ?? 1,
    },
    paymentRequestEvaluation: {
      upsert: async () => ({}),
    },
    jointAccountCharge: {
      create: async ({
        data,
      }: {
        data: {
          relationshipId: string;
          createdByUserId: string;
          paymentRequestId: string;
          name: string;
          amountMinorUnits: number;
        };
      }) => {
        options.charges?.push(data);
        return { id: 'joint-account-charge-1', ...data };
      },
    },
    activityEvent: {
      create: async ({ data }: { data: { eventType: string } }) => ({
        id: `event-${data.eventType}`,
      }),
    },
    relationshipMember: {
      count: async () => options.memberCount ?? 2,
      findMany: async () => [{ userId: 'member-2' }],
    },
    notification: store.notification,
  };
  return {
    paymentRequest: { findFirst: async () => request },
    paymentRequestDecision: { findFirst: async () => null },
    rubricVersion: {
      findUnique: async () => ({ id: 'rubric-1', questions: [] }),
      findFirst: async () => ({ id: 'rubric-1', questions: [] }),
    },
    relationshipMember: {
      findFirst: async () => ({}),
      findMany: async () => [{ userId: 'member-1' }, { userId: 'member-2' }],
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transaction),
    ...store,
  } as unknown as PrismaClient;
}

test('join request details are available to the requester and active members', async () => {
  const request = {
    id: 'join-request-1',
    relationshipId: 'relationship-1',
    requesterUserId: 'requester-1',
    requesterDisplayName: 'Sam',
    status: 'rejected',
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    respondedAt: new Date('2026-10-29T12:00:00.000Z'),
    respondedByUserId: 'owner-1',
  };
  const db = {
    relationshipJoinRequest: {
      findFirst: async () => request,
    },
    relationshipMember: {
      findFirst: async ({ where }: { where: { userId: string } }) =>
        where.userId === 'member-1' ? { id: 'membership-1' } : null,
    },
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);

  const requesterResult = await service.getJoinRequest(
    'requester-1',
    'relationship-1',
    'join-request-1',
  );
  const memberResult = await service.getJoinRequest(
    'member-1',
    'relationship-1',
    'join-request-1',
  );

  assert.equal(requesterResult.status, 'rejected');
  assert.equal(requesterResult.requesterDisplayName, 'Sam');
  assert.deepEqual(memberResult, requesterResult);
  await assert.rejects(
    service.getJoinRequest('outsider', 'relationship-1', 'join-request-1'),
    { statusCode: 404 },
  );
});

function assertPaymentRequestPush(
  store: ReturnType<typeof createNotificationStore>,
  sentMessages: CapturedPushMessage[],
  eventId: string,
  title: string,
) {
  assert.deepEqual(store.notifications, [
    {
      recipientUserId: 'member-2',
      eventId,
      title,
      body: 'Shared utility bill',
      deliveryStatus: 'delivered',
      targetType: 'paymentRequest',
      targetId: 'payment-request-1',
      targetRelationshipId: null,
      id: 'notification-1',
      readAt: null,
    },
  ]);
  assert.deepEqual(sentMessages, [
    {
      to: 'ExpoPushToken[member-device]',
      title,
      body: 'Shared utility bill',
      sound: 'default',
      channelId: 'default',
      data: {
        eventId,
        notificationId: 'notification-1',
        target: { type: 'paymentRequest', id: 'payment-request-1' },
      },
    },
  ]);
}

test('notification lists include destinations for new notifications', async () => {
  const createdAt = new Date('2026-10-29T12:00:00.000Z');
  const db = {
    notification: {
      findMany: async () => [
        {
          id: 'notification-1',
          recipientUserId: 'member-2',
          eventId: 'activity-event-1',
          targetType: 'paymentRequest',
          targetId: 'payment-request-1',
          targetRelationshipId: null,
          title: 'New payment request',
          body: 'Shared utility bill',
          readAt: null,
          deliveryStatus: 'pending',
          createdAt,
        },
      ],
    },
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);

  const result = await service.listNotifications('member-2');

  assert.deepEqual(result.items[0]?.target, {
    type: 'paymentRequest',
    id: 'payment-request-1',
  });
});

test('completing a notification removes it only from the recipient inbox', async () => {
  let received: unknown;
  const db = {
    notification: {
      deleteMany: async (input: {
        where: { id: string; recipientUserId: string };
      }) => {
        received = input;
        return { count: 1 };
      },
    },
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);

  await service.completeNotification('member-2', 'notification-1');

  assert.deepEqual(received, {
    where: { id: 'notification-1', recipientUserId: 'member-2' },
  });
});

function mockExpoPushResponse(
  status: number,
  onMessages?: (messages: CapturedPushMessage[]) => void,
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    if (onMessages) {
      onMessages(JSON.parse(String(init?.body)) as CapturedPushMessage[]);
    }
    return new Response(
      JSON.stringify(
        status >= 200 && status < 300
          ? { data: [{ status: 'ok', id: 'ticket-1' }] }
          : { errors: [{ message: 'Expo push service unavailable' }] },
      ),
      { status },
    );
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test('a new join request notifies every active relationship member', async (t) => {
  const store = createNotificationStore([
    { userId: 'owner-1', token: 'ExpoPushToken[device-123]' },
    { userId: 'member-2', token: 'ExpoPushToken[member-2-device]' },
  ]);
  const transaction = {
    relationshipJoinRequest: {
      create: async ({
        data,
      }: {
        data: {
          relationshipId: string;
          requesterUserId: string;
          requesterDisplayName?: string;
        };
      }) => ({
        id: 'join-request-1',
        ...data,
        status: 'pending',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        respondedAt: null,
        respondedByUserId: null,
      }),
    },
    relationshipMember: {
      findMany: async ({
        where,
      }: {
        where: { userId?: { notIn: string[] } };
      }) =>
        ['owner-1', 'member-2']
          .filter((userId) => !where.userId?.notIn.includes(userId))
          .map((userId) => ({ userId })),
    },
    notification: store.notification,
  };
  const db = {
    relationship: {
      findUnique: async () => ({
        id: 'relationship-1',
        name: 'Shared space',
      }),
    },
    relationshipMember: {
      findFirst: async () => null,
    },
    relationshipJoinRequest: {
      findFirst: async () => null,
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transaction),
    ...store,
  } as unknown as PrismaClient;
  let sentMessages: CapturedPushMessage[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    sentMessages = JSON.parse(String(init?.body)) as CapturedPushMessage[];
    return new Response(
      JSON.stringify({
        data: sentMessages.map(() => ({ status: 'ok', id: 'ticket-1' })),
      }),
      { status: 200 },
    );
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await new PrismaPaymentRequestService(db).requestToJoin(
    'requester-1',
    'relationship-1',
    'Sam',
  );

  assert.equal(result.status, 'pending');
  assert.equal(result.requesterDisplayName, 'Sam');
  assert.deepEqual(
    store.notifications.map(
      ({ recipientUserId, eventId, title, body, deliveryStatus }) => ({
        recipientUserId,
        eventId,
        title,
        body,
        deliveryStatus,
      }),
    ),
    [
      {
        recipientUserId: 'owner-1',
        eventId: 'join-request-1',
        title: 'New relationship join request',
        body: 'A new member requested to join Shared space.',
        deliveryStatus: 'delivered',
      },
      {
        recipientUserId: 'member-2',
        eventId: 'join-request-1',
        title: 'New relationship join request',
        body: 'A new member requested to join Shared space.',
        deliveryStatus: 'delivered',
      },
    ],
  );
  assert.deepEqual(sentMessages, [
    {
      to: 'ExpoPushToken[device-123]',
      title: 'New relationship join request',
      body: 'A new member requested to join Shared space.',
      sound: 'default',
      channelId: 'default',
      data: {
        eventId: 'join-request-1',
        notificationId: 'notification-1',
        target: {
          type: 'relationshipJoinRequest',
          id: 'join-request-1',
          relationshipId: 'relationship-1',
        },
      },
    },
    {
      to: 'ExpoPushToken[member-2-device]',
      title: 'New relationship join request',
      body: 'A new member requested to join Shared space.',
      sound: 'default',
      channelId: 'default',
      data: {
        eventId: 'join-request-1',
        notificationId: 'notification-2',
        target: {
          type: 'relationshipJoinRequest',
          id: 'join-request-1',
          relationshipId: 'relationship-1',
        },
      },
    },
  ]);
});

test('approving a join request notifies the new member and existing members', async (t) => {
  const store = createNotificationStore([
    { userId: 'member-1', token: 'ExpoPushToken[member-device]' },
    { userId: 'member-2', token: 'ExpoPushToken[existing-member-device]' },
  ]);
  const pendingRequest = {
    id: 'join-request-1',
    relationshipId: 'relationship-1',
    requesterUserId: 'member-1',
    requesterDisplayName: 'Sam',
    status: 'pending',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    respondedAt: null,
    respondedByUserId: null,
    relationship: { name: 'Shared space' },
  };
  const transaction = {
    relationshipJoinRequest: {
      findFirst: async () => pendingRequest,
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        ...pendingRequest,
        ...data,
      }),
    },
    relationshipMember: {
      upsert: async () => ({}),
      findMany: async ({
        where,
      }: {
        where: { userId?: { notIn: string[] } };
      }) =>
        ['owner-1', 'member-1', 'member-2']
          .filter((userId) => !where.userId?.notIn.includes(userId))
          .map((userId) => ({ userId })),
    },
    notification: store.notification,
  };
  const db = {
    relationshipMember: {
      findFirst: async () => ({ role: 'owner' }),
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transaction),
    ...store,
  } as unknown as PrismaClient;
  let sentMessages: CapturedPushMessage[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    sentMessages = JSON.parse(String(init?.body)) as CapturedPushMessage[];
    return new Response(
      JSON.stringify({
        data: sentMessages.map(() => ({ status: 'ok', id: 'ticket-1' })),
      }),
      { status: 200 },
    );
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await new PrismaPaymentRequestService(db).decideJoinRequest(
    'owner-1',
    'relationship-1',
    'join-request-1',
    { decision: 'approved' },
  );

  assert.equal(result.status, 'approved');
  assert.deepEqual(
    store.notifications.map(
      ({ recipientUserId, title, body, deliveryStatus }) => ({
        recipientUserId,
        title,
        body,
        deliveryStatus,
      }),
    ),
    [
      {
        recipientUserId: 'member-2',
        title: 'New relationship member',
        body: 'A new member joined Shared space.',
        deliveryStatus: 'delivered',
      },
      {
        recipientUserId: 'member-1',
        title: 'Relationship request approved',
        body: 'You joined Shared space.',
        deliveryStatus: 'delivered',
      },
    ],
  );
  assert.deepEqual(
    sentMessages.map(({ to }) => to),
    ['ExpoPushToken[existing-member-device]', 'ExpoPushToken[member-device]'],
  );
  assert.deepEqual(
    sentMessages.map(({ data }) => data.target),
    [
      { type: 'relationship', id: 'relationship-1' },
      { type: 'relationship', id: 'relationship-1' },
    ],
  );
});

test('creating a relationship invitation notifies the other members', async (t) => {
  const store = createNotificationStore([
    { userId: 'member-2', token: 'ExpoPushToken[member-device]' },
  ]);
  const now = new Date('2026-10-29T12:00:00.000Z');
  const invitation = {
    id: 'invitation-1',
    relationshipId: 'relationship-1',
    inviterUserId: 'owner-1',
    inviteeEmail: 'new@example.com',
    status: 'pending',
    expiresAt: new Date('2026-11-05T12:00:00.000Z'),
    createdAt: now,
    acceptedAt: null,
    relationship: { name: 'Shared space' },
  };
  const transaction = {
    relationshipInvitation: {
      create: async () => invitation,
    },
    relationshipMember: {
      findMany: async ({
        where,
      }: {
        where: { userId?: { notIn: string[] } };
      }) =>
        ['owner-1', 'member-2']
          .filter((userId) => !where.userId?.notIn.includes(userId))
          .map((userId) => ({ userId })),
    },
    notification: store.notification,
  };
  const db = {
    relationshipMember: {
      findFirst: async () => ({ role: 'owner' }),
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transaction),
    ...store,
  } as unknown as PrismaClient;
  const sentMessages: CapturedPushMessage[] = [];
  t.after(
    mockExpoPushResponse(200, (messages) => sentMessages.push(...messages)),
  );

  const result = await new PrismaPaymentRequestService(db).createInvitation(
    'owner-1',
    'relationship-1',
    { inviteeEmail: 'new@example.com' },
  );

  assert.equal(result.relationshipName, 'Shared space');
  assert.ok(result.token);
  assert.deepEqual(store.notifications, [
    {
      recipientUserId: 'member-2',
      eventId: 'invitation-1',
      title: 'New relationship invitation',
      body: 'An invitation was created for Shared space.',
      deliveryStatus: 'delivered',
      targetType: 'relationship',
      targetId: 'relationship-1',
      targetRelationshipId: null,
      id: 'notification-1',
      readAt: null,
    },
  ]);
  assert.equal(sentMessages[0]?.to, 'ExpoPushToken[member-device]');
  assert.deepEqual(sentMessages[0]?.data.target, {
    type: 'relationship',
    id: 'relationship-1',
  });
});

test('accepting an invitation notifies every other active member', async (t) => {
  const store = createNotificationStore([
    { userId: 'owner-1', token: 'ExpoPushToken[owner-device]' },
    { userId: 'member-2', token: 'ExpoPushToken[member-device]' },
  ]);
  const now = new Date();
  const relationship = {
    id: 'relationship-1',
    name: 'Shared space',
    shareCode: 'share-code',
    approvalPolicy: 'all_members',
    createdAt: now,
    updatedAt: now,
    members: [
      {
        id: 'owner-membership',
        relationshipId: 'relationship-1',
        userId: 'owner-1',
        displayName: 'Alex',
        role: 'owner',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'member-membership',
        relationshipId: 'relationship-1',
        userId: 'member-2',
        displayName: 'Sam',
        role: 'member',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'new-membership',
        relationshipId: 'relationship-1',
        userId: 'new-member',
        displayName: 'Taylor',
        role: 'member',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
  const invitation = {
    id: 'invitation-1',
    relationshipId: 'relationship-1',
    inviterUserId: 'owner-1',
    inviteeEmail: null,
    tokenHash: 'token-hash',
    status: 'pending',
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    createdAt: now,
    acceptedAt: null,
    acceptedByUserId: null,
    relationship: { name: 'Shared space' },
  };
  const transaction = {
    relationshipInvitation: {
      findUnique: async () => invitation,
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        ...invitation,
        ...data,
        relationship: invitation.relationship,
      }),
    },
    relationshipMember: {
      upsert: async () => relationship.members[2],
      findMany: async ({
        where,
      }: {
        where: { userId?: { notIn: string[] } };
      }) =>
        relationship.members
          .filter(({ userId }) => !where.userId?.notIn.includes(userId))
          .map(({ userId }) => ({ userId })),
    },
    relationship: {
      findUniqueOrThrow: async () => relationship,
    },
    notification: store.notification,
  };
  const db = {
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transaction),
    ...store,
  } as unknown as PrismaClient;
  const sentMessages: CapturedPushMessage[] = [];
  t.after(
    mockExpoPushResponse(200, (messages) => sentMessages.push(...messages)),
  );

  const result = await new PrismaPaymentRequestService(db).acceptInvitation(
    'new-member',
    'invitation-token',
    'Taylor',
  );

  assert.equal(result.member.userId, 'new-member');
  assert.deepEqual(
    store.notifications.map(({ recipientUserId, title, body }) => ({
      recipientUserId,
      title,
      body,
    })),
    [
      {
        recipientUserId: 'owner-1',
        title: 'Relationship invitation accepted',
        body: 'A new member joined Shared space.',
      },
      {
        recipientUserId: 'member-2',
        title: 'Relationship invitation accepted',
        body: 'A new member joined Shared space.',
      },
    ],
  );
  assert.deepEqual(
    sentMessages.map(({ to }) => to),
    ['ExpoPushToken[owner-device]', 'ExpoPushToken[member-device]'],
  );
  assert.deepEqual(
    sentMessages.map(({ data }) => data.target),
    [
      { type: 'relationship', id: 'relationship-1' },
      { type: 'relationship', id: 'relationship-1' },
    ],
  );
});

test('creating a payment request notifies other active relationship members', async (t) => {
  const store = createNotificationStore([
    { userId: 'member-2', token: 'ExpoPushToken[member-device]' },
  ]);
  const request = createPaymentRequestFixture('draft');
  const db = createPaymentRequestServiceDb(request, store);
  const sentMessages: CapturedPushMessage[] = [];
  t.after(
    mockExpoPushResponse(200, (messages) => sentMessages.push(...messages)),
  );

  await new PrismaPaymentRequestService(db).createPaymentRequest(
    'creator-1',
    'relationship-1',
    {
      title: 'Shared utility bill',
      rationale: 'Monthly utility cost',
      amountMinorUnits: 4200,
      currency: 'USD',
      purchaseDate: '2026-01-01T00:00:00.000Z',
      categories: ['Utilities'],
      requestedSplit: [{ memberUserId: 'member-1', percentage: 100 }],
    },
  );

  assertPaymentRequestPush(
    store,
    sentMessages,
    'event-created',
    'New payment request',
  );
});

test('pending payment-request edits reset approver decisions and record the editor', async () => {
  const request = {
    ...createPaymentRequestFixture('pending_approval'),
    evaluation: {
      rubricVersionId: 'rubric-1',
      answers: { necessary: true },
    },
  };
  const store = createNotificationStore([]);
  const updateCalls: { where: unknown; data: unknown }[] = [];
  const decisionDeleteCalls: unknown[] = [];
  const decisionCreateCalls: unknown[] = [];
  const evaluationUpsertCalls: unknown[] = [];
  const activityEvents: { data: unknown }[] = [];
  const transaction = {
    paymentRequest: {
      updateMany: async ({
        where,
        data,
      }: {
        where: unknown;
        data: unknown;
      }) => {
        updateCalls.push({ where, data });
        return { count: 1 };
      },
    },
    paymentRequestDecision: {
      deleteMany: async ({ where }: { where: unknown }) => {
        decisionDeleteCalls.push(where);
        return { count: 1 };
      },
      create: async ({ data }: { data: unknown }) => {
        decisionCreateCalls.push(data);
        return {};
      },
    },
    paymentRequestEvaluation: {
      upsert: async (args: unknown) => {
        evaluationUpsertCalls.push(args);
        return {};
      },
    },
    activityEvent: {
      create: async ({ data }: { data: unknown }) => {
        activityEvents.push({ data });
        return { id: 'event-edited' };
      },
    },
    relationshipMember: {
      findMany: async ({
        where,
      }: {
        where: { userId?: { notIn?: string[] } };
      }) =>
        [
          { userId: 'creator-1' },
          { userId: 'approver-1' },
          { userId: 'approver-2' },
        ].filter(({ userId }) => !where.userId?.notIn?.includes(userId)),
    },
    notification: store.notification,
  };
  const db = {
    paymentRequest: { findFirst: async () => request },
    relationshipMember: {
      findMany: async () => [
        { userId: 'creator-1' },
        { userId: 'approver-1' },
        { userId: 'approver-2' },
      ],
    },
    rubricVersion: {
      findUnique: async () => ({
        id: 'rubric-1',
        questions: [{ id: 'necessary', required: true }],
      }),
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transaction),
    ...store,
  } as unknown as PrismaClient;
  const input = {
    title: 'Updated utility bill',
    rationale: 'Includes the current service charge.',
    amountMinorUnits: 5100,
    currency: 'USD',
    purchaseDate: '2026-01-02T00:00:00.000Z',
    categories: ['Utilities', 'Household'],
    requestedSplit: [
      { memberUserId: 'creator-1', percentage: 40 },
      { memberUserId: 'approver-1', percentage: 60 },
    ],
    evaluation: {
      rubricVersionId: 'rubric-1',
      answers: { necessary: false },
    },
  };

  await new PrismaPaymentRequestService(db).updatePaymentRequest(
    'approver-1',
    request.id,
    input,
  );

  assert.deepEqual(updateCalls, [
    {
      where: { id: request.id, status: 'pending_approval' },
      data: {
        title: input.title,
        rationale: input.rationale,
        amountMinorUnits: input.amountMinorUnits,
        currency: input.currency,
        purchaseDate: new Date(input.purchaseDate),
        categories: input.categories,
        requestedSplit: input.requestedSplit,
      },
    },
  ]);
  assert.deepEqual(decisionDeleteCalls, [{ paymentRequestId: request.id }]);
  assert.deepEqual(decisionCreateCalls, [
    {
      paymentRequestId: request.id,
      memberUserId: 'approver-1',
      decision: 'approved',
    },
  ]);
  assert.deepEqual(evaluationUpsertCalls, [
    {
      where: { paymentRequestId: request.id },
      create: {
        paymentRequestId: request.id,
        rubricVersionId: 'rubric-1',
        answers: { necessary: false },
        recommendation: undefined,
        score: undefined,
      },
      update: {
        rubricVersionId: 'rubric-1',
        answers: { necessary: false },
        recommendation: undefined,
        score: undefined,
      },
    },
  ]);
  assert.deepEqual(activityEvents, [
    {
      data: {
        paymentRequestId: request.id,
        actorUserId: 'approver-1',
        eventType: 'edited',
        metadata: {},
      },
    },
  ]);
  assert.deepEqual(
    store.notifications.map(({ recipientUserId, title, body }) => ({
      recipientUserId,
      title,
      body,
    })),
    [
      {
        recipientUserId: 'creator-1',
        title: 'Payment request updated',
        body: input.title,
      },
      {
        recipientUserId: 'approver-2',
        title: 'Payment request updated',
        body: input.title,
      },
    ],
  );
});

test('only creators can edit drafts and resolved payment requests cannot be edited', async () => {
  const draftRequest = createPaymentRequestFixture('draft');
  const resolvedRequest = { ...draftRequest, status: 'approved' as const };
  let request:
    | ReturnType<typeof createPaymentRequestFixture>
    | typeof resolvedRequest = draftRequest;
  const db = {
    paymentRequest: { findFirst: async () => request },
    $transaction: async () => {
      throw new Error('The request must not be updated.');
    },
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);
  const input = {
    title: 'Updated utility bill',
    rationale: 'Includes the current service charge.',
    amountMinorUnits: 5100,
    currency: 'USD',
    purchaseDate: '2026-01-02T00:00:00.000Z',
    requestedSplit: [{ memberUserId: 'creator-1', percentage: 100 }],
  };

  await assert.rejects(
    service.updatePaymentRequest('approver-1', draftRequest.id, input),
    { statusCode: 403 },
  );

  request = resolvedRequest;
  await assert.rejects(
    service.updatePaymentRequest('creator-1', draftRequest.id, input),
    { statusCode: 409 },
  );
});

test('submitting a joint payment request notifies and pushes to other members', async (t) => {
  const store = createNotificationStore([
    { userId: 'member-2', token: 'ExpoPushToken[member-device]' },
  ]);
  const request = createPaymentRequestFixture('draft');
  const db = createPaymentRequestServiceDb(request, store);
  const sentMessages: CapturedPushMessage[] = [];
  t.after(
    mockExpoPushResponse(200, (messages) => sentMessages.push(...messages)),
  );

  await new PrismaPaymentRequestService(db).submitPaymentRequest(
    'creator-1',
    request.id,
    { evaluation: { answers: {} } },
  );

  assertPaymentRequestPush(
    store,
    sentMessages,
    'event-submitted',
    'Payment request awaiting approval',
  );
});

test('a joint payment request decision notifies and pushes to other members', async (t) => {
  const store = createNotificationStore([
    { userId: 'member-2', token: 'ExpoPushToken[member-device]' },
  ]);
  const request = createPaymentRequestFixture('pending_approval');
  const db = createPaymentRequestServiceDb(request, store);
  const sentMessages: CapturedPushMessage[] = [];
  t.after(
    mockExpoPushResponse(200, (messages) => sentMessages.push(...messages)),
  );

  await new PrismaPaymentRequestService(db).decidePaymentRequest(
    'member-1',
    request.id,
    { decision: 'approved' },
  );

  assertPaymentRequestPush(
    store,
    sentMessages,
    'event-approved',
    'Payment request approved',
  );
});

test('approving a payment request creates a charge for the amount not covered by the joint account', async () => {
  const request = {
    ...createPaymentRequestFixture('pending_approval'),
    requestedSplit: [
      { memberUserId: 'creator-1', percentage: 40 },
      { memberUserId: 'member-1', percentage: 60 },
    ],
  };
  const charges: {
    relationshipId: string;
    createdByUserId: string;
    paymentRequestId: string;
    name: string;
    amountMinorUnits: number;
  }[] = [];
  const db = createPaymentRequestServiceDb(
    request,
    createNotificationStore([]),
    { approvedDecisionCount: 2, charges },
  );

  await new PrismaPaymentRequestService(db).decidePaymentRequest(
    'member-1',
    request.id,
    { decision: 'approved' },
  );

  assert.deepEqual(charges, [
    {
      relationshipId: 'relationship-1',
      createdByUserId: 'creator-1',
      paymentRequestId: 'payment-request-1',
      name: 'Shared utility bill (60% paid by joint account)',
      amountMinorUnits: 1680,
    },
  ]);
});

test('automatic charge names keep the percentage suffix within the name limit', async () => {
  const request = {
    ...createPaymentRequestFixture('pending_approval'),
    title: 'x'.repeat(160),
    requestedSplit: [
      { memberUserId: 'creator-1', percentage: 40 },
      { memberUserId: 'member-1', percentage: 60 },
    ],
  };
  const charges: {
    relationshipId: string;
    createdByUserId: string;
    paymentRequestId: string;
    name: string;
    amountMinorUnits: number;
  }[] = [];
  const db = createPaymentRequestServiceDb(
    request,
    createNotificationStore([]),
    { approvedDecisionCount: 2, charges },
  );

  await new PrismaPaymentRequestService(db).decidePaymentRequest(
    'member-1',
    request.id,
    { decision: 'approved' },
  );

  assert.equal(charges[0]?.name.length, 160);
  assert.equal(charges[0]?.name.endsWith('(60% paid by joint account)'), true);
});

test('a single-member request creates a charge when submission auto-approves it', async () => {
  const request = {
    ...createPaymentRequestFixture('draft'),
    requestedSplit: [{ memberUserId: 'creator-1', percentage: 100 }],
  };
  const charges: {
    relationshipId: string;
    createdByUserId: string;
    paymentRequestId: string;
    name: string;
    amountMinorUnits: number;
  }[] = [];
  const db = createPaymentRequestServiceDb(
    request,
    createNotificationStore([]),
    { memberCount: 1, charges },
  );

  await new PrismaPaymentRequestService(db).submitPaymentRequest(
    'creator-1',
    request.id,
    { evaluation: { answers: {} } },
  );

  assert.deepEqual(charges, [
    {
      relationshipId: 'relationship-1',
      createdByUserId: 'creator-1',
      paymentRequestId: 'payment-request-1',
      name: 'Shared utility bill (0% paid by joint account)',
      amountMinorUnits: 4200,
    },
  ]);
});

test('cancelling a joint payment request notifies and pushes to other members', async (t) => {
  const store = createNotificationStore([
    { userId: 'member-2', token: 'ExpoPushToken[member-device]' },
  ]);
  const request = createPaymentRequestFixture('pending_approval');
  const db = createPaymentRequestServiceDb(request, store);
  const sentMessages: CapturedPushMessage[] = [];
  t.after(
    mockExpoPushResponse(200, (messages) => sentMessages.push(...messages)),
  );

  await new PrismaPaymentRequestService(db).cancelPaymentRequest(
    'creator-1',
    request.id,
  );

  assertPaymentRequestPush(
    store,
    sentMessages,
    'event-cancelled',
    'Payment request cancelled',
  );
});

test('push delivery failures do not fail the committed join request', async (t) => {
  t.after(mockExpoPushResponse(503));
  const store = createNotificationStore([
    { userId: 'owner-1', token: 'ExpoPushToken[device-123]' },
  ]);
  const transaction = {
    relationshipJoinRequest: {
      create: async () => ({
        id: 'join-request-1',
        relationshipId: 'relationship-1',
        requesterUserId: 'requester-1',
        requesterDisplayName: undefined,
        status: 'pending',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        respondedAt: null,
        respondedByUserId: null,
      }),
    },
    relationshipMember: {
      findMany: async () => [{ userId: 'owner-1' }],
    },
    notification: store.notification,
  };
  const db = {
    relationship: {
      findUnique: async () => ({
        id: 'relationship-1',
        name: 'Shared space',
      }),
    },
    relationshipMember: {
      findFirst: async () => null,
    },
    relationshipJoinRequest: {
      findFirst: async () => null,
    },
    $transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback(transaction),
    ...store,
  } as unknown as PrismaClient;

  const result = await new PrismaPaymentRequestService(db).requestToJoin(
    'requester-1',
    'relationship-1',
  );

  assert.equal(result.id, 'join-request-1');
  assert.equal(store.notifications[0].deliveryStatus, 'failed');
});

test('payment-request cursor pages use a stable timestamp and ID order', async () => {
  type PaymentRequestFindManyArgs = {
    where: unknown;
    orderBy: unknown;
    take: number;
    cursor?: unknown;
    skip?: number;
  };
  let queryArgs: PaymentRequestFindManyArgs | undefined;
  const firstRequest = {
    ...createPaymentRequestFixture('draft'),
    id: 'request-2',
  };
  const secondRequest = {
    ...createPaymentRequestFixture('draft'),
    id: 'request-1',
  };
  const db = {
    relationshipMember: { findFirst: async () => ({}) },
    paymentRequest: {
      findMany: async (args: PaymentRequestFindManyArgs) => {
        queryArgs = args;
        return [firstRequest, secondRequest];
      },
    },
  } as unknown as PrismaClient;

  const page = await new PrismaPaymentRequestService(db).listPaymentRequests(
    'user-1',
    'relationship-1',
    { cursor: 'request-0', limit: 1 },
  );

  assert.deepEqual(queryArgs, {
    where: { relationshipId: 'relationship-1' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 2,
    cursor: { id: 'request-0' },
    skip: 1,
  });
  assert.deepEqual(
    page.items.map((request) => request.id),
    ['request-2'],
  );
  assert.equal(page.nextCursor, 'request-2');
});

test('calendar-filtered payment requests include relationship-wide date bounds', async () => {
  type PaymentRequestFindManyArgs = {
    where: unknown;
    orderBy: unknown;
    take: number;
  };
  const fromDate = '2026-10-01T00:00:00.000Z';
  const toDate = '2026-10-31T23:59:59.999Z';
  const request = {
    ...createPaymentRequestFixture('draft'),
    purchaseDate: new Date('2026-10-15T12:00:00.000Z'),
  };
  const earliestDate = new Date('2026-09-30T12:00:00.000Z');
  const latestDate = new Date('2026-11-02T12:00:00.000Z');
  let queryArgs: PaymentRequestFindManyArgs | undefined;
  const db = {
    relationshipMember: { findFirst: async () => ({}) },
    paymentRequest: {
      findMany: async (args: PaymentRequestFindManyArgs) => {
        queryArgs = args;
        return [request];
      },
      findFirst: async ({
        orderBy,
      }: {
        where: unknown;
        orderBy: { purchaseDate: 'asc' | 'desc' }[];
        select: { purchaseDate: true };
      }) => ({
        purchaseDate:
          orderBy[0]?.purchaseDate === 'asc' ? earliestDate : latestDate,
      }),
    },
  } as unknown as PrismaClient;

  const response = await new PrismaPaymentRequestService(
    db,
  ).listPaymentRequests('user-1', 'relationship-1', {
    fromDate,
    toDate,
    limit: 10,
  });

  assert.deepEqual(queryArgs, {
    where: {
      relationshipId: 'relationship-1',
      purchaseDate: { gte: new Date(fromDate), lte: new Date(toDate) },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 11,
  });
  assert.deepEqual(response.calendarDateBounds, {
    earliestDate: earliestDate.toISOString(),
    latestDate: latestDate.toISOString(),
  });
});

test('only the payment request creator can delete it and its dependent records', async () => {
  const request = createPaymentRequestFixture('draft');
  const deleteCalls: string[] = [];
  const chargeLinkCleanupCalls: { where: unknown; data: unknown }[] = [];
  const recordDelete =
    (model: string, count = 0) =>
    async () => {
      deleteCalls.push(model);
      return { count };
    };
  const transaction = {
    paymentRequestEvaluation: {
      deleteMany: recordDelete('paymentRequestEvaluation'),
    },
    paymentRequestDecision: {
      deleteMany: recordDelete('paymentRequestDecision'),
    },
    activityEvent: { deleteMany: recordDelete('activityEvent') },
    paymentRequest: { deleteMany: recordDelete('paymentRequest', 1) },
    jointAccountCharge: {
      updateMany: async ({
        where,
        data,
      }: {
        where: unknown;
        data: unknown;
      }) => {
        deleteCalls.push('jointAccountCharge');
        chargeLinkCleanupCalls.push({ where, data });
        return { count: 0 };
      },
    },
    notification: { deleteMany: recordDelete('notification') },
  };
  const db = {
    paymentRequest: { findFirst: async () => request },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);

  await assert.rejects(service.deletePaymentRequest('member-2', request.id), {
    statusCode: 403,
  });
  assert.deepEqual(deleteCalls, []);

  await service.deletePaymentRequest('creator-1', request.id);

  assert.deepEqual(deleteCalls, [
    'paymentRequestEvaluation',
    'paymentRequestDecision',
    'activityEvent',
    'paymentRequest',
    'jointAccountCharge',
    'notification',
  ]);
  assert.deepEqual(chargeLinkCleanupCalls, [
    {
      where: { paymentRequestId: request.id },
      data: { paymentRequestId: null },
    },
  ]);
});

test('only a join request requester can delete it and its notifications', async () => {
  const request = {
    id: 'join-request-1',
    relationshipId: 'relationship-1',
    requesterUserId: 'requester-1',
  };
  const deleteCalls: { model: string; where: unknown }[] = [];
  const transaction = {
    relationshipJoinRequest: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deleteCalls.push({ model: 'relationshipJoinRequest', where });
        return { count: 1 };
      },
    },
    notification: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deleteCalls.push({ model: 'notification', where });
        return { count: 1 };
      },
    },
  };
  const db = {
    relationshipJoinRequest: { findFirst: async () => request },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);

  await assert.rejects(
    service.deleteJoinRequest('member-2', 'relationship-1', request.id),
    { statusCode: 403 },
  );
  assert.deepEqual(deleteCalls, []);

  await service.deleteJoinRequest('requester-1', 'relationship-1', request.id);

  assert.deepEqual(deleteCalls, [
    {
      model: 'relationshipJoinRequest',
      where: {
        id: request.id,
        relationshipId: 'relationship-1',
        requesterUserId: 'requester-1',
      },
    },
    {
      model: 'notification',
      where: {
        targetType: 'relationshipJoinRequest',
        targetId: request.id,
      },
    },
  ]);
});

test('only relationship owners can delete a relationship and its dependents', async () => {
  const deleteCalls: string[] = [];
  const recordDelete =
    (model: string, count = 0) =>
    async () => {
      deleteCalls.push(model);
      return { count };
    };
  let memberRole: 'owner' | 'member' = 'member';
  const transaction = {
    relationship: {
      findUnique: async () => ({ id: 'relationship-1' }),
      deleteMany: recordDelete('relationship', 1),
    },
    paymentRequest: {
      findMany: async () => [{ id: 'payment-request-1' }],
      deleteMany: recordDelete('paymentRequest'),
    },
    relationshipRule: {
      findMany: async () => [{ id: 'rule-1' }],
      deleteMany: recordDelete('relationshipRule'),
    },
    rubric: {
      findMany: async () => [{ id: 'rubric-1' }],
      deleteMany: recordDelete('rubric'),
    },
    rubricVersion: {
      findMany: async () => [{ id: 'rubric-version-1' }],
      deleteMany: recordDelete('rubricVersion'),
    },
    notification: { deleteMany: recordDelete('notification') },
    paymentRequestEvaluation: {
      deleteMany: recordDelete('paymentRequestEvaluation'),
    },
    paymentRequestDecision: {
      deleteMany: recordDelete('paymentRequestDecision'),
    },
    activityEvent: { deleteMany: recordDelete('activityEvent') },
    relationshipRuleApproval: {
      deleteMany: recordDelete('relationshipRuleApproval'),
    },
    jointAccountCharge: { deleteMany: recordDelete('jointAccountCharge') },
    meTime: { deleteMany: recordDelete('meTime') },
    relationshipTask: { deleteMany: recordDelete('relationshipTask') },
    sexCoinFlip: { deleteMany: recordDelete('sexCoinFlip') },
    sexEvent: { deleteMany: recordDelete('sexEvent') },
    relationshipInvitation: {
      deleteMany: recordDelete('relationshipInvitation'),
    },
    relationshipJoinRequest: {
      deleteMany: recordDelete('relationshipJoinRequest'),
    },
    relationshipMember: { deleteMany: recordDelete('relationshipMember') },
  };
  const db = {
    relationshipMember: {
      findFirst: async () => ({ role: memberRole }),
    },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);

  await assert.rejects(
    service.deleteRelationship('member-1', 'relationship-1'),
    { statusCode: 403 },
  );
  assert.deepEqual(deleteCalls, []);

  memberRole = 'owner';
  await service.deleteRelationship('member-1', 'relationship-1');

  assert.deepEqual(deleteCalls, [
    'notification',
    'paymentRequestEvaluation',
    'paymentRequestDecision',
    'activityEvent',
    'paymentRequest',
    'rubricVersion',
    'rubric',
    'relationshipRuleApproval',
    'relationshipRule',
    'jointAccountCharge',
    'meTime',
    'relationshipTask',
    'sexCoinFlip',
    'sexEvent',
    'relationshipInvitation',
    'relationshipJoinRequest',
    'relationshipMember',
    'relationship',
  ]);
});
