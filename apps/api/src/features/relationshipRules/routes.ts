import type {
  CreateRelationshipRuleInput,
  UpdateRelationshipRuleInput,
  RelationshipRuleListFilters,
} from '@expo-50sdk-template/shared-types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';

import {
  RelationshipRuleDomainError,
  type RelationshipRuleService,
} from './service';
import { requireOAuthScopes } from '../../auth/middleware';

const createRuleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  labels: z.array(z.string().trim().min(1).max(80)).optional(),
  description: z.string().trim().min(1).max(4000),
  remindMeToReview: z.string().datetime({ offset: true }).nullable().optional(),
  requiredApproverUserIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(100)
    .refine((userIds) => new Set(userIds).size === userIds.length, {
      message: 'A required approver may only be selected once.',
    }),
});

const updateRuleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  labels: z
    .array(z.string().trim().min(1).max(80))
    .optional()
    .refine(
      (labels) =>
        labels === undefined || new Set(labels).size === labels.length,
      { message: 'Labels must be unique.' },
    ),
  description: z.string().trim().min(1).max(4000),
});

const listFilterSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new RelationshipRuleDomainError(
      result.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return result.data;
}

function getUserId(request: Request) {
  const subject = request.auth?.payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new RelationshipRuleDomainError('Authentication is required.', 401);
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

export function createRelationshipRuleRouter(service: RelationshipRuleService) {
  const router = Router();

  router.get(
    '/relationships/:relationshipId/rules',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse<RelationshipRuleListFilters>(
        listFilterSchema,
        request.query,
      );
      response.json(
        await service.listRelationshipRules(
          getUserId(request),
          request.params.relationshipId,
          filters,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/rules',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateRelationshipRuleInput>(
        createRuleSchema,
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createRelationshipRule(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  router.get(
    '/relationship-rules/:ruleId',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getRelationshipRule(
          getUserId(request),
          request.params.ruleId,
        ),
      );
    }),
  );

  router.patch(
    '/relationship-rules/:ruleId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<UpdateRelationshipRuleInput>(
        updateRuleSchema,
        request.body,
      );
      response.json(
        await service.updateRelationshipRule(
          getUserId(request),
          request.params.ruleId,
          input,
        ),
      );
    }),
  );

  router.post(
    '/relationship-rules/:ruleId/agree',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.agreeToRelationshipRule(
          getUserId(request),
          request.params.ruleId,
        ),
      );
    }),
  );

  router.delete(
    '/relationship-rules/:ruleId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      await service.deleteRelationshipRule(
        getUserId(request),
        request.params.ruleId,
      );
      response.status(204).end();
    }),
  );

  return router;
}
