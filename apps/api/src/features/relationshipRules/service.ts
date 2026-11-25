import type {
  CreateRelationshipRuleInput,
  RelationshipRule,
  RelationshipRuleListFilters,
  RelationshipRuleListResponse,
  UpdateRelationshipRuleInput,
} from '@expo-50sdk-template/shared-types';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { PrismaNotificationService } from '../notifications/notificationService';

const MAX_PAGE_SIZE = 100;
const MAX_APPROVERS = 100;
const MAX_LABEL_LENGTH = 80;
const PENDING_AGREEMENT_FILTER: Prisma.RelationshipRuleApprovalWhereInput = {
  OR: [{ agreedAt: null }, { agreedAt: { isSet: false } }],
};

export class RelationshipRuleDomainError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'RelationshipRuleDomainError';
    this.statusCode = statusCode;
  }
}

export type RelationshipRuleService = {
  listRelationshipRules(
    userId: string,
    relationshipId: string,
    filters: RelationshipRuleListFilters,
  ): Promise<RelationshipRuleListResponse>;
  createRelationshipRule(
    userId: string,
    relationshipId: string,
    input: CreateRelationshipRuleInput,
  ): Promise<RelationshipRule>;
  updateRelationshipRule(
    userId: string,
    ruleId: string,
    input: UpdateRelationshipRuleInput,
  ): Promise<RelationshipRule>;
  getRelationshipRule(
    userId: string,
    ruleId: string,
  ): Promise<RelationshipRule>;
  deleteRelationshipRule(userId: string, ruleId: string): Promise<void>;
  agreeToRelationshipRule(
    userId: string,
    ruleId: string,
  ): Promise<RelationshipRule>;
};

type RelationshipRuleWithApprovals = Prisma.RelationshipRuleGetPayload<{
  include: { approvals: true };
}>;

function defaultReminderDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

function parseReminderDate(value: string | null | undefined) {
  if (value === null) return null;
  if (value === undefined) return defaultReminderDate();

  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw new RelationshipRuleDomainError(
      'The review reminder must be set to a future date.',
    );
  }
  return date;
}

function mapRelationshipRule(
  rule: RelationshipRuleWithApprovals,
): RelationshipRule {
  const labels = [
    ...new Set(
      rule.labels
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    ),
  ];

  return {
    id: rule.id,
    relationshipId: rule.relationshipId,
    createdByUserId: rule.createdByUserId,
    name: rule.name,
    labels,
    description: rule.description,
    status: rule.status,
    remindMeToReview: rule.remindMeToReview?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    ratifiedAt: rule.ratifiedAt?.toISOString(),
    approvals: rule.approvals.map((approval) => ({
      memberUserId: approval.memberUserId,
      agreedAt: approval.agreedAt?.toISOString(),
    })),
  };
}

