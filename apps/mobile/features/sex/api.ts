import type {
  CreateSexEventInput,
  FlipSexCoinInput,
  FlipSexCoinResponse,
  SexDailyStatus,
  SexEvent,
  SexEventListResponse,
} from '@expo-50sdk-template/shared-types';
import { format } from 'date-fns';

import { requestAuthenticatedJson } from '@/features/auth/authenticatedClient';

const SEX_EVENT_PAGE_SIZE = 100;

export type SexEventCalendarMonth = {
  earliestEventDayId: string | null;
  events: SexEvent[];
};

export function getLocalDayKey(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await requestAuthenticatedJson<T>(path, init);
  return data;
}

function buildMemberQuery(memberUserIds: string[], today: string) {
  const search = new URLSearchParams({ today });
  memberUserIds.forEach((userId) => search.append('memberUserIds', userId));
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function getSexDailyStatus(
  relationshipId: string,
  memberUserIds: string[],
  today = getLocalDayKey(),
) {
  return requestJson<SexDailyStatus>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/sex/status${buildMemberQuery(memberUserIds, today)}`,
  );
}

async function getSexEventPage(
  relationshipId: string,
  month: string,
  cursor?: string,
) {
  const search = new URLSearchParams({
    limit: String(SEX_EVENT_PAGE_SIZE),
    month,
  });
  if (cursor) search.set('cursor', cursor);

  return requestJson<SexEventListResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/sex/events?${search.toString()}`,
  );
}

export async function getSexEvents(
  relationshipId: string,
  month: string,
): Promise<SexEventCalendarMonth> {
  const firstPage = await getSexEventPage(relationshipId, month);
  const events = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const page = await getSexEventPage(relationshipId, month, cursor);
    events.push(...page.items);
    cursor = page.nextCursor;
  }

  return {
    earliestEventDayId: firstPage.earliestEventDayId,
    events,
  };
}

export function flipSexCoin(relationshipId: string, input: FlipSexCoinInput) {
  return requestJson<FlipSexCoinResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/sex/coin-flips`,
    {
      method: 'POST',
      body: JSON.stringify({ ...input, today: getLocalDayKey() }),
    },
  );
}

export function resetTodaySexCoinFlip(relationshipId: string) {
  return requestJson<void>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/sex/coin-flips/today?today=${encodeURIComponent(getLocalDayKey())}`,
    { method: 'DELETE' },
  );
}

export function createSexEvent(
  relationshipId: string,
  input: CreateSexEventInput,
) {
  return requestJson<SexEvent>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/sex/events`,
    {
      method: 'POST',
      body: JSON.stringify({ ...input, today: getLocalDayKey() }),
    },
  );
}
