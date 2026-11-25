import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { PrismaSexService } from './service';

const TODAY = '2026-10-29';
const NOW = new Date(`${TODAY}T12:00:00.000Z`);
const ACTIVE_MEMBERS = ['member-1', 'member-2', 'member-3'];

type StoredCoinFlip = {
  id: string;
  relationshipId: string;
  day: string;
  memberSetKey: string;
  memberUserIds: string[];
  createdByUserId: string;
  guess: 'heads' | 'tails';
  outcome: 'heads' | 'tails';
  createdAt: Date;
};

type StoredSexEvent = {
  id: string;
  relationshipId: string;
  day: string;
  memberSetKey: string;
  memberUserIds: string[];
  createdByUserId: string;
  createdAt: Date;
};

function getMemberSetKey(memberUserIds: string[]) {
  return createHash('sha256')
    .update(JSON.stringify([...memberUserIds].sort()))
    .digest('hex');
}

function createDb({
  activeMemberUserIds = ACTIVE_MEMBERS,
  coinFlips = [] as StoredCoinFlip[],
  events = [] as StoredSexEvent[],
}: {
  activeMemberUserIds?: string[];
  coinFlips?: StoredCoinFlip[];
  events?: StoredSexEvent[];
} = {}) {
  let nextCoinFlipId = 1;
  let nextEventId = 1;
  const duplicateError = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed',
    { code: 'P2002', clientVersion: '5.22.0' },
  );
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
    sexCoinFlip: {
      findFirst: async ({
        where,
      }: {
        where: { relationshipId: string; day: string };
      }) =>
        coinFlips.find(
          (flip) =>
            flip.relationshipId === where.relationshipId &&
            flip.day === where.day,
        ) ?? null,
      create: async ({
        data,
      }: {
        data: Omit<StoredCoinFlip, 'id' | 'createdAt'>;
      }) => {
        if (
          coinFlips.some(
            (flip) =>
              flip.relationshipId === data.relationshipId &&
              flip.day === data.day,
          )
        ) {
          throw duplicateError;
        }
        const coinFlip: StoredCoinFlip = {
          ...data,
          id: `coin-flip-${nextCoinFlipId++}`,
          createdAt: NOW,
        };
        coinFlips.push(coinFlip);
        return coinFlip;
      },
      deleteMany: async ({
        where,
      }: {
        where: { relationshipId: string; day: string };
      }) => {
        const remainingCoinFlips = coinFlips.filter(
          (flip) =>
            flip.relationshipId !== where.relationshipId ||
            flip.day !== where.day,
        );
        const count = coinFlips.length - remainingCoinFlips.length;
        coinFlips.splice(0, coinFlips.length, ...remainingCoinFlips);
        return { count };
      },
    },
    sexEvent: {
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
        where,
      }: {
        where:
          | {
              relationshipId: string;
              memberSetKey: string;
              day: { lte: string };
            }
          | { relationshipId: string };
      }) => {
        if ('memberSetKey' in where) {
          return (
            events
              .filter(
                (event) =>
                  event.relationshipId === where.relationshipId &&
                  event.memberSetKey === where.memberSetKey &&
                  event.day <= where.day.lte,
              )
              .sort((left, right) => {
                const dateOrder = right.day.localeCompare(left.day);
                return (
                  dateOrder ||
                  right.createdAt.getTime() - left.createdAt.getTime()
                );
              })[0] ?? null
          );
        }

        return (
          events
            .filter((event) => event.relationshipId === where.relationshipId)
            .sort((left, right) => {
              const dateOrder = left.day.localeCompare(right.day);
              return (
                dateOrder ||
                left.createdAt.getTime() - right.createdAt.getTime() ||
                left.id.localeCompare(right.id)
              );
            })[0] ?? null
        );
      },
      create: async ({
        data,
      }: {
        data: Omit<StoredSexEvent, 'id' | 'createdAt'>;
      }) => {
        const event: StoredSexEvent = {
          ...data,
          id: `sex-event-${nextEventId++}`,
          createdAt: NOW,
        };
        events.push(event);
        return event;
      },
    },
  } as unknown as PrismaClient;

  return { client, coinFlips, events };
}

