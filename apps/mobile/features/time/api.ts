import type {
  CreateMeTimeInput,
  CreateRelationshipTaskInput,
  MeTimeListFilters,
  MeTimeListResponse,
  MeTime,
  RelationshipTask,
  RelationshipTaskListFilters,
  RelationshipTaskListResponse,
  RelationshipTaskStatus,
  UpdateRelationshipTaskInput,
  UpdateMeTimeInput,
} from '@expo-50sdk-template/shared-types';

import { requestAuthenticatedJson } from '@/features/auth/authenticatedClient';
import {
  getAllCalendarPages,
  getCalendarMonthDateRange,
  type CalendarMonthData,
} from '@/utils/calendar';

const ME_TIME_CALENDAR_PAGE_SIZE = 100;
const TASK_CALENDAR_PAGE_SIZE = 100;

export type MeTimeCalendarMonth = {
  earliestStartTime: string | null;
  latestStartTime: string | null;
  entries: MeTime[];
};

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await requestAuthenticatedJson<T>(path, init);
  return data;
}

function buildQuery(filters: MeTimeListFilters | RelationshipTaskListFilters) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function getMeTime(
  relationshipId: string,
  filters: MeTimeListFilters = {},
) {
  return requestJson<MeTimeListResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/me-time${buildQuery(filters)}`,
  );
}

export async function getMeTimeCalendarMonth(
  relationshipId: string,
  month: string,
): Promise<MeTimeCalendarMonth> {
  const [year, monthNumber] = month.split('-').map(Number);
  const filters = {
    startTimeFrom: new Date(year, monthNumber - 1, 1).toISOString(),
    startTimeBefore: new Date(year, monthNumber, 1).toISOString(),
    limit: ME_TIME_CALENDAR_PAGE_SIZE,
  };
  const firstPage = await getMeTime(relationshipId, filters);
  const entries = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const page = await getMeTime(relationshipId, { ...filters, cursor });
    entries.push(...page.items);
    cursor = page.nextCursor;
  }

  return {
    earliestStartTime: firstPage.earliestStartTime ?? null,
    latestStartTime: firstPage.latestStartTime ?? null,
    entries,
  };
}

export function getMeTimeEntry(relationshipId: string, meTimeId: string) {
  return requestJson<MeTime>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/me-time/${encodeURIComponent(meTimeId)}`,
  );
}

export function deleteMeTime(relationshipId: string, meTimeId: string) {
  return requestJson<void>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/me-time/${encodeURIComponent(meTimeId)}`,
    { method: 'DELETE' },
  );
}

export function createMeTime(relationshipId: string, input: CreateMeTimeInput) {
  return requestJson<MeTime>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/me-time`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function updateMeTime(
  relationshipId: string,
  meTimeId: string,
  input: UpdateMeTimeInput,
) {
  return requestJson<MeTime>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/me-time/${encodeURIComponent(meTimeId)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function getRelationshipTasks(
  relationshipId: string,
  filters: RelationshipTaskListFilters = {},
) {
  return requestJson<RelationshipTaskListResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/tasks${buildQuery(filters)}`,
  );
}

export function getRelationshipTaskCalendarMonth(
  relationshipId: string,
  status: RelationshipTaskStatus,
  month: string,
): Promise<CalendarMonthData<RelationshipTask>> {
  const { nextMonth, start } = getCalendarMonthDateRange(month);
  return getAllCalendarPages((cursor) =>
    getRelationshipTasks(relationshipId, {
      cursor,
      dateBefore: nextMonth.toISOString(),
      dateFrom: start.toISOString(),
      limit: TASK_CALENDAR_PAGE_SIZE,
      status,
    }),
  );
}

export function getRelationshipTask(relationshipId: string, taskId: string) {
  return requestJson<RelationshipTask>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/tasks/${encodeURIComponent(taskId)}`,
  );
}

export function deleteRelationshipTask(relationshipId: string, taskId: string) {
  return requestJson<void>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: 'DELETE' },
  );
}

export function createRelationshipTask(
  relationshipId: string,
  input: CreateRelationshipTaskInput,
) {
  return requestJson<RelationshipTask>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/tasks`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function updateRelationshipTask(
  relationshipId: string,
  taskId: string,
  input: UpdateRelationshipTaskInput,
) {
  return requestJson<RelationshipTask>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function completeRelationshipTask(
  relationshipId: string,
  taskId: string,
) {
  return requestJson<RelationshipTask>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/tasks/${encodeURIComponent(taskId)}/complete`,
    { method: 'POST' },
  );
}
