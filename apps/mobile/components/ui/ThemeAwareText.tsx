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

type ThemeAwareTextProps = ComponentProps<typeof Text> & LegacyStyleProps;

export function ThemeAwareText(props: ThemeAwareTextProps) {
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
      className={className}
      style={[
        {
          color: resolveLegacyColor(color, colorScheme),
          fontFamily,
        },
        legacyStyle,
        explicitStyle,
      ]}
    />
  );
}

export { ThemeAwareHeading } from './ThemeAwareHeading';