function createService(
  db: PrismaClient,
  randomInt: (max: number) => number = () => 0,
) {
  return new PrismaSexService(db, { now: () => NOW, randomInt });
}

test('calendar event pages are month-scoped, ordered, and cursor-paginated', async () => {
  const events: StoredSexEvent[] = [
    {
      id: 'sex-event-later',
      relationshipId: 'relationship-1',
      day: '2026-10-28',
      memberSetKey: getMemberSetKey(['member-1', 'member-3']),
      memberUserIds: ['member-1', 'member-3'],
      createdByUserId: 'member-1',
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
    },
    {
      id: 'sex-event-earliest',
      relationshipId: 'relationship-1',
      day: '2026-09-30',
      memberSetKey: getMemberSetKey(['member-1', 'member-2']),
      memberUserIds: ['member-1', 'member-2'],
      createdByUserId: 'member-1',
      createdAt: new Date('2026-09-30T12:00:00.000Z'),
    },
    {
      id: 'sex-event-earlier',
      relationshipId: 'relationship-1',
      day: '2026-10-26',
      memberSetKey: getMemberSetKey(['member-1', 'member-2']),
      memberUserIds: ['member-1', 'member-2'],
      createdByUserId: 'member-1',
      createdAt: new Date('2026-10-26T12:00:00.000Z'),
    },
    {
      id: 'sex-event-other-relationship',
      relationshipId: 'relationship-2',
      day: '2026-10-25',
      memberSetKey: getMemberSetKey(['member-1', 'member-2']),
      memberUserIds: ['member-1', 'member-2'],
      createdByUserId: 'member-1',
      createdAt: new Date('2026-10-25T12:00:00.000Z'),
    },
  ];
  const { client } = createDb({ events });
  const service = createService(client);

  const firstPage = await service.getEvents('member-1', 'relationship-1', {
    limit: 1,
    month: '2026-10',
  });

  assert.deepEqual(
    firstPage.items.map(({ id, day, memberUserIds }) => ({
      id,
      day,
      memberUserIds,
    })),
    [
      {
        id: 'sex-event-earlier',
        day: '2026-10-26',
        memberUserIds: ['member-1', 'member-2'],
      },
    ],
  );
  assert.equal(firstPage.nextCursor, 'sex-event-earlier');
  assert.equal(firstPage.earliestEventDayId, '2026-09-30');

  const secondPage = await service.getEvents('member-1', 'relationship-1', {
    cursor: firstPage.nextCursor,
    limit: 1,
    month: '2026-10',
  });
  assert.deepEqual(
    secondPage.items.map(({ id, day }) => ({ id, day })),
    [{ id: 'sex-event-later', day: '2026-10-28' }],
  );
  assert.equal(secondPage.nextCursor, undefined);
  assert.equal(secondPage.earliestEventDayId, '2026-09-30');

  await assert.rejects(
    service.getEvents('inactive-member', 'relationship-1', {
      month: '2026-10',
    }),
    { statusCode: 403 },
  );
});

test('a coin flip is stored once and shared across relationship members', async () => {
  const { client, coinFlips } = createDb();
  let randomCalls = 0;
  const service = createService(client, () => {
    randomCalls += 1;
    return 0;
  });

  const firstStatus = await service.getDailyStatus(
    'member-1',
    'relationship-1',
    ['member-1', 'member-2'],
  );
  assert.equal(firstStatus.requiresCoinFlip, true);
  assert.equal(firstStatus.canHaveSex, false);

  const firstFlip = await service.flipCoin('member-1', 'relationship-1', {
    memberUserIds: ['member-1', 'member-2'],
    guess: 'tails',
  });
  const secondMemberStatus = await service.getDailyStatus(
    'member-2',
    'relationship-1',
    ['member-1', 'member-2'],
  );
  const secondMemberFlip = await service.flipCoin(
    'member-2',
    'relationship-1',
    {
      memberUserIds: ['member-1', 'member-2'],
      guess: 'heads',
    },
  );

  assert.equal(firstFlip.coinFlip.day, TODAY);
  assert.equal(firstFlip.coinFlip.outcome, 'heads');
  assert.equal(firstFlip.status.canHaveSex, false);
  assert.equal(secondMemberStatus.coinFlip?.id, firstFlip.coinFlip.id);
  assert.equal(secondMemberStatus.canHaveSex, false);
  assert.equal(secondMemberFlip.coinFlip.id, firstFlip.coinFlip.id);
  assert.equal(secondMemberFlip.coinFlip.guess, 'tails');
  assert.equal(coinFlips.length, 1);
  assert.equal(randomCalls, 1);
});

