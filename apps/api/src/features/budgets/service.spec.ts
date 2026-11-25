import type { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import { PrismaBudgetService } from './service';
import type { ExpoPushMessage } from '../notifications/expoPush';

type StoredApproval = {
  id: string;
  budgetId: string;
  memberUserId: string;
  approvedAt: Date | null;
};

type StoredItem = {
  id: string;
  budgetId: string;
  amountMinorUnits: number;
  name?: string;
  date?: Date;
  createdAt?: Date;
  createdByUserId?: string;
};

type StoredBudget = {
  id: string;
  seriesId: string;
  relationshipId: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  name: string;
  currency: string | null;
  amountMinorUnits: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  renewedAt: Date | null;
  status: 'pending_approval' | 'approved';
  createdAt: Date;
  updatedAt: Date;
  approvals: StoredApproval[];
  items: StoredItem[];
};

type StoredNotification = {
  id: string;
  recipientUserId: string;
  eventId: string;
  targetType: string;
  targetId: string;
  targetRelationshipId: string | null;
  title: string;
  body: string;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
};

type NewStoredNotification = Omit<StoredNotification, 'id'>;

function createBudget(overrides: Partial<StoredBudget> = {}): StoredBudget {
  const createdAt = new Date('2026-09-01T12:00:00.000Z');
  return {
    id: 'budget-1',
    seriesId: 'budget-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'creator-1',
    updatedByUserId: null,
    name: 'Household',
    currency: 'USD',
    amountMinorUnits: 100_000,
    period: 'monthly',
    periodStart: new Date('2026-09-01T00:00:00.000Z'),
    periodEnd: new Date('2026-09-30T23:59:59.999Z'),
    renewedAt: null,
    status: 'approved',
    createdAt,
    updatedAt: createdAt,
    approvals: [
      {
        id: 'approval-1',
        budgetId: 'budget-1',
        memberUserId: 'member-2',
        approvedAt: createdAt,
      },
    ],
    items: [{ id: 'item-1', budgetId: 'budget-1', amountMinorUnits: 2_500 }],
    ...overrides,
  };
}

function mockExpoPush(t: TestContext) {
  const originalFetch = globalThis.fetch;
  const sentMessages: ExpoPushMessage[] = [];

  globalThis.fetch = async (_input, init) => {
    const messages = JSON.parse(String(init?.body)) as ExpoPushMessage[];
    sentMessages.push(...messages);
    return new Response(
      JSON.stringify({ data: messages.map(() => ({ status: 'ok' })) }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  return sentMessages;
}

function createDb(
  initialBudgets: StoredBudget[] = [],
  options: { deliverNotifications?: boolean } = {},
) {
  const budgets = [...initialBudgets];
  const notifications: StoredNotification[] = [];
  const pushTokens: { userId: string; token: string }[] = [];
  const deliveryEvents: string[] = [];
  const activeMemberUserIds = ['creator-1', 'member-2', 'member-3'];
  let nextNotificationId = 1;
  let nextBudgetItemId = 1;
  let nextApprovalId = 1;

  const client = {
    relationshipMember: {
      findFirst: async ({
        where,
      }: {
        where: { relationshipId: string; userId: string; active: boolean };
      }) =>
        where.relationshipId === 'relationship-1' &&
        where.active &&
        activeMemberUserIds.includes(where.userId)
          ? { id: `relationship-member-${where.userId}` }
          : null,
      findMany: async ({
        where,
      }: {
        where: {
          relationshipId: string;
          active: boolean;
          userId?: { notIn?: string[]; in?: string[] };
        };
      }) =>
        where.relationshipId === 'relationship-1' && where.active
          ? activeMemberUserIds
              .filter((userId) =>
                where.userId?.notIn
                  ? !where.userId.notIn.includes(userId)
                  : true,
              )
              .filter((userId) =>
                where.userId?.in ? where.userId.in.includes(userId) : true,
              )
              .map((userId) => ({ userId }))
          : [],
    },
    budget: {
      findMany: async ({
        where,
        take,
      }: {
        where: {
          status: 'approved';
          periodEnd: { lt: Date };
          OR: unknown[];
        };
        take: number;
      }) =>
        budgets
          .filter(
            (budget) =>
              budget.status === where.status &&
              budget.periodEnd < where.periodEnd.lt &&
              budget.renewedAt === null,
          )
          .slice(0, take),
      findFirst: async ({
        where,
      }: {
        where: {
          id?: string;
          seriesId?: string;
          relationshipId?: string;
          status?: StoredBudget['status'];
          periodStart?: Date | { gt: Date } | { lte: Date };
          periodEnd?: { gte: Date };
          relationship?: {
            members: { some: { userId: string; active: boolean } };
          };
        };
      }) => {
        const { periodStart, seriesId } = where;
        if (
          seriesId &&
          periodStart &&
          (periodStart instanceof Date || 'gt' in periodStart)
        ) {
          const found = budgets.find(
            (budget) =>
              budget.seriesId === seriesId &&
              (periodStart instanceof Date
                ? budget.periodStart.getTime() === periodStart.getTime()
                : budget.periodStart.getTime() > periodStart.gt.getTime()),
          );
          return found ? { id: found.id } : null;
        }

        const found = budgets.find((budget) => {
          if (where.id && budget.id !== where.id) return false;
          if (
            where.relationshipId &&
            budget.relationshipId !== where.relationshipId
          ) {
            return false;
          }
          if (where.status && budget.status !== where.status) return false;
          if (
            periodStart &&
            'lte' in periodStart &&
            budget.periodStart > periodStart.lte
          ) {
            return false;
          }
          if (where.periodEnd && budget.periodEnd < where.periodEnd.gte) {
            return false;
          }
          const membership = where.relationship?.members.some;
          if (
            membership &&
            (!membership.active ||
              !activeMemberUserIds.includes(membership.userId))
          ) {
            return false;
          }
          return true;
        });
        return found ?? null;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id: string;
          seriesId?: string;
          status?: StoredBudget['status'];
          OR: unknown[];
        };
        data: { renewedAt: Date };
      }) => {
        const budget = budgets.find(
          (candidate) =>
            candidate.id === where.id &&
            (!where.seriesId || candidate.seriesId === where.seriesId) &&
            (!where.status || candidate.status === where.status) &&
            candidate.renewedAt === null,
        );
        if (!budget) return { count: 0 };
        budget.renewedAt = data.renewedAt;
        return { count: 1 };
      },
      create: async ({
        data,
      }: {
        data: {
          id: string;
          seriesId: string;
          relationshipId: string;
          createdByUserId: string;
          name: string;
          amountMinorUnits: number;
          currency: string;
          period: StoredBudget['period'];
          periodStart: Date;
          periodEnd: Date;
          renewedAt: Date | null;
          status: StoredBudget['status'];
          approvals: {
            create: { memberUserId: string; approvedAt?: Date | null }[];
          };
        };
      }) => {
        const now = new Date('2026-11-15T12:00:00.000Z');
        const budget = createBudget({
          id: data.id,
          seriesId: data.seriesId,
          relationshipId: data.relationshipId,
          createdByUserId: data.createdByUserId,
          name: data.name,
          currency: data.currency,
          amountMinorUnits: data.amountMinorUnits,
          period: data.period,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          renewedAt: data.renewedAt,
          status: data.status,
          createdAt: now,
          updatedAt: now,
          approvals: data.approvals.create.map((approval) => ({
            id: `approval-${nextApprovalId++}`,
            budgetId: data.id,
            memberUserId: approval.memberUserId,
            approvedAt: approval.approvedAt ?? null,
          })),
          items: [],
        });
        budgets.push(budget);
        return budget;
      },
    },
    budgetItem: {
      create: async ({
        data,
      }: {
        data: {
          budgetId: string;
          createdByUserId: string;
          name: string;
          amountMinorUnits: number;
          date: Date;
        };
      }) => {
        const item: StoredItem = {
          id: `created-item-${nextBudgetItemId++}`,
          budgetId: data.budgetId,
          createdByUserId: data.createdByUserId,
          name: data.name,
          amountMinorUnits: data.amountMinorUnits,
          date: data.date,
          createdAt: new Date(),
        };
        budgets.find((budget) => budget.id === data.budgetId)?.items.push(item);
        return item;
      },
    },
    notification: {
      createMany: async ({ data }: { data: NewStoredNotification[] }) => {
        notifications.push(
          ...data.map((notification) => ({
            ...notification,
            id: `notification-${nextNotificationId++}`,
          })),
        );
        return { count: data.length };
      },
      findMany: async ({
        where,
      }: {
        where: { eventId: string; deliveryStatus: 'pending' };
      }) => {
        deliveryEvents.push(where.eventId);
        return options.deliverNotifications
          ? notifications.filter(
              (notification) =>
                notification.eventId === where.eventId &&
                notification.deliveryStatus === where.deliveryStatus,
            )
          : [];
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: { in: string[] }; readAt?: null };
        data: { deliveryStatus: StoredNotification['deliveryStatus'] };
      }) => {
        const notificationIds = new Set(where.id.in);
        let count = 0;
        for (const notification of notifications) {
          if (notificationIds.has(notification.id)) {
            notification.deliveryStatus = data.deliveryStatus;
            count += 1;
          }
        }
        return { count };
      },
    },
    notificationPushToken: {
      findMany: async ({ where }: { where: { userId: { in: string[] } } }) =>
        pushTokens.filter(({ userId }) => where.userId.in.includes(userId)),
    },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(client),
  } as unknown as PrismaClient;

  return { budgets, client, deliveryEvents, notifications, pushTokens };
}

