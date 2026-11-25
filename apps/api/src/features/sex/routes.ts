import type {
  CreateSexEventInput,
  FlipSexCoinInput,
} from '@expo-50sdk-template/shared-types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';

import { SexDomainError, type SexService } from './service';
import { requireOAuthScopes } from '../../auth/middleware';

const selectedMembersSchema = z.array(z.string().trim().min(1)).min(2);
const todaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
const statusQuerySchema = z.object({
  today: todaySchema,
  memberUserIds: z.preprocess(
    (value) =>
      value === undefined ? undefined : Array.isArray(value) ? value : [value],
    selectedMembersSchema.optional(),
  ),
});
const eventListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

const flipCoinSchema = z.object({
  memberUserIds: selectedMembersSchema,
  guess: z.enum(['heads', 'tails']),
  today: todaySchema,
});

const createEventSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memberUserIds: selectedMembersSchema,
  today: todaySchema,
});

const todayQuerySchema = z.object({
  today: todaySchema,
});

function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new SexDomainError(
      result.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return result.data;
}

function getUserId(request: Request) {
  const subject = request.auth?.payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new SexDomainError('Authentication is required.', 401);
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

export function createSexRouter(
  service: SexService,
  options: { enableDevelopmentCoinFlipReset?: boolean } = {},
) {
  const router = Router();

  router.get(
    '/relationships/:relationshipId/sex/status',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse(statusQuerySchema, request.query);
      response.json(
        await service.getDailyStatus(
          getUserId(request),
          request.params.relationshipId,
          filters.memberUserIds,
          filters.today,
        ),
      );
    }),
  );

  router.get(
    '/relationships/:relationshipId/sex/events',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse(eventListQuerySchema, request.query);
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
    '/relationships/:relationshipId/sex/coin-flips',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<FlipSexCoinInput>(flipCoinSchema, request.body);
      response.json(
        await service.flipCoin(
          getUserId(request),
          request.params.relationshipId,
          input,
        ),
      );
    }),
  );

  if (options.enableDevelopmentCoinFlipReset) {
    router.delete(
      '/relationships/:relationshipId/sex/coin-flips/today',
      requireOAuthScopes(['payment-requests:write']),
      asyncRoute(async (request, response) => {
        const filters = parse(todayQuerySchema, request.query);
        await service.resetDailyCoinFlip(
          getUserId(request),
          request.params.relationshipId,
          filters.today,
        );
        response.status(204).end();
      }),
    );
  }

  router.post(
    '/relationships/:relationshipId/sex/events',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateSexEventInput>(createEventSchema, request.body);
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
