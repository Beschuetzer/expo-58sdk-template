import type { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PrismaTimeService } from './service';

type StoredMeTime = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  startTime: Date;
  endTime: Date;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredTask = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  updatedByUserId?: string | null;
  lastEditedAt?: Date | null;
  lastEditedFields?: string[];
  name: string;
  dueDate?: Date | null;
  lastReminderSentAt?: Date | null;
  reminderFrequencyDays?: number;
  visibleToUserIds: string[];
  completableByUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  completedByUserId?: string | null;
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

function createDb(
  entries: StoredMeTime[] = [],
  tasks: StoredTask[] = [],
  activeMemberIds = ['member-1', 'member-2'],
) {
  let nextEntryId = 1;
  let nextTaskId = 1;
  const notifications: StoredNotification[] = [];
  const notificationTargets: StoredNotificationTarget[] = [];
  let taskFindManyWhere: unknown;
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
    meTime: {
      findMany: async ({
        where,
        take,
        cursor,
        skip,
      }: {
        where: {
          relationshipId: string;
          startTime?: { gte?: Date; lt?: Date };
        };
        take: number;
        cursor?: { id: string };
        skip?: number;
      }) => {
        const matchingEntries = entries
          .filter(
            ({ relationshipId, startTime }) =>
              relationshipId === where.relationshipId &&
              (!where.startTime?.gte || startTime >= where.startTime.gte) &&
              (!where.startTime?.lt || startTime < where.startTime.lt),
          )
          .sort((left, right) => {
            const dateOrder =
              right.startTime.getTime() - left.startTime.getTime();
            return dateOrder || right.id.localeCompare(left.id);
          });
        const cursorIndex = cursor
          ? matchingEntries.findIndex(({ id }) => id === cursor.id)
          : -1;
        const offset = cursor ? Math.max(cursorIndex, 0) + (skip ?? 0) : 0;
        return matchingEntries.slice(offset, offset + take);
      },
      findFirst: async ({
        orderBy,
        select,
        where,
      }: {
        orderBy?: ({ startTime: 'asc' | 'desc' } | { id: 'asc' | 'desc' })[];
        select?: { startTime?: boolean };
        where: { id?: string; relationshipId: string };
      }) => {
        const matchingEntries = entries.filter(
          (entry) =>
            entry.relationshipId === where.relationshipId &&
            (!where.id || entry.id === where.id),
        );
        const sortDirection = orderBy?.find(
          (order) => 'startTime' in order,
        )?.startTime;
        const entry = matchingEntries.sort((left, right) => {
          const dateOrder =
            left.startTime.getTime() - right.startTime.getTime();
          if (dateOrder !== 0) {
            return sortDirection === 'desc' ? -dateOrder : dateOrder;
          }
          const idOrder = left.id.localeCompare(right.id);
          return sortDirection === 'desc' ? -idOrder : idOrder;
        })[0];
        if (!entry) return null;
        return select?.startTime ? { startTime: entry.startTime } : entry;
      },
      create: async ({
        data,
      }: {
        data: Omit<
          StoredMeTime,
          'id' | 'createdAt' | 'updatedAt' | 'description' | 'updatedByUserId'
        > & {
          description?: string;
        };
      }) => {
        const now = new Date('2026-10-29T12:00:00.000Z');
        const entry: StoredMeTime = {
          ...data,
          id: `me-time-${nextEntryId++}`,
          description: data.description ?? null,
          updatedByUserId: null,
          createdAt: now,
          updatedAt: now,
        };
        entries.push(entry);
        return entry;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id: string;
          relationshipId: string;
          createdByUserId: string;
        };
        data: {
          startTime: Date;
          endTime: Date;
          description: string | null;
          updatedByUserId: string;
        };
      }) => {
        const entry = entries.find(
          (candidate) =>
            candidate.id === where.id &&
            candidate.relationshipId === where.relationshipId &&
            candidate.createdByUserId === where.createdByUserId,
        );
        if (!entry) return { count: 0 };
        Object.assign(entry, data, {
          updatedAt: new Date('2026-10-29T13:00:00.000Z'),
        });
        return { count: 1 };
      },
    },
    relationshipTask: {
      findMany: async ({
        where,
        take,
        cursor,
        skip,
      }: {
        where: {
          relationshipId?: string;
          dueDate?: { lte?: Date };
          completedAt?: null | {
            isSet?: false;
            not?: null;
            gte?: Date;
            lt?: Date;
          };
          createdAt?: { gte?: Date; lt?: Date };
          OR?: { completedAt: null | { isSet?: false } }[];
        };
        take: number;
        cursor?: { id: string };
        skip?: number;
      }) => {
        taskFindManyWhere = where;
        const dueDateLimit = where.dueDate?.lte;
        if (dueDateLimit) {
          const matchingTasks = tasks
            .filter(
              (task) =>
                task.dueDate !== undefined &&
                task.dueDate !== null &&
                task.dueDate <= dueDateLimit &&
                (task.completedAt === null || task.completedAt === undefined),
            )
            .sort(
              (left, right) =>
                (left.dueDate?.getTime() ?? 0) -
                  (right.dueDate?.getTime() ?? 0) ||
                left.id.localeCompare(right.id),
            );
          const cursorIndex = cursor
            ? matchingTasks.findIndex(({ id }) => id === cursor.id)
            : -1;
          const offset = cursor ? Math.max(cursorIndex, 0) + (skip ?? 0) : 0;
          return matchingTasks.slice(offset, offset + take);
        }
        const completedOnly = where.completedAt !== undefined;
        const dateFilter =
          completedOnly && where.completedAt && where.completedAt !== null
            ? where.completedAt
            : where.createdAt;
        const matchingTasks = tasks
          .filter(
            (task) =>
              task.relationshipId === where.relationshipId &&
              (completedOnly
                ? task.completedAt !== null && task.completedAt !== undefined
                : where.OR?.some(({ completedAt }) =>
                    completedAt === null
                      ? task.completedAt === null
                      : task.completedAt === undefined,
                  ) === true) &&
              (completedOnly
                ? task.completedAt !== null &&
                  task.completedAt !== undefined &&
                  (!dateFilter?.gte || task.completedAt >= dateFilter.gte) &&
                  (!dateFilter?.lt || task.completedAt < dateFilter.lt)
                : (!dateFilter?.gte || task.createdAt >= dateFilter.gte) &&
                  (!dateFilter?.lt || task.createdAt < dateFilter.lt)),
          )
          .sort((left, right) => {
            const dateOrder = completedOnly
              ? (right.completedAt?.getTime() ?? 0) -
                (left.completedAt?.getTime() ?? 0)
              : right.createdAt.getTime() - left.createdAt.getTime();
            return dateOrder || right.id.localeCompare(left.id);
          });
        const cursorIndex = cursor
          ? matchingTasks.findIndex(({ id }) => id === cursor.id)
          : -1;
        const offset = cursor ? Math.max(cursorIndex, 0) + (skip ?? 0) : 0;
        return matchingTasks.slice(offset, offset + take);
      },
      create: async ({
        data,
      }: {
        data: Pick<
          StoredTask,
          | 'relationshipId'
          | 'createdByUserId'
          | 'name'
          | 'visibleToUserIds'
          | 'completableByUserIds'
          | 'dueDate'
          | 'reminderFrequencyDays'
        >;
      }) => {
        const now = new Date('2026-10-29T12:00:00.000Z');
        const task: StoredTask = {
          ...data,
          id: `task-${nextTaskId++}`,
          createdAt: now,
          updatedAt: now,
        };
        tasks.push(task);
        return task;
      },
      findFirst: async ({
        where,
        orderBy,
        select,
      }: {
        where: {
          id?: string;
          relationshipId: string;
          completedAt?: null | {
            isSet?: false;
            not?: null;
            gte?: Date;
            lt?: Date;
          };
          OR?: { completedAt: null | { isSet?: false } }[];
          AND?: {
            OR?: {
              createdByUserId?: string;
              visibleToUserIds?: { isEmpty?: boolean; has?: string };
            }[];
          }[];
        };
        orderBy?: {
          completedAt?: 'asc' | 'desc';
          createdAt?: 'asc' | 'desc';
          id?: 'asc' | 'desc';
        }[];
        select?: { id?: true; createdAt?: true; completedAt?: true };
      }) => {
        const completedOnly = where.completedAt !== undefined;
        const dateField = completedOnly ? 'completedAt' : 'createdAt';
        const dateFilter =
          completedOnly && where.completedAt && where.completedAt !== null
            ? where.completedAt
            : undefined;
        const visibleUserId = where.AND?.flatMap(
          (filter) => filter.OR ?? [],
        ).find((filter) => filter.visibleToUserIds?.has !== undefined)
          ?.visibleToUserIds?.has;
        const creatorUserId = where.AND?.flatMap(
          (filter) => filter.OR ?? [],
        ).find(
          (filter) => filter.createdByUserId !== undefined,
        )?.createdByUserId;
        const allowEmptyVisibility = where.AND?.flatMap(
          (filter) => filter.OR ?? [],
        ).some((filter) => filter.visibleToUserIds?.isEmpty === true);
        const matchingTasks = tasks
          .filter(
            (candidate) =>
              candidate.relationshipId === where.relationshipId &&
              (where.id === undefined || candidate.id === where.id) &&
              (completedOnly
                ? candidate.completedAt !== null &&
                  candidate.completedAt !== undefined &&
                  (!dateFilter?.gte ||
                    candidate.completedAt >= dateFilter.gte) &&
                  (!dateFilter?.lt || candidate.completedAt < dateFilter.lt)
                : where.OR
                  ? where.OR.some(({ completedAt }) =>
                      completedAt === null
                        ? candidate.completedAt === null
                        : candidate.completedAt === undefined,
                    )
                  : true) &&
              (!where.AND ||
                (allowEmptyVisibility &&
                  candidate.visibleToUserIds.length === 0) ||
                (visibleUserId !== undefined &&
                  candidate.visibleToUserIds.includes(visibleUserId)) ||
                (creatorUserId !== undefined &&
                  candidate.createdByUserId === creatorUserId)),
          )
          .sort((left, right) => {
            const leftDate =
              dateField === 'completedAt'
                ? left.completedAt?.getTime() ?? 0
                : left.createdAt.getTime();
            const rightDate =
              dateField === 'completedAt'
                ? right.completedAt?.getTime() ?? 0
                : right.createdAt.getTime();
            const direction =
              orderBy?.find((order) => order[dateField] !== undefined)?.[
                dateField
              ] ?? 'asc';
            const dateOrder = leftDate - rightDate;
            return direction === 'desc' ? -dateOrder : dateOrder;
          });
        const task = matchingTasks[0];
        if (!task) return null;
        if (select?.id) return { id: task.id };
        if (select?.completedAt) return { completedAt: task.completedAt };
        if (select?.createdAt) return { createdAt: task.createdAt };
        return task;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: {
          completedAt: Date;
          completedByUserId: string;
        };
      }) => {
        const task = tasks.find(({ id }) => id === where.id);
        assert(task);
        Object.assign(task, data, { updatedAt: data.completedAt });
        return task;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id: string;
          relationshipId?: string;
          updatedAt?: Date;
          dueDate?: { lte?: Date };
          OR?: { completedAt: null | { isSet?: false } }[];
        };
        data: {
          lastReminderSentAt?: Date | null;
          name?: string;
          dueDate?: Date | null;
          reminderFrequencyDays?: number;
          visibleToUserIds?: string[];
          completableByUserIds?: string[];
          updatedByUserId?: string;
          lastEditedAt?: Date;
          lastEditedFields?: string[];
        };
      }) => {
        const task = tasks.find(
          (candidate) =>
            candidate.id === where.id &&
            (!where.relationshipId ||
              candidate.relationshipId === where.relationshipId),
        );
        if (!task) return { count: 0 };

        if (data.name !== undefined) {
          if (
            (where.updatedAt &&
              task.updatedAt.getTime() !== where.updatedAt.getTime()) ||
            (task.completedAt !== null && task.completedAt !== undefined)
          ) {
            return { count: 0 };
          }
          Object.assign(task, data, {
            updatedAt: new Date('2026-10-29T13:00:00.000Z'),
          });
          return { count: 1 };
        }

        const dueDateLimit = where.dueDate?.lte;
        const reminderSentAt = data.lastReminderSentAt;
        if (!reminderSentAt) return { count: 0 };
        if (
          !dueDateLimit ||
          !task.dueDate ||
          task.dueDate > dueDateLimit ||
          (task.completedAt !== null && task.completedAt !== undefined) ||
          (task.lastReminderSentAt !== null &&
            task.lastReminderSentAt !== undefined &&
            reminderSentAt.getTime() - task.lastReminderSentAt.getTime() <
              (task.reminderFrequencyDays ?? 1) * 24 * 60 * 60 * 1000)
        ) {
          return { count: 0 };
        }
        task.lastReminderSentAt = reminderSentAt;
        return { count: 1 };
      },
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
    entries,
    getTaskFindManyWhere: () => taskFindManyWhere,
    notificationTargets,
    notifications,
    tasks,
  };
}

