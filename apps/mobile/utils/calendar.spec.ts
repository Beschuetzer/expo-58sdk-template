import {
  getAllCalendarPages,
  getCalendarFirstDayOfWeek,
  getCalendarMonthFromCompleteList,
} from './calendar';

describe('calendar data helpers', () => {
  it.each([
    ['de', 'monday'],
    ['de-DE', 'monday'],
    ['de-AT', 'monday'],
    ['de-CH', 'monday'],
    ['DE', 'monday'],
    ['es-MX', 'monday'],
    ['en', 'sunday'],
    ['en-US', 'sunday'],
  ] as const)('starts %s calendar weeks on %s', (locale, firstDay) => {
    expect(getCalendarFirstDayOfWeek(locale)).toBe(firstDay);
  });

  it('derives month entries and date bounds from a complete paginated list', () => {
    const earliest = { id: 'earliest', date: '2026-09-30T12:00:00.000Z' };
    const inMonth = { id: 'in-month', date: '2026-10-15T12:00:00.000Z' };
    const latest = { id: 'latest', date: '2026-11-01T12:00:00.000Z' };
    const invalid = { id: 'invalid', date: 'not-a-date' };
    const noDate = { id: 'no-date', date: undefined };

    expect(
      getCalendarMonthFromCompleteList(
        {
          pages: [{ items: [latest, inMonth, earliest, invalid, noDate] }],
        },
        '2026-10',
        (entry) => entry.date,
      ),
    ).toEqual({
      earliestDate: earliest.date,
      latestDate: latest.date,
      entries: [inMonth],
    });
  });

  it('does not derive a month while list pagination remains incomplete', () => {
    const getEntryDate = (entry: { date?: string }) => entry.date;

    expect(
      getCalendarMonthFromCompleteList(
        {
          pages: [
            {
              items: [{ id: 'entry', date: '2026-10-15T12:00:00.000Z' }],
              nextCursor: 'next-page',
            },
          ],
        },
        '2026-10',
        (entry) => entry.date,
      ),
    ).toBeUndefined();
    expect(
      getCalendarMonthFromCompleteList(undefined, '2026-10', getEntryDate),
    ).toBeUndefined();
    expect(
      getCalendarMonthFromCompleteList({ pages: [] }, '2026-10', getEntryDate),
    ).toBeUndefined();
  });

  it('fetches all month pages and retains date bounds from the first page', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({
        items: [{ id: 'first' }],
        nextCursor: 'next-page',
        calendarDateBounds: {
          earliestDate: '2026-09-30T12:00:00.000Z',
          latestDate: '2026-11-01T12:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({ items: [{ id: 'second' }] });

    await expect(getAllCalendarPages(fetchPage)).resolves.toEqual({
      earliestDate: '2026-09-30T12:00:00.000Z',
      latestDate: '2026-11-01T12:00:00.000Z',
      entries: [{ id: 'first' }, { id: 'second' }],
    });
    expect(fetchPage.mock.calls).toEqual([[undefined], ['next-page']]);
  });

  it('uses null date bounds when the first page does not include them', async () => {
    const fetchPage = jest.fn().mockResolvedValue({ items: [] });

    await expect(getAllCalendarPages(fetchPage)).resolves.toEqual({
      earliestDate: null,
      latestDate: null,
      entries: [],
    });
  });

  it('rejects calendar pagination that repeats a cursor', async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      items: [],
      nextCursor: 'stuck-cursor',
    });

    await expect(getAllCalendarPages(fetchPage)).rejects.toThrow(
      'Calendar pagination did not advance.',
    );
  });
});
