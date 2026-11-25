import type {
  AcceptInvitationResponse,
  ActivityEvent,
  CreateInvitationInput,
  CreateInvitationResponse,
  CreatePaymentRequestInput,
  CreateRelationshipInput,
  DecideRelationshipJoinRequestInput,
  DecidePaymentRequestInput,
  NotificationListResponse,
  PaymentRequest,
  PaymentRequestListFilters,
  PaymentRequestListResponse,
  PaymentRequestSummary,
  RegisterPushTokenInput,
  RelationshipMember,
  RelationshipJoinRequest,
  InvitationPreview,
  RelationshipSearchResult,
  RelationshipSummary,
  RubricVersion,
  SubmitPaymentRequestInput,
  UpdatePaymentRequestInput,
} from '@expo-50sdk-template/shared-types';
import {
  Prisma,
  PrismaClient,
  type PaymentRequest as PrismaPaymentRequest,
  type RelationshipJoinRequest as PrismaRelationshipJoinRequest,
  type RelationshipMember as PrismaRelationshipMember,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { DEFAULT_RUBRIC_QUESTIONS } from './defaultRubric';
import {
  mapNotificationTarget,
  PrismaNotificationService,
} from '../notifications/notificationService';

export class PaymentRequestDomainError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'PaymentRequestDomainError';
    this.statusCode = statusCode;
  }
}

export type PaymentRequestService = {
  listRelationships(userId: string): Promise<RelationshipSummary[]>;
  searchRelationships(
    userId: string,
    query: string,
  ): Promise<RelationshipSearchResult[]>;
  createRelationship(
    userId: string,
    input: CreateRelationshipInput,
    displayName?: string,
  ): Promise<RelationshipSummary>;
  deleteRelationship(userId: string, relationshipId: string): Promise<void>;
  listMembers(
    userId: string,
    relationshipId: string,
  ): Promise<RelationshipMember[]>;
  requestToJoin(
    userId: string,
    relationshipId: string,
    displayName?: string,
  ): Promise<RelationshipJoinRequest>;
  listJoinRequests(
    userId: string,
    relationshipId: string,
  ): Promise<RelationshipJoinRequest[]>;
  getJoinRequest(
    userId: string,
    relationshipId: string,
    requestId: string,
  ): Promise<RelationshipJoinRequest>;
  deleteJoinRequest(
    userId: string,
    relationshipId: string,
    requestId: string,
  ): Promise<void>;
  decideJoinRequest(
    userId: string,
    relationshipId: string,
    requestId: string,
    input: DecideRelationshipJoinRequestInput,
  ): Promise<RelationshipJoinRequest>;
  createInvitation(
    userId: string,
    relationshipId: string,
    input: CreateInvitationInput,
  ): Promise<CreateInvitationResponse>;
  getInvitation(userId: string, token: string): Promise<InvitationPreview>;
  acceptInvitation(
    userId: string,
    token: string,
    displayName?: string,
  ): Promise<AcceptInvitationResponse>;
  revokeInvitation(userId: string, invitationId: string): Promise<void>;
  getRubric(userId: string, relationshipId: string): Promise<RubricVersion>;
  listPaymentRequests(
    userId: string,
    relationshipId: string,
    filters: PaymentRequestListFilters,
  ): Promise<PaymentRequestListResponse>;
  createPaymentRequest(
    userId: string,
    relationshipId: string,
    input: CreatePaymentRequestInput,
  ): Promise<PaymentRequest>;
  getPaymentRequest(
    userId: string,
    paymentRequestId: string,
  ): Promise<PaymentRequest>;
  updatePaymentRequest(
    userId: string,
    paymentRequestId: string,
    input: UpdatePaymentRequestInput,
  ): Promise<PaymentRequest>;
  submitPaymentRequest(
    userId: string,
    paymentRequestId: string,
    input: SubmitPaymentRequestInput,
  ): Promise<PaymentRequest>;
  decidePaymentRequest(
    userId: string,
    paymentRequestId: string,
    input: DecidePaymentRequestInput,
  ): Promise<PaymentRequest>;
  deletePaymentRequest(userId: string, paymentRequestId: string): Promise<void>;
  cancelPaymentRequest(
    userId: string,
    paymentRequestId: string,
  ): Promise<PaymentRequest>;
  registerPushToken(
    userId: string,
    input: RegisterPushTokenInput,
  ): Promise<void>;
  unregisterPushToken(userId: string, token: string): Promise<void>;
  listNotifications(userId: string): Promise<NotificationListResponse>;
  markNotificationRead(userId: string, notificationId: string): Promise<void>;
  completeNotification(userId: string, notificationId: string): Promise<void>;
};

type PaymentRequestWithDetails = Prisma.PaymentRequestGetPayload<{
  include: {
    evaluation: true;
    decisions: true;
    activity: true;
  };
}>;

type PrismaInvitationWithRelationship =
  Prisma.RelationshipInvitationGetPayload<{
    include: { relationship: true };
  }>;

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const MAX_PAGE_SIZE = 100;
const MAX_JOINT_ACCOUNT_CHARGE_NAME_LENGTH = 160;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHARE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SEARCH_RESULT_LIMIT = 25;

function asObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asSplit(value: Prisma.JsonValue): PaymentRequest['requestedSplit'] {
  if (!Array.isArray(value)) return [];
  return value as PaymentRequest['requestedSplit'];
}

function asAnswers(value: Prisma.JsonValue) {
  return asObject(value) as NonNullable<
    PaymentRequest['evaluation']
  >['answers'];
}

function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function generateShareCode() {
  return Array.from(randomBytes(8), (byte) =>
    SHARE_CODE_ALPHABET.charAt(byte % SHARE_CODE_ALPHABET.length),
  ).join('');
}

function normalizeEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase();
  if (!email) return undefined;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new PaymentRequestDomainError('inviteeEmail must be a valid email.');
  }
  return email;
}

function normalizeDisplayName(value: string | undefined) {
  const displayName = value?.trim();
  return displayName ? displayName.slice(0, 160) : undefined;
}

function dateString(value: Date | null | undefined) {
  return value?.toISOString();
}

function requireText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PaymentRequestDomainError(`${field} is required.`);
  }
  if (value.trim().length > maxLength) {
    throw new PaymentRequestDomainError(`${field} is too long.`);
  }
  return value.trim();
}

function normalizeCategories(categories: string[] | undefined) {
  return [
    ...new Set(
      (categories ?? []).map((category) =>
        requireText(category, 'category', 80),
      ),
    ),
  ];
}

function requireUserId(userId: string) {
  if (!userId.trim()) {
    throw new PaymentRequestDomainError('Authenticated user is required.', 401);
  }
}

