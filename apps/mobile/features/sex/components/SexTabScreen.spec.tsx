import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { SexTabScreen } from './SexTabScreen';

import { AppRoutePaths } from '@/constants/navigation';

const mockNavigate = jest.fn();
let mockRelationships: { id: string }[] = [{ id: 'relationship-1' }];
let mockRelationshipsError: Error | null = null;
let mockRelationshipsLoading = false;

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useRouter: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('@/components/ui/MainTabNavigationMenu', () => ({
  MainTabNavigationMenu: 'MainTabNavigationMenuHost',
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

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({
      bottomContent,
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        'ThemeAwareScreenHost',
        { ...props, bottomContent },
        children,
        bottomContent as React.ReactNode,
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

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => ({
    isAuthenticated: true,
    user: { subject: 'user-1' },
  }),
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipsQuery: () => ({
    data: mockRelationships,
    error: mockRelationshipsError,
    isLoading: mockRelationshipsLoading,
  }),
}));

jest.mock('@/state/slices/generalSlice', () => ({
  selectedRelationshipIdSelector: 'selectedRelationshipIdSelector',
}));

jest.mock('@/state/store', () => ({
  useAppSelector: () => 'relationship-1',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('SexTabScreen', () => {
  afterEach(() => {
    mockRelationships = [{ id: 'relationship-1' }];
    mockRelationshipsError = null;
    mockRelationshipsLoading = false;
    jest.clearAllMocks();
  });

  it('pins navigation buttons for love-making sessions and date nights', () => {
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<SexTabScreen />);
    });

    const themeAwareScreen = screen.root.find(
      (instance) => String(instance.type) === 'ThemeAwareScreenHost',
    );
    expect(themeAwareScreen.props.bottomContent).toBeDefined();

    const buttons = screen.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareButtonHost',
    );
    expect(buttons.map((button) => button.props.children)).toEqual([
      'sex.sessionsTitle',
      'dateNight.title',
    ]);

    act(() => buttons[0].props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.loveMakingSessions);

    act(() => buttons[1].props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.dateNights);

    act(() => screen.unmount());
  });
});
