import type { RelationshipTaskStatus } from '@expo-50sdk-template/shared-types';

import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';

const COMPLETED_TASK_SKELETON_KEYS = ['task-1', 'task-2', 'task-3'] as const;
const INCOMPLETE_TASK_SKELETON_KEYS = [
  'task-1',
  'task-2',
  'task-3',
  'task-4',
  'task-5',
  'task-6',
] as const;

function IncompleteTaskCardSkeleton() {
  return (
    <HStack space="md" className="items-center justify-between">
      <VStack space="xs" className="min-w-0 flex-1">
        <ThemeAwareSkeleton height={18} shape="text" width="64%" />
        <ThemeAwareSkeleton height={14} shape="text" width="48%" />
      </VStack>
      <HStack space="sm" className="items-center">
        <ThemeAwareSkeleton height={14} shape="text" width={72} />
        <ThemeAwareSkeleton
          height={20}
          shape="row"
          style={{ borderRadius: 4 }}
          width={20}
        />
      </HStack>
    </HStack>
  );
}

function CompletedTaskCardSkeleton() {
  return (
    <VStack space="md" style={{ flex: 1, justifyContent: 'space-between' }}>
      <ThemeAwareSkeleton height={22} shape="text" width="62%" />
      <VStack space="xs">
        <ThemeAwareSkeleton height={14} shape="text" width="36%" />
        <ThemeAwareSkeleton height={16} shape="text" width="52%" />
      </VStack>
      <VStack space="xs">
        <ThemeAwareSkeleton height={14} shape="text" width="28%" />
        <ThemeAwareSkeleton height={16} shape="text" width="46%" />
      </VStack>
      <VStack space="xs">
        <ThemeAwareSkeleton height={14} shape="text" width="32%" />
        <ThemeAwareSkeleton height={16} shape="text" width="58%" />
      </VStack>
    </VStack>
  );
}

export function RelationshipTaskListSkeleton({
  status,
}: {
  status: RelationshipTaskStatus;
}) {
  const isCompleted = status === 'completed';
  const skeletonKeys = isCompleted
    ? COMPLETED_TASK_SKELETON_KEYS
    : INCOMPLETE_TASK_SKELETON_KEYS;

  return (
    <VStack
      space={isCompleted ? 'sm' : undefined}
      className="w-full px-6"
      style={
        isCompleted ? { flex: 1 } : { flex: 1, justifyContent: 'space-between' }
      }
    >
      {skeletonKeys.map((key) => (
        <VStack
          key={key}
          className="pb-2"
          style={isCompleted ? { flex: 1 } : undefined}
        >
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.planning}
            borderRadius="$sm"
            flex={isCompleted ? 1 : undefined}
            p="$4"
          >
            {isCompleted ? (
              <CompletedTaskCardSkeleton />
            ) : (
              <IncompleteTaskCardSkeleton />
            )}
          </ThemeAwareCardSurface>
        </VStack>
      ))}
    </VStack>
  );
}
