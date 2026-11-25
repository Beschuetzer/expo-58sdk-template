import type {
  AcceptInvitationResponse,
  CreateInvitationInput,
  CreateInvitationResponse,
  CreatePaymentRequestInput,
  CreateRelationshipInput,
  DecideRelationshipJoinRequestInput,
  DecidePaymentRequestInput,
  NotificationListResponse,
  PaymentRequest,
  PaymentRequestListFilters,
  PaymentRequestListResponse,
  PaymentRequestSummary,
  RelationshipMember,
  RelationshipJoinRequest,
  RelationshipSearchResult,
  RelationshipSummary,
  RubricVersion,
  RegisterPushTokenInput,
  UnregisterPushTokenInput,
  InvitationPreview,
  SubmitPaymentRequestInput,
  UpdatePaymentRequestInput,
} from '@expo-50sdk-template/shared-types';

import { requestAuthenticatedJson } from '@/features/auth/authenticatedClient';
import {
  getAllCalendarPages,
  getCalendarMonthDateRange,
  type CalendarMonthData,
} from '@/utils/calendar';

const PAYMENT_REQUEST_CALENDAR_PAGE_SIZE = 100;

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await requestAuthenticatedJson<T>(path, init);
  return data;
}

export function getRelationships() {
  return requestJson<RelationshipSummary[]>('/api/v1/relationships');
}

export function searchRelationships(query: string) {
  return requestJson<RelationshipSearchResult[]>(
    `/api/v1/relationships/search?q=${encodeURIComponent(query)}`,
  );
}

export function createRelationship(input: CreateRelationshipInput) {
  return requestJson<RelationshipSummary>('/api/v1/relationships', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteRelationship(relationshipId: string) {
  return requestJson<void>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}`,
    { method: 'DELETE' },
  );
}

export function getRelationshipMembers(relationshipId: string) {
  return requestJson<RelationshipMember[]>(
    `/api/v1/relationships/${relationshipId}/members`,
  );
}

export function requestToJoinRelationship(
  relationshipId: string,
  displayName?: string,
) {
  return requestJson<RelationshipJoinRequest>(
    `/api/v1/relationships/${relationshipId}/join-requests`,
    {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    },
  );
}

export function getRelationshipJoinRequests(relationshipId: string) {
  return requestJson<RelationshipJoinRequest[]>(
    `/api/v1/relationships/${relationshipId}/join-requests`,
  );
}

export function getRelationshipJoinRequest(
  relationshipId: string,
  requestId: string,
) {
  return requestJson<RelationshipJoinRequest>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/join-requests/${encodeURIComponent(requestId)}`,
  );
}

export function deleteRelationshipJoinRequest(
  relationshipId: string,
  requestId: string,
) {
  return requestJson<void>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/join-requests/${encodeURIComponent(requestId)}`,
    { method: 'DELETE' },
  );
}

export function decideRelationshipJoinRequest(
  relationshipId: string,
  requestId: string,
  input: DecideRelationshipJoinRequestInput,
) {
  return requestJson<RelationshipJoinRequest>(
    `/api/v1/relationships/${relationshipId}/join-requests/${requestId}/decision`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function createRelationshipInvitation(
  relationshipId: string,
  input: CreateInvitationInput = {},
) {
  return requestJson<CreateInvitationResponse>(
    `/api/v1/relationships/${relationshipId}/invitations`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function getInvitationPreview(token: string) {
  return requestJson<InvitationPreview>(
    `/api/v1/invitations/${encodeURIComponent(token)}`,
  );
}

export function acceptInvitation(token: string, displayName?: string) {
  return requestJson<AcceptInvitationResponse>(
    `/api/v1/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST', body: JSON.stringify({ displayName }) },
  );
}

export function revokeInvitation(invitationId: string) {
  return requestJson<void>(
    `/api/v1/invitations/${encodeURIComponent(invitationId)}/revoke`,
    { method: 'POST' },
  );
}

export function getRelationshipRubric(relationshipId: string) {
  return requestJson<RubricVersion>(
    `/api/v1/relationships/${relationshipId}/rubric`,
  );
}

export function getPaymentRequests(
  relationshipId: string,
  filters: PaymentRequestListFilters = {},
) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return requestJson<PaymentRequestListResponse>(
    `/api/v1/relationships/${relationshipId}/payment-requests${query ? `?${query}` : ''}`,
  );
}

export function getPaymentRequestCalendarMonth(
  relationshipId: string,
  month: string,
): Promise<CalendarMonthData<PaymentRequestSummary>> {
  const { nextMonth, start } = getCalendarMonthDateRange(month);
  return getAllCalendarPages((cursor) =>
    getPaymentRequests(relationshipId, {
      cursor,
      fromDate: start.toISOString(),
      limit: PAYMENT_REQUEST_CALENDAR_PAGE_SIZE,
      toDate: new Date(nextMonth.getTime() - 1).toISOString(),
    }),
  );
}

export function createPaymentRequest(
  relationshipId: string,
  input: CreatePaymentRequestInput,
) {
  return requestJson<PaymentRequest>(
    `/api/v1/relationships/${relationshipId}/payment-requests`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function getPaymentRequest(paymentRequestId: string) {
  return requestJson<PaymentRequest>(
    `/api/v1/payment-requests/${paymentRequestId}`,
  );
}

export function updatePaymentRequest(
  paymentRequestId: string,
  input: UpdatePaymentRequestInput,
) {
  return requestJson<PaymentRequest>(
    `/api/v1/payment-requests/${encodeURIComponent(paymentRequestId)}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
}

export function submitPaymentRequest(
  paymentRequestId: string,
  input: SubmitPaymentRequestInput,
) {
  return requestJson<PaymentRequest>(
    `/api/v1/payment-requests/${paymentRequestId}/submit`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function decidePaymentRequest(
  paymentRequestId: string,
  input: DecidePaymentRequestInput,
) {
  return requestJson<PaymentRequest>(
    `/api/v1/payment-requests/${paymentRequestId}/decisions`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function cancelPaymentRequest(paymentRequestId: string) {
  return requestJson<PaymentRequest>(
    `/api/v1/payment-requests/${paymentRequestId}/cancel`,
    { method: 'POST' },
  );
}

export function deletePaymentRequest(paymentRequestId: string) {
  return requestJson<void>(
    `/api/v1/payment-requests/${encodeURIComponent(paymentRequestId)}`,
    { method: 'DELETE' },
  );
}

export function getNotifications() {
  return requestJson<NotificationListResponse>('/api/v1/notifications');
}

export function markNotificationRead(notificationId: string) {
  return requestJson<void>(`/api/v1/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export function completeNotification(notificationId: string) {
  return requestJson<void>(`/api/v1/notifications/${notificationId}/complete`, {
    method: 'POST',
  });
}

export function registerPushToken(
  input: RegisterPushTokenInput,
  signal?: AbortSignal,
) {
  return requestJson<void>('/api/v1/notifications/push-tokens', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
}

export function unregisterPushToken(input: UnregisterPushTokenInput) {
  return requestJson<void>('/api/v1/notifications/push-tokens/unregister', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
