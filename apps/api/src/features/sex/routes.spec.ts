import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { type SexService } from './service';
import { createApp } from '../../app';
import { loadConfig } from '../../config/env';

function startServer(
  service: SexService,
  scope = 'payment-requests:read payment-requests:write',
  environment = 'development',
) {
  const authenticated: RequestHandler = (request, _response, next) => {
    request.auth = {
      header: {},
      payload: { scope, sub: 'user-123' },
      token: 'test-token',
    };
    next();
  };
  const server = createServer(
    createApp(loadConfig({ NODE_ENV: environment }), {
      authMiddleware: authenticated,
      sexService: service,
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
  headers: Record<string, string> = {},
) {
  const address = server.address();
  assert(address && typeof address !== 'string');
  return new Promise<{
    allowMethods: string;
    body: unknown;
    statusCode: number;
  }>((resolve, reject) => {
    const response = request(
      {
        headers:
          body === undefined
            ? headers
            : { ...headers, 'content-type': 'application/json' },
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
          const allowMethods =
            incomingResponse.headers['access-control-allow-methods'];
          resolve({
            allowMethods: Array.isArray(allowMethods)
              ? allowMethods.join(', ')
              : allowMethods ?? '',
            body: responseBody ? JSON.parse(responseBody) : undefined,
            statusCode: incomingResponse.statusCode ?? 0,
          });
        });
      },
    );
    response.on('error', reject);
    if (body !== undefined) response.end(JSON.stringify(body));
    else response.end();
  });
}

test('daily status routes forward the authenticated subject and members', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    memberUserIds?: string[];
    today?: string;
  } = {};
  const service = {
    getDailyStatus: async (
      userId: string,
      relationshipId: string,
      memberUserIds?: string[],
      today?: string,
    ) => {
      received = { userId, relationshipId, memberUserIds, today };
      return { today: '2026-10-29' };
    },
  } as unknown as SexService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/sex/status?memberUserIds=member-1&memberUserIds=member-2&today=2026-10-29',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    memberUserIds: ['member-1', 'member-2'],
    today: '2026-10-29',
  });
});

test('event read route forwards the authenticated relationship member', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    filters?: { cursor?: string; limit?: number; month?: string };
  } = {};
  const service = {
    getEvents: async (
      userId: string,
      relationshipId: string,
      filters: { cursor?: string; limit?: number; month?: string },
    ) => {
      received = { userId, relationshipId, filters };
      return {
        earliestEventDayId: '2026-09-30',
        items: [{ id: 'event-1' }],
        nextCursor: 'event-1',
      };
    },
  } as unknown as SexService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/sex/events?month=2026-10&cursor=event-0&limit=10',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    earliestEventDayId: '2026-09-30',
    items: [{ id: 'event-1' }],
    nextCursor: 'event-1',
  });
  assert.deepEqual(received, {
    filters: { cursor: 'event-0', limit: 10, month: '2026-10' },
    relationshipId: 'relationship-1',
    userId: 'user-123',
  });

  const invalidMonthResponse = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/sex/events?month=2026-13',
  );
  assert.equal(invalidMonthResponse.statusCode, 400);
});

test('event list route requires a month', async (t) => {
  const service = {
    getEvents: async () => ({
      earliestEventDayId: null,
      items: [],
    }),
  } as unknown as SexService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/sex/events',
  );
  assert.equal(response.statusCode, 400);
});

test('event read route still requires the relationship read scope', async (t) => {
  const service = {
    getEvents: async () => ({
      earliestEventDayId: null,
      items: [],
    }),
  } as unknown as SexService;
  const server = await startServer(service, 'payment-requests:write');
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/sex/events?month=2026-10',
  );
  assert.equal(response.statusCode, 403);
});

test('coin-flip routes validate and forward the guess and selected members', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    input?: unknown;
  } = {};
  const service = {
    flipCoin: async (
      userId: string,
      relationshipId: string,
      input: unknown,
    ) => {
      received = { userId, relationshipId, input };
      return { coinFlip: { id: 'flip-1' } };
    },
  } as unknown as SexService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/sex/coin-flips',
    {
      guess: 'tails',
      memberUserIds: ['member-1', 'member-2'],
      today: '2026-10-29',
    },
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    input: {
      guess: 'tails',
      memberUserIds: ['member-1', 'member-2'],
      today: '2026-10-29',
    },
  });
});