function createEntry(
  id: string,
  startTime: string,
  relationshipId = 'relationship-1',
): StoredMeTime {
  const createdAt = new Date(startTime);
  return {
    id,
    relationshipId,
    createdByUserId: 'member-1',
    startTime: createdAt,
    endTime: new Date(createdAt.getTime() + 60 * 60 * 1000),
    description: 'Reading',
    createdAt,
    updatedAt: createdAt,
    updatedByUserId: null,
  };
}

function createTask(
  id: string,
  createdAt: string,
  relationshipId = 'relationship-1',
  overrides: Partial<StoredTask> = {},
): StoredTask {
  const date = new Date(createdAt);
  return {
    id,
    relationshipId,
    createdByUserId: 'member-1',
    updatedByUserId: null,
    lastEditedAt: null,
    lastEditedFields: [],
    name: 'Go grocery shopping',
    visibleToUserIds: ['member-1', 'member-2'],
    completableByUserIds: ['member-1', 'member-2'],
    createdAt: date,
    updatedAt: date,
    completedAt: null,
    completedByUserId: null,
    ...overrides,
  };
}

test('Me Time is shared with every relationship member and cursor-paginated', async () => {
  const store = createDb([
    createEntry('entry-1', '2026-10-29T10:00:00.000Z'),
    createEntry('entry-2', '2026-10-28T10:00:00.000Z'),
    createEntry(
      'other-relationship-entry',
      '2026-10-30T10:00:00.000Z',
      'other',
    ),
  ]);
  const service = new PrismaTimeService(store.client);

  const firstPage = await service.listMeTime('member-2', 'relationship-1', {
    limit: 1,
  });
  const secondPage = await service.listMeTime('member-2', 'relationship-1', {
    limit: 1,
    cursor: firstPage.nextCursor,
  });

  assert.deepEqual(
    firstPage.items.map(({ id }) => id),
    ['entry-1'],
  );
  assert.equal(firstPage.nextCursor, 'entry-1');
  assert.deepEqual(
    secondPage.items.map(({ id }) => id),
    ['entry-2'],
  );
  assert.equal(secondPage.nextCursor, undefined);
});

