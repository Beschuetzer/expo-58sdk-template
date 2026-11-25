import type {
  RelationshipSummary,
  RelationshipTask,
  RelationshipTaskStatus,
  UpdateRelationshipTaskInput,
} from '@expo-50sdk-template/shared-types';
import React, { type ReactNode } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import EditTaskScreen from '../app/(tabs)/(time)/EditTaskScreen';
import NewTaskScreen from '../app/(tabs)/(time)/NewTaskScreen';
import RelationshipTaskDetailsScreen from '../app/(tabs)/(time)/RelationshipTaskDetailsScreen';
import type { ThemeAwareSearchSortConfig } from '../components/ui/ThemeAwareSearch';
import { RelationshipTasksListScreen } from '../features/time/components/RelationshipTasksListScreen';

import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';

const mockRouterNavigate = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterDismissTo = jest.fn();
const mockDispatch = jest.fn();
const mockCreateTaskMutation = {
  error: undefined as Error | undefined,
  isPending: false,
  mutateAsync: jest.fn(async () => ({ id: 'task-1' })),
};
const mockCompleteTaskMutation = {
  error: null as Error | null,
  isPending: false,
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
};
const mockUpdateTaskMutation = {
  error: null as Error | null,
  isPending: false,
  mutateAsync: jest.fn(
    async ({
      taskId,
      input,
    }: {
      taskId: string;
      input: UpdateRelationshipTaskInput;
    }) => ({
      ...mockIncompleteTask,
      ...input,
      id: taskId,
      updatedByUserId: 'user-2',
      lastEditedAt: '2026-10-30T12:00:00.000Z',
      lastEditedFields: ['name'],
    }),
  ),
};
const mockSortConfigReceived = jest.fn(
  (_sort?: ThemeAwareSearchSortConfig<RelationshipTask>) => undefined,
);
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
    {
      id: 'member-2',
      relationshipId: 'relationship-1',
      userId: 'user-2',
      displayName: 'Sam',
      role: 'member',
      active: true,
    },
    {
      id: 'member-3',
      relationshipId: 'relationship-1',
      userId: 'user-3',
      displayName: 'Inactive member',
      role: 'member',
      active: false,
    },
  ],
  pendingJoinRequestCount: 0,
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
};
const mockIncompleteTask: RelationshipTask = {
  id: 'task-1',
  relationshipId: 'relationship-1',
  createdByUserId: 'user-1',
  name: 'Wash dishes',
  visibleToUserIds: ['user-1', 'user-2'],
  completableByUserIds: ['user-2'],
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
};
const mockTaskRouteParams: {
  id?: string | string[];
  relationshipId?: string | string[];
} = {
  id: 'task-1',
  relationshipId: 'relationship-1',
};
const mockCompletedTask: RelationshipTask = {
  ...mockIncompleteTask,
  completedAt: '2026-10-30T12:00:00.000Z',
  completedByUserId: 'user-2',
};
const mockAuth: {
  isAuthenticated: boolean;
  user: { subject?: string; claims?: Record<string, unknown> } | null;
} = {
  isAuthenticated: true,
  user: { subject: 'user-1', claims: {} },
};
const mockRelationshipsQuery = {
  data: [mockRelationship] as RelationshipSummary[] | undefined,
  error: null as Error | null,
  isLoading: false,
};
const mockTasksQueryState = {
  error: null as Error | null,
  fetchNextPage: jest.fn(async () => undefined),
  hasNextPage: false,
  isFetchNextPageError: false,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};
let mockTasksForList: RelationshipTask[] | undefined;
const mockSearchState: {
  items?: RelationshipTask[];
  hasActiveFilters: boolean;
  isFilterStateValid: boolean;
} = {
  hasActiveFilters: false,
  isFilterStateValid: true,
};
let mockTaskDataIsMissing = false;
let mockColorScheme: 'light' | 'dark' | undefined = 'light';
let mockTaskForQuery: RelationshipTask | undefined = mockIncompleteTask;
let mockTaskQueryError: Error | null = null;
let mockTaskQueryIsLoading = false;
let mockMembersForTaskQuery: RelationshipSummary['members'] | undefined =
  mockRelationship.members;
let mockMembersQueryError: Error | null = null;
let mockIncompleteTaskForList = mockIncompleteTask;
const mockUseTasksQuery = jest.fn(
  (
    _relationshipId: string | undefined,
    status: RelationshipTaskStatus = 'incomplete',
    _enabled = true,
    _pageSize?: number,
  ) => ({
    data: mockTaskDataIsMissing
      ? undefined
      : {
          pages: [
            {
              items:
                mockTasksForList ??
                (status === 'completed'
                  ? [mockCompletedTask]
                  : [mockIncompleteTaskForList]),
            },
          ],
        },
    ...mockTasksQueryState,
  }),
);

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: 'FontAwesomeHost',
}));

jest.mock('expo-checkbox', () => ({
  Checkbox: 'CheckboxHost',
}));

jest.mock('@/components/ui/ThemeAwareCheckbox', () => ({
  ThemeAwareCheckbox: 'ThemeAwareCheckboxHost',
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    Stack: {
      Screen: (props: Record<string, unknown>) =>
        React.createElement('StackScreenHost', props),
    },
    useLocalSearchParams: () => mockTaskRouteParams,
    useRouter: () => ({
      dismissTo: mockRouterDismissTo,
      navigate: mockRouterNavigate,
      push: mockRouterPush,
    }),
  };
});

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicatorHost',
  View: 'ViewHost',
  Text: 'TextHost',
  TouchableOpacity: 'TouchableOpacityHost',
  useColorScheme: () => 'light',
}));

