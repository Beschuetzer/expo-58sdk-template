type LogFields = Record<string, unknown>;

function writeLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  event: string,
  fields: LogFields = {},
) {
  console[level](`[mobile] ${event}`, fields);
}

export function logDebug(event: string, fields?: LogFields) {
  writeLog('debug', event, fields);
}

export function logInfo(event: string, fields?: LogFields) {
  writeLog('info', event, fields);
}

export function logWarn(event: string, fields?: LogFields) {
  writeLog('warn', event, fields);
}

export function logError(event: string, fields?: LogFields) {
  writeLog('error', event, fields);
}
