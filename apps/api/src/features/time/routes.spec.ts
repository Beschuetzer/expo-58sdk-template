import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { type TimeService } from './service';
import { createApp } from '../../app';
import { loadConfig } from '../../config/env';

function startServer(
  service: TimeService,
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
      timeService: service,
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

test('Me Time list routes forward the authenticated subject and filters', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    filters?: unknown;
  } = {};
  const service = {
    listMeTime: async (
      userId: string,
      relationshipId: string,
      filters: unknown,
    ) => {
      received = { userId, relationshipId, filters };
      return { items: [] };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/me-time?cursor=entry-1&limit=10&startTimeFrom=2026-10-01T00%3A00%3A00.000Z&startTimeBefore=2026-11-01T00%3A00%3A00.000Z',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    filters: {
      cursor: 'entry-1',
      limit: 10,
      startTimeFrom: '2026-10-01T00:00:00.000Z',
      startTimeBefore: '2026-11-01T00:00:00.000Z',
    },
  });
});

test('Me Time list routes reject reversed date ranges', async (t) => {
  const service = {
    listMeTime: async () => ({ items: [] }),
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/me-time?startTimeFrom=2026-11-01T00%3A00%3A00.000Z&startTimeBefore=2026-10-01T00%3A00%3A00.000Z',
  );

  assert.equal(response.statusCode, 400);
});

test('Me Time detail routes forward the authenticated subject and entry ID', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    meTimeId?: string;
  } = {};
  const service = {
    getMeTimeById: async (
      userId: string,
      relationshipId: string,
      meTimeId: string,
    ) => {
      received = { userId, relationshipId, meTimeId };
      return { id: meTimeId };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/me-time/entry-1',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    meTimeId: 'entry-1',
  });
});

test('task detail routes forward the authenticated subject and task ID', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    taskId?: string;
  } = {};
  const service = {
    getTaskById: async (
      userId: string,
      relationshipId: string,
      taskId: string,
    ) => {
      received = { userId, relationshipId, taskId };
      return { id: taskId };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/tasks/task-1',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    taskId: 'task-1',
  });
});

test('task list routes forward task status and pagination filters', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    filters?: unknown;
  } = {};
  const service = {
    listTasks: async (
      userId: string,
      relationshipId: string,
      filters: unknown,
    ) => {
      received = { userId, relationshipId, filters };
      return { items: [] };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/tasks?status=completed&cursor=task-1&limit=50&dateFrom=2026-10-01T00%3A00%3A00.000Z&dateBefore=2026-11-01T00%3A00%3A00.000Z',
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    filters: {
      status: 'completed',
      cursor: 'task-1',
      limit: 50,
      dateFrom: '2026-10-01T00:00:00.000Z',
      dateBefore: '2026-11-01T00:00:00.000Z',
    },
  });
});

