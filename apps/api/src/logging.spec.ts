import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

import { logInfo } from './logging';

test('redacts authorization data from structured logs', () => {
  const originalInfo = console.info;
  let output = '';
  console.info = ((value?: unknown) => {
    output = String(value);
  }) as typeof console.info;

  try {
    logInfo('auth_test', {
      authorization: 'Bearer header-secret',
      cookie: 'bff_access_token=cookie-secret',
      nested: { refresh_token: 'refresh-secret' },
      details:
        'bff_access_token=cookie-secret Bearer inline-secret access_token=query-secret code=oauth-secret',
    });
  } finally {
    console.info = originalInfo;
  }

  assert.doesNotMatch(output, /header-secret|cookie-secret|refresh-secret/);
  assert.doesNotMatch(output, /query-secret|oauth-secret|inline-secret/);
  assert.match(output, /\[REDACTED\]/);
});

test('production does not initialize an OTLP log exporter', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--eval',
      `require(${JSON.stringify(resolve(__dirname, 'logging.ts'))})`,
    ],
    {
      cwd: resolve(__dirname, '..'),
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'file:///invalid',
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
});
