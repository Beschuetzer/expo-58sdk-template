import { Stack } from 'expo-router';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { AppRoutePaths } from '@/constants/navigation';
import { useI18n } from '@/utils/i18n';
import {
  createNavigationBackButton,
  stackPageTitleScreenOptions,
} from '@/utils/pageTitle';
import { getNavigationHeaderOptions } from '@/utils/theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function SexLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        ...stackPageTitleScreenOptions,
        ...getNavigationHeaderOptions(colorScheme),
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('tabs.sex') }} />
      <Stack.Screen
        name="LoveMakingSessionsScreen"
        options={{
          title: t('sex.sessionsTitle'),
          headerLeft: createNavigationBackButton(AppRoutePaths.sex),
        }}
      />
      <Stack.Screen
        name="DateNightScreen"
        options={{
          title: t('dateNight.title'),
          headerLeft: createNavigationBackButton(AppRoutePaths.sex),
        }}
      />
    </Stack>
  );
}