test('task list routes reject reversed calendar date ranges', async (t) => {
  let called = false;
  const service = {
    listTasks: async () => {
      called = true;
      return { items: [] };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'GET',
    '/api/v1/relationships/relationship-1/tasks?dateFrom=2026-11-01T00%3A00%3A00.000Z&dateBefore=2026-10-01T00%3A00%3A00.000Z',
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('Me Time creation validates and forwards dates and description', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    input?: unknown;
  } = {};
  const service = {
    createMeTime: async (
      userId: string,
      relationshipId: string,
      input: unknown,
    ) => {
      received = { userId, relationshipId, input };
      return { id: 'me-time-1' };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/me-time',
    {
      startTime: '2026-10-29T10:00:00.000Z',
      endTime: '2026-10-29T11:00:00.000Z',
      description: '  Read a book  ',
    },
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    input: {
      startTime: '2026-10-29T10:00:00.000Z',
      endTime: '2026-10-29T11:00:00.000Z',
      description: 'Read a book',
    },
  });
});

test('Me Time update validates and forwards dates and description', async (t) => {
  let received: {
    userId?: string;
    relationshipId?: string;
    meTimeId?: string;
    input?: unknown;
  } = {};
  const service = {
    updateMeTime: async (
      userId: string,
      relationshipId: string,
      meTimeId: string,
      input: unknown,
    ) => {
      received = { userId, relationshipId, meTimeId, input };
      return { id: meTimeId };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'PATCH',
    '/api/v1/relationships/relationship-1/me-time/entry-1',
    {
      startTime: '2026-10-29T10:00:00.000Z',
      endTime: '2026-10-29T11:00:00.000Z',
      description: '  Read a book  ',
    },
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(received, {
    userId: 'user-123',
    relationshipId: 'relationship-1',
    meTimeId: 'entry-1',
    input: {
      startTime: '2026-10-29T10:00:00.000Z',
      endTime: '2026-10-29T11:00:00.000Z',
      description: 'Read a book',
    },
  });
});

test('invalid Me Time updates do not reach the service', async (t) => {
  let called = false;
  const service = {
    updateMeTime: async () => {
      called = true;
      return {};
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'PATCH',
    '/api/v1/relationships/relationship-1/me-time/entry-1',
    {
      startTime: 'not-a-date',
      endTime: '2026-10-29T11:00:00.000Z',
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('invalid Me Time input does not reach the service', async (t) => {
  let called = false;
  const service = {
    createMeTime: async () => {
      called = true;
      return {};
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/me-time',
    {
      startTime: 'not-a-date',
      endTime: '2026-10-29T11:00:00.000Z',
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('task routes forward create and completion actions to the service', async (t) => {
  const received: {
    create?: { userId: string; relationshipId: string; input: unknown };
    update?: {
      userId: string;
      relationshipId: string;
      taskId: string;
      input: unknown;
    };
    complete?: { userId: string; relationshipId: string; taskId: string };
  } = {};
  const service = {
    createTask: async (
      userId: string,
      relationshipId: string,
      input: unknown,
    ) => {
      received.create = { userId, relationshipId, input };
      return { id: 'task-1' };
    },
    updateTask: async (
      userId: string,
      relationshipId: string,
      taskId: string,
      input: unknown,
    ) => {
      received.update = { userId, relationshipId, taskId, input };
      return { id: taskId };
    },
    completeTask: async (
      userId: string,
      relationshipId: string,
      taskId: string,
    ) => {
      received.complete = { userId, relationshipId, taskId };
      return { id: taskId };
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const created = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/tasks',
    {
      name: '  Go grocery shopping  ',
      dueDate: '2026-11-10T09:00:00.000Z',
      reminderFrequencyDays: 3,
      visibleToUserIds: [' user-123 ', 'member-2'],
      completableByUserIds: ['member-2'],
    },
  );
  const updated = await call(
    server,
    'PATCH',
    '/api/v1/relationships/relationship-1/tasks/task-1',
    {
      name: '  Wash dishes  ',
      dueDate: '2026-11-11T09:00:00.000Z',
      reminderFrequencyDays: 2,
      visibleToUserIds: [' user-123 '],
      completableByUserIds: ['member-2'],
    },
  );
  const completed = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/tasks/task-1/complete',
  );

  assert.equal(created.statusCode, 201);
  assert.equal(updated.statusCode, 200);
  assert.equal(completed.statusCode, 200);
  assert.deepEqual(received, {
    create: {
      userId: 'user-123',
      relationshipId: 'relationship-1',
      input: {
        name: 'Go grocery shopping',
        dueDate: '2026-11-10T09:00:00.000Z',
        reminderFrequencyDays: 3,
        visibleToUserIds: ['user-123', 'member-2'],
        completableByUserIds: ['member-2'],
      },
    },
    update: {
      userId: 'user-123',
      relationshipId: 'relationship-1',
      taskId: 'task-1',
      input: {
        name: 'Wash dishes',
        dueDate: '2026-11-11T09:00:00.000Z',
        reminderFrequencyDays: 2,
        visibleToUserIds: ['user-123'],
        completableByUserIds: ['member-2'],
      },
    },
    complete: {
      userId: 'user-123',
      relationshipId: 'relationship-1',
      taskId: 'task-1',
    },
  });
});

test('task update routes reject missing member selections', async (t) => {
  let called = false;
  const service = {
    updateTask: async () => {
      called = true;
      return {};
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'PATCH',
    '/api/v1/relationships/relationship-1/tasks/task-1',
    { name: 'Task' },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('invalid task permission selections do not reach the service', async (t) => {
  let called = false;
  const service = {
    createTask: async () => {
      called = true;
      return {};
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/tasks',
    { name: 'Task', completableByUserIds: 'member-1' },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('task routes reject invalid due dates', async (t) => {
  let called = false;
  const service = {
    createTask: async () => {
      called = true;
      return {};
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/tasks',
    { name: 'Task', dueDate: 'next week' },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('task routes reject invalid reminder frequencies', async (t) => {
  let called = false;
  const service = {
    createTask: async () => {
      called = true;
      return {};
    },
  } as unknown as TimeService;
  const server = await startServer(service);
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/tasks',
    {
      name: 'Task',
      dueDate: '2026-11-10T09:00:00.000Z',
      reminderFrequencyDays: 1.5,
    },
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('time writes require the payment request write scope', async (t) => {
  let called = false;
  const service = {
    createTask: async () => {
      called = true;
      return {};
    },
  } as unknown as TimeService;
  const server = await startServer(service, 'payment-requests:read');
  t.after(() => server.close());

  const response = await call(
    server,
    'POST',
    '/api/v1/relationships/relationship-1/tasks',
    { name: 'Go grocery shopping' },
  );

  assert.equal(response.statusCode, 403);
  assert.equal(called, false);
});
