import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { MainTabNavigationMenu } from '@/components/ui/MainTabNavigationMenu';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths } from '@/constants/navigation';
import { useI18n } from '@/utils/i18n';
import { stackPageTitleScreenOptions } from '@/utils/pageTitle';
import { getNavigationHeaderOptions } from '@/utils/theme';

export const unstable_settings = {
  anchor: 'AccountScreen',
};

export default function AccountLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        ...stackPageTitleScreenOptions,
        ...getNavigationHeaderOptions(colorScheme ?? 'light'),
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="AccountScreen"
        options={{
          title: t('tabs.account'),
          headerLeft: () => <MainTabNavigationMenu />,
          headerRight: () => (
            <TouchableOpacity
              activeOpacity={0.6}
              accessibilityLabel={t('tabs.settings')}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.navigate(AppRoutePaths.settings)}
              style={{
                marginRight: 12,
                padding: 8,
              }}
            >
              <FontAwesome
                name="cog"
                size={20}
                color={COLORS[colorScheme ?? 'light'].tint}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="SettingsScreen"
        options={{
          title: t('settings.title'),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: t('notifications.inbox'),
        }}
      />
    </Stack>
  );
}
