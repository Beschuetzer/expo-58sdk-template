import type { RelationshipSummary } from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import NewJointAccountChargeScreen from '../app/(tabs)/(requests)/NewJointAccountChargeScreen';

import { AppRoutePaths } from '@/constants/navigation';

const mockRouterBack = jest.fn();
const mockRouterNavigate = jest.fn();
const mockRouterDismissTo = jest.fn();
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string } | null;
} = {
  isAuthenticated: false,
  user: null,
};
const mockRelationship: RelationshipSummary = {
  id: 'relationship-1',
  name: 'Shared space',
  shareCode: 'share-code',
  approvalPolicy: 'all_members',
  members: [],
  pendingJoinRequestCount: 0,
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
};
const mockRelationshipsQuery = {
  data: [] as RelationshipSummary[],
  error: undefined as Error | undefined,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};
let mockSelectedRelationshipId: string | undefined;
const mockCreateMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutate: jest.fn(),
};
const mockUseCreateMutation = jest.fn((_relationshipId: string) => {
  return mockCreateMutation;
});

jest.mock('@react-navigation/elements', () => ({
  HeaderBackButton: 'HeaderBackButtonHost',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const Stack = {
    Screen: (props: Record<string, unknown>) =>
      React.createElement('StackScreenHost', props),
  };

  return {
    Stack,
    useRouter: () => ({
      back: mockRouterBack,
      dismissTo: mockRouterDismissTo,
      navigate: mockRouterNavigate,
    }),
  };
});

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'InputHost',
}));

jest.mock('@/components/ui/ThemeAwareScreen', () => ({
  ThemeAwareScreen: 'ScreenHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareText: 'TextHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock(
  '@/features/joint-account-charges/hooks/useJointAccountCharges',
  () => ({
    useCreateJointAccountChargeMutation: (...args: [string]) =>
      mockUseCreateMutation(...args),
  }),
);

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipsQuery: jest.fn(() => mockRelationshipsQuery),
}));

jest.mock(
  '@/features/relationships/components/SelectedRelationshipNotice',
  () => ({
    SelectedRelationshipNotice: 'SelectedRelationshipNoticeHost',
  }),
);

jest.mock('@/state/slices/generalSlice', () => ({
  selectedRelationshipIdSelector: jest.fn(),
}));

