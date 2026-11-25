import type { ComponentProps, ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';

import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { VStack } from '@/components/ui/vstack';
import { useTileSet } from '@/utils/tileSet';

type ThemeAwareActionCardProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  backgroundImage: ComponentProps<
    typeof ThemeAwareCardSurface
  >['backgroundImage'];
  borderRadius?: ComponentProps<typeof ThemeAwareCardSurface>['borderRadius'];
  children: ReactNode;
  footer?: ReactNode;
  onPress: () => void;
};

export function ThemeAwareActionCard({
  accessibilityHint,
  accessibilityLabel,
  backgroundImage,
  borderRadius = '$sm',
  children,
  footer,
  onPress,
}: ThemeAwareActionCardProps) {
  const { tileGradientsEnabled } = useTileSet();
  const touchableOpacityProps = {
    activeOpacity: 0.75,
    accessibilityHint,
    accessibilityLabel,
    accessibilityRole: 'button' as const,
    onPress,
  };

  if (footer !== undefined) {
    return (
      <ThemeAwareCardSurface
        backgroundImage={backgroundImage}
        customGradientEnabled={tileGradientsEnabled}
        borderRadius={borderRadius}
        borderWidth="$1"
        paletteKey={accessibilityLabel}
        p="$4"
        width="100%"
      >
        <VStack space="sm">
          <TouchableOpacity {...touchableOpacityProps}>
            {children}
          </TouchableOpacity>
          {footer}
        </VStack>
      </ThemeAwareCardSurface>
    );
  }

  return (
    <TouchableOpacity {...touchableOpacityProps}>
      <ThemeAwareCardSurface
        backgroundImage={backgroundImage}
        customGradientEnabled={tileGradientsEnabled}
        borderRadius={borderRadius}
        borderWidth="$1"
        paletteKey={accessibilityLabel}
        p="$4"
        width="100%"
      >
        {children}
      </ThemeAwareCardSurface>
    </TouchableOpacity>
  );
}
