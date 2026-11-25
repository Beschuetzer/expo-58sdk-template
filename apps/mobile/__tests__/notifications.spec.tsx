import type { Notification } from '@expo-50sdk-template/shared-types';
import React, { type ReactNode } from 'react';
import renderer, { act } from 'react-test-renderer';

import NotificationsInboxScreen from '../app/(tabs)/(account)/notifications';

const mockPush = jest.fn();
const mockMarkNotificationRead = jest.fn();
const mockCompleteNotification = jest.fn();
const mockNotificationsQuery = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-checkbox', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Checkbox: (props: Record<string, unknown>) =>
      React.createElement('CheckboxHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareBadge', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareBadge: ({ children }: { children?: ReactNode }) =>
      React.createElement('ThemeAwareBadgeHost', null, children),
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

jest.mock('@/components/ui/ThemeAwareInfiniteScrollList', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareInfiniteScrollList: ({
      children,
      data,
      renderItem,
      stickyHeader,
      bottomContent,
      ...props
    }: {
      children?: ReactNode;
      data: Notification[];
      renderItem: (info: { item: Notification; index: number }) => ReactNode;
      stickyHeader?: ReactNode;
      bottomContent?: ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        'ThemeAwareInfiniteScrollListHost',
        { ...props, bottomContent, data, stickyHeader },
        stickyHeader,
        bottomContent,
        children,
        ...data.map((item, index) => renderItem({ item, index })),
      ),
  };
});

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({ children }: { children?: ReactNode }) =>
      React.createElement('ThemeAwareScreenHost', null, children),
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareSurface: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ThemeAwareSurfaceHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createTextHost =
    (name: string) =>
    ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(name, props, children);

  return {
    ThemeAwareHeading: createTextHost('ThemeAwareHeadingHost'),
    ThemeAwareText: createTextHost('ThemeAwareTextHost'),
  };
});

jest.mock('@/features/auth/OAuth2AuthProvider', () => ({
  useOAuth2Auth: () => ({
    isAuthenticated: true,
    user: { subject: 'user-1' },
  }),
}));

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useCompleteNotificationMutation: () => ({
    isPending: false,
    mutateAsync: mockCompleteNotification,
  }),
  useMarkNotificationReadMutation: () => ({
    isPending: false,
    mutateAsync: mockMarkNotificationRead,
  }),
  useNotificationsQuery: (...args: unknown[]) =>
    mockNotificationsQuery(...args),
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ locale: 'en', t: (key: string) => key }),
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/utils/logging', () => ({
  logWarn: jest.fn(),
}));

function createNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 'notification-1',
    recipientUserId: 'user-1',
    eventId: 'event-1',
    target: {
      type: 'meTime',
      id: 'me-time-1',
      relationshipId: 'relationship-1',
    },
    title: 'Me Time added',
    body: 'A new entry was created.',
    deliveryStatus: 'delivered',
    createdAt: '2026-10-29T12:00:00.000Z',
    ...overrides,
  };
}

function renderInbox(
  notification: Notification | Notification[],
  options: {
    getItems?: () => Notification[];
    optimisticReadIds?: string[];
  } = {},
) {
  const items = Array.isArray(notification) ? notification : [notification];
  mockNotificationsQuery.mockImplementation(() => {
    const currentItems = options.getItems?.() ?? items;
    return {
      data: {
        items: currentItems,
        unreadCount: currentItems.filter((item) => !item.readAt).length,
        ...(options.optimisticReadIds
          ? { optimisticReadIds: options.optimisticReadIds }
          : {}),
      },
      isError: false,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({}),
    };
  });

  return renderer.create(<NotificationsInboxScreen />);
}

