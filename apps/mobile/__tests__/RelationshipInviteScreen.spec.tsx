import React from 'react';
import renderer, { act } from 'react-test-renderer';

import RelationshipDetailsScreen from '../app/(tabs)/(home)/relationship/[id]';
import RelationshipJoinRequestDetailsScreen from '../app/relationship-join-request/[id]';

const mockCreateInvitation = jest.fn();
const mockDispatch = jest.fn();
const mockRouterDismissTo = jest.fn();
let mockRouteParams: Record<string, string> = { id: 'relationship-1' };
const mockRelationship = {
  id: 'relationship-1',
  name: 'Shared space',
  shareCode: 'share-code',
  approvalPolicy: 'all_members' as const,
  members: [
    {
      id: 'member-1',
      relationshipId: 'relationship-1',
      userId: 'user-1',
      displayName: 'Alex',
      role: 'owner' as const,
      active: true,
    },
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

jest.mock('expo-router', () => {
  return {
    Stack: { Screen: () => null },
    useLocalSearchParams: () => mockRouteParams,
    useRouter: () => ({
      dismissTo: mockRouterDismissTo,
      navigate: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

jest.mock('react-native', () => ({
  Share: { share: jest.fn() },
  useColorScheme: () => 'light',
  View: 'ViewHost',
  Text: 'TextHost',
}));
const mockShare = jest.requireMock('react-native').Share.share as jest.Mock;

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareButton: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('ButtonHost', props, children as React.ReactNode),
  };
});

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareScreen: ({
      bottomContent,
      children,
    }: {
      bottomContent?: React.ReactNode;
      children: React.ReactNode;
    }) => React.createElement('ScreenHost', null, children, bottomContent),
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createText =
    (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children as React.ReactNode);

  return {
    ThemeAwareHeading: createText('HeadingHost'),
    ThemeAwareText: createText('TextHost'),
  };
});

jest.mock('@/features/auth/client', () => ({
  createInvitationUrl: (token: string) =>
    `relationshipapp://invitation/${token}`,
  getDisplayNameFromClaims: () => 'Alex',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => ({
    isAuthenticated: true,
    user: { subject: 'user-1', claims: {} },
  }),
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useCreateRelationshipInvitationMutation: () => ({
    isPending: false,
    mutateAsync: mockCreateInvitation,
  }),
  useDeleteRelationshipJoinRequestMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useDecideRelationshipJoinRequestMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useDeleteRelationshipMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useRelationshipJoinRequestsQuery: () => ({
    data: [],
    error: null,
    isLoading: false,
  }),
  useRelationshipJoinRequestQuery: () => ({
    data: {
      id: 'join-request-1',
      relationshipId: 'relationship-1',
      requesterUserId: 'user-2',
      requesterDisplayName: 'Sam',
      status: 'pending',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    error: null,
    isLoading: false,
  }),
  useRelationshipMembersQuery: () => ({
    data: mockRelationship.members,
    error: null,
    isLoading: false,
  }),
  useRelationshipsQuery: () => ({
    data: [mockRelationship],
    error: null,
    isLoading: false,
  }),
}));

jest.mock(
  '@/features/relationships/components/RelationshipActivationButton',
  () => ({
    RelationshipActivationButton: 'RelationshipActivationButtonHost',
  }),
);

jest.mock('@/state/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => 'relationship-1',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('@/utils/logging', () => ({
  logError: jest.fn(),
}));

describe('RelationshipDetailsScreen invitations', () => {
  let screen: renderer.ReactTestRenderer | undefined;

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
    mockRouteParams = { id: 'relationship-1' };
    jest.clearAllMocks();
  });

  it('returns relationship details to the relationships list from the pinned footer', () => {
    act(() => {
      screen = renderer.create(<RelationshipDetailsScreen />);
    });

    const backButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'home.relationshipsTitle',
    );
    act(() => backButton.props.onPress());

    expect(mockRouterDismissTo).toHaveBeenCalledWith('/(tabs)/(home)');
  });

  it('creates an invitation and shares a deep link for the relationship', async () => {
    mockCreateInvitation.mockResolvedValue({ token: 'invite-token' });
    mockShare.mockResolvedValue({ action: 'sharedAction' });
    expect(jest.requireMock('react-native').Share.share).toBe(mockShare);

    act(() => {
      screen = renderer.create(<RelationshipDetailsScreen />);
    });

    const inviteButton = screen!.root
      .findAll((instance) => String(instance.type) === 'ButtonHost')
      .find((button) => button.props.children === 'home.inviteMember');

    await act(async () => {
      await inviteButton!.props.onPress();
    });

    expect(jest.requireMock('@/utils/logging').logError.mock.calls).toEqual([]);
    expect(mockCreateInvitation).toHaveBeenCalledWith({});
    expect(mockShare).toHaveBeenCalledWith({
      message: expect.stringContaining(
        'relationshipapp://invitation/invite-token',
      ),
      title: 'home.invitationShareTitle',
    });
    expect(mockShare.mock.calls[0][0].message).toContain('Shared space');
  });

  it('shows a translated error when invitation creation fails', async () => {
    mockCreateInvitation.mockRejectedValue(new Error('creation failed'));

    act(() => {
      screen = renderer.create(<RelationshipDetailsScreen />);
    });

    const inviteButton = screen!.root
      .findAll((instance) => String(instance.type) === 'ButtonHost')
      .find((button) => button.props.children === 'home.inviteMember');

    await act(async () => {
      await inviteButton!.props.onPress();
    });

    expect(mockShare).not.toHaveBeenCalled();
    const errorMessage = screen!.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .find((text) => text.props.children === 'home.invitationFailed');
    expect(errorMessage?.props.color).toBe('$error600');
  });

  it('returns join request details to the relationship request list', () => {
    mockRouteParams = {
      id: 'join-request-1',
      relationshipId: 'relationship-1',
    };

    act(() => {
      screen = renderer.create(<RelationshipJoinRequestDetailsScreen />);
    });

    const backButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'home.pendingJoinRequestsTitle',
    );
    act(() => backButton.props.onPress());

    expect(mockRouterDismissTo).toHaveBeenCalledWith({
      pathname: '/(tabs)/(home)/relationship/[id]',
      params: {
        id: 'relationship-1',
        detailNavigationSource: 'homeRelationships',
      },
    });
  });
});
