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

export default function TimeLayout() {
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
      <Stack.Screen name="index" options={{ title: t('tabs.time') }} />
      <Stack.Screen
        name="ViewAllMeTimeScreen"
        options={{
          title: t('time.viewAllMeTime'),
          headerLeft: createNavigationBackButton(AppRoutePaths.time),
        }}
      />
      <Stack.Screen
        name="NewMeTimeScreen"
        options={{
          title: t('time.createMeTime'),
          headerLeft: createNavigationBackButton(AppRoutePaths.time),
        }}
      />
      <Stack.Screen
        name="EditMeTimeScreen"
        options={{
          title: t('time.editMeTime'),
          headerLeft: createNavigationBackButton(AppRoutePaths.time),
        }}
      />
      <Stack.Screen
        name="MeTimeDetailsScreen"
        options={{
          title: t('time.meTimeDetails'),
          headerLeft: createNavigationBackButton(AppRoutePaths.time),
        }}
      />
      <Stack.Screen
        name="ViewAllIncompleteTasksScreen"
        options={{ title: t('time.viewAllTasks') }}
      />
      <Stack.Screen
        name="ViewAllCompletedTasksScreen"
        options={{ title: t('time.viewCompletedTasks') }}
      />
      <Stack.Screen
        name="NewTaskScreen"
        options={{
          title: t('time.createTask'),
          headerLeft: createNavigationBackButton(AppRoutePaths.time),
        }}
      />
      <Stack.Screen
        name="EditTaskScreen"
        options={{
          title: t('time.editTask'),
          headerLeft: createNavigationBackButton(AppRoutePaths.time),
        }}
      />
      <Stack.Screen
        name="RelationshipTaskDetailsScreen"
        options={{
          title: t('time.taskDetails'),
          headerLeft: createNavigationBackButton(AppRoutePaths.time),
        }}
      />
    </Stack>
  );
}
