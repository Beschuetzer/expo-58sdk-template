import type { ComponentProps } from 'react';
import { useContext } from 'react';

import { ThemeAwareTextColorContext } from './ThemeAwareTextColorContext';
import {
  resolveLegacyColor,
  splitLegacyStyleProps,
  type LegacyStyleProps,
} from './legacyStyle';

import { Text } from '@/components/ui/text';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { useThemeAwareTypography } from '@/components/ui/useThemeAwareTypography';

type ThemeAwareHeadingProps = ComponentProps<typeof Text> & LegacyStyleProps;

export function ThemeAwareHeading(props: ThemeAwareHeadingProps) {
  const { colorScheme } = useThemeAwareColors();
  const { color: themeColor, fontFamily } = useThemeAwareTypography();
  const inheritedColor = useContext(ThemeAwareTextColorContext);
  const {
    className,
    color: explicitColor,
    style: explicitStyle,
    ...styleProps
  } = props;
  const color = explicitColor ?? inheritedColor ?? themeColor;
  const { props: textProps, style: legacyStyle } = splitLegacyStyleProps(
    { ...styleProps, color },
    colorScheme,
  );

  return (
    <Text
      {...textProps}
      className={`text-xl ${className ?? ''}`}
      style={[
        {
          color: resolveLegacyColor(color, colorScheme),
          fontFamily,
          fontSize: 20,
        },
        legacyStyle,
        explicitStyle,
      ]}
    />
  );
}
