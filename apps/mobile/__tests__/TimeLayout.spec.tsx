import React from 'react';
import renderer, { act } from 'react-test-renderer';

import TimeLayout, { unstable_settings } from '../app/(tabs)/(time)/_layout';

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

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('TimeLayout', () => {
  it('provides back-button fallbacks for View All, detail, creation, and edit screens', () => {
    expect(unstable_settings.anchor).toBe('index');

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<TimeLayout />);
    });

    const createScreens = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'StackScreenHost' &&
        ['NewMeTimeScreen', 'NewTaskScreen', 'EditTaskScreen'].includes(
          instance.props.name,
        ),
    );

    expect(createScreens).toHaveLength(3);
    createScreens.forEach((createScreen) => {
      expect(typeof createScreen.props.options.headerLeft).toBe('function');
    });

    const detailScreens = screen!.root.findAll(
      (instance) =>
        String(instance.type) === 'StackScreenHost' &&
        ['MeTimeDetailsScreen', 'RelationshipTaskDetailsScreen'].includes(
          instance.props.name,
        ),
    );
    const viewAllScreen = screen!.root.find(
      (instance) =>
        String(instance.type) === 'StackScreenHost' &&
        instance.props.name === 'ViewAllMeTimeScreen',
    );

    expect(detailScreens).toHaveLength(2);
    detailScreens.forEach((detailScreen) => {
      expect(typeof detailScreen.props.options.headerLeft).toBe('function');
    });
    expect(typeof viewAllScreen.props.options.headerLeft).toBe('function');
    expect(
      viewAllScreen.props.options.headerLeft({ canGoBack: false }),
    ).not.toBeNull();

    act(() => screen!.unmount());
  });
});