jest.mock('@/components/ui/DetailSwipeNavigator', () => ({
  DetailNavigationCollectionRegistration:
    'DetailNavigationCollectionRegistrationHost',
  DetailSwipeNavigator: 'DetailSwipeNavigatorHost',
}));

jest.mock('@/features/time/components/RelationshipTaskCalendarModal', () => ({
  RelationshipTaskCalendarModal: 'RelationshipTaskCalendarModalHost',
}));

jest.mock('@/features/time/components/RelationshipTaskListSkeleton', () => ({
  RelationshipTaskListSkeleton: 'RelationshipTaskListSkeletonHost',
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ButtonHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'InputHost',
}));

jest.mock('@/components/ui/ThemeAwareTimePicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareTimePicker: (props: Record<string, unknown>) =>
      React.createElement('TimePickerHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareInfiniteScrollList', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareInfiniteScrollList: ({
      children,
      data,
      renderItem,
      ...props
    }: {
      children?: ReactNode;
      data: RelationshipTask[];
      renderItem: (info: {
        item: RelationshipTask;
        index: number;
      }) => ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        'ListHost',
        props,
        ...data.map((item, index) => renderItem({ item, index })),
        children,
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
    }: Record<string, unknown>) =>
      React.createElement(
        'ScreenHost',
        { ...props, bottomContent },
        children as React.ReactNode,
        bottomContent as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareSearch', () => ({
  ThemeAwareSearch: ({
    children,
    items,
    sort,
  }: {
    children: (state: {
      items: RelationshipTask[];
      searchControls: ReactNode;
      hasActiveFilters: boolean;
      isFilterStateValid: boolean;
    }) => ReactNode;
    items: RelationshipTask[];
    sort?: ThemeAwareSearchSortConfig<RelationshipTask>;
  }) => {
    mockSortConfigReceived(sort);
    return children({
      items: mockSearchState.items ?? items,
      searchControls: null,
      hasActiveFilters: mockSearchState.hasActiveFilters,
      isFilterStateValid: mockSearchState.isFilterStateValid,
    });
  },
}));

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

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => mockAuth,
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useRelationshipMembersQuery: () => ({
    data: mockMembersForTaskQuery,
    error: mockMembersQueryError,
    isLoading: false,
  }),
  useRelationshipsQuery: () => mockRelationshipsQuery,
}));

jest.mock(
  '@/features/relationships/components/RelationshipMemberSelector',
  () => {
    const React = jest.requireActual('react') as typeof import('react');

    return {
      RelationshipMemberSelector: (props: Record<string, unknown>) =>
        React.createElement('MemberSelectorHost', props),
    };
  },
);

jest.mock(
  '@/features/relationships/components/SelectedRelationshipNotice',
  () => ({
    SelectedRelationshipNotice: 'RelationshipNoticeHost',
  }),
);

jest.mock('@/features/time/hooks/useTime', () => ({
  useCompleteRelationshipTaskMutation: () => mockCompleteTaskMutation,
  useCreateRelationshipTaskMutation: () => mockCreateTaskMutation,
  useDeleteRelationshipTaskMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useRelationshipTaskQuery: () => ({
    data: mockTaskForQuery,
    error: mockTaskQueryError,
    isLoading: mockTaskQueryIsLoading,
  }),
  useUpdateRelationshipTaskMutation: () => mockUpdateTaskMutation,
  useRelationshipTasksInfiniteQuery: (
    ...args: Parameters<typeof mockUseTasksQuery>
  ) => mockUseTasksQuery(...args),
}));

jest.mock('@/state/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: () => 'relationship-1',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ locale: 'en-US', t: (key: string) => key }),
}));

