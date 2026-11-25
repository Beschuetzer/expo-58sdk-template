import React from 'react';
import renderer, { act } from 'react-test-renderer';

import HomeStackLayout, {
  unstable_settings,
} from '../app/(tabs)/(home)/_layout';

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

  return { Stack };
});

jest.mock('@/components/hooks/useClientOnlyValue', () => ({
  useClientOnlyValue: (_server: unknown, client: unknown) => client,
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('HomeStackLayout', () => {
  it('provides a back-button fallback for relationship creation', () => {
    expect(unstable_settings.anchor).toBe('index');

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<HomeStackLayout />);
    });

    const createScreen = screen!.root.find(
      (instance) =>
        String(instance.type) === 'StackScreenHost' &&
        instance.props.name === 'CreateRelationshipScreen',
    );

    expect(createScreen.props.options.headerShown).toBe(true);
    expect(typeof createScreen.props.options.headerLeft).toBe('function');

    const detailScreens = screen!.root.findAll(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const screenOptions = Object.fromEntries(
      detailScreens.map((detailScreen) => [
        detailScreen.props.name,
        detailScreen.props.options,
      ]),
    );

    expect(typeof screenOptions['relationship/[id]'].headerLeft).toBe(
      'function',
    );
    expect(screenOptions['relationship-join-request/[id]'].headerShown).toBe(
      true,
    );
    expect(
      typeof screenOptions['relationship-join-request/[id]'].headerLeft,
    ).toBe('function');

    act(() => screen!.unmount());
  });
});