function validateRequestInput(input: CreatePaymentRequestInput) {
  const categories = normalizeCategories(input.categories);
  requireText(input.title, 'title', 160);
  requireText(input.rationale, 'rationale', 4000);
  if (
    !Number.isInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0
  ) {
    throw new PaymentRequestDomainError(
      'amountMinorUnits must be a positive integer.',
    );
  }
  if (!CURRENCY_PATTERN.test(input.currency)) {
    throw new PaymentRequestDomainError(
      'currency must be a three-letter uppercase code.',
    );
  }
  if (!Number.isFinite(Date.parse(input.purchaseDate))) {
    throw new PaymentRequestDomainError('purchaseDate must be an ISO date.');
  }
  if (
    !Array.isArray(input.requestedSplit) ||
    input.requestedSplit.length === 0
  ) {
    throw new PaymentRequestDomainError('requestedSplit is required.');
  }

  const memberIds = new Set<string>();
  const splitTotal = input.requestedSplit.reduce((total, allocation) => {
    if (!allocation.memberUserId || memberIds.has(allocation.memberUserId)) {
      throw new PaymentRequestDomainError(
        'requestedSplit must contain unique member IDs.',
      );
    }
    memberIds.add(allocation.memberUserId);
    if (
      !Number.isFinite(allocation.percentage) ||
      allocation.percentage < 0 ||
      allocation.percentage > 100
    ) {
      throw new PaymentRequestDomainError(
        'requestedSplit percentages must be between 0 and 100.',
      );
    }
    return total + allocation.percentage;
  }, 0);

  if (Math.abs(splitTotal - 100) > 0.001) {
    throw new PaymentRequestDomainError(
      'requestedSplit percentages must total 100.',
    );
  }
  return categories;
}

function validateEvaluation(
  evaluation: NonNullable<CreatePaymentRequestInput['evaluation']>,
  questions: unknown,
  requireRequiredAnswers = true,
) {
  if (!evaluation || typeof evaluation.answers !== 'object') {
    throw new PaymentRequestDomainError('evaluation answers are required.');
  }

  const rubricQuestions = Array.isArray(questions) ? questions : [];
  const questionIds = new Set(
    rubricQuestions
      .filter((question): question is { id: string } => {
        return Boolean(
          question &&
            typeof question === 'object' &&
            'id' in question &&
            typeof question.id === 'string',
        );
      })
      .map((question) => question.id),
  );

  for (const answerId of Object.keys(evaluation.answers)) {
    if (!questionIds.has(answerId)) {
      throw new PaymentRequestDomainError(
        `Unknown rubric question: ${answerId}.`,
      );
    }
  }

  for (const question of rubricQuestions) {
    if (
      requireRequiredAnswers &&
      question &&
      typeof question === 'object' &&
      'id' in question &&
      question.id !== 'benefit_level' &&
      'required' in question &&
      question.required === true &&
      !((question.id as string) in evaluation.answers)
    ) {
      throw new PaymentRequestDomainError(
        `Answer required for rubric question: ${question.id}.`,
      );
    }
  }
}

function mapMember(member: PrismaRelationshipMember): RelationshipMember {
  return {
    id: member.id,
    relationshipId: member.relationshipId,
    userId: member.userId,
    displayName: member.displayName ?? undefined,
    role: member.role,
    active: member.active,
  };
}

function mapJoinRequest(
  request: PrismaRelationshipJoinRequest,
): RelationshipJoinRequest {
  return {
    id: request.id,
    relationshipId: request.relationshipId,
    requesterUserId: request.requesterUserId,
    requesterDisplayName: request.requesterDisplayName ?? undefined,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    respondedAt: request.respondedAt?.toISOString(),
    respondedByUserId: request.respondedByUserId ?? undefined,
  };
}

type RelationshipWithMembers = Prisma.RelationshipGetPayload<{
  include: { members: true };
}>;

function mapRelationshipSummary(
  relationship: RelationshipWithMembers,
  shareCode: string,
  pendingJoinRequestCount = 0,
): RelationshipSummary {
  return {
    id: relationship.id,
    name: relationship.name,
    shareCode,
    approvalPolicy: relationship.approvalPolicy,
    members: relationship.members.map(mapMember),
    pendingJoinRequestCount,
    createdAt: relationship.createdAt.toISOString(),
    updatedAt: relationship.updatedAt.toISOString(),
  };
}

function mapInvitation(
  invitation: PrismaInvitationWithRelationship,
): InvitationPreview {
  return {
    id: invitation.id,
    relationshipId: invitation.relationshipId,
    relationshipName: invitation.relationship.name,
    inviterUserId: invitation.inviterUserId,
    inviteeEmail: invitation.inviteeEmail ?? undefined,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString(),
  };
}

