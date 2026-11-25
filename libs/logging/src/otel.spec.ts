import { SeverityNumber } from '@opentelemetry/api';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { createLogger } from './index';
import { createOtlpLogSink } from './otel';

test('exports sanitized structured logs through OTLP over HTTP', async () => {
  let receivedBody = '';
  let receivedPath = '';
  const server = createServer((request, response) => {
    let body = '';
    receivedPath = request.url ?? '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
    });
    request.on('end', () => {
      receivedBody = body;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{}');
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('The local OTLP test receiver did not bind to a TCP port');
  }

  const otlpLogSink = createOtlpLogSink({
    endpoint: `http://127.0.0.1:${address.port}/v1/logs`,
    service: 'api',
    environment: 'development',
  });

  try {
    const logger = createLogger({
      level: 'debug',
      service: 'api',
      sink: () => undefined,
      onLogEntry: otlpLogSink.emit,
    });
    logger.info('auth_event', {
      accessToken: 'private-token',
      metadata: { requestId: 'request-1' },
    });
    await otlpLogSink.shutdown();

    const payload = JSON.parse(receivedBody) as {
      resourceLogs: {
        resource: {
          attributes: { key: string; value: { stringValue?: string } }[];
        };
        scopeLogs: {
          logRecords: {
            body: { stringValue?: string };
            severityNumber: number;
            severityText: string;
            attributes: {
              key: string;
              value: { stringValue?: string };
            }[];
          }[];
        }[];
      }[];
    };
    const resourceAttributes = new Map(
      payload.resourceLogs[0].resource.attributes.map(({ key, value }) => [
        key,
        value.stringValue,
      ]),
    );
    const record = payload.resourceLogs[0].scopeLogs[0].logRecords[0];
    const recordAttributes = new Map(
      record.attributes.map(({ key, value }) => [key, value.stringValue]),
    );

    assert.equal(resourceAttributes.get('service.name'), 'api');
    assert.equal(
      resourceAttributes.get('deployment.environment.name'),
      'development',
    );
    assert.equal(receivedPath, '/v1/logs');
    assert.equal(record.body.stringValue, 'auth_event');
    assert.equal(record.severityNumber, SeverityNumber.INFO);
    assert.equal(record.severityText, 'INFO');
    assert.equal(recordAttributes.get('accessToken'), '[REDACTED]');
    assert.equal(recordAttributes.get('metadata'), '{"requestId":"request-1"}');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
