import type {
  RelationshipMember,
  RelationshipSummary,
} from './paymentRequests';

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired';

export type RelationshipInvitation = {
  id: string;
  relationshipId: string;
  relationshipName: string;
  inviterUserId: string;
  inviteeEmail?: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

export type CreateInvitationInput = {
  inviteeEmail?: string;
};

export type CreateInvitationResponse = RelationshipInvitation & {
  token: string;
};

export type InvitationPreview = RelationshipInvitation;

export type AcceptInvitationResponse = {
  invitation: RelationshipInvitation;
  relationship: RelationshipSummary;
  member: RelationshipMember;
};