test('Me Time calendar lists filter a month and include relationship date bounds', async () => {
  const store = createDb([
    createEntry('entry-october-latest', '2026-10-29T10:00:00.000Z'),
    createEntry('entry-october-earliest', '2026-10-01T10:00:00.000Z'),
    createEntry('entry-before-month', '2026-09-30T10:00:00.000Z'),
    createEntry('entry-after-month', '2026-11-01T10:00:00.000Z'),
  ]);
  const service = new PrismaTimeService(store.client);
  const filters = {
    startTimeFrom: '2026-10-01T00:00:00.000Z',
    startTimeBefore: '2026-11-01T00:00:00.000Z',
    limit: 1,
  };

  const firstPage = await service.listMeTime(
    'member-1',
    'relationship-1',
    filters,
  );
  const secondPage = await service.listMeTime('member-1', 'relationship-1', {
    ...filters,
    cursor: firstPage.nextCursor,
  });

  assert.deepEqual(
    firstPage.items.map(({ id }) => id),
    ['entry-october-latest'],
  );
  assert.equal(firstPage.earliestStartTime, '2026-09-30T10:00:00.000Z');
  assert.equal(firstPage.latestStartTime, '2026-11-01T10:00:00.000Z');
  assert.deepEqual(
    secondPage.items.map(({ id }) => id),
    ['entry-october-earliest'],
  );
  assert.equal(secondPage.earliestStartTime, undefined);
  assert.equal(secondPage.latestStartTime, undefined);
});

