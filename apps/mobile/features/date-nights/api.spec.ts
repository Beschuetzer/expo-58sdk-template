import { createDateNightEvent, getDateNightEvents } from './api';

import { getCalendarDateFromDayId } from '@/utils/calendar';

const mockRequestAuthenticatedJson = jest.fn();

jest.mock('@/features/auth/authenticatedClient', () => ({
  requestAuthenticatedJson: (path: string, init?: RequestInit) =>
    mockRequestAuthenticatedJson(path, init),
}));

describe('date-night calendar API', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 3, 12));
    mockRequestAuthenticatedJson.mockResolvedValue({ data: undefined });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('fetches all cursor pages and converts date bounds for the local calendar', async () => {
    const firstEvent = {
      createdAt: '2026-10-26T12:00:00.000Z',
      createdByUserId: 'member-1',
      day: '2026-10-26',
      id: 'date-night-1',
      relationshipId: 'relationship-1',
    };
    const secondEvent = {
      ...firstEvent,
      day: '2026-10-28',
      id: 'date-night-2',
    };
    mockRequestAuthenticatedJson
      .mockResolvedValueOnce({
        data: {
          earliestEventDayId: '2026-09-30',
          latestEventDayId: '2026-10-28',
          items: [firstEvent],
          nextCursor: 'date-night-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          earliestEventDayId: '2026-09-30',
          latestEventDayId: '2026-10-28',
          items: [secondEvent],
        },
      });

    await expect(
      getDateNightEvents('relationship-1', '2026-10'),
    ).resolves.toEqual({
      earliestDate: getCalendarDateFromDayId('2026-09-30').toISOString(),
      latestDate: getCalendarDateFromDayId('2026-10-28').toISOString(),
      entries: [firstEvent, secondEvent],
    });
    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      [
        '/api/v1/relationships/relationship-1/date-nights/events?limit=100&month=2026-10',
        {},
      ],
      [
        '/api/v1/relationships/relationship-1/date-nights/events?limit=100&month=2026-10&cursor=date-night-1',
        {},
      ],
    ]);
  });

  it('posts an optional description with the device-local date-night record', async () => {
    await createDateNightEvent('relationship-1', {
      day: '2026-11-02',
      description: 'Dinner and a movie',
    });

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationships/relationship-1/date-nights/events',
      {
        method: 'POST',
        body: JSON.stringify({
          day: '2026-11-02',
          description: 'Dinner and a movie',
          today: '2026-11-03',
        }),
      },
    );

    await createDateNightEvent('relationship-1', { day: '2026-11-03' });
    expect(mockRequestAuthenticatedJson).toHaveBeenLastCalledWith(
      '/api/v1/relationships/relationship-1/date-nights/events',
      {
        method: 'POST',
        body: JSON.stringify({
          day: '2026-11-03',
          today: '2026-11-03',
        }),
      },
    );
  });
});
