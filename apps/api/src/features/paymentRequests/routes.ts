import type {
  CreateInvitationInput,
  CreatePaymentRequestInput,
  CreateRelationshipInput,
  DecideRelationshipJoinRequestInput,
  DecidePaymentRequestInput,
  RegisterPushTokenInput,
  PaymentRequestListFilters,
  SubmitPaymentRequestInput,
  UpdatePaymentRequestInput,
  UnregisterPushTokenInput,
} from '@expo-50sdk-template/shared-types';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { z } from 'zod';

import {
  PaymentRequestDomainError,
  type PaymentRequestService,
} from './service';
import { requireOAuthScopes } from '../../auth/middleware';

const answerSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.array(z.string()),
]);
const evaluationSchema = z.object({
  rubricVersionId: z.string().min(1).optional(),
  answers: z.record(answerSchema),
  recommendation: z.string().max(1000).optional(),
  score: z.number().finite().optional(),
});
const splitSchema = z.object({
  memberUserId: z.string().min(1),
  percentage: z.number().finite().min(0).max(100),
});
const categoriesSchema = z.array(z.string().trim().min(1).max(80));
const createPaymentRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  rationale: z.string().trim().min(1).max(4000),
  amountMinorUnits: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  purchaseDate: z.string().datetime({ offset: true }),
  categories: categoriesSchema.optional(),
  requestedSplit: z.array(splitSchema).min(1),
  evaluation: evaluationSchema.optional(),
});
const updatePaymentRequestSchema = createPaymentRequestSchema;
const submitSchema = z.object({ evaluation: evaluationSchema });
const createInvitationSchema = z.object({
  inviteeEmail: z.string().trim().email().optional(),
});
const joinRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
});
const decideJoinRequestSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
});
const decideSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().trim().max(1000).optional(),
});
const pushTokenSchema = z
  .string()
  .trim()
  .max(512)
  .regex(/^(?:Expo|Exponent)PushToken\[[^\]\r\n]+\]$/);
const registerPushTokenSchema = z.object({
  token: pushTokenSchema,
  platform: z.enum(['ios', 'android']),
});
const unregisterPushTokenSchema = z.object({ token: pushTokenSchema });
const listFilterSchema = z.object({
  status: z
    .enum(['draft', 'pending_approval', 'approved', 'rejected', 'cancelled'])
    .optional(),
  awaitingMyDecision: z
    .union([z.literal('true'), z.literal('false')])
    .transform((value) => value === 'true')
    .optional(),
  categories: z.preprocess(
    (value) => (typeof value === 'string' ? [value] : value),
    categoriesSchema.optional(),
  ),
  fromDate: z.string().datetime({ offset: true }).optional(),
  toDate: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new PaymentRequestDomainError(
      result.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return result.data;
}

function getUserId(request: Request) {
  const subject = request.auth?.payload.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new PaymentRequestDomainError('Authentication is required.', 401);
  }
  return subject;
}

function getDisplayName(request: Request) {
  const payload = request.auth?.payload as Record<string, unknown>;
  for (const claim of ['name', 'preferred_username', 'email', 'nickname']) {
    const value = payload[claim];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next);
  };
}

