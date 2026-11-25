import React from 'react';
import renderer, { act } from 'react-test-renderer';

import AccountLayout, {
  unstable_settings,
} from '../app/(tabs)/(account)/_layout';

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const Stack = Object.assign(
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('StackHost', props, children as React.ReactNode),
    {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
  );

  return { Stack, useRouter: () => ({ navigate: jest.fn() }) };
});

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/MainTabNavigationMenu', () => ({
  MainTabNavigationMenu: 'MainTabNavigationMenuHost',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('AccountLayout', () => {
  it('uses the tab stack header and places the navigation menu on the account root', () => {
    expect(unstable_settings.anchor).toBe('AccountScreen');

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<AccountLayout />);
    });

    const stack = screen!.root.find(
      (instance) => String(instance.type) === 'StackHost',
    );
    expect(stack.props.screenOptions).toMatchObject({
      headerBackVisible: false,
      headerShown: true,
      headerTitleAlign: 'center',
    });

    const accountScreen = screen!.root.find(
      (instance) =>
        String(instance.type) === 'StackScreenHost' &&
        instance.props.name === 'AccountScreen',
    );
    expect(accountScreen.props.options.title).toBe('tabs.account');
    expect(typeof accountScreen.props.options.headerLeft).toBe('function');
    expect(accountScreen.props.options.headerLeft().type).toBe(
      'MainTabNavigationMenuHost',
    );

    const settingsScreen = screen!.root.find(
      (instance) =>
        String(instance.type) === 'StackScreenHost' &&
        instance.props.name === 'SettingsScreen',
    );
    expect(settingsScreen.props.options.title).toBe('settings.title');

    const notificationsScreen = screen!.root.find(
      (instance) =>
        String(instance.type) === 'StackScreenHost' &&
        instance.props.name === 'notifications',
    );
    expect(notificationsScreen.props.options.title).toBe('notifications.inbox');

    act(() => screen!.unmount());
  });
});
