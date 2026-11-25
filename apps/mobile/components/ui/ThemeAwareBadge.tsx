import type { ReactNode } from 'react';

import { resolveLegacyColor } from './legacyStyle';

import { Badge, BadgeText } from '@/components/ui/badge';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { useThemeAwareTypography } from '@/components/ui/useThemeAwareTypography';

type ThemeAwareBadgeProps = {
  children: ReactNode;
  darkBackground?: string;
  darkTextColor?: string;
  lightBackground?: string;
  lightTextColor?: string;
};

export function ThemeAwareBadge({
  children,
  darkBackground = '$backgroundDark800',
  darkTextColor = '$textDark50',
  lightBackground = '$coolGray100',
  lightTextColor = '$textLight900',
}: ThemeAwareBadgeProps) {
  const { colorScheme } = useThemeAwareColors();
  const { fontFamily } = useThemeAwareTypography();
  const isDark = colorScheme === 'dark';
  const backgroundColor = resolveLegacyColor(
    isDark ? darkBackground : lightBackground,
    colorScheme,
  );
  const color = resolveLegacyColor(
    isDark ? darkTextColor : lightTextColor,
    colorScheme,
  );

  return (
    <Badge
      style={{
        backgroundColor,
        borderRadius: 2,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <BadgeText
        style={{
          color,
          fontFamily,
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'none',
        }}
      >
        {children}
      </BadgeText>
    </Badge>
  );
}