function mapSummary(request: PrismaPaymentRequest): PaymentRequestSummary {
  return {
    id: request.id,
    relationshipId: request.relationshipId,
    createdByUserId: request.createdByUserId,
    title: request.title,
    amountMinorUnits: request.amountMinorUnits,
    currency: request.currency,
    purchaseDate: request.purchaseDate.toISOString(),
    categories: request.categories,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function mapDetails(request: PaymentRequestWithDetails): PaymentRequest {
  return {
    ...mapSummary(request),
    rationale: request.rationale,
    requestedSplit: asSplit(request.requestedSplit),
    evaluation: request.evaluation
      ? {
          rubricVersionId: request.evaluation.rubricVersionId,
          answers: asAnswers(request.evaluation.answers),
          recommendation: request.evaluation.recommendation ?? undefined,
          score: request.evaluation.score ?? undefined,
        }
      : undefined,
    decisions: request.decisions.map((decision) => ({
      id: decision.id,
      memberUserId: decision.memberUserId,
      decision: decision.decision,
      comment: decision.comment ?? undefined,
      createdAt: decision.createdAt.toISOString(),
    })),
    activity: request.activity
      .sort(
        (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
      )
      .map(
        (event): ActivityEvent => ({
          id: event.id,
          actorUserId: event.actorUserId,
          eventType: event.eventType,
          metadata: asObject(event.metadata),
          createdAt: event.createdAt.toISOString(),
        }),
      ),
    resolvedAt: dateString(request.resolvedAt),
  };
}

function getJointAccountPaidPercentage(request: PrismaPaymentRequest) {
  const creatorShare = asSplit(request.requestedSplit).find(
    (allocation) => allocation.memberUserId === request.createdByUserId,
  )?.percentage;
  return 100 - (creatorShare ?? 0);
}

function jointAccountChargeAmountMinorUnits(request: PrismaPaymentRequest) {
  const jointAccountPercentage = getJointAccountPaidPercentage(request);
  return Math.round(
    request.amountMinorUnits * (1 - jointAccountPercentage / 100),
  );
}

async function createApprovedRequestCharge(
  transaction: Prisma.TransactionClient,
  request: PrismaPaymentRequest,
) {
  const amountMinorUnits = jointAccountChargeAmountMinorUnits(request);
  if (amountMinorUnits <= 0) return;

  const jointAccountPercentage = getJointAccountPaidPercentage(request);
  const nameSuffix = ` (${jointAccountPercentage}% paid by joint account)`;
  const namePrefix = request.title
    .slice(
      0,
      Math.max(0, MAX_JOINT_ACCOUNT_CHARGE_NAME_LENGTH - nameSuffix.length),
    )
    .trimEnd();

  await transaction.jointAccountCharge.create({
    data: {
      relationshipId: request.relationshipId,
      createdByUserId: request.createdByUserId,
      paymentRequestId: request.id,
      name: `${namePrefix}${nameSuffix}`,
      amountMinorUnits,
    },
  });
}

export class PrismaPaymentRequestService implements PaymentRequestService {
  private readonly notificationService: PrismaNotificationService;

  constructor(private readonly db: PrismaClient) {
    this.notificationService = new PrismaNotificationService(db);
  }

  async listRelationships(userId: string) {
    requireUserId(userId);
    const relationships = await this.db.relationship.findMany({
      where: { members: { some: { userId, active: true } } },
      include: {
        members: true,
        joinRequests: {
          where: { status: 'pending' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      relationships.map(async (relationship) =>
        mapRelationshipSummary(
          relationship,
          await this.ensureShareCode(relationship.id, relationship.shareCode),
          relationship.members.some(
            (member) => member.userId === userId && member.role === 'owner',
          )
            ? relationship.joinRequests.length
            : 0,
        ),
      ),
    );
  }

  async searchRelationships(userId: string, query: string) {
    requireUserId(userId);
    const normalizedQuery = requireText(query, 'query', 80);
    if (normalizedQuery.length < 2) {
      throw new PaymentRequestDomainError(
        'query must contain at least 2 characters.',
      );
    }

    const relationships = await this.db.relationship.findMany({
      where: {
        OR: [
          { name: { contains: normalizedQuery, mode: 'insensitive' } },
          {
            shareCode: {
              contains: normalizedQuery.toUpperCase(),
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        shareCode: true,
        createdAt: true,
        members: {
          where: { active: true },
          select: { userId: true, displayName: true, role: true },
        },
        joinRequests: {
          where: { requesterUserId: userId, status: 'pending' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: SEARCH_RESULT_LIMIT,
    });

    return Promise.all(
      relationships.map(async (relationship) => {
        const owner = relationship.members.find(
          (member) => member.role === 'owner',
        );

        return {
          id: relationship.id,
          name: relationship.name,
          shareCode: await this.ensureShareCode(
            relationship.id,
            relationship.shareCode,
          ),
          memberCount: relationship.members.length,
          owner: owner
            ? { userId: owner.userId, displayName: owner.displayName }
            : null,
          membershipStatus: relationship.members.some(
            (member) => member.userId === userId,
          )
            ? ('member' as const)
            : relationship.joinRequests.length > 0
              ? ('pending' as const)
              : ('available' as const),
          createdAt: relationship.createdAt.toISOString(),
        };
      }),
    );
  }

  async createRelationship(
    userId: string,
    input: CreateRelationshipInput,
    displayName?: string,
  ) {
    requireUserId(userId);
    const normalizedDisplayName = normalizeDisplayName(displayName);
    const name = requireText(input.name, 'name', 160);
    const shareCode = await this.createShareCode();
    const relationship = await this.db.relationship.create({
      data: {
        name,
        shareCode,
        members: {
          create: {
            userId,
            displayName: normalizedDisplayName,
            role: 'owner',
            active: true,
          },
        },
        rubrics: {
          create: {
            name: 'Joint purchase rubric',
            versions: {
              create: {
                version: 1,
                questions:
                  DEFAULT_RUBRIC_QUESTIONS as unknown as Prisma.InputJsonValue,
                published: true,
              },
            },
          },
        },
      },
      include: { members: true },
    });
    return mapRelationshipSummary(relationship, shareCode);
  }

  async deleteRelationship(userId: string, relationshipId: string) {
    await this.requireOwner(userId, relationshipId);
    await this.db.$transaction(async (transaction) => {
      const relationship = await transaction.relationship.findUnique({
        where: { id: relationshipId },
        select: { id: true },
      });
      if (!relationship) {
        throw new PaymentRequestDomainError('Relationship not found.', 404);
      }

      const [requests, rules, rubrics] = await Promise.all([
        transaction.paymentRequest.findMany({
          where: { relationshipId },
          select: { id: true },
        }),
        transaction.relationshipRule.findMany({
          where: { relationshipId },
          select: { id: true },
        }),
        transaction.rubric.findMany({
          where: { relationshipId },
          select: { id: true },
        }),
      ]);
      const requestIds = requests.map(({ id }) => id);
      const ruleIds = rules.map(({ id }) => id);
      const rubricIds = rubrics.map(({ id }) => id);
      const rubricVersions = await transaction.rubricVersion.findMany({
        where: { rubricId: { in: rubricIds } },
        select: { id: true },
      });
      const rubricVersionIds = rubricVersions.map(({ id }) => id);

      await transaction.notification.deleteMany({
        where: { targetRelationshipId: relationshipId },
      });
      await transaction.paymentRequestEvaluation.deleteMany({
        where: {
          OR: [
            { paymentRequestId: { in: requestIds } },
            { rubricVersionId: { in: rubricVersionIds } },
          ],
        },
      });
      await transaction.paymentRequestDecision.deleteMany({
        where: { paymentRequestId: { in: requestIds } },
      });
      await transaction.activityEvent.deleteMany({
        where: { paymentRequestId: { in: requestIds } },
      });
      await transaction.paymentRequest.deleteMany({
        where: { id: { in: requestIds } },
      });
      await transaction.rubricVersion.deleteMany({
        where: { id: { in: rubricVersionIds } },
      });
      await transaction.rubric.deleteMany({
        where: { id: { in: rubricIds } },
      });
      await transaction.relationshipRuleApproval.deleteMany({
        where: { ruleId: { in: ruleIds } },
      });
      await transaction.relationshipRule.deleteMany({
        where: { id: { in: ruleIds } },
      });
      await transaction.jointAccountCharge.deleteMany({
        where: { relationshipId },
      });
      await transaction.meTime.deleteMany({ where: { relationshipId } });
      await transaction.relationshipTask.deleteMany({
        where: { relationshipId },
      });
      await transaction.sexCoinFlip.deleteMany({ where: { relationshipId } });
      await transaction.sexEvent.deleteMany({ where: { relationshipId } });
      await transaction.relationshipInvitation.deleteMany({
        where: { relationshipId },
      });
      await transaction.relationshipJoinRequest.deleteMany({
        where: { relationshipId },
      });
      await transaction.relationshipMember.deleteMany({
        where: { relationshipId },
      });

      const deleted = await transaction.relationship.deleteMany({
        where: { id: relationshipId },
      });
      if (deleted.count !== 1) {
        throw new PaymentRequestDomainError(
          'The relationship changed before it could be deleted.',
          409,
        );
      }
    });
  }

  async listMembers(userId: string, relationshipId: string) {
    await this.requireMember(userId, relationshipId);
    const members = await this.db.relationshipMember.findMany({
      where: { relationshipId, active: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map(mapMember);
  }

  async requestToJoin(
    userId: string,
    relationshipId: string,
    displayName?: string,
  ) {
    requireUserId(userId);
    const relationship = await this.db.relationship.findUnique({
      where: { id: relationshipId },
      select: { id: true, name: true },
    });
    if (!relationship) {
      throw new PaymentRequestDomainError('Relationship not found.', 404);
    }
    const existingMember = await this.db.relationshipMember.findFirst({
      where: { relationshipId, userId, active: true },
    });
    if (existingMember) {
      throw new PaymentRequestDomainError(
        'You are already a member of this relationship.',
        409,
      );
    }
    const pendingRequest = await this.db.relationshipJoinRequest.findFirst({
      where: { relationshipId, requesterUserId: userId, status: 'pending' },
    });
    if (pendingRequest) return mapJoinRequest(pendingRequest);

    const requesterDisplayName = normalizeDisplayName(displayName);
    const request = await this.db.$transaction(async (transaction) => {
      const createdRequest = await transaction.relationshipJoinRequest.create({
        data: {
          relationshipId,
          requesterUserId: userId,
          requesterDisplayName,
        },
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdRequest.id,
        excludedUserIds: [userId],
        relationshipId,
        target: {
          type: 'relationshipJoinRequest',
          id: createdRequest.id,
          relationshipId,
        },
        title: 'New relationship join request',
        body: `A new member requested to join ${relationship.name}.`,
      });
      return createdRequest;
    });
    await this.notificationService.deliver(request.id);
    return mapJoinRequest(request);
  }

  async listJoinRequests(userId: string, relationshipId: string) {
    await this.requireOwner(userId, relationshipId);
    const requests = await this.db.relationshipJoinRequest.findMany({
      where: { relationshipId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    return requests.map(mapJoinRequest);
  }

  async getJoinRequest(
    userId: string,
    relationshipId: string,
    requestId: string,
  ) {
    requireUserId(userId);
    const request = await this.db.relationshipJoinRequest.findFirst({
      where: { id: requestId, relationshipId },
    });
    if (!request) {
      throw new PaymentRequestDomainError('Join request was not found.', 404);
    }
    if (request.requesterUserId !== userId) {
      await this.requireMember(userId, relationshipId);
    }
    return mapJoinRequest(request);
  }

  async deleteJoinRequest(
    userId: string,
    relationshipId: string,
    requestId: string,
  ) {
    requireUserId(userId);
    const request = await this.db.relationshipJoinRequest.findFirst({
      where: { id: requestId, relationshipId },
    });
    if (!request) {
      throw new PaymentRequestDomainError('Join request was not found.', 404);
    }
    if (request.requesterUserId !== userId) {
      throw new PaymentRequestDomainError(
        'Only the requester can delete this join request.',
        403,
      );
    }

    await this.db.$transaction(async (transaction) => {
      const deleted = await transaction.relationshipJoinRequest.deleteMany({
        where: {
          id: requestId,
          relationshipId,
          requesterUserId: userId,
        },
      });
      if (deleted.count !== 1) {
        throw new PaymentRequestDomainError(
          'The join request changed before it could be deleted.',
          409,
        );
      }
      await transaction.notification.deleteMany({
        where: {
          targetType: 'relationshipJoinRequest',
          targetId: requestId,
        },
      });
    });
  }

  async decideJoinRequest(
    userId: string,
    relationshipId: string,
    requestId: string,
    input: DecideRelationshipJoinRequestInput,
  ) {
    await this.requireOwner(userId, relationshipId);
    const decidedRequest = await this.db.$transaction(async (transaction) => {
      const request = await transaction.relationshipJoinRequest.findFirst({
        where: { id: requestId, relationshipId },
        include: { relationship: true },
      });
      if (!request) {
        throw new PaymentRequestDomainError('Join request was not found.', 404);
      }
      if (request.status !== 'pending') {
        throw new PaymentRequestDomainError(
          `Join request is ${request.status}.`,
          409,
        );
      }

      if (input.decision === 'approved') {
        await transaction.relationshipMember.upsert({
          where: {
            relationshipId_userId: {
              relationshipId,
              userId: request.requesterUserId,
            },
          },
          create: {
            relationshipId,
            userId: request.requesterUserId,
            displayName: request.requesterDisplayName,
            role: 'member',
            active: true,
          },
          update: {
            active: true,
            ...(request.requesterDisplayName
              ? { displayName: request.requesterDisplayName }
              : {}),
          },
        });
      }

      const decidedRequest = await transaction.relationshipJoinRequest.update({
        where: { id: request.id },
        data: {
          status: input.decision,
          respondedAt: new Date(),
          respondedByUserId: userId,
        },
      });
      if (input.decision === 'approved') {
        await this.notificationService.createForRelationshipMembers(
          transaction,
          {
            eventId: request.id,
            excludedUserIds: [userId, request.requesterUserId],
            relationshipId,
            target: { type: 'relationship', id: relationshipId },
            title: 'New relationship member',
            body: `A new member joined ${request.relationship.name}.`,
          },
        );
      }
      await this.notificationService.createForUsers(transaction, {
        recipientUserIds: [request.requesterUserId],
        eventId: request.id,
        title:
          input.decision === 'approved'
            ? 'Relationship request approved'
            : 'Relationship request declined',
        body:
          input.decision === 'approved'
            ? `You joined ${request.relationship.name}.`
            : `Your request to join ${request.relationship.name} was declined.`,
        target:
          input.decision === 'approved'
            ? { type: 'relationship', id: relationshipId }
            : {
                type: 'relationshipJoinRequest',
                id: request.id,
                relationshipId,
              },
      });
      return mapJoinRequest(decidedRequest);
    });
    await this.notificationService.deliver(requestId);
    return decidedRequest;
  }

  async createInvitation(
    userId: string,
    relationshipId: string,
    input: CreateInvitationInput,
  ) {
    const member = await this.requireMember(userId, relationshipId);
    if (member.role !== 'owner') {
      throw new PaymentRequestDomainError(
        'Only the relationship owner can invite members.',
        403,
      );
    }

    const token = randomBytes(32).toString('base64url');
    const invitation = await this.db.$transaction(async (transaction) => {
      const createdInvitation = await transaction.relationshipInvitation.create(
        {
          data: {
            relationshipId,
            inviterUserId: userId,
            inviteeEmail: normalizeEmail(input.inviteeEmail),
            tokenHash: hashInvitationToken(token),
            expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
          },
          include: { relationship: true },
        },
      );
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdInvitation.id,
        excludedUserIds: [userId],
        relationshipId,
        target: { type: 'relationship', id: relationshipId },
        title: 'New relationship invitation',
        body: `An invitation was created for ${createdInvitation.relationship.name}.`,
      });
      return createdInvitation;
    });

    await this.notificationService.deliver(invitation.id);
    return { ...mapInvitation(invitation), token };
  }

  async getInvitation(userId: string, token: string) {
    requireUserId(userId);
    const invitation = await this.db.relationshipInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(token) },
      include: { relationship: true },
    });
    if (!invitation) {
      throw new PaymentRequestDomainError('Invitation was not found.', 404);
    }
    if (
      invitation.status === 'pending' &&
      invitation.expiresAt.getTime() <= Date.now()
    ) {
      await this.db.relationshipInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new PaymentRequestDomainError('Invitation has expired.', 410);
    }
    return mapInvitation(invitation);
  }

  async acceptInvitation(userId: string, token: string, displayName?: string) {
    requireUserId(userId);
    const normalizedDisplayName = normalizeDisplayName(displayName);
    const tokenHash = hashInvitationToken(token);

    const result = await this.db.$transaction(async (transaction) => {
      const invitation = await transaction.relationshipInvitation.findUnique({
        where: { tokenHash },
        include: { relationship: true },
      });
      if (!invitation) {
        throw new PaymentRequestDomainError('Invitation was not found.', 404);
      }
      if (invitation.status !== 'pending') {
        if (
          invitation.status === 'accepted' &&
          invitation.acceptedByUserId === userId
        ) {
          const relationship = await transaction.relationship.findUniqueOrThrow(
            {
              where: { id: invitation.relationshipId },
              include: { members: true },
            },
          );
          const member = relationship.members.find(
            (candidate) => candidate.userId === userId,
          );
          if (!member) {
            throw new PaymentRequestDomainError(
              'Accepted membership was not found.',
              409,
            );
          }
          const shareCode = await this.ensureShareCode(
            relationship.id,
            relationship.shareCode,
          );
          return {
            invitation: mapInvitation(invitation),
            relationship: mapRelationshipSummary(relationship, shareCode),
            member: mapMember(member),
          };
        }
        throw new PaymentRequestDomainError(
          `Invitation is ${invitation.status}.`,
          409,
        );
      }
      if (invitation.expiresAt.getTime() <= Date.now()) {
        await transaction.relationshipInvitation.update({
          where: { id: invitation.id },
          data: { status: 'expired' },
        });
        throw new PaymentRequestDomainError('Invitation has expired.', 410);
      }

      const member = await transaction.relationshipMember.upsert({
        where: {
          relationshipId_userId: {
            relationshipId: invitation.relationshipId,
            userId,
          },
        },
        create: {
          relationshipId: invitation.relationshipId,
          userId,
          displayName: normalizedDisplayName,
          role: 'member',
          active: true,
        },
        update: {
          active: true,
          ...(normalizedDisplayName
            ? { displayName: normalizedDisplayName }
            : {}),
        },
      });
      const acceptedInvitation =
        await transaction.relationshipInvitation.update({
          where: { id: invitation.id },
          data: {
            acceptedAt: new Date(),
            acceptedByUserId: userId,
            status: 'accepted',
          },
          include: { relationship: true },
        });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: invitation.id,
        excludedUserIds: [userId],
        relationshipId: invitation.relationshipId,
        target: {
          type: 'relationship',
          id: invitation.relationshipId,
        },
        title: 'Relationship invitation accepted',
        body: `A new member joined ${invitation.relationship.name}.`,
      });
      const relationship = await transaction.relationship.findUniqueOrThrow({
        where: { id: invitation.relationshipId },
        include: { members: true },
      });
      const shareCode = await this.ensureShareCode(
        relationship.id,
        relationship.shareCode,
      );

      return {
        invitation: mapInvitation(acceptedInvitation),
        relationship: mapRelationshipSummary(relationship, shareCode),
        member: mapMember(member),
      };
    });
    await this.notificationService.deliver(result.invitation.id);
    return result;
  }

  async revokeInvitation(userId: string, invitationId: string) {
    const invitation = await this.db.relationshipInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new PaymentRequestDomainError('Invitation was not found.', 404);
    }
    const member = await this.requireMember(userId, invitation.relationshipId);
    if (member.role !== 'owner') {
      throw new PaymentRequestDomainError(
        'Only the relationship owner can revoke invitations.',
        403,
      );
    }
    if (invitation.status !== 'pending') {
      throw new PaymentRequestDomainError(
        `Invitation is ${invitation.status}.`,
        409,
      );
    }
    await this.db.relationshipInvitation.update({
      where: { id: invitation.id },
      data: { status: 'revoked' },
    });
  }

  async getRubric(userId: string, relationshipId: string) {
    await this.requireMember(userId, relationshipId);
    const version = await this.getRubricVersion(relationshipId);
    return {
      id: version.id,
      version: version.version,
      questions: version.questions as unknown as RubricVersion['questions'],
    };
  }

  async listPaymentRequests(
    userId: string,
    relationshipId: string,
    filters: PaymentRequestListFilters,
  ) {
    await this.requireMember(userId, relationshipId);
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), MAX_PAGE_SIZE);
    const baseWhere: Prisma.PaymentRequestWhereInput = {
      relationshipId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.categories?.length
        ? { categories: { hasSome: filters.categories } }
        : {}),
      ...(filters.awaitingMyDecision
        ? {
            status: 'pending_approval',
            decisions: { none: { memberUserId: userId } },
          }
        : {}),
    };
    const dateRange =
      filters.fromDate || filters.toDate
        ? {
            ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
            ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
          }
        : undefined;
    const where: Prisma.PaymentRequestWhereInput = {
      ...baseWhere,
      ...(dateRange ? { purchaseDate: dateRange } : {}),
    };
    const [requests, dateBounds] = await Promise.all([
      this.db.paymentRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      }),
      dateRange && !filters.cursor
        ? Promise.all([
            this.db.paymentRequest.findFirst({
              where: baseWhere,
              orderBy: [{ purchaseDate: 'asc' }, { id: 'asc' }],
              select: { purchaseDate: true },
            }),
            this.db.paymentRequest.findFirst({
              where: baseWhere,
              orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }],
              select: { purchaseDate: true },
            }),
          ])
        : Promise.resolve(undefined),
    ]);
    const hasNextPage = requests.length > limit;
    const items = requests.slice(0, limit).map(mapSummary);
    return {
      items,
      ...(hasNextPage ? { nextCursor: items[items.length - 1]?.id } : {}),
      ...(dateBounds
        ? {
            calendarDateBounds: {
              earliestDate: dateBounds[0]?.purchaseDate.toISOString() ?? null,
              latestDate: dateBounds[1]?.purchaseDate.toISOString() ?? null,
            },
          }
        : {}),
    };
  }

  async createPaymentRequest(
    userId: string,
    relationshipId: string,
    input: CreatePaymentRequestInput,
  ) {
    const categories = validateRequestInput(input);
    await this.requireMember(userId, relationshipId);
    const members = await this.db.relationshipMember.findMany({
      where: { relationshipId, active: true },
    });
    const memberIds = new Set(members.map((member) => member.userId));
    if (
      input.requestedSplit.some(
        (allocation) => !memberIds.has(allocation.memberUserId),
      )
    ) {
      throw new PaymentRequestDomainError(
        'requestedSplit contains a non-member.',
      );
    }
    const rubricVersion = await this.getRubricVersion(
      relationshipId,
      input.evaluation?.rubricVersionId,
    );
    if (input.evaluation) {
      validateEvaluation(input.evaluation, rubricVersion.questions);
    }

    const { requestId, eventId } = await this.db.$transaction(async (tx) => {
      const request = await tx.paymentRequest.create({
        data: {
          relationshipId,
          createdByUserId: userId,
          title: input.title.trim(),
          rationale: input.rationale.trim(),
          amountMinorUnits: input.amountMinorUnits,
          currency: input.currency,
          purchaseDate: new Date(input.purchaseDate),
          categories,
          requestedSplit:
            input.requestedSplit as unknown as Prisma.InputJsonValue,
          rubricVersionId: rubricVersion.id,
        },
      });
      const event = await tx.activityEvent.create({
        data: {
          paymentRequestId: request.id,
          actorUserId: userId,
          eventType: 'created',
          metadata: {} as Prisma.InputJsonValue,
        },
      });
      await this.notificationService.createForRelationshipMembers(tx, {
        eventId: event.id,
        excludedUserIds: [userId],
        relationshipId,
        target: { type: 'paymentRequest', id: request.id },
        title: 'New payment request',
        body: request.title,
      });
      return { requestId: request.id, eventId: event.id };
    });
    await this.notificationService.deliver(eventId);
    return this.getPaymentRequest(userId, requestId);
  }

  async getPaymentRequest(userId: string, paymentRequestId: string) {
    const request = await this.db.paymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        relationship: { members: { some: { userId, active: true } } },
      },
      include: { evaluation: true, decisions: true, activity: true },
    });
    if (!request) {
      throw new PaymentRequestDomainError('Payment request not found.', 404);
    }
    return mapDetails(request);
  }

  async updatePaymentRequest(
    userId: string,
    paymentRequestId: string,
    input: UpdatePaymentRequestInput,
  ) {
    const request = await this.getRequestForMember(userId, paymentRequestId);
    if (request.status !== 'draft' && request.status !== 'pending_approval') {
      throw new PaymentRequestDomainError(
        'Only open requests can be edited.',
        409,
      );
    }
    if (request.status === 'draft' && request.createdByUserId !== userId) {
      throw new PaymentRequestDomainError(
        'Only the creator can edit a draft request.',
        403,
      );
    }

    const categories = validateRequestInput(input);
    const members = await this.db.relationshipMember.findMany({
      where: { relationshipId: request.relationshipId, active: true },
    });
    const memberIds = new Set(members.map((member) => member.userId));
    if (
      input.requestedSplit.some(
        (allocation) => !memberIds.has(allocation.memberUserId),
      )
    ) {
      throw new PaymentRequestDomainError(
        'requestedSplit contains a non-member.',
      );
    }
    const rubricVersion = input.evaluation
      ? await this.getRubricVersionForId(request.rubricVersionId)
      : undefined;
    if (input.evaluation && rubricVersion) {
      if (
        input.evaluation.rubricVersionId &&
        input.evaluation.rubricVersionId !== rubricVersion.id
      ) {
        throw new PaymentRequestDomainError(
          'The evaluation rubric version cannot be changed.',
        );
      }
      validateEvaluation(
        input.evaluation,
        rubricVersion.questions,
        request.status !== 'draft',
      );
    }

    const eventId = await this.db.$transaction(async (tx) => {
      const updated = await tx.paymentRequest.updateMany({
        where: {
          id: paymentRequestId,
          status: request.status,
        },
        data: {
          title: input.title.trim(),
          rationale: input.rationale.trim(),
          amountMinorUnits: input.amountMinorUnits,
          currency: input.currency,
          purchaseDate: new Date(input.purchaseDate),
          categories,
          requestedSplit:
            input.requestedSplit as unknown as Prisma.InputJsonValue,
        },
      });
      if (updated.count !== 1) {
        throw new PaymentRequestDomainError(
          'The request changed before it could be updated.',
          409,
        );
      }

      if (request.status === 'pending_approval') {
        await tx.paymentRequestDecision.deleteMany({
          where: { paymentRequestId },
        });
        await tx.paymentRequestDecision.create({
          data: {
            paymentRequestId,
            memberUserId: userId,
            decision: 'approved',
          },
        });
      }
      if (input.evaluation && rubricVersion) {
        await tx.paymentRequestEvaluation.upsert({
          where: { paymentRequestId },
          create: {
            paymentRequestId,
            rubricVersionId: rubricVersion.id,
            answers: input.evaluation
              .answers as unknown as Prisma.InputJsonValue,
            recommendation: input.evaluation.recommendation,
            score: input.evaluation.score,
          },
          update: {
            rubricVersionId: rubricVersion.id,
            answers: input.evaluation
              .answers as unknown as Prisma.InputJsonValue,
            recommendation: input.evaluation.recommendation,
            score: input.evaluation.score,
          },
        });
      }

      const event = await tx.activityEvent.create({
        data: {
          paymentRequestId,
          actorUserId: userId,
          eventType: 'edited',
          metadata: {} as Prisma.InputJsonValue,
        },
      });
      if (request.status === 'pending_approval') {
        await this.notificationService.createForRelationshipMembers(tx, {
          eventId: event.id,
          excludedUserIds: [userId],
          relationshipId: request.relationshipId,
          target: { type: 'paymentRequest', id: paymentRequestId },
          title: 'Payment request updated',
          body: input.title.trim(),
        });
      }
      return event.id;
    });

    if (request.status === 'pending_approval') {
      await this.notificationService.deliver(eventId);
    }
    return this.getPaymentRequest(userId, paymentRequestId);
  }

  async submitPaymentRequest(
    userId: string,
    paymentRequestId: string,
    input: SubmitPaymentRequestInput,
  ) {
    const request = await this.getRequestForMember(userId, paymentRequestId);
    if (request.createdByUserId !== userId) {
      throw new PaymentRequestDomainError(
        'Only the creator can submit this request.',
        403,
      );
    }
    if (request.status !== 'draft') {
      throw new PaymentRequestDomainError(
        'Only draft requests can be submitted.',
        409,
      );
    }
    const rubricVersion = await this.getRubricVersionForId(
      request.rubricVersionId,
    );
    validateEvaluation(input.evaluation, rubricVersion.questions);

    const eventId = await this.db.$transaction(async (tx) => {
      const updated = await tx.paymentRequest.updateMany({
        where: { id: paymentRequestId, status: 'draft' },
        data: { status: 'pending_approval' },
      });
      if (updated.count !== 1) {
        throw new PaymentRequestDomainError(
          'The request changed before it was submitted.',
          409,
        );
      }
      await tx.paymentRequestDecision.create({
        data: {
          paymentRequestId,
          memberUserId: userId,
          decision: 'approved',
        },
      });
      await tx.paymentRequestEvaluation.upsert({
        where: { paymentRequestId },
        create: {
          paymentRequestId,
          rubricVersionId: rubricVersion.id,
          answers: input.evaluation.answers as unknown as Prisma.InputJsonValue,
          recommendation: input.evaluation.recommendation,
          score: input.evaluation.score,
        },
        update: {
          rubricVersionId: rubricVersion.id,
          answers: input.evaluation.answers as unknown as Prisma.InputJsonValue,
          recommendation: input.evaluation.recommendation,
          score: input.evaluation.score,
        },
      });
      const event = await tx.activityEvent.create({
        data: {
          paymentRequestId,
          actorUserId: userId,
          eventType: 'submitted',
          metadata: {} as Prisma.InputJsonValue,
        },
      });
      const memberCount = await tx.relationshipMember.count({
        where: { relationshipId: request.relationshipId, active: true },
      });
      if (memberCount === 1) {
        await tx.paymentRequest.update({
          where: { id: paymentRequestId },
          data: { status: 'approved', resolvedAt: new Date() },
        });
        await createApprovedRequestCharge(tx, request);
      }
      await this.notificationService.createForRelationshipMembers(tx, {
        eventId: event.id,
        excludedUserIds: [userId],
        relationshipId: request.relationshipId,
        target: { type: 'paymentRequest', id: paymentRequestId },
        title: 'Payment request awaiting approval',
        body: request.title,
      });
      return event.id;
    });
    await this.notificationService.deliver(eventId);
    return this.getPaymentRequest(userId, paymentRequestId);
  }

  async decidePaymentRequest(
    userId: string,
    paymentRequestId: string,
    input: DecidePaymentRequestInput,
  ) {
    if (input.decision === 'changes_requested') {
      throw new PaymentRequestDomainError(
        'changes_requested decisions are not supported yet.',
      );
    }
    const request = await this.getRequestForMember(userId, paymentRequestId);
    if (request.status !== 'pending_approval') {
      throw new PaymentRequestDomainError(
        'Only pending requests can be decided.',
        409,
      );
    }
    const existingDecision = await this.db.paymentRequestDecision.findFirst({
      where: { paymentRequestId, memberUserId: userId },
    });
    if (existingDecision) {
      throw new PaymentRequestDomainError(
        'This member has already decided on the request.',
        409,
      );
    }
    const members = await this.db.relationshipMember.findMany({
      where: { relationshipId: request.relationshipId, active: true },
    });

    const eventId = await this.db.$transaction(async (tx) => {
      try {
        await tx.paymentRequestDecision.create({
          data: {
            paymentRequestId,
            memberUserId: userId,
            decision: input.decision,
            comment: input.comment?.trim() || null,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new PaymentRequestDomainError(
            'This member has already decided on the request.',
            409,
          );
        }
        throw error;
      }

      const event = await tx.activityEvent.create({
        data: {
          paymentRequestId,
          actorUserId: userId,
          eventType: input.decision,
          metadata: input.comment ? { comment: input.comment } : {},
        },
      });
      const hasRejection = input.decision === 'rejected';
      const approvedCount = await tx.paymentRequestDecision.count({
        where: { paymentRequestId, decision: 'approved' },
      });
      const isApproved = !hasRejection && approvedCount >= members.length;
      const nextStatus = hasRejection
        ? 'rejected'
        : isApproved
          ? 'approved'
          : 'pending_approval';
      const updated = await tx.paymentRequest.updateMany({
        where: { id: paymentRequestId, status: 'pending_approval' },
        data: {
          status: nextStatus,
          ...(nextStatus === 'pending_approval'
            ? {}
            : { resolvedAt: new Date() }),
        },
      });
      if (updated.count !== 1) {
        throw new PaymentRequestDomainError(
          'The request changed before the decision was recorded.',
          409,
        );
      }
      if (isApproved) {
        await createApprovedRequestCharge(tx, request);
      }
      await this.notificationService.createForRelationshipMembers(tx, {
        eventId: event.id,
        excludedUserIds: [userId],
        relationshipId: request.relationshipId,
        target: { type: 'paymentRequest', id: paymentRequestId },
        title: `Payment request ${input.decision}`,
        body: request.title,
      });
      return event.id;
    });
    await this.notificationService.deliver(eventId);
    return this.getPaymentRequest(userId, paymentRequestId);
  }

  async cancelPaymentRequest(userId: string, paymentRequestId: string) {
    const request = await this.getRequestForMember(userId, paymentRequestId);
    if (request.createdByUserId !== userId) {
      throw new PaymentRequestDomainError(
        'Only the creator can cancel this request.',
        403,
      );
    }
    if (request.status !== 'draft' && request.status !== 'pending_approval') {
      throw new PaymentRequestDomainError(
        'Only open requests can be cancelled.',
        409,
      );
    }
    const eventId = await this.db.$transaction(async (tx) => {
      const updated = await tx.paymentRequest.updateMany({
        where: {
          id: paymentRequestId,
          status: { in: ['draft', 'pending_approval'] },
        },
        data: { status: 'cancelled', resolvedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new PaymentRequestDomainError(
          'The request changed before it was cancelled.',
          409,
        );
      }
      const event = await tx.activityEvent.create({
        data: {
          paymentRequestId,
          actorUserId: userId,
          eventType: 'cancelled',
          metadata: {} as Prisma.InputJsonValue,
        },
      });
      await this.notificationService.createForRelationshipMembers(tx, {
        eventId: event.id,
        excludedUserIds: [userId],
        relationshipId: request.relationshipId,
        target: { type: 'paymentRequest', id: paymentRequestId },
        title: 'Payment request cancelled',
        body: request.title,
      });
      return event.id;
    });
    await this.notificationService.deliver(eventId);
    return this.getPaymentRequest(userId, paymentRequestId);
  }

  async deletePaymentRequest(userId: string, paymentRequestId: string) {
    const request = await this.getRequestForMember(userId, paymentRequestId);
    if (request.createdByUserId !== userId) {
      throw new PaymentRequestDomainError(
        'Only the creator can delete this request.',
        403,
      );
    }

    await this.db.$transaction(async (transaction) => {
      await transaction.paymentRequestEvaluation.deleteMany({
        where: { paymentRequestId },
      });
      await transaction.paymentRequestDecision.deleteMany({
        where: { paymentRequestId },
      });
      await transaction.activityEvent.deleteMany({
        where: { paymentRequestId },
      });
      const deleted = await transaction.paymentRequest.deleteMany({
        where: {
          id: paymentRequestId,
          relationshipId: request.relationshipId,
          createdByUserId: userId,
        },
      });
      if (deleted.count !== 1) {
        throw new PaymentRequestDomainError(
          'The request changed before it could be deleted.',
          409,
        );
      }
      await transaction.jointAccountCharge.updateMany({
        where: { paymentRequestId },
        data: { paymentRequestId: null },
      });
      await transaction.notification.deleteMany({
        where: { targetType: 'paymentRequest', targetId: paymentRequestId },
      });
    });
  }

  async registerPushToken(userId: string, input: RegisterPushTokenInput) {
    requireUserId(userId);
    await this.db.notificationPushToken.upsert({
      where: { token: input.token },
      create: {
        token: input.token,
        userId,
        platform: input.platform,
      },
      update: {
        userId,
        platform: input.platform,
      },
    });
  }

  async unregisterPushToken(userId: string, token: string) {
    requireUserId(userId);
    await this.db.notificationPushToken.deleteMany({
      where: { userId, token },
    });
  }

  async listNotifications(userId: string) {
    requireUserId(userId);
    const notifications = await this.db.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      items: notifications.map((notification) => {
        const target = mapNotificationTarget(
          notification.targetType,
          notification.targetId,
          notification.targetRelationshipId,
        );
        return {
          id: notification.id,
          recipientUserId: notification.recipientUserId,
          eventId: notification.eventId,
          ...(target ? { target } : {}),
          title: notification.title,
          body: notification.body,
          readAt: dateString(notification.readAt),
          deliveryStatus: notification.deliveryStatus,
          createdAt: notification.createdAt.toISOString(),
        };
      }),
      unreadCount: notifications.filter((notification) => !notification.readAt)
        .length,
    };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const updated = await this.db.notification.updateMany({
      where: { id: notificationId, recipientUserId: userId },
      data: { readAt: new Date(), deliveryStatus: 'delivered' },
    });
    if (updated.count !== 1) {
      throw new PaymentRequestDomainError('Notification not found.', 404);
    }
  }

  async completeNotification(userId: string, notificationId: string) {
    requireUserId(userId);
    const deleted = await this.db.notification.deleteMany({
      where: { id: notificationId, recipientUserId: userId },
    });
    if (deleted.count !== 1) {
      throw new PaymentRequestDomainError('Notification not found.', 404);
    }
  }

  private async createShareCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const shareCode = generateShareCode();
      const existing = await this.db.relationship.findUnique({
        where: { shareCode },
        select: { id: true },
      });
      if (!existing) return shareCode;
    }
    throw new PaymentRequestDomainError(
      'A unique relationship share code could not be created.',
      503,
    );
  }

  private async ensureShareCode(
    relationshipId: string,
    existingShareCode: string | null,
  ) {
    if (existingShareCode) return existingShareCode;
    const shareCode = await this.createShareCode();
    const updated = await this.db.relationship.updateMany({
      where: { id: relationshipId, shareCode: null },
      data: { shareCode },
    });
    if (updated.count === 1) return shareCode;
    const relationship = await this.db.relationship.findUnique({
      where: { id: relationshipId },
      select: { shareCode: true },
    });
    if (!relationship?.shareCode) {
      throw new PaymentRequestDomainError('Relationship not found.', 404);
    }
    return relationship.shareCode;
  }

  private async requireOwner(userId: string, relationshipId: string) {
    const member = await this.requireMember(userId, relationshipId);
    if (member.role !== 'owner') {
      throw new PaymentRequestDomainError(
        'Only the relationship owner can manage join requests.',
        403,
      );
    }
    return member;
  }

  private async requireMember(userId: string, relationshipId: string) {
    requireUserId(userId);
    const member = await this.db.relationshipMember.findFirst({
      where: { relationshipId, userId, active: true },
    });
    if (!member) {
      throw new PaymentRequestDomainError('Relationship not found.', 404);
    }
    return member;
  }

  private async getRequestForMember(userId: string, paymentRequestId: string) {
    const request = await this.db.paymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        relationship: { members: { some: { userId, active: true } } },
      },
    });
    if (!request) {
      throw new PaymentRequestDomainError('Payment request not found.', 404);
    }
    return request;
  }

  private async getRubricVersion(
    relationshipId: string,
    rubricVersionId?: string,
  ) {
    const version = await this.db.rubricVersion.findFirst({
      where: {
        ...(rubricVersionId ? { id: rubricVersionId } : {}),
        rubric: { relationshipId },
        published: true,
      },
      orderBy: { version: 'desc' },
    });
    if (!version) {
      throw new PaymentRequestDomainError(
        'No published rubric exists for this relationship.',
        409,
      );
    }
    return version;
  }

  private async getRubricVersionForId(rubricVersionId: string | null) {
    if (!rubricVersionId) {
      throw new PaymentRequestDomainError(
        'The request has no rubric version.',
        409,
      );
    }
    const version = await this.db.rubricVersion.findUnique({
      where: { id: rubricVersionId },
    });
    if (!version) {
      throw new PaymentRequestDomainError('Rubric version not found.', 409);
    }
    return version;
  }
}
