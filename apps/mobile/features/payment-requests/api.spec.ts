import type {
  CreateInvitationInput,
  CreatePaymentRequestInput,
  CreateRelationshipInput,
  DecidePaymentRequestInput,
  DecideRelationshipJoinRequestInput,
  PaymentRequestListFilters,
  RegisterPushTokenInput,
  SubmitPaymentRequestInput,
  UpdatePaymentRequestInput,
  UnregisterPushTokenInput,
} from '@expo-50sdk-template/shared-types';

import * as paymentRequestsApi from './api';

const mockRequestAuthenticatedJson = jest.fn();

jest.mock('@/features/auth/authenticatedClient', () => ({
  requestAuthenticatedJson: (...args: unknown[]) =>
    mockRequestAuthenticatedJson(...args),
}));

const relationshipInput: CreateRelationshipInput = {
  name: 'Shared space',
  displayName: 'Alex',
};
const joinRequestDecision: DecideRelationshipJoinRequestInput = {
  decision: 'approved',
};
const invitationInput: CreateInvitationInput = {
  inviteeEmail: 'alex@example.com',
};
const paymentRequestInput: CreatePaymentRequestInput = {
  title: 'Shared purchase',
  rationale: 'Needed for the household',
  amountMinorUnits: 1200,
  currency: 'USD',
  purchaseDate: '2025-01-01T00:00:00.000Z',
  requestedSplit: [{ memberUserId: 'user-1', percentage: 100 }],
};
const paymentRequestUpdateInput: UpdatePaymentRequestInput = {
  ...paymentRequestInput,
  title: 'Updated shared purchase',
};
const submitInput: SubmitPaymentRequestInput = {
  evaluation: { answers: { 'question-1': true } },
};
const paymentDecision: DecidePaymentRequestInput = {
  decision: 'approved',
  comment: 'Looks good',
};
const pushTokenInput: RegisterPushTokenInput = {
  token: 'push-token',
  platform: 'ios',
};
const unregisterPushTokenInput: UnregisterPushTokenInput = {
  token: 'push-token',
};
const responseData = { result: 'ok' };
const abortController = new AbortController();

type ApiCall = {
  name: string;
  call: () => Promise<unknown>;
  path: string;
  init?: RequestInit;
  expectedData: unknown;
};