test('Me Time details are scoped to active relationship members', async () => {
  const store = createDb([
    createEntry('entry-1', '2026-10-29T10:00:00.000Z'),
    createEntry(
      'other-relationship-entry',
      '2026-10-30T10:00:00.000Z',
      'other',
    ),
  ]);
  const service = new PrismaTimeService(store.client);

  const entry = await service.getMeTimeById(
    'member-2',
    'relationship-1',
    'entry-1',
  );

  assert.equal(entry.id, 'entry-1');
  assert.equal(entry.description, 'Reading');
  await assert.rejects(
    service.getMeTimeById(
      'member-2',
      'relationship-1',
      'other-relationship-entry',
    ),
    { statusCode: 404 },
  );
  await assert.rejects(
    service.getMeTimeById('outsider', 'relationship-1', 'entry-1'),
    { statusCode: 403 },
  );
});

test('Me Time updates record the editing member and updated time', async () => {
  const entry = createEntry('entry-1', '2026-10-29T10:00:00.000Z');
  const store = createDb([entry]);
  const service = new PrismaTimeService(store.client);

  await assert.rejects(
    service.updateMeTime('member-2', 'relationship-1', 'entry-1', {
      startTime: '2026-10-29T12:00:00.000Z',
      endTime: '2026-10-29T13:00:00.000Z',
      description: 'A walk',
    }),
    { statusCode: 403 },
  );
  await assert.rejects(
    service.updateMeTime('member-1', 'relationship-1', 'entry-1', {
      startTime: '2026-10-29T12:00:00.000Z',
      endTime: '2026-10-29T11:00:00.000Z',
    }),
    { statusCode: 400 },
  );

  const updated = await service.updateMeTime(
    'member-1',
    'relationship-1',
    'entry-1',
    {
      startTime: '2026-10-29T12:00:00.000Z',
      endTime: '2026-10-29T13:00:00.000Z',
      description: '  A walk  ',
    },
  );

  assert.equal(updated.createdByUserId, 'member-1');
  assert.equal(updated.updatedByUserId, 'member-1');
  assert.equal(updated.description, 'A walk');
  assert.equal(updated.startTime, '2026-10-29T12:00:00.000Z');
  assert.equal(updated.endTime, '2026-10-29T13:00:00.000Z');
  assert.equal(updated.createdAt, '2026-10-29T10:00:00.000Z');
  assert.equal(updated.updatedAt, '2026-10-29T13:00:00.000Z');
});

