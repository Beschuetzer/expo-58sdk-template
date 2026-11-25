import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import type { ColorValue } from 'react-native';

import { useClientOnlyValue } from '@/components/hooks/useClientOnlyValue';
import { useColorScheme } from '@/components/hooks/useColorScheme';
import { AppRoutePaths, Routes } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getProfilePictureFromClaims } from '@/features/auth/client';
import { useI18n } from '@/utils/i18n';
import { pageTitleScreenOptions } from '@/utils/pageTitle';
import {
  getNavigationHeaderOptions,
  getNavigationTabBarOptions,
} from '@/utils/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: ColorValue | null;
}) {
  const color =
    typeof props.color === 'number' ? undefined : props.color ?? undefined;

  return (
    <FontAwesome
      color={color}
      name={props.name}
      size={28}
      style={{ marginBottom: -3 }}
    />
  );
}

export default function TabLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { user } = useOAuth2Auth();
  const picture = user ? getProfilePictureFromClaims(user.claims) : undefined;
  const navigateTabToRootOnPress = (href: Href) => () => ({
    tabPress: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      router.navigate(href);
    },
  });

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        popToTopOnBlur: true,
        ...pageTitleScreenOptions,
        ...getNavigationHeaderOptions(colorScheme),
        ...getNavigationTabBarOptions(colorScheme),
        headerShown: useClientOnlyValue(false, true),
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          headerTitleAlign: 'center',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
        listeners={navigateTabToRootOnPress(AppRoutePaths.home)}
      />
      <Tabs.Screen
        name="(requests)"
        options={{
          title: t('tabs.money'),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="money" color={color} />,
        }}
        listeners={navigateTabToRootOnPress(AppRoutePaths.money)}
      />
      <Tabs.Screen
        name="(rules)"
        options={{
          title: t('tabs.rules'),
          headerShown: false,
          headerTitleAlign: 'center',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
        listeners={navigateTabToRootOnPress(AppRoutePaths.rules)}
      />
      <Tabs.Screen
        name="(time)"
        options={{
          title: t('tabs.time'),
          headerShown: false,
          headerTitleAlign: 'center',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="clock-o" color={color} />
          ),
        }}
        listeners={navigateTabToRootOnPress(AppRoutePaths.time)}
      />
      <Tabs.Screen
        name="(sex)"
        options={{
          title: t('tabs.sex'),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="heart" color={color} />,
        }}
        listeners={navigateTabToRootOnPress(AppRoutePaths.sex)}
      />
      <Tabs.Screen
        name={Routes.AccountTab}
        options={{
          title: t('tabs.account'),
          headerShown: false,
          tabBarIcon: ({ color }) =>
            picture ? (
              <Image
                contentFit="cover"
                source={picture}
                style={{ borderRadius: 14, height: 28, width: 28 }}
              />
            ) : (
              <TabBarIcon name="user" color={color} />
            ),
        }}
        listeners={navigateTabToRootOnPress(AppRoutePaths.account)}
      />
    </Tabs>
  );
}
