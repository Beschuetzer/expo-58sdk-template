import type {
  CreateSexEventInput,
  FlipSexCoinInput,
  FlipSexCoinResponse,
  SexCoinFlip,
  SexCoinSide,
  SexDailyStatus,
  SexEvent,
  SexEventListFilters,
  SexEventListResponse,
} from '@expo-50sdk-template/shared-types';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  addMonths,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from 'date-fns';
import { createHash, randomInt } from 'node:crypto';

const MAX_SEX_EVENT_PAGE_SIZE = 100;

export class SexDomainError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'SexDomainError';
    this.statusCode = statusCode;
  }
}

export type SexService = {
  getDailyStatus(
    userId: string,
    relationshipId: string,
    memberUserIds?: string[],
    today?: string,
  ): Promise<SexDailyStatus>;
  getEvents(
    userId: string,
    relationshipId: string,
    filters: SexEventListFilters,
  ): Promise<SexEventListResponse>;
  flipCoin(
    userId: string,
    relationshipId: string,
    input: FlipSexCoinInput,
  ): Promise<FlipSexCoinResponse>;
  resetDailyCoinFlip(
    userId: string,
    relationshipId: string,
    today?: string,
  ): Promise<void>;
  createEvent(
    userId: string,
    relationshipId: string,
    input: CreateSexEventInput,
  ): Promise<SexEvent>;
};

export type SexServiceDependencies = {
  now?: () => Date;
  randomInt?: (max: number) => number;
};

type SexCoinFlipRecord = {
  id: string;
  relationshipId: string;
  day: string;
  memberSetKey: string;
  memberUserIds: string[];
  createdByUserId: string;
  guess: SexCoinSide;
  outcome: SexCoinSide;
  createdAt: Date;
};

type SexEventRecord = {
  id: string;
  relationshipId: string;
  day: string;
  memberSetKey: string;
  memberUserIds: string[];
  createdByUserId: string;
  createdAt: Date;
};

function mapCoinFlip(flip: SexCoinFlipRecord): SexCoinFlip {
  return {
    id: flip.id,
    relationshipId: flip.relationshipId,
    day: flip.day,
    memberUserIds: flip.memberUserIds ?? [],
    createdByUserId: flip.createdByUserId,
    guess: flip.guess,
    outcome: flip.outcome,
    createdAt: flip.createdAt.toISOString(),
  };
}

function mapEvent(event: SexEventRecord): SexEvent {
  return {
    id: event.id,
    relationshipId: event.relationshipId,
    day: event.day,
    memberUserIds: event.memberUserIds ?? [],
    createdByUserId: event.createdByUserId,
    createdAt: event.createdAt.toISOString(),
  };
}

function getDayKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function parseDay(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new SexDomainError('Day must be a valid calendar date.');
  }
  const date = parseISO(value);
  if (!isValid(date) || format(date, 'yyyy-MM-dd') !== value) {
    throw new SexDomainError('Day must be a valid calendar date.');
  }
  return value;
}

function getRequestedDayKey(value: unknown, now: Date) {
  if (value === undefined) {
    return getDayKey(now);
  }

  const day = parseDay(value);
  const utcToday = parseISO(now.toISOString().slice(0, 10));
  if (Math.abs(differenceInCalendarDays(parseISO(day), utcToday)) > 1) {
    throw new SexDomainError(
      'Today must be within one calendar day of the current date.',
    );
  }
  return day;
}

function getDaysBetween(laterDay: string, earlierDay: string) {
  return differenceInCalendarDays(parseISO(laterDay), parseISO(earlierDay));
}

function getMemberSetKey(memberUserIds: string[]) {
  return createHash('sha256')
    .update(JSON.stringify([...memberUserIds].sort()))
    .digest('hex');
}

