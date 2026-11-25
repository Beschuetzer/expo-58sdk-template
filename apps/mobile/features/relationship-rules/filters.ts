import type {
  RelationshipMember,
  RelationshipRule,
  RelationshipRuleStatus,
} from '@expo-50sdk-template/shared-types';

import { getMemberDisplayName } from '@/features/relationships/utils';

export type RelationshipRuleStatusFilter = RelationshipRuleStatus | 'all';
export type RelationshipRuleDateFilter = string | null | undefined;

export type RelationshipRuleFilters = {
  search: string;
  label: string;
  status: RelationshipRuleStatusFilter;
  createdByUserId: string;
  requiredApproverUserId: string;
  createdFromDate: RelationshipRuleDateFilter;
  createdToDate: RelationshipRuleDateFilter;
  ratifiedFromDate: RelationshipRuleDateFilter;
  ratifiedToDate: RelationshipRuleDateFilter;
};

export function canUserAgreeToRelationshipRule(
  rule: RelationshipRule,
  userId: string | undefined,
) {
  if (!userId || rule.status !== 'pending_approval') return false;

  const approval = rule.approvals.find(
    (candidate) => candidate.memberUserId === userId,
  );
  return Boolean(approval && !approval.agreedAt);
}

export function parseDateFilter(value: string): string | null | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== normalized
    ? null
    : normalized;
}

export function hasInvalidRelationshipRuleDateFilters(
  filters: RelationshipRuleFilters,
) {
  const dateRanges = [
    [filters.createdFromDate, filters.createdToDate],
    [filters.ratifiedFromDate, filters.ratifiedToDate],
  ] as const;

  return dateRanges.some(
    ([fromDate, toDate]) =>
      fromDate === null ||
      toDate === null ||
      (fromDate !== undefined && toDate !== undefined && fromDate > toDate),
  );
}

function matchesDateRange(
  value: string | undefined,
  fromDate: RelationshipRuleDateFilter,
  toDate: RelationshipRuleDateFilter,
) {
  if (fromDate === null || toDate === null) return false;
  if (fromDate === undefined && toDate === undefined) return true;
  if (!value) return false;
  const date = value.slice(0, 10);
  return (
    (fromDate === undefined || date >= fromDate) &&
    (toDate === undefined || date <= toDate)
  );
}

export function filterRelationshipRules(
  rules: RelationshipRule[],
  filters: RelationshipRuleFilters,
  members: RelationshipMember[],
): RelationshipRule[] {
  if (hasInvalidRelationshipRuleDateFilters(filters)) return [];

  const normalizedSearch = filters.search.trim().toLocaleLowerCase();
  const normalizedLabel = filters.label.trim().toLocaleLowerCase();

  return rules.filter((rule) => {
    const searchableValues = [
      rule.id,
      rule.relationshipId,
      rule.createdByUserId,
      getMemberDisplayName(rule.createdByUserId, members),
      rule.name,
      ...rule.labels,
      rule.description,
      rule.status,
      rule.createdAt,
      rule.updatedAt,
      rule.ratifiedAt,
      ...rule.approvals.flatMap((approval) => [
        approval.memberUserId,
        getMemberDisplayName(approval.memberUserId, members),
        approval.agreedAt,
      ]),
    ];
    const matchesSearch =
      !normalizedSearch ||
      searchableValues.some((value) =>
        value?.toLocaleLowerCase().includes(normalizedSearch),
      );
    const matchesLabel =
      !normalizedLabel ||
      rule.labels.some((label) =>
        label.toLocaleLowerCase().includes(normalizedLabel),
      );
    const matchesStatus =
      filters.status === 'all' || rule.status === filters.status;
    const matchesCreator =
      filters.createdByUserId === 'all' ||
      rule.createdByUserId === filters.createdByUserId;
    const matchesApprover =
      filters.requiredApproverUserId === 'all' ||
      rule.approvals.some(
        ({ memberUserId }) => memberUserId === filters.requiredApproverUserId,
      );
    const matchesCreatedDate = matchesDateRange(
      rule.createdAt,
      filters.createdFromDate,
      filters.createdToDate,
    );
    const matchesRatifiedDate = matchesDateRange(
      rule.ratifiedAt,
      filters.ratifiedFromDate,
      filters.ratifiedToDate,
    );

    return (
      matchesSearch &&
      matchesLabel &&
      matchesStatus &&
      matchesCreator &&
      matchesApprover &&
      matchesCreatedDate &&
      matchesRatifiedDate
    );
  });
}
