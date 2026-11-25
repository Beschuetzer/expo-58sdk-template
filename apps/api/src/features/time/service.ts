import type {
  CreateMeTimeInput,
  CreateRelationshipTaskInput,
  CalendarDateBounds,
  MeTime,
  MeTimeListFilters,
  MeTimeListResponse,
  RelationshipTask,
  RelationshipTaskEditableField,
  RelationshipTaskListFilters,
  RelationshipTaskListResponse,
  UpdateRelationshipTaskInput,
  UpdateMeTimeInput,
} from '@expo-50sdk-template/shared-types';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { PrismaNotificationService } from '../notifications/notificationService';

const MAX_PAGE_SIZE = 100;
const MAX_ME_TIME_DESCRIPTION_LENGTH = 2000;
const MAX_TASK_NAME_LENGTH = 160;
const DEFAULT_TASK_REMINDER_FREQUENCY_DAYS = 1;
const MAX_TASK_REMINDER_FREQUENCY_DAYS = 365;
const TASK_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export class TimeDomainError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'TimeDomainError';
    this.statusCode = statusCode;
  }
}

export type TimeService = {
  listMeTime(
    userId: string,
    relationshipId: string,
    filters: MeTimeListFilters,
  ): Promise<MeTimeListResponse>;
  getMeTimeById(
    userId: string,
    relationshipId: string,
    meTimeId: string,
  ): Promise<MeTime>;
  updateMeTime(
    userId: string,
    relationshipId: string,
    meTimeId: string,
    input: UpdateMeTimeInput,
  ): Promise<MeTime>;
  deleteMeTime(
    userId: string,
    relationshipId: string,
    meTimeId: string,
  ): Promise<void>;
  createMeTime(
    userId: string,
    relationshipId: string,
    input: CreateMeTimeInput,
  ): Promise<MeTime>;
  listTasks(
    userId: string,
    relationshipId: string,
    filters: RelationshipTaskListFilters,
  ): Promise<RelationshipTaskListResponse>;
  getTaskById(
    userId: string,
    relationshipId: string,
    taskId: string,
  ): Promise<RelationshipTask>;
  deleteTask(
    userId: string,
    relationshipId: string,
    taskId: string,
  ): Promise<void>;
  createTask(
    userId: string,
    relationshipId: string,
    input: CreateRelationshipTaskInput,
  ): Promise<RelationshipTask>;
  updateTask(
    userId: string,
    relationshipId: string,
    taskId: string,
    input: UpdateRelationshipTaskInput,
  ): Promise<RelationshipTask>;
  completeTask(
    userId: string,
    relationshipId: string,
    taskId: string,
  ): Promise<RelationshipTask>;
  deliverDueTaskReminders(now?: Date): Promise<number>;
};

type MeTimeRecord = {
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

type RelationshipTaskRecord = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  updatedByUserId?: string | null;
  lastEditedAt?: Date | null;
  lastEditedFields?: string[];
  name: string;
  dueDate: Date | null;
  reminderFrequencyDays?: number | null;
  visibleToUserIds: string[];
  completableByUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  completedByUserId: string | null;
  lastReminderSentAt?: Date | null;
};

