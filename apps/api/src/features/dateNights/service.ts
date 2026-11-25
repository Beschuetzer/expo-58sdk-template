import type {
  CreateDateNightEventInput,
  DateNightEvent,
  DateNightEventListFilters,
  DateNightEventListResponse,
} from '@expo-50sdk-template/shared-types';
import { PrismaClient } from '@prisma/client';
import {
  addMonths,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from 'date-fns';

const MAX_DATE_NIGHT_EVENT_PAGE_SIZE = 100;
export const MAX_DATE_NIGHT_DESCRIPTION_LENGTH = 2_000;

export class DateNightDomainError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'DateNightDomainError';
    this.statusCode = statusCode;
  }
}

export type DateNightService = {
  getEvents(
    userId: string,
    relationshipId: string,
    filters: DateNightEventListFilters,
  ): Promise<DateNightEventListResponse>;
  createEvent(
    userId: string,
    relationshipId: string,
    input: CreateDateNightEventInput,
  ): Promise<DateNightEvent>;
};

export type DateNightServiceDependencies = {
  now?: () => Date;
};

type DateNightEventRecord = {
  id: string;
  relationshipId: string;
  day: string;
  description: string | null;
  createdByUserId: string;
  createdAt: Date;
};

function mapEvent(event: DateNightEventRecord): DateNightEvent {
  return {
    id: event.id,
    relationshipId: event.relationshipId,
    day: event.day,
    ...(event.description ? { description: event.description } : {}),
    createdByUserId: event.createdByUserId,
    createdAt: event.createdAt.toISOString(),
  };
}

function getDayKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function parseDay(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DateNightDomainError('Day must be a valid calendar date.');
  }
  const date = parseISO(value);
  if (!isValid(date) || format(date, 'yyyy-MM-dd') !== value) {
    throw new DateNightDomainError('Day must be a valid calendar date.');
  }
  return value;
}

function normalizeDescription(value?: string) {
  const description = value?.trim() ?? '';
  if (description.length > MAX_DATE_NIGHT_DESCRIPTION_LENGTH) {
    throw new DateNightDomainError('Description is too long.');
  }
  return description || null;
}

function getRequestedDayKey(value: unknown, now: Date) {
  if (value === undefined) {
    return getDayKey(now);
  }

  const day = parseDay(value);
  const utcToday = parseISO(now.toISOString().slice(0, 10));
  if (Math.abs(differenceInCalendarDays(parseISO(day), utcToday)) > 1) {
    throw new DateNightDomainError(
      'Today must be within one calendar day of the current date.',
    );
  }
  return day;
}

function requireUserId(userId: string) {
  if (!userId.trim()) {
    throw new DateNightDomainError('Authentication is required.', 401);
  }
}

export class PrismaDateNightService implements DateNightService {
  private readonly now: () => Date;

  constructor(
    private readonly db: PrismaClient,
    dependencies: DateNightServiceDependencies = {},
  ) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async getEvents(
    userId: string,
    relationshipId: string,
    filters: DateNightEventListFilters,
  ): Promise<DateNightEventListResponse> {
    await this.getActiveMemberUserIds(userId, relationshipId);
    const limit = Math.min(
      Math.max(filters.limit ?? 25, 1),
      MAX_DATE_NIGHT_EVENT_PAGE_SIZE,
    );
    const monthStartDay = `${filters.month}-01`;
    const nextMonthStartDay = format(
      addMonths(parseISO(monthStartDay), 1),
      'yyyy-MM-dd',
    );
    const [eventRecords, earliestEvent, latestEvent] = await Promise.all([
      this.db.dateNightEvent.findMany({
        orderBy: [{ day: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        where: {
          day: { gte: monthStartDay, lt: nextMonthStartDay },
          relationshipId,
        },
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      }),
      this.db.dateNightEvent.findFirst({
        orderBy: [{ day: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { day: true },
        where: { relationshipId },
      }),
      this.db.dateNightEvent.findFirst({
        orderBy: [{ day: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        select: { day: true },
        where: { relationshipId },
      }),
    ]);
    const hasNextPage = eventRecords.length > limit;
    const items = eventRecords.slice(0, limit).map(mapEvent);

    return {
      earliestEventDayId: earliestEvent?.day ?? null,
      latestEventDayId: latestEvent?.day ?? null,
      items,
      ...(hasNextPage ? { nextCursor: items[items.length - 1]?.id } : {}),
    };
  }

  async createEvent(
    userId: string,
    relationshipId: string,
    input: CreateDateNightEventInput,
  ): Promise<DateNightEvent> {
    const today = getRequestedDayKey(input.today, this.now());
    const day = parseDay(input.day);
    if (day > today) {
      throw new DateNightDomainError(
        'A date night cannot be recorded in the future.',
      );
    }

    await this.getActiveMemberUserIds(userId, relationshipId);
    const event = await this.db.dateNightEvent.create({
      data: {
        relationshipId,
        day,
        description: normalizeDescription(input.description),
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
      throw new DateNightDomainError(
        'An active relationship membership is required.',
        403,
      );
    }
    return activeMemberUserIds;
  }
}
