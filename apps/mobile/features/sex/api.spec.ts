import {
  createSexEvent,
  flipSexCoin,
  getLocalDayKey,
  getSexDailyStatus,
  getSexEvents,
  resetTodaySexCoinFlip,
} from './api';

const mockRequestAuthenticatedJson = jest.fn();

jest.mock('@/features/auth/authenticatedClient', () => ({
  requestAuthenticatedJson: (path: string, init?: RequestInit) =>
    mockRequestAuthenticatedJson(path, init),
}));

describe('sex API local calendar dates', () => {
  beforeEach(() => {
    const todayAtLocalNoon = new Date(2026, 10, 3, 12);
    jest.useFakeTimers().setSystemTime(todayAtLocalNoon);
    mockRequestAuthenticatedJson.mockResolvedValue({ data: undefined });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('fetches all cursor pages for one calendar month', async () => {
    const firstEvent = {
      createdAt: '2026-10-26T12:00:00.000Z',
      createdByUserId: 'member-1',
      day: '2026-10-26',
      id: 'sex-event-1',
      memberUserIds: ['member-1', 'member-2'],
      relationshipId: 'relationship-1',
    };
    const secondEvent = {
      ...firstEvent,
      day: '2026-10-28',
      id: 'sex-event-2',
    };
    mockRequestAuthenticatedJson
      .mockResolvedValueOnce({
        data: {
          earliestEventDayId: '2026-09-30',
          items: [firstEvent],
          nextCursor: 'sex-event-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          earliestEventDayId: '2026-09-30',
          items: [secondEvent],
        },
      });

    await expect(getSexEvents('relationship-1', '2026-10')).resolves.toEqual({
      earliestEventDayId: '2026-09-30',
      events: [firstEvent, secondEvent],
    });
    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      [
        '/api/v1/relationships/relationship-1/sex/events?limit=100&month=2026-10',
        {},
      ],
      [
        '/api/v1/relationships/relationship-1/sex/events?limit=100&month=2026-10&cursor=sex-event-1',
        {},
      ],
    ]);
  });

  it('uses the device-local date for status and sex mutations', async () => {
    const today = '2026-11-03';
    const relationshipId = 'relationship-1';
    const memberUserIds = ['member-1', 'member-2'];

    expect(getLocalDayKey()).toBe(today);

    await getSexDailyStatus(relationshipId, memberUserIds);
    expect(mockRequestAuthenticatedJson).toHaveBeenLastCalledWith(
      `/api/v1/relationships/${relationshipId}/sex/status?today=${today}&memberUserIds=member-1&memberUserIds=member-2`,
      {},
    );

    await flipSexCoin(relationshipId, {
      guess: 'heads',
      memberUserIds,
    });
    expect(mockRequestAuthenticatedJson).toHaveBeenLastCalledWith(
      `/api/v1/relationships/${relationshipId}/sex/coin-flips`,
      {
        method: 'POST',
        body: JSON.stringify({ guess: 'heads', memberUserIds, today }),
      },
    );

    await createSexEvent(relationshipId, { day: today, memberUserIds });
    expect(mockRequestAuthenticatedJson).toHaveBeenLastCalledWith(
      `/api/v1/relationships/${relationshipId}/sex/events`,
      {
        method: 'POST',
        body: JSON.stringify({ day: today, memberUserIds, today }),
      },
    );

    await resetTodaySexCoinFlip(relationshipId);
    expect(mockRequestAuthenticatedJson).toHaveBeenLastCalledWith(
      `/api/v1/relationships/${relationshipId}/sex/coin-flips/today?today=${today}`,
      { method: 'DELETE' },
    );
  });
});