test('creating a budget sends notifications to other active members', async (t) => {
  const sentMessages = mockExpoPush(t);
  const store = createDb([], { deliverNotifications: true });
  store.pushTokens.push(
    { userId: 'creator-1', token: 'ExpoPushToken[creator]' },
    { userId: 'member-2', token: 'ExpoPushToken[member-2]' },
    { userId: 'member-3', token: 'ExpoPushToken[member-3]' },
  );
  const service = new PrismaBudgetService(store.client);

  const budget = await service.createBudget('creator-1', 'relationship-1', {
    name: 'Shared groceries',
    currency: 'EUR',
    amountMinorUnits: 100_000,
    period: 'monthly',
    requiredApproverUserIds: ['member-2'],
  });
  assert.equal(budget.currency, 'EUR');

  assert.deepEqual(
    store.notifications
      .map(
        ({ recipientUserId, eventId, targetType, targetId, title, body }) => ({
          recipientUserId,
          eventId,
          targetType,
          targetId,
          title,
          body,
        }),
      )
      .sort((left, right) =>
        left.recipientUserId.localeCompare(right.recipientUserId),
      ),
    [
      {
        recipientUserId: 'member-2',
        eventId: budget.id,
        targetType: 'budget',
        targetId: budget.id,
        title: 'New budget created',
        body: budget.name,
      },
      {
        recipientUserId: 'member-3',
        eventId: budget.id,
        targetType: 'budget',
        targetId: budget.id,
        title: 'New budget created',
        body: budget.name,
      },
    ],
  );
  assert.deepEqual(store.deliveryEvents, [budget.id]);
  assert.deepEqual(sentMessages.map(({ to }) => to).sort(), [
    'ExpoPushToken[member-2]',
    'ExpoPushToken[member-3]',
  ]);
  assert.ok(
    sentMessages.every(
      ({ title, body, data }) =>
        title === 'New budget created' &&
        body === budget.name &&
        data.eventId === budget.id &&
        data.target?.type === 'budget' &&
        data.target.id === budget.id,
    ),
  );
  assert.ok(
    store.notifications.every(
      (notification) => notification.deliveryStatus === 'delivered',
    ),
  );
});

