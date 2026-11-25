import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { type RelationshipRuleService } from './service';
import { createApp } from '../../app';
import { loadConfig } from '../../config/env';

function startServer(
  service: RelationshipRuleService,
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
      relationshipRuleService: service,
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

test('rule lists forward the authenticated subject and validated pagination', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    filters?: unknown;
  } = {};
  const service = {
    listRelationshipRules: async (
      userId: string,
      relationshipId: string,
      filters: unknown,
    ) => {
      received = { userId, relationshipId, filters };
      return { items: [] };
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/rules?cursor=rule-1&limit=10',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    filters: { cursor: 'rule-1', limit: 10 },
  });
});

test('rule creation validates and forwards the authenticated creator', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    input?: unknown;
  } = {};
  const service = {
    createRelationshipRule: async (
      userId: string,
      relationshipId: string,
      input: unknown,
    ) => {
      received = { userId, relationshipId, input };
      return { id: 'rule-1' };
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/rules',
    {
      name: '  Quiet hours  ',
      labels: ['  Home  ', '  Finances  '],
      description: '  Keep noise low.  ',
      requiredApproverUserIds: ['member-2'],
      remindMeToReview: '2035-10-28T12:00:00.000Z',
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    input: {
      name: 'Quiet hours',
      labels: ['Home', 'Finances'],
      description: 'Keep noise low.',
      requiredApproverUserIds: ['member-2'],
      remindMeToReview: '2035-10-28T12:00:00.000Z',
    },
  });
});

test('rule creation accepts a null reminder for rules that never expire', async (t) => {
  let receivedInput: unknown;
  const service = {
    createRelationshipRule: async (
      _userId: string,
      _relationshipId: string,
      input: unknown,
    ) => {
      receivedInput = input;
      return { id: 'rule-1' };
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/rules',
    {
      name: 'Quiet hours',
      description: 'Keep noise low.',
      requiredApproverUserIds: ['member-2'],
      remindMeToReview: null,
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(receivedInput, {
    name: 'Quiet hours',
    description: 'Keep noise low.',
    requiredApproverUserIds: ['member-2'],
    remindMeToReview: null,
  });
});

test('rule updates validate and forward the authenticated user', async (t) => {
  let received: {
    userId?: string;
    ruleId?: string;
    input?: unknown;
  } = {};
  const service = {
    updateRelationshipRule: async (
      userId: string,
      ruleId: string,
      input: unknown,
    ) => {
      received = { userId, ruleId, input };
      return { id: ruleId };
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'PATCH',
    '/api/v1/relationship-rules/rule-1',
    {
      name: '  Quiet hours  ',
      labels: [' Home ', ' Quiet '],
      description: '  Keep noise low.  ',
    },
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    ruleId: 'rule-1',
    input: {
      name: 'Quiet hours',
      labels: ['Home', 'Quiet'],
      description: 'Keep noise low.',
    },
  });
});

test('invalid rule creation does not reach the service', async (t) => {
  let called = false;
  const service = {
    createRelationshipRule: async () => {
      called = true;
      return {};
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/rules',
    {
      name: '',
      description: '',
      requiredApproverUserIds: ['member-2', 'member-2'],
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('invalid rule updates do not reach the service', async (t) => {
  let called = false;
  const service = {
    updateRelationshipRule: async () => {
      called = true;
      return {};
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'PATCH',
    '/api/v1/relationship-rules/rule-1',
    {
      name: 'Quiet hours',
      labels: ['Home', 'Home'],
      description: 'Keep noise low.',
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('rule detail and agreement routes forward authenticated users', async (t) => {
  const received: {
    get?: { userId: string; ruleId: string };
    agree?: { userId: string; ruleId: string };
  } = {};
  const service = {
    getRelationshipRule: async (userId: string, ruleId: string) => {
      received.get = { userId, ruleId };
      return { id: ruleId };
    },
    agreeToRelationshipRule: async (userId: string, ruleId: string) => {
      received.agree = { userId, ruleId };
      return { id: ruleId };
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service);
  t.after(() => server.close());

  const detail = await call(server, 'GET', '/api/v1/relationship-rules/rule-1');
  const agreement = await call(
    server,
    'POST',
    '/api/v1/relationship-rules/rule-1/agree',
  );

  assert.equal(detail.statusCode, 200);
  assert.equal(agreement.statusCode, 200);
  assert.deepEqual(received, {
    get: { userId: 'user-123', ruleId: 'rule-1' },
    agree: { userId: 'user-123', ruleId: 'rule-1' },
  });
});

test('rule writes require the payment request write scope', async (t) => {
  let called = false;
  const service = {
    createRelationshipRule: async () => {
      called = true;
      return {};
    },
  } as unknown as RelationshipRuleService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/rules',
    {
      name: 'Quiet hours',
      description: 'Keep noise low.',
      requiredApproverUserIds: ['member-2'],
    },
  );

  assert.equal(response.statusCode, 403);
  assert.equal(called, false);
});
