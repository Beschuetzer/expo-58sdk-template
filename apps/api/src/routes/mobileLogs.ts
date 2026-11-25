import { Router } from 'express';
import { z } from 'zod';

import { logMobileEntry } from '../logging';

const mobileLogEntrySchema = z
  .object({
    timestamp: z.string().datetime(),
    service: z.literal('mobile'),
    level: z.enum(['debug', 'info', 'warn', 'error']),
    event: z.string().min(1).max(200),
  })
  .passthrough();

const mobileLogBatchSchema = z.object({
  entries: z.array(mobileLogEntrySchema).min(1).max(25),
});

const reservedFields = new Set(['event', 'level', 'service', 'timestamp']);

export function createMobileLogsRouter() {
  const router = Router();

  router.post('/telemetry/logs', (request, response) => {
    const batch = mobileLogBatchSchema.safeParse(request.body);
    if (!batch.success) {
      response.status(400).json({
        message: 'A valid mobile log batch is required.',
        status: 'invalid_request',
      });
      return;
    }

    for (const entry of batch.data.entries) {
      const fields = Object.fromEntries(
        Object.entries(entry).filter(([key]) => !reservedFields.has(key)),
      );
      logMobileEntry(entry.level, entry.event, {
        clientTimestamp: entry.timestamp,
        ...fields,
      });
    }

    response.status(202).json({ accepted: batch.data.entries.length });
  });

  return router;
}
