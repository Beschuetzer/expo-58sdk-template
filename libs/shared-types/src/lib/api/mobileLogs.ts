export type MobileLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type MobileLogEntry = {
  timestamp: string;
  service: 'mobile';
  level: MobileLogLevel;
  event: string;
  [key: string]: unknown;
};

export type MobileLogBatchRequest = {
  entries: MobileLogEntry[];
};

export type MobileLogBatchResponse = {
  accepted: number;
};
