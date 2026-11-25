import { createLogger, parseLogLevel } from '@expo-50sdk-template/logging';
import { PrismaClient } from '@prisma/client';

import { seedExamples } from './seed-examples';

const logger = createLogger({
  level: parseLogLevel(
    process.env.LOG_LEVEL,
    process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ),
  service: 'api-seed',
});

async function seedDevelopmentExamples() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'Development seed refused: NODE_ENV must be exactly "development".',
    );
  }

  const database = new PrismaClient();
  try {
    const exampleCount = await seedExamples(database);
    logger.info('example_seed_completed', { exampleCount });
  } finally {
    await database.$disconnect();
  }
}

seedDevelopmentExamples().catch((error: unknown) => {
  logger.error('example_seed_failed', { error });
  process.exitCode = 1;
});
