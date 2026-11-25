import type {
  MobileLogBatchRequest,
  MobileLogBatchResponse,
} from '@expo-50sdk-template/shared-types';
import type { RequestHandler } from 'express';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { test } from 'node:test';

import { createApp } from '../app';
import { loadConfig } from '../config/env';

function createAuthenticatedMiddleware(): RequestHandler {
  return (request, _response, next) => {
    request.auth = {
      header: {},
      payload: { sub: 'user-123' },
      token: 'test-token',
    };
    next();
  };
}

function startServer(
  authMiddleware: RequestHandler,
  environment: NodeJS.ProcessEnv = {},
) {
  const server = createServer(
    createApp(loadConfig(environment), { authMiddleware }),
  );
  return new Promise<typeof server>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function post(
  server: ReturnType<typeof createServer>,
  path: string,
  body: unknown,
) {
  const address = server.address();
  assert(address && typeof address !== 'string');

  return new Promise<{ body: unknown; statusCode: number }>(
    (resolve, reject) => {
      const requestStream = request(
        {
          headers: { 'content-type': 'application/json' },
          hostname: '127.0.0.1',
          method: 'POST',
          path,
          port: address.port,
        },
        (response) => {
          let responseBody = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => (responseBody += chunk));
          response.on('end', () => {
            resolve({
              body: responseBody ? JSON.parse(responseBody) : undefined,
              statusCode: response.statusCode ?? 0,
            });
          });
        },
      );
      requestStream.on('error', reject);
      requestStream.end(JSON.stringify(body));
    },
  );
}

test('authenticated mobile log batches are accepted', async (t) => {
  const server = await startServer(createAuthenticatedMiddleware());
  t.after(() => server.close());

  const batch: MobileLogBatchRequest = {
    entries: [
      {
        timestamp: new Date().toISOString(),
        service: 'mobile',
        level: 'info',
        event: 'application_ready',
      },
    ],
  };
  const response = await post(server, '/api/v1/telemetry/logs', batch);

  assert.equal(response.statusCode, 202);
  assert.deepEqual(response.body, {
    accepted: 1,
  } satisfies MobileLogBatchResponse);
});

test('mobile log batches are unavailable outside development', async (t) => {
  const server = await startServer(createAuthenticatedMiddleware(), {
    NODE_ENV: 'production',
  });
  t.after(() => server.close());

  const response = await post(server, '/api/v1/telemetry/logs', {
    entries: [
      {
        timestamp: new Date().toISOString(),
        service: 'mobile',
        level: 'info',
        event: 'production_log',
      },
    ],
  });

  assert.equal(response.statusCode, 404);
});

test('mobile log batches reject invalid entries', async (t) => {
  const server = await startServer(createAuthenticatedMiddleware());
  t.after(() => server.close());

  const response = await post(server, '/api/v1/telemetry/logs', {
    entries: [
      {
        timestamp: new Date().toISOString(),
        service: 'api',
        level: 'info',
        event: 'invalid_service',
      },
    ],
  });

  assert.equal(response.statusCode, 400);
});

test('mobile log batches require OAuth authentication', async (t) => {
  const server = createServer(
    createApp(
      loadConfig({
        AUTH_AUDIENCE: 'https://identity.example/resources/api',
        AUTH_ISSUER_BASE_URL: 'https://identity.example',
      }),
    ),
  );
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => server.close());

  const response = await post(server, '/api/v1/telemetry/logs', {
    entries: [
      {
        timestamp: new Date().toISOString(),
        service: 'mobile',
        level: 'info',
        event: 'unauthenticated',
      },
    ],
  });

  assert.equal(response.statusCode, 401);
});
