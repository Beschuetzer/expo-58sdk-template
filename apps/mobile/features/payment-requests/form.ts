import type {
  RelationshipMember,
  RubricAnswer,
  SplitAllocation,
} from '@expo-50sdk-template/shared-types';

import { getMemberDisplayName } from '@/features/relationships/utils';

export { parseAmountToMinorUnits } from '@/utils/money';
export {
  getMemberDisplayName,
  toggleMemberSelection,
} from '@/features/relationships/utils';

export function hasRubricAnswer(value: RubricAnswer | undefined): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return (
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

export function getSelectedMemberNames(
  selectedMemberIds: string[],
  members: RelationshipMember[],
): string[] {
  return selectedMemberIds.map((selectedId) =>
    getMemberDisplayName(selectedId, members),
  );
}

export function getJointAccountPercentage(
  requestedSplit: SplitAllocation[],
  creatorUserId: string,
): number {
  const creatorShare = requestedSplit.find(
    (allocation) => allocation.memberUserId === creatorUserId,
  )?.percentage;
  return 100 - (creatorShare ?? 0);
}

export function withJointAccountPercentage(
  requestedSplit: SplitAllocation[],
  creatorUserId: string,
  jointAccountPercentage: number,
  otherMemberUserIds: string[] = [],
): SplitAllocation[] {
  const activeOtherMemberIds = new Set(
    otherMemberUserIds.filter((userId) => userId !== creatorUserId),
  );
  const existingOtherAllocations = requestedSplit.filter(
    (allocation) =>
      allocation.memberUserId !== creatorUserId &&
      (activeOtherMemberIds.size === 0 ||
        activeOtherMemberIds.has(allocation.memberUserId)),
  );
  const otherMemberIds =
    existingOtherAllocations.length > 0
      ? existingOtherAllocations.map((allocation) => allocation.memberUserId)
      : [...activeOtherMemberIds];

  if (otherMemberIds.length === 0) {
    return requestedSplit;
  }

  const existingOtherTotal = existingOtherAllocations.reduce(
    (total, allocation) => total + allocation.percentage,
    0,
  );
  const otherAllocations = otherMemberIds.map((memberUserId) => {
    const existingAllocation = existingOtherAllocations.find(
      (allocation) => allocation.memberUserId === memberUserId,
    );
    const share =
      existingOtherTotal > 0
        ? (existingAllocation?.percentage ?? 0) / existingOtherTotal
        : 1 / otherMemberIds.length;

    return {
      memberUserId,
      percentage: jointAccountPercentage * share,
    };
  });
  const updatedOtherAllocations = new Map(
    otherAllocations.map((allocation) => [allocation.memberUserId, allocation]),
  );
  const hasCreatorAllocation = requestedSplit.some(
    (allocation) => allocation.memberUserId === creatorUserId,
  );
  const updatedSplit = requestedSplit.flatMap((allocation) => {
    if (allocation.memberUserId === creatorUserId) {
      return [
        {
          ...allocation,
          percentage: 100 - jointAccountPercentage,
        },
      ];
    }
    const updatedAllocation = updatedOtherAllocations.get(
      allocation.memberUserId,
    );
    if (updatedAllocation) return [updatedAllocation];
    return activeOtherMemberIds.size === 0 ? [allocation] : [];
  });

  return [
    ...(hasCreatorAllocation
      ? updatedSplit
      : [
          {
            memberUserId: creatorUserId,
            percentage: 100 - jointAccountPercentage,
          },
          ...updatedSplit,
        ]),
    ...otherAllocations.filter(
      (allocation) =>
        !requestedSplit.some(
          (existing) => existing.memberUserId === allocation.memberUserId,
        ),
    ),
  ];
}
