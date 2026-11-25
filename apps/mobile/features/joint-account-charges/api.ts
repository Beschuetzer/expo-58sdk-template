import type {
  CreateJointAccountChargeInput,
  JointAccountCharge,
  JointAccountChargeListFilters,
  JointAccountChargeListResponse,
  MarkAllJointAccountChargesPaidResponse,
  UpdateJointAccountChargeInput,
} from '@expo-50sdk-template/shared-types';

import { requestAuthenticatedJson } from '@/features/auth/authenticatedClient';
import {
  getAllCalendarPages,
  getCalendarMonthDateRange,
  type CalendarMonthData,
} from '@/utils/calendar';

const JOINT_ACCOUNT_CHARGE_CALENDAR_PAGE_SIZE = 100;

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await requestAuthenticatedJson<T>(path, init);
  return data;
}

function buildQuery(filters: JointAccountChargeListFilters) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function getJointAccountCharges(
  relationshipId: string,
  filters: JointAccountChargeListFilters = {},
) {
  return requestJson<JointAccountChargeListResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/joint-account-charges${buildQuery(filters)}`,
  );
}

export function getJointAccountChargeCalendarMonth(
  relationshipId: string,
  month: string,
): Promise<CalendarMonthData<JointAccountCharge>> {
  const { nextMonth, start } = getCalendarMonthDateRange(month);
  return getAllCalendarPages((cursor) =>
    getJointAccountCharges(relationshipId, {
      cursor,
      fromDate: start.toISOString(),
      limit: JOINT_ACCOUNT_CHARGE_CALENDAR_PAGE_SIZE,
      toDate: new Date(nextMonth.getTime() - 1).toISOString(),
    }),
  );
}

export function createJointAccountCharge(
  relationshipId: string,
  input: CreateJointAccountChargeInput,
) {
  return requestJson<JointAccountCharge>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/joint-account-charges`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function getJointAccountCharge(chargeId: string) {
  return requestJson<JointAccountCharge>(
    `/api/v1/joint-account-charges/${encodeURIComponent(chargeId)}`,
  );
}

export function deleteJointAccountCharge(chargeId: string) {
  return requestJson<void>(
    `/api/v1/joint-account-charges/${encodeURIComponent(chargeId)}`,
    { method: 'DELETE' },
  );
}

export function updateJointAccountCharge(
  chargeId: string,
  input: UpdateJointAccountChargeInput,
) {
  return requestJson<JointAccountCharge>(
    `/api/v1/joint-account-charges/${encodeURIComponent(chargeId)}/update`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function markJointAccountChargePaid(chargeId: string) {
  return requestJson<JointAccountCharge>(
    `/api/v1/joint-account-charges/${encodeURIComponent(chargeId)}/mark-paid`,
    { method: 'POST' },
  );
}

export function markAllJointAccountChargesPaid(relationshipId: string) {
  return requestJson<MarkAllJointAccountChargesPaidResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/joint-account-charges/mark-all-paid`,
    { method: 'POST' },
  );
}
