import type { RelationshipMember } from '@expo-50sdk-template/shared-types';

import { ThemeAwareCheckbox } from '@/components/ui/ThemeAwareCheckbox';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import {
  getMemberDisplayName,
  toggleMemberSelection,
} from '@/features/relationships/utils';

export function RelationshipMemberSelector({
  emptyMessage,
  excludedUserIds = [],
  hint,
  label,
  members,
  onChange,
  selectedUserIds,
}: {
  emptyMessage?: string;
  excludedUserIds?: string[];
  hint?: string;
  label: string;
  members: RelationshipMember[];
  onChange: (selectedUserIds: string[]) => void;
  selectedUserIds: string[];
}) {
  const excludedIds = new Set(excludedUserIds);
  const eligibleMembers = members.filter(
    (member) => member.active && !excludedIds.has(member.userId),
  );

  return (
    <VStack space="sm">
      <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
      {hint ? <ThemeAwareText size="sm">{hint}</ThemeAwareText> : null}
      {eligibleMembers.length === 0 ? (
        emptyMessage ? (
          <ThemeAwareText>{emptyMessage}</ThemeAwareText>
        ) : null
      ) : (
        <VStack space="xs">
          {eligibleMembers.map((member) => {
            const isSelected = selectedUserIds.includes(member.userId);
            const memberName = getMemberDisplayName(member.userId, members);

            return (
              <ThemeAwareCheckbox
                key={member.id}
                accessibilityLabel={memberName}
                label={memberName}
                onValueChange={() =>
                  onChange(
                    toggleMemberSelection(selectedUserIds, member.userId),
                  )
                }
                value={isSelected}
              />
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}
