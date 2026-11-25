import { Prisma, PrismaClient } from '@prisma/client';

import { logDebug, logError, logInfo, logWarn } from '../logging';

type PrismaLogLevel = 'query' | 'error' | 'warn';
type LoggingPrismaClient = PrismaClient<
  Prisma.PrismaClientOptions,
  PrismaLogLevel
>;

const globalForPrisma = globalThis as unknown as {
  prisma?: LoggingPrismaClient;
};

export const prisma: LoggingPrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient<Prisma.PrismaClientOptions, PrismaLogLevel>({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ],
  });

prisma.$on('query', (event) => {
  logDebug('database_query_completed', {
    durationMs: event.duration,
    target: event.target,
  });
});
prisma.$on('warn', (event) => {
  logWarn('database_client_warning', { target: event.target });
});
prisma.$on('error', (event) => {
  logError('database_client_error', { target: event.target });
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectPrisma(databaseUrl?: string) {
  if (!databaseUrl) {
    logInfo('database_connection_skipped', {
      reason: 'DATABASE_URL is not configured',
    });
    return false;
  }

  try {
    const startedAt = Date.now();
    await prisma.$connect();
    logInfo('database_connected', {
      durationMs: Date.now() - startedAt,
      provider: 'mongodb',
    });
    return true;
  } catch (error) {
    logError('database_connection_failed', {
      error,
      provider: 'mongodb',
    });
    return false;
  }
}

export default prisma;
