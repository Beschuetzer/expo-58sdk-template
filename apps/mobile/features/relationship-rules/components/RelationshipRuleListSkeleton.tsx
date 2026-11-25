import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';

const RULE_SKELETON_KEYS = ['rule-1', 'rule-2', 'rule-3'] as const;

export function RelationshipRuleListSkeleton() {
  return (
    <VStack space="sm" className="w-full px-6" style={{ flex: 1 }}>
      {RULE_SKELETON_KEYS.map((key) => (
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
                <ThemeAwareSkeleton height={18} shape="text" width="62%" />
                <ThemeAwareSkeleton
                  height={22}
                  shape="text"
                  style={{ borderRadius: 999 }}
                  width={90}
                />
              </HStack>
              <HStack space="xs">
                <ThemeAwareSkeleton
                  height={22}
                  shape="text"
                  style={{ borderRadius: 999 }}
                  width={52}
                />
                <ThemeAwareSkeleton
                  height={22}
                  shape="text"
                  style={{ borderRadius: 999 }}
                  width={68}
                />
              </HStack>
            </VStack>
          </ThemeAwareSurface>
        </VStack>
      ))}
    </VStack>
  );
}