function getSelectedMemberIds(
  requestedUserIds: string[] | undefined,
  activeMemberUserIds: string[],
) {
  const selectedUserIds = [
    ...new Set(requestedUserIds ?? activeMemberUserIds),
  ].sort();
  const activeMemberUserIdSet = new Set(activeMemberUserIds);

  if (selectedUserIds.length < 2) {
    throw new SexDomainError('At least two active members must be selected.');
  }
  if (selectedUserIds.some((userId) => !activeMemberUserIdSet.has(userId))) {
    throw new SexDomainError(
      'Only active relationship members can be selected.',
      403,
    );
  }

  return selectedUserIds;
}

function requireUserId(userId: string) {
  if (!userId.trim()) {
    throw new SexDomainError('Authentication is required.', 401);
  }
}

export class PrismaSexService implements SexService {
  private readonly now: () => Date;
  private readonly randomInt: (max: number) => number;

  constructor(
    private readonly db: PrismaClient,
    dependencies: SexServiceDependencies = {},
  ) {
    this.now = dependencies.now ?? (() => new Date());
    this.randomInt = dependencies.randomInt ?? randomInt;
  }

  async getDailyStatus(
    userId: string,
    relationshipId: string,
    memberUserIds?: string[],
    requestedToday?: string,
  ) {
    const today = getRequestedDayKey(requestedToday, this.now());
    const activeMemberUserIds = await this.getActiveMemberUserIds(
      userId,
      relationshipId,
    );
    const selectedMemberUserIds = getSelectedMemberIds(
      memberUserIds,
      activeMemberUserIds,
    );

    return this.getStatusForMembers(
      relationshipId,
      selectedMemberUserIds,
      today,
    );
  }

