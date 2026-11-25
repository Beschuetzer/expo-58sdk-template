import {
  createLogger,
  createOtlpLogSink,
  parseLogLevel,
  type LogFields,
  type LogLevel,
} from '@expo-50sdk-template/logging';
import type { MobileLogLevel } from '@expo-50sdk-template/shared-types';

const otlpEndpoint =
  process.env.NODE_ENV === 'development'
    ? process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT?.trim()
    : undefined;
const apiOtlpLogSink = otlpEndpoint
  ? createOtlpLogSink({
      endpoint: otlpEndpoint,
      service: 'api',
      environment: process.env.NODE_ENV,
    })
  : undefined;
const mobileOtlpLogSink = otlpEndpoint
  ? createOtlpLogSink({
      endpoint: otlpEndpoint,
      service: 'mobile',
      environment: process.env.NODE_ENV,
    })
  : undefined;
const mobileLogger = createLogger({
  level: 'debug',
  service: 'mobile',
  onLogEntry: mobileOtlpLogSink?.emit,
});

function createApiLogger(level: LogLevel) {
  return createLogger({
    level,
    service: 'api',
    onLogEntry: apiOtlpLogSink?.emit,
  });
}

let apiLogger = createApiLogger(
  parseLogLevel(
    process.env.LOG_LEVEL,
    process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ),
);

export function configureApiLogging(level: LogLevel): void {
  apiLogger = createApiLogger(level);
}

export async function shutdownApiLogging(): Promise<void> {
  await Promise.all([
    apiOtlpLogSink?.shutdown(),
    mobileOtlpLogSink?.shutdown(),
  ]);
}

export function logMobileEntry(
  level: MobileLogLevel,
  event: string,
  fields: LogFields,
): void {
  mobileLogger[level](event, fields);
}

export function logDebug(event: string, fields: LogFields = {}): void {
  apiLogger.debug(event, fields);
}

export function logInfo(event: string, fields: LogFields = {}): void {
  apiLogger.info(event, fields);
}

export function logWarn(event: string, fields: LogFields = {}): void {
  apiLogger.warn(event, fields);
}

export function logError(event: string, fields: LogFields = {}): void {
  apiLogger.error(event, fields);
}
