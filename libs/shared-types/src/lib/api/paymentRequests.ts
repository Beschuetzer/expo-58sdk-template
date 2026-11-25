import type { CalendarDateBounds } from './calendar';

export type ApprovalPolicy = 'all_members';

export type RelationshipRole = 'owner' | 'member';

export type RelationshipJoinRequestStatus = 'pending' | 'approved' | 'rejected';

export type PaymentRequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type PaymentRequestDecision =
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type RubricAnswer = string | number | boolean | string[];

export type RubricAnswerType = 'boolean' | 'number' | 'single_choice' | 'text';

export type ActivityEventType =
  | 'created'
  | 'edited'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'cancelled';

export type NotificationDeliveryStatus = 'pending' | 'delivered' | 'failed';

export type NotificationTarget =
  | { type: 'relationship'; id: string }
  | { type: 'relationshipJoinRequest'; id: string; relationshipId: string }
  | { type: 'paymentRequest'; id: string }
  | { type: 'jointAccountCharge'; id: string }
  | { type: 'budget'; id: string }
  | { type: 'relationshipRule'; id: string }
  | { type: 'meTime'; id: string; relationshipId: string }
  | { type: 'relationshipTask'; id: string; relationshipId: string };

export type PushTokenPlatform = 'ios' | 'android';

export type RegisterPushTokenInput = {
  token: string;
  platform: PushTokenPlatform;
};

export type UnregisterPushTokenInput = {
  token: string;
};

export type RelationshipMember = {
  id: string;
  relationshipId: string;
  userId: string;
  displayName?: string;
  role: RelationshipRole;
  active: boolean;
};

export type RelationshipSummary = {
  id: string;
  name: string;
  shareCode: string;
  approvalPolicy: ApprovalPolicy;
  members: RelationshipMember[];
  pendingJoinRequestCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RelationshipSearchResult = {
  id: string;
  name: string;
  shareCode: string;
  memberCount: number;
  owner: {
    displayName: string | null;
    userId: string;
  } | null;
  membershipStatus: 'available' | 'member' | 'pending';
  createdAt: string;
};

export type RelationshipJoinRequest = {
  id: string;
  relationshipId: string;
  requesterUserId: string;
  requesterDisplayName?: string;
  status: RelationshipJoinRequestStatus;
  createdAt: string;
  respondedAt?: string;
  respondedByUserId?: string;
};

export type DecideRelationshipJoinRequestInput = {
  decision: 'approved' | 'rejected';
};

export type SplitAllocation = {
  memberUserId: string;
  percentage: number;
};

export type RubricQuestion = {
  id: string;
  label: string;
  answerType: RubricAnswerType;
  options?: string[];
  weight: number;
  required: boolean;
};

export type RubricVersion = {
  id: string;
  version: number;
  questions: RubricQuestion[];
};

export type PaymentRequestEvaluation = {
  rubricVersionId?: string;
  answers: Record<string, RubricAnswer>;
  recommendation?: string;
  score?: number;
};

export type PaymentRequestDecisionRecord = {
  id: string;
  memberUserId: string;
  decision: PaymentRequestDecision;
  comment?: string;
  createdAt: string;
};

export type ActivityEvent = {
  id: string;
  actorUserId: string;
  eventType: ActivityEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PaymentRequestSummary = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  title: string;
  amountMinorUnits: number;
  currency: string;
  purchaseDate: string;
  categories: string[];
  status: PaymentRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRequest = PaymentRequestSummary & {
  rationale: string;
  requestedSplit: SplitAllocation[];
  evaluation?: PaymentRequestEvaluation;
  decisions: PaymentRequestDecisionRecord[];
  activity: ActivityEvent[];
  resolvedAt?: string;
};

export type CreateRelationshipInput = {
  name: string;
  displayName?: string;
};

export type CreatePaymentRequestInput = {
  title: string;
  rationale: string;
  amountMinorUnits: number;
  currency: string;
  purchaseDate: string;
  categories?: string[];
  requestedSplit: SplitAllocation[];
  evaluation?: PaymentRequestEvaluation;
};

export type UpdatePaymentRequestInput = Omit<
  CreatePaymentRequestInput,
  'evaluation'
> & {
  evaluation?: PaymentRequestEvaluation;
};

export type SubmitPaymentRequestInput = {
  evaluation: PaymentRequestEvaluation;
};

export type DecidePaymentRequestInput = {
  decision: PaymentRequestDecision;
  comment?: string;
};

export type PaymentRequestListFilters = {
  status?: PaymentRequestStatus;
  awaitingMyDecision?: boolean;
  categories?: string[];
  fromDate?: string;
  toDate?: string;
  cursor?: string;
  limit?: number;
};

export type PaymentRequestListResponse = {
  items: PaymentRequestSummary[];
  nextCursor?: string;
  calendarDateBounds?: CalendarDateBounds;
};

export type Notification = {
  id: string;
  recipientUserId: string;
  eventId: string;
  target?: NotificationTarget;
  title: string;
  body: string;
  readAt?: string;
  deliveryStatus: NotificationDeliveryStatus;
  createdAt: string;
};

export type NotificationListResponse = {
  items: Notification[];
  unreadCount: number;
};