test('budgets without a stored currency default to USD', async () => {
  const store = createDb([createBudget({ currency: null, items: [] })]);
  const service = new PrismaBudgetService(store.client);

  const budget = await service.getBudget('member-2', 'budget-1');

  assert.equal(budget.currency, 'USD');
});

test('adding a budget item sends notifications to other active members', async (t) => {
  const sentMessages = mockExpoPush(t);
  const now = new Date();
  const budget = createBudget({
    periodStart: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    periodEnd: new Date(now.getTime() + 24 * 60 * 60 * 1000),
  });
  const store = createDb([budget], { deliverNotifications: true });
  store.pushTokens.push(
    { userId: 'creator-1', token: 'ExpoPushToken[creator]' },
    { userId: 'member-2', token: 'ExpoPushToken[member-2]' },
    { userId: 'member-3', token: 'ExpoPushToken[member-3]' },
  );
  const service = new PrismaBudgetService(store.client);

  const item = await service.createBudgetItem('member-2', budget.id, {
    name: 'Groceries',
    amountMinorUnits: 2_500,
    date: now.toISOString().slice(0, 10),
  });

  assert.deepEqual(
    store.notifications
      .map(
        ({ recipientUserId, eventId, targetType, targetId, title, body }) => ({
          recipientUserId,
          eventId,
          targetType,
          targetId,
          title,
          body,
        }),
      )
      .sort((left, right) =>
        left.recipientUserId.localeCompare(right.recipientUserId),
      ),
    [
      {
        recipientUserId: 'creator-1',
        eventId: item.id,
        targetType: 'budget',
        targetId: budget.id,
        title: 'New budget item added',
        body: item.name,
      },
      {
        recipientUserId: 'member-3',
        eventId: item.id,
        targetType: 'budget',
        targetId: budget.id,
        title: 'New budget item added',
        body: item.name,
      },
    ],
  );
  assert.deepEqual(store.deliveryEvents, [item.id]);
  assert.deepEqual(sentMessages.map(({ to }) => to).sort(), [
    'ExpoPushToken[creator]',
    'ExpoPushToken[member-3]',
  ]);
  assert.ok(
    sentMessages.every(
      ({ title, body, data }) =>
        title === 'New budget item added' &&
        body === item.name &&
        data.eventId === item.id &&
        data.target?.type === 'budget' &&
        data.target.id === budget.id,
    ),
  );
  assert.ok(
    store.notifications.every(
      (notification) => notification.deliveryStatus === 'delivered',
    ),
  );
});

