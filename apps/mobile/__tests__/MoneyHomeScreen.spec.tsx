import React from 'react';
import { TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import MoneyHomeScreen from '../app/(tabs)/(requests)/index';

import { AppRoutePaths } from '@/constants/navigation';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
let mockTranslationOverrides: Record<string, string> = {};

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useRouter: () => ({ navigate: mockNavigate, push: mockPush }),
  };
});

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: (props: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareButtonHost',
        props,
        props.children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareMenu', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareMenu: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareMenuHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareScreenHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareSurface: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareSurfaceHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createComponent =
    (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children as React.ReactNode);

  return {
    ThemeAwareHeading: createComponent('ThemeAwareHeadingHost'),
    ThemeAwareText: createComponent('ThemeAwareTextHost'),
  };
});

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string) => mockTranslationOverrides[key] ?? key,
  }),
}));

describe('MoneyHomeScreen', () => {
  afterEach(() => {
    mockTranslationOverrides = {};
    jest.clearAllMocks();
  });

  it('sorts TouchableOpacity action cards by name and routes menu actions', () => {
    mockTranslationOverrides = {
      'budgets.create': 'Create budget',
      'budgets.createDescription': 'Create budget description',
      'budgets.viewAll': 'View budgets',
      'budgets.viewAllDescription': 'View budgets description',
      'paymentRequests.viewAllRequests': 'View All Requests',
      'paymentRequests.createRequest': 'Create payment request',
      'paymentRequests.awaitingDecision': 'View items needing a decision',
      'jointAccountCharges.viewAll': 'View joint account charges',
      'jointAccountCharges.create': 'Create a joint account charge',
    };

    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<MoneyHomeScreen />);
    });

    const stackScreen = screen!.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    expect(stackScreen.props.options.title).toBe('tabs.money');
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareHeadingHost',
      )[0]?.props.children,
    ).toBe('paymentRequests.moneyOverviewTitle');
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).toEqual([
      'paymentRequests.moneyOverviewDescription',
      'Create a joint account charge',
      'jointAccountCharges.createDescription',
      'Create budget',
      'Create budget description',
      'Create payment request',
      'paymentRequests.createRequestDescription',
      'View All Requests',
      'paymentRequests.viewAllRequestsDescription',
      'View budgets',
      'View budgets description',
      'View items needing a decision',
      'paymentRequests.awaitingDecisionDescription',
      'View joint account charges',
      'jointAccountCharges.viewAllDescription',
    ]);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
      ),
    ).toHaveLength(7);

    const sectionLabels = [
      'Create a joint account charge',
      'Create budget',
      'Create payment request',
      'View All Requests',
      'View budgets',
      'View items needing a decision',
      'View joint account charges',
    ];
    const sectionActions = screen!.root.findAll(
      (instance) =>
        instance.type === TouchableOpacity &&
        sectionLabels.includes(instance.props.accessibilityLabel) &&
        instance.props.accessibilityRole === 'button' &&
        instance.props.activeOpacity === 0.75 &&
        typeof instance.props.onPress === 'function',
    );
    expect(
      sectionActions.map((action) => action.props.accessibilityLabel),
    ).toEqual(sectionLabels);
    expect(sectionActions[0]?.props.activeOpacity).toBe(0.75);

    act(() => {
      sectionActions.forEach((action) => action.props.onPress());
    });
    expect(mockPush.mock.calls).toEqual([
      [AppRoutePaths.createJointAccountCharge],
      [AppRoutePaths.createBudget],
      [AppRoutePaths.createRequest],
    ]);
    [
      AppRoutePaths.viewAllRequests,
      AppRoutePaths.budgets,
      AppRoutePaths.awaitingDecision,
      AppRoutePaths.viewJointAccountCharges,
    ].forEach((route, index) => {
      expect(mockNavigate).toHaveBeenNthCalledWith(index + 1, route);
    });
    mockNavigate.mockClear();
    mockPush.mockClear();

    const menuElement = stackScreen.props.options.headerLeft();
    let menu: renderer.ReactTestRenderer;
    act(() => {
      menu = renderer.create(menuElement);
    });

    const actions = menu!.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareButtonHost',
    );
    expect(actions.map((action) => action.props.children)).toEqual([
      'Create budget',
      'Create a joint account charge',
      'paymentRequests.createRelationship',
      'rules.create',
      'time.createMeTime',
      'time.createTask',
      'Create payment request',
      'home.findRelationship',
      'notifications.inbox',
      'tabs.settings',
      'time.viewAllMeTime',
      'View budgets',
      'View All Requests',
      'rules.viewAll',
      'time.viewAllTasks',
      'time.viewCompletedTasks',
      'View joint account charges',
      'View items needing a decision',
    ]);

    mockNavigate.mockClear();
    actions.forEach((action) => {
      act(() => {
        action.props.onPress();
      });
    });
    expect(mockPush.mock.calls).toEqual([
      [AppRoutePaths.createBudget],
      [AppRoutePaths.createJointAccountCharge],
      [AppRoutePaths.createRelationship],
      [AppRoutePaths.createRule],
      [AppRoutePaths.createMeTime],
      [AppRoutePaths.createTask],
      [AppRoutePaths.createRequest],
      [AppRoutePaths.viewAllMeTime],
      [AppRoutePaths.budgets],
      [AppRoutePaths.viewAllRequests],
      [AppRoutePaths.viewAllRules],
      [AppRoutePaths.viewAllIncompleteTasks],
      [AppRoutePaths.viewAllCompletedTasks],
      [AppRoutePaths.viewJointAccountCharges],
    ]);
    expect(mockNavigate.mock.calls).toEqual([
      [AppRoutePaths.searchRelationships],
      [AppRoutePaths.notifications],
      [AppRoutePaths.settings],
      [AppRoutePaths.awaitingDecision],
    ]);

    act(() => {
      menu!.unmount();
      screen!.unmount();
    });
  });
});
