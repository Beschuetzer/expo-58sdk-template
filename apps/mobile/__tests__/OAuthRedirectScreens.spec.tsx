import React from 'react';
import renderer, { act } from 'react-test-renderer';

import OAuthCallbackScreen from '../app/oauth/callback';
import OAuthLogoutScreen from '../app/oauth/logout';

import { AppRoutePaths } from '@/constants/navigation';

const mockReplace = jest.fn();
const mockUseOAuth2Auth = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: 'StackScreenHost' },
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockUseOAuth2Auth(),
}));

jest.mock('@/components/ui/ThemeAwareHeading', () => ({
  ThemeAwareHeading: 'HeadingHost',
}));
jest.mock('@/components/ui/ThemeAwareScreen', () => ({
  ThemeAwareScreen: 'ScreenHost',
}));
jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));
jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareText: 'TextHost',
}));
jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({ colorScheme: 'light' }),
}));
jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));
jest.mock('@expo/vector-icons/FontAwesome', () => 'FontAwesomeHost');
jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('OAuth redirect screens', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseOAuth2Auth.mockReset();
  });

  it('uses the shared centered layout and theme-aware callback content', () => {
    mockUseOAuth2Auth.mockReturnValue({
      isAuthenticated: false,
      state: 'loading',
    });

    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<OAuthCallbackScreen />);
    });

    const screenHost = screen.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    expect(screenHost.props.contentContainerStyle).toEqual({ flexGrow: 1 });
    expect(screenHost.props.style).toEqual(
      expect.objectContaining({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }),
    );
    expect(
      screen.root
        .findAll((instance) => String(instance.type) === 'HeadingHost')
        .map((instance) => instance.props.children),
    ).toEqual(['auth.redirectingHome']);
    expect(
      screen.root.find(
        (instance) => String(instance.type) === 'StackScreenHost',
      ).props.options.headerShown,
    ).toBe(false);

    act(() => screen.unmount());
  });

  it('keeps the logout redirect styled and returns to the account screen', () => {
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<OAuthLogoutScreen />);
    });

    expect(mockReplace).toHaveBeenCalledWith(AppRoutePaths.account);
    expect(
      screen.root
        .findAll((instance) => String(instance.type) === 'HeadingHost')
        .map((instance) => instance.props.children),
    ).toEqual(['auth.redirectingAccount']);
    expect(
      screen.root.find(
        (instance) => String(instance.type) === 'StackScreenHost',
      ).props.options.headerShown,
    ).toBe(false);

    act(() => screen.unmount());
  });

  it('routes successful and failed callback states to their existing destinations', () => {
    let screen!: renderer.ReactTestRenderer;
    mockUseOAuth2Auth.mockReturnValue({
      isAuthenticated: true,
      state: 'success',
    });
    act(() => {
      screen = renderer.create(<OAuthCallbackScreen />);
    });
    expect(mockReplace).toHaveBeenCalledWith(AppRoutePaths.home);
    act(() => screen.unmount());

    mockReplace.mockClear();
    mockUseOAuth2Auth.mockReturnValue({
      isAuthenticated: false,
      state: 'error',
    });
    act(() => {
      screen = renderer.create(<OAuthCallbackScreen />);
    });
    expect(mockReplace).toHaveBeenCalledWith(AppRoutePaths.account);
    act(() => screen.unmount());
  });
});