test('Me Time creation trims optional descriptions and rejects invalid ranges', async () => {
  const store = createDb();
  const service = new PrismaTimeService(store.client);

  const entry = await service.createMeTime('member-1', 'relationship-1', {
    startTime: '2026-10-29T10:00:00.000Z',
    endTime: '2026-10-29T11:00:00.000Z',
    description: '  Read a book  ',
  });

  assert.equal(entry.createdByUserId, 'member-1');
  assert.equal(entry.description, 'Read a book');
  assert.equal(entry.startTime, '2026-10-29T10:00:00.000Z');
  assert.deepEqual(store.notifications, [
    {
      recipientUserId: 'member-2',
      eventId: entry.id,
      title: 'New Me time entry',
      body: 'New Me time was recorded: Read a book',
      deliveryStatus: 'pending',
    },
  ]);
  assert.deepEqual(store.notificationTargets, [
    {
      recipientUserId: 'member-2',
      targetType: 'meTime',
      targetId: entry.id,
      targetRelationshipId: 'relationship-1',
    },
  ]);
  await assert.rejects(
    service.createMeTime('member-1', 'relationship-1', {
      startTime: '2026-10-29T11:00:00.000Z',
      endTime: '2026-10-29T10:00:00.000Z',
    }),
    { statusCode: 400 },
  );
});

test('task creation and completion track the authenticated member and time', async () => {
  const store = createDb();
  const service = new PrismaTimeService(store.client);

  const task = await service.createTask('member-1', 'relationship-1', {
    name: '  Go grocery shopping  ',
    dueDate: '2026-10-30T09:00:00.000Z',
    reminderFrequencyDays: 2,
  });
  const completedTask = await service.completeTask(
    'member-2',
    'relationship-1',
    task.id,
  );

  assert.equal(task.name, 'Go grocery shopping');
  assert.equal(task.dueDate, '2026-10-30T09:00:00.000Z');
  assert.equal(task.reminderFrequencyDays, 2);
  assert.deepEqual(task.visibleToUserIds, ['member-1', 'member-2']);
  assert.deepEqual(task.completableByUserIds, ['member-1', 'member-2']);
  assert.equal(task.completedAt, undefined);
  assert.equal(completedTask.completedByUserId, 'member-2');
  assert.ok(completedTask.completedAt);
  assert.ok(Number.isFinite(Date.parse(completedTask.completedAt)));
  assert.deepEqual(store.notifications, [
    {
      recipientUserId: 'member-2',
      eventId: task.id,
      title: 'New shared task',
      body: 'Go grocery shopping',
      deliveryStatus: 'pending',
    },
  ]);
  assert.deepEqual(store.notificationTargets, [
    {
      recipientUserId: 'member-2',
      targetType: 'relationshipTask',
      targetId: task.id,
      targetRelationshipId: 'relationship-1',
    },
  ]);
});

test('completers can edit incomplete tasks and the last edit is recorded', async () => {
  const task = createTask(
    'task-1',
    '2026-10-29T10:00:00.000Z',
    'relationship-1',
    {
      dueDate: new Date('2026-10-30T09:00:00.000Z'),
      reminderFrequencyDays: 2,
      visibleToUserIds: ['member-1', 'member-2'],
      completableByUserIds: ['member-1'],
      lastReminderSentAt: new Date('2026-10-29T11:00:00.000Z'),
    },
  );
  const store = createDb([], [task]);
  const service = new PrismaTimeService(store.client);
  const input = {
    name: 'Sweep the kitchen',
    dueDate: '2026-10-31T09:00:00.000Z',
    reminderFrequencyDays: 3,
    visibleToUserIds: ['member-1'],
    completableByUserIds: ['member-1', 'member-2'],
  };

  await assert.rejects(
    service.updateTask('member-2', 'relationship-1', task.id, input),
    { statusCode: 403 },
  );

  const updated = await service.updateTask(
    'member-1',
    'relationship-1',
    task.id,
    input,
  );

  assert.equal(updated.name, 'Sweep the kitchen');
  assert.equal(updated.dueDate, '2026-10-31T09:00:00.000Z');
  assert.equal(updated.reminderFrequencyDays, 3);
  assert.deepEqual(updated.visibleToUserIds, ['member-1']);
  assert.deepEqual(updated.completableByUserIds, ['member-1', 'member-2']);
  assert.equal(updated.createdByUserId, 'member-1');
  assert.equal(updated.updatedByUserId, 'member-1');
  assert.equal(updated.lastEditedAt, task.lastEditedAt?.toISOString());
  assert.deepEqual(updated.lastEditedFields, [
    'name',
    'dueDate',
    'reminderFrequencyDays',
    'visibleToUserIds',
    'completableByUserIds',
  ]);
  assert.equal(updated.updatedAt, '2026-10-29T13:00:00.000Z');
  assert.equal(task.lastReminderSentAt, null);
});

