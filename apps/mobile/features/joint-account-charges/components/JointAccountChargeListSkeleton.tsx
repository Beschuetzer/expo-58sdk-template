import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

const CHARGE_SKELETON_KEYS = ['charge-1', 'charge-2', 'charge-3'] as const;

export function JointAccountChargeListSkeleton() {
  return (
    <VStack space="sm" className="w-full px-6" style={{ flex: 1 }}>
      {CHARGE_SKELETON_KEYS.map((key) => (
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
              <HStack space="sm" className="items-start justify-between">
                <ThemeAwareSkeleton height={16} shape="text" width="62%" />
                <ThemeAwareSkeleton
                  height={22}
                  shape="text"
                  style={{ borderRadius: 999 }}
                  width={64}
                />
              </HStack>
              <ThemeAwareSkeleton height={24} shape="text" width="42%" />
              <HStack space="sm" className="justify-between">
                <ThemeAwareSkeleton height={14} shape="text" width="30%" />
                <ThemeAwareSkeleton height={14} shape="text" width="38%" />
              </HStack>
            </VStack>
          </ThemeAwareSurface>
        </VStack>
      ))}
    </VStack>
  );
}
