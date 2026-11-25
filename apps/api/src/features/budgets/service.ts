import { isCurrencyCode } from '@expo-50sdk-template/shared-types';
import type {
  Budget,
  BudgetApproval,
  BudgetItem,
  BudgetListResponse,
  BudgetPeriod,
  BudgetSummary,
  CurrencyCode,
  CreateBudgetInput,
  CreateBudgetItemInput,
  UpdateBudgetInput,
} from '@expo-50sdk-template/shared-types';
import {
  Prisma,
  PrismaClient,
  type Budget as PrismaBudget,
  type BudgetItem as PrismaBudgetItem,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { PrismaNotificationService } from '../notifications/notificationService';

const MAX_APPROVERS = 100;
const MAX_PAGE_SIZE = 100;
const MAX_AMOUNT_MINOR_UNITS = 2_147_483_647;
const PENDING_APPROVAL_FILTER: Prisma.BudgetApprovalWhereInput = {
  OR: [{ approvedAt: null }, { approvedAt: { isSet: false } }],
};
const UNRENEWED_BUDGET_FILTER: Prisma.BudgetWhereInput = {
  OR: [{ renewedAt: null }, { renewedAt: { isSet: false } }],
};

export class BudgetDomainError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'BudgetDomainError';
    this.statusCode = statusCode;
  }
}

export type BudgetService = {
  listBudgets(
    userId: string,
    relationshipId: string,
  ): Promise<BudgetListResponse>;
  createBudget(
    userId: string,
    relationshipId: string,
    input: CreateBudgetInput,
  ): Promise<Budget>;
  getBudget(userId: string, budgetId: string): Promise<Budget>;
  updateBudget(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInput,
  ): Promise<Budget>;
  approveBudget(userId: string, budgetId: string): Promise<Budget>;
  createBudgetItem(
    userId: string,
    budgetId: string,
    input: CreateBudgetItemInput,
  ): Promise<BudgetItem>;
  deleteBudget(userId: string, budgetId: string): Promise<void>;
  rolloverExpiredBudgets(now?: Date): Promise<number>;
};

type BudgetWithRelations = Prisma.BudgetGetPayload<{
  include: { approvals: true; items: true };
}>;

type BudgetForList = Prisma.BudgetGetPayload<{
  include: {
    approvals: true;
    items: { select: { amountMinorUnits: true } };
  };
}>;

type BudgetWithApprovals = Prisma.BudgetGetPayload<{
  include: { approvals: true };
}>;

type BudgetPeriodRange = {
  start: Date;
  end: Date;
};

function mapBudgetApproval(approval: {
  memberUserId: string;
  approvedAt: Date | null;
}): BudgetApproval {
  return {
    memberUserId: approval.memberUserId,
    ...(approval.approvedAt
      ? { approvedAt: approval.approvedAt.toISOString() }
      : {}),
  };
}

function mapBudgetItem(item: PrismaBudgetItem): BudgetItem {
  return {
    id: item.id,
    budgetId: item.budgetId,
    name: item.name,
    amountMinorUnits: item.amountMinorUnits,
    date: item.date.toISOString(),
    createdAt: item.createdAt.toISOString(),
    createdByUserId: item.createdByUserId,
  };
}

function mapBudgetSummary(
  budget: Pick<
    PrismaBudget,
    | 'id'
    | 'relationshipId'
    | 'createdByUserId'
    | 'updatedByUserId'
    | 'name'
    | 'currency'
    | 'amountMinorUnits'
    | 'period'
    | 'periodStart'
    | 'periodEnd'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
  > & {
    items: Pick<PrismaBudgetItem, 'amountMinorUnits'>[];
  },
): BudgetSummary {
  return {
    id: budget.id,
    relationshipId: budget.relationshipId,
    createdByUserId: budget.createdByUserId,
    ...(budget.updatedByUserId
      ? { updatedByUserId: budget.updatedByUserId }
      : {}),
    name: budget.name,
    currency: normalizeBudgetCurrency(budget.currency),
    amountMinorUnits: budget.amountMinorUnits,
    amountRemainingMinorUnits:
      budget.amountMinorUnits -
      budget.items.reduce((total, item) => total + item.amountMinorUnits, 0),
    period: budget.period,
    periodStart: budget.periodStart.toISOString(),
    periodEnd: budget.periodEnd.toISOString(),
    status: budget.status,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

function mapBudget(budget: BudgetWithRelations): Budget {
  return {
    ...mapBudgetSummary(budget),
    approvals: budget.approvals.map(mapBudgetApproval),
    items: budget.items.map(mapBudgetItem),
  };
}

function getPeriodMonthCount(period: BudgetPeriod) {
  switch (period) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'yearly':
      return 12;
  }
}

function getBudgetPeriodRange(
  period: BudgetPeriod,
  date: Date,
): BudgetPeriodRange {
  const month = date.getUTCMonth();
  const monthCount = getPeriodMonthCount(period);
  const firstMonth =
    period === 'yearly'
      ? 0
      : period === 'quarterly'
        ? Math.floor(month / monthCount) * monthCount
        : month;
  const year = date.getUTCFullYear();

  return {
    start: new Date(Date.UTC(year, firstMonth, 1)),
    end: new Date(Date.UTC(year, firstMonth + monthCount, 0, 23, 59, 59, 999)),
  };
}

function getNextBudgetPeriodRange(
  period: BudgetPeriod,
  periodStart: Date,
): BudgetPeriodRange {
  const nextPeriodStart = new Date(
    Date.UTC(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth() + getPeriodMonthCount(period),
      1,
    ),
  );
  return getBudgetPeriodRange(period, nextPeriodStart);
}

function parseDateOnly(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BudgetDomainError('The item date must be a valid calendar date.');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BudgetDomainError('The item date must be a valid calendar date.');
  }
  return date;
}