test('completed tasks cannot be edited', async () => {
  const service = new PrismaTimeService(
    createDb(
      [],
      [
        createTask(
          'completed-task',
          '2026-10-29T10:00:00.000Z',
          'relationship-1',
          { completedAt: new Date('2026-10-30T10:00:00.000Z') },
        ),
      ],
    ).client,
  );

  await assert.rejects(
    service.updateTask('member-1', 'relationship-1', 'completed-task', {
      name: 'Updated task',
      visibleToUserIds: ['member-1'],
      completableByUserIds: ['member-1'],
    }),
    { statusCode: 409 },
  );
});

test('new tasks without completion fields appear in the incomplete task list', async () => {
  const service = new PrismaTimeService(createDb().client);

  const task = await service.createTask('member-1', 'relationship-1', {
    name: 'Go grocery shopping',
  });
  assert.equal(task.reminderFrequencyDays, 1);
  const incompleteTasks = await service.listTasks(
    'member-1',
    'relationship-1',
    { status: 'incomplete' },
  );

  assert.deepEqual(
    incompleteTasks.items.map(({ id }) => id),
    [task.id],
  );
});

test('task details are scoped to active relationship members', async () => {
  const store = createDb(
    [],
    [
      createTask('task-1', '2026-10-29T10:00:00.000Z'),
      createTask('hidden-task', '2026-10-29T10:00:00.000Z', 'relationship-1', {
        visibleToUserIds: ['member-1'],
      }),
      createTask('other-task', '2026-10-30T10:00:00.000Z', 'other'),
    ],
  );
  const service = new PrismaTimeService(store.client);

  const task = await service.getTaskById(
    'member-2',
    'relationship-1',
    'task-1',
  );

  assert.equal(task.id, 'task-1');
  assert.equal(task.name, 'Go grocery shopping');
  await assert.rejects(
    service.getTaskById('member-2', 'relationship-1', 'hidden-task'),
    { statusCode: 404 },
  );
  await assert.rejects(
    service.getTaskById('member-2', 'relationship-1', 'other-task'),
    { statusCode: 404 },
  );
  await assert.rejects(
    service.getTaskById('outsider', 'relationship-1', 'task-1'),
    { statusCode: 403 },
  );
});

test('only active relationship members can access time records and tasks', async () => {
  const service = new PrismaTimeService(createDb([], [], ['member-1']).client);

  await assert.rejects(service.listMeTime('outsider', 'relationship-1', {}), {
    statusCode: 403,
  });
  await assert.rejects(
    service.createTask('outsider', 'relationship-1', {
      name: 'Go grocery shopping',
    }),
    { statusCode: 403 },
  );
});

test('task pages separate status, hide restricted tasks, and order completions newest first', async () => {
  const store = createDb(
    [],
    [
      createTask('incomplete-1', '2026-10-29T10:00:00.000Z'),
      createTask(
        'incomplete-hidden',
        '2026-10-30T10:00:00.000Z',
        'relationship-1',
        {
          visibleToUserIds: ['member-1'],
        },
      ),
      createTask(
        'completed-old',
        '2026-10-27T10:00:00.000Z',
        'relationship-1',
        {
          completedAt: new Date('2026-10-28T10:00:00.000Z'),
          completedByUserId: 'member-1',
        },
      ),
      createTask(
        'completed-new',
        '2026-10-26T10:00:00.000Z',
        'relationship-1',
        {
          completedAt: new Date('2026-10-29T10:00:00.000Z'),
          completedByUserId: 'member-2',
        },
      ),
      createTask('other-task', '2026-10-30T10:00:00.000Z', 'other'),
    ],
  );
  const service = new PrismaTimeService(store.client);

  const firstPage = await service.listTasks('member-1', 'relationship-1', {
    limit: 1,
  });
  assert.deepEqual(
    firstPage.items.map(({ id }) => id),
    ['incomplete-hidden'],
  );
  assert.equal(firstPage.nextCursor, 'incomplete-hidden');
  const secondPage = await service.listTasks('member-1', 'relationship-1', {
    cursor: firstPage.nextCursor,
    limit: 1,
  });
  assert.deepEqual(
    secondPage.items.map(({ id }) => id),
    ['incomplete-1'],
  );
  const memberTwoIncompleteTasks = await service.listTasks(
    'member-2',
    'relationship-1',
    { limit: 10 },
  );
  assert.deepEqual(
    memberTwoIncompleteTasks.items.map(({ id }) => id),
    ['incomplete-1'],
  );

  const completedFirstPage = await service.listTasks(
    'member-2',
    'relationship-1',
    { limit: 1, status: 'completed' },
  );
  assert.deepEqual(
    completedFirstPage.items.map(({ id }) => id),
    ['completed-new'],
  );
  assert.equal(completedFirstPage.nextCursor, 'completed-new');
  const completedSecondPage = await service.listTasks(
    'member-2',
    'relationship-1',
    {
      cursor: completedFirstPage.nextCursor,
      limit: 1,
      status: 'completed',
    },
  );
  assert.deepEqual(
    completedSecondPage.items.map(({ id }) => id),
    ['completed-old'],
  );

  await assert.rejects(
    service.completeTask('member-1', 'relationship-1', 'other-task'),
    { statusCode: 404 },
  );
});

