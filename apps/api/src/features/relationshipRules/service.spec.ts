import type { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PrismaRelationshipRuleService } from './service';

type StoredApproval = {
  id: string;
  ruleId: string;
  memberUserId: string;
  agreedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredRule = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  name: string;
  labels: string[];
  description: string;
  status: 'pending_approval' | 'ratified';
  remindMeToReview: Date | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ratifiedAt?: Date | null;
  approvals: StoredApproval[];
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

function createRule(overrides: Partial<StoredRule> = {}): StoredRule {
  const now = new Date('2026-10-28T12:00:00.000Z');
  return {
    id: 'rule-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'creator-1',
    name: 'Quiet hours',
    labels: ['Home'],
    description: 'Keep noise low after 10 PM.',
    status: 'pending_approval',
    remindMeToReview: new Date('2027-10-28T12:00:00.000Z'),
    reminderSentAt: null,
    createdAt: now,
    updatedAt: now,
    ratifiedAt: null,
    approvals: [
      {
        id: 'approval-1',
        ruleId: 'rule-1',
        memberUserId: 'member-2',
        agreedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    ...overrides,
  };
}

function createDb(
  rules = [createRule()],
  activeMemberIds = ['creator-1', 'member-2', 'member-3'],
) {
  let nextRuleId = 2;
  let nextApprovalId = 1;
  const notifications: StoredNotification[] = [];
  const notificationTargets: StoredNotificationTarget[] = [];
  const client = {
    relationshipMember: {
      findFirst: async ({
        where,
      }: {
        where: {
          relationshipId: string;
          userId: string;
          active: boolean;
        };
      }) =>
        where.relationshipId === 'relationship-1' &&
        where.active &&
        activeMemberIds.includes(where.userId)
          ? { id: `relationship-member-${where.userId}` }
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
          ? activeMemberIds
              .filter((userId) =>
                where.userId?.notIn
                  ? !where.userId.notIn.includes(userId)
                  : true,
              )
              .map((userId) => ({ userId }))
          : [],
    },
    relationshipRule: {
      findMany: async ({
        where,
        take,
        cursor,
        skip,
      }: {
        where: {
          relationshipId?: string;
          remindMeToReview?: { lte: Date };
          reminderSentAt?: null;
        };
        take: number;
        cursor?: { id: string };
        skip?: number;
      }) => {
        if (where.remindMeToReview) {
          const cutoff = where.remindMeToReview.lte;
          return rules
            .filter(
              (rule) =>
                rule.remindMeToReview !== null &&
                rule.remindMeToReview <= cutoff &&
                rule.reminderSentAt === null,
            )
            .slice(0, take);
        }
        const matchingRules = rules
          .filter((rule) => rule.relationshipId === where.relationshipId)
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          );
        const cursorIndex = cursor
          ? matchingRules.findIndex(({ id }) => id === cursor.id)
          : -1;
        return matchingRules.slice(
          cursor ? cursorIndex + (skip ?? 0) : 0,
          (cursor ? cursorIndex + (skip ?? 0) : 0) + take,
        );
      },
      findFirst: async ({
        where,
      }: {
        where: {
          id: string;
          relationship?: {
            members: { some: { userId: string; active: boolean } };
          };
        };
      }) => {
        const userId = where.relationship?.members.some.userId;
        return userId && activeMemberIds.includes(userId)
          ? rules.find(({ id }) => id === where.id) ?? null
          : null;
      },
      create: async ({
        data,
      }: {
        data: {
          relationshipId: string;
          createdByUserId: string;
          name: string;
          labels: string[];
          description: string;
          status: 'pending_approval';
          ratifiedAt: null;
          remindMeToReview: Date | null;
          approvals: { create: { memberUserId: string; agreedAt: null }[] };
        };
      }) => {
        const now = new Date('2026-10-28T12:30:00.000Z');
        const id = `rule-${nextRuleId++}`;
        const rule = createRule({
          id,
          relationshipId: data.relationshipId,
          createdByUserId: data.createdByUserId,
          name: data.name,
          labels: data.labels,
          description: data.description,
          status: data.status,
          ratifiedAt: data.ratifiedAt,
          remindMeToReview: data.remindMeToReview,
          createdAt: now,
          updatedAt: now,
          approvals: data.approvals.create.map(({ memberUserId }, index) => ({
            id: `approval-${id}-${index + 1}`,
            ruleId: id,
            memberUserId,
            agreedAt: null,
            createdAt: now,
            updatedAt: now,
          })),
        });
        rules.push(rule);
        return rule;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id: string;
          createdByUserId?: string;
          updatedAt?: Date;
          status?: 'pending_approval';
          ratifiedAt?: null;
          OR?: { ratifiedAt: null | { isSet: false } }[];
          remindMeToReview?: { lte: Date };
          reminderSentAt?: null;
        };
        data: Partial<StoredRule>;
      }) => {
        const rule = rules.find(
          (candidate) =>
            candidate.id === where.id &&
            (!where.createdByUserId ||
              candidate.createdByUserId === where.createdByUserId) &&
            (!where.updatedAt ||
              candidate.updatedAt.getTime() === where.updatedAt.getTime()),
        );
        if (!rule) return { count: 0 };
        if ('reminderSentAt' in where) {
          const cutoff = where.remindMeToReview?.lte;
          if (
            rule.reminderSentAt !== null ||
            rule.remindMeToReview === null ||
            !cutoff ||
            rule.remindMeToReview > cutoff
          ) {
            return { count: 0 };
          }
        }
        if (where.status !== undefined && rule.status !== where.status) {
          return { count: 0 };
        }
        if (
          where.OR &&
          !where.OR.some(({ ratifiedAt }) =>
            ratifiedAt === null
              ? rule.ratifiedAt === null
              : rule.ratifiedAt === undefined,
          )
        ) {
          return { count: 0 };
        }
        if ('ratifiedAt' in where && rule.ratifiedAt !== where.ratifiedAt) {
          return { count: 0 };
        }
        Object.assign(rule, data);
        rule.updatedAt = new Date();
        return { count: 1 };
      },
    },
    relationshipRuleApproval: {
      deleteMany: async ({ where }: { where: { ruleId: string } }) => {
        const rule = rules.find(({ id }) => id === where.ruleId);
        if (!rule) return { count: 0 };
        const count = rule.approvals.length;
        rule.approvals = [];
        return { count };
      },
      createMany: async ({
        data,
      }: {
        data: { ruleId: string; memberUserId: string; agreedAt: null }[];
      }) => {
        const now = new Date();
        data.forEach(({ ruleId, memberUserId, agreedAt }) => {
          const rule = rules.find(({ id }) => id === ruleId);
          rule?.approvals.push({
            id: `approval-${nextApprovalId++}`,
            ruleId,
            memberUserId,
            agreedAt,
            createdAt: now,
            updatedAt: now,
          });
        });
        return { count: data.length };
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id?: string;
          ruleId?: string;
          memberUserId?: string;
          OR?: { agreedAt: null | { isSet: false } }[];
        };
        data: { agreedAt: Date | null };
      }) => {
        const approvals = rules
          .flatMap(({ approvals }) => approvals)
          .filter(
            (candidate) =>
              (where.id === undefined || candidate.id === where.id) &&
              (where.ruleId === undefined ||
                candidate.ruleId === where.ruleId) &&
              (where.memberUserId === undefined ||
                candidate.memberUserId === where.memberUserId) &&
              (where.OR === undefined ||
                where.OR.some(({ agreedAt }) =>
                  agreedAt === null
                    ? candidate.agreedAt === null
                    : candidate.agreedAt === undefined,
                )),
          );
        if (approvals.length === 0) return { count: 0 };
        const updatedAt = data.agreedAt ?? new Date();
        approvals.forEach((approval) => {
          approval.agreedAt = data.agreedAt;
          approval.updatedAt = updatedAt;
        });
        return { count: approvals.length };
      },
      count: async ({
        where,
      }: {
        where: {
          ruleId: string;
          OR: { agreedAt: null | { isSet: false } }[];
        };
      }) =>
        rules
          .flatMap(({ approvals }) => approvals)
          .filter(
            (approval) =>
              approval.ruleId === where.ruleId &&
              where.OR.some(({ agreedAt }) =>
                agreedAt === null
                  ? approval.agreedAt === null
                  : approval.agreedAt === undefined,
              ),
          ).length,
    },
    notification: {
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
    },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(client),
  } as unknown as PrismaClient;

  return {
    client,
    getRules: () => rules,
    notificationTargets,
    notifications,
  };
}

