import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { type JointAccountChargeService } from './service';
import { createApp } from '../../app';
import { loadConfig } from '../../config/env';

function startServer(
  service: JointAccountChargeService,
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
    createApp(loadConfig({}), {
      authMiddleware: authenticated,
      jointAccountChargeService: service,
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

test('charge list filters are validated and forwarded with the authenticated user', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    filters?: unknown;
  } = {};
  const service = {
    listCharges: async (
      userId: string,
      relationshipId: string,
      filters: unknown,
    ) => {
      received = { userId, relationshipId, filters };
      return { items: [] };
    },
  } as unknown as JointAccountChargeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/joint-account-charges?name=groceries&status=paid&minimumAmountMinorUnits=1000&limit=10&fromDate=2026-10-01T00%3A00%3A00.000Z&toDate=2026-10-31T23%3A59%3A59.999Z',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    filters: {
      name: 'groceries',
      status: 'paid',
      minimumAmountMinorUnits: 1000,
      limit: 10,
      fromDate: '2026-10-01T00:00:00.000Z',
      toDate: '2026-10-31T23:59:59.999Z',
    },
  });
});

test('charge creation validates the payload and forwards relationship ownership', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    input?: unknown;
  } = {};
  const service = {
    createCharge: async (
      userId: string,
      relationshipId: string,
      input: unknown,
    ) => {
      received = { userId, relationshipId, input };
      return { id: 'charge-1' };
    },
  } as unknown as JointAccountChargeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/joint-account-charges',
    { name: '  Groceries  ', amountMinorUnits: 4200 },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    input: { name: 'Groceries', amountMinorUnits: 4200 },
  });
});

test('invalid charge payloads do not reach the service', async (t) => {
  let called = false;
  const service = {
    createCharge: async () => {
      called = true;
      return {};
    },
  } as unknown as JointAccountChargeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/joint-account-charges',
    { name: '', amountMinorUnits: -1 },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('charge edits and paid status changes forward the authenticated subject', async (t) => {
  const received: {
    update?: { userId: string; chargeId: string; input: unknown };
    markPaid?: { userId: string; chargeId: string };
    markAllPaid?: { userId: string; relationshipId: string };
  } = {};
  const service = {
    updateCharge: async (userId: string, chargeId: string, input: unknown) => {
      received.update = { userId, chargeId, input };
      return { id: chargeId, status: 'unpaid' };
    },
    markChargePaid: async (userId: string, chargeId: string) => {
      received.markPaid = { userId, chargeId };
      return { id: chargeId, status: 'paid' };
    },
    markAllChargesPaid: async (userId: string, relationshipId: string) => {
      received.markAllPaid = { userId, relationshipId };
      return { updatedCount: 2 };
    },
  } as unknown as JointAccountChargeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const updateResponse = await call(
    server,
    'POST',
    '/api/v1/joint-account-charges/charge-1/update',
    {
      name: 'Groceries',
      amountMinorUnits: 5000,
      chargeDate: '2026-10-26T12:00:00.000Z',
    },
  );
  const markPaidResponse = await call(
    server,
    'POST',
    '/api/v1/joint-account-charges/charge-1/mark-paid',
  );
  const markAllPaidResponse = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/joint-account-charges/mark-all-paid',
  );

  assert.equal(updateResponse.statusCode, 200);
  assert.equal(markPaidResponse.statusCode, 200);
  assert.equal(markAllPaidResponse.statusCode, 200);
  assert.deepEqual(markAllPaidResponse.body, { updatedCount: 2 });
  assert.deepEqual(received, {
    update: {
      userId: 'user-123',
      chargeId: 'charge-1',
      input: {
        name: 'Groceries',
        amountMinorUnits: 5000,
        chargeDate: '2026-10-26T12:00:00.000Z',
      },
    },
    markPaid: { userId: 'user-123', chargeId: 'charge-1' },
    markAllPaid: {
      userId: 'user-123',
      relationshipId: 'relationship-1',
    },
  });
});

test('charge writes require the payment request write scope', async (t) => {
  let called = false;
  const service = {
    createCharge: async () => {
      called = true;
      return {};
    },
    markAllChargesPaid: async () => {
      called = true;
      return { updatedCount: 0 };
    },
  } as unknown as JointAccountChargeService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/joint-account-charges',
    { name: 'Groceries', amountMinorUnits: 4200 },
  );
  const markAllPaidResponse = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/joint-account-charges/mark-all-paid',
  );

  assert.equal(response.statusCode, 403);
  assert.equal(markAllPaidResponse.statusCode, 403);
  assert.equal(called, false);
});