test('calendar-filtered task lists include tasks visible to their creator', async () => {
  const store = createDb(
    [],
    [
      createTask(
        'completed-earliest',
        '2026-09-10T12:00:00.000Z',
        'relationship-1',
        {
          completedAt: new Date('2026-09-15T12:00:00.000Z'),
          visibleToUserIds: ['member-2'],
        },
      ),
      createTask(
        'completed-in-month',
        '2026-10-10T12:00:00.000Z',
        'relationship-1',
        { completedAt: new Date('2026-10-15T12:00:00.000Z') },
      ),
      createTask(
        'completed-latest',
        '2026-11-02T12:00:00.000Z',
        'relationship-1',
        { completedAt: new Date('2026-11-05T12:00:00.000Z') },
      ),
      createTask(
        'completed-hidden',
        '2026-10-10T12:00:00.000Z',
        'relationship-1',
        {
          completedAt: new Date('2026-10-20T12:00:00.000Z'),
          visibleToUserIds: ['member-2'],
        },
      ),
    ],
  );
  const service = new PrismaTimeService(store.client);

  const response = await service.listTasks('member-1', 'relationship-1', {
    status: 'completed',
    dateFrom: '2026-10-01T00:00:00.000Z',
    dateBefore: '2026-11-01T00:00:00.000Z',
  });

  assert.deepEqual(
    response.items.map(({ id }) => id),
    ['completed-hidden', 'completed-in-month'],
  );
  assert.deepEqual(response.calendarDateBounds, {
    earliestDate: '2026-09-15T12:00:00.000Z',
    latestDate: '2026-11-05T12:00:00.000Z',
  });
  assert.deepEqual(store.getTaskFindManyWhere(), {
    relationshipId: 'relationship-1',
    completedAt: {
      not: null,
      gte: new Date('2026-10-01T00:00:00.000Z'),
      lt: new Date('2026-11-01T00:00:00.000Z'),
    },
  });
});

test('only selected members can complete visible tasks', async () => {
  const store = createDb();
  const service = new PrismaTimeService(store.client);
  const task = await service.createTask('member-1', 'relationship-1', {
    name: 'Shared task',
    visibleToUserIds: ['member-1', 'member-2'],
    completableByUserIds: ['member-1'],
  });

  await assert.rejects(
    service.completeTask('member-2', 'relationship-1', task.id),
    { statusCode: 403 },
  );
  assert.equal(store.tasks[0].completedAt, undefined);
});

test('task notifications are limited to members who can see the task', async () => {
  const store = createDb([], [], ['member-1', 'member-2', 'member-3']);
  const service = new PrismaTimeService(store.client);

  await service.createTask('member-1', 'relationship-1', {
    name: 'Private task',
    visibleToUserIds: ['member-1', 'member-3'],
    completableByUserIds: ['member-1'],
  });

  assert.deepEqual(
    store.notifications.map(({ recipientUserId }) => recipientUserId),
    ['member-3'],
  );
});

test('due task reminders use their configured interval and respect visibility', async () => {
  const task = createTask(
    'due-task',
    '2026-10-20T09:00:00.000Z',
    'relationship-1',
    {
      dueDate: new Date('2026-10-28T09:00:00.000Z'),
      reminderFrequencyDays: 2,
      visibleToUserIds: ['member-2'],
    },
  );
  const completedTask = createTask(
    'completed-task',
    '2026-10-20T09:00:00.000Z',
    'relationship-1',
    {
      completedAt: new Date('2026-10-28T08:00:00.000Z'),
      dueDate: new Date('2026-10-28T09:00:00.000Z'),
    },
  );
  const futureTask = createTask(
    'future-task',
    '2026-10-20T09:00:00.000Z',
    'relationship-1',
    { dueDate: new Date('2026-11-01T09:00:00.000Z') },
  );
  const store = createDb(
    [],
    [task, completedTask, futureTask],
    ['member-1', 'member-2', 'member-3'],
  );
  const service = new PrismaTimeService(store.client);
  const firstReminderAt = new Date('2026-10-29T09:00:00.000Z');

  assert.equal(await service.deliverDueTaskReminders(firstReminderAt), 1);
  assert.deepEqual(
    store.notifications.map(({ recipientUserId }) => recipientUserId),
    ['member-1', 'member-2'],
  );
  const firstReminderEventId = store.notifications[0]?.eventId;
  assert.ok(firstReminderEventId);
  assert.match(firstReminderEventId, /^[0-9a-f]{24}$/);
  assert.notEqual(firstReminderEventId, task.id);
  assert.deepEqual(
    store.notifications.map(({ eventId }) => eventId),
    [firstReminderEventId, firstReminderEventId],
  );
  assert.deepEqual(
    store.notifications.map(({ title, body }) => ({ title, body })),
    [
      { title: 'Task reminder', body: task.name },
      { title: 'Task reminder', body: task.name },
    ],
  );
  assert.equal(await service.deliverDueTaskReminders(firstReminderAt), 0);
  assert.equal(
    await service.deliverDueTaskReminders(
      new Date(firstReminderAt.getTime() + 23 * 60 * 60 * 1000),
    ),
    0,
  );
  assert.equal(
    await service.deliverDueTaskReminders(
      new Date(firstReminderAt.getTime() + 24 * 60 * 60 * 1000),
    ),
    0,
  );
  assert.equal(store.notifications.length, 2);
  assert.equal(
    await service.deliverDueTaskReminders(
      new Date(firstReminderAt.getTime() + 48 * 60 * 60 * 1000),
    ),
    1,
  );
  assert.equal(store.notifications.length, 4);
  assert.notEqual(store.notifications[2]?.eventId, firstReminderEventId);
});

