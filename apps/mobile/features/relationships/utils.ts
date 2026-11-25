import type {
  RelationshipMember,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';

export function getMemberDisplayName(
  memberUserId: string,
  members: RelationshipMember[],
): string {
  const member = members.find(({ userId }) => userId === memberUserId);
  return member?.displayName?.trim() || member?.userId || memberUserId;
}

export function resolveSelectedRelationship(
  relationships: RelationshipSummary[] | undefined,
  selectedRelationshipId: string | null | undefined,
  allowPersistedSelection: boolean,
) {
  const relationship = relationships?.find(
    ({ id }) => id === selectedRelationshipId,
  );

  return {
    relationship,
    relationshipId:
      relationship?.id ??
      (allowPersistedSelection
        ? selectedRelationshipId ?? undefined
        : undefined),
  };
}

export function toggleMemberSelection(
  selectedMemberIds: string[],
  memberUserId: string,
): string[] {
  return selectedMemberIds.includes(memberUserId)
    ? selectedMemberIds.filter((selectedId) => selectedId !== memberUserId)
    : [...selectedMemberIds, memberUserId];
}
