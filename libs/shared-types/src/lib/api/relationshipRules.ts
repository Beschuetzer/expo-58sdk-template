export type RelationshipRuleStatus = 'pending_approval' | 'ratified';

export type RelationshipRuleApproval = {
  memberUserId: string;
  agreedAt?: string;
};

export type RelationshipRule = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  name: string;
  labels: string[];
  description: string;
  status: RelationshipRuleStatus;
  remindMeToReview: string | null;
  createdAt: string;
  updatedAt: string;
  ratifiedAt?: string;
  approvals: RelationshipRuleApproval[];
};

export type CreateRelationshipRuleInput = {
  name: string;
  labels?: string[];
  description: string;
  requiredApproverUserIds: string[];
  remindMeToReview?: string | null;
};

export type UpdateRelationshipRuleInput = {
  name: string;
  labels?: string[];
  description: string;
};

export type RelationshipRuleListFilters = {
  cursor?: string;
  limit?: number;
};

export type RelationshipRuleListResponse = {
  items: RelationshipRule[];
  nextCursor?: string;
};