const apiCalls: ApiCall[] = [
  {
    name: 'getRelationships',
    call: () => paymentRequestsApi.getRelationships(),
    path: '/api/v1/relationships',
    expectedData: responseData,
  },
  {
    name: 'searchRelationships',
    call: () => paymentRequestsApi.searchRelationships('shared space & more'),
    path: '/api/v1/relationships/search?q=shared%20space%20%26%20more',
    expectedData: responseData,
  },
  {
    name: 'createRelationship',
    call: () => paymentRequestsApi.createRelationship(relationshipInput),
    path: '/api/v1/relationships',
    init: { method: 'POST', body: JSON.stringify(relationshipInput) },
    expectedData: responseData,
  },
  {
    name: 'getRelationshipMembers',
    call: () => paymentRequestsApi.getRelationshipMembers('relationship-1'),
    path: '/api/v1/relationships/relationship-1/members',
    expectedData: responseData,
  },
  {
    name: 'requestToJoinRelationship without a display name',
    call: () => paymentRequestsApi.requestToJoinRelationship('relationship-1'),
    path: '/api/v1/relationships/relationship-1/join-requests',
    init: { method: 'POST', body: '{}' },
    expectedData: responseData,
  },
  {
    name: 'getRelationshipJoinRequests',
    call: () =>
      paymentRequestsApi.getRelationshipJoinRequests('relationship-1'),
    path: '/api/v1/relationships/relationship-1/join-requests',
    expectedData: responseData,
  },
  {
    name: 'getRelationshipJoinRequest encodes path segments',
    call: () =>
      paymentRequestsApi.getRelationshipJoinRequest(
        'relationship /1',
        'request?2',
      ),
    path: '/api/v1/relationships/relationship%20%2F1/join-requests/request%3F2',
    expectedData: responseData,
  },
  {
    name: 'decideRelationshipJoinRequest',
    call: () =>
      paymentRequestsApi.decideRelationshipJoinRequest(
        'relationship-1',
        'join-request-1',
        joinRequestDecision,
      ),
    path: '/api/v1/relationships/relationship-1/join-requests/join-request-1/decision',
    init: {
      method: 'POST',
      body: JSON.stringify(joinRequestDecision),
    },
    expectedData: responseData,
  },
  {
    name: 'createRelationshipInvitation with default input',
    call: () =>
      paymentRequestsApi.createRelationshipInvitation('relationship-1'),
    path: '/api/v1/relationships/relationship-1/invitations',
    init: { method: 'POST', body: '{}' },
    expectedData: responseData,
  },
  {
    name: 'getInvitationPreview encodes the token',
    call: () => paymentRequestsApi.getInvitationPreview('token/with space'),
    path: '/api/v1/invitations/token%2Fwith%20space',
    expectedData: responseData,
  },
  {
    name: 'acceptInvitation without a display name',
    call: () => paymentRequestsApi.acceptInvitation('invitation-token'),
    path: '/api/v1/invitations/invitation-token/accept',
    init: { method: 'POST', body: '{}' },
    expectedData: responseData,
  },
  {
    name: 'revokeInvitation encodes its ID',
    call: () => paymentRequestsApi.revokeInvitation('invitation/1'),
    path: '/api/v1/invitations/invitation%2F1/revoke',
    init: { method: 'POST' },
    expectedData: undefined,
  },
  {
    name: 'getRelationshipRubric',
    call: () => paymentRequestsApi.getRelationshipRubric('relationship-1'),
    path: '/api/v1/relationships/relationship-1/rubric',
    expectedData: responseData,
  },
  {
    name: 'createPaymentRequest',
    call: () =>
      paymentRequestsApi.createPaymentRequest(
        'relationship-1',
        paymentRequestInput,
      ),
    path: '/api/v1/relationships/relationship-1/payment-requests',
    init: { method: 'POST', body: JSON.stringify(paymentRequestInput) },
    expectedData: responseData,
  },
  {
    name: 'getPaymentRequest',
    call: () => paymentRequestsApi.getPaymentRequest('request-1'),
    path: '/api/v1/payment-requests/request-1',
    expectedData: responseData,
  },
  {
    name: 'updatePaymentRequest',
    call: () =>
      paymentRequestsApi.updatePaymentRequest(
        'request-1',
        paymentRequestUpdateInput,
      ),
    path: '/api/v1/payment-requests/request-1',
    init: {
      method: 'PUT',
      body: JSON.stringify(paymentRequestUpdateInput),
    },
    expectedData: responseData,
  },
  {
    name: 'submitPaymentRequest',
    call: () =>
      paymentRequestsApi.submitPaymentRequest('request-1', submitInput),
    path: '/api/v1/payment-requests/request-1/submit',
    init: { method: 'POST', body: JSON.stringify(submitInput) },
    expectedData: responseData,
  },
  {
    name: 'decidePaymentRequest',
    call: () =>
      paymentRequestsApi.decidePaymentRequest('request-1', paymentDecision),
    path: '/api/v1/payment-requests/request-1/decisions',
    init: { method: 'POST', body: JSON.stringify(paymentDecision) },
    expectedData: responseData,
  },
  {
    name: 'cancelPaymentRequest',
    call: () => paymentRequestsApi.cancelPaymentRequest('request-1'),
    path: '/api/v1/payment-requests/request-1/cancel',
    init: { method: 'POST' },
    expectedData: responseData,
  },
  {
    name: 'getNotifications',
    call: () => paymentRequestsApi.getNotifications(),
    path: '/api/v1/notifications',
    expectedData: responseData,
  },
  {
    name: 'markNotificationRead',
    call: () => paymentRequestsApi.markNotificationRead('notification-1'),
    path: '/api/v1/notifications/notification-1/read',
    init: { method: 'POST' },
    expectedData: undefined,
  },
  {
    name: 'completeNotification',
    call: () => paymentRequestsApi.completeNotification('notification-1'),
    path: '/api/v1/notifications/notification-1/complete',
    init: { method: 'POST' },
    expectedData: undefined,
  },
  {
    name: 'registerPushToken forwards the abort signal',
    call: () =>
      paymentRequestsApi.registerPushToken(
        pushTokenInput,
        abortController.signal,
      ),
    path: '/api/v1/notifications/push-tokens',
    init: {
      method: 'POST',
      body: JSON.stringify(pushTokenInput),
      signal: abortController.signal,
    },
    expectedData: undefined,
  },
  {
    name: 'unregisterPushToken',
    call: () =>
      paymentRequestsApi.unregisterPushToken(unregisterPushTokenInput),
    path: '/api/v1/notifications/push-tokens/unregister',
    init: {
      method: 'POST',
      body: JSON.stringify(unregisterPushTokenInput),
    },
    expectedData: undefined,
  },
];

