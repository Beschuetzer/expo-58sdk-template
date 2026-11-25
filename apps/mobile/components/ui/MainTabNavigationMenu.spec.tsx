import React, { type ReactNode } from 'react';
import renderer, { act } from 'react-test-renderer';

import { MainTabNavigationMenu } from './MainTabNavigationMenu';

import { AppRoutePaths } from '@/constants/navigation';

const mockRouterNavigate = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    navigate: mockRouterNavigate,
    push: mockRouterPush,
  }),
}));

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    VStack: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('VStackHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ThemeAwareButtonHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareMenu', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareMenu: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ThemeAwareMenuHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareHeading: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ThemeAwareHeadingHost', props, children),
  };
});

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('MainTabNavigationMenu', () => {
  afterEach(() => {
    mockRouterNavigate.mockClear();
    mockRouterPush.mockClear();
  });

  it('lists additional destinations alphabetically and closes before navigating', () => {
    const screen = renderer.create(<MainTabNavigationMenu />);
    const getMenu = () =>
      screen.root.find(
        (instance) => String(instance.type) === 'ThemeAwareMenuHost',
      );
    const menu = getMenu();

    expect(menu.props.side).toBe('left');
    expect(menu.props.header.props.children).toBe('menu.navigation');

    const actions = screen.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareButtonHost',
    );
    expect(actions.map((action) => action.props.children)).toEqual([
      'budgets.create',
      'jointAccountCharges.create',
      'paymentRequests.createRelationship',
      'rules.create',
      'time.createMeTime',
      'time.createTask',
      'paymentRequests.createRequest',
      'home.findRelationship',
      'notifications.inbox',
      'tabs.settings',
      'time.viewAllMeTime',
      'budgets.viewAll',
      'paymentRequests.viewAllRequests',
      'rules.viewAll',
      'time.viewAllTasks',
      'time.viewCompletedTasks',
      'jointAccountCharges.viewAll',
      'paymentRequests.awaitingDecision',
    ]);

    const destinations = [
      AppRoutePaths.createBudget,
      AppRoutePaths.createJointAccountCharge,
      AppRoutePaths.createRelationship,
      AppRoutePaths.createRule,
      AppRoutePaths.createMeTime,
      AppRoutePaths.createTask,
      AppRoutePaths.createRequest,
      AppRoutePaths.searchRelationships,
      AppRoutePaths.notifications,
      AppRoutePaths.settings,
      AppRoutePaths.viewAllMeTime,
      AppRoutePaths.budgets,
      AppRoutePaths.viewAllRequests,
      AppRoutePaths.viewAllRules,
      AppRoutePaths.viewAllIncompleteTasks,
      AppRoutePaths.viewAllCompletedTasks,
      AppRoutePaths.viewJointAccountCharges,
      AppRoutePaths.awaitingDecision,
    ];
    const pushDestinations = new Set<string>([
      AppRoutePaths.createBudget,
      AppRoutePaths.createJointAccountCharge,
      AppRoutePaths.createRelationship,
      AppRoutePaths.createRequest,
      AppRoutePaths.createRule,
      AppRoutePaths.createMeTime,
      AppRoutePaths.createTask,
      AppRoutePaths.viewAllMeTime,
      AppRoutePaths.budgets,
      AppRoutePaths.viewAllRequests,
      AppRoutePaths.viewAllRules,
      AppRoutePaths.viewAllIncompleteTasks,
      AppRoutePaths.viewAllCompletedTasks,
      AppRoutePaths.viewJointAccountCharges,
    ]);

    act(() => {
      getMenu().props.onOpenChange(true);
    });
    expect(getMenu().props.open).toBe(true);

    actions.forEach((action, index) => {
      act(() => {
        action.props.onPress();
      });

      if (pushDestinations.has(destinations[index])) {
        expect(mockRouterPush).toHaveBeenCalledWith(destinations[index]);
      } else {
        expect(mockRouterNavigate).toHaveBeenCalledWith(destinations[index]);
      }
      expect(getMenu().props.open).toBe(false);
    });

    expect(mockRouterPush.mock.calls).toEqual([
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
    expect(mockRouterNavigate.mock.calls).toEqual([
      [AppRoutePaths.searchRelationships],
      [AppRoutePaths.notifications],
      [AppRoutePaths.settings],
      [AppRoutePaths.awaitingDecision],
    ]);

    act(() => screen.unmount());
  });
});
