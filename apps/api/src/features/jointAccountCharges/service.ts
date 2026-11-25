import type {
  CreateJointAccountChargeInput,
  JointAccountCharge,
  JointAccountChargeListFilters,
  JointAccountChargeListResponse,
  MarkAllJointAccountChargesPaidResponse,
  UpdateJointAccountChargeInput,
} from '@expo-50sdk-template/shared-types';
import {
  Prisma,
  PrismaClient,
  type JointAccountCharge as PrismaJointAccountCharge,
} from '@prisma/client';

import { PrismaNotificationService } from '../notifications/notificationService';

const MAX_PAGE_SIZE = 100;

export class JointAccountChargeDomainError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'JointAccountChargeDomainError';
    this.statusCode = statusCode;
  }
}

export type JointAccountChargeService = {
  listCharges(
    userId: string,
    relationshipId: string,
    filters: JointAccountChargeListFilters,
  ): Promise<JointAccountChargeListResponse>;
  createCharge(
    userId: string,
    relationshipId: string,
    input: CreateJointAccountChargeInput,
  ): Promise<JointAccountCharge>;
  getCharge(userId: string, chargeId: string): Promise<JointAccountCharge>;
  updateCharge(
    userId: string,
    chargeId: string,
    input: UpdateJointAccountChargeInput,
  ): Promise<JointAccountCharge>;
  markChargePaid(userId: string, chargeId: string): Promise<JointAccountCharge>;
  markAllChargesPaid(
    userId: string,
    relationshipId: string,
  ): Promise<MarkAllJointAccountChargesPaidResponse>;
  deleteCharge(userId: string, chargeId: string): Promise<void>;
};

function mapCharge(charge: PrismaJointAccountCharge): JointAccountCharge {
  return {
    id: charge.id,
    relationshipId: charge.relationshipId,
    ...(charge.paymentRequestId
      ? { paymentRequestId: charge.paymentRequestId }
      : {}),
    createdByUserId: charge.createdByUserId,
    ...(charge.updatedByUserId
      ? { updatedByUserId: charge.updatedByUserId }
      : {}),
    name: charge.name,
    amountMinorUnits: charge.amountMinorUnits,
    chargeDate: charge.chargeDate.toISOString(),
    status: charge.status,
    createdAt: charge.createdAt.toISOString(),
    updatedAt: charge.updatedAt.toISOString(),
  };
}

