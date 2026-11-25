import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { DateNightScreen } from './DateNightScreen';

import { AppRoutePaths } from '@/constants/navigation';

const mockNavigate = jest.fn();
const mockRelationship = { id: 'relationship-1' };
let mockRelationships: { id: string }[] = [mockRelationship];
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
    ThemeAwareScreen: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareScreenHost',
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

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => ({
    isAuthenticated: true,
    user: { subject: 'user-1' },
  }),
}));

jest.mock('@/features/date-nights/components/DateNightTracker', () => ({
  DateNightTracker: 'DateNightTrackerHost',
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

describe('DateNightScreen', () => {
  afterEach(() => {
    mockRelationships = [mockRelationship];
    mockRelationshipsError = null;
    mockRelationshipsLoading = false;
    jest.clearAllMocks();
  });

  it('renders the date-night tracker for the selected relationship', () => {
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<DateNightScreen />);
    });

    expect(
      screen.root.find(
        (instance) => String(instance.type) === 'DateNightTrackerHost',
      ).props.relationship,
    ).toBe(mockRelationship);
    expect(
      screen.root
        .findAll(
          (instance) => String(instance.type) === 'ThemeAwareHeadingHost',
        )
        .map((heading) => heading.props.children),
    ).toContain('dateNight.title');

    act(() => screen.unmount());
  });

  it('offers a route to Home when no relationship is selected', () => {
    mockRelationships = [];

    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<DateNightScreen />);
    });

    expect(
      screen.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareTextHost')
        .map((text) => text.props.children),
    ).toContain('dateNight.noRelationship');

    const homeButton = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareButtonHost' &&
        instance.props.children === 'rules.openHome',
    );
    act(() => homeButton.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(AppRoutePaths.home);

    act(() => screen.unmount());
  });
});