test('expired monthly budgets renew through the current period exactly once', async () => {
  const store = createDb();
  const expiredBudget = createBudget();
  store.budgets.push(expiredBudget);
  const service = new PrismaBudgetService(store.client);
  const now = new Date('2026-11-15T12:00:00.000Z');

  const createdCount = await service.rolloverExpiredBudgets(now);
  const renewedBudgets = store.budgets
    .filter((budget) => budget.id !== expiredBudget.id)
    .sort(
      (left, right) => left.periodStart.getTime() - right.periodStart.getTime(),
    );

  assert.equal(createdCount, 2);
  assert.deepEqual(
    renewedBudgets.map((budget) => [
      budget.periodStart.toISOString().slice(0, 10),
      budget.periodEnd.toISOString().slice(0, 10),
    ]),
    [
      ['2026-10-01', '2026-10-31'],
      ['2026-11-01', '2026-11-30'],
    ],
  );
  assert.ok(
    renewedBudgets.every(
      (budget) =>
        budget.status === 'approved' &&
        budget.createdByUserId === expiredBudget.createdByUserId &&
        budget.amountMinorUnits === expiredBudget.amountMinorUnits &&
        budget.items.length === 0 &&
        budget.approvals.length === 1 &&
        budget.approvals[0]?.approvedAt !== null,
    ),
  );
  assert.equal(store.notifications.length, 4);
  assert.equal(expiredBudget.renewedAt?.toISOString(), now.toISOString());
  assert.ok(
    store.notifications.every(
      (notification) =>
        notification.title === 'Budget renewed' &&
        notification.targetType === 'budget',
    ),
  );

  assert.equal(await service.rolloverExpiredBudgets(now), 0);
  assert.equal(store.budgets.length, 3);
});

test('renewal waits for the latest period approval and uses its updated settings', async () => {
  const expiredBudget = createBudget();
  const editedBudget = createBudget({
    id: 'budget-2',
    name: 'Updated household',
    currency: 'EUR',
    amountMinorUnits: 125_000,
    periodStart: new Date('2026-10-01T00:00:00.000Z'),
    periodEnd: new Date('2026-10-31T23:59:59.999Z'),
    status: 'pending_approval',
    approvals: [
      {
        id: 'approval-2',
        budgetId: 'budget-2',
        memberUserId: 'member-3',
        approvedAt: null,
      },
    ],
  });
  const store = createDb([expiredBudget, editedBudget]);
  const service = new PrismaBudgetService(store.client);
  const now = new Date('2026-11-15T12:00:00.000Z');

  assert.equal(await service.rolloverExpiredBudgets(now), 0);
  assert.equal(store.budgets.length, 2);
  assert.equal(expiredBudget.renewedAt?.toISOString(), now.toISOString());

  editedBudget.status = 'approved';
  editedBudget.approvals[0]!.approvedAt = now;
  assert.equal(await service.rolloverExpiredBudgets(now), 1);

  const renewedBudget = store.budgets.find(
    (budget) => budget.periodStart.toISOString() === '2026-11-01T00:00:00.000Z',
  );
  assert.equal(renewedBudget?.name, 'Updated household');
  assert.equal(renewedBudget?.currency, 'EUR');
  assert.equal(renewedBudget?.amountMinorUnits, 125_000);
  assert.equal(renewedBudget?.approvals[0]?.memberUserId, 'member-3');
});

