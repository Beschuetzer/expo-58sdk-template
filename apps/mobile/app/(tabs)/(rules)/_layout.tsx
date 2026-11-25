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

export default function RelationshipRulesLayout() {
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
      <Stack.Screen name="index" options={{ title: t('tabs.rules') }} />
      <Stack.Screen
        name="ViewAllRulesScreen"
        options={{
          title: t('rules.viewAll'),
          headerLeft: createNavigationBackButton(AppRoutePaths.rules),
        }}
      />
      <Stack.Screen
        name="NewRelationshipRuleScreen"
        options={{
          title: t('rules.create'),
          headerLeft: createNavigationBackButton(AppRoutePaths.rules),
        }}
      />
      <Stack.Screen
        name="relationship-rule/[id]"
        options={{
          headerLeft: createNavigationBackButton(AppRoutePaths.rules),
        }}
      />
    </Stack>
  );
}
