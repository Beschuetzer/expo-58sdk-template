import React from 'react';
import renderer, { act } from 'react-test-renderer';

import RelationshipRulesLayout, {
  unstable_settings,
} from '../app/(tabs)/(rules)/_layout';

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

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('RelationshipRulesLayout', () => {
  it('anchors rule screens to the index and preserves their back buttons', () => {
    expect(unstable_settings.anchor).toBe('index');

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<RelationshipRulesLayout />);
    });

    const stack = screen!.root.find(
      (instance) => String(instance.type) === 'StackHost',
    );
    expect(stack.props.screenOptions).toMatchObject({
      headerShown: true,
      headerBackVisible: false,
    });
    expect(typeof stack.props.screenOptions.headerLeft).toBe('function');

    const ruleScreens = screen!.root.findAll(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const screenOptions = Object.fromEntries(
      ruleScreens.map((ruleScreen) => [
        ruleScreen.props.name,
        ruleScreen.props.options,
      ]),
    );

    expect(typeof screenOptions['NewRelationshipRuleScreen'].headerLeft).toBe(
      'function',
    );
    expect(typeof screenOptions['relationship-rule/[id]'].headerLeft).toBe(
      'function',
    );
    expect(typeof screenOptions['ViewAllRulesScreen'].headerLeft).toBe(
      'function',
    );
    expect(
      screenOptions['ViewAllRulesScreen'].headerLeft({ canGoBack: false }),
    ).not.toBeNull();

    act(() => screen!.unmount());
  });
});
