import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

const DECISION_SKELETON_KEYS = [
  'decision-1',
  'decision-2',
  'decision-3',
] as const;

export function AwaitingDecisionListSkeleton() {
  return (
    <VStack space="md" className="w-full px-6" style={{ flex: 1 }}>
      {DECISION_SKELETON_KEYS.map((key) => (
        <VStack key={key} className="pb-2" style={{ flex: 1 }}>
          <ThemeAwareSurface
            borderRadius="$sm"
            borderWidth="$1"
            flex={1}
            p="$4"
          >
            <VStack
              space="sm"
              style={{ flex: 1, justifyContent: 'space-between' }}
            >
              <HStack space="sm" className="items-center justify-between">
                <ThemeAwareSkeleton height={14} shape="text" width="52%" />
                <ThemeAwareSkeleton height={14} shape="text" width="25%" />
              </HStack>
              <ThemeAwareSkeleton height={18} shape="text" width="72%" />
              <HStack space="sm" className="items-center justify-between">
                <ThemeAwareSkeleton height={14} shape="text" width="34%" />
                <ThemeAwareSkeleton height={18} shape="text" width={18} />
              </HStack>
            </VStack>
          </ThemeAwareSurface>
        </VStack>
      ))}
    </VStack>
  );
}