jest.mock('@/state/store', () => ({
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

function renderScreen() {
  let screen: ReactTestRenderer;
  act(() => {
    screen = renderer.create(<NewJointAccountChargeScreen />);
  });
  return screen!;
}

describe('NewJointAccountChargeScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    mockRelationshipsQuery.data = [];
    mockRelationshipsQuery.error = undefined;
    mockRelationshipsQuery.isFetching = false;
    mockRelationshipsQuery.isLoading = false;
    mockSelectedRelationshipId = undefined;
    mockCreateMutation.error = undefined;
    mockCreateMutation.isPending = false;
  });

  it('keeps a back button available when there is no stack history', () => {
    const screen = renderScreen();
    const stackScreen = screen.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const headerLeft = stackScreen.props.options.headerLeft as (props: {
      canGoBack: boolean;
    }) => React.ReactElement;
    const backButton = headerLeft({ canGoBack: false });

    expect(backButton).not.toBeNull();

    act(() => screen.unmount());
  });

  it('keeps a back button available when stack history exists', () => {
    const screen = renderScreen();
    const stackScreen = screen.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const headerLeft = stackScreen.props.options.headerLeft as (props: {
      canGoBack: boolean;
    }) => React.ReactElement;
    const backButton = headerLeft({ canGoBack: true });

    expect(backButton).not.toBeNull();

    act(() => screen.unmount());
  });

  it('navigates to sign-in from the unauthenticated state', () => {
    const screen = renderScreen();
    const signInButton = screen.root.find(
      (instance) => instance.props.children === 'paymentRequests.signIn',
    );

    act(() => signInButton.props.onPress());

    expect(mockRouterNavigate).toHaveBeenCalledWith(AppRoutePaths.account);
    act(() => screen.unmount());
  });

  it('shows the signed-in profile fallback when the subject is missing', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = null;

    const screen = renderScreen();

    expect(
      screen.root.findAll(
        (instance) => instance.props.children === 'auth.profileUnavailable',
      ),
    ).toHaveLength(1);
    act(() => screen.unmount());
  });

  it('shows relationship loading and error states with a retry action', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockRelationshipsQuery.isLoading = true;

    const loadingScreen = renderScreen();
    expect(
      loadingScreen.root.findAll(
        (instance) => instance.props.children === 'common.loading',
      ),
    ).toHaveLength(1);
    act(() => loadingScreen.unmount());

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.error = new Error('relationship load failed');
    const errorScreen = renderScreen();
    const retryButton = errorScreen.root.find(
      (instance) => instance.props.children === 'paymentRequests.retry',
    );

    act(() => retryButton.props.onPress());

    expect(mockRelationshipsQuery.refetch).toHaveBeenCalledTimes(1);
    act(() => errorScreen.unmount());
  });

  it('offers relationship setup when no relationship is selected', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockRelationshipsQuery.data = [mockRelationship];

    const screen = renderScreen();
    const setupButton = screen.root.find(
      (instance) =>
        instance.props.children === 'paymentRequests.createRelationship',
    );

    act(() => setupButton.props.onPress());

    expect(mockRouterNavigate).toHaveBeenCalledWith(
      AppRoutePaths.viewAllRequests,
    );
    act(() => screen.unmount());
  });

  it('validates charge fields and navigates to the created charge on success', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1' };
    mockRelationshipsQuery.data = [mockRelationship];
    mockSelectedRelationshipId = mockRelationship.id;
    mockCreateMutation.error = new Error('previous submission failed');

    const screen = renderScreen();
    const inputs = screen.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    const nameInput = inputs.find(
      (input) =>
        input.props.inputFieldProps.placeholder ===
        'jointAccountCharges.namePlaceholder',
    );
    const amountInput = inputs.find(
      (input) =>
        input.props.inputFieldProps.placeholder ===
        'jointAccountCharges.amountPlaceholder',
    );

    expect(nameInput).toBeDefined();
    expect(amountInput).toBeDefined();
    expect(
      screen.root.findAll(
        (instance) => instance.props.children === 'previous submission failed',
      ),
    ).toHaveLength(1);

    act(() => {
      nameInput!.props.onChangeText('  Shared dinner  ');
      amountInput!.props.onChangeText('invalid');
    });
    expect(
      screen.root.findAll(
        (instance) =>
          instance.props.children === 'jointAccountCharges.amountInvalid',
      ),
    ).toHaveLength(1);

    const screenHost = screen.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    const bottomSubmit = screenHost.props.bottomContent as React.ReactElement<{
      isDisabled: boolean;
      onPress: () => void;
    }>;
    expect(bottomSubmit.props.isDisabled).toBe(true);

    act(() => amountInput!.props.onChangeText('12.34'));

    const validScreenHost = screen.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    const validSubmit = validScreenHost.props
      .bottomContent as React.ReactElement<{
      isDisabled: boolean;
      onPress: () => void;
    }>;
    expect(validSubmit.props.isDisabled).toBe(false);
    expect(mockUseCreateMutation).toHaveBeenCalledWith(mockRelationship.id);

    act(() => validSubmit.props.onPress());

    expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
      { name: 'Shared dinner', amountMinorUnits: 1234 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const options = mockCreateMutation.mutate.mock.calls[0]?.[1] as {
      onSuccess: (charge: { id: string }) => void;
    };
    act(() => options.onSuccess({ id: 'charge-1' }));

    expect(mockRouterDismissTo).toHaveBeenCalledWith(
      AppRoutePaths.viewJointAccountCharges,
    );
    expect(mockRouterNavigate).toHaveBeenCalledWith({
      pathname: AppRoutePaths.jointAccountChargeDetails,
      params: {
        id: 'charge-1',
        detailNavigationSource: 'jointAccountCharges',
      },
    });
    act(() => screen.unmount());
  });
});