test('daily coin-flip logic uses the client day after UTC has rolled over', async () => {
  const localToday = '2026-11-03';
  const members = ['member-1', 'member-2'];
  const { client } = createDb();
  const service = new PrismaSexService(client, {
    now: () => new Date('2026-11-04T02:02:00.000Z'),
    randomInt: () => 0,
  });

  const status = await service.getDailyStatus(
    'member-1',
    'relationship-1',
    members,
    localToday,
  );
  assert.equal(status.today, localToday);

  const flip = await service.flipCoin('member-1', 'relationship-1', {
    today: localToday,
    memberUserIds: members,
    guess: 'tails',
  });
  assert.equal(flip.coinFlip.day, localToday);
  assert.equal(flip.status.today, localToday);

  await assert.rejects(
    service.createEvent('member-1', 'relationship-1', {
      day: localToday,
      today: localToday,
      memberUserIds: members,
    }),
    { statusCode: 409 },
  );

  await assert.rejects(
    service.getDailyStatus('member-1', 'relationship-1', members, '2026-11-06'),
    { statusCode: 400 },
  );
});

test('daily coin-flip reset deletes only today’s flip for the selected relationship', async () => {
  const memberUserIds = ['member-1', 'member-2'];
  const { client, coinFlips } = createDb({
    coinFlips: [
      {
        id: 'today',
        relationshipId: 'relationship-1',
        day: TODAY,
        memberSetKey: getMemberSetKey(memberUserIds),
        memberUserIds,
        createdByUserId: 'member-1',
        guess: 'heads',
        outcome: 'tails',
        createdAt: NOW,
      },
      {
        id: 'yesterday',
        relationshipId: 'relationship-1',
        day: '2026-10-28',
        memberSetKey: getMemberSetKey(memberUserIds),
        memberUserIds,
        createdByUserId: 'member-1',
        guess: 'tails',
        outcome: 'heads',
        createdAt: NOW,
      },
      {
        id: 'other-relationship',
        relationshipId: 'relationship-2',
        day: TODAY,
        memberSetKey: getMemberSetKey(memberUserIds),
        memberUserIds,
        createdByUserId: 'member-1',
        guess: 'heads',
        outcome: 'heads',
        createdAt: NOW,
      },
    ],
  });
  const service = createService(client);

  await service.resetDailyCoinFlip('member-1', 'relationship-1');

  assert.deepEqual(
    coinFlips.map((flip) => flip.id),
    ['yesterday', 'other-relationship'],
  );
});

test('daily coin-flip reset requires active relationship membership', async () => {
  const { client } = createDb();
  const service = createService(client);

  await assert.rejects(
    service.resetDailyCoinFlip('inactive-member', 'relationship-1'),
    { statusCode: 403 },
  );
});

test('a matching guess permits current-day events and remains valid that day', async () => {
  const { client } = createDb();
  const service = createService(client, () => 1);

  const result = await service.flipCoin('member-1', 'relationship-1', {
    memberUserIds: ['member-1', 'member-2'],
    guess: 'tails',
  });
  assert.equal(result.coinFlip.outcome, 'tails');
  assert.equal(result.status.canHaveSex, true);

  const event = await service.createEvent('member-2', 'relationship-1', {
    day: TODAY,
    memberUserIds: ['member-2', 'member-1'],
  });
  const statusAfterEvent = await service.getDailyStatus(
    'member-1',
    'relationship-1',
    ['member-1', 'member-2'],
  );

  assert.deepEqual(event.memberUserIds, ['member-1', 'member-2']);
  assert.equal(event.day, TODAY);
  assert.equal(statusAfterEvent.lastSexEvent?.id, event.id);
  assert.equal(statusAfterEvent.requiresCoinFlip, false);
  assert.equal(statusAfterEvent.canHaveSex, true);
});