export function createPaymentRequestRouter(service: PaymentRequestService) {
  const router = Router();

  router.get(
    '/relationships',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      response.json(await service.listRelationships(getUserId(request)));
    }),
  );

  router.post(
    '/relationships',
    requireOAuthScopes(['relationships:create']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateRelationshipInput>(
        z.object({
          name: z.string().trim().min(1).max(160),
          displayName: z.string().trim().min(1).max(160).optional(),
        }),
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createRelationship(
            getUserId(request),
            input,
            getDisplayName(request) ?? input.displayName,
          ),
        );
    }),
  );

  router.delete(
    '/relationships/:relationshipId',
    requireOAuthScopes(['relationships:create']),
    asyncRoute(async (request, response) => {
      await service.deleteRelationship(
        getUserId(request),
        request.params.relationshipId,
      );
      response.status(204).end();
    }),
  );

  router.get(
    '/relationships/search',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      const query = parse<string>(
        z.string().trim().min(2).max(80),
        request.query.q,
      );
      response.json(
        await service.searchRelationships(getUserId(request), query),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/join-requests',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      const input = parse<{ displayName?: string }>(
        joinRequestSchema,
        request.body ?? {},
      );
      response
        .status(201)
        .json(
          await service.requestToJoin(
            getUserId(request),
            request.params.relationshipId,
            getDisplayName(request) ?? input.displayName,
          ),
        );
    }),
  );

  router.get(
    '/relationships/:relationshipId/join-requests',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.listJoinRequests(
          getUserId(request),
          request.params.relationshipId,
        ),
      );
    }),
  );

  router.get(
    '/relationships/:relationshipId/join-requests/:requestId',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getJoinRequest(
          getUserId(request),
          request.params.relationshipId,
          request.params.requestId,
        ),
      );
    }),
  );

  router.delete(
    '/relationships/:relationshipId/join-requests/:requestId',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      await service.deleteJoinRequest(
        getUserId(request),
        request.params.relationshipId,
        request.params.requestId,
      );
      response.status(204).end();
    }),
  );

  router.post(
    '/relationships/:relationshipId/join-requests/:requestId/decision',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      const input = parse<DecideRelationshipJoinRequestInput>(
        decideJoinRequestSchema,
        request.body,
      );
      response.json(
        await service.decideJoinRequest(
          getUserId(request),
          request.params.relationshipId,
          request.params.requestId,
          input,
        ),
      );
    }),
  );

  router.get(
    '/relationships/:relationshipId/members',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.listMembers(
          getUserId(request),
          request.params.relationshipId,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/invitations',
    requireOAuthScopes(['relationships:invite']),
    asyncRoute(async (request, response) => {
      const input = parse<CreateInvitationInput>(
        createInvitationSchema,
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createInvitation(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  router.get(
    '/invitations/:token',
    requireOAuthScopes(['relationships:accept-invite']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getInvitation(getUserId(request), request.params.token),
      );
    }),
  );

  router.post(
    '/invitations/:token/accept',
    requireOAuthScopes(['relationships:accept-invite']),
    asyncRoute(async (request, response) => {
      const input = parse<{ displayName?: string }>(
        z.object({
          displayName: z.string().trim().min(1).max(160).optional(),
        }),
        request.body ?? {},
      );
      response.json(
        await service.acceptInvitation(
          getUserId(request),
          request.params.token,
          getDisplayName(request) ?? input.displayName,
        ),
      );
    }),
  );

  router.post(
    '/invitations/:invitationId/revoke',
    requireOAuthScopes(['relationships:invite']),
    asyncRoute(async (request, response) => {
      await service.revokeInvitation(
        getUserId(request),
        request.params.invitationId,
      );
      response.status(204).end();
    }),
  );

  router.get(
    '/relationships/:relationshipId/rubric',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getRubric(
          getUserId(request),
          request.params.relationshipId,
        ),
      );
    }),
  );

  router.get(
    '/relationships/:relationshipId/payment-requests',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      const filters = parse<PaymentRequestListFilters>(
        listFilterSchema,
        request.query,
      );
      response.json(
        await service.listPaymentRequests(
          getUserId(request),
          request.params.relationshipId,
          filters,
        ),
      );
    }),
  );

  router.post(
    '/relationships/:relationshipId/payment-requests',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<CreatePaymentRequestInput>(
        createPaymentRequestSchema,
        request.body,
      );
      response
        .status(201)
        .json(
          await service.createPaymentRequest(
            getUserId(request),
            request.params.relationshipId,
            input,
          ),
        );
    }),
  );

  router.get(
    '/payment-requests/:paymentRequestId',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.getPaymentRequest(
          getUserId(request),
          request.params.paymentRequestId,
        ),
      );
    }),
  );

  router.put(
    '/payment-requests/:paymentRequestId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<UpdatePaymentRequestInput>(
        updatePaymentRequestSchema,
        request.body,
      );
      response.json(
        await service.updatePaymentRequest(
          getUserId(request),
          request.params.paymentRequestId,
          input,
        ),
      );
    }),
  );

  router.delete(
    '/payment-requests/:paymentRequestId',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      await service.deletePaymentRequest(
        getUserId(request),
        request.params.paymentRequestId,
      );
      response.status(204).end();
    }),
  );

  router.post(
    '/payment-requests/:paymentRequestId/submit',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<SubmitPaymentRequestInput>(
        submitSchema,
        request.body,
      );
      response.json(
        await service.submitPaymentRequest(
          getUserId(request),
          request.params.paymentRequestId,
          input,
        ),
      );
    }),
  );

  router.post(
    '/payment-requests/:paymentRequestId/decisions',
    requireOAuthScopes(['payment-requests:write']),
    asyncRoute(async (request, response) => {
      const input = parse<DecidePaymentRequestInput>(
        decideSchema,
        request.body,
      );
      response.json(
        await service.decidePaymentRequest(
          getUserId(request),
          request.params.paymentRequestId,
          input,
        ),
      );
    }),
  );

  router.post(
    '/payment-requests/:paymentRequestId/cancel',
    requireOAuthScopes(['payment-requests:read']),
    asyncRoute(async (request, response) => {
      response.json(
        await service.cancelPaymentRequest(
          getUserId(request),
          request.params.paymentRequestId,
        ),
      );
    }),
  );

  router.get(
    '/payment-requests/:paymentRequestId/activity',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      const paymentRequest = await service.getPaymentRequest(
        getUserId(request),
        request.params.paymentRequestId,
      );
      response.json(paymentRequest.activity);
    }),
  );

  router.get(
    '/notifications',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      response.json(await service.listNotifications(getUserId(request)));
    }),
  );

  router.post(
    '/notifications/push-tokens',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      const input = parse<RegisterPushTokenInput>(
        registerPushTokenSchema,
        request.body,
      );
      await service.registerPushToken(getUserId(request), input);
      response.status(204).end();
    }),
  );

  router.post(
    '/notifications/push-tokens/unregister',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      const input = parse<UnregisterPushTokenInput>(
        unregisterPushTokenSchema,
        request.body,
      );
      await service.unregisterPushToken(getUserId(request), input.token);
      response.status(204).end();
    }),
  );

  router.post(
    '/notifications/:notificationId/read',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      await service.markNotificationRead(
        getUserId(request),
        request.params.notificationId,
      );
      response.status(204).end();
    }),
  );

  router.post(
    '/notifications/:notificationId/complete',
    requireOAuthScopes(['relationships:read']),
    asyncRoute(async (request, response) => {
      await service.completeNotification(
        getUserId(request),
        request.params.notificationId,
      );
      response.status(204).end();
    }),
  );

  return router;
}