function requireText(value: unknown, field: string, maximumLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BudgetDomainError(`${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new BudgetDomainError(`${field} is too long.`);
  }
  return normalized;
}

function requireAmount(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > MAX_AMOUNT_MINOR_UNITS
  ) {
    throw new BudgetDomainError('The amount must be a positive valid amount.');
  }
  return value;
}

function requireCurrency(value: unknown): CurrencyCode {
  if (typeof value !== 'string' || !isCurrencyCode(value)) {
    throw new BudgetDomainError('The budget currency is invalid.');
  }
  return value;
}

function normalizeBudgetCurrency(
  value: string | null | undefined,
): CurrencyCode {
  if (value == null) return 'USD';
  if (!isCurrencyCode(value)) {
    throw new Error(`Unsupported currency stored for budget: ${value}.`);
  }
  return value;
}

function requirePeriod(value: unknown): BudgetPeriod {
  if (value === 'monthly' || value === 'quarterly' || value === 'yearly') {
    return value;
  }
  throw new BudgetDomainError('The budget time span is invalid.');
}

function requireApproverUserIds(
  value: unknown,
  creatorUserId: string,
): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_APPROVERS
  ) {
    throw new BudgetDomainError(
      'At least one required approver must be selected.',
    );
  }
  const approverUserIds = value.map((userId) =>
    typeof userId === 'string' ? userId.trim() : '',
  );
  if (approverUserIds.some((userId) => !userId)) {
    throw new BudgetDomainError('Required approver IDs must not be empty.');
  }
  if (new Set(approverUserIds).size !== approverUserIds.length) {
    throw new BudgetDomainError(
      'A required approver may only be selected once.',
    );
  }
  if (approverUserIds.includes(creatorUserId)) {
    throw new BudgetDomainError(
      'The budget creator cannot be a required approver.',
    );
  }
  return approverUserIds;
}

function requireUserId(userId: string) {
  if (!userId.trim()) {
    throw new BudgetDomainError('Authentication is required.', 401);
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export class PrismaBudgetService implements BudgetService {
  private readonly notificationService: PrismaNotificationService;

  constructor(private readonly db: PrismaClient) {
    this.notificationService = new PrismaNotificationService(db);
  }

  async listBudgets(userId: string, relationshipId: string) {
    await this.requireMember(userId, relationshipId);
    const budgets: BudgetForList[] = await this.db.budget.findMany({
      where: { relationshipId },
      include: {
        approvals: true,
        items: { select: { amountMinorUnits: true } },
      },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
    });

    return { items: budgets.map(mapBudgetSummary) };
  }

  async createBudget(
    userId: string,
    relationshipId: string,
    input: CreateBudgetInput,
  ) {
    requireUserId(userId);
    const name = requireText(input.name, 'name', 160);
    const amountMinorUnits = requireAmount(input.amountMinorUnits);
    const currency = requireCurrency(input.currency);
    const period = requirePeriod(input.period);
    const approverUserIds = requireApproverUserIds(
      input.requiredApproverUserIds,
      userId,
    );
    await this.requireMember(userId, relationshipId);
    await this.requireActiveApprovers(relationshipId, approverUserIds);

    const { start: periodStart, end: periodEnd } = getBudgetPeriodRange(
      period,
      new Date(),
    );
    const id = randomBytes(12).toString('hex');
    const budget = await this.db.$transaction(async (transaction) => {
      const createdBudget = await transaction.budget.create({
        data: {
          id,
          seriesId: id,
          relationshipId,
          createdByUserId: userId,
          name,
          amountMinorUnits,
          currency,
          period,
          periodStart,
          periodEnd,
          renewedAt: null,
          status: 'pending_approval',
          approvals: {
            create: approverUserIds.map((memberUserId) => ({ memberUserId })),
          },
        },
        include: { approvals: true, items: true },
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdBudget.id,
        excludedUserIds: [userId],
        relationshipId,
        target: { type: 'budget', id: createdBudget.id },
        title: 'New budget created',
        body: createdBudget.name,
      });
      return createdBudget;
    });
    await this.notificationService.deliver(budget.id);
    return mapBudget(budget);
  }

  async getBudget(userId: string, budgetId: string) {
    return mapBudget(await this.requireBudgetForMember(userId, budgetId));
  }

  async updateBudget(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInput,
  ) {
    const budget = await this.requireBudgetForMember(userId, budgetId);
    this.requireCreator(userId, budget);

    const name = requireText(input.name, 'name', 160);
    const amountMinorUnits = requireAmount(input.amountMinorUnits);
    const period = requirePeriod(input.period);
    const changedPeriod = period !== budget.period;
    const newerBudget =
      changedPeriod &&
      (await this.db.budget.findFirst({
        where: {
          seriesId: budget.seriesId,
          periodStart: { gt: budget.periodStart },
        },
        select: { id: true },
      }));
    if (newerBudget) {
      throw new BudgetDomainError(
        'The time span can only be changed on the latest budget period.',
        409,
      );
    }
    const approverUserIds = requireApproverUserIds(
      input.requiredApproverUserIds,
      userId,
    );
    await this.requireActiveApprovers(budget.relationshipId, approverUserIds);

    const seriesId = changedPeriod
      ? randomBytes(12).toString('hex')
      : budget.seriesId;
    const periodRange =
      period === budget.period
        ? { start: budget.periodStart, end: budget.periodEnd }
        : getBudgetPeriodRange(period, budget.periodStart);
    if (
      budget.items.some(
        (item) => item.date < periodRange.start || item.date > periodRange.end,
      )
    ) {
      throw new BudgetDomainError(
        'The new time span must include every existing budget item.',
      );
    }

    const now = new Date();
    const eventId = randomBytes(12).toString('hex');
    await this.db.$transaction(async (transaction) => {
      if (changedPeriod) {
        await transaction.budget.updateMany({
          where: {
            seriesId: budget.seriesId,
            id: { not: budgetId },
          },
          data: { renewedAt: now },
        });
      }

      const updated = await transaction.budget.updateMany({
        where: {
          id: budgetId,
          relationshipId: budget.relationshipId,
          createdByUserId: userId,
          updatedAt: budget.updatedAt,
        },
        data: {
          seriesId,
          name,
          amountMinorUnits,
          period,
          periodStart: periodRange.start,
          periodEnd: periodRange.end,
          renewedAt: null,
          status: 'pending_approval',
          updatedByUserId: userId,
        },
      });
      if (updated.count !== 1) {
        throw new BudgetDomainError(
          'The budget changed before it could be updated.',
          409,
        );
      }

      await transaction.budgetApproval.deleteMany({ where: { budgetId } });
      await transaction.budgetApproval.createMany({
        data: approverUserIds.map((memberUserId) => ({
          budgetId,
          memberUserId,
          approvedAt: null,
        })),
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId,
        excludedUserIds: [userId],
        relationshipId: budget.relationshipId,
        target: { type: 'budget', id: budgetId },
        title: 'Budget updated',
        body: name,
      });
    });
    await this.notificationService.deliver(eventId);
    return this.getBudget(userId, budgetId);
  }

  async approveBudget(userId: string, budgetId: string) {
    const budget = await this.requireBudgetForMember(userId, budgetId);
    if (budget.status === 'approved') return mapBudget(budget);

    const approval = budget.approvals.find(
      (candidate) => candidate.memberUserId === userId,
    );
    if (!approval) {
      throw new BudgetDomainError(
        'Only a required approver can approve this budget.',
        403,
      );
    }
    if (approval.approvedAt) return mapBudget(budget);

    const approvedAt = new Date();
    const updatedApproval = await this.db.budgetApproval.updateMany({
      where: {
        id: approval.id,
        budgetId,
        memberUserId: userId,
        ...PENDING_APPROVAL_FILTER,
      },
      data: { approvedAt },
    });
    if (updatedApproval.count !== 1) {
      const currentBudget = await this.requireBudgetForMember(userId, budgetId);
      const currentApproval = currentBudget.approvals.find(
        (candidate) => candidate.memberUserId === userId,
      );
      if (currentBudget.status === 'approved' || currentApproval?.approvedAt) {
        return mapBudget(currentBudget);
      }
      throw new BudgetDomainError(
        'The budget changed before approval could be recorded.',
        409,
      );
    }

    const pendingApprovals = await this.db.budgetApproval.count({
      where: { budgetId, ...PENDING_APPROVAL_FILTER },
    });
    if (pendingApprovals === 0) {
      await this.db.budget.updateMany({
        where: { id: budgetId, status: 'pending_approval' },
        data: { status: 'approved' },
      });
    }

    return this.getBudget(userId, budgetId);
  }

  async createBudgetItem(
    userId: string,
    budgetId: string,
    input: CreateBudgetItemInput,
  ) {
    const budget = await this.requireBudgetForMember(userId, budgetId);
    const name = requireText(input.name, 'name', 160);
    const amountMinorUnits = requireAmount(input.amountMinorUnits);
    const date = parseDateOnly(input.date);
    const now = new Date();

    if (budget.status !== 'approved') {
      throw new BudgetDomainError(
        'Budget items can only be added to an approved budget.',
        409,
      );
    }
    if (
      now < budget.periodStart ||
      now > budget.periodEnd ||
      date < budget.periodStart ||
      date > budget.periodEnd
    ) {
      throw new BudgetDomainError(
        'Budget items can only be added during the budget time span.',
        409,
      );
    }

    const item = await this.db.$transaction(async (transaction) => {
      const currentBudget = await transaction.budget.findFirst({
        where: {
          id: budgetId,
          relationshipId: budget.relationshipId,
          status: 'approved',
          periodStart: { lte: now },
          periodEnd: { gte: now },
        },
      });
      if (
        !currentBudget ||
        date < currentBudget.periodStart ||
        date > currentBudget.periodEnd
      ) {
        throw new BudgetDomainError(
          'Budget items can only be added during the budget time span.',
          409,
        );
      }

      const createdItem = await transaction.budgetItem.create({
        data: {
          budgetId,
          createdByUserId: userId,
          name,
          amountMinorUnits,
          date,
        },
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdItem.id,
        excludedUserIds: [userId],
        relationshipId: budget.relationshipId,
        target: { type: 'budget', id: budgetId },
        title: 'New budget item added',
        body: name,
      });
      return createdItem;
    });
    await this.notificationService.deliver(item.id);
    return mapBudgetItem(item);
  }

  async deleteBudget(userId: string, budgetId: string) {
    const budget = await this.requireBudgetForMember(userId, budgetId);
    this.requireCreator(userId, budget);

    await this.db.$transaction(async (transaction) => {
      const currentBudget = await transaction.budget.findFirst({
        where: {
          id: budgetId,
          seriesId: budget.seriesId,
          updatedAt: budget.updatedAt,
        },
        select: { id: true },
      });
      if (!currentBudget) {
        throw new BudgetDomainError(
          'The budget changed before it could be deleted.',
          409,
        );
      }

      const budgets = await transaction.budget.findMany({
        where: { seriesId: budget.seriesId },
        select: { id: true },
      });
      const budgetIds = budgets.map(({ id }) => id);
      if (!budgetIds.includes(budgetId)) {
        throw new BudgetDomainError(
          'The budget changed before it could be deleted.',
          409,
        );
      }

      await transaction.budgetApproval.deleteMany({
        where: { budgetId: { in: budgetIds } },
      });
      await transaction.budgetItem.deleteMany({
        where: { budgetId: { in: budgetIds } },
      });
      await transaction.notification.deleteMany({
        where: { targetType: 'budget', targetId: { in: budgetIds } },
      });
      const deleted = await transaction.budget.deleteMany({
        where: {
          seriesId: budget.seriesId,
        },
      });
      if (deleted.count !== budgetIds.length) {
        throw new BudgetDomainError(
          'The budget changed before it could be deleted.',
          409,
        );
      }
    });
  }

  async rolloverExpiredBudgets(now = new Date()) {
    const expiredBudgets: BudgetWithApprovals[] = await this.db.budget.findMany(
      {
        where: {
          status: 'approved',
          periodEnd: { lt: now },
          ...UNRENEWED_BUDGET_FILTER,
        },
        include: { approvals: true },
        orderBy: [{ periodEnd: 'asc' }, { id: 'asc' }],
        take: MAX_PAGE_SIZE,
      },
    );
    let createdCount = 0;

    for (const expiredBudget of expiredBudgets) {
      const newerBudget = await this.db.budget.findFirst({
        where: {
          seriesId: expiredBudget.seriesId,
          periodStart: { gt: expiredBudget.periodStart },
        },
        select: { id: true },
      });
      if (newerBudget) {
        await this.db.budget.updateMany({
          where: {
            id: expiredBudget.id,
            ...UNRENEWED_BUDGET_FILTER,
          },
          data: { renewedAt: now },
        });
        continue;
      }

      let source = expiredBudget;
      while (source.periodEnd < now) {
        const nextRange = getNextBudgetPeriodRange(
          source.period,
          source.periodStart,
        );
        const renewedBudget = await this.createNextPeriodBudget(
          source,
          nextRange,
          now,
        );
        if (!renewedBudget) break;
        createdCount += 1;
        source = renewedBudget;
      }
    }

    return createdCount;
  }

  private async createNextPeriodBudget(
    source: BudgetWithApprovals,
    periodRange: BudgetPeriodRange,
    now: Date,
  ) {
    let budget: BudgetWithRelations | undefined;
    try {
      budget = await this.db.$transaction(async (transaction) => {
        const newerBudget = await transaction.budget.findFirst({
          where: {
            seriesId: source.seriesId,
            periodStart: { gt: source.periodStart },
          },
          select: { id: true },
        });
        if (newerBudget) return undefined;

        const existing = await transaction.budget.findFirst({
          where: {
            seriesId: source.seriesId,
            periodStart: periodRange.start,
          },
          select: { id: true },
        });
        if (existing) return undefined;

        const claimed = await transaction.budget.updateMany({
          where: {
            id: source.id,
            seriesId: source.seriesId,
            status: 'approved',
            ...UNRENEWED_BUDGET_FILTER,
          },
          data: { renewedAt: now },
        });
        if (claimed.count !== 1) return undefined;

        const id = randomBytes(12).toString('hex');
        const createdBudget = await transaction.budget.create({
          data: {
            id,
            seriesId: source.seriesId,
            relationshipId: source.relationshipId,
            createdByUserId: source.createdByUserId,
            name: source.name,
            amountMinorUnits: source.amountMinorUnits,
            currency: normalizeBudgetCurrency(source.currency),
            period: source.period,
            periodStart: periodRange.start,
            periodEnd: periodRange.end,
            renewedAt: null,
            status: 'approved',
            approvals: {
              create: source.approvals.map(({ memberUserId }) => ({
                memberUserId,
                approvedAt: now,
              })),
            },
          },
          include: { approvals: true, items: true },
        });
        await this.notificationService.createForRelationshipMembers(
          transaction,
          {
            eventId: createdBudget.id,
            excludedUserIds: [createdBudget.createdByUserId],
            relationshipId: createdBudget.relationshipId,
            target: { type: 'budget', id: createdBudget.id },
            title: 'Budget renewed',
            body: createdBudget.name,
          },
        );
        return createdBudget;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return undefined;
      throw error;
    }

    if (budget) await this.notificationService.deliver(budget.id);
    return budget;
  }

  private async requireMember(userId: string, relationshipId: string) {
    requireUserId(userId);
    const member = await this.db.relationshipMember.findFirst({
      where: { relationshipId, userId, active: true },
      select: { id: true },
    });
    if (!member) {
      throw new BudgetDomainError('Relationship not found.', 404);
    }
  }

  private async requireActiveApprovers(
    relationshipId: string,
    approverUserIds: string[],
  ) {
    const members = await this.db.relationshipMember.findMany({
      where: {
        relationshipId,
        active: true,
        userId: { in: approverUserIds },
      },
      select: { userId: true },
    });
    const activeMemberIds = new Set(members.map(({ userId }) => userId));
    if (approverUserIds.some((userId) => !activeMemberIds.has(userId))) {
      throw new BudgetDomainError(
        'Required approvers must be active members of the relationship.',
      );
    }
  }

  private async requireBudgetForMember(
    userId: string,
    budgetId: string,
  ): Promise<BudgetWithRelations> {
    requireUserId(userId);
    const budget = await this.db.budget.findFirst({
      where: {
        id: budgetId,
        relationship: {
          members: { some: { userId, active: true } },
        },
      },
      include: {
        approvals: true,
        items: { orderBy: [{ date: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!budget) {
      throw new BudgetDomainError('Budget not found.', 404);
    }
    return budget;
  }

  private requireCreator(userId: string, budget: PrismaBudget) {
    if (budget.createdByUserId !== userId) {
      throw new BudgetDomainError(
        'Only the creator can update or delete this budget.',
        403,
      );
    }
  }
}