function requireText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RelationshipRuleDomainError(`${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new RelationshipRuleDomainError(`${field} is too long.`);
  }
  return normalized;
}

function normalizeLabels(labels: string[] | undefined) {
  const normalized = (labels ?? []).map((label) =>
    requireText(label, 'label', MAX_LABEL_LENGTH),
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new RelationshipRuleDomainError('Labels must be unique.');
  }
  return normalized;
}

function requireUserId(userId: string) {
  if (!userId.trim()) {
    throw new RelationshipRuleDomainError('Authentication is required.', 401);
  }
}

export class PrismaRelationshipRuleService implements RelationshipRuleService {
  private readonly notificationService: PrismaNotificationService;

  constructor(private readonly db: PrismaClient) {
    this.notificationService = new PrismaNotificationService(db);
  }

  async listRelationshipRules(
    userId: string,
    relationshipId: string,
    filters: RelationshipRuleListFilters,
  ) {
    await this.requireMember(userId, relationshipId);
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), MAX_PAGE_SIZE);
    const rules = await this.db.relationshipRule.findMany({
      where: { relationshipId },
      include: { approvals: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });
    const hasNextPage = rules.length > limit;
    const items = rules.slice(0, limit).map(mapRelationshipRule);

    return {
      items,
      ...(hasNextPage ? { nextCursor: items[items.length - 1]?.id } : {}),
    };
  }

  async createRelationshipRule(
    userId: string,
    relationshipId: string,
    input: CreateRelationshipRuleInput,
  ) {
    requireUserId(userId);
    const name = requireText(input.name, 'name', 160);
    const description = requireText(input.description, 'description', 4000);
    const labels = normalizeLabels(input.labels);
    const remindMeToReview = parseReminderDate(input.remindMeToReview);

    if (
      !Array.isArray(input.requiredApproverUserIds) ||
      input.requiredApproverUserIds.length === 0 ||
      input.requiredApproverUserIds.length > MAX_APPROVERS
    ) {
      throw new RelationshipRuleDomainError(
        'At least one required approver must be selected.',
      );
    }
    const approverUserIds = input.requiredApproverUserIds.map((id) =>
      typeof id === 'string' ? id.trim() : '',
    );
    if (approverUserIds.some((id) => !id)) {
      throw new RelationshipRuleDomainError(
        'Required approver IDs must not be empty.',
      );
    }
    if (new Set(approverUserIds).size !== approverUserIds.length) {
      throw new RelationshipRuleDomainError(
        'A required approver may only be selected once.',
      );
    }
    if (approverUserIds.includes(userId)) {
      throw new RelationshipRuleDomainError(
        'The rule creator cannot be a required approver.',
      );
    }

    await this.requireMember(userId, relationshipId);
    const members = await this.db.relationshipMember.findMany({
      where: { relationshipId, active: true },
      select: { userId: true },
    });
    const activeMemberIds = new Set(members.map(({ userId: id }) => id));
    if (approverUserIds.some((id) => !activeMemberIds.has(id))) {
      throw new RelationshipRuleDomainError(
        'Required approvers must be active members of the relationship.',
      );
    }

    const rule = await this.db.$transaction(async (transaction) => {
      const createdRule = await transaction.relationshipRule.create({
        data: {
          relationshipId,
          createdByUserId: userId,
          name,
          labels,
          description,
          status: 'pending_approval',
          ratifiedAt: null,
          remindMeToReview,
          approvals: {
            create: approverUserIds.map((memberUserId) => ({
              memberUserId,
              agreedAt: null,
            })),
          },
        },
        include: { approvals: true },
      });
      await this.notificationService.createForRelationshipMembers(transaction, {
        eventId: createdRule.id,
        excludedUserIds: [userId],
        relationshipId,
        target: { type: 'relationshipRule', id: createdRule.id },
        title: 'New relationship rule',
        body: createdRule.name,
      });
      return createdRule;
    });
    await this.notificationService.deliver(rule.id);
    return mapRelationshipRule(rule);
  }

  async deliverDueReviewReminders(now = new Date()) {
    const dueRules = await this.db.relationshipRule.findMany({
      where: {
        remindMeToReview: { lte: now },
        reminderSentAt: null,
      },
      select: {
        id: true,
        relationshipId: true,
        name: true,
      },
      take: 100,
    });

    for (const rule of dueRules) {
      const claimed = await this.db.$transaction(async (transaction) => {
        const result = await transaction.relationshipRule.updateMany({
          where: {
            id: rule.id,
            remindMeToReview: { lte: now },
            reminderSentAt: null,
          },
          data: { reminderSentAt: now },
        });
        if (result.count !== 1) return false;

        await this.notificationService.createForRelationshipMembers(
          transaction,
          {
            eventId: rule.id,
            relationshipId: rule.relationshipId,
            target: { type: 'relationshipRule', id: rule.id },
            title: 'Time to review relationship rule',
            body: rule.name,
          },
        );
        return true;
      });

      if (claimed) await this.notificationService.deliver(rule.id);
    }
  }

  async getRelationshipRule(userId: string, ruleId: string) {
    return mapRelationshipRule(await this.requireRuleForMember(userId, ruleId));
  }

  async updateRelationshipRule(
    userId: string,
    ruleId: string,
    input: UpdateRelationshipRuleInput,
  ) {
    const rule = await this.requireRuleForMember(userId, ruleId);
    const isCreator = rule.createdByUserId === userId;
    const isApprover = rule.approvals.some(
      (approval) => approval.memberUserId === userId,
    );
    if (!isCreator && !isApprover) {
      throw new RelationshipRuleDomainError(
        'Only the creator or a required approver can update this rule.',
        403,
      );
    }

    const name = requireText(input.name, 'name', 160);
    const labels =
      input.labels === undefined ? rule.labels : normalizeLabels(input.labels);
    const description = requireText(input.description, 'description', 4000);
    const labelsChanged =
      labels.length !== rule.labels.length ||
      labels.some((label, index) => label !== rule.labels[index]);
    if (
      name === rule.name &&
      description === rule.description &&
      !labelsChanged
    ) {
      return this.getRelationshipRule(userId, ruleId);
    }

    const requiredApproverUserIds = [
      ...new Set([
        rule.createdByUserId,
        ...rule.approvals.map((approval) => approval.memberUserId),
      ]),
    ].filter((approverUserId) => approverUserId !== userId);
    const eventId = randomBytes(12).toString('hex');
    await this.db.$transaction(async (transaction) => {
      const updated = await transaction.relationshipRule.updateMany({
        where: {
          id: ruleId,
          createdByUserId: rule.createdByUserId,
          updatedAt: rule.updatedAt,
        },
        data: {
          createdByUserId: userId,
          name,
          labels,
          description,
          status: 'pending_approval',
          ratifiedAt: null,
        },
      });
      if (updated.count !== 1) {
        throw new RelationshipRuleDomainError(
          'The rule changed before it could be updated.',
          409,
        );
      }

      await transaction.relationshipRuleApproval.deleteMany({
        where: { ruleId },
      });
      await transaction.relationshipRuleApproval.createMany({
        data: requiredApproverUserIds.map((memberUserId) => ({
          ruleId,
          memberUserId,
          agreedAt: null,
        })),
      });
      await this.notificationService.createForUsers(transaction, {
        eventId,
        recipientUserIds: requiredApproverUserIds,
        target: { type: 'relationshipRule', id: ruleId },
        title: 'Relationship rule updated',
        body: name,
      });
    });
    await this.notificationService.deliver(eventId);
    return this.getRelationshipRule(userId, ruleId);
  }

  async deleteRelationshipRule(userId: string, ruleId: string) {
    const rule = await this.requireRuleForMember(userId, ruleId);
    if (rule.createdByUserId !== userId) {
      throw new RelationshipRuleDomainError(
        'Only the creator can delete this rule.',
        403,
      );
    }

    await this.db.$transaction(async (transaction) => {
      await transaction.relationshipRuleApproval.deleteMany({
        where: { ruleId },
      });
      const deleted = await transaction.relationshipRule.deleteMany({
        where: {
          id: ruleId,
          relationshipId: rule.relationshipId,
          createdByUserId: userId,
        },
      });
      if (deleted.count !== 1) {
        throw new RelationshipRuleDomainError(
          'The rule changed before it could be deleted.',
          409,
        );
      }
      await transaction.notification.deleteMany({
        where: { targetType: 'relationshipRule', targetId: ruleId },
      });
    });
  }

  async agreeToRelationshipRule(userId: string, ruleId: string) {
    const rule = await this.requireRuleForMember(userId, ruleId);
    const approval = rule.approvals.find(
      (candidate) => candidate.memberUserId === userId,
    );
    if (!approval) {
      throw new RelationshipRuleDomainError(
        'Only a required approver can agree to this rule.',
        403,
      );
    }
    if (rule.status === 'ratified' || approval.agreedAt) {
      return mapRelationshipRule(rule);
    }

    const agreedAt = new Date();
    const updatedApproval = await this.db.relationshipRuleApproval.updateMany({
      where: { id: approval.id, ...PENDING_AGREEMENT_FILTER },
      data: { agreedAt },
    });
    if (updatedApproval.count !== 1) {
      const currentRule = await this.requireRuleForMember(userId, ruleId);
      const currentApproval = currentRule.approvals.find(
        (candidate) => candidate.memberUserId === userId,
      );
      if (currentRule.status === 'ratified' || currentApproval?.agreedAt) {
        return mapRelationshipRule(currentRule);
      }
      throw new RelationshipRuleDomainError(
        'The rule changed before agreement could be recorded.',
        409,
      );
    }

    const pendingApprovals = await this.db.relationshipRuleApproval.count({
      where: { ruleId, ...PENDING_AGREEMENT_FILTER },
    });
    if (pendingApprovals === 0) {
      await this.db.relationshipRule.updateMany({
        where: {
          id: ruleId,
          status: 'pending_approval',
          OR: [{ ratifiedAt: null }, { ratifiedAt: { isSet: false } }],
        },
        data: { status: 'ratified', ratifiedAt: agreedAt },
      });
    }

    return this.getRelationshipRule(userId, ruleId);
  }

  private async requireMember(userId: string, relationshipId: string) {
    requireUserId(userId);
    const member = await this.db.relationshipMember.findFirst({
      where: { relationshipId, userId, active: true },
      select: { id: true },
    });
    if (!member) {
      throw new RelationshipRuleDomainError('Relationship not found.', 404);
    }
  }

  private async requireRuleForMember(
    userId: string,
    ruleId: string,
  ): Promise<RelationshipRuleWithApprovals> {
    requireUserId(userId);
    const rule = await this.db.relationshipRule.findFirst({
      where: {
        id: ruleId,
        relationship: { members: { some: { userId, active: true } } },
      },
      include: { approvals: true },
    });
    if (!rule) {
      throw new RelationshipRuleDomainError(
        'Relationship rule not found.',
        404,
      );
    }
    return rule;
  }
}
