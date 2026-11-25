import type { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import {
  PrismaPaymentRequestService,
  type PaymentRequestService,
} from './service';
import { createApp } from '../../app';
import { loadConfig } from '../../config/env';

function startServer(
  service: PaymentRequestService,
  scope = 'relationships:read relationships:create relationships:invite relationships:accept-invite payment-requests:read payment-requests:write',
  claims: Record<string, unknown> = {},
) {
  const authenticated: RequestHandler = (request, _response, next) => {
    request.auth = {
      header: {},
      payload: {
        scope,
        sub: 'user-123',
        ...claims,
      },
      token: 'test-token',
    };
    next();
  };
  const server = createServer(
    createApp(loadConfig({}), {
      authMiddleware: authenticated,
      paymentRequestService: service,
    }),
  );
  return new Promise<ReturnType<typeof createServer>>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function call(
  server: ReturnType<typeof createServer>,
  method: string,
  path: string,
  body?: unknown,
) {
  const address = server.address();
  assert(address && typeof address !== 'string');
  return new Promise<{ body: unknown; statusCode: number }>(
    (resolve, reject) => {
      const response = request(
        {
          headers:
            body === undefined ? {} : { 'content-type': 'application/json' },
          hostname: '127.0.0.1',
          method,
          path,
          port: address.port,
        },
        (incomingResponse) => {
          let responseBody = '';
          incomingResponse.setEncoding('utf8');
          incomingResponse.on('data', (chunk) => (responseBody += chunk));
          incomingResponse.on('end', () => {
            resolve({
              body: responseBody ? JSON.parse(responseBody) : undefined,
              statusCode: incomingResponse.statusCode ?? 0,
            });
          });
        },
      );
      response.on('error', reject);
      if (body !== undefined) response.end(JSON.stringify(body));
      else response.end();
    },
  );
}

test('relationship routes use the authenticated subject', async (t) => {
  let receivedUserId: string | undefined;
  const service = {
    listRelationships: async (userId: string) => {
      receivedUserId = userId;
      return [];
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(server, 'GET', '/api/v1/relationships');

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, []);
  assert.equal(receivedUserId, 'user-123');
});

test('relationship search forwards the authenticated subject and query', async (t) => {
  let received: { userId?: string; query?: string } = {};
  const service = {
    searchRelationships: async (userId: string, query: string) => {
      received = { userId, query };
      return [];
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/search?q=Our%20space',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, { userId: 'user-123', query: 'Our space' });
});

test('relationship search includes the owner identity and display name', async () => {
  const db = {
    relationship: {
      findMany: async () => [
        {
          id: 'relationship-1',
          name: 'Shared space',
          shareCode: 'SHARED1',
          createdAt: new Date('2026-10-24T00:00:00.000Z'),
          members: [
            { userId: 'member-1', displayName: 'Sam', role: 'member' },
            { userId: 'owner-1', displayName: 'Alex', role: 'owner' },
          ],
          joinRequests: [],
        },
        {
          id: 'relationship-2',
          name: 'Shared home',
          shareCode: 'SHARED2',
          createdAt: new Date('2026-10-23T00:00:00.000Z'),
          members: [{ userId: 'owner-2', displayName: null, role: 'owner' }],
          joinRequests: [],
        },
      ],
    },
  } as unknown as PrismaClient;
  const service = new PrismaPaymentRequestService(db);

  const results = await service.searchRelationships('searcher-1', 'Shared');

  assert.deepEqual(
    results.map((result) => result.owner),
    [
      { userId: 'owner-1', displayName: 'Alex' },
      { userId: 'owner-2', displayName: null },
    ],
  );
});

test('join requests forward the authenticated display name', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    displayName?: string;
  } = {};
  const service = {
    requestToJoin: async (
      userId: string,
      relationshipId: string,
      displayName?: string,
    ) => {
      received = { userId, relationshipId, displayName };
      return {};
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service, undefined, { name: 'Alex' });
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/join-requests',
    {},
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    displayName: 'Alex',
  });
});

test('join request detail routes forward both route identifiers', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    requestId?: string;
  } = {};
  const service = {
    getJoinRequest: async (
      userId: string,
      relationshipId: string,
      requestId: string,
    ) => {
      received = { userId, relationshipId, requestId };
      return { id: requestId };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/join-requests/request-1',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    requestId: 'request-1',
  });
});