describe('payment request API wrappers', () => {
  beforeEach(() => {
    mockRequestAuthenticatedJson.mockReset();
  });

  it.each(apiCalls)(
    'forwards the request and returns data for $name',
    async ({ call, path, init, expectedData }) => {
      mockRequestAuthenticatedJson.mockResolvedValue({ data: expectedData });

      await expect(call()).resolves.toBe(expectedData);

      expect(mockRequestAuthenticatedJson).toHaveBeenCalledTimes(1);
      expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
        path,
        init ?? {},
      );
    },
  );

  it('serializes scalar and repeated filters while omitting undefined values', async () => {
    const filters: PaymentRequestListFilters = {
      status: 'pending_approval',
      awaitingMyDecision: false,
      categories: ['Household', 'Dining out'],
      fromDate: '2025-01-01',
      toDate: '2025-01-31',
      cursor: undefined,
      limit: 0,
    };
    mockRequestAuthenticatedJson.mockResolvedValue({ data: responseData });

    await paymentRequestsApi.getPaymentRequests('relationship-1', filters);

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationships/relationship-1/payment-requests?status=pending_approval&awaitingMyDecision=false&categories=Household&categories=Dining+out&fromDate=2025-01-01&toDate=2025-01-31&limit=0',
      {},
    );
  });

  it('omits the query string when filters produce no parameters', async () => {
    const filters: PaymentRequestListFilters = {
      categories: [],
      cursor: undefined,
    };
    mockRequestAuthenticatedJson.mockResolvedValue({ data: responseData });

    await paymentRequestsApi.getPaymentRequests('relationship-1', filters);

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationships/relationship-1/payment-requests',
      {},
    );
  });

  it('fetches every payment-request page for a calendar month', async () => {
    const firstRequest = {
      id: 'request-1',
      relationshipId: 'relationship-1',
      createdByUserId: 'user-1',
      title: 'First request',
      amountMinorUnits: 1200,
      currency: 'USD',
      purchaseDate: '2026-10-15T12:00:00.000Z',
      categories: [],
      status: 'approved',
      createdAt: '2026-10-15T12:00:00.000Z',
      updatedAt: '2026-10-15T12:00:00.000Z',
    };
    const secondRequest = {
      ...firstRequest,
      id: 'request-2',
      purchaseDate: '2026-10-20T12:00:00.000Z',
    };
    mockRequestAuthenticatedJson
      .mockResolvedValueOnce({
        data: {
          calendarDateBounds: {
            earliestDate: '2026-09-30T12:00:00.000Z',
            latestDate: '2026-11-02T12:00:00.000Z',
          },
          items: [firstRequest],
          nextCursor: 'request-1',
        },
      })
      .mockResolvedValueOnce({ data: { items: [secondRequest] } });

    await expect(
      paymentRequestsApi.getPaymentRequestCalendarMonth(
        'relationship-1',
        '2026-10',
      ),
    ).resolves.toEqual({
      earliestDate: '2026-09-30T12:00:00.000Z',
      latestDate: '2026-11-02T12:00:00.000Z',
      entries: [firstRequest, secondRequest],
    });

    const filters = new URLSearchParams({
      fromDate: new Date(2026, 9, 1).toISOString(),
      limit: '100',
      toDate: new Date(new Date(2026, 10, 1).getTime() - 1).toISOString(),
    }).toString();
    const listPath = '/api/v1/relationships/relationship-1/payment-requests';
    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      [`${listPath}?${filters}`, {}],
      [`${listPath}?cursor=request-1&${filters}`, {}],
    ]);
  });

  it('serializes an invitation email when provided', async () => {
    mockRequestAuthenticatedJson.mockResolvedValue({ data: responseData });

    await paymentRequestsApi.createRelationshipInvitation(
      'relationship-1',
      invitationInput,
    );

    expect(mockRequestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/relationships/relationship-1/invitations',
      { method: 'POST', body: JSON.stringify(invitationInput) },
    );
  });

  it('propagates authenticated request failures', async () => {
    const error = new Error('Authentication failed');
    mockRequestAuthenticatedJson.mockRejectedValue(error);

    await expect(
      paymentRequestsApi.getPaymentRequests('relationship-1'),
    ).rejects.toBe(error);
  });
});
