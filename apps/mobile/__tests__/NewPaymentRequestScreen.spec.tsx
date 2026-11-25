import type {
  RelationshipSummary,
  RubricVersion,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import NewPaymentRequestScreen from '../app/(tabs)/(requests)/NewPaymentRequestScreen';

const mockRelationship: RelationshipSummary = {
  id: 'relationship-1',
  name: 'Shared space',
  shareCode: 'share-code',
  approvalPolicy: 'all_members',
  members: [
    {
      id: 'member-1',
      relationshipId: 'relationship-1',
      userId: 'user-1',
      displayName: 'Alex',
      role: 'owner',
      active: true,
    },
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockRelationshipsQuery = {
  data: [mockRelationship] as RelationshipSummary[],
  error: undefined as Error | undefined,
  isLoading: false,
};
const mockRelationshipMembersQuery = {
  data: mockRelationship.members,
  error: undefined as Error | undefined,
  isLoading: false,
};
const mockRubricQuery = {
  data: {
    id: 'rubric-1',
    version: 1,
    questions: [],
  } as RubricVersion | undefined,
  error: undefined as Error | undefined,
  isFetching: false,
  isLoading: false,
  refetch: jest.fn(),
};
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string; claims?: Record<string, unknown> } | null;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1', claims: {} },
};
let mockSelectedRelationshipId: string | undefined = 'relationship-1';
const mockCreateRelationshipMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutate: jest.fn(),
};
const mockCreateMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutateAsync: jest.fn().mockResolvedValue({ id: 'draft-request-1' }),
};
const mockSubmitMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutateAsync: jest.fn().mockResolvedValue({ id: 'submitted-request-1' }),
};
const mockRouterDismissTo = jest.fn();
const mockRouterNavigate = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({
    dismissTo: mockRouterDismissTo,
    navigate: mockRouterNavigate,
  }),
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ButtonHost',
}));

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'InputHost',
}));

jest.mock('@/components/ui/ThemeAwareScreen', () => ({
  ThemeAwareScreen: 'ScreenHost',
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareHeading: 'HeadingHost',
  ThemeAwareText: 'TextHost',
}));

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/auth/client', () => ({
  getDisplayNameFromClaims: () => 'Alex',
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useCreatePaymentRequestMutation: () => mockCreateMutation,
  useCreateRelationshipMutation: () => mockCreateRelationshipMutation,
  useRelationshipMembersQuery: () => mockRelationshipMembersQuery,
  useRelationshipRubricQuery: () => mockRubricQuery,
  useRelationshipsQuery: () => mockRelationshipsQuery,
  useSubmitPaymentRequestMutation: () => mockSubmitMutation,
}));

jest.mock(
  '@/features/relationships/components/RelationshipMemberSelector',
  () => ({
    RelationshipMemberSelector: 'MemberSelectorHost',
  }),
);

jest.mock(
  '@/features/relationships/components/SelectedRelationshipNotice',
  () => ({
    SelectedRelationshipNotice: 'SelectedRelationshipNoticeHost',
  }),
);

