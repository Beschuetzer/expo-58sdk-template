import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { MainTabNavigationMenu } from '@/components/ui/MainTabNavigationMenu';
import { AppRoutePaths } from '@/constants/navigation';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockTabsNavigate = jest.fn();

jest.mock('expo-router', () => ({
  useNavigation: () => ({ navigate: mockTabsNavigate }),
  useRouter: () => ({ navigate: mockNavigate, push: mockPush }),
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareButtonHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareButtonPalette', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButtonPaletteProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => React.createElement(React.Fragment, null, children),
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

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareHeading: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareHeadingHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const MENU_ITEM_ROUTES = [
  { label: 'budgets.create', route: AppRoutePaths.createBudget },
  {
    label: 'jointAccountCharges.create',
    route: AppRoutePaths.createJointAccountCharge,
  },
  {
    label: 'paymentRequests.createRelationship',
    route: AppRoutePaths.createRelationship,
  },
  { label: 'rules.create', route: AppRoutePaths.createRule },
  { label: 'time.createMeTime', route: AppRoutePaths.createMeTime },
  { label: 'time.createTask', route: AppRoutePaths.createTask },
  {
    label: 'home.findRelationship',
    route: AppRoutePaths.searchRelationships,
  },
  {
    label: 'paymentRequests.createRequest',
    route: AppRoutePaths.createRequest,
  },
  { label: 'notifications.inbox', route: AppRoutePaths.notifications },
  { label: 'tabs.settings', route: AppRoutePaths.settings },
  { label: 'time.viewAllMeTime', route: AppRoutePaths.viewAllMeTime },
  { label: 'budgets.viewAll', route: AppRoutePaths.budgets },
  {
    label: 'paymentRequests.viewAllRequests',
    route: AppRoutePaths.viewAllRequests,
  },
  { label: 'rules.viewAll', route: AppRoutePaths.viewAllRules },
  {
    label: 'time.viewAllTasks',
    route: AppRoutePaths.viewAllIncompleteTasks,
  },
  {
    label: 'time.viewCompletedTasks',
    route: AppRoutePaths.viewAllCompletedTasks,
  },
  {
    label: 'jointAccountCharges.viewAll',
    route: AppRoutePaths.viewJointAccountCharges,
  },
  {
    label: 'paymentRequests.awaitingDecision',
    route: AppRoutePaths.awaitingDecision,
  },
] as const;
const PUSH_ROUTES = new Set<string>([
  AppRoutePaths.createBudget,
  AppRoutePaths.createJointAccountCharge,
  AppRoutePaths.createRelationship,
  AppRoutePaths.createRule,
  AppRoutePaths.createMeTime,
  AppRoutePaths.createTask,
  AppRoutePaths.createRequest,
  AppRoutePaths.viewAllMeTime,
  AppRoutePaths.budgets,
  AppRoutePaths.viewAllRequests,
  AppRoutePaths.viewAllRules,
  AppRoutePaths.viewAllIncompleteTasks,
  AppRoutePaths.viewAllCompletedTasks,
  AppRoutePaths.viewJointAccountCharges,
]);

describe('MainTabNavigationMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('pushes creation and View All routes and navigates to other destinations', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<MainTabNavigationMenu />);
    });

    for (const { label } of MENU_ITEM_ROUTES) {
      const button = screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareButtonHost' &&
          instance.props.children === label,
      );

      act(() => {
        button.props.onPress();
      });
    }

    expect(mockPush.mock.calls).toEqual(
      MENU_ITEM_ROUTES.filter(({ route }) => PUSH_ROUTES.has(route)).map(
        ({ route }) => [route],
      ),
    );
    expect(mockNavigate.mock.calls).toEqual(
      MENU_ITEM_ROUTES.filter(({ route }) => !PUSH_ROUTES.has(route)).map(
        ({ route }) => [route],
      ),
    );
    expect(mockTabsNavigate).not.toHaveBeenCalled();
  });
});
