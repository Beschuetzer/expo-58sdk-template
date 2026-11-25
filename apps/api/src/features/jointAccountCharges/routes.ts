import type {
  CreateJointAccountChargeInput,
  JointAccountChargeListFilters,
  UpdateJointAccountChargeInput,
} from '@expo-50sdk-template/shared-types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';

import {
  JointAccountChargeDomainError,
  type JointAccountChargeService,
} from './service';
import { requireOAuthScopes } from '../../auth/middleware';

const createChargeSchema = z.object({
  name: z.string().trim().min(1).max(160),
  amountMinorUnits: z.number().int().positive().max(2_147_483_647),
});

const updateChargeSchema = createChargeSchema.extend({
  chargeDate: z.string().datetime({ offset: true }),
});

const listFilterSchema = z
  .object({
    name: z.string().trim().max(160).optional(),
    status: z.enum(['unpaid', 'paid']).optional(),
    createdByUserId: z.string().min(1).optional(),
    minimumAmountMinorUnits: z.coerce
      .number()
      .int()
      .nonnegative()
      .max(2_147_483_647)
      .optional(),
    maximumAmountMinorUnits: z.coerce
      .number()
      .int()
      .nonnegative()
      .max(2_147_483_647)
      .optional(),
    fromDate: z.string().datetime({ offset: true }).optional(),
    toDate: z.string().datetime({ offset: true }).optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .superRefine((filters, context) => {
    if (
      filters.minimumAmountMinorUnits !== undefined &&
      filters.maximumAmountMinorUnits !== undefined &&
      filters.minimumAmountMinorUnits > filters.maximumAmountMinorUnits
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The minimum amount must not exceed the maximum amount.',
      });
    }
    if (
      filters.fromDate &&
      filters.toDate &&
      new Date(filters.fromDate).getTime() > new Date(filters.toDate).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The start date must not be later than the end date.',
      });
    }
  });

function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new JointAccountChargeDomainError(
      result.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return result.data;
}

function getUserId(request: Request) {
  const subject = request.auth?.payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new JointAccountChargeDomainError('Authentication is required.', 401);
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

export function createJointAccountChargeRouter(
  service: JointAccountChargeService,
) {
  const router = Router();

  router.get(
    '/relationships/:relationshipId/joint-account-charges',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse<JointAccountChargeListFilters>(
        listFilterSchema,
        request.query,
      );
      response.json(
        await service.listCharges(
          getUserId(request),
          request.params.relationshipId,
          filters,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/joint-account-charges/mark-all-paid',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.markAllChargesPaid(
          getUserId(request),
          request.params.relationshipId,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/joint-account-charges',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateJointAccountChargeInput>(
        createChargeSchema,
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createCharge(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  router.get(
    '/joint-account-charges/:chargeId',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getCharge(getUserId(request), request.params.chargeId),
      );
    }),
  );

  router.delete(
    '/joint-account-charges/:chargeId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      await service.deleteCharge(getUserId(request), request.params.chargeId);
      response.status(204).end();
    }),
  );

  router.post(
    '/joint-account-charges/:chargeId/update',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<UpdateJointAccountChargeInput>(
        updateChargeSchema,
        request.body,
      );
      response.json(
        await service.updateCharge(
          getUserId(request),
          request.params.chargeId,
          input,
        ),
      );
    }),
  );

  router.post(
    '/joint-account-charges/:chargeId/mark-paid',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.markChargePaid(
          getUserId(request),
          request.params.chargeId,
        ),
      );
    }),
  );

  return router;
}
