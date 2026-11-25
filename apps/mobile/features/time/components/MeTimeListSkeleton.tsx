import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { VStack } from '@/components/ui/vstack';

const ME_TIME_SKELETON_KEYS = ['me-time-1', 'me-time-2', 'me-time-3'] as const;

export function MeTimeListSkeleton() {
  return (
    <VStack space="sm" className="w-full px-6" style={{ flex: 1 }}>
      {ME_TIME_SKELETON_KEYS.map((key) => (
        <VStack key={key} className="pb-2" style={{ flex: 1 }}>
          <ThemeAwareSurface
            borderRadius="$sm"
            borderWidth="$1"
            flex={1}
            p="$4"
          >
            <VStack
              space="xs"
              style={{ flex: 1, justifyContent: 'space-between' }}
            >
              <ThemeAwareSkeleton height={17} shape="text" width="64%" />
              <ThemeAwareSkeleton height={14} shape="text" width="78%" />
              <ThemeAwareSkeleton height={14} shape="text" width="72%" />
              <ThemeAwareSkeleton height={14} shape="text" width="45%" />
            </VStack>
          </ThemeAwareSurface>
        </VStack>
      ))}
    </VStack>
  );
}