export class PrismaJointAccountChargeService
  implements JointAccountChargeService
{
  private readonly notificationService: PrismaNotificationService;

  constructor(private readonly db: PrismaClient) {
    this.notificationService = new PrismaNotificationService(db);
  }

  async listCharges(
    userId: string,
    relationshipId: string,
    filters: JointAccountChargeListFilters,
  ) {
    await this.requireMember(userId, relationshipId);
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), MAX_PAGE_SIZE);
    const name = filters.name?.trim();
    const baseWhere: Prisma.JointAccountChargeWhereInput = {
      relationshipId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
      ...(filters.createdByUserId
        ? { createdByUserId: filters.createdByUserId }
        : {}),
      ...(filters.minimumAmountMinorUnits !== undefined ||
      filters.maximumAmountMinorUnits !== undefined
        ? {
            amountMinorUnits: {
              ...(filters.minimumAmountMinorUnits !== undefined
                ? { gte: filters.minimumAmountMinorUnits }
                : {}),
              ...(filters.maximumAmountMinorUnits !== undefined
                ? { lte: filters.maximumAmountMinorUnits }
                : {}),
            },
          }
        : {}),
    };
    const dateRange =
      filters.fromDate || filters.toDate
        ? {
            ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
            ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
          }
        : undefined;
    const where: Prisma.JointAccountChargeWhereInput = {
      ...baseWhere,
      ...(dateRange ? { chargeDate: dateRange } : {}),
    };
    const [charges, dateBounds, unpaidSummary] = await Promise.all([
      this.db.jointAccountCharge.findMany({
        where,
        orderBy: [{ chargeDate: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      }),
      dateRange && !filters.cursor
        ? Promise.all([
            this.db.jointAccountCharge.findFirst({
              where: baseWhere,
              orderBy: [{ chargeDate: 'asc' }, { id: 'asc' }],
              select: { chargeDate: true },
            }),
            this.db.jointAccountCharge.findFirst({
              where: baseWhere,
              orderBy: [{ chargeDate: 'desc' }, { id: 'desc' }],
              select: { chargeDate: true },
            }),
          ])
        : Promise.resolve(undefined),
      !filters.cursor
        ? Promise.all([
            this.db.jointAccountCharge.aggregate({
              where: { relationshipId, status: 'unpaid' },
              _sum: { amountMinorUnits: true },
            }),
            this.db.jointAccountCharge.count({
              where: {
                relationshipId,
                createdByUserId: userId,
                status: 'unpaid',
              },
            }),
          ])
        : Promise.resolve(undefined),
    ]);
    const hasNextPage = charges.length > limit;
    const items = charges.slice(0, limit).map(mapCharge);

    return {
      items,
      ...(hasNextPage ? { nextCursor: items[items.length - 1]?.id } : {}),
      ...(dateBounds
        ? {
            calendarDateBounds: {
              earliestDate: dateBounds[0]?.chargeDate.toISOString() ?? null,
              latestDate: dateBounds[1]?.chargeDate.toISOString() ?? null,
            },
          }
        : {}),
      ...(unpaidSummary
        ? {
            unpaidSummary: {
              totalAmountMinorUnits:
                unpaidSummary[0]._sum.amountMinorUnits ?? 0,
              currentUserChargeCount: unpaidSummary[1],
            },
          }
        : {}),
    };
  }

  async createCharge(
    userId: string,
    relationshipId: string,
    input: CreateJointAccountChargeInput,
  ) {
    await this.requireMember(userId, relationshipId);
    const charge = await this.db.$transaction(async (transaction) => {
      const createdCharge = await transaction.jointAccountCharge.create({
        data: {
          relationshipId,
          createdByUserId: userId,
          name: input.name.trim(),
          amountMinorUnits: input.amountMinorUnits,
        },
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdCharge.id,
        excludedUserIds: [userId],
        relationshipId,
        target: { type: 'jointAccountCharge', id: createdCharge.id },
        title: 'New joint account charge',
        body: createdCharge.name,
      });
      return createdCharge;
    });
    await this.notificationService.deliver(charge.id);
    return mapCharge(charge);
  }

  async getCharge(userId: string, chargeId: string) {
    const charge = await this.requireChargeForMember(userId, chargeId);
    return mapCharge(charge);
  }

  async updateCharge(
    userId: string,
    chargeId: string,
    input: UpdateJointAccountChargeInput,
  ) {
    const charge = await this.requireChargeForMember(userId, chargeId);
    this.requireCreator(userId, charge);

    const updated = await this.db.jointAccountCharge.updateMany({
      where: {
        id: chargeId,
        relationshipId: charge.relationshipId,
        createdByUserId: userId,
      },
      data: {
        name: input.name.trim(),
        amountMinorUnits: input.amountMinorUnits,
        chargeDate: new Date(input.chargeDate),
        updatedByUserId: userId,
      },
    });
    if (updated.count !== 1) {
      throw new JointAccountChargeDomainError(
        'The charge changed before it could be updated.',
        409,
      );
    }

    return this.getCharge(userId, chargeId);
  }

  async markChargePaid(userId: string, chargeId: string) {
    const charge = await this.requireChargeForMember(userId, chargeId);
    this.requireCreator(userId, charge);
    if (charge.status === 'paid') return mapCharge(charge);

    const updated = await this.db.jointAccountCharge.updateMany({
      where: {
        id: chargeId,
        relationshipId: charge.relationshipId,
        createdByUserId: userId,
        status: 'unpaid',
      },
      data: { status: 'paid', updatedByUserId: userId },
    });
    if (updated.count !== 1) {
      const currentCharge = await this.getCharge(userId, chargeId);
      if (currentCharge.status === 'paid') return currentCharge;
      throw new JointAccountChargeDomainError(
        'The charge changed before it could be marked paid.',
        409,
      );
    }

    return this.getCharge(userId, chargeId);
  }

  async markAllChargesPaid(userId: string, relationshipId: string) {
    await this.requireMember(userId, relationshipId);
    const result = await this.db.jointAccountCharge.updateMany({
      where: {
        relationshipId,
        createdByUserId: userId,
        status: 'unpaid',
      },
      data: { status: 'paid', updatedByUserId: userId },
    });

    return { updatedCount: result.count };
  }

  async deleteCharge(userId: string, chargeId: string) {
    const charge = await this.requireChargeForMember(userId, chargeId);
    if (charge.createdByUserId !== userId) {
      throw new JointAccountChargeDomainError(
        'Only the creator can delete this charge.',
        403,
      );
    }

    await this.db.$transaction(async (transaction) => {
      const deleted = await transaction.jointAccountCharge.deleteMany({
        where: {
          id: chargeId,
          relationshipId: charge.relationshipId,
          createdByUserId: userId,
        },
      });
      if (deleted.count !== 1) {
        throw new JointAccountChargeDomainError(
          'The charge changed before it could be deleted.',
          409,
        );
      }
      await transaction.notification.deleteMany({
        where: { targetType: 'jointAccountCharge', targetId: chargeId },
      });
    });
  }

  private async requireMember(userId: string, relationshipId: string) {
    if (!userId.trim()) {
      throw new JointAccountChargeDomainError(
        'Authentication is required.',
        401,
      );
    }
    const member = await this.db.relationshipMember.findFirst({
      where: { relationshipId, userId, active: true },
      select: { id: true },
    });
    if (!member) {
      throw new JointAccountChargeDomainError('Relationship not found.', 404);
    }
  }

  private async requireChargeForMember(
    userId: string,
    chargeId: string,
  ): Promise<PrismaJointAccountCharge> {
    if (!userId.trim()) {
      throw new JointAccountChargeDomainError(
        'Authentication is required.',
        401,
      );
    }
    const charge = await this.db.jointAccountCharge.findFirst({
      where: {
        id: chargeId,
        relationship: {
          members: { some: { userId, active: true } },
        },
      },
    });
    if (!charge) {
      throw new JointAccountChargeDomainError('Charge not found.', 404);
    }
    return charge;
  }

  private requireCreator(userId: string, charge: PrismaJointAccountCharge) {
    if (charge.createdByUserId !== userId) {
      throw new JointAccountChargeDomainError(
        'Only the creator can update this charge.',
        403,
      );
    }
  }
}