test('more than two calendar days since the last event bypasses the flip', async () => {
  const members = ['member-1', 'member-2'];
  const events: StoredSexEvent[] = [
    {
      id: 'sex-event-old',
      relationshipId: 'relationship-1',
      day: '2026-10-26',
      memberSetKey: getMemberSetKey(members),
      memberUserIds: members,
      createdByUserId: 'member-1',
      createdAt: new Date('2026-10-26T12:00:00.000Z'),
    },
  ];
  const { client } = createDb({ events });
  const service = createService(client);

  const status = await service.getDailyStatus(
    'member-1',
    'relationship-1',
    members,
  );
  assert.equal(status.daysSinceLastSex, 3);
  assert.equal(status.requiresCoinFlip, false);
  assert.equal(status.canHaveSex, true);
  await assert.rejects(
    service.flipCoin('member-1', 'relationship-1', {
      memberUserIds: members,
      guess: 'heads',
    }),
    { statusCode: 409 },
  );

  const event = await service.createEvent('member-1', 'relationship-1', {
    day: TODAY,
    memberUserIds: members,
  });
  assert.equal(event.day, TODAY);
});

test('past events within two days of the last session require a matching flip for that day', async () => {
  const memberUserIds = ['member-1', 'member-2'];
  const memberSetKey = getMemberSetKey(memberUserIds);
  const scenarios: {
    previousDay: string;
    flip?: {
      day: string;
      memberUserIds: string[];
      guess: 'heads' | 'tails';
      outcome: 'heads' | 'tails';
    };
    expectedAllowed: boolean;
  }[] = [
    { previousDay: '2026-10-27', expectedAllowed: false },
    {
      previousDay: '2026-10-26',
      flip: {
        day: '2026-10-28',
        memberUserIds,
        guess: 'heads',
        outcome: 'tails',
      },
      expectedAllowed: false,
    },
    {
      previousDay: '2026-10-27',
      flip: {
        day: '2026-10-28',
        memberUserIds,
        guess: 'tails',
        outcome: 'tails',
      },
      expectedAllowed: true,
    },
    {
      previousDay: '2026-10-26',
      flip: {
        day: '2026-10-28',
        memberUserIds,
        guess: 'heads',
        outcome: 'heads',
      },
      expectedAllowed: true,
    },
    {
      previousDay: '2026-10-27',
      flip: {
        day: TODAY,
        memberUserIds,
        guess: 'heads',
        outcome: 'heads',
      },
      expectedAllowed: false,
    },
    {
      previousDay: '2026-10-26',
      flip: {
        day: '2026-10-28',
        memberUserIds: ['member-1', 'member-3'],
        guess: 'heads',
        outcome: 'heads',
      },
      expectedAllowed: false,
    },
  ];

  for (const scenario of scenarios) {
    const { client } = createDb({
      events: [
        {
          id: 'previous-event',
          relationshipId: 'relationship-1',
          day: scenario.previousDay,
          memberSetKey,
          memberUserIds,
          createdByUserId: 'member-1',
          createdAt: new Date(`${scenario.previousDay}T12:00:00.000Z`),
        },
      ],
      coinFlips: scenario.flip
        ? [
            {
              id: 'coin-flip',
              relationshipId: 'relationship-1',
              day: scenario.flip.day,
              memberSetKey: getMemberSetKey(scenario.flip.memberUserIds),
              memberUserIds: scenario.flip.memberUserIds,
              createdByUserId: 'member-1',
              guess: scenario.flip.guess,
              outcome: scenario.flip.outcome,
              createdAt: NOW,
            },
          ]
        : [],
    });
    const service = createService(client);
    const createEvent = service.createEvent('member-1', 'relationship-1', {
      day: '2026-10-28',
      memberUserIds,
    });

    if (scenario.expectedAllowed) {
      const event = await createEvent;
      assert.equal(event.day, '2026-10-28');
    } else {
      await assert.rejects(createEvent, { statusCode: 409 });
    }
  }
});

