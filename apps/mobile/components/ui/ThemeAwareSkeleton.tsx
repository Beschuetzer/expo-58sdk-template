import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { COLORS } from '@/constants/colors';

export type ThemeAwareSkeletonShape = 'text' | 'card' | 'row';

const SHAPE_STYLES: Record<
  ThemeAwareSkeletonShape,
  Pick<ViewStyle, 'borderRadius' | 'height'>
> = {
  text: { borderRadius: 4, height: 14 },
  card: { borderRadius: 12, height: 144 },
  row: { borderRadius: 8, height: 72 },
};

type ThemeAwareSkeletonProps = Omit<
  ComponentProps<typeof View>,
  'children' | 'style'
> & {
  height?: ViewStyle['height'];
  shape?: ThemeAwareSkeletonShape;
  style?: StyleProp<ViewStyle>;
  width?: ViewStyle['width'];
};

export function ThemeAwareSkeleton({
  height,
  shape = 'text',
  style,
  width = '100%',
  ...viewProps
}: ThemeAwareSkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const shapeStyle = SHAPE_STYLES[shape];

  return (
    <View
      {...viewProps}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          ...shapeStyle,
          backgroundColor: COLORS[colorScheme].skeleton,
          height: height ?? shapeStyle.height,
          width,
        },
        style,
      ]}
    />
  );
}