test('event routes forward the selected day and members', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    input?: unknown;
  } = {};
  const service = {
    createEvent: async (
      userId: string,
      relationshipId: string,
      input: unknown,
    ) => {
      received = { userId, relationshipId, input };
      return { id: 'event-1' };
    },
  } as unknown as SexService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/sex/events',
    {
      day: '2026-10-29',
      memberUserIds: ['member-1', 'member-2'],
      today: '2026-10-29',
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    input: {
      day: '2026-10-29',
      memberUserIds: ['member-1', 'member-2'],
      today: '2026-10-29',
    },
  });
});

test('coin-flip routes reject malformed member selections', async (t) => {
  const service = {
    flipCoin: async () => {
      throw new Error('The service should not be called for invalid input.');
    },
  } as unknown as SexService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/sex/coin-flips',
    { guess: 'heads', memberUserIds: ['member-1'] },
  );

  assert.equal(response.statusCode, 400);
});

test('coin-flip routes require the write scope', async (t) => {
  const service = {
    flipCoin: async () => ({ coinFlip: { id: 'flip-1' } }),
  } as unknown as SexService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/sex/coin-flips',
    { guess: 'heads', memberUserIds: ['member-1', 'member-2'] },
  );

  assert.equal(response.statusCode, 403);
});

test('development coin-flip reset routes require the write scope', async (t) => {
  const service = {
    resetDailyCoinFlip: async () => undefined,
  } as unknown as SexService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'DELETE',
    '/api/v1/relationships/relationship-1/sex/coin-flips/today',
  );

  assert.equal(response.statusCode, 403);
});

test('development coin-flip reset routes forward the authenticated member', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    today?: string;
  } = {};
  const service = {
    resetDailyCoinFlip: async (
      userId: string,
      relationshipId: string,
      today?: string,
    ) => {
      received = { userId, relationshipId, today };
    },
  } as unknown as SexService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'DELETE',
    '/api/v1/relationships/relationship-1/sex/coin-flips/today?today=2026-10-29',
  );

  assert.equal(response.statusCode, 204);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    today: '2026-10-29',
  });
});

test('daily coin-flip reset is not registered outside development', async (t) => {
  const service = {
    resetDailyCoinFlip: async () => {
      throw new Error('The reset service should not be called in production.');
    },
  } as unknown as SexService;
  const server = await startServer(
    service,
    'payment-requests:read payment-requests:write',
    'production',
  );
  t.after(() => server.close());

  const response = await call(
    server,
    'DELETE',
    '/api/v1/relationships/relationship-1/sex/coin-flips/today',
  );

  assert.equal(response.statusCode, 404);
});

test('API CORS policies allow budget edits and deletions', async (t) => {
  const service = {} as unknown as SexService;
  const developmentServer = await startServer(service);
  const productionServer = await startServer(
    service,
    'payment-requests:read payment-requests:write',
    'production',
  );
  t.after(() => developmentServer.close());
  t.after(() => productionServer.close());

  const headers = {
    origin: 'http://localhost:8081',
    'access-control-request-method': 'DELETE',
  };
  const developmentResponse = await call(
    developmentServer,
    'OPTIONS',
    '/api/v1/relationships/relationship-1/sex/coin-flips/today',
    undefined,
    headers,
  );
  const productionResponse = await call(
    productionServer,
    'OPTIONS',
    '/api/v1/relationships/relationship-1/sex/coin-flips/today',
    undefined,
    headers,
  );

  assert.equal(developmentResponse.statusCode, 204);
  assert.match(developmentResponse.allowMethods, /PATCH/);
  assert.match(developmentResponse.allowMethods, /DELETE/);
  assert.equal(productionResponse.statusCode, 204);
  assert.match(productionResponse.allowMethods, /PATCH/);
  assert.match(productionResponse.allowMethods, /DELETE/);
});
