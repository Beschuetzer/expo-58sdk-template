import type {
  CreateMeTimeInput,
  CreateRelationshipTaskInput,
  MeTimeListFilters,
  RelationshipTaskListFilters,
  UpdateRelationshipTaskInput,
  UpdateMeTimeInput,
} from '@expo-50sdk-template/shared-types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';

import { TimeDomainError, type TimeService } from './service';
import { requireOAuthScopes } from '../../auth/middleware';

const paginationFilterSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
const listFilterSchema = paginationFilterSchema
  .extend({
    startTimeFrom: z.string().datetime({ offset: true }).optional(),
    startTimeBefore: z.string().datetime({ offset: true }).optional(),
  })
  .superRefine((filters, context) => {
    if (
      filters.startTimeFrom &&
      filters.startTimeBefore &&
      new Date(filters.startTimeFrom).getTime() >=
        new Date(filters.startTimeBefore).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The start time range must be increasing.',
        path: ['startTimeBefore'],
      });
    }
  });

const taskListFilterSchema = paginationFilterSchema
  .extend({
    status: z.enum(['incomplete', 'completed']).optional(),
    dateFrom: z.string().datetime({ offset: true }).optional(),
    dateBefore: z.string().datetime({ offset: true }).optional(),
  })
  .superRefine((filters, context) => {
    if (
      filters.dateFrom &&
      filters.dateBefore &&
      new Date(filters.dateFrom).getTime() >=
        new Date(filters.dateBefore).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The task date range must be increasing.',
        path: ['dateBefore'],
      });
    }
  });

const createMeTimeSchema = z.object({
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  description: z.string().trim().max(2000).optional(),
});

const createTaskSchema = z.object({
  name: z.string().trim().min(1).max(160),
  dueDate: z.string().datetime({ offset: true }).optional(),
  reminderFrequencyDays: z.number().int().min(1).max(365).optional(),
  visibleToUserIds: z.array(z.string().trim().min(1)).optional(),
  completableByUserIds: z.array(z.string().trim().min(1)).optional(),
});

const updateTaskSchema = createTaskSchema.extend({
  visibleToUserIds: z.array(z.string().trim().min(1)).min(1),
  completableByUserIds: z.array(z.string().trim().min(1)).min(1),
});

function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new TimeDomainError(
      result.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return result.data;
}

function getUserId(request: Request) {
  const subject = request.auth?.payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new TimeDomainError('Authentication is required.', 401);
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

export function createTimeRouter(service: TimeService) {
  const router = Router();

  router.get(
    '/relationships/:relationshipId/me-time',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse<MeTimeListFilters>(listFilterSchema, request.query);
      response.json(
        await service.listMeTime(
          getUserId(request),
          request.params.relationshipId,
          filters,
        ),
      );
    }),
  );

  router.get(
    '/relationships/:relationshipId/me-time/:meTimeId',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getMeTimeById(
          getUserId(request),
          request.params.relationshipId,
          request.params.meTimeId,
        ),
      );
    }),
  );

  router.patch(
    '/relationships/:relationshipId/me-time/:meTimeId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<UpdateMeTimeInput>(createMeTimeSchema, request.body);
      response.json(
        await service.updateMeTime(
          getUserId(request),
          request.params.relationshipId,
          request.params.meTimeId,
          input,
        ),
      );
    }),
  );

  router.delete(
    '/relationships/:relationshipId/me-time/:meTimeId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      await service.deleteMeTime(
        getUserId(request),
        request.params.relationshipId,
        request.params.meTimeId,
      );
      response.status(204).end();
    }),
  );

  router.post(
    '/relationships/:relationshipId/me-time',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateMeTimeInput>(createMeTimeSchema, request.body);
      response
        .status(201)
        .json(
          await service.createMeTime(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  router.get(
    '/relationships/:relationshipId/tasks',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse<RelationshipTaskListFilters>(
        taskListFilterSchema,
        request.query,
      );
      response.json(
        await service.listTasks(
          getUserId(request),
          request.params.relationshipId,
          filters,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/tasks',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateRelationshipTaskInput>(
        createTaskSchema,
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createTask(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  router.get(
    '/relationships/:relationshipId/tasks/:taskId',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getTaskById(
          getUserId(request),
          request.params.relationshipId,
          request.params.taskId,
        ),
      );
    }),
  );

  router.patch(
    '/relationships/:relationshipId/tasks/:taskId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<UpdateRelationshipTaskInput>(
        updateTaskSchema,
        request.body,
      );
      response.json(
        await service.updateTask(
          getUserId(request),
          request.params.relationshipId,
          request.params.taskId,
          input,
        ),
      );
    }),
  );

  router.delete(
    '/relationships/:relationshipId/tasks/:taskId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      await service.deleteTask(
        getUserId(request),
        request.params.relationshipId,
        request.params.taskId,
      );
      response.status(204).end();
    }),
  );

  router.post(
    '/relationships/:relationshipId/tasks/:taskId/complete',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.completeTask(
          getUserId(request),
          request.params.relationshipId,
          request.params.taskId,
        ),
      );
    }),
  );

  return router;
}