test('relationship members can list paginated rules with their approval status', async () => {
  const firstRule = createRule();
  const secondRule = createRule({
    id: 'rule-2',
    name: 'Weekly planning',
    createdAt: new Date('2026-10-27T12:00:00.000Z'),
  });
  const store = createDb([firstRule, secondRule]);
  const service = new PrismaRelationshipRuleService(store.client);

  const response = await service.listRelationshipRules(
    'member-2',
    'relationship-1',
    { limit: 1 },
  );

  assert.equal(response.items.length, 1);
  assert.deepEqual(response.items[0]?.labels, ['Home']);
  assert.equal(response.items[0]?.approvals[0]?.memberUserId, 'member-2');
  assert.equal(response.nextCursor, 'rule-1');
});

test('rule creation requires a different active member to approve', async () => {
  const service = new PrismaRelationshipRuleService(createDb().client);

  await assert.rejects(
    service.createRelationshipRule('creator-1', 'relationship-1', {
      name: 'Quiet hours',
      description: 'Keep noise low.',
      requiredApproverUserIds: [],
    }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.createRelationshipRule('creator-1', 'relationship-1', {
      name: 'Quiet hours',
      description: 'Keep noise low.',
      requiredApproverUserIds: ['creator-1'],
    }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.createRelationshipRule('creator-1', 'relationship-1', {
      name: 'Quiet hours',
      description: 'Keep noise low.',
      requiredApproverUserIds: ['outsider'],
    }),
    { statusCode: 400 },
  );
});

test('rule creation trims fields and starts pending approval', async () => {
  const store = createDb([]);
  const service = new PrismaRelationshipRuleService(store.client);
  const startedAt = new Date();

  const rule = await service.createRelationshipRule(
    'creator-1',
    'relationship-1',
    {
      name: '  Quiet hours  ',
      labels: ['  Home  ', '  Finances  '],
      description: '  Keep noise low after 10 PM.  ',
      requiredApproverUserIds: ['member-2'],
    },
  );

  assert.equal(rule.name, 'Quiet hours');
  assert.deepEqual(rule.labels, ['Home', 'Finances']);
  assert.equal(rule.description, 'Keep noise low after 10 PM.');
  assert.equal(rule.status, 'pending_approval');
  assert.ok(rule.remindMeToReview);
  const expectedReminderDate = new Date(startedAt);
  expectedReminderDate.setFullYear(expectedReminderDate.getFullYear() + 1);
  assert.ok(
    Math.abs(
      new Date(rule.remindMeToReview).getTime() -
        expectedReminderDate.getTime(),
    ) < 1000,
  );
  assert.equal(rule.createdByUserId, 'creator-1');
  assert.equal(rule.approvals[0]?.memberUserId, 'member-2');
  assert.equal(rule.ratifiedAt, undefined);
  assert.deepEqual(store.notifications, [
    {
      recipientUserId: 'member-2',
      eventId: rule.id,
      title: 'New relationship rule',
      body: 'Quiet hours',
      deliveryStatus: 'pending',
    },
    {
      recipientUserId: 'member-3',
      eventId: rule.id,
      title: 'New relationship rule',
      body: 'Quiet hours',
      deliveryStatus: 'pending',
    },
  ]);
  assert.deepEqual(store.notificationTargets, [
    {
      recipientUserId: 'member-2',
      targetType: 'relationshipRule',
      targetId: rule.id,
      targetRelationshipId: null,
    },
    {
      recipientUserId: 'member-3',
      targetType: 'relationshipRule',
      targetId: rule.id,
      targetRelationshipId: null,
    },
  ]);
});

test('rules can disable reminders or set a future review reminder', async () => {
  const service = new PrismaRelationshipRuleService(createDb([]).client);
  const input = {
    name: 'Quiet hours',
    description: 'Keep noise low after 10 PM.',
    requiredApproverUserIds: ['member-2'],
  };
  const neverExpires = await service.createRelationshipRule(
    'creator-1',
    'relationship-1',
    { ...input, remindMeToReview: null },
  );
  const reminderDate = new Date('2035-10-28T12:00:00.000Z');
  const customReminder = await service.createRelationshipRule(
    'creator-1',
    'relationship-1',
    { ...input, remindMeToReview: reminderDate.toISOString() },
  );

  assert.equal(neverExpires.remindMeToReview, null);
  assert.equal(customReminder.remindMeToReview, reminderDate.toISOString());
  await assert.rejects(
    service.createRelationshipRule('creator-1', 'relationship-1', {
      ...input,
      remindMeToReview: '2020-01-01T00:00:00.000Z',
    }),
    { statusCode: 400 },
  );
});

test('updating a rule as an approver makes them creator and reassigns approvals', async () => {
  const agreedAt = new Date('2026-10-28T13:00:00.000Z');
  const rule = createRule({
    status: 'ratified',
    ratifiedAt: agreedAt,
    approvals: [
      {
        ...createRule().approvals[0]!,
        agreedAt,
        updatedAt: agreedAt,
      },
      {
        id: 'approval-2',
        ruleId: 'rule-1',
        memberUserId: 'member-3',
        agreedAt,
        createdAt: agreedAt,
        updatedAt: agreedAt,
      },
    ],
  });
  const store = createDb(
    [rule],
    ['creator-1', 'member-2', 'member-3', 'member-4'],
  );
  const service = new PrismaRelationshipRuleService(store.client);

  const updatedRule = await service.updateRelationshipRule(
    'member-2',
    'rule-1',
    {
      name: 'Quiet hours at home',
      labels: ['Home', 'Quiet'],
      description: 'Keep noise low after 9 PM.',
    },
  );

  assert.equal(updatedRule.name, 'Quiet hours at home');
  assert.deepEqual(updatedRule.labels, ['Home', 'Quiet']);
  assert.equal(updatedRule.description, 'Keep noise low after 9 PM.');
  assert.equal(updatedRule.createdByUserId, 'member-2');
  assert.equal(updatedRule.status, 'pending_approval');
  assert.equal(updatedRule.ratifiedAt, undefined);
  assert.deepEqual(
    updatedRule.approvals.map((approval) => approval.memberUserId),
    ['creator-1', 'member-3'],
  );
  assert.ok(updatedRule.approvals.every((approval) => !approval.agreedAt));
  assert.deepEqual(
    store.notifications.map(({ recipientUserId, title, body }) => ({
      recipientUserId,
      title,
      body,
    })),
    [
      {
        recipientUserId: 'creator-1',
        title: 'Relationship rule updated',
        body: 'Quiet hours at home',
      },
      {
        recipientUserId: 'member-3',
        title: 'Relationship rule updated',
        body: 'Quiet hours at home',
      },
    ],
  );
  const [firstNotification, secondNotification] = store.notifications;
  assert.equal(firstNotification?.eventId, secondNotification?.eventId);
  assert.match(firstNotification?.eventId ?? '', /^[0-9a-f]{24}$/);
  assert.deepEqual(
    store.notificationTargets.map(({ recipientUserId, targetId }) => ({
      recipientUserId,
      targetId,
    })),
    [
      { recipientUserId: 'creator-1', targetId: 'rule-1' },
      { recipientUserId: 'member-3', targetId: 'rule-1' },
    ],
  );

  const firstAgreement = await service.agreeToRelationshipRule(
    'member-3',
    'rule-1',
  );
  assert.equal(firstAgreement.status, 'pending_approval');
  const finalAgreement = await service.agreeToRelationshipRule(
    'creator-1',
    'rule-1',
  );
  assert.equal(finalAgreement.status, 'ratified');
  assert.equal(finalAgreement.createdByUserId, 'member-2');
});

test('rule creators can update rules and unrelated members cannot', async () => {
  const store = createDb(
    [createRule()],
    ['creator-1', 'member-2', 'member-3', 'member-4'],
  );
  const service = new PrismaRelationshipRuleService(store.client);

  await assert.rejects(
    service.updateRelationshipRule('member-4', 'rule-1', {
      name: 'Changed name',
      description: 'Changed description.',
    }),
    { statusCode: 403 },
  );
  assert.equal(store.getRules()[0]?.name, 'Quiet hours');
  assert.deepEqual(store.notifications, []);

  const updatedRule = await service.updateRelationshipRule(
    'creator-1',
    'rule-1',
    { name: 'Changed name', description: 'Changed description.' },
  );
  assert.equal(updatedRule.createdByUserId, 'creator-1');
  assert.deepEqual(
    updatedRule.approvals.map((approval) => approval.memberUserId),
    ['member-2'],
  );
});

test('rule updates validate labels', async () => {
  const service = new PrismaRelationshipRuleService(createDb().client);

  await assert.rejects(
    service.updateRelationshipRule('creator-1', 'rule-1', {
      name: 'Quiet hours',
      description: 'Keep noise low after 10 PM.',
      labels: ['Home', 'Home'],
    }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.updateRelationshipRule('creator-1', 'rule-1', {
      name: 'Quiet hours',
      description: 'Keep noise low after 10 PM.',
      labels: ['a'.repeat(81)],
    }),
    { statusCode: 400 },
  );
});

test('due review reminders are created once for active relationship members', async () => {
  const rule = createRule({
    remindMeToReview: new Date('2026-10-27T12:00:00.000Z'),
  });
  const store = createDb([rule]);
  const service = new PrismaRelationshipRuleService(store.client);

  await service.deliverDueReviewReminders(new Date('2026-10-28T12:00:00.000Z'));
  await service.deliverDueReviewReminders(new Date('2026-10-28T12:00:00.000Z'));

  assert.equal(rule.reminderSentAt?.toISOString(), '2026-10-28T12:00:00.000Z');
  assert.deepEqual(store.notifications, [
    {
      recipientUserId: 'creator-1',
      eventId: rule.id,
      title: 'Time to review relationship rule',
      body: rule.name,
      deliveryStatus: 'pending',
    },
    {
      recipientUserId: 'member-2',
      eventId: rule.id,
      title: 'Time to review relationship rule',
      body: rule.name,
      deliveryStatus: 'pending',
    },
    {
      recipientUserId: 'member-3',
      eventId: rule.id,
      title: 'Time to review relationship rule',
      body: rule.name,
      deliveryStatus: 'pending',
    },
  ]);
});

test('rule creation validates labels', async () => {
  const service = new PrismaRelationshipRuleService(createDb([]).client);

  await assert.rejects(
    service.createRelationshipRule('creator-1', 'relationship-1', {
      name: 'Quiet hours',
      labels: ['Home', 'Home'],
      description: 'Keep noise low after 10 PM.',
      requiredApproverUserIds: ['member-2'],
    }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.createRelationshipRule('creator-1', 'relationship-1', {
      name: 'Quiet hours',
      labels: ['a'.repeat(81)],
      description: 'Keep noise low after 10 PM.',
      requiredApproverUserIds: ['member-2'],
    }),
    { statusCode: 400 },
  );
});

test('a rule becomes ratified after every required member agrees', async () => {
  const rule = createRule({
    approvals: [
      createRule().approvals[0]!,
      {
        id: 'approval-2',
        ruleId: 'rule-1',
        memberUserId: 'member-3',
        agreedAt: null,
        createdAt: new Date('2026-10-28T12:00:00.000Z'),
        updatedAt: new Date('2026-10-28T12:00:00.000Z'),
      },
    ],
  });
  delete rule.ratifiedAt;
  const store = createDb([rule]);
  const service = new PrismaRelationshipRuleService(store.client);

  const firstAgreement = await service.agreeToRelationshipRule(
    'member-2',
    'rule-1',
  );
  assert.equal(firstAgreement.status, 'pending_approval');
  assert.equal(firstAgreement.ratifiedAt, undefined);

  const ratifiedRule = await service.agreeToRelationshipRule(
    'member-3',
    'rule-1',
  );
  assert.equal(ratifiedRule.status, 'ratified');
  assert.ok(ratifiedRule.ratifiedAt);
  assert.ok(ratifiedRule.approvals.every((approval) => approval.agreedAt));

  const repeatedAgreement = await service.agreeToRelationshipRule(
    'member-2',
    'rule-1',
  );
  assert.equal(repeatedAgreement.status, 'ratified');
  assert.equal(repeatedAgreement.ratifiedAt, ratifiedRule.ratifiedAt);
});

test('agreement works when MongoDB approval dates are missing', async () => {
  const firstApproval = createRule().approvals[0]!;
  delete firstApproval.agreedAt;
  const secondApproval = {
    ...firstApproval,
    id: 'approval-2',
    memberUserId: 'member-3',
    agreedAt: null,
  };
  const rule = createRule({
    approvals: [firstApproval, secondApproval],
  });
  const service = new PrismaRelationshipRuleService(createDb([rule]).client);

  const firstAgreement = await service.agreeToRelationshipRule(
    'member-2',
    'rule-1',
  );
  assert.equal(firstAgreement.status, 'pending_approval');
  assert.ok(
    firstAgreement.approvals.find(
      ({ memberUserId }) => memberUserId === 'member-2',
    )?.agreedAt,
  );

  const finalAgreement = await service.agreeToRelationshipRule(
    'member-3',
    'rule-1',
  );
  assert.equal(finalAgreement.status, 'ratified');
});

test('only active relationship members and selected approvers can access or agree', async () => {
  const service = new PrismaRelationshipRuleService(
    createDb([createRule()], ['creator-1', 'member-2']).client,
  );

  await assert.rejects(service.getRelationshipRule('outsider', 'rule-1'), {
    statusCode: 404,
  });
  await assert.rejects(service.agreeToRelationshipRule('creator-1', 'rule-1'), {
    statusCode: 403,
  });
});

test('only the rule creator can delete a rule and its related records', async () => {
  const rule = createRule();
  const deleteCalls: { model: string; where: unknown }[] = [];
  const transaction = {
    relationshipRuleApproval: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deleteCalls.push({ model: 'relationshipRuleApproval', where });
        return { count: 1 };
      },
    },
    relationshipRule: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deleteCalls.push({ model: 'relationshipRule', where });
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
    relationshipRule: { findFirst: async () => rule },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaClient;
  const service = new PrismaRelationshipRuleService(db);

  await assert.rejects(service.deleteRelationshipRule('member-2', rule.id), {
    statusCode: 403,
  });
  assert.deepEqual(deleteCalls, []);

  await service.deleteRelationshipRule('creator-1', rule.id);

  assert.deepEqual(deleteCalls, [
    { model: 'relationshipRuleApproval', where: { ruleId: rule.id } },
    {
      model: 'relationshipRule',
      where: {
        id: rule.id,
        relationshipId: rule.relationshipId,
        createdByUserId: 'creator-1',
      },
    },
    {
      model: 'notification',
      where: { targetType: 'relationshipRule', targetId: rule.id },
    },
  ]);
});
