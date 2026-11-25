import type {
  CreateDateNightEventInput,
  DateNightEventListFilters,
} from '@expo-50sdk-template/shared-types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';

import {
  DateNightDomainError,
  MAX_DATE_NIGHT_DESCRIPTION_LENGTH,
  type DateNightService,
} from './service';
import { requireOAuthScopes } from '../../auth/middleware';

const todaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

const eventListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

const createEventSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z
    .string()
    .trim()
    .max(MAX_DATE_NIGHT_DESCRIPTION_LENGTH)
    .optional(),
  today: todaySchema,
});

function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new DateNightDomainError(
      result.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return result.data;
}

function getUserId(request: Request) {
  const subject = request.auth?.payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new DateNightDomainError('Authentication is required.', 401);
  }
  return subject;
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next);
  };
}

export function createDateNightRouter(service: DateNightService) {
  const router = Router();

  router.get(
    '/relationships/:relationshipId/date-nights/events',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse<DateNightEventListFilters>(
        eventListQuerySchema,
        request.query,
      );
      response.json(
        await service.getEvents(
          getUserId(request),
          request.params.relationshipId,
          filters,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/date-nights/events',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateDateNightEventInput>(
        createEventSchema,
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createEvent(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  return router;
}