test('current-day events require permission and past events over two days after the last session do not', async () => {
  const memberUserIds = ['member-1', 'member-2'];
  const { client } = createDb();
  const service = createService(client);

  await assert.rejects(
    service.createEvent('member-1', 'relationship-1', {
      day: TODAY,
      memberUserIds,
    }),
    { statusCode: 409 },
  );

  const previousDay = '2026-10-25';
  const { client: pastClient } = createDb({
    events: [
      {
        id: 'previous-event',
        relationshipId: 'relationship-1',
        day: previousDay,
        memberSetKey: getMemberSetKey(memberUserIds),
        memberUserIds,
        createdByUserId: 'member-1',
        createdAt: new Date(`${previousDay}T12:00:00.000Z`),
      },
    ],
  });
  const pastService = createService(pastClient);
  const pastEvent = await pastService.createEvent(
    'member-1',
    'relationship-1',
    {
      day: '2026-10-28',
      memberUserIds,
    },
  );
  assert.equal(pastEvent.day, '2026-10-28');
});

test('the latest event and coin-flip eligibility are scoped to the selected members', async () => {
  const pairOne = ['member-1', 'member-2'];
  const pairTwo = ['member-1', 'member-3'];
  const { client } = createDb({
    events: [
      {
        id: 'sex-event-pair-one',
        relationshipId: 'relationship-1',
        day: '2026-10-26',
        memberSetKey: getMemberSetKey(pairOne),
        memberUserIds: pairOne,
        createdByUserId: 'member-1',
        createdAt: new Date('2026-10-26T12:00:00.000Z'),
      },
    ],
  });
  const service = createService(client);

  const firstStatus = await service.getDailyStatus(
    'member-1',
    'relationship-1',
    pairOne,
  );
  const secondStatus = await service.getDailyStatus(
    'member-1',
    'relationship-1',
    pairTwo,
  );

  assert.equal(firstStatus.daysSinceLastSex, 3);
  assert.equal(firstStatus.requiresCoinFlip, false);
  assert.equal(secondStatus.lastSexEvent, null);
  assert.equal(secondStatus.requiresCoinFlip, true);
});

test('future dates and invalid calendar dates are rejected', async () => {
  const { client } = createDb();
  const service = createService(client);

  for (const day of ['2026-10-30', '2026-02-30']) {
    await assert.rejects(
      service.createEvent('member-1', 'relationship-1', {
        day,
        memberUserIds: ['member-1', 'member-2'],
      }),
      { statusCode: 400 },
    );
  }
});

test('only active members can access or be selected', async () => {
  const { client } = createDb({
    activeMemberUserIds: ['member-1', 'member-2'],
  });
  const service = createService(client);

  await assert.rejects(
    service.getDailyStatus('inactive-member', 'relationship-1'),
    { statusCode: 403 },
  );
  await assert.rejects(
    service.getDailyStatus('member-1', 'relationship-1', [
      'member-1',
      'inactive-member',
    ]),
    { statusCode: 403 },
  );
  await assert.rejects(
    service.getDailyStatus('member-1', 'relationship-1', ['member-1']),
    { statusCode: 400 },
  );
});

test('concurrent flips recover the already-created relationship-wide flip', async () => {
  const { client, coinFlips } = createDb();
  let randomCalls = 0;
  const service = createService(client, () => {
    randomCalls += 1;
    return randomCalls === 1 ? 0 : 1;
  });
  const input = {
    memberUserIds: ['member-1', 'member-2'],
    guess: 'heads' as const,
  };

  const [first, second] = await Promise.all([
    service.flipCoin('member-1', 'relationship-1', input),
    service.flipCoin('member-2', 'relationship-1', input),
  ]);

  assert.equal(coinFlips.length, 1);
  assert.equal(first.coinFlip.id, second.coinFlip.id);
  assert.equal(first.coinFlip.outcome, second.coinFlip.outcome);
  assert.equal(randomCalls, 2);
});
