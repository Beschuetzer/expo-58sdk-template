import type {
  CreateBudgetInput,
  CreateBudgetItemInput,
  UpdateBudgetInput,
} from '@expo-50sdk-template/shared-types';
import { CURRENCY_CODES } from '@expo-50sdk-template/shared-types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';

import { BudgetDomainError, type BudgetService } from './service';
import { requireOAuthScopes } from '../../auth/middleware';

const budgetSchema = z.object({
  name: z.string().trim().min(1).max(160),
  amountMinorUnits: z.number().int().positive().max(2_147_483_647),
  currency: z
    .enum(CURRENCY_CODES, {
      errorMap: () => ({ message: 'The budget currency is invalid.' }),
    })
    .default('USD'),
  period: z.enum(['monthly', 'quarterly', 'yearly']),
  requiredApproverUserIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(100)
    .refine((userIds) => new Set(userIds).size === userIds.length, {
      message: 'A required approver may only be selected once.',
    }),
});
const budgetUpdateSchema = budgetSchema.omit({ currency: true });

function isValidDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const budgetItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  amountMinorUnits: z.number().int().positive().max(2_147_483_647),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isValidDateOnly, {
      message: 'The item date must be a valid calendar date.',
    }),
});

function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BudgetDomainError(
      result.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return result.data;
}

function getUserId(request: Request) {
  const subject = request.auth?.payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new BudgetDomainError('Authentication is required.', 401);
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

export function createBudgetRouter(service: BudgetService) {
  const router = Router();

  router.get(
    '/relationships/:relationshipId/budgets',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.listBudgets(
          getUserId(request),
          request.params.relationshipId,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/budgets',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateBudgetInput>(budgetSchema, request.body);
      response
        .status(201)
        .json(
          await service.createBudget(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  router.get(
    '/budgets/:budgetId',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getBudget(getUserId(request), request.params.budgetId),
      );
    }),
  );

  router.patch(
    '/budgets/:budgetId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<UpdateBudgetInput>(budgetUpdateSchema, request.body);
      response.json(
        await service.updateBudget(
          getUserId(request),
          request.params.budgetId,
          input,
        ),
      );
    }),
  );

  router.post(
    '/budgets/:budgetId/approval',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.approveBudget(
          getUserId(request),
          request.params.budgetId,
        ),
      );
    }),
  );

  router.post(
    '/budgets/:budgetId/items',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateBudgetItemInput>(
        budgetItemSchema,
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createBudgetItem(
            getUserId(request),
            request.params.budgetId,
            input,
          ),
        );
    }),
  );

  router.delete(
    '/budgets/:budgetId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      await service.deleteBudget(getUserId(request), request.params.budgetId);
      response.status(204).end();
    }),
  );

  return router;
}
