import { ActivityIndicator } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { COLORS } from '@/constants/colors';
import { useI18n } from '@/utils/i18n';

export function ThemeAwareLoadingIndicator({
  size = 'large',
  testID,
}: {
  size?: 'small' | 'large';
  testID?: string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const { t } = useI18n();

  return (
    <ActivityIndicator
      accessibilityLabel={t('common.loading')}
      color={COLORS[colorScheme].tint}
      size={size}
      testID={testID}
    />
  );
}
