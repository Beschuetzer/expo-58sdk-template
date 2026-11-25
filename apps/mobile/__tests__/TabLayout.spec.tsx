import React from 'react';
import renderer, { act } from 'react-test-renderer';

import TabLayout from '../app/(tabs)/_layout';

import { AppRoutePaths } from '@/constants/navigation';

const mockNavigate = jest.fn();
let mockAuthUser: { claims: Record<string, unknown> } | null = null;
let mockProfilePicture: string | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('expo-image', () => ({
  Image: 'ImageHost',
}));

jest.mock('expo-router/js-tabs', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const Tabs = Object.assign(
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('TabsHost', props, children as React.ReactNode),
    {
      Screen: ({ children, ...props }: Record<string, unknown>) =>
        React.createElement(
          'TabsScreenHost',
          props,
          children as React.ReactNode,
        ),
    },
  );

  return { Tabs };
});

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('@/components/hooks/useClientOnlyValue', () => ({
  useClientOnlyValue: (_server: unknown, client: unknown) => client,
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => ({ user: mockAuthUser }),
}));

jest.mock('@/features/auth/client', () => ({
  getProfilePictureFromClaims: () => mockProfilePicture,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('@/utils/pageTitle', () => ({
  pageTitleScreenOptions: {},
}));

jest.mock('@/utils/theme', () => ({
  getNavigationHeaderOptions: () => ({}),
  getNavigationTabBarOptions: () => ({}),
}));

describe('TabLayout', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockAuthUser = null;
    mockProfilePicture = undefined;
  });

  it('uses stable tab history and navigates to each tab root when pressed', () => {
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<TabLayout />);
    });

    const tabs = screen!.root.find(
      (instance) => String(instance.type) === 'TabsHost',
    );
    expect(tabs.props.backBehavior).toBe('history');
    expect(tabs.props.screenOptions.popToTopOnBlur).toBe(true);

    const tabRoutes = [
      ['(home)', AppRoutePaths.home],
      ['(requests)', AppRoutePaths.money],
      ['(rules)', AppRoutePaths.rules],
      ['(time)', AppRoutePaths.time],
      ['(sex)', AppRoutePaths.sex],
      ['(account)', AppRoutePaths.account],
    ];

    for (const [name, href] of tabRoutes) {
      const tab = screen!.root.find(
        (instance) =>
          String(instance.type) === 'TabsScreenHost' &&
          instance.props.name === name,
      );
      const listeners = tab.props.listeners as (props: {
        navigation: { isFocused: () => boolean };
      }) => {
        tabPress: (event: { preventDefault: () => void }) => void;
      };

      for (const isFocused of [false, true]) {
        const preventDefault = jest.fn();

        act(() => {
          listeners({
            navigation: { isFocused: () => isFocused },
          }).tabPress({ preventDefault });
        });

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenLastCalledWith(href);
      }
    }

    expect(mockNavigate).toHaveBeenCalledTimes(tabRoutes.length * 2);

    act(() => screen!.unmount());
  });

  it('renders tab icons with their colors and the account profile picture', () => {
    mockAuthUser = { claims: {} };
    let screen: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<TabLayout />);
    });

    const renderTabIcon = (name: string, color: string | number | null) => {
      const tab = screen!.root.find(
        (instance) =>
          String(instance.type) === 'TabsScreenHost' &&
          instance.props.name === name,
      );
      const options = tab.props.options as {
        tabBarIcon: (props: {
          color: string | number | null;
        }) => React.ReactElement;
      };
      let icon: renderer.ReactTestRenderer;
      act(() => {
        icon = renderer.create(options.tabBarIcon({ color }));
      });
      return icon!;
    };

    const homeIcon = renderTabIcon('(home)', 'blue');
    expect(
      homeIcon.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props,
    ).toEqual(
      expect.objectContaining({ color: 'blue', name: 'home', size: 28 }),
    );
    act(() => homeIcon.unmount());

    const moneyIcon = renderTabIcon('(requests)', 42);
    expect(
      moneyIcon.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props,
    ).toEqual(expect.objectContaining({ color: undefined, name: 'money' }));
    act(() => moneyIcon.unmount());

    const rulesIcon = renderTabIcon('(rules)', null);
    expect(
      rulesIcon.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props,
    ).toEqual(expect.objectContaining({ color: undefined, name: 'book' }));
    act(() => rulesIcon.unmount());

    const timeIcon = renderTabIcon('(time)', 'green');
    expect(
      timeIcon.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props.name,
    ).toBe('clock-o');
    act(() => timeIcon.unmount());

    const sexIcon = renderTabIcon('(sex)', 'pink');
    expect(
      sexIcon.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props.name,
    ).toBe('heart');
    act(() => sexIcon.unmount());

    const accountFallbackIcon = renderTabIcon('(account)', 'purple');
    expect(
      accountFallbackIcon.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props.name,
    ).toBe('user');
    act(() => accountFallbackIcon.unmount());

    act(() => screen!.unmount());
    mockProfilePicture = 'https://example.test/profile.png';
    act(() => {
      screen = renderer.create(<TabLayout />);
    });
    const accountPicture = renderTabIcon('(account)', 'purple');
    expect(
      accountPicture.root.find(
        (instance) => String(instance.type) === 'ImageHost',
      ).props,
    ).toEqual(
      expect.objectContaining({
        contentFit: 'cover',
        source: mockProfilePicture,
      }),
    );

    act(() => {
      accountPicture.unmount();
      screen!.unmount();
    });
  });
});
