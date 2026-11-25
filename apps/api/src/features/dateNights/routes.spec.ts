import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { type DateNightService } from './service';
import { createApp } from '../../app';
import { loadConfig } from '../../config/env';

function startServer(
  service: DateNightService,
  scope = 'payment-requests:read payment-requests:write',
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
    createApp(loadConfig({ NODE_ENV: 'development' }), {
      authMiddleware: authenticated,
      dateNightService: service,
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

test('event list route forwards the authenticated relationship member and filters', async (t) => {
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
        latestEventDayId: '2026-10-28',
        items: [{ id: 'date-night-1' }],
        nextCursor: 'date-night-1',
      };
    },
  } as unknown as DateNightService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/date-nights/events?month=2026-10&cursor=event-0&limit=10',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    filters: { cursor: 'event-0', limit: 10, month: '2026-10' },
    relationshipId: 'relationship-1',
    userId: 'user-123',
  });
  assert.deepEqual(response.body, {
    earliestEventDayId: '2026-09-30',
    latestEventDayId: '2026-10-28',
    items: [{ id: 'date-night-1' }],
    nextCursor: 'date-night-1',
  });

  const invalidMonth = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/date-nights/events?month=2026-13',
  );
  assert.equal(invalidMonth.statusCode, 400);
});

test('event creation route validates and forwards the selected day', async (t) => {
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
      return { id: 'date-night-1', day: '2026-10-28' };
    },
  } as unknown as DateNightService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/date-nights/events',
    {
      day: '2026-10-28',
      description: '  Dinner and a movie  ',
      today: '2026-10-29',
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    input: {
      day: '2026-10-28',
      description: 'Dinner and a movie',
      today: '2026-10-29',
    },
    relationshipId: 'relationship-1',
    userId: 'user-123',
  });

  const invalidDate = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/date-nights/events',
    { day: 'not-a-date' },
  );
  assert.equal(invalidDate.statusCode, 400);

  const longDescription = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/date-nights/events',
    { day: '2026-10-28', description: 'a'.repeat(2_001) },
  );
  assert.equal(longDescription.statusCode, 400);
});

test('date-night routes enforce read and write scopes', async (t) => {
  const service = {
    createEvent: async () => ({ id: 'unused' }),
    getEvents: async () => ({ items: [] }),
  } as unknown as DateNightService;
  const readOnlyServer = await startServer(service, 'payment-requests:read');
  const writeOnlyServer = await startServer(service, 'payment-requests:write');
  t.after(() => readOnlyServer.close());
  t.after(() => writeOnlyServer.close());

  const writeResponse = await call(
    readOnlyServer,
    'POST',
    '/api/v1/relationships/relationship-1/date-nights/events',
    { day: '2026-10-28' },
  );
  const readResponse = await call(
    writeOnlyServer,
    'GET',
    '/api/v1/relationships/relationship-1/date-nights/events?month=2026-10',
  );

  assert.equal(writeResponse.statusCode, 403);
  assert.equal(readResponse.statusCode, 403);
});