  async getEvents(
    userId: string,
    relationshipId: string,
    filters: SexEventListFilters,
  ): Promise<SexEventListResponse> {
    await this.getActiveMemberUserIds(userId, relationshipId);
    const limit = Math.min(
      Math.max(filters.limit ?? 25, 1),
      MAX_SEX_EVENT_PAGE_SIZE,
    );
    const monthStartDay = `${filters.month}-01`;
    const nextMonthStartDay = format(
      addMonths(parseISO(monthStartDay), 1),
      'yyyy-MM-dd',
    );
    const [eventRecords, earliestEvent] = await Promise.all([
      this.db.sexEvent.findMany({
        orderBy: [{ day: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        where: {
          day: { gte: monthStartDay, lt: nextMonthStartDay },
          relationshipId,
        },
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      }),
      this.db.sexEvent.findFirst({
        orderBy: [{ day: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { day: true },
        where: { relationshipId },
      }),
    ]);
    const hasNextPage = eventRecords.length > limit;
    const items = eventRecords.slice(0, limit).map(mapEvent);

    return {
      earliestEventDayId: earliestEvent?.day ?? null,
      items,
      ...(hasNextPage ? { nextCursor: items[items.length - 1]?.id } : {}),
    };
  }

  async flipCoin(
    userId: string,
    relationshipId: string,
    input: FlipSexCoinInput,
  ) {
    const today = getRequestedDayKey(input.today, this.now());
    const activeMemberUserIds = await this.getActiveMemberUserIds(
      userId,
      relationshipId,
    );
    const memberUserIds = getSelectedMemberIds(
      input.memberUserIds,
      activeMemberUserIds,
    );
    const status = await this.getStatusForMembers(
      relationshipId,
      memberUserIds,
      today,
    );

    if (!status.requiresCoinFlip) {
      throw new SexDomainError('A coin flip is not required today.', 409);
    }
    if (status.coinFlip) {
      return { coinFlip: status.coinFlip, status };
    }

    const memberSetKey = getMemberSetKey(memberUserIds);
    const data = {
      relationshipId,
      day: today,
      memberSetKey,
      memberUserIds,
      createdByUserId: userId,
      guess: input.guess,
      outcome: this.randomInt(2) === 0 ? 'heads' : 'tails',
    } satisfies Omit<SexCoinFlipRecord, 'id' | 'createdAt'>;

    let coinFlipRecord: SexCoinFlipRecord;
    try {
      coinFlipRecord = await this.db.sexCoinFlip.create({ data });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const existing = await this.db.sexCoinFlip.findFirst({
        where: { relationshipId, day: today },
      });
      if (!existing) throw error;
      coinFlipRecord = existing;
    }

    const coinFlip = mapCoinFlip(coinFlipRecord);
    const updatedStatus = await this.getStatusForMembers(
      relationshipId,
      memberUserIds,
      today,
    );
    return { coinFlip, status: updatedStatus };
  }

  async resetDailyCoinFlip(
    userId: string,
    relationshipId: string,
    requestedToday?: string,
  ) {
    const today = getRequestedDayKey(requestedToday, this.now());
    await this.getActiveMemberUserIds(userId, relationshipId);
    await this.db.sexCoinFlip.deleteMany({
      where: { relationshipId, day: today },
    });
  }

  async createEvent(
    userId: string,
    relationshipId: string,
    input: CreateSexEventInput,
  ) {
    const today = getRequestedDayKey(input.today, this.now());
    const day = parseDay(input.day);
    if (day > today) {
      throw new SexDomainError(
        'A love-making session cannot be recorded in the future.',
      );
    }

    const activeMemberUserIds = await this.getActiveMemberUserIds(
      userId,
      relationshipId,
    );
    const memberUserIds = getSelectedMemberIds(
      input.memberUserIds,
      activeMemberUserIds,
    );
    const status = await this.getStatusForMembers(
      relationshipId,
      memberUserIds,
      day,
    );
    if (!status.canHaveSex) {
      throw new SexDomainError(
        day === today
          ? 'Sex is not allowed today for the selected members.'
          : 'Sex is not allowed on the selected day for the selected members.',
        409,
      );
    }

    const event = await this.db.sexEvent.create({
      data: {
        relationshipId,
        day,
        memberSetKey: getMemberSetKey(memberUserIds),
        memberUserIds,
        createdByUserId: userId,
      },
    });
    return mapEvent(event);
  }

  private async getActiveMemberUserIds(userId: string, relationshipId: string) {
    requireUserId(userId);
    const members = await this.db.relationshipMember.findMany({
      where: { relationshipId, active: true },
      select: { userId: true },
    });
    const activeMemberUserIds = members.map(
      ({ userId: memberUserId }) => memberUserId,
    );
    if (!activeMemberUserIds.includes(userId)) {
      throw new SexDomainError(
        'An active relationship membership is required.',
        403,
      );
    }
    return activeMemberUserIds;
  }

  private async getStatusForMembers(
    relationshipId: string,
    memberUserIds: string[],
    day: string,
  ): Promise<SexDailyStatus> {
    const memberSetKey = getMemberSetKey(memberUserIds);
    const [lastEventRecord, coinFlipRecord] = await Promise.all([
      this.db.sexEvent.findFirst({
        where: {
          relationshipId,
          memberSetKey,
          day: { lte: day },
        },
        orderBy: [{ day: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.db.sexCoinFlip.findFirst({
        where: { relationshipId, day },
      }),
    ]);

    const lastSexEvent = lastEventRecord ? mapEvent(lastEventRecord) : null;
    const coinFlip = coinFlipRecord ? mapCoinFlip(coinFlipRecord) : null;
    const daysSinceLastSex = lastSexEvent
      ? getDaysBetween(day, lastSexEvent.day)
      : null;
    const sexAlreadyRecordedToday = lastSexEvent?.day === day;
    const requiresCoinFlip =
      !sexAlreadyRecordedToday &&
      (daysSinceLastSex === null || daysSinceLastSex <= 2);
    const coinFlipMatchesMembers =
      coinFlipRecord?.memberSetKey === memberSetKey;
    const canHaveSex =
      !requiresCoinFlip ||
      Boolean(
        coinFlip &&
          coinFlipMatchesMembers &&
          coinFlip.guess === coinFlip.outcome,
      );

    return {
      today: day,
      memberUserIds,
      lastSexEvent,
      daysSinceLastSex,
      coinFlip,
      requiresCoinFlip,
      canHaveSex,
    };
  }
}