describe('task screens', () => {
  let screen: ReactTestRenderer | undefined;

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
    mockTaskForQuery = mockIncompleteTask;
    mockTaskRouteParams.id = 'task-1';
    mockTaskRouteParams.relationshipId = 'relationship-1';
    mockTaskQueryError = null;
    mockTaskQueryIsLoading = false;
    mockMembersForTaskQuery = mockRelationship.members;
    mockMembersQueryError = null;
    mockIncompleteTaskForList = mockIncompleteTask;
    mockTasksForList = undefined;
    mockAuth.isAuthenticated = true;
    mockAuth.user = { subject: 'user-1', claims: {} };
    mockRelationshipsQuery.data = [mockRelationship];
    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.isLoading = false;
    mockTasksQueryState.error = null;
    mockTasksQueryState.hasNextPage = false;
    mockTasksQueryState.isFetchNextPageError = false;
    mockTasksQueryState.isFetchingNextPage = false;
    mockTasksQueryState.isLoading = false;
    mockTasksQueryState.isRefetching = false;
    mockSearchState.items = undefined;
    mockSearchState.hasActiveFilters = false;
    mockSearchState.isFilterStateValid = true;
    mockTaskDataIsMissing = false;
    mockColorScheme = 'light';
    mockCompleteTaskMutation.error = null;
    mockCompleteTaskMutation.isPending = false;
    mockUpdateTaskMutation.error = null;
    mockUpdateTaskMutation.isPending = false;
    mockCreateTaskMutation.error = undefined;
    mockCreateTaskMutation.isPending = false;
    jest.clearAllMocks();
  });

  it('renders new-task authentication, relationship loading, and empty states', () => {
    mockAuth.isAuthenticated = false;
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('paymentRequests.signIn');
    act(() => screen!.unmount());
    screen = undefined;

    mockAuth.isAuthenticated = true;
    mockAuth.user = {};
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('auth.profileUnavailable');
    act(() => screen!.unmount());
    screen = undefined;

    mockAuth.user = { subject: 'user-1', claims: {} };
    mockRelationshipsQuery.isLoading = true;
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('common.loading');
    act(() => screen!.unmount());
    screen = undefined;

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.error = new Error('Relationships unavailable');
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Relationships unavailable');
    act(() => screen!.unmount());
    screen = undefined;

    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.data = [];
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.noRelationship');
    const homeButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'rules.openHome',
    );
    act(() => homeButton.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(AppRoutePaths.home);
  });

  it('requires a valid task name and selected members before enabling creation', () => {
    mockCreateTaskMutation.isPending = true;
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });

    const taskNameInput = screen!.root.find(
      (instance) => String(instance.type) === 'InputHost',
    );
    const memberSelectors = screen!.root.findAll(
      (instance) => String(instance.type) === 'MemberSelectorHost',
    );
    let createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.createTask',
    );
    expect(createButton.props.isDisabled).toBe(true);

    act(() => taskNameInput.props.onChangeText('x'.repeat(161)));
    createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.createTask',
    );
    expect(createButton.props.isDisabled).toBe(true);

    act(() => taskNameInput.props.onChangeText('  New task  '));
    act(() => {
      memberSelectors[0].props.onChange([]);
      memberSelectors[1].props.onChange([]);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .filter(
          (instance) =>
            instance.props.children === 'time.taskMemberSelectionRequired',
        ),
    ).toHaveLength(2);
    createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.createTask',
    );
    expect(createButton.props.isDisabled).toBe(true);

    act(() => {
      memberSelectors[0].props.onChange(['user-1']);
      memberSelectors[1].props.onChange(['user-2']);
    });
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'TextHost' &&
          instance.props.children === 'time.taskMemberSelectionRequired',
      ),
    ).toHaveLength(0);
    createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.createTask',
    );
    expect(createButton.props.isDisabled).toBe(true);

    mockCreateTaskMutation.isPending = false;
    act(() => screen!.update(<NewTaskScreen />));
    const updatedTaskNameInput = screen!.root.find(
      (instance) => String(instance.type) === 'InputHost',
    );
    act(() => updatedTaskNameInput.props.onChangeText('New task'));
    createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.createTask',
    );
    expect(createButton.props.isDisabled).toBe(false);
  });

  it('defaults task visibility and completion access to all active members', async () => {
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });

    const memberSelectors = screen!.root.findAll(
      (instance) => String(instance.type) === 'MemberSelectorHost',
    );
    expect(
      memberSelectors.map((selector) => selector.props.selectedUserIds),
    ).toEqual([
      ['user-1', 'user-2'],
      ['user-1', 'user-2'],
    ]);

    const taskNameInput = screen!.root.find(
      (instance) => String(instance.type) === 'InputHost',
    );
    act(() => taskNameInput.props.onChangeText('Wash dishes'));

    const createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.createTask',
    );
    await act(async () => {
      createButton.props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockCreateTaskMutation.mutateAsync).toHaveBeenCalledWith({
      name: 'Wash dishes',
      visibleToUserIds: ['user-1', 'user-2'],
      completableByUserIds: ['user-1', 'user-2'],
    });
    expect(mockRouterDismissTo).toHaveBeenCalledWith(
      '/(tabs)/(time)/ViewAllIncompleteTasksScreen',
    );
  });

  it('includes the selected due date, time, and reminder frequency', async () => {
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });

    const selectedDate = new Date(2026, 10, 10, 16, 45);
    const dueDatePicker = screen!.root.find(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    expect(dueDatePicker.props.mode).toBe('datetime');
    act(() => dueDatePicker.props.onChange({ type: 'set' }, selectedDate));

    const inputs = screen!.root.findAll(
      (instance) => String(instance.type) === 'InputHost',
    );
    const taskNameInput = inputs.find(
      (instance) => instance.props.value === '',
    );
    const frequencyInput = inputs.find(
      (instance) => instance.props.value === '1',
    );
    expect(taskNameInput).toBeDefined();
    expect(frequencyInput).toBeDefined();
    act(() => frequencyInput?.props.onChangeText('3'));
    act(() => taskNameInput?.props.onChangeText('Wash dishes'));

    const createButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.createTask',
    );
    await act(async () => {
      createButton.props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockCreateTaskMutation.mutateAsync).toHaveBeenCalledWith({
      name: 'Wash dishes',
      dueDate: selectedDate.toISOString(),
      reminderFrequencyDays: 3,
      visibleToUserIds: ['user-1', 'user-2'],
      completableByUserIds: ['user-1', 'user-2'],
    });
  });

  it('shows a disabled checkbox to members who cannot complete an incomplete task', () => {
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });

    expect(mockUseTasksQuery).toHaveBeenCalledWith(
      'relationship-1',
      'incomplete',
      true,
      undefined,
    );
    const sortConfig = mockSortConfigReceived.mock.calls[0]?.[0];
    expect(sortConfig?.field.initialValue).toBe('createdAt');
    expect(sortConfig?.order.initialValue).toBe('descending');
    expect(sortConfig?.field.options.map(({ value }) => value)).toEqual([
      'createdAt',
      'name',
    ]);
    const checkbox = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareCheckboxHost',
    );
    expect(checkbox.props).toMatchObject({
      accessibilityLabel: 'time.markComplete: Wash dishes',
      checkboxPosition: 'right',
      disabled: true,
      label: 'time.markComplete',
      value: false,
    });

    const list = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    const scrollToTop = jest.fn();
    let footer: ReactTestRenderer | undefined;
    act(() => {
      footer = renderer.create(
        React.createElement(
          React.Fragment,
          null,
          (
            list.props.bottomContent as (actions: {
              scrollToTop: () => void;
            }) => ReactNode
          )({ scrollToTop }),
        ),
      );
    });
    const footerButtons = footer!.root.findAll(
      (instance) => String(instance.type) === 'ButtonHost',
    );
    expect(footerButtons.map((button) => button.props.children)).toEqual([
      'time.viewCompleted',
      'common.backToTop',
    ]);

    act(() => {
      footerButtons[0].props.onPress();
      footerButtons[1].props.onPress();
    });
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      '/(tabs)/(time)/ViewAllCompletedTasksScreen',
    );
    expect(scrollToTop).toHaveBeenCalledTimes(1);
    act(() => footer?.unmount());
  });

  it('pushes to task creation from the incomplete task list header', () => {
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });

    const stackScreen = screen!.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const headerRight = stackScreen.props.options
      .headerRight as () => React.ReactElement;
    let header: ReactTestRenderer | undefined;
    act(() => {
      header = renderer.create(headerRight());
    });
    const calendarButton = header!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'time.showTodoCalendar',
    );
    act(() => calendarButton.props.onPress());
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'RelationshipTaskCalendarModalHost',
      ).props,
    ).toMatchObject({
      isVisible: true,
      relationship: mockRelationship,
      status: 'incomplete',
    });
    const createButton = header!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === 'time.createTask',
    );

    act(() => createButton.props.onPress());

    expect(mockRouterPush).toHaveBeenCalledWith(AppRoutePaths.createTask);
    expect(mockRouterNavigate).not.toHaveBeenCalled();
    act(() => header?.unmount());
  });

  it('renders task due dates and builds detail links for both list modes', () => {
    const dueDate = '2026-11-10T09:00:00.000Z';
    const formattedDueDate = new Date(dueDate).toLocaleString('en-US');
    mockColorScheme = undefined;
    mockTasksForList = [{ ...mockIncompleteTask, dueDate }];
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });

    const incompleteList = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain(`time.taskDueDate: ${formattedDueDate}`);
    expect(incompleteList.props.detailNavigation.hrefForId('task-1')).toEqual({
      pathname: AppRoutePaths.taskDetails,
      params: {
        id: 'task-1',
        relationshipId: 'relationship-1',
        detailNavigationSource: DetailNavigationSources.incompleteTasks,
      },
    });
    const incompleteTaskTile = screen!.root.find(
      (instance) =>
        String(instance.type) === 'TouchableOpacityHost' &&
        instance.props.accessibilityLabel === mockIncompleteTask.name,
    );
    act(() => incompleteTaskTile.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith({
      pathname: AppRoutePaths.taskDetails,
      params: {
        id: 'task-1',
        relationshipId: 'relationship-1',
        detailNavigationSource: DetailNavigationSources.incompleteTasks,
      },
    });
    act(() => screen!.unmount());
    screen = undefined;

    mockTasksForList = [{ ...mockCompletedTask, dueDate }];
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="completed" />,
      );
    });
    const completedList = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toEqual(expect.arrayContaining(['time.taskDueDate', formattedDueDate]));
    expect(completedList.props.detailNavigation.hrefForId('task-1')).toEqual({
      pathname: AppRoutePaths.taskDetails,
      params: {
        id: 'task-1',
        relationshipId: 'relationship-1',
        detailNavigationSource: DetailNavigationSources.completedTasks,
      },
    });
    const stackScreen = screen!.root.find(
      (instance) => String(instance.type) === 'StackScreenHost',
    );
    const headerRight = stackScreen.props.options
      .headerRight as () => React.ReactElement;
    let header: ReactTestRenderer | undefined;
    act(() => {
      header = renderer.create(headerRight());
    });
    expect(
      header!.root
        .findAll((instance) => String(instance.type) === 'TouchableOpacityHost')
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(['time.showCompletedTasksCalendar']);
    expect(
      header!.root.find(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      ).props.color,
    ).toBeDefined();
    act(() => header?.unmount());
  });

  it('keeps other tasks available while completion is pending and reports failures', async () => {
    mockIncompleteTaskForList = {
      ...mockIncompleteTask,
      completableByUserIds: ['user-1'],
    };
    const nextTask = {
      ...mockIncompleteTask,
      id: 'task-2',
      name: 'Take out trash',
      completableByUserIds: ['user-1'],
    };
    mockTasksForList = [mockIncompleteTaskForList, nextTask];
    let rejectCompletion: ((error: Error) => void) | undefined;
    mockCompleteTaskMutation.mutateAsync.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectCompletion = reject;
        }),
    );

    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });

    const findTaskCheckbox = (taskName: string) =>
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareCheckboxHost' &&
          instance.props.accessibilityLabel ===
            `time.markComplete: ${taskName}`,
      );
    let checkbox = findTaskCheckbox(mockIncompleteTaskForList.name);
    expect(checkbox.props.disabled).toBe(false);
    expect(checkbox.props.value).toBe(false);

    await act(async () => {
      await checkbox.props.onValueChange(false);
    });
    expect(mockCompleteTaskMutation.mutateAsync).not.toHaveBeenCalled();

    await act(async () => {
      checkbox.props.onValueChange(true);
      await Promise.resolve();
    });

    checkbox = findTaskCheckbox(mockIncompleteTaskForList.name);
    expect(checkbox.props.value).toBe(true);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareCheckboxHost',
      ),
    ).toHaveLength(2);

    mockCompleteTaskMutation.isPending = true;
    act(() => {
      screen!.update(<RelationshipTasksListScreen status="incomplete" />);
    });
    expect(findTaskCheckbox(nextTask.name).props.disabled).toBe(false);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareCheckboxHost',
      ),
    ).toHaveLength(1);
    expect(mockCompleteTaskMutation.mutateAsync).toHaveBeenCalledWith('task-1');

    await act(async () => {
      rejectCompletion?.(new Error('Completion failed'));
      await Promise.resolve();
    });

    checkbox = findTaskCheckbox(mockIncompleteTaskForList.name);
    expect(checkbox.props.value).toBe(false);
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareCheckboxHost',
      ),
    ).toHaveLength(2);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'general/setError',
        payload: expect.objectContaining({ message: 'Completion failed' }),
      }),
    );
  });

  it('loads 50 completed tasks and opens full details from a compact row', () => {
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="completed" />,
      );
    });

    expect(mockUseTasksQuery).toHaveBeenCalledWith(
      'relationship-1',
      'completed',
      true,
      50,
    );
    const sortConfig = mockSortConfigReceived.mock.calls[0]?.[0];
    expect(sortConfig?.field.initialValue).toBe('completedAt');
    expect(sortConfig?.field.options.map(({ value }) => value)).toEqual([
      'completedAt',
      'createdAt',
      'name',
    ]);
    const renderedText = screen!.root
      .findAll(
        (instance) =>
          String(instance.type) === 'TextHost' ||
          String(instance.type) === 'HeadingHost',
      )
      .map((instance) => instance.props.children)
      .join(' ');
    expect(renderedText).toContain(mockCompletedTask.name);
    expect(renderedText).toContain('time.completedAt');
    expect(renderedText).toContain('time.completedBy');
    expect(renderedText).toContain('Sam');
    expect(renderedText).not.toContain('time.createdBy');
    expect(renderedText).not.toContain('time.recordedAt');
    expect(renderedText).not.toContain('time.taskVisibleTo');
    expect(renderedText).not.toContain('time.taskCompletableBy');
    expect(
      screen!.root.findAll(
        (instance) => String(instance.type) === 'CheckboxHost',
      ),
    ).toHaveLength(0);

    const taskTile = screen!.root.find(
      (instance) => String(instance.type) === 'TouchableOpacityHost',
    );
    act(() => taskTile.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith({
      pathname: '/(tabs)/(time)/RelationshipTaskDetailsScreen',
      params: {
        id: 'task-1',
        relationshipId: 'relationship-1',
        detailNavigationSource: 'completedTasks',
      },
    });
  });

  it('renders task-list authentication and relationship states', () => {
    mockAuth.isAuthenticated = false;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('paymentRequests.signIn');
    act(() => screen!.unmount());
    screen = undefined;

    mockAuth.isAuthenticated = true;
    mockAuth.user = null;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('auth.profileUnavailable');
    act(() => screen!.unmount());
    screen = undefined;

    mockAuth.user = { subject: 'user-1', claims: {} };
    mockRelationshipsQuery.isLoading = true;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    const relationshipLoadingScreen = screen!.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    const relationshipLoadingSkeleton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'RelationshipTaskListSkeletonHost',
    );
    expect(relationshipLoadingScreen.props.fillAvailableSpace).toBe(true);
    expect(relationshipLoadingSkeleton.props.status).toBe('incomplete');
    act(() => screen!.unmount());
    screen = undefined;

    mockRelationshipsQuery.isLoading = false;
    mockRelationshipsQuery.error = new Error('Relationships unavailable');
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Relationships unavailable');
    act(() => screen!.unmount());
    screen = undefined;

    mockRelationshipsQuery.error = null;
    mockRelationshipsQuery.data = [];
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.noRelationship');
    const homeButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'rules.openHome',
    );
    act(() => homeButton.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(AppRoutePaths.home);
    act(() => screen!.unmount());
    screen = undefined;

    mockRelationshipsQuery.data = undefined;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.noRelationship');
    act(() => screen!.unmount());
    screen = undefined;
    mockRelationshipsQuery.data = [mockRelationship];
  });

  it('renders task-list loading, query errors, and empty or filtered states', () => {
    mockTasksForList = [];
    mockTasksQueryState.isLoading = true;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    const getEmptyMessage = () => {
      const empty = screen!.root.find(
        (instance) => String(instance.type) === 'ListHost',
      ).props.ListEmptyComponent;
      return React.isValidElement<{ children?: React.ReactNode }>(empty)
        ? empty.props.children
        : empty;
    };
    const loadingList = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    expect(loadingList.props.isLoading).toBe(true);
    expect(loadingList.props.loadingSpinner).toEqual(
      expect.objectContaining({
        props: { status: 'incomplete' },
        type: 'RelationshipTaskListSkeletonHost',
      }),
    );
    act(() => screen!.unmount());
    screen = undefined;

    mockTasksQueryState.isLoading = false;
    mockTasksQueryState.error = new Error('Tasks unavailable');
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(getEmptyMessage()).toBe('Tasks unavailable');
    act(() => screen!.unmount());
    screen = undefined;

    mockTasksQueryState.error = new Error('');
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(getEmptyMessage()).toBe('time.tasksError');
    act(() => screen!.unmount());
    screen = undefined;

    mockTasksQueryState.error = null;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(getEmptyMessage()).toBe('time.emptyTasks');
    act(() => screen!.unmount());
    screen = undefined;

    mockSearchState.hasActiveFilters = true;
    mockSearchState.items = [];
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(getEmptyMessage()).toBe('time.noFilteredTasks');
    act(() => screen!.unmount());
    screen = undefined;

    mockTasksQueryState.hasNextPage = true;
    mockSearchState.isFilterStateValid = false;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(getEmptyMessage()).toBe('time.noFilteredTasks');
    act(() => screen!.unmount());
    screen = undefined;

    mockSearchState.isFilterStateValid = true;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    expect(getEmptyMessage()).toBeNull();
    act(() => screen!.unmount());
    screen = undefined;

    mockSearchState.hasActiveFilters = false;
    mockSearchState.items = undefined;
    mockTasksQueryState.hasNextPage = false;
    mockTasksQueryState.isFetchNextPageError = true;
    mockTasksQueryState.error = new Error('More tasks unavailable');
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    const listFooter = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    ).props.ListFooterComponent;
    if (!React.isValidElement(listFooter)) {
      throw new Error('Expected the list to render a load-more retry footer.');
    }
    let footerRenderer: ReactTestRenderer;
    act(() => {
      footerRenderer = renderer.create(listFooter);
    });
    expect(
      footerRenderer!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('More tasks unavailable');
    const retryButton = footerRenderer!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'home.retry',
    );
    act(() => retryButton.props.onPress());
    expect(mockTasksQueryState.fetchNextPage).toHaveBeenCalled();
    act(() => {
      footerRenderer!.unmount();
      screen!.unmount();
    });
    screen = undefined;

    mockTasksQueryState.isFetchNextPageError = false;
    mockTasksQueryState.error = null;
    mockTasksQueryState.hasNextPage = false;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="completed" />,
      );
    });
    expect(getEmptyMessage()).toBe('time.emptyCompletedTasks');
    act(() => screen!.unmount());
    screen = undefined;
  });

  it('reports a fallback error when completion rejects without a useful message', async () => {
    mockIncompleteTaskForList = {
      ...mockIncompleteTask,
      completableByUserIds: ['user-1'],
    };
    mockTasksForList = [mockIncompleteTaskForList];
    mockCompleteTaskMutation.mutateAsync.mockRejectedValueOnce(
      'Completion unavailable',
    );

    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });
    const checkbox = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareCheckboxHost',
    );

    await act(async () => {
      checkbox.props.onValueChange(true);
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'general/setError',
        payload: expect.objectContaining({
          message: 'time.taskCompleteError',
        }),
      }),
    );
  });

  it('renders incomplete completion metadata and switches from completed tasks', () => {
    mockTasksForList = [
      {
        ...mockCompletedTask,
        completedAt: undefined,
        completedByUserId: undefined,
      },
    ];
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="completed" />,
      );
    });

    const renderedText = screen!.root
      .findAll(
        (instance) =>
          String(instance.type) === 'TextHost' ||
          String(instance.type) === 'HeadingHost',
      )
      .map((instance) => instance.props.children);
    expect(renderedText).toContain('time.notCompletedYet');
    expect(renderedText).not.toContain('time.completedBy');

    const list = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    const scrollToTop = jest.fn();
    let footer: ReactTestRenderer | undefined;
    act(() => {
      footer = renderer.create(
        React.createElement(
          React.Fragment,
          null,
          (
            list.props.bottomContent as (actions: {
              scrollToTop: () => void;
            }) => ReactNode
          )({ scrollToTop }),
        ),
      );
    });
    const switchButton = footer!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.viewIncomplete',
    );
    act(() => switchButton.props.onPress());
    expect(mockRouterNavigate).toHaveBeenCalledWith(
      AppRoutePaths.viewAllIncompleteTasks,
    );

    act(() => {
      footer!.unmount();
      screen!.unmount();
    });
  });

  it('uses the default message and disables retry during load-more errors', () => {
    mockTasksQueryState.isFetchNextPageError = true;
    mockTasksQueryState.isFetchingNextPage = true;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });

    const listFooter = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    ).props.ListFooterComponent;
    if (!React.isValidElement(listFooter)) {
      throw new Error('Expected the list to render a load-more retry footer.');
    }
    let footerRenderer: ReactTestRenderer | undefined;
    act(() => {
      footerRenderer = renderer.create(listFooter);
    });

    expect(
      footerRenderer!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.loadMoreTasksError');
    expect(
      footerRenderer!.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'home.retry',
      ).props.isDisabled,
    ).toBe(true);

    act(() => {
      footerRenderer?.unmount();
      screen?.unmount();
    });
    screen = undefined;
  });

  it('uses an empty task list when the query has no cached pages', () => {
    mockTaskDataIsMissing = true;
    act(() => {
      screen = renderer.create(
        <RelationshipTasksListScreen status="incomplete" />,
      );
    });

    const list = screen!.root.find(
      (instance) => String(instance.type) === 'ListHost',
    );
    expect(list.props.detailNavigation.pageKey).toBe(0);
    expect(
      React.isValidElement<{ children?: React.ReactNode }>(
        list.props.ListEmptyComponent,
      )
        ? list.props.ListEmptyComponent.props.children
        : list.props.ListEmptyComponent,
    ).toBe('time.emptyTasks');
  });

  it('returns incomplete task details to the incomplete task list', () => {
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });

    const backButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.viewAllTasks',
    );
    act(() => backButton.props.onPress());

    expect(mockRouterDismissTo).toHaveBeenCalledWith(
      '/(tabs)/(time)/ViewAllIncompleteTasksScreen',
    );
  });

  it('returns completed task details to the completed task list', () => {
    mockTaskForQuery = mockCompletedTask;

    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });

    const backButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.viewCompletedTasks',
    );
    act(() => backButton.props.onPress());

    expect(mockRouterDismissTo).toHaveBeenCalledWith(
      '/(tabs)/(time)/ViewAllCompletedTasksScreen',
    );
  });

  it('lets any incomplete-task completer open the edit screen', () => {
    mockAuth.user = { subject: 'user-2', claims: {} };
    mockTaskForQuery = {
      ...mockIncompleteTask,
      completableByUserIds: ['user-2'],
    };

    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });

    const editButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.editTask',
    );
    act(() => editButton.props.onPress());
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: AppRoutePaths.editTask,
      params: {
        id: 'task-1',
        relationshipId: 'relationship-1',
      },
    });

    act(() => screen!.unmount());
    screen = undefined;

    mockTaskForQuery = {
      ...mockCompletedTask,
      completableByUserIds: ['user-2'],
    };
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'time.editTask',
      ),
    ).toHaveLength(0);
  });

  it('shows the last editor, edit time, and changed task fields', () => {
    mockTaskForQuery = {
      ...mockIncompleteTask,
      updatedByUserId: 'user-2',
      lastEditedAt: '2026-10-30T12:00:00.000Z',
      lastEditedFields: ['name', 'dueDate'],
    };

    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });

    const renderedText = screen!.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
    expect(renderedText).toEqual(
      expect.arrayContaining([
        'time.lastEditedBy',
        'Sam',
        'time.lastEditedAt',
        new Date('2026-10-30T12:00:00.000Z').toLocaleString('en-US'),
        'time.lastEditedChanges',
        'time.taskName, time.taskDueDate',
      ]),
    );
  });

  it('pins delete for the task creator only', () => {
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });

    const deleteButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'common.delete',
    );
    expect(deleteButton.props.darkBackground).toBe('$error700');
    expect(
      screen!.root.find((instance) => String(instance.type) === 'ScreenHost')
        .props.bottomContent,
    ).toBeDefined();
    act(() => screen!.unmount());

    mockAuth.user = { subject: 'user-2', claims: {} };
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'common.delete',
      ),
    ).toHaveLength(0);
  });

  it('renders task metadata for an authorized incomplete task', () => {
    mockTaskForQuery = {
      ...mockIncompleteTask,
      dueDate: '2026-11-10T09:00:00.000Z',
      reminderFrequencyDays: 3,
      visibleToUserIds: ['user-1', 'unknown-user'],
      completableByUserIds: [],
    };

    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });

    const renderedText = screen!.root
      .findAll(
        (instance) =>
          String(instance.type) === 'TextHost' ||
          String(instance.type) === 'HeadingHost',
      )
      .map((instance) => instance.props.children);
    const detailsScreen = screen!.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    expect(detailsScreen.props.fixedHeaderContent.props.children).toBe(
      'Wash dishes',
    );
    expect(renderedText).toEqual(
      expect.arrayContaining([
        'time.createdBy',
        'Alex',
        'time.recordedAt',
        'time.taskDueDate',
        new Date('2026-11-10T09:00:00.000Z').toLocaleString('en-US'),
        'time.taskReminderFrequency',
        3,
        'time.completedAt',
        'time.notCompletedYet',
        'time.taskVisibleTo',
        'Alex, unknown-user',
        'time.taskCompletableBy',
        'time.allMembers',
      ]),
    );

    let footer: ReactTestRenderer | undefined;
    act(() => {
      footer = renderer.create(detailsScreen.props.bottomContent);
    });
    expect(
      footer!.root
        .findAll((instance) => String(instance.type) === 'ButtonHost')
        .map((button) => button.props.children),
    ).toEqual([
      'time.viewAllTasks',
      'time.editTask',
      'time.markComplete',
      'common.delete',
    ]);

    const completeButton = footer!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.markComplete',
    );
    expect(completeButton.props.isDisabled).toBe(false);
    act(() => completeButton.props.onPress());
    expect(mockCompleteTaskMutation.mutateAsync).toHaveBeenCalledWith('task-1');
    act(() => footer?.unmount());
  });

  it('prepopulates and saves task changes from the edit screen', async () => {
    mockAuth.user = { subject: 'user-2', claims: {} };
    mockTaskForQuery = {
      ...mockIncompleteTask,
      completableByUserIds: ['user-2'],
    };

    act(() => {
      screen = renderer.create(<EditTaskScreen />);
    });

    const taskNameInput = screen!.root.find(
      (instance) => String(instance.type) === 'InputHost',
    );
    expect(taskNameInput.props.value).toBe('Wash dishes');
    act(() => taskNameInput.props.onChangeText('Sweep kitchen'));

    const saveButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.saveTask',
    );
    await act(async () => {
      saveButton.props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockUpdateTaskMutation.mutateAsync).toHaveBeenCalledWith({
      taskId: 'task-1',
      input: {
        name: 'Sweep kitchen',
        visibleToUserIds: ['user-1', 'user-2'],
        completableByUserIds: ['user-2'],
      },
    });
    expect(mockRouterDismissTo).toHaveBeenCalledWith({
      pathname: AppRoutePaths.taskDetails,
      params: {
        id: 'task-1',
        relationshipId: 'relationship-1',
      },
    });
  });

  it('blocks editing for non-completers and completed tasks', () => {
    mockAuth.user = { subject: 'user-2', claims: {} };
    mockTaskForQuery = {
      ...mockIncompleteTask,
      completableByUserIds: ['user-1'],
    };

    act(() => {
      screen = renderer.create(<EditTaskScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.taskEditForbidden');
    expect(
      screen!.root.findAll((instance) => String(instance.type) === 'InputHost'),
    ).toHaveLength(0);

    act(() => screen!.unmount());
    screen = undefined;

    mockTaskForQuery = {
      ...mockCompletedTask,
      completableByUserIds: ['user-2'],
    };
    act(() => {
      screen = renderer.create(<EditTaskScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.taskEditForbidden');
  });

  it('places task completion in the edit footer and shows completion errors', () => {
    mockTaskForQuery = {
      ...mockIncompleteTask,
      completableByUserIds: [],
    };
    mockCompleteTaskMutation.isPending = true;

    act(() => {
      screen = renderer.create(<EditTaskScreen />);
    });

    const screenHost = screen!.root.find(
      (instance) => String(instance.type) === 'ScreenHost',
    );
    expect(
      screenHost
        .findAll((instance) => String(instance.type) === 'ButtonHost')
        .map((button) => button.props.children),
    ).toEqual(['time.completingTask', 'time.saveTask']);
    expect(
      screen!.root.find(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'time.completingTask',
      ).props.isDisabled,
    ).toBe(true);

    mockCompleteTaskMutation.isPending = false;
    mockCompleteTaskMutation.error = new Error('');
    act(() => screen!.update(<EditTaskScreen />));

    const restoredButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.markComplete',
    );
    expect(restoredButton.props.isDisabled).toBe(false);
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.taskCompleteError');
  });

  it('shows completion restrictions and task-detail mutation errors', () => {
    mockTaskForQuery = {
      ...mockIncompleteTask,
      completableByUserIds: ['user-2'],
    };
    mockCompleteTaskMutation.error = new Error('');
    mockMembersQueryError = new Error('Members unavailable');

    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });

    const renderedText = screen!.root
      .findAll((instance) => String(instance.type) === 'TextHost')
      .map((instance) => instance.props.children);
    expect(renderedText).toEqual(
      expect.arrayContaining([
        'time.cannotCompleteTask',
        'time.taskCompleteError',
        'Members unavailable',
      ]),
    );
    expect(
      screen!.root.findAll(
        (instance) =>
          String(instance.type) === 'ButtonHost' &&
          instance.props.children === 'time.markComplete',
      ),
    ).toHaveLength(0);
  });

  it('allows a member selected as a completer to finish an incomplete task', () => {
    mockTaskForQuery = {
      ...mockIncompleteTask,
      completableByUserIds: ['user-1'],
    };

    act(() => {
      screen = renderer.create(<EditTaskScreen />);
    });

    const completeButton = screen!.root.find(
      (instance) =>
        String(instance.type) === 'ButtonHost' &&
        instance.props.children === 'time.markComplete',
    );
    expect(completeButton.props.isDisabled).toBe(false);
    act(() => completeButton.props.onPress());
    expect(mockCompleteTaskMutation.mutate).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const onCompleteSuccess =
      mockCompleteTaskMutation.mutate.mock.calls[0]?.[1]?.onSuccess;
    act(() => onCompleteSuccess?.(mockCompletedTask));
    expect(mockRouterDismissTo).toHaveBeenCalledWith({
      pathname: AppRoutePaths.taskDetails,
      params: {
        id: 'task-1',
        relationshipId: 'relationship-1',
      },
    });
  });

  it('shows relationship-task creation mutation errors', () => {
    mockCreateTaskMutation.error = new Error('Task creation failed');
    act(() => {
      screen = renderer.create(<NewTaskScreen />);
    });

    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Task creation failed');
  });

  it('renders authentication, parameter, loading, and task-query states', () => {
    mockAuth.isAuthenticated = false;
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('paymentRequests.signIn');
    act(() => screen!.unmount());
    screen = undefined;

    mockAuth.isAuthenticated = true;
    mockAuth.user = {};
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('auth.profileUnavailable');
    act(() => screen!.unmount());
    screen = undefined;

    mockAuth.user = { subject: 'user-1', claims: {} };
    mockTaskRouteParams.id = undefined;
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.taskNotFound');
    act(() => screen!.unmount());
    screen = undefined;

    mockTaskRouteParams.id = 'task-1';
    mockTaskQueryIsLoading = true;
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('common.loading');
    act(() => screen!.unmount());
    screen = undefined;

    mockTaskQueryIsLoading = false;
    mockTaskQueryError = new Error('Task unavailable');
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('Task unavailable');
    act(() => screen!.unmount());
    screen = undefined;

    mockTaskQueryError = null;
    mockTaskForQuery = undefined;
    act(() => {
      screen = renderer.create(<RelationshipTaskDetailsScreen />);
    });
    expect(
      screen!.root
        .findAll((instance) => String(instance.type) === 'TextHost')
        .map((instance) => instance.props.children),
    ).toContain('time.taskNotFound');
  });
});
