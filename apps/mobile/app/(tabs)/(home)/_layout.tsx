import { Stack } from 'expo-router';

import { useClientOnlyValue } from '@/components/hooks/useClientOnlyValue';
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

export default function HomeStackLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        ...stackPageTitleScreenOptions,
        ...getNavigationHeaderOptions(colorScheme),
        headerShown: false,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: useClientOnlyValue(false, true),
          headerTitleAlign: 'center',
          title: t('tabs.home'),
        }}
      />
      <Stack.Screen
        name="CreateRelationshipScreen"
        options={{
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: createNavigationBackButton(AppRoutePaths.home),
          title: t('paymentRequests.createRelationship'),
        }}
      />
      <Stack.Screen
        name="relationship/[id]"
        options={{
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: createNavigationBackButton(AppRoutePaths.home),
        }}
      />
      <Stack.Screen
        name="relationship-join-request/[id]"
        options={{
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: createNavigationBackButton(AppRoutePaths.home),
        }}
      />
    </Stack>
  );
}