describe('NotificationsInboxScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockNotificationsQuery.mockReset();
    mockMarkNotificationRead.mockReset();
    mockCompleteNotification.mockReset();
    mockMarkNotificationRead.mockResolvedValue(undefined);
    mockCompleteNotification.mockResolvedValue(undefined);
  });

  it('marks an unread notification as read and opens its related page', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderInbox(createNotification());
    });

    expect(mockNotificationsQuery).toHaveBeenCalledWith(true);
    const row = screen.root.find(
      (instance) => instance.props.accessibilityHint === 'notifications.open',
    );

    await act(async () => {
      row.props.onPress();
      await mockMarkNotificationRead.mock.results[0].value;
    });

    expect(mockMarkNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(mockPush.mock.invocationCallOrder[0]).toBeLessThan(
      mockMarkNotificationRead.mock.invocationCallOrder[0],
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/(time)/MeTimeDetailsScreen',
      params: { id: 'me-time-1', relationshipId: 'relationship-1' },
    });
    act(() => screen.unmount());
  });

  it('opens payment notifications within the tabs navigator', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderInbox(
        createNotification({
          target: { type: 'paymentRequest', id: 'payment-request-1' },
          readAt: '2026-10-29T13:00:00.000Z',
        }),
      );
    });

    const row = screen.root.find(
      (instance) => instance.props.accessibilityHint === 'notifications.open',
    );

    await act(async () => {
      row.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/(requests)/payment-request/[id]',
      params: { id: 'payment-request-1' },
    });
    act(() => screen.unmount());
  });

  it('clears unread indicators from optimistic cache state without adding a read timestamp', async () => {
    let screen!: renderer.ReactTestRenderer;
    const notification = createNotification();
    await act(async () => {
      screen = renderInbox(notification, {
        optimisticReadIds: [notification.id],
      });
    });

    const list = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareInfiniteScrollListHost',
    );
    expect(list.props.data).toEqual([notification]);
    expect(list.props.data[0].readAt).toBeUndefined();
    expect(
      screen.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareBadgeHost',
      ),
    ).toHaveLength(0);

    const row = screen.root.find(
      (instance) => instance.props.accessibilityHint === 'notifications.open',
    );
    await act(async () => {
      row.props.onPress();
    });
    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
    act(() => screen.unmount());
  });

  it('selects all notifications and completes every selected notification', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderInbox([
        createNotification(),
        createNotification({ id: 'notification-2' }),
        createNotification({
          id: 'notification-3',
          readAt: '2026-10-29T13:00:00.000Z',
        }),
      ]);
    });

    const list = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareInfiniteScrollListHost',
    );
    expect(list.props.stickyHeader).toBeDefined();
    expect(list.props.bottomContent).toBeDefined();
    expect(list.props.hasNextPage).toBe(false);
    const bottomContent = renderer.create(list.props.bottomContent);
    expect(
      bottomContent.root
        .findAll((instance) => String(instance.type) === 'ThemeAwareButtonHost')
        .map((button) => button.props.children),
    ).toEqual(['notifications.selectAll', 'notifications.markComplete']);
    act(() => bottomContent.unmount());

    const getCheckboxValues = () =>
      screen.root
        .findAll((instance) => String(instance.type) === 'CheckboxHost')
        .map((checkbox) => checkbox.props.value);
    const checkboxes = screen.root.findAll(
      (instance) => String(instance.type) === 'CheckboxHost',
    );
    act(() => {
      checkboxes[0].props.onValueChange(true);
      checkboxes[1].props.onValueChange(true);
    });
    expect(getCheckboxValues()).toEqual([true, true, false]);

    const selectAllButton = screen.root.findByProps({
      accessibilityLabel: 'notifications.selectAll',
    });
    act(() => selectAllButton.props.onPress());
    expect(getCheckboxValues()).toEqual([true, true, true]);

    const markCompleteButton = screen.root.findByProps({
      accessibilityLabel: 'notifications.markComplete',
    });
    await act(async () => {
      await markCompleteButton.props.onPress();
    });

    expect(mockCompleteNotification.mock.calls).toEqual([
      ['notification-1'],
      ['notification-2'],
      ['notification-3'],
    ]);
    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
    expect(getCheckboxValues()).toEqual([false, false, false]);
    act(() => screen.unmount());
  });

  it('surfaces completion failures and keeps the selected notification selected', async () => {
    mockCompleteNotification.mockRejectedValueOnce(new Error('offline'));
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderInbox(createNotification());
    });

    const checkbox = screen.root.find(
      (instance) => String(instance.type) === 'CheckboxHost',
    );
    act(() => checkbox.props.onValueChange(true));

    const markCompleteButton = screen.root.findByProps({
      accessibilityLabel: 'notifications.markComplete',
    });
    await act(async () => {
      await markCompleteButton.props.onPress();
    });

    expect(mockCompleteNotification).toHaveBeenCalledWith('notification-1');
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children ===
            'notifications.markSelectedCompleteFailed',
      ),
    ).toHaveLength(1);
    expect(
      screen.root.find((instance) => String(instance.type) === 'CheckboxHost')
        .props.value,
    ).toBe(true);
    act(() => screen.unmount());
  });

  it('restores only failed notifications after a partially successful bulk completion', async () => {
    const notifications = [
      createNotification(),
      createNotification({ id: 'notification-2' }),
      createNotification({ id: 'notification-3' }),
    ];
    let authoritativeItems = notifications;
    const resolveCompletion = new Map<string, () => void>();
    const rejectCompletion = new Map<string, (error: Error) => void>();
    mockCompleteNotification.mockImplementation(
      (notificationId: string) =>
        new Promise<void>((resolve, reject) => {
          resolveCompletion.set(notificationId, resolve);
          rejectCompletion.set(notificationId, reject);
        }),
    );

    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderInbox(notifications, {
        getItems: () => authoritativeItems,
      });
    });

    const checkboxes = screen.root.findAll(
      (instance) => String(instance.type) === 'CheckboxHost',
    );
    act(() => {
      checkboxes.forEach((checkbox) => checkbox.props.onValueChange(true));
    });
    const completeButton = screen.root.findByProps({
      accessibilityLabel: 'notifications.markComplete',
    });
    let completionPromise!: Promise<void>;
    act(() => {
      completionPromise = completeButton.props.onPress();
    });

    const list = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareInfiniteScrollListHost',
    );
    expect(list.props.data).toEqual([]);
    expect(mockCompleteNotification).toHaveBeenCalledTimes(3);

    authoritativeItems = [notifications[1]];
    resolveCompletion.get('notification-1')?.();
    rejectCompletion.get('notification-2')?.(new Error('offline'));
    resolveCompletion.get('notification-3')?.();
    await act(async () => {
      await completionPromise;
    });

    expect(
      screen.root
        .find(
          (instance) =>
            String(instance.type) === 'ThemeAwareInfiniteScrollListHost',
        )
        .props.data.map((item: Notification) => item.id),
    ).toEqual(['notification-2']);
    expect(
      screen.root.find((instance) => String(instance.type) === 'CheckboxHost')
        .props.value,
    ).toBe(true);
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children ===
            'notifications.markSelectedCompleteFailed',
      ),
    ).toHaveLength(1);
    act(() => screen.unmount());
  });

  it('marks legacy notifications as read and explains when no page is linked', async () => {
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderInbox(createNotification({ target: undefined }));
    });

    const row = screen.root.find(
      (instance) => instance.props.accessibilityHint === 'notifications.open',
    );
    await act(async () => {
      row.props.onPress();
      await mockMarkNotificationRead.mock.results[0].value;
    });

    expect(mockMarkNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'notifications.destinationUnavailable',
      ),
    ).toHaveLength(1);
    act(() => screen.unmount());
  });

  it('navigates immediately even when marking a notification as read fails', async () => {
    let rejectMarkRead!: (error: Error) => void;
    const markReadPromise = new Promise<void>((_, reject) => {
      rejectMarkRead = reject;
    });
    mockMarkNotificationRead.mockReturnValue(markReadPromise);
    let screen!: renderer.ReactTestRenderer;
    await act(async () => {
      screen = renderInbox(createNotification());
    });

    const row = screen.root.find(
      (instance) => instance.props.accessibilityHint === 'notifications.open',
    );
    await act(async () => {
      row.props.onPress();
      rejectMarkRead(new Error('offline'));
      await markReadPromise.catch(() => undefined);
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/(time)/MeTimeDetailsScreen',
      params: { id: 'me-time-1', relationshipId: 'relationship-1' },
    });
    expect(
      screen.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'notifications.markReadFailed',
      ),
    ).toHaveLength(1);
    act(() => screen.unmount());
  });
});
