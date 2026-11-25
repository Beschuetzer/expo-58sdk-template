import type { CalendarDateBounds } from '@expo-50sdk-template/shared-types';

export type CalendarMonthData<T> = CalendarDateBounds & {
  entries: T[];
};

export type CalendarPage<T> = {
  items: T[];
  nextCursor?: string;
  calendarDateBounds?: CalendarDateBounds;
};

export function getLocalCalendarDayId(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCalendarMonthStartDayId(dayId: string) {
  return `${dayId.slice(0, 7)}-01`;
}

export function getCurrentCalendarMonthId() {
  return getCalendarMonthStartDayId(getLocalCalendarDayId(new Date()));
}

export function getCalendarMonthDateRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    nextMonth: new Date(year, monthNumber, 1),
  };
}

export function getCalendarDateFromDayId(dayId: string) {
  const [year, month, day] = dayId.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function shiftCalendarMonth(monthId: string, offset: number) {
  const [year, month] = monthId.split('-').map(Number);
  return getLocalCalendarDayId(new Date(year, month - 1 + offset, 1, 12));
}

export function formatCalendarMonth(monthId: string, locale: string) {
  const [year, month] = monthId.split('-').map(Number);
  return new Date(year, month - 1, 1, 12).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatCalendarDay(dayId: string, locale: string) {
  return getCalendarDateFromDayId(dayId).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  });
}

export function getCalendarFirstDayOfWeek(locale: string): 'monday' | 'sunday' {
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return language === 'de' || language === 'es' ? 'monday' : 'sunday';
}

export function getCalendarMonthFromCompleteList<T>(
  listData: { pages: readonly CalendarPage<T>[] } | undefined,
  month: string,
  getEntryDate: (entry: T) => string | undefined,
): CalendarMonthData<T> | undefined {
  const pages = listData?.pages;
  const lastPage = pages?.[pages.length - 1];
  if (!pages?.length || lastPage?.nextCursor) return undefined;

  const [year, monthNumber] = month.split('-').map(Number);
  const monthStartTime = new Date(year, monthNumber - 1, 1).getTime();
  const nextMonthStartTime = new Date(year, monthNumber, 1).getTime();
  let earliestDate: string | null = null;
  let earliestTimestamp = Number.POSITIVE_INFINITY;
  let latestDate: string | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;
  const entries: T[] = [];

  for (const entry of pages.flatMap((page) => page.items)) {
    const date = getEntryDate(entry);
    if (!date) continue;

    const timestamp = new Date(date).getTime();
    if (!Number.isFinite(timestamp)) continue;
    if (timestamp < earliestTimestamp) {
      earliestTimestamp = timestamp;
      earliestDate = date;
    }
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      latestDate = date;
    }
    if (timestamp >= monthStartTime && timestamp < nextMonthStartTime) {
      entries.push(entry);
    }
  }

  return { earliestDate, latestDate, entries };
}

export async function getAllCalendarPages<T>(
  fetchPage: (cursor?: string) => Promise<CalendarPage<T>>,
): Promise<CalendarMonthData<T>> {
  const firstPage = await fetchPage();
  const entries = [...firstPage.items];
  const seenCursors = new Set<string>();
  let cursor = firstPage.nextCursor;

  while (cursor) {
    if (seenCursors.has(cursor)) {
      throw new Error('Calendar pagination did not advance.');
    }
    seenCursors.add(cursor);
    const page = await fetchPage(cursor);
    entries.push(...page.items);
    cursor = page.nextCursor;
  }

  return {
    earliestDate: firstPage.calendarDateBounds?.earliestDate ?? null,
    latestDate: firstPage.calendarDateBounds?.latestDate ?? null,
    entries,
  };
}
