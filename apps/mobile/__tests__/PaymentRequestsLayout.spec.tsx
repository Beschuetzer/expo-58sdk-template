import React from 'react';
import renderer, { act } from 'react-test-renderer';

import PaymentRequestsLayout, {
  unstable_settings,
} from '../app/(tabs)/(requests)/_layout';

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

describe('PaymentRequestsLayout', () => {
  it('anchors money screens to the index and shows their back buttons', () => {
    expect(unstable_settings.anchor).toBe('index');

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<PaymentRequestsLayout />);
    });

    const stack = screen!.root.find(
      (instance) => String(instance.type) === 'StackHost',
    );
    expect(stack.props.screenOptions).toMatchObject({
      headerShown: true,
      headerBackVisible: false,
    });
    expect(typeof stack.props.screenOptions.headerLeft).toBe('function');

    const chargeScreens = screen!.root.findAll(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const screenOptions = Object.fromEntries(
      chargeScreens.map((chargeScreen) => [
        chargeScreen.props.name,
        chargeScreen.props.options,
      ]),
    );

    for (const screenName of [
      'BudgetsScreen',
      'NewBudgetScreen',
      'NewPaymentRequestScreen',
      'AwaitingDecisionScreen',
      'JointAccountChargesScreen',
      'NewJointAccountChargeScreen',
    ]) {
      expect(screenOptions[screenName]).not.toHaveProperty('headerBackVisible');
    }

    expect(typeof screenOptions['NewPaymentRequestScreen'].headerLeft).toBe(
      'function',
    );
    expect(typeof screenOptions['ViewAllRequestsScreen'].headerLeft).toBe(
      'function',
    );
    expect(
      screenOptions['ViewAllRequestsScreen'].headerLeft({ canGoBack: false }),
    ).not.toBeNull();
    expect(typeof screenOptions['AwaitingDecisionScreen'].headerLeft).toBe(
      'function',
    );
    expect(
      screenOptions['AwaitingDecisionScreen'].headerLeft({ canGoBack: false }),
    ).not.toBeNull();
    for (const screenName of [
      'budget/[id]',
      'payment-request/[id]',
      'joint-account-charge/[id]',
    ]) {
      expect(typeof screenOptions[screenName].headerLeft).toBe('function');
    }
    for (const screenName of [
      'JointAccountChargesScreen',
      'NewJointAccountChargeScreen',
    ]) {
      expect(screenOptions[screenName]).not.toHaveProperty('headerLeft');
    }

    act(() => screen!.unmount());
  });
});
