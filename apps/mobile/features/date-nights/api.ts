import type {
  CreateDateNightEventInput,
  DateNightEvent,
  DateNightEventListResponse,
} from '@expo-50sdk-template/shared-types';

import { requestAuthenticatedJson } from '@/features/auth/authenticatedClient';
import {
  getAllCalendarPages,
  getCalendarDateFromDayId,
  getLocalCalendarDayId,
  type CalendarMonthData,
} from '@/utils/calendar';

const DATE_NIGHT_EVENT_PAGE_SIZE = 100;

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await requestAuthenticatedJson<T>(path, init);
  return data;
}

async function getDateNightEventPage(
  relationshipId: string,
  month: string,
  cursor?: string,
) {
  const search = new URLSearchParams({
    limit: String(DATE_NIGHT_EVENT_PAGE_SIZE),
    month,
  });
  if (cursor) search.set('cursor', cursor);

  return requestJson<DateNightEventListResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/date-nights/events?${search.toString()}`,
  );
}

export function getDateNightEvents(
  relationshipId: string,
  month: string,
): Promise<CalendarMonthData<DateNightEvent>> {
  return getAllCalendarPages(async (cursor) => {
    const page = await getDateNightEventPage(relationshipId, month, cursor);
    return {
      items: page.items,
      nextCursor: page.nextCursor,
      calendarDateBounds: {
        earliestDate: page.earliestEventDayId
          ? getCalendarDateFromDayId(page.earliestEventDayId).toISOString()
          : null,
        latestDate: page.latestEventDayId
          ? getCalendarDateFromDayId(page.latestEventDayId).toISOString()
          : null,
      },
    };
  });
}

export function createDateNightEvent(
  relationshipId: string,
  input: CreateDateNightEventInput,
) {
  return requestJson<DateNightEvent>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/date-nights/events`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        today: getLocalCalendarDayId(new Date()),
      }),
    },
  );
}
