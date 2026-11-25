import { useColorScheme } from '@/components/hooks/useColorScheme';
import { COLORS } from '@/constants/colors';

export function useThemeAwareColors() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = COLORS[colorScheme];

  const getTextColor = (onSolidBackground = false) => {
    return onSolidBackground ? '#ffffff' : palette.text;
  };

  return {
    backgroundColor: palette.background,
    colorScheme,
    getTextColor,
    textColor: getTextColor(),
  } as const;
}
