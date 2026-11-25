import type { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PrismaJointAccountChargeService } from './service';

type StoredCharge = {
  id: string;
  relationshipId: string;
  paymentRequestId?: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  name: string;
  amountMinorUnits: number;
  chargeDate: Date;
  status: 'unpaid' | 'paid';
  createdAt: Date;
  updatedAt: Date;
};

type ChargeWhere = {
  id?: string;
  relationshipId?: string;
  createdByUserId?: string;
  status?: 'unpaid' | 'paid';
};

type StoredNotification = {
  recipientUserId: string;
  eventId: string;
  title: string;
  body: string;
  deliveryStatus: 'pending';
};

type StoredNotificationInput = StoredNotification & {
  targetType: string;
  targetId: string;
  targetRelationshipId: string | null;
};

type StoredNotificationTarget = Pick<
  StoredNotificationInput,
  'recipientUserId' | 'targetType' | 'targetId' | 'targetRelationshipId'
>;

function createCharge(overrides: Partial<StoredCharge> = {}): StoredCharge {
  const now = new Date('2026-10-25T12:00:00.000Z');
  return {
    id: 'charge-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'creator-1',
    updatedByUserId: null,
    name: 'Groceries',
    amountMinorUnits: 4200,
    chargeDate: now,
    status: 'unpaid',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createDb(
  userId: string,
  initialCharge = createCharge(),
  isMember = true,
) {
  let charge = initialCharge;
  let findManyWhere: unknown;
  let unpaidSummaryAggregateWhere: unknown;
  let currentUserUnpaidCountWhere: unknown;
  const updateManyWhere: unknown[] = [];
  const notifications: StoredNotification[] = [];
  const notificationTargets: StoredNotificationTarget[] = [];
  const notification = {
    createMany: async ({ data }: { data: StoredNotificationInput[] }) => {
      data.forEach(
        ({ targetType, targetId, targetRelationshipId, ...notification }) => {
          notifications.push(notification);
          notificationTargets.push({
            recipientUserId: notification.recipientUserId,
            targetType,
            targetId,
            targetRelationshipId,
          });
        },
      );
      return { count: data.length };
    },
    findMany: async () => [],
  };
  const client = {
    relationshipMember: {
      findFirst: async ({
        where,
      }: {
        where: { userId: string; relationshipId: string; active: boolean };
      }) =>
        isMember && where.userId === userId && where.active
          ? { id: 'relationship-member-1' }
          : null,
      findMany: async ({
        where,
      }: {
        where: {
          relationshipId: string;
          active: boolean;
          userId?: { notIn: string[] };
        };
      }) =>
        where.relationshipId === 'relationship-1' && where.active
          ? ['creator-1', 'member-2']
              .filter((memberUserId) =>
                where.userId?.notIn
                  ? !where.userId.notIn.includes(memberUserId)
                  : true,
              )
              .map((userId) => ({ userId }))
          : [],
    },
    jointAccountCharge: {
      create: async ({
        data,
      }: {
        data: {
          relationshipId: string;
          createdByUserId: string;
          name: string;
          amountMinorUnits: number;
        };
      }) => {
        const now = new Date('2026-10-25T12:00:00.000Z');
        charge = {
          ...data,
          id: 'charge-1',
          updatedByUserId: null,
          chargeDate: now,
          status: 'unpaid',
          createdAt: now,
          updatedAt: now,
        };
        return charge;
      },
      findMany: async ({ where }: { where: unknown }) => {
        findManyWhere = where;
        return [charge];
      },
      aggregate: async ({ where }: { where: ChargeWhere }) => {
        unpaidSummaryAggregateWhere = where;
        const matchesWhere =
          where.relationshipId === charge.relationshipId &&
          (where.status === undefined || where.status === charge.status);
        return {
          _sum: {
            amountMinorUnits: matchesWhere ? charge.amountMinorUnits : null,
          },
        };
      },
      count: async ({ where }: { where: ChargeWhere }) => {
        currentUserUnpaidCountWhere = where;
        return where.relationshipId === charge.relationshipId &&
          where.createdByUserId === charge.createdByUserId &&
          where.status === charge.status
          ? 1
          : 0;
      },
      findFirst: async ({
        where,
        select,
      }: {
        where: {
          id?: string;
          relationshipId?: string;
          relationship?: {
            members: { some: { userId: string; active: boolean } };
          };
        };
        select?: { chargeDate?: true };
      }) => {
        const memberFilter = where.relationship?.members.some;
        if (
          where.id === undefined &&
          where.relationshipId === charge.relationshipId
        ) {
          return select?.chargeDate
            ? { chargeDate: charge.chargeDate }
            : charge;
        }
        return isMember &&
          where.id === charge.id &&
          memberFilter?.userId === userId
          ? charge
          : null;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: ChargeWhere;
        data: Partial<StoredCharge>;
      }) => {
        updateManyWhere.push(where);
        if (
          (where.id !== undefined && where.id !== charge.id) ||
          where.relationshipId !== charge.relationshipId ||
          where.createdByUserId !== userId ||
          where.createdByUserId !== charge.createdByUserId ||
          (where.status !== undefined && where.status !== charge.status)
        ) {
          return { count: 0 };
        }
        charge = {
          ...charge,
          ...data,
          updatedAt: new Date('2026-10-25T13:00:00.000Z'),
        };
        return { count: 1 };
      },
    },
    notification,
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(client),
  } as unknown as PrismaClient;

  return {
    client,
    getCharge: () => charge,
    getFindManyWhere: () => findManyWhere,
    getUnpaidSummaryAggregateWhere: () => unpaidSummaryAggregateWhere,
    getCurrentUserUnpaidCountWhere: () => currentUserUnpaidCountWhere,
    getUpdateManyWhere: () => updateManyWhere,
    notificationTargets,
    notifications,
  };
}

test('relationship members can list charges with every supported filter', async () => {
  const store = createDb('member-2');
  const service = new PrismaJointAccountChargeService(store.client);
  const fromDate = '2026-10-01T00:00:00.000Z';
  const toDate = '2026-10-31T23:59:59.999Z';

  const response = await service.listCharges('member-2', 'relationship-1', {
    name: '  groc ',
    status: 'unpaid',
    createdByUserId: 'creator-1',
    minimumAmountMinorUnits: 1000,
    maximumAmountMinorUnits: 5000,
    fromDate,
    toDate,
    limit: 5,
  });

  assert.equal(response.items.length, 1);
  assert.equal(response.items[0]?.chargeDate, '2026-10-25T12:00:00.000Z');
  assert.deepEqual(response.calendarDateBounds, {
    earliestDate: '2026-10-25T12:00:00.000Z',
    latestDate: '2026-10-25T12:00:00.000Z',
  });
  assert.deepEqual(response.unpaidSummary, {
    totalAmountMinorUnits: 4200,
    currentUserChargeCount: 0,
  });
  assert.deepEqual(store.getUnpaidSummaryAggregateWhere(), {
    relationshipId: 'relationship-1',
    status: 'unpaid',
  });
  assert.deepEqual(store.getCurrentUserUnpaidCountWhere(), {
    relationshipId: 'relationship-1',
    createdByUserId: 'member-2',
    status: 'unpaid',
  });
  assert.deepEqual(store.getFindManyWhere(), {
    relationshipId: 'relationship-1',
    status: 'unpaid',
    name: { contains: 'groc', mode: 'insensitive' },
    createdByUserId: 'creator-1',
    amountMinorUnits: { gte: 1000, lte: 5000 },
    chargeDate: {
      gte: new Date(fromDate),
      lte: new Date(toDate),
    },
  });
});

test('creating a charge notifies every other active relationship member', async () => {
  const store = createDb('creator-1');
  const service = new PrismaJointAccountChargeService(store.client);

  const charge = await service.createCharge('creator-1', 'relationship-1', {
    name: '  Groceries  ',
    amountMinorUnits: 4200,
  });

  assert.equal(charge.name, 'Groceries');
  assert.deepEqual(store.notifications, [
    {
      recipientUserId: 'member-2',
      eventId: 'charge-1',
      title: 'New joint account charge',
      body: 'Groceries',
      deliveryStatus: 'pending',
    },
  ]);
  assert.deepEqual(store.notificationTargets, [
    {
      recipientUserId: 'member-2',
      targetType: 'jointAccountCharge',
      targetId: charge.id,
      targetRelationshipId: null,
    },
  ]);
});

test('any active relationship member can view a charge', async () => {
  const service = new PrismaJointAccountChargeService(
    createDb('member-2').client,
  );

  const charge = await service.getCharge('member-2', 'charge-1');

  assert.equal(charge.createdByUserId, 'creator-1');
  assert.equal(charge.name, 'Groceries');
});

test('only the creator can update or mark a charge paid', async () => {
  const service = new PrismaJointAccountChargeService(
    createDb('member-2').client,
  );

  await assert.rejects(
    service.updateCharge('member-2', 'charge-1', {
      name: 'Updated groceries',
      amountMinorUnits: 5000,
      chargeDate: '2026-10-26T12:00:00.000Z',
    }),
    { statusCode: 403 },
  );
  await assert.rejects(service.markChargePaid('member-2', 'charge-1'), {
    statusCode: 403,
  });
});

test('the creator can edit the charge name, amount, and date', async () => {
  const store = createDb('creator-1');
  const service = new PrismaJointAccountChargeService(store.client);
  const chargeDate = '2026-10-26T12:00:00.000Z';

  const charge = await service.updateCharge('creator-1', 'charge-1', {
    name: 'Updated groceries',
    amountMinorUnits: 5000,
    chargeDate,
  });

  assert.equal(charge.name, 'Updated groceries');
  assert.equal(charge.amountMinorUnits, 5000);
  assert.equal(charge.chargeDate, chargeDate);
  assert.equal(charge.updatedByUserId, 'creator-1');
  assert.equal(charge.updatedAt, '2026-10-25T13:00:00.000Z');
  assert.equal(store.getCharge().updatedByUserId, 'creator-1');
  assert.equal(store.getCharge().chargeDate.toISOString(), chargeDate);
});

test('the creator can mark an unpaid charge paid, and repeated calls are safe', async () => {
  const store = createDb('creator-1');
  const service = new PrismaJointAccountChargeService(store.client);

  const paidCharge = await service.markChargePaid('creator-1', 'charge-1');
  const repeatedCharge = await service.markChargePaid('creator-1', 'charge-1');

  assert.equal(paidCharge.status, 'paid');
  assert.equal(paidCharge.updatedByUserId, 'creator-1');
  assert.equal(paidCharge.updatedAt, '2026-10-25T13:00:00.000Z');
  assert.equal(repeatedCharge.status, 'paid');
  assert.equal(store.getCharge().status, 'paid');
});

test('bulk marking paid updates only the current user’s unpaid charges', async () => {
  const store = createDb('creator-1');
  const service = new PrismaJointAccountChargeService(store.client);

  const response = await service.markAllChargesPaid(
    'creator-1',
    'relationship-1',
  );

  assert.deepEqual(response, { updatedCount: 1 });
  assert.equal(store.getCharge().status, 'paid');
  assert.equal(store.getCharge().updatedByUserId, 'creator-1');
  assert.deepEqual(store.getUpdateManyWhere(), [
    {
      relationshipId: 'relationship-1',
      createdByUserId: 'creator-1',
      status: 'unpaid',
    },
  ]);

  const otherMemberStore = createDb('member-2');
  const otherMemberService = new PrismaJointAccountChargeService(
    otherMemberStore.client,
  );
  const otherMemberResponse = await otherMemberService.markAllChargesPaid(
    'member-2',
    'relationship-1',
  );

  assert.deepEqual(otherMemberResponse, { updatedCount: 0 });
  assert.equal(otherMemberStore.getCharge().status, 'unpaid');
});

test('members outside a relationship cannot retrieve its charges', async () => {
  const service = new PrismaJointAccountChargeService(
    createDb('outsider', createCharge(), false).client,
  );

  await assert.rejects(service.getCharge('outsider', 'charge-1'), {
    statusCode: 404,
  });
  await assert.rejects(service.listCharges('outsider', 'relationship-1', {}), {
    statusCode: 404,
  });
});

test('charge details include the associated payment request ID', async () => {
  const paymentRequestId = 'payment-request-1';
  const store = createDb('member-2', createCharge({ paymentRequestId }));
  const service = new PrismaJointAccountChargeService(store.client);

  const charge = await service.getCharge('member-2', 'charge-1');

  assert.equal(charge.paymentRequestId, paymentRequestId);
});

test('only the creator can delete a charge and its notifications', async () => {
  const charge = createCharge();
  const deleteCalls: { model: string; where: unknown }[] = [];
  const transaction = {
    jointAccountCharge: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deleteCalls.push({ model: 'jointAccountCharge', where });
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
    jointAccountCharge: { findFirst: async () => charge },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaClient;
  const service = new PrismaJointAccountChargeService(db);

  await assert.rejects(service.deleteCharge('member-2', charge.id), {
    statusCode: 403,
  });
  assert.deepEqual(deleteCalls, []);

  await service.deleteCharge('creator-1', charge.id);

  assert.deepEqual(deleteCalls, [
    {
      model: 'jointAccountCharge',
      where: {
        id: charge.id,
        relationshipId: charge.relationshipId,
        createdByUserId: 'creator-1',
      },
    },
    {
      model: 'notification',
      where: { targetType: 'jointAccountCharge', targetId: charge.id },
    },
  ]);
});
