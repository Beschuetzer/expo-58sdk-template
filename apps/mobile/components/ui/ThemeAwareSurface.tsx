import type { ComponentProps } from 'react';

import { ThemeAwareTextColorContext } from './ThemeAwareTextColorContext';
import {
  resolveLegacyColor,
  splitLegacyStyleProps,
  type LegacyStyleProps,
} from './legacyStyle';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { Box } from '@/components/ui/box';

type ThemeAwareSurfaceProps = ComponentProps<typeof Box> &
  LegacyStyleProps & {
    darkBackground?: string;
    lightBackground?: string;
  };

export function ThemeAwareSurface({
  darkBackground = '$backgroundDark950',
  lightBackground = '$backgroundLight0',
  ...props
}: ThemeAwareSurfaceProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const { className, style: explicitStyle, ...styleProps } = props;
  const hasBorderWidth = [
    styleProps.borderWidth,
    styleProps.borderTopWidth,
    styleProps.borderRightWidth,
    styleProps.borderBottomWidth,
    styleProps.borderLeftWidth,
  ].some((width) => width !== undefined);
  const defaultBorderColor =
    hasBorderWidth && styleProps.borderColor === undefined
      ? 'transparent'
      : undefined;
  const { props: boxProps, style: legacyStyle } = splitLegacyStyleProps(
    styleProps,
    colorScheme,
  );

  return (
    <ThemeAwareTextColorContext.Provider value={undefined}>
      <Box
        {...boxProps}
        className={className}
        style={[
          {
            backgroundColor: resolveLegacyColor(
              colorScheme === 'dark' ? darkBackground : lightBackground,
              colorScheme,
            ),
          },
          defaultBorderColor === undefined
            ? undefined
            : { borderColor: defaultBorderColor },
          legacyStyle,
          explicitStyle,
        ]}
      />
    </ThemeAwareTextColorContext.Provider>
  );
}
