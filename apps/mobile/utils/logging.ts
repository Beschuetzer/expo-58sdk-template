import {
  createLogger,
  parseLogLevel,
  type LogFields,
  type LogLevel,
} from '@expo-50sdk-template/logging';

import { getIsDevelopmentMode } from './environment';
import { queueMobileLogEntry } from './mobileLogRelay';

const defaultLogLevel: LogLevel = getIsDevelopmentMode() ? 'debug' : 'warn';
const shouldRelayLogs =
  getIsDevelopmentMode() && Boolean(process.env.EXPO_PUBLIC_API_URL?.trim());

export const mobileLogger = createLogger({
  level: parseLogLevel(
    process.env.EXPO_PUBLIC_LOG_LEVEL,
    defaultLogLevel,
    'EXPO_PUBLIC_LOG_LEVEL',
  ),
  service: 'mobile',
  onLogEntry: shouldRelayLogs ? queueMobileLogEntry : undefined,
});

export function logDebug(event: string, fields: LogFields = {}): void {
  mobileLogger.debug(event, fields);
}

export function logInfo(event: string, fields: LogFields = {}): void {
  mobileLogger.info(event, fields);
}

export function logWarn(event: string, fields: LogFields = {}): void {
  mobileLogger.warn(event, fields);
}

export function logError(event: string, fields: LogFields = {}): void {
  mobileLogger.error(event, fields);
}

export function logWhenDevelopmentMode(
  ...args: Parameters<typeof console.log>
): void {
  if (getIsDevelopmentMode()) {
    logDebug('development_log', { values: args });
  }
}