function mapMeTime(entry: MeTimeRecord): MeTime {
  return {
    id: entry.id,
    relationshipId: entry.relationshipId,
    createdByUserId: entry.createdByUserId,
    ...(entry.updatedByUserId
      ? { updatedByUserId: entry.updatedByUserId }
      : {}),
    startTime: entry.startTime.toISOString(),
    endTime: entry.endTime.toISOString(),
    ...(entry.description ? { description: entry.description } : {}),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function mapTask(task: RelationshipTaskRecord): RelationshipTask {
  return {
    id: task.id,
    relationshipId: task.relationshipId,
    createdByUserId: task.createdByUserId,
    ...(task.updatedByUserId
      ? {
          updatedByUserId: task.updatedByUserId,
          ...(task.lastEditedAt
            ? { lastEditedAt: task.lastEditedAt.toISOString() }
            : {}),
          lastEditedFields: (task.lastEditedFields ?? []).filter(
            (field): field is RelationshipTaskEditableField =>
              field === 'name' ||
              field === 'dueDate' ||
              field === 'reminderFrequencyDays' ||
              field === 'visibleToUserIds' ||
              field === 'completableByUserIds',
          ),
        }
      : {}),
    name: task.name,
    ...(task.dueDate ? { dueDate: task.dueDate.toISOString() } : {}),
    reminderFrequencyDays:
      task.reminderFrequencyDays ?? DEFAULT_TASK_REMINDER_FREQUENCY_DAYS,
    visibleToUserIds: task.visibleToUserIds ?? [],
    completableByUserIds: task.completableByUserIds ?? [],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    ...(task.completedAt
      ? { completedAt: task.completedAt.toISOString() }
      : {}),
    ...(task.completedByUserId
      ? { completedByUserId: task.completedByUserId }
      : {}),
  };
}

function getSelectedMemberIds(
  requestedUserIds: string[] | undefined,
  activeMemberUserIds: string[],
  field: string,
) {
  const selectedUserIds = [...new Set(requestedUserIds ?? activeMemberUserIds)];
  const activeMemberUserIdSet = new Set(activeMemberUserIds);

  if (selectedUserIds.length === 0) {
    throw new TimeDomainError(`${field} must include at least one member.`);
  }
  if (selectedUserIds.some((userId) => !activeMemberUserIdSet.has(userId))) {
    throw new TimeDomainError(
      `${field} must include only active relationship members.`,
    );
  }

  return selectedUserIds;
}

function canSeeTask(task: RelationshipTaskRecord, userId: string) {
  const visibleToUserIds = task.visibleToUserIds ?? [];
  return (
    task.createdByUserId === userId ||
    visibleToUserIds.length === 0 ||
    visibleToUserIds.includes(userId)
  );
}

function canCompleteTask(task: RelationshipTaskRecord, userId: string) {
  const completableByUserIds = task.completableByUserIds ?? [];
  return (
    completableByUserIds.length === 0 || completableByUserIds.includes(userId)
  );
}

function areSameUserIds(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((userId) => rightSet.has(userId))
  );
}

function requireUserId(userId: string) {
  if (!userId.trim()) {
    throw new TimeDomainError('Authentication is required.', 401);
  }
}

function requireText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TimeDomainError(`${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new TimeDomainError(`${field} is too long.`);
  }
  return normalized;
}

function normalizeDescription(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new TimeDomainError('Description must be text.');
  }
  const normalized = value.trim();
  if (normalized.length > MAX_ME_TIME_DESCRIPTION_LENGTH) {
    throw new TimeDomainError('Description is too long.');
  }
  return normalized || undefined;
}

function requireDateTime(value: unknown, field: string) {
  if (
    typeof value !== 'string' ||
    !value.includes('T') ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TimeDomainError(`${field} must be a valid date and time.`);
  }
  return new Date(value);
}

function getTaskReminderFrequencyDays(value: unknown) {
  if (value === undefined) return DEFAULT_TASK_REMINDER_FREQUENCY_DAYS;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TASK_REMINDER_FREQUENCY_DAYS
  ) {
    throw new TimeDomainError(
      `Reminder frequency must be a whole number between 1 and ${MAX_TASK_REMINDER_FREQUENCY_DAYS} days.`,
    );
  }
  return value;
}

function getPageSize(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) return 25;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
}

export class PrismaTimeService implements TimeService {
  private readonly notificationService: PrismaNotificationService;

  constructor(private readonly db: PrismaClient) {
    this.notificationService = new PrismaNotificationService(db);
  }

  async listMeTime(
    userId: string,
    relationshipId: string,
    filters: MeTimeListFilters,
  ) {
    await this.requireMember(userId, relationshipId);
    const limit = getPageSize(filters.limit);
    const hasStartTimeRange =
      filters.startTimeFrom !== undefined ||
      filters.startTimeBefore !== undefined;
    const startTimeRange = hasStartTimeRange
      ? {
          ...(filters.startTimeFrom
            ? { gte: new Date(filters.startTimeFrom) }
            : {}),
          ...(filters.startTimeBefore
            ? { lt: new Date(filters.startTimeBefore) }
            : {}),
        }
      : undefined;
    const where: Prisma.MeTimeWhereInput = {
      relationshipId,
      ...(startTimeRange ? { startTime: startTimeRange } : {}),
    };
    const [entries, dateBounds] = await Promise.all([
      this.db.meTime.findMany({
        where,
        orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      }),
      hasStartTimeRange && !filters.cursor
        ? Promise.all([
            this.db.meTime.findFirst({
              where: { relationshipId },
              orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
              select: { startTime: true },
            }),
            this.db.meTime.findFirst({
              where: { relationshipId },
              orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
              select: { startTime: true },
            }),
          ])
        : Promise.resolve(undefined),
    ]);
    const hasNextPage = entries.length > limit;
    const items = entries.slice(0, limit).map(mapMeTime);

    return {
      items,
      ...(hasNextPage ? { nextCursor: items[items.length - 1]?.id } : {}),
      ...(dateBounds
        ? {
            earliestStartTime: dateBounds[0]?.startTime.toISOString() ?? null,
            latestStartTime: dateBounds[1]?.startTime.toISOString() ?? null,
          }
        : {}),
    };
  }

  async getMeTimeById(
    userId: string,
    relationshipId: string,
    meTimeId: string,
  ) {
    await this.requireMember(userId, relationshipId);
    const entry = await this.db.meTime.findFirst({
      where: { id: meTimeId, relationshipId },
    });
    if (!entry) {
      throw new TimeDomainError('Me time entry not found.', 404);
    }
    return mapMeTime(entry);
  }

  async updateMeTime(
    userId: string,
    relationshipId: string,
    meTimeId: string,
    input: UpdateMeTimeInput,
  ) {
    await this.requireMember(userId, relationshipId);
    const entry = await this.db.meTime.findFirst({
      where: { id: meTimeId, relationshipId },
    });
    if (!entry) {
      throw new TimeDomainError('Me time entry not found.', 404);
    }
    if (entry.createdByUserId !== userId) {
      throw new TimeDomainError(
        'Only the creator can update this Me time entry.',
        403,
      );
    }

    const startTime = requireDateTime(input.startTime, 'Start time');
    const endTime = requireDateTime(input.endTime, 'End time');
    if (endTime <= startTime) {
      throw new TimeDomainError('End time must be after start time.');
    }

    const updated = await this.db.meTime.updateMany({
      where: { id: meTimeId, relationshipId, createdByUserId: userId },
      data: {
        startTime,
        endTime,
        description: normalizeDescription(input.description),
        updatedByUserId: userId,
      },
    });
    if (updated.count !== 1) {
      throw new TimeDomainError(
        'The Me time entry changed before it could be updated.',
        409,
      );
    }
    return this.getMeTimeById(userId, relationshipId, meTimeId);
  }

  async deleteMeTime(userId: string, relationshipId: string, meTimeId: string) {
    await this.requireMember(userId, relationshipId);
    const entry = await this.db.meTime.findFirst({
      where: { id: meTimeId, relationshipId },
    });
    if (!entry) {
      throw new TimeDomainError('Me time entry not found.', 404);
    }
    if (entry.createdByUserId !== userId) {
      throw new TimeDomainError(
        'Only the creator can delete this Me time entry.',
        403,
      );
    }

    await this.db.$transaction(async (transaction) => {
      const deleted = await transaction.meTime.deleteMany({
        where: { id: meTimeId, relationshipId, createdByUserId: userId },
      });
      if (deleted.count !== 1) {
        throw new TimeDomainError(
          'The Me time entry changed before it could be deleted.',
          409,
        );
      }
      await transaction.notification.deleteMany({
        where: { targetType: 'meTime', targetId: meTimeId },
      });
    });
  }

  async createMeTime(
    userId: string,
    relationshipId: string,
    input: CreateMeTimeInput,
  ) {
    await this.requireMember(userId, relationshipId);
    const startTime = requireDateTime(input.startTime, 'Start time');
    const endTime = requireDateTime(input.endTime, 'End time');
    if (endTime <= startTime) {
      throw new TimeDomainError('End time must be after start time.');
    }

    const entry = await this.db.$transaction(async (transaction) => {
      const createdEntry = await transaction.meTime.create({
        data: {
          relationshipId,
          createdByUserId: userId,
          startTime,
          endTime,
          description: normalizeDescription(input.description),
        },
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdEntry.id,
        excludedUserIds: [userId],
        relationshipId,
        target: {
          type: 'meTime',
          id: createdEntry.id,
          relationshipId,
        },
        title: 'New Me time entry',
        body: createdEntry.description
          ? `New Me time was recorded: ${createdEntry.description}`
          : 'A new Me time entry was recorded.',
      });
      return createdEntry;
    });
    await this.notificationService.deliver(entry.id);
    return mapMeTime(entry);
  }

  async listTasks(
    userId: string,
    relationshipId: string,
    filters: RelationshipTaskListFilters,
  ) {
    await this.requireMember(userId, relationshipId);
    const limit = getPageSize(filters.limit);
    const status = filters.status ?? 'incomplete';
    const dateRange =
      filters.dateFrom || filters.dateBefore
        ? {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateBefore ? { lt: new Date(filters.dateBefore) } : {}),
          }
        : undefined;
    const where: Prisma.RelationshipTaskWhereInput = {
      relationshipId,
      ...(status === 'completed'
        ? { completedAt: { not: null, ...dateRange } }
        : {
            OR: [{ completedAt: null }, { completedAt: { isSet: false } }],
            ...(dateRange ? { createdAt: dateRange } : {}),
          }),
    };
    const dateBoundsPromise =
      dateRange && !filters.cursor
        ? this.getTaskCalendarDateBounds(userId, relationshipId, status)
        : Promise.resolve(undefined);
    const orderBy: Prisma.RelationshipTaskOrderByWithRelationInput[] =
      status === 'completed'
        ? [{ completedAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];
    const visibleTasks: RelationshipTaskRecord[] = [];
    let cursor = filters.cursor;

    while (visibleTasks.length <= limit) {
      const tasks = await this.db.relationshipTask.findMany({
        where,
        orderBy,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (tasks.length === 0) break;

      cursor = tasks[tasks.length - 1].id;
      visibleTasks.push(...tasks.filter((task) => canSeeTask(task, userId)));
      if (tasks.length < limit + 1) break;
    }

    const hasNextPage = visibleTasks.length > limit;
    const items = visibleTasks.slice(0, limit).map(mapTask);
    const calendarDateBounds = await dateBoundsPromise;

    return {
      items,
      ...(hasNextPage ? { nextCursor: items[items.length - 1]?.id } : {}),
      ...(calendarDateBounds ? { calendarDateBounds } : {}),
    };
  }

  private async getTaskCalendarDateBounds(
    userId: string,
    relationshipId: string,
    status: 'incomplete' | 'completed',
  ): Promise<CalendarDateBounds> {
    const where: Prisma.RelationshipTaskWhereInput = {
      relationshipId,
      ...(status === 'completed'
        ? { completedAt: { not: null } }
        : {
            OR: [{ completedAt: null }, { completedAt: { isSet: false } }],
          }),
      AND: [
        {
          OR: [
            { createdByUserId: userId },
            { visibleToUserIds: { isEmpty: true } },
            { visibleToUserIds: { has: userId } },
          ],
        },
      ],
    };

    if (status === 'completed') {
      const [earliestTask, latestTask] = await Promise.all([
        this.db.relationshipTask.findFirst({
          where,
          orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
          select: { completedAt: true },
        }),
        this.db.relationshipTask.findFirst({
          where,
          orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
          select: { completedAt: true },
        }),
      ]);
      return {
        earliestDate: earliestTask?.completedAt?.toISOString() ?? null,
        latestDate: latestTask?.completedAt?.toISOString() ?? null,
      };
    }

    const [earliestTask, latestTask] = await Promise.all([
      this.db.relationshipTask.findFirst({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { createdAt: true },
      }),
      this.db.relationshipTask.findFirst({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { createdAt: true },
      }),
    ]);
    return {
      earliestDate: earliestTask?.createdAt.toISOString() ?? null,
      latestDate: latestTask?.createdAt.toISOString() ?? null,
    };
  }

  async getTaskById(userId: string, relationshipId: string, taskId: string) {
    await this.requireMember(userId, relationshipId);
    const task = await this.db.relationshipTask.findFirst({
      where: { id: taskId, relationshipId },
    });
    if (!task || !canSeeTask(task, userId)) {
      throw new TimeDomainError('Task not found.', 404);
    }
    return mapTask(task);
  }

  async deleteTask(userId: string, relationshipId: string, taskId: string) {
    await this.requireMember(userId, relationshipId);
    const task = await this.db.relationshipTask.findFirst({
      where: { id: taskId, relationshipId },
    });
    if (!task || !canSeeTask(task, userId)) {
      throw new TimeDomainError('Task not found.', 404);
    }
    if (task.createdByUserId !== userId) {
      throw new TimeDomainError('Only the creator can delete this task.', 403);
    }

    await this.db.$transaction(async (transaction) => {
      const deleted = await transaction.relationshipTask.deleteMany({
        where: { id: taskId, relationshipId, createdByUserId: userId },
      });
      if (deleted.count !== 1) {
        throw new TimeDomainError(
          'The task changed before it could be deleted.',
          409,
        );
      }
      await transaction.notification.deleteMany({
        where: { targetType: 'relationshipTask', targetId: taskId },
      });
    });
  }

  async createTask(
    userId: string,
    relationshipId: string,
    input: CreateRelationshipTaskInput,
  ) {
    await this.requireMember(userId, relationshipId);
    const name = requireText(input.name, 'Task name', MAX_TASK_NAME_LENGTH);
    const dueDate = input.dueDate
      ? requireDateTime(input.dueDate, 'Due date')
      : undefined;
    const reminderFrequencyDays = getTaskReminderFrequencyDays(
      input.reminderFrequencyDays,
    );
    const task = await this.db.$transaction(async (transaction) => {
      const activeMembers = await transaction.relationshipMember.findMany({
        where: { relationshipId, active: true },
        select: { userId: true },
      });
      const activeMemberUserIds = activeMembers.map(
        ({ userId: memberId }) => memberId,
      );
      const visibleToUserIds = getSelectedMemberIds(
        input.visibleToUserIds,
        activeMemberUserIds,
        'Visible members',
      );
      const completableByUserIds = getSelectedMemberIds(
        input.completableByUserIds,
        activeMemberUserIds,
        'Members who can complete the task',
      );
      const createdTask = await transaction.relationshipTask.create({
        data: {
          relationshipId,
          createdByUserId: userId,
          name,
          ...(dueDate ? { dueDate } : {}),
          reminderFrequencyDays,
          visibleToUserIds,
          completableByUserIds,
        },
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdTask.id,
        excludedUserIds: [
          userId,
          ...activeMemberUserIds.filter(
            (memberId) => !visibleToUserIds.includes(memberId),
          ),
        ],
        relationshipId,
        target: {
          type: 'relationshipTask',
          id: createdTask.id,
          relationshipId,
        },
        title: 'New shared task',
        body: createdTask.name,
      });
      return createdTask;
    });
    await this.notificationService.deliver(task.id);
    return mapTask(task);
  }

  async deliverDueTaskReminders(now = new Date()) {
    const reminderEligibility: Prisma.RelationshipTaskWhereInput = {
      dueDate: { lte: now },
      OR: [{ completedAt: null }, { completedAt: { isSet: false } }],
    };
    let reminderCount = 0;
    let cursor: string | undefined;

    while (true) {
      const dueTasks = await this.db.relationshipTask.findMany({
        where: reminderEligibility,
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          relationshipId: true,
          createdByUserId: true,
          name: true,
          dueDate: true,
          reminderFrequencyDays: true,
          lastReminderSentAt: true,
          visibleToUserIds: true,
        },
        take: MAX_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (dueTasks.length === 0) break;
      cursor = dueTasks[dueTasks.length - 1].id;

      for (const task of dueTasks) {
        const frequencyDays =
          task.reminderFrequencyDays ?? DEFAULT_TASK_REMINDER_FREQUENCY_DAYS;
        const reminderCutoff = new Date(
          now.getTime() - frequencyDays * TASK_REMINDER_INTERVAL_MS,
        );
        if (
          task.lastReminderSentAt &&
          task.lastReminderSentAt > reminderCutoff
        ) {
          continue;
        }

        const lastReminderFilter: Prisma.RelationshipTaskWhereInput =
          task.lastReminderSentAt
            ? { lastReminderSentAt: { lte: reminderCutoff } }
            : {
                OR: [
                  { lastReminderSentAt: null },
                  { lastReminderSentAt: { isSet: false } },
                ],
              };
        const eventId = randomBytes(12).toString('hex');
        const claimed = await this.db.$transaction(async (transaction) => {
          const result = await transaction.relationshipTask.updateMany({
            where: {
              id: task.id,
              dueDate: { lte: now },
              AND: [
                {
                  OR: [
                    { completedAt: null },
                    { completedAt: { isSet: false } },
                  ],
                },
                lastReminderFilter,
              ],
            },
            data: { lastReminderSentAt: now },
          });
          if (result.count !== 1) return false;

          const activeMembers = await transaction.relationshipMember.findMany({
            where: { relationshipId: task.relationshipId, active: true },
            select: { userId: true },
          });
          const visibleToUserIds = task.visibleToUserIds ?? [];
          await this.notificationService.createForUsers(transaction, {
            eventId,
            recipientUserIds: activeMembers
              .filter(
                ({ userId: memberUserId }) =>
                  memberUserId === task.createdByUserId ||
                  visibleToUserIds.length === 0 ||
                  visibleToUserIds.includes(memberUserId),
              )
              .map(({ userId: memberUserId }) => memberUserId),
            target: {
              type: 'relationshipTask',
              id: task.id,
              relationshipId: task.relationshipId,
            },
            title: 'Task reminder',
            body: task.name,
          });
          return true;
        });

        if (!claimed) continue;
        await this.notificationService.deliver(eventId);
        reminderCount += 1;
      }
    }

    return reminderCount;
  }

  async completeTask(userId: string, relationshipId: string, taskId: string) {
    await this.requireMember(userId, relationshipId);
    const existingTask = await this.db.relationshipTask.findFirst({
      where: { id: taskId, relationshipId },
    });
    if (!existingTask || !canSeeTask(existingTask, userId)) {
      throw new TimeDomainError('Task not found.', 404);
    }
    if (!canCompleteTask(existingTask, userId)) {
      throw new TimeDomainError(
        'You are not allowed to complete this task.',
        403,
      );
    }
    if (existingTask.completedAt) {
      throw new TimeDomainError('Task is already completed.', 409);
    }

    const task = await this.db.relationshipTask.update({
      where: { id: existingTask.id },
      data: {
        completedAt: new Date(),
        completedByUserId: userId,
      },
    });
    return mapTask(task);
  }

  async updateTask(
    userId: string,
    relationshipId: string,
    taskId: string,
    input: UpdateRelationshipTaskInput,
  ) {
    await this.requireMember(userId, relationshipId);
    const existingTask = await this.db.relationshipTask.findFirst({
      where: { id: taskId, relationshipId },
    });
    if (!existingTask || !canSeeTask(existingTask, userId)) {
      throw new TimeDomainError('Task not found.', 404);
    }
    if (existingTask.completedAt) {
      throw new TimeDomainError('Completed tasks cannot be edited.', 409);
    }
    if (!canCompleteTask(existingTask, userId)) {
      throw new TimeDomainError('You are not allowed to edit this task.', 403);
    }

    const name = requireText(input.name, 'Task name', MAX_TASK_NAME_LENGTH);
    const dueDate = input.dueDate
      ? requireDateTime(input.dueDate, 'Due date')
      : undefined;
    const reminderFrequencyDays =
      input.reminderFrequencyDays === undefined
        ? existingTask.reminderFrequencyDays ??
          DEFAULT_TASK_REMINDER_FREQUENCY_DAYS
        : getTaskReminderFrequencyDays(input.reminderFrequencyDays);
    const activeMembers = await this.db.relationshipMember.findMany({
      where: { relationshipId, active: true },
      select: { userId: true },
    });
    const activeMemberUserIds = activeMembers.map(
      ({ userId: memberId }) => memberId,
    );
    const visibleToUserIds = getSelectedMemberIds(
      input.visibleToUserIds,
      activeMemberUserIds,
      'Visible members',
    );
    const completableByUserIds = getSelectedMemberIds(
      input.completableByUserIds,
      activeMemberUserIds,
      'Members who can complete the task',
    );
    const currentVisibleToUserIds =
      existingTask.visibleToUserIds?.length > 0
        ? existingTask.visibleToUserIds
        : activeMemberUserIds;
    const currentCompletableByUserIds =
      existingTask.completableByUserIds?.length > 0
        ? existingTask.completableByUserIds
        : activeMemberUserIds;
    const lastEditedFields: RelationshipTaskEditableField[] = [];

    if (existingTask.name !== name) lastEditedFields.push('name');
    if (
      (existingTask.dueDate?.getTime() ?? null) !== (dueDate?.getTime() ?? null)
    ) {
      lastEditedFields.push('dueDate');
    }
    if (
      (existingTask.reminderFrequencyDays ??
        DEFAULT_TASK_REMINDER_FREQUENCY_DAYS) !== reminderFrequencyDays
    ) {
      lastEditedFields.push('reminderFrequencyDays');
    }
    if (!areSameUserIds(currentVisibleToUserIds, visibleToUserIds)) {
      lastEditedFields.push('visibleToUserIds');
    }
    if (!areSameUserIds(currentCompletableByUserIds, completableByUserIds)) {
      lastEditedFields.push('completableByUserIds');
    }

    if (lastEditedFields.length === 0) return mapTask(existingTask);

    const now = new Date();
    const updated = await this.db.relationshipTask.updateMany({
      where: {
        id: existingTask.id,
        relationshipId,
        updatedAt: existingTask.updatedAt,
        OR: [{ completedAt: null }, { completedAt: { isSet: false } }],
      },
      data: {
        name,
        dueDate: dueDate ?? null,
        reminderFrequencyDays,
        visibleToUserIds,
        completableByUserIds,
        updatedByUserId: userId,
        lastEditedAt: now,
        lastEditedFields,
        ...(lastEditedFields.includes('dueDate') ||
        lastEditedFields.includes('reminderFrequencyDays')
          ? { lastReminderSentAt: null }
          : {}),
      },
    });
    if (updated.count !== 1) {
      throw new TimeDomainError(
        'The task changed before it could be updated.',
        409,
      );
    }

    const task = await this.db.relationshipTask.findFirst({
      where: { id: existingTask.id, relationshipId },
    });
    if (!task) throw new TimeDomainError('Task not found.', 404);
    return mapTask(task);
  }

  private async requireMember(userId: string, relationshipId: string) {
    requireUserId(userId);
    const member = await this.db.relationshipMember.findFirst({
      where: { relationshipId, userId, active: true },
      select: { id: true },
    });
    if (!member) {
      throw new TimeDomainError(
        'An active relationship membership is required.',
        403,
      );
    }
  }
}