test('join request decisions validate and forward their route identifiers', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    requestId?: string;
    decision?: string;
  } = {};
  const service = {
    decideJoinRequest: async (
      userId: string,
      relationshipId: string,
      requestId: string,
      input: { decision: string },
    ) => {
      received = {
        userId,
        relationshipId,
        requestId,
        decision: input.decision,
      };
      return {};
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/join-requests/request-1/decision',
    { decision: 'approved' },
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    requestId: 'request-1',
    decision: 'approved',
  });
});

test('request list query values are validated and transformed', async (t) => {
  let receivedFilters: unknown;
  const service = {
    listPaymentRequests: async (
      _userId: string,
      _relationshipId: string,
      filters: unknown,
    ) => {
      receivedFilters = filters;
      return { items: [] };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/payment-requests?awaitingMyDecision=true&limit=10&categories=Household&categories=Groceries&fromDate=2026-10-01T00%3A00%3A00.000Z&toDate=2026-10-31T23%3A59%3A59.999Z',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(receivedFilters, {
    awaitingMyDecision: true,
    categories: ['Household', 'Groceries'],
    limit: 10,
    fromDate: '2026-10-01T00:00:00.000Z',
    toDate: '2026-10-31T23:59:59.999Z',
  });
});

test('payment-request creation accepts and trims multiple categories', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    categories?: string[];
  } = {};
  const service = {
    createPaymentRequest: async (
      userId: string,
      relationshipId: string,
      input: { categories?: string[] },
    ) => {
      received = { userId, relationshipId, categories: input.categories };
      return { id: 'request-1' };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/payment-requests',
    {
      title: 'Pantry restock',
      rationale: 'Restock shared ingredients.',
      amountMinorUnits: 4200,
      currency: 'USD',
      purchaseDate: '2026-10-28T00:00:00.000Z',
      categories: [' Groceries ', 'Household'],
      requestedSplit: [{ memberUserId: 'member-2', percentage: 100 }],
      evaluation: {
        rubricVersionId: 'rubric-1',
        answers: { necessary: false },
      },
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    categories: ['Groceries', 'Household'],
  });
});

test('payment-request edits validate and forward the authenticated subject', async (t) => {
  let received: {
    userId?: string;
    paymentRequestId?: string;
    input?: unknown;
  } = {};
  const service = {
    updatePaymentRequest: async (
      userId: string,
      paymentRequestId: string,
      input: unknown,
    ) => {
      received = { userId, paymentRequestId, input };
      return { id: paymentRequestId };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'PUT',
    '/api/v1/payment-requests/request-1',
    {
      title: '  Pantry restock  ',
      rationale: '  Restock shared ingredients.  ',
      amountMinorUnits: 4200,
      currency: 'USD',
      purchaseDate: '2026-10-28T00:00:00.000Z',
      categories: [' Groceries ', 'Household'],
      requestedSplit: [{ memberUserId: 'member-2', percentage: 100 }],
      evaluation: {
        rubricVersionId: 'rubric-1',
        answers: { necessary: false },
      },
    },
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    paymentRequestId: 'request-1',
    input: {
      title: 'Pantry restock',
      rationale: 'Restock shared ingredients.',
      amountMinorUnits: 4200,
      currency: 'USD',
      purchaseDate: '2026-10-28T00:00:00.000Z',
      categories: ['Groceries', 'Household'],
      requestedSplit: [{ memberUserId: 'member-2', percentage: 100 }],
      evaluation: {
        rubricVersionId: 'rubric-1',
        answers: { necessary: false },
      },
    },
  });
});

