import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  SeverityNumber,
  type Attributes,
  type HrTime,
} from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';

import type { LogEntry } from './index';

export type OtlpLogSinkOptions = {
  endpoint: string;
  service: string;
  environment?: string;
  processor?: 'batch' | 'simple';
};

export type OtlpLogSink = {
  emit(entry: LogEntry): void;
  shutdown(): Promise<void>;
};

const severityNumbers: Record<LogEntry['level'], SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

let diagnosticsConfigured = false;

function configureDiagnosticsLogger(): void {
  if (diagnosticsConfigured) return;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
  diagnosticsConfigured = true;
}

function toHrTime(timestamp: string): HrTime {
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds)) {
    throw new Error('OpenTelemetry log timestamps must be valid dates');
  }

  const seconds = Math.floor(milliseconds / 1000);
  const nanoseconds = (milliseconds - seconds * 1000) * 1_000_000;
  return [seconds, nanoseconds];
}

function isPrimitiveAttribute(
  value: unknown,
): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function toAttributeValue(value: unknown): Attributes[string] | undefined {
  if (isPrimitiveAttribute(value)) return value;
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    const primitiveItems = value.filter(isPrimitiveAttribute);
    return primitiveItems.length === value.length
      ? primitiveItems
      : JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return undefined;
}

function toAttributes(entry: LogEntry): Attributes {
  const attributes: Attributes = { 'event.name': entry.event };

  for (const [key, value] of Object.entries(entry)) {
    if (
      key === 'event' ||
      key === 'level' ||
      key === 'service' ||
      key === 'timestamp'
    ) {
      continue;
    }

    const attributeValue = toAttributeValue(value);
    if (attributeValue !== undefined) attributes[key] = attributeValue;
  }

  return attributes;
}

export function createOtlpLogSink(options: OtlpLogSinkOptions): OtlpLogSink {
  const endpoint = options.endpoint.trim();
  const parsedEndpoint = new URL(endpoint);
  if (
    parsedEndpoint.protocol !== 'http:' &&
    parsedEndpoint.protocol !== 'https:'
  ) {
    throw new Error('OpenTelemetry log endpoints must use HTTP or HTTPS');
  }

  configureDiagnosticsLogger();

  const exporter = new OTLPLogExporter({ url: endpoint });
  const processor =
    options.processor === 'simple'
      ? new SimpleLogRecordProcessor({ exporter })
      : new BatchLogRecordProcessor({ exporter });
  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': options.service,
      ...(options.environment
        ? { 'deployment.environment.name': options.environment }
        : {}),
    }),
    processors: [processor],
  });
  const logger = loggerProvider.getLogger('@expo-50sdk-template/logging');

  return {
    emit(entry) {
      logger.emit({
        body: entry.event,
        severityNumber: severityNumbers[entry.level],
        severityText: entry.level.toUpperCase(),
        timestamp: toHrTime(entry.timestamp),
        attributes: toAttributes(entry),
      });
    },
    shutdown: () => loggerProvider.shutdown(),
  };
}
