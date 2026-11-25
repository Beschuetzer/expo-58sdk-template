import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { type BudgetService } from './service';
import { createApp } from '../../app';
import { loadConfig } from '../../config/env';

function startServer(service: BudgetService) {
  const authenticated: RequestHandler = (request, _response, next) => {
    request.auth = {
      header: {},
      payload: {
        scope: 'payment-requests:read payment-requests:write',
        sub: 'user-123',
      },
      token: 'test-token',
    };
    next();
  };
  const server = createServer(
    createApp(loadConfig({}), {
      authMiddleware: authenticated,
      budgetService: service,
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

test('budget creation validates and forwards the authenticated creator', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    input?: unknown;
  } = {};
  const service = {
    createBudget: async (
      userId: string,
      relationshipId: string,
      input: unknown,
    ) => {
      received = { userId, relationshipId, input };
      return { id: 'budget-1' };
    },
  } as unknown as BudgetService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/budgets',
    {
      name: '  Household  ',
      amountMinorUnits: 100_000,
      currency: 'EUR',
      period: 'yearly',
      requiredApproverUserIds: ['member-2'],
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    input: {
      name: 'Household',
      amountMinorUnits: 100_000,
      currency: 'EUR',
      period: 'yearly',
      requiredApproverUserIds: ['member-2'],
    },
  });
});

test('budget creation defaults an omitted currency to USD', async (t) => {
  let receivedInput: unknown;
  const service = {
    createBudget: async (
      _userId: string,
      _relationshipId: string,
      input: unknown,
    ) => {
      receivedInput = input;
      return { id: 'budget-1' };
    },
  } as unknown as BudgetService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/budgets',
    {
      name: 'Household',
      amountMinorUnits: 100_000,
      period: 'monthly',
      requiredApproverUserIds: ['member-2'],
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(receivedInput, {
    name: 'Household',
    amountMinorUnits: 100_000,
    currency: 'USD',
    period: 'monthly',
    requiredApproverUserIds: ['member-2'],
  });
});

test('unknown budget currencies do not reach the service', async (t) => {
  let called = false;
  const service = {
    createBudget: async () => {
      called = true;
      return {};
    },
  } as unknown as BudgetService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/budgets',
    {
      name: 'Household',
      amountMinorUnits: 100_000,
      currency: 'ZZZ',
      period: 'monthly',
      requiredApproverUserIds: ['member-2'],
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('invalid budget item dates do not reach the service', async (t) => {
  let called = false;
  const service = {
    createBudgetItem: async () => {
      called = true;
      return {};
    },
  } as unknown as BudgetService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/budgets/budget-1/items',
    {
      name: 'Groceries',
      amountMinorUnits: 2_500,
      date: '2026-02-30',
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});
