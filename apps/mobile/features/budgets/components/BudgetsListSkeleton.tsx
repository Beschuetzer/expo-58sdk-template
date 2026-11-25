import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';

const BUDGET_SKELETON_KEYS = ['budget-1', 'budget-2', 'budget-3'] as const;

export function BudgetsListSkeleton() {
  return (
    <VStack space="sm" className="w-full" style={{ flex: 1 }}>
      {BUDGET_SKELETON_KEYS.map((key) => (
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.budgeting}
          key={key}
          borderRadius="$sm"
          flex={1}
          p="$4"
        >
          <HStack space="sm" className="items-center" style={{ flex: 1 }}>
            <VStack
              space="sm"
              className="min-w-0 flex-1"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <HStack space="sm" className="items-start justify-between">
                <ThemeAwareSkeleton height={20} shape="text" width="58%" />
                <ThemeAwareSkeleton
                  height={22}
                  shape="text"
                  style={{ borderRadius: 999 }}
                  width={104}
                />
              </HStack>
              <HStack space="sm" className="items-end justify-between">
                <VStack space="xs">
                  <ThemeAwareSkeleton height={14} shape="text" width={76} />
                  <ThemeAwareSkeleton height={23} shape="text" width={88} />
                </VStack>
                <VStack space="xs" className="flex-1 items-end">
                  <ThemeAwareSkeleton height={14} shape="text" width="76%" />
                  <ThemeAwareSkeleton height={14} shape="text" width="88%" />
                </VStack>
              </HStack>
            </VStack>
          </HStack>
        </ThemeAwareCardSurface>
      ))}
    </VStack>
  );
}