jest.mock('@/state/store', () => ({
  useAppSelector: () => mockSelectedRelationshipId,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('NewPaymentRequestScreen', () => {
  let screen: ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    screen = undefined;
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1', claims: {} };
    mockSelectedRelationshipId = 'relationship-1';
    mockRelationshipsQuery.data = [mockRelationship];
    mockRelationshipsQuery.error = undefined;
    mockRelationshipsQuery.isLoading = false;
    mockRelationshipMembersQuery.data = mockRelationship.members;
    mockRelationshipMembersQuery.error = undefined;
    mockRelationshipMembersQuery.isLoading = false;
    mockRubricQuery.data = {
      id: 'rubric-1',
      version: 1,
      questions: [],
    };
    mockRubricQuery.error = undefined;
    mockRubricQuery.isFetching = false;
    mockRubricQuery.isLoading = false;
    mockCreateRelationshipMutation.error = undefined;
    mockCreateRelationshipMutation.isPending = false;
    mockCreateMutation.error = undefined;
    mockCreateMutation.isPending = false;
    mockCreateMutation.mutateAsync.mockResolvedValue({
      id: 'draft-request-1',
    });
    mockSubmitMutation.error = undefined;
    mockSubmitMutation.isPending = false;
    mockSubmitMutation.mutateAsync.mockResolvedValue({
      id: 'submitted-request-1',
    });
  });

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  });

  function renderScreen() {
    act(() => {
      screen = renderer.create(<NewPaymentRequestScreen />);
    });

    return screen!;
  }

  function getTextValues(testScreen: ReactTestRenderer) {
    return testScreen.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
  }

  function getButton(
    testScreen: ReactTestRenderer,
    label: string,
  ): {
    props: {
      children: React.ReactNode;
      isDisabled?: boolean;
      onPress: () => void;
      variant?: string;
    };
  } {
    const button = testScreen.root
      .findAll((instance) => String(instance.type) === 'ButtonHost')
      .find((instance) => instance.props.children === label);

    if (button) {
      return button as unknown as {
        props: {
          children: React.ReactNode;
          isDisabled?: boolean;
          onPress: () => void;
        };
      };
    }

    const bottomContent = testScreen.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    ).props.bottomContent as
      | React.ReactElement<{
          children: React.ReactNode;
          isDisabled?: boolean;
          onPress: () => void;
          variant?: string;
        }>
      | undefined;

    if (
      bottomContent &&
      String(bottomContent.type) === 'ButtonHost' &&
      bottomContent.props.children === label
    ) {
      return bottomContent;
    }

    throw new Error(`Could not find button "${label}".`);
  }

  function getInput(
    testScreen: ReactTestRenderer,
    matches: (props: Record<string, unknown>) => boolean,
  ): ReactTestInstance {
    const input = testScreen.root
      .findAll((instance) => String(instance.type) === 'InputHost')
      .find((instance) => matches(instance.props));

    if (!input) {
      throw new Error('Could not find the requested input.');
    }

    return input;
  }

  it('pins the submit action outside the scrollable request form', () => {
    const testScreen = renderScreen();
    const screenHost = testScreen.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    const submitButton = screenHost.props.bottomContent as React.ReactElement<{
      children: string;
    }>;

    expect(submitButton.props.children).toBe('paymentRequests.submit');
  });

  it('uses the joint-account label with a standard decimal input', () => {
    const testScreen = renderScreen();
    expect(getTextValues(testScreen)).toContain(
      'paymentRequests.jointAccountPercentage',
    );
    const percentageInput = getInput(
      testScreen,
      (props) => props.value === '50',
    );

    expect(percentageInput.props.inputType).toBeUndefined();
    expect(percentageInput.props.inputFieldProps).toEqual({
      keyboardType: 'decimal-pad',
    });
    const flexClasses = testScreen.root
      .findAll(
        (instance) =>
          typeof instance.props.className === 'string' &&
          instance.props.className === 'flex-1',
      )
      .map((instance) => instance.props.className);
    expect(flexClasses).toEqual(['flex-1', 'flex-1']);

    act(() => testScreen.unmount());
  });

  it('does not show the invite-someone box when the relationship has one member', () => {
    const testScreen = renderScreen();

    expect(
      testScreen.root.findAll(
        (instance) =>
          String(instance.type) === 'HeadingHost' &&
          instance.props.children === 'paymentRequests.inviteMember',
      ),
    ).toHaveLength(0);
    expect(
      testScreen.root.findAll(
        (instance) =>
          String(instance.type) === 'InputHost' &&
          (
            instance.props.inputFieldProps as
              | { placeholder?: string }
              | undefined
          )?.placeholder === 'paymentRequests.inviteeEmail',
      ),
    ).toHaveLength(0);
    expect(
      testScreen.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'paymentRequests.createInvitation',
      ),
    ).toHaveLength(0);
  });

  it('shows loading and error states while relationships are being loaded', () => {
    mockRelationshipsQuery.isLoading = true;
    const testScreen = renderScreen();

    expect(getTextValues(testScreen)).toContain('common.loading');

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.error = new Error('Request failed');
    act(() => testScreen.update(<NewPaymentRequestScreen />));

    expect(getTextValues(testScreen)).toContain('paymentRequests.error');
  });

  it('renders authentication and profile fallback states', () => {
    mockAuth.isAuthenticated = false;
    const signedOutScreen = renderScreen();
    expect(getTextValues(signedOutScreen)).toContain('paymentRequests.signIn');
    act(() => signedOutScreen.unmount());
    screen = undefined;

    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    const profileScreen = renderScreen();
    expect(getTextValues(profileScreen)).toEqual([
      'auth.signedIn',
      'auth.profileUnavailable',
    ]);
  });

  it('creates a relationship from the empty state after the name is entered', () => {
    mockRelationshipsQuery.data = [];
    const testScreen = renderScreen();
    const saveButton = getButton(testScreen, 'paymentRequests.save');

    expect(getTextValues(testScreen)).toContain(
      'paymentRequests.noRelationship',
    );
    expect(saveButton.props.isDisabled).toBe(true);

    act(() => {
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { placeholder?: string } | undefined)
            ?.placeholder === 'paymentRequests.relationshipName',
      ).props.onChangeText('Shared home');
    });

    expect(getButton(testScreen, 'paymentRequests.save').props.isDisabled).toBe(
      false,
    );
    act(() => getButton(testScreen, 'paymentRequests.save').props.onPress());

    expect(mockCreateRelationshipMutation.mutate).toHaveBeenCalledWith({
      name: 'Shared home',
      displayName: 'Alex',
    });
  });

  it('offers to retry when the relationship rubric fails to load', () => {
    mockRubricQuery.error = new Error('Rubric unavailable');
    const testScreen = renderScreen();

    expect(getTextValues(testScreen)).toContain('paymentRequests.rubricError');
    expect(
      getButton(testScreen, 'paymentRequests.submit').props.isDisabled,
    ).toBe(true);

    act(() => getButton(testScreen, 'paymentRequests.retry').props.onPress());

    expect(mockRubricQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it('validates amount, currency, split, and category input before submission', () => {
    mockRelationshipMembersQuery.data = [
      ...mockRelationship.members,
      {
        id: 'member-2',
        relationshipId: mockRelationship.id,
        userId: 'user-2',
        displayName: 'Amy',
        role: 'member',
        active: true,
      },
    ];
    const testScreen = renderScreen();

    act(() => {
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { maxLength?: number } | undefined)
            ?.maxLength === 160,
      ).props.onChangeText('Dinner');
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { maxLength?: number } | undefined)
            ?.maxLength === 4000,
      ).props.onChangeText('A shared meal');
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { placeholder?: string } | undefined)
            ?.placeholder === 'paymentRequests.amountPlaceholder',
      ).props.onChangeText('12.345');
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { maxLength?: number } | undefined)
            ?.maxLength === 3,
      ).props.onChangeText('US');
      getInput(testScreen, (props) => props.value === '50').props.onChangeText(
        '101',
      );
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { placeholder?: string } | undefined)
            ?.placeholder === 'paymentRequests.categoriesPlaceholder',
      ).props.onChangeText('x'.repeat(81));
    });

    const textValues = getTextValues(testScreen);
    expect(textValues).toContain('paymentRequests.amountInvalid');
    expect(textValues).toContain('paymentRequests.currencyInvalid');
    expect(textValues).toContain('paymentRequests.splitInvalid');
    expect(textValues).toContain('paymentRequests.categoriesTooLong');
    expect(
      getButton(testScreen, 'paymentRequests.submit').props.isDisabled,
    ).toBe(true);
    expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('creates and submits a request after required rubric answers are provided', async () => {
    mockRelationshipMembersQuery.data = [
      ...mockRelationship.members,
      {
        id: 'member-2',
        relationshipId: mockRelationship.id,
        userId: 'user-2',
        displayName: 'Amy',
        role: 'member',
        active: true,
      },
    ];
    mockRubricQuery.data = {
      id: 'rubric-1',
      version: 1,
      questions: [
        {
          id: 'necessary',
          label: 'Is it necessary?',
          answerType: 'boolean',
          weight: 1,
          required: true,
        },
        {
          id: 'beneficiary',
          label: 'Who benefits?',
          answerType: 'text',
          weight: 1,
          required: false,
        },
      ],
    };
    const testScreen = renderScreen();

    expect(
      getButton(testScreen, 'paymentRequests.submit').props.isDisabled,
    ).toBe(true);
    expect(getTextValues(testScreen)).toContain(
      'paymentRequests.requiredAnswers',
    );

    act(() => {
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { maxLength?: number } | undefined)
            ?.maxLength === 160,
      ).props.onChangeText('  Dinner  ');
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { maxLength?: number } | undefined)
            ?.maxLength === 4000,
      ).props.onChangeText('  Celebrate together  ');
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { placeholder?: string } | undefined)
            ?.placeholder === 'paymentRequests.amountPlaceholder',
      ).props.onChangeText('12.50');
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { maxLength?: number } | undefined)
            ?.maxLength === 3,
      ).props.onChangeText('usd');
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { placeholder?: string } | undefined)
            ?.placeholder === 'paymentRequests.categoriesPlaceholder',
      ).props.onChangeText(' groceries, dining, groceries ');
      getInput(testScreen, (props) => props.value === '50').props.onChangeText(
        '60',
      );
      testScreen.root
        .find((instance) => String(instance.type) === 'MemberSelectorHost')
        .props.onChange(['user-2']);
    });

    expect(
      getButton(testScreen, 'paymentRequests.submit').props.isDisabled,
    ).toBe(true);
    act(() => getButton(testScreen, 'paymentRequests.no').props.onPress());
    expect(
      getButton(testScreen, 'paymentRequests.submit').props.isDisabled,
    ).toBe(false);

    await act(async () => {
      await getButton(testScreen, 'paymentRequests.submit').props.onPress();
    });

    expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Dinner',
        rationale: 'Celebrate together',
        amountMinorUnits: 1250,
        currency: 'USD',
        categories: ['groceries', 'dining'],
        requestedSplit: [
          { memberUserId: 'user-1', percentage: 40 },
          { memberUserId: 'user-2', percentage: 60 },
        ],
        purchaseDate: expect.any(String),
      }),
    );
    expect(mockSubmitMutation.mutateAsync).toHaveBeenCalledWith({
      paymentRequestId: 'draft-request-1',
      input: {
        evaluation: {
          rubricVersionId: 'rubric-1',
          answers: { necessary: false, beneficiary: ['Amy'] },
        },
      },
    });
    expect(mockRouterDismissTo).toHaveBeenCalledTimes(1);
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          id: 'submitted-request-1',
          detailNavigationSource: 'paymentRequests',
        },
      }),
    );
  });

  it('renders rubric choice and text inputs and converts numeric answers', () => {
    mockRelationshipMembersQuery.data = [
      ...mockRelationship.members,
      {
        id: 'member-2',
        relationshipId: mockRelationship.id,
        userId: 'user-2',
        displayName: 'Amy',
        role: 'member',
        active: true,
      },
    ];
    mockRubricQuery.data = {
      id: 'rubric-1',
      version: 1,
      questions: [
        {
          id: 'benefit_level',
          label: 'Hidden benefit question',
          answerType: 'single_choice',
          options: ['both'],
          weight: 1,
          required: true,
        },
        {
          id: 'frequency',
          label: 'How often?',
          answerType: 'single_choice',
          options: ['both', 'creator', 'other_members', 'custom'],
          weight: 1,
          required: true,
        },
        {
          id: 'optional-choice',
          label: 'Optional choice',
          answerType: 'single_choice',
          weight: 1,
          required: false,
        },
        {
          id: 'quantity',
          label: 'Quantity',
          answerType: 'number',
          weight: 1,
          required: false,
        },
        {
          id: 'notes',
          label: 'Notes',
          answerType: 'text',
          weight: 1,
          required: false,
        },
      ],
    };
    const testScreen = renderScreen();

    expect(getTextValues(testScreen)).not.toContain('Hidden benefit question');
    expect(getTextValues(testScreen)).toContain('How often?');
    expect(getTextValues(testScreen)).toContain('Optional choice');

    for (const label of [
      'paymentRequests.benefitsBoth',
      'paymentRequests.benefitsCreator',
      'paymentRequests.benefitsOther',
      'custom',
    ]) {
      expect(getButton(testScreen, label)).toBeDefined();
    }

    act(() =>
      getButton(testScreen, 'paymentRequests.benefitsBoth').props.onPress(),
    );
    expect(
      getButton(testScreen, 'paymentRequests.benefitsBoth').props.variant,
    ).toBe('solid');

    const quantityInput = getInput(
      testScreen,
      (props) =>
        (props.inputFieldProps as { placeholder?: string } | undefined)
          ?.placeholder === 'Quantity',
    );
    expect(quantityInput.props.inputType).toBe('number');
    act(() => quantityInput.props.onChangeText('3'));
    expect(
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { placeholder?: string } | undefined)
            ?.placeholder === 'Quantity',
      ).props.value,
    ).toBe('3');

    const notesInput = getInput(
      testScreen,
      (props) =>
        (props.inputFieldProps as { placeholder?: string } | undefined)
          ?.placeholder === 'Notes',
    );
    expect(notesInput.props.inputType).toBe('text');
    act(() => notesInput.props.onChangeText('A short note'));
    expect(
      getInput(
        testScreen,
        (props) =>
          (props.inputFieldProps as { placeholder?: string } | undefined)
            ?.placeholder === 'Notes',
      ).props.value,
    ).toBe('A short note');
  });
});