test('invalid payment-request edits do not reach the service', async (t) => {
  let called = false;
  const service = {
    updatePaymentRequest: async () => {
      called = true;
      return {};
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'PUT',
    '/api/v1/payment-requests/request-1',
    {
      title: '',
      rationale: 'Missing required amount',
      amountMinorUnits: 0,
      currency: 'USD',
      purchaseDate: 'not-a-date',
      requestedSplit: [],
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('invalid request payloads stop at the API boundary', async (t) => {
  let called = false;
  const service = {
    createRelationship: async () => {
      called = true;
      throw new Error('should not be called');
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(server, 'POST', '/api/v1/relationships', {
    name: '',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('relationship creation forwards the authenticated display name', async (t) => {
  let receivedDisplayName: string | undefined;
  const service = {
    createRelationship: async (
      _userId: string,
      _input: unknown,
      displayName?: string,
    ) => {
      receivedDisplayName = displayName;
      return {};
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service, undefined, { name: 'Alex' });
  t.after(() => server.close());

  const response = await call(server, 'POST', '/api/v1/relationships', {
    name: 'Our space',
  });

  assert.equal(response.statusCode, 201);
  assert.equal(receivedDisplayName, 'Alex');
});

test('invitation routes use the authenticated subject and token', async (t) => {
  let received: { userId?: string; token?: string } = {};
  const service = {
    getInvitation: async (userId: string, token: string) => {
      received = { userId, token };
      return { id: 'invitation-1' };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/invitations/invitation-token',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    token: 'invitation-token',
    userId: 'user-123',
  });
});

test('invitation payloads are validated at the API boundary', async (t) => {
  let called = false;
  const service = {
    createInvitation: async () => {
      called = true;
      throw new Error('should not be called');
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/invitations',
    { inviteeEmail: 'not-an-email' },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('notification read uses the relationship read scope', async (t) => {
  let received: { userId?: string; notificationId?: string } = {};
  const service = {
    markNotificationRead: async (userId: string, notificationId: string) => {
      received = { userId, notificationId };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/notifications/notification-1/read',
  );

  assert.equal(response.statusCode, 204);
  assert.deepEqual(received, {
    userId: 'user-123',
    notificationId: 'notification-1',
  });
});

test('notification completion forwards the authenticated recipient', async (t) => {
  let received: { userId?: string; notificationId?: string } = {};
  const service = {
    completeNotification: async (userId: string, notificationId: string) => {
      received = { userId, notificationId };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/notifications/notification-1/complete',
  );

  assert.equal(response.statusCode, 204);
  assert.deepEqual(received, {
    userId: 'user-123',
    notificationId: 'notification-1',
  });
});

test('push token registration forwards the authenticated subject and platform', async (t) => {
  let received: {
    userId?: string;
    token?: string;
    platform?: string;
  } = {};
  const service = {
    registerPushToken: async (
      userId: string,
      input: { token: string; platform: 'ios' | 'android' },
    ) => {
      received = { userId, ...input };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/notifications/push-tokens',
    { token: 'ExpoPushToken[device-123]', platform: 'ios' },
  );

  assert.equal(response.statusCode, 204);
  assert.deepEqual(received, {
    userId: 'user-123',
    token: 'ExpoPushToken[device-123]',
    platform: 'ios',
  });
});

test('push token unregistration is scoped to the authenticated subject', async (t) => {
  let received: { userId?: string; token?: string } = {};
  const service = {
    unregisterPushToken: async (userId: string, token: string) => {
      received = { userId, token };
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/notifications/push-tokens/unregister',
    { token: 'ExponentPushToken[device-123]' },
  );

  assert.equal(response.statusCode, 204);
  assert.deepEqual(received, {
    userId: 'user-123',
    token: 'ExponentPushToken[device-123]',
  });
});

test('invalid push tokens are rejected before reaching the service', async (t) => {
  let called = false;
  const service = {
    registerPushToken: async () => {
      called = true;
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/notifications/push-tokens',
    { token: 'not-an-expo-token', platform: 'ios' },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('relationship creation requires its dedicated scope', async (t) => {
  let called = false;
  const service = {
    createRelationship: async () => {
      called = true;
      throw new Error('should not be called');
    },
  } as unknown as PaymentRequestService;
  const server = await startServer(service, 'relationships:read');
  t.after(() => server.close());

  const response = await call(server, 'POST', '/api/v1/relationships', {
    name: 'Our space',
  });

  assert.equal(response.statusCode, 403);
  assert.equal(called, false);
});
