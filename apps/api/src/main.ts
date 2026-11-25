import { loadConfig } from './config/env';
import prisma, { connectPrisma } from './lib/prisma';
import { logError, logInfo, shutdownApiLogging } from './logging';
import { createApiServer, startApiServer, stopApiServer } from './server';

const config = loadConfig();
const server = startApiServer(createApiServer(config), config);
connectPrisma(config.databaseUrl).catch((error: unknown) => {
  logError('database_connection_unexpected_failure', { error });
});

function shutdown(signal: string) {
  logInfo('api_shutdown_started', { signal });
  stopApiServer(server)
    .then(() => prisma.$disconnect())
    .then(() => shutdownApiLogging())
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      logError('api_shutdown_failed', { error });
      process.exit(1);
    });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
