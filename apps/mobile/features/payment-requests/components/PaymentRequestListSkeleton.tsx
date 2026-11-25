import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

const REQUEST_SKELETON_KEYS = ['request-1', 'request-2', 'request-3'] as const;

export function PaymentRequestListSkeleton() {
  return (
    <VStack space="sm" className="w-full px-6" style={{ flex: 1 }}>
      {REQUEST_SKELETON_KEYS.map((key) => (
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
                <ThemeAwareSkeleton height={18} shape="text" width="60%" />
                <ThemeAwareSkeleton
                  height={22}
                  shape="text"
                  style={{ borderRadius: 999 }}
                  width={86}
                />
              </HStack>
              <HStack space="sm" className="items-center justify-between">
                <ThemeAwareSkeleton height={20} shape="text" width="38%" />
                <ThemeAwareSkeleton height={14} shape="text" width="26%" />
              </HStack>
            </VStack>
          </ThemeAwareSurface>
        </VStack>
      ))}
    </VStack>
  );
}
