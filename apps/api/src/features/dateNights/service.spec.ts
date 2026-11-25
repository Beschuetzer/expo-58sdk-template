import type { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PrismaDateNightService } from './service';

const TODAY = '2026-10-29';
const NOW = new Date(`${TODAY}T12:00:00.000Z`);
const ACTIVE_MEMBERS = ['member-1', 'member-2'];

type StoredDateNightEvent = {
  id: string;
  relationshipId: string;
  day: string;
  description?: string | null;
  createdByUserId: string;
  createdAt: Date;
};

function createDb({
  activeMemberUserIds = ACTIVE_MEMBERS,
  events = [] as StoredDateNightEvent[],
}: {
  activeMemberUserIds?: string[];
  events?: StoredDateNightEvent[];
} = {}) {
  let nextEventId = 1;
  const client = {
    relationshipMember: {
      findMany: async ({
        where,
      }: {
        where: { relationshipId: string; active: boolean };
      }) =>
        where.relationshipId === 'relationship-1' && where.active
          ? activeMemberUserIds.map((userId) => ({ userId }))
          : [],
    },
    dateNightEvent: {
      findMany: async ({
        cursor,
        skip = 0,
        take,
        where,
      }: {
        cursor?: { id: string };
        skip?: number;
        take: number;
        where: {
          day: { gte: string; lt: string };
          relationshipId: string;
        };
      }) => {
        const matchingEvents = events
          .filter(
            (event) =>
              event.relationshipId === where.relationshipId &&
              event.day >= where.day.gte &&
              event.day < where.day.lt,
          )
          .sort((left, right) => {
            const dateOrder = left.day.localeCompare(right.day);
            return (
              dateOrder ||
              left.createdAt.getTime() - right.createdAt.getTime() ||
              left.id.localeCompare(right.id)
            );
          });
        const cursorIndex = cursor
          ? matchingEvents.findIndex((event) => event.id === cursor.id)
          : -1;
        const startIndex = cursor ? cursorIndex + skip : 0;
        return matchingEvents.slice(startIndex, startIndex + take);
      },
      findFirst: async ({
        orderBy,
        where,
      }: {
        orderBy: { day?: string; createdAt?: string; id?: string }[];
        where: { relationshipId: string };
      }) => {
        const direction = orderBy[0]?.day === 'desc' ? -1 : 1;
        return (
          events
            .filter((event) => event.relationshipId === where.relationshipId)
            .sort((left, right) => {
              const dateOrder = left.day.localeCompare(right.day) * direction;
              return (
                dateOrder ||
                (left.createdAt.getTime() - right.createdAt.getTime()) *
                  direction ||
                left.id.localeCompare(right.id) * direction
              );
            })[0] ?? null
        );
      },
      create: async ({
        data,
      }: {
        data: Omit<StoredDateNightEvent, 'id' | 'createdAt'>;
      }) => {
        const event: StoredDateNightEvent = {
          ...data,
          id: `date-night-${nextEventId++}`,
          createdAt: NOW,
        };
        events.push(event);
        return event;
      },
    },
  } as unknown as PrismaClient;

  return { client, events };
}

function createService(db: PrismaClient) {
  return new PrismaDateNightService(db, { now: () => NOW });
}

test('calendar event pages are month-scoped, ordered, paginated, and bounded', async () => {
  const events: StoredDateNightEvent[] = [
    {
      id: 'date-night-later',
      relationshipId: 'relationship-1',
      day: '2026-10-28',
      createdByUserId: 'member-2',
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
    },
    {
      id: 'date-night-earliest',
      relationshipId: 'relationship-1',
      day: '2026-09-30',
      createdByUserId: 'member-1',
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
    },
    {
      id: 'date-night-earlier',
      relationshipId: 'relationship-1',
      day: '2026-10-26',
      createdByUserId: 'member-1',
      createdAt: new Date('2026-10-26T12:00:00.000Z'),
    },
    {
      id: 'date-night-same-day',
      relationshipId: 'relationship-1',
      day: '2026-10-28',
      createdByUserId: 'member-1',
      createdAt: new Date('2026-10-28T10:00:00.000Z'),
    },
    {
      id: 'other-relationship',
      relationshipId: 'relationship-2',
      day: '2026-10-25',
      createdByUserId: 'member-1',
      createdAt: new Date('2026-10-25T12:00:00.000Z'),
    },
  ];
  const { client } = createDb({ events });
  const service = createService(client);

  const firstPage = await service.getEvents('member-1', 'relationship-1', {
    limit: 2,
    month: '2026-10',
  });
  assert.deepEqual(
    firstPage.items.map(({ day, id }) => ({ day, id })),
    [
      { day: '2026-10-26', id: 'date-night-earlier' },
      { day: '2026-10-28', id: 'date-night-same-day' },
    ],
  );
  assert.equal(firstPage.nextCursor, 'date-night-same-day');
  assert.equal(firstPage.earliestEventDayId, '2026-09-30');
  assert.equal(firstPage.latestEventDayId, '2026-10-28');

  const secondPage = await service.getEvents('member-1', 'relationship-1', {
    cursor: firstPage.nextCursor,
    limit: 2,
    month: '2026-10',
  });
  assert.deepEqual(
    secondPage.items.map(({ day, id }) => ({ day, id })),
    [{ day: '2026-10-28', id: 'date-night-later' }],
  );
  assert.equal(secondPage.nextCursor, undefined);
  assert.deepEqual(
    await service
      .getEvents('inactive-member', 'relationship-1', {
        month: '2026-10',
      })
      .catch((error: { statusCode?: number }) => error.statusCode),
    403,
  );
});

test('date-night instances can be recorded more than once on the same day', async () => {
  const { client, events } = createDb();
  const service = createService(client);

  const first = await service.createEvent('member-1', 'relationship-1', {
    day: TODAY,
    description: '  Dinner and a movie  ',
    today: TODAY,
  });
  const second = await service.createEvent('member-2', 'relationship-1', {
    day: TODAY,
    description: '   ',
    today: TODAY,
  });

  assert.equal(first.day, TODAY);
  assert.equal(first.description, 'Dinner and a movie');
  assert.equal(first.createdByUserId, 'member-1');
  assert.equal(second.day, TODAY);
  assert.equal(second.description, undefined);
  assert.equal(second.createdByUserId, 'member-2');
  assert.notEqual(first.id, second.id);
  assert.equal(events.length, 2);
  assert.equal(events[1]?.description, null);
});

test('future and invalid dates are rejected before creating a record', async () => {
  const { client, events } = createDb();
  const service = createService(client);

  await assert.rejects(
    service.createEvent('member-1', 'relationship-1', {
      day: '2026-10-30',
      today: TODAY,
    }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.createEvent('member-1', 'relationship-1', {
      day: '2026-02-30',
      today: TODAY,
    }),
    { statusCode: 400 },
  );
  await assert.rejects(
    service.createEvent('member-1', 'relationship-1', {
      day: TODAY,
      description: 'a'.repeat(2_001),
      today: TODAY,
    }),
    { statusCode: 400 },
  );
  assert.equal(events.length, 0);
});

test('creating a date night requires active relationship membership', async () => {
  const { client, events } = createDb();
  const service = createService(client);

  await assert.rejects(
    service.createEvent('inactive-member', 'relationship-1', {
      day: TODAY,
      today: TODAY,
    }),
    { statusCode: 403 },
  );
  assert.equal(events.length, 0);
});