test('deleting a budget removes every period in its recurring series', async () => {
  const budgets = [
    createBudget(),
    createBudget({
      id: 'budget-2',
      periodStart: new Date('2026-10-01T00:00:00.000Z'),
      periodEnd: new Date('2026-10-31T23:59:59.999Z'),
    }),
    createBudget({
      id: 'other-series',
      seriesId: 'other-series',
      relationshipId: 'relationship-2',
    }),
  ];
  const cleanedUp: {
    approvals: string[];
    items: string[];
    notifications: string[];
  } = { approvals: [], items: [], notifications: [] };
  let client = {} as PrismaClient;
  const transactionClient = {
    budget: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; seriesId?: string; updatedAt?: Date };
      }) =>
        budgets.find(
          (budget) =>
            budget.id === where.id &&
            (!where.seriesId || budget.seriesId === where.seriesId) &&
            (!where.updatedAt ||
              budget.updatedAt.getTime() === where.updatedAt.getTime()),
        ) ?? null,
      findMany: async ({ where }: { where: { seriesId: string } }) =>
        budgets
          .filter((budget) => budget.seriesId === where.seriesId)
          .map(({ id }) => ({ id })),
      deleteMany: async ({ where }: { where: { seriesId: string } }) => {
        const deleted = budgets.filter(
          (budget) => budget.seriesId === where.seriesId,
        );
        for (const budget of deleted) {
          budgets.splice(budgets.indexOf(budget), 1);
        }
        return { count: deleted.length };
      },
    },
    budgetApproval: {
      deleteMany: async ({
        where,
      }: {
        where: { budgetId: { in: string[] } };
      }) => {
        cleanedUp.approvals.push(...where.budgetId.in);
        return { count: where.budgetId.in.length };
      },
    },
    budgetItem: {
      deleteMany: async ({
        where,
      }: {
        where: { budgetId: { in: string[] } };
      }) => {
        cleanedUp.items.push(...where.budgetId.in);
        return { count: where.budgetId.in.length };
      },
    },
    notification: {
      deleteMany: async ({
        where,
      }: {
        where: { targetId: { in: string[] } };
      }) => {
        cleanedUp.notifications.push(...where.targetId.in);
        return { count: where.targetId.in.length };
      },
    },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(client),
  } as unknown as PrismaClient;
  client = transactionClient;

  await new PrismaBudgetService(client).deleteBudget('creator-1', 'budget-2');

  assert.deepEqual(
    budgets.map(({ id }) => id),
    ['other-series'],
  );
  assert.deepEqual(cleanedUp.approvals, ['budget-1', 'budget-2']);
  assert.deepEqual(cleanedUp.items, ['budget-1', 'budget-2']);
  assert.deepEqual(cleanedUp.notifications, ['budget-1', 'budget-2']);
});

test('yearly rollover preserves calendar boundaries across leap years', async () => {
  const expiredBudget = createBudget({
    period: 'yearly',
    periodStart: new Date('2024-01-01T00:00:00.000Z'),
    periodEnd: new Date('2024-12-31T23:59:59.999Z'),
  });
  const store = createDb([expiredBudget]);
  const service = new PrismaBudgetService(store.client);

  const createdCount = await service.rolloverExpiredBudgets(
    new Date('2025-01-02T12:00:00.000Z'),
  );
  const renewedBudget = store.budgets.find(
    (budget) => budget.id !== expiredBudget.id,
  );

  assert.equal(createdCount, 1);
  assert.equal(
    renewedBudget?.periodStart.toISOString(),
    '2025-01-01T00:00:00.000Z',
  );
  assert.equal(
    renewedBudget?.periodEnd.toISOString(),
    '2025-12-31T23:59:59.999Z',
  );
});