test('due task reminders process beyond the first batch', async () => {
  const tasks = Array.from({ length: 101 }, (_, index) =>
    createTask(
      `due-task-${String(index).padStart(3, '0')}`,
      '2026-10-20T09:00:00.000Z',
      'relationship-1',
      { dueDate: new Date('2026-10-28T09:00:00.000Z') },
    ),
  );
  const store = createDb([], tasks);
  const service = new PrismaTimeService(store.client);

  assert.equal(
    await service.deliverDueTaskReminders(new Date('2026-10-29T09:00:00.000Z')),
    101,
  );
  assert.equal(store.notifications.length, 202);
});

test('task creation rejects inactive or unrelated member selections', async () => {
  const service = new PrismaTimeService(createDb().client);

  await assert.rejects(
    service.createTask('member-1', 'relationship-1', {
      name: 'Shared task',
      visibleToUserIds: ['outsider'],
    }),
    { statusCode: 400 },
  );
});

test('completed tasks cannot be completed a second time', async () => {
  const completedAt = new Date('2026-10-29T10:00:00.000Z');
  const store = createDb(
    [],
    [
      createTask(
        'completed-task',
        '2026-10-28T10:00:00.000Z',
        'relationship-1',
        {
          completedAt,
          completedByUserId: 'member-2',
        },
      ),
    ],
  );
  const service = new PrismaTimeService(store.client);

  await assert.rejects(
    service.completeTask('member-1', 'relationship-1', 'completed-task'),
    { statusCode: 409 },
  );
});

test('only the creator can delete a Me Time entry and its notifications', async () => {
  const entry = createEntry('entry-1', '2026-10-29T10:00:00.000Z');
  const deleteCalls: { model: string; where: unknown }[] = [];
  const transaction = {
    meTime: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deleteCalls.push({ model: 'meTime', where });
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
    relationshipMember: { findFirst: async () => ({ id: 'member-1' }) },
    meTime: { findFirst: async () => entry },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaClient;
  const service = new PrismaTimeService(db);

  await assert.rejects(
    service.deleteMeTime('member-2', 'relationship-1', 'entry-1'),
    { statusCode: 403 },
  );
  assert.deepEqual(deleteCalls, []);

  await service.deleteMeTime('member-1', 'relationship-1', 'entry-1');

  assert.deepEqual(deleteCalls, [
    {
      model: 'meTime',
      where: {
        id: 'entry-1',
        relationshipId: 'relationship-1',
        createdByUserId: 'member-1',
      },
    },
    {
      model: 'notification',
      where: { targetType: 'meTime', targetId: 'entry-1' },
    },
  ]);
});

test('only the creator can delete a task and its notifications', async () => {
  const task = createTask(
    'task-1',
    '2026-10-29T10:00:00.000Z',
    'relationship-1',
    { visibleToUserIds: ['member-1', 'member-2'] },
  );
  const deleteCalls: { model: string; where: unknown }[] = [];
  const transaction = {
    relationshipTask: {
      deleteMany: async ({ where }: { where: unknown }) => {
        deleteCalls.push({ model: 'relationshipTask', where });
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
    relationshipMember: { findFirst: async () => ({ id: 'member-1' }) },
    relationshipTask: { findFirst: async () => task },
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>,
    ) => callback(transaction),
  } as unknown as PrismaClient;
  const service = new PrismaTimeService(db);

  await assert.rejects(
    service.deleteTask('member-2', 'relationship-1', 'task-1'),
    { statusCode: 403 },
  );
  assert.deepEqual(deleteCalls, []);

  await service.deleteTask('member-1', 'relationship-1', 'task-1');

  assert.deepEqual(deleteCalls, [
    {
      model: 'relationshipTask',
      where: {
        id: 'task-1',
        relationshipId: 'relationship-1',
        createdByUserId: 'member-1',
      },
    },
    {
      model: 'notification',
      where: { targetType: 'relationshipTask', targetId: 'task-1' },
    },
  ]);
});
