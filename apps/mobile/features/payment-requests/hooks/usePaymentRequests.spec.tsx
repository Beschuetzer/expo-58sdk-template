import type {
  PaymentRequest,
  PaymentRequestStatus,
  PaymentRequestListResponse,
  PaymentRequestSummary,
  RelationshipJoinRequest,
  RelationshipMember,
  RelationshipSearchResult,
  RelationshipSummary,
  RubricVersion,
} from '@expo-50sdk-template/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  paymentRequestQueryKeys,
  useAcceptInvitationMutation,
  useAwaitingDecisionPaymentRequestsInfiniteQuery,
  useAwaitingDecisionRelationshipJoinRequestsQuery,
  useCancelPaymentRequestMutation,
  useCompleteNotificationMutation,
  useCreatePaymentRequestMutation,
  useCreateRelationshipInvitationMutation,
  useCreateRelationshipMutation,
  useDeletePaymentRequestMutation,
  useDeleteRelationshipJoinRequestMutation,
  useDeleteRelationshipMutation,
  useDecidePaymentRequestMutation,
  useDecideRelationshipJoinRequestMutation,
  useInvitationPreviewQuery,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  usePaymentRequestQuery,
  usePaymentRequestCalendarQuery,
  usePaymentRequestsInfiniteQuery,
  usePaymentRequestsQuery,
  useRelationshipJoinRequestQuery,
  useRelationshipJoinRequestsQuery,
  useRelationshipMembersQuery,
  useRelationshipRubricQuery,
  useRelationshipSearchQuery,
  useRelationshipsQuery,
  useRequestToJoinRelationshipMutation,
  useSubmitPaymentRequestMutation,
  useUpdatePaymentRequestMutation,
} from './usePaymentRequests';
import * as paymentRequestsApi from '../api';

import { jointAccountChargeQueryKeys } from '@/features/joint-account-charges/hooks/useJointAccountCharges';

jest.mock('../api', () => ({
  acceptInvitation: jest.fn(),
  cancelPaymentRequest: jest.fn(),
  completeNotification: jest.fn(),
  createPaymentRequest: jest.fn(),
  createRelationship: jest.fn(),
  createRelationshipInvitation: jest.fn(),
  deletePaymentRequest: jest.fn(),
  deleteRelationship: jest.fn(),
  deleteRelationshipJoinRequest: jest.fn(),
  decidePaymentRequest: jest.fn(),
  decideRelationshipJoinRequest: jest.fn(),
  getNotifications: jest.fn(),
  getPaymentRequest: jest.fn(),
  getPaymentRequestCalendarMonth: jest.fn(),
  getPaymentRequests: jest.fn(),
  getRelationshipJoinRequest: jest.fn(),
  getRelationshipJoinRequests: jest.fn(),
  getRelationshipMembers: jest.fn(),
  getRelationshipRubric: jest.fn(),
  getRelationships: jest.fn(),
  getInvitationPreview: jest.fn(),
  markNotificationRead: jest.fn(),
  requestToJoinRelationship: jest.fn(),
  searchRelationships: jest.fn(),
  submitPaymentRequest: jest.fn(),
  updatePaymentRequest: jest.fn(),
}));

function makeRequest(
  id: string,
  relationshipId = 'relationship-1',
  status: PaymentRequestStatus = 'draft',
): PaymentRequestSummary {
  return {
    id,
    relationshipId,
    createdByUserId: 'user-1',
    title: id,
    amountMinorUnits: 1200,
    currency: 'USD',
    purchaseDate: '2025-01-01T00:00:00.000Z',
    categories: [],
    status,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
}

function makePaymentRequest(
  id: string,
  status: PaymentRequestStatus = 'draft',
): PaymentRequest {
  return {
    ...makeRequest(id, 'relationship-1', status),
    rationale: 'A shared purchase',
    requestedSplit: [{ memberUserId: 'user-1', percentage: 100 }],
    decisions: [],
    activity: [],
  };
}

function makeRelationship(
  id = 'relationship-1',
  name = 'Shared space',
): RelationshipSummary {
  return {
    id,
    name,
    shareCode: 'share-code',
    approvalPolicy: 'all_members',
    members: [],
    pendingJoinRequestCount: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
}

function makeJoinRequest(id = 'join-request-1'): RelationshipJoinRequest {
  return {
    id,
    relationshipId: 'relationship-1',
    requesterUserId: 'user-2',
    status: 'pending',
    createdAt: '2025-01-01T00:00:00.000Z',
  };
}

function makeMember(): RelationshipMember {
  return {
    id: 'member-record-1',
    relationshipId: 'relationship-1',
    userId: 'user-1',
    displayName: 'Alex',
    role: 'owner',
    active: true,
  };
}

function makeSearchResult(id = 'relationship-1'): RelationshipSearchResult {
  return {
    id,
    name: id === 'relationship-1' ? 'Shared space' : 'Other space',
    shareCode: `share-${id}`,
    memberCount: 2,
    owner: { displayName: 'Alex', userId: 'user-1' },
    membershipStatus: 'available',
    createdAt: '2025-01-01T00:00:00.000Z',
  };
}

let mountedRenderer: ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;

beforeEach(() => {
  jest.clearAllMocks();
});

async function flushPromises() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await Promise.resolve();
  }
}

async function settleQueries() {
  await act(async () => {
    await flushPromises();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

async function mountHook<T>(hook: () => T, existingClient?: QueryClient) {
  const testQueryClient =
    existingClient ??
    new QueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity, retry: false },
        mutations: { gcTime: Infinity },
      },
    });
  queryClient = testQueryClient;
  let hookResult: T | undefined;

  function TestConsumer() {
    hookResult = hook();
    return null;
  }

  await act(async () => {
    mountedRenderer = renderer.create(
      <QueryClientProvider client={testQueryClient}>
        <TestConsumer />
      </QueryClientProvider>,
    );
  });

  return {
    client: testQueryClient,
    get current() {
      return hookResult;
    },
  };
}

describe('payment request pagination', () => {
  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = null;
    }
    queryClient?.clear();
    queryClient = null;
  });

  it('loads the next cursor page on demand', async () => {
    const firstPage: PaymentRequestListResponse = {
      items: [makeRequest('request-1')],
      nextCursor: 'request-1',
    };
    const secondPage: PaymentRequestListResponse = {
      items: [makeRequest('request-2')],
    };
    jest
      .mocked(paymentRequestsApi.getPaymentRequests)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient = testQueryClient;
    let queryResult:
      | ReturnType<typeof usePaymentRequestsInfiniteQuery>
      | undefined;

    function TestConsumer() {
      queryResult = usePaymentRequestsInfiniteQuery('relationship-1');
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={testQueryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await flushPromises();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenNthCalledWith(
      1,
      'relationship-1',
      {
        cursor: undefined,
        limit: 20,
      },
    );
    expect(queryResult?.data?.pages).toHaveLength(1);
    expect(queryResult?.hasNextPage).toBe(true);

    await act(async () => {
      await queryResult?.fetchNextPage();
      await flushPromises();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      {
        cursor: 'request-1',
        limit: 20,
      },
    );
    expect(
      queryResult?.data?.pages.flatMap((page) =>
        page.items.map((request) => request.id),
      ),
    ).toEqual(['request-1', 'request-2']);
    expect(queryResult?.hasNextPage).toBe(false);
  });

  it('loads awaiting-decision requests from every relationship as it scrolls', async () => {
    jest
      .mocked(paymentRequestsApi.getPaymentRequests)
      .mockResolvedValueOnce({
        items: [makeRequest('request-1', 'relationship-1', 'pending_approval')],
        nextCursor: 'request-1',
      })
      .mockResolvedValueOnce({
        items: [makeRequest('request-2', 'relationship-1', 'pending_approval')],
      })
      .mockResolvedValueOnce({
        items: [makeRequest('request-3', 'relationship-2', 'pending_approval')],
      });
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient = testQueryClient;
    let queryResults:
      | ReturnType<typeof useAwaitingDecisionPaymentRequestsInfiniteQuery>
      | undefined;

    function TestConsumer() {
      queryResults = useAwaitingDecisionPaymentRequestsInfiniteQuery(
        [
          { id: 'relationship-1', name: 'Shared space' },
          { id: 'relationship-2', name: 'Other space' },
        ],
        'member-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={testQueryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await flushPromises();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenNthCalledWith(
      1,
      'relationship-1',
      {
        awaitingMyDecision: true,
        cursor: undefined,
        limit: 20,
      },
    );
    expect(queryResults?.hasNextPage).toBe(true);

    await act(async () => {
      await queryResults?.fetchNextPage();
      await flushPromises();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      {
        awaitingMyDecision: true,
        cursor: 'request-1',
        limit: 20,
      },
    );
    expect(queryResults?.hasNextPage).toBe(true);

    await act(async () => {
      await queryResults?.fetchNextPage();
      await flushPromises();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenNthCalledWith(
      3,
      'relationship-2',
      {
        awaitingMyDecision: true,
        cursor: undefined,
        limit: 20,
      },
    );
    expect(queryResults?.data?.pages.flatMap((page) => page.items)).toEqual([
      {
        request: makeRequest('request-1', 'relationship-1', 'pending_approval'),
        relationshipName: 'Shared space',
      },
      {
        request: makeRequest('request-2', 'relationship-1', 'pending_approval'),
        relationshipName: 'Shared space',
      },
      {
        request: makeRequest('request-3', 'relationship-2', 'pending_approval'),
        relationshipName: 'Other space',
      },
    ]);
    expect(queryResults?.hasNextPage).toBe(false);
  });

  it('skips empty pages and continues with the next relationship', async () => {
    jest
      .mocked(paymentRequestsApi.getPaymentRequests)
      .mockResolvedValueOnce({ items: [], nextCursor: 'empty-page-1' })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        items: [makeRequest('request-3', 'relationship-2', 'pending_approval')],
      });

    const query = await mountHook(() =>
      useAwaitingDecisionPaymentRequestsInfiniteQuery(
        [
          { id: 'relationship-1', name: 'Shared space' },
          { id: 'relationship-2', name: 'Other space' },
        ],
        'user-1',
      ),
    );
    await settleQueries();

    expect(
      jest.mocked(paymentRequestsApi.getPaymentRequests).mock.calls,
    ).toEqual([
      [
        'relationship-1',
        {
          awaitingMyDecision: true,
          cursor: undefined,
          limit: 20,
        },
      ],
      [
        'relationship-1',
        {
          awaitingMyDecision: true,
          cursor: 'empty-page-1',
          limit: 20,
        },
      ],
      [
        'relationship-2',
        {
          awaitingMyDecision: true,
          cursor: undefined,
          limit: 20,
        },
      ],
    ]);
    expect(query.current?.data?.pages.flatMap((page) => page.items)).toEqual([
      {
        request: makeRequest('request-3', 'relationship-2', 'pending_approval'),
        relationshipName: 'Other space',
      },
    ]);
    expect(query.current?.hasNextPage).toBe(false);
  });

  it('returns an empty result when no relationship has awaiting requests', async () => {
    jest
      .mocked(paymentRequestsApi.getPaymentRequests)
      .mockResolvedValueOnce({ items: [] });

    const query = await mountHook(() =>
      useAwaitingDecisionPaymentRequestsInfiniteQuery(
        [{ id: 'relationship-1', name: 'Shared space' }],
        'user-1',
      ),
    );
    await settleQueries();

    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenCalledWith(
      'relationship-1',
      {
        awaitingMyDecision: true,
        cursor: undefined,
        limit: 20,
      },
    );
    expect(query.current?.data?.pages).toEqual([
      { items: [], nextPageParam: undefined },
    ]);
    expect(query.current?.hasNextPage).toBe(false);
  });

  it.each([
    {
      description: 'an empty page',
      repeatedPage: { items: [], nextCursor: 'request-1' },
    },
    {
      description: 'a page with items',
      repeatedPage: {
        items: [makeRequest('request-2', 'relationship-1', 'pending_approval')],
        nextCursor: 'request-1',
      },
    },
  ])('rejects a repeated cursor on $description', async ({ repeatedPage }) => {
    jest
      .mocked(paymentRequestsApi.getPaymentRequests)
      .mockResolvedValueOnce({
        items: [makeRequest('request-1', 'relationship-1', 'pending_approval')],
        nextCursor: 'request-1',
      })
      .mockResolvedValueOnce(repeatedPage);

    const query = await mountHook(() =>
      useAwaitingDecisionPaymentRequestsInfiniteQuery(
        [{ id: 'relationship-1', name: 'Shared space' }],
        'user-1',
      ),
    );
    await settleQueries();

    expect(query.current?.hasNextPage).toBe(true);
    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenCalledTimes(1);

    let fetchedResult:
      | {
          error: Error | null;
          isFetchNextPageError: boolean;
          status: string;
        }
      | undefined;
    await act(async () => {
      fetchedResult = await query.current?.fetchNextPage();
      await flushPromises();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenCalledTimes(2);
    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenLastCalledWith(
      'relationship-1',
      {
        awaitingMyDecision: true,
        cursor: 'request-1',
        limit: 20,
      },
    );
    expect(fetchedResult?.isFetchNextPageError).toBe(true);
    expect(fetchedResult?.error?.message).toBe(
      'Payment request pagination did not advance.',
    );
  });
});

describe('payment request queries', () => {
  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = null;
    }
    queryClient?.clear();
    queryClient = null;
  });

  it('loads pending join requests only for relationships the user owns', async () => {
    const pendingRequest = makeJoinRequest();
    const approvedRequest = {
      ...pendingRequest,
      id: 'join-request-2',
      status: 'approved' as const,
    };
    const ownedRelationship = {
      ...makeRelationship(),
      members: [makeMember()],
    };
    const memberRelationship = {
      ...makeRelationship('relationship-2', 'Other space'),
      members: [
        {
          ...makeMember(),
          id: 'member-record-2',
          relationshipId: 'relationship-2',
          role: 'member' as const,
        },
      ],
    };
    jest
      .mocked(paymentRequestsApi.getRelationshipJoinRequests)
      .mockResolvedValueOnce([pendingRequest, approvedRequest]);

    const query = await mountHook(() =>
      useAwaitingDecisionRelationshipJoinRequestsQuery(
        [ownedRelationship, memberRelationship],
        'user-1',
      ),
    );
    await settleQueries();

    expect(
      paymentRequestsApi.getRelationshipJoinRequests,
    ).toHaveBeenCalledTimes(1);
    expect(paymentRequestsApi.getRelationshipJoinRequests).toHaveBeenCalledWith(
      'relationship-1',
    );
    expect(query.current?.data).toEqual([
      {
        request: pendingRequest,
        relationshipName: 'Shared space',
      },
    ]);
    expect(query.current?.dataUpdatedAt).toBeGreaterThan(0);
  });

  it('loads the enabled relationship and payment-request queries', async () => {
    const relationship = makeRelationship();
    const searchResult = makeSearchResult();
    const joinRequest = makeJoinRequest();
    const invitationPreview = {
      id: 'invitation-1',
      relationshipId: 'relationship-1',
      relationshipName: 'Shared space',
      inviterUserId: 'user-1',
      status: 'pending' as const,
      expiresAt: '2025-02-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const rubric: RubricVersion = { id: 'rubric-1', version: 1, questions: [] };
    const paymentRequest = makePaymentRequest('request-1');
    const notifications = { items: [], unreadCount: 0 };
    const filters = { status: 'approved' as const };

    jest
      .mocked(paymentRequestsApi.getRelationships)
      .mockResolvedValue([relationship]);
    jest
      .mocked(paymentRequestsApi.searchRelationships)
      .mockResolvedValue([searchResult]);
    jest
      .mocked(paymentRequestsApi.getRelationshipMembers)
      .mockResolvedValue([makeMember()]);
    jest
      .mocked(paymentRequestsApi.getRelationshipJoinRequests)
      .mockResolvedValue([joinRequest]);
    jest
      .mocked(paymentRequestsApi.getRelationshipJoinRequest)
      .mockResolvedValue(joinRequest);
    jest
      .mocked(paymentRequestsApi.getInvitationPreview)
      .mockResolvedValue(invitationPreview);
    jest
      .mocked(paymentRequestsApi.getRelationshipRubric)
      .mockResolvedValue(rubric);
    jest
      .mocked(paymentRequestsApi.getPaymentRequests)
      .mockResolvedValue({ items: [makeRequest('request-1')] });
    jest
      .mocked(paymentRequestsApi.getPaymentRequest)
      .mockResolvedValue(paymentRequest);
    jest
      .mocked(paymentRequestsApi.getNotifications)
      .mockResolvedValue(notifications);

    let queries: Record<string, { data?: unknown }> = {};
    const harness = await mountHook(() => {
      queries = {
        relationships: useRelationshipsQuery(true),
        relationshipSearch: useRelationshipSearchQuery('  shared  '),
        relationshipMembers: useRelationshipMembersQuery('relationship-1'),
        relationshipJoinRequests:
          useRelationshipJoinRequestsQuery('relationship-1'),
        relationshipJoinRequest: useRelationshipJoinRequestQuery(
          'relationship-1',
          'join-request-1',
        ),
        invitationPreview: useInvitationPreviewQuery('invitation-token'),
        rubric: useRelationshipRubricQuery('relationship-1'),
        paymentRequests: usePaymentRequestsQuery('relationship-1', filters),
        paymentRequest: usePaymentRequestQuery('request-1'),
        notifications: useNotificationsQuery(true),
      };
      return queries;
    });
    await settleQueries();

    expect(paymentRequestsApi.getRelationships).toHaveBeenCalledTimes(1);
    expect(paymentRequestsApi.searchRelationships).toHaveBeenCalledWith(
      'shared',
    );
    expect(paymentRequestsApi.getRelationshipMembers).toHaveBeenCalledWith(
      'relationship-1',
    );
    expect(paymentRequestsApi.getRelationshipJoinRequests).toHaveBeenCalledWith(
      'relationship-1',
    );
    expect(paymentRequestsApi.getRelationshipJoinRequest).toHaveBeenCalledWith(
      'relationship-1',
      'join-request-1',
    );
    expect(paymentRequestsApi.getInvitationPreview).toHaveBeenCalledWith(
      'invitation-token',
    );
    expect(paymentRequestsApi.getRelationshipRubric).toHaveBeenCalledWith(
      'relationship-1',
    );
    expect(paymentRequestsApi.getPaymentRequests).toHaveBeenCalledWith(
      'relationship-1',
      filters,
    );
    expect(paymentRequestsApi.getPaymentRequest).toHaveBeenCalledWith(
      'request-1',
    );
    expect(paymentRequestsApi.getNotifications).toHaveBeenCalledTimes(1);
    expect(harness.current?.relationships.data).toEqual([relationship]);
    expect(harness.current?.relationshipSearch.data).toEqual([searchResult]);
    expect(harness.current?.paymentRequest.data).toEqual(paymentRequest);
  });

  it('refreshes cached pending request details to pick up an edit', async () => {
    jest.useFakeTimers();
    try {
      const staleRequest: PaymentRequest = {
        ...makePaymentRequest('request-1', 'pending_approval'),
        decisions: [
          {
            id: 'creator-decision',
            memberUserId: 'user-1',
            decision: 'approved',
            createdAt: '2025-01-02T00:00:00.000Z',
          },
        ],
      };
      const editedRequest: PaymentRequest = {
        ...staleRequest,
        decisions: [
          {
            id: 'editor-decision',
            memberUserId: 'user-2',
            decision: 'approved',
            createdAt: '2025-01-03T00:00:00.000Z',
          },
        ],
      };
      const testQueryClient = new QueryClient({
        defaultOptions: {
          queries: { gcTime: Infinity, retry: false, staleTime: 60_000 },
          mutations: { gcTime: Infinity },
        },
      });
      testQueryClient.setQueryData(
        paymentRequestQueryKeys.detail('request-1'),
        staleRequest,
      );
      jest
        .mocked(paymentRequestsApi.getPaymentRequest)
        .mockResolvedValue(editedRequest);

      const query = await mountHook(
        () => usePaymentRequestQuery('request-1'),
        testQueryClient,
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
        await flushPromises();
      });

      expect(paymentRequestsApi.getPaymentRequest).toHaveBeenCalledTimes(1);
      expect(query.current?.data).toEqual(editedRequest);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(15_000);
        await flushPromises();
      });

      expect(paymentRequestsApi.getPaymentRequest).toHaveBeenCalledTimes(2);
      expect(query.current?.data).toEqual(editedRequest);
    } finally {
      jest.useRealTimers();
    }
  });

  it('retains only unread optimistic notification reads', async () => {
    const notifications = {
      items: [
        {
          id: 'unread-notification',
          recipientUserId: 'user-1',
          eventId: 'event-1',
          title: 'Unread',
          body: 'This notification is unread.',
          deliveryStatus: 'delivered' as const,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'read-notification',
          recipientUserId: 'user-1',
          eventId: 'event-2',
          title: 'Read',
          body: 'This notification has been read.',
          deliveryStatus: 'delivered' as const,
          createdAt: '2025-01-02T00:00:00.000Z',
          readAt: '2025-01-03T00:00:00.000Z',
        },
      ],
      unreadCount: 1,
    };
    const testClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity, retry: false },
      },
    });
    testClient.setQueryData(paymentRequestQueryKeys.notifications, {
      ...notifications,
      optimisticReadIds: [
        'unread-notification',
        'read-notification',
        'missing-notification',
      ],
    });
    jest
      .mocked(paymentRequestsApi.getNotifications)
      .mockResolvedValue(notifications);

    const harness = await mountHook(
      () => useNotificationsQuery(true),
      testClient,
    );
    await settleQueries();

    expect(harness.current?.data).toEqual({
      ...notifications,
      optimisticReadIds: ['unread-notification'],
    });
  });

  it('does not fetch when required query inputs are missing or disabled', async () => {
    await mountHook(() => {
      useRelationshipsQuery(false);
      useRelationshipSearchQuery(' x ');
      useRelationshipMembersQuery(undefined);
      useRelationshipJoinRequestsQuery(undefined);
      useRelationshipJoinRequestQuery('relationship-1', undefined);
      useInvitationPreviewQuery(undefined);
      useRelationshipRubricQuery(undefined);
      usePaymentRequestsQuery(undefined);
      usePaymentRequestsQuery('relationship-1', {}, false);
      usePaymentRequestsInfiniteQuery(undefined);
      useAwaitingDecisionPaymentRequestsInfiniteQuery([], 'user-1');
      usePaymentRequestQuery(undefined);
      useNotificationsQuery(false);
      return null;
    });
    await settleQueries();

    expect(paymentRequestsApi.getRelationships).not.toHaveBeenCalled();
    expect(paymentRequestsApi.searchRelationships).not.toHaveBeenCalled();
    expect(paymentRequestsApi.getRelationshipMembers).not.toHaveBeenCalled();
    expect(
      paymentRequestsApi.getRelationshipJoinRequests,
    ).not.toHaveBeenCalled();
    expect(
      paymentRequestsApi.getRelationshipJoinRequest,
    ).not.toHaveBeenCalled();
    expect(paymentRequestsApi.getInvitationPreview).not.toHaveBeenCalled();
    expect(paymentRequestsApi.getRelationshipRubric).not.toHaveBeenCalled();
    expect(paymentRequestsApi.getPaymentRequests).not.toHaveBeenCalled();
    expect(paymentRequestsApi.getPaymentRequest).not.toHaveBeenCalled();
    expect(paymentRequestsApi.getNotifications).not.toHaveBeenCalled();
  });

  it('derives a calendar month from a fresh, complete request-list cache', async () => {
    const request = {
      ...makeRequest('request-october'),
      purchaseDate: '2026-10-15T12:00:00.000Z',
    };
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          refetchOnMount: false,
          retry: false,
          staleTime: 60_000,
        },
      },
    });
    queryClient.setQueryData(
      paymentRequestQueryKeys.allList('relationship-1'),
      {
        pages: [{ items: [request] }],
        pageParams: [undefined],
      } satisfies InfiniteData<PaymentRequestListResponse>,
    );
    let calendarQuery: ReturnType<typeof usePaymentRequestCalendarQuery>;

    await mountHook(() => {
      usePaymentRequestsInfiniteQuery('relationship-1');
      calendarQuery = usePaymentRequestCalendarQuery(
        'relationship-1',
        '2026-10',
      );
      return null;
    }, queryClient);
    await settleQueries();

    expect(calendarQuery!.data).toEqual({
      earliestDate: request.purchaseDate,
      latestDate: request.purchaseDate,
      entries: [request],
    });
    expect(
      paymentRequestsApi.getPaymentRequestCalendarMonth,
    ).not.toHaveBeenCalled();
    expect(paymentRequestsApi.getPaymentRequests).not.toHaveBeenCalled();
  });

  it('fetches a month when the request-list cache has more pages', async () => {
    const request = {
      ...makeRequest('request-october'),
      purchaseDate: '2026-10-15T12:00:00.000Z',
    };
    const fallbackData = {
      earliestDate: '2026-09-30T12:00:00.000Z',
      latestDate: '2026-11-02T12:00:00.000Z',
      entries: [request],
    };
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
          refetchOnMount: false,
          retry: false,
          staleTime: 60_000,
        },
      },
    });
    queryClient.setQueryData(
      paymentRequestQueryKeys.allList('relationship-1'),
      {
        pages: [{ items: [request], nextCursor: 'next-page' }],
        pageParams: [undefined],
      } satisfies InfiniteData<PaymentRequestListResponse>,
    );
    jest
      .mocked(paymentRequestsApi.getPaymentRequestCalendarMonth)
      .mockResolvedValue(fallbackData);
    let calendarQuery: ReturnType<typeof usePaymentRequestCalendarQuery>;

    await mountHook(() => {
      usePaymentRequestsInfiniteQuery('relationship-1');
      calendarQuery = usePaymentRequestCalendarQuery(
        'relationship-1',
        '2026-10',
      );
      return null;
    }, queryClient);
    await settleQueries();

    expect(
      paymentRequestsApi.getPaymentRequestCalendarMonth,
    ).toHaveBeenCalledWith('relationship-1', '2026-10');
    expect(calendarQuery!.data).toEqual(fallbackData);
    expect(paymentRequestsApi.getPaymentRequests).not.toHaveBeenCalled();
  });
});

type PaymentRequestMutationHooks = {
  acceptInvitation: ReturnType<typeof useAcceptInvitationMutation>;
  cancelPaymentRequest: ReturnType<typeof useCancelPaymentRequestMutation>;
  createPaymentRequest: ReturnType<typeof useCreatePaymentRequestMutation>;
  createRelationship: ReturnType<typeof useCreateRelationshipMutation>;
  createRelationshipInvitation: ReturnType<
    typeof useCreateRelationshipInvitationMutation
  >;
  deletePaymentRequest?: ReturnType<typeof useDeletePaymentRequestMutation>;
  deleteRelationshipJoinRequest?: ReturnType<
    typeof useDeleteRelationshipJoinRequestMutation
  >;
  deleteRelationship?: ReturnType<typeof useDeleteRelationshipMutation>;
  decidePaymentRequest: ReturnType<typeof useDecidePaymentRequestMutation>;
  decideRelationshipJoinRequest: ReturnType<
    typeof useDecideRelationshipJoinRequestMutation
  >;
  completeNotification: ReturnType<typeof useCompleteNotificationMutation>;
  markNotificationRead: ReturnType<typeof useMarkNotificationReadMutation>;
  requestToJoinRelationship: ReturnType<
    typeof useRequestToJoinRelationshipMutation
  >;
  submitPaymentRequest: ReturnType<typeof useSubmitPaymentRequestMutation>;
  updatePaymentRequest: ReturnType<typeof useUpdatePaymentRequestMutation>;
};

describe('payment request mutations', () => {
  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = null;
    }
    queryClient?.clear();
    queryClient = null;
  });

  it('updates cached relationship search results and invalidates related data', async () => {
    const relationship = makeRelationship();
    const joinRequest = makeJoinRequest();
    const member = makeMember();
    const invitation = {
      id: 'invitation-1',
      relationshipId: relationship.id,
      relationshipName: relationship.name,
      inviterUserId: 'user-1',
      status: 'pending' as const,
      expiresAt: '2025-02-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    const createdRequest = makePaymentRequest('created-request');
    const submittedRequest = makePaymentRequest(
      'submitted-request',
      'pending_approval',
    );
    const updatedRequest = makePaymentRequest(
      'updated-request',
      'pending_approval',
    );
    const decidedRequest = makePaymentRequest('decided-request', 'approved');
    const cancelledRequest = makePaymentRequest(
      'cancelled-request',
      'cancelled',
    );

    jest
      .mocked(paymentRequestsApi.createRelationship)
      .mockResolvedValue(relationship);
    jest
      .mocked(paymentRequestsApi.requestToJoinRelationship)
      .mockResolvedValue(joinRequest);
    jest
      .mocked(paymentRequestsApi.decideRelationshipJoinRequest)
      .mockResolvedValue(joinRequest);
    jest
      .mocked(paymentRequestsApi.createRelationshipInvitation)
      .mockResolvedValue({
        ...invitation,
        token: 'invitation-token',
      });
    jest.mocked(paymentRequestsApi.acceptInvitation).mockResolvedValue({
      invitation,
      relationship,
      member,
    });
    jest
      .mocked(paymentRequestsApi.createPaymentRequest)
      .mockResolvedValue(createdRequest);
    jest
      .mocked(paymentRequestsApi.submitPaymentRequest)
      .mockResolvedValue(submittedRequest);
    jest
      .mocked(paymentRequestsApi.updatePaymentRequest)
      .mockResolvedValue(updatedRequest);
    jest
      .mocked(paymentRequestsApi.decidePaymentRequest)
      .mockResolvedValue(decidedRequest);
    jest
      .mocked(paymentRequestsApi.cancelPaymentRequest)
      .mockResolvedValue(cancelledRequest);
    jest
      .mocked(paymentRequestsApi.completeNotification)
      .mockResolvedValue(undefined);
    jest
      .mocked(paymentRequestsApi.markNotificationRead)
      .mockResolvedValue(undefined);

    let mutations: PaymentRequestMutationHooks | undefined;
    const harness = await mountHook(() => {
      mutations = {
        acceptInvitation: useAcceptInvitationMutation(),
        cancelPaymentRequest: useCancelPaymentRequestMutation('relationship-1'),
        createPaymentRequest: useCreatePaymentRequestMutation('relationship-1'),
        createRelationship: useCreateRelationshipMutation(),
        createRelationshipInvitation:
          useCreateRelationshipInvitationMutation('relationship-1'),
        decidePaymentRequest: useDecidePaymentRequestMutation('relationship-1'),
        decideRelationshipJoinRequest:
          useDecideRelationshipJoinRequestMutation('relationship-1'),
        completeNotification: useCompleteNotificationMutation(),
        markNotificationRead: useMarkNotificationReadMutation(),
        requestToJoinRelationship: useRequestToJoinRelationshipMutation(),
        submitPaymentRequest: useSubmitPaymentRequestMutation('relationship-1'),
        updatePaymentRequest: useUpdatePaymentRequestMutation('relationship-1'),
      };
      return mutations;
    });
    const cachedSearchResults = [
      makeSearchResult('relationship-1'),
      makeSearchResult('relationship-2'),
    ];
    harness.client.setQueryData(
      paymentRequestQueryKeys.relationshipSearch('shared'),
      cachedSearchResults,
    );
    const invalidateQueries = jest.spyOn(harness.client, 'invalidateQueries');
    const currentMutations = mutations;
    if (!currentMutations) throw new Error('Mutation hooks did not mount.');

    const paymentInput = {
      title: 'Shared purchase',
      rationale: 'Needed for the household',
      amountMinorUnits: 1200,
      currency: 'USD',
      purchaseDate: '2025-01-01T00:00:00.000Z',
      requestedSplit: [{ memberUserId: 'user-1', percentage: 100 }],
    };

    await act(async () => {
      await currentMutations.createRelationship.mutateAsync({
        name: 'Shared space',
      });
      await currentMutations.requestToJoinRelationship.mutateAsync({
        relationshipId: 'relationship-1',
        displayName: 'Alex',
      });
      await currentMutations.decideRelationshipJoinRequest.mutateAsync({
        requestId: 'join-request-1',
        input: { decision: 'approved' },
      });
      await currentMutations.createRelationshipInvitation.mutateAsync({
        inviteeEmail: 'alex@example.com',
      });
      await currentMutations.acceptInvitation.mutateAsync({
        token: 'invitation-token',
        displayName: 'Alex',
      });
      await currentMutations.createPaymentRequest.mutateAsync(paymentInput);
      await currentMutations.updatePaymentRequest.mutateAsync({
        paymentRequestId: 'updated-request',
        input: {
          ...paymentInput,
          title: 'Updated shared purchase',
        },
      });
      await currentMutations.submitPaymentRequest.mutateAsync({
        paymentRequestId: 'submitted-request',
        input: { evaluation: { answers: {} } },
      });
      await currentMutations.decidePaymentRequest.mutateAsync({
        paymentRequestId: 'decided-request',
        input: { decision: 'approved' },
      });
      await currentMutations.cancelPaymentRequest.mutateAsync(
        'cancelled-request',
      );
      await currentMutations.completeNotification.mutateAsync('notification-2');
      await currentMutations.markNotificationRead.mutateAsync('notification-1');
    });

    expect(paymentRequestsApi.createRelationship).toHaveBeenCalledWith({
      name: 'Shared space',
    });
    expect(paymentRequestsApi.requestToJoinRelationship).toHaveBeenCalledWith(
      'relationship-1',
      'Alex',
    );
    expect(
      paymentRequestsApi.decideRelationshipJoinRequest,
    ).toHaveBeenCalledWith('relationship-1', 'join-request-1', {
      decision: 'approved',
    });
    expect(
      paymentRequestsApi.createRelationshipInvitation,
    ).toHaveBeenCalledWith('relationship-1', {
      inviteeEmail: 'alex@example.com',
    });
    expect(paymentRequestsApi.acceptInvitation).toHaveBeenCalledWith(
      'invitation-token',
      'Alex',
    );
    expect(paymentRequestsApi.createPaymentRequest).toHaveBeenCalledWith(
      'relationship-1',
      paymentInput,
    );
    expect(paymentRequestsApi.updatePaymentRequest).toHaveBeenCalledWith(
      'updated-request',
      {
        ...paymentInput,
        title: 'Updated shared purchase',
      },
    );
    expect(paymentRequestsApi.submitPaymentRequest).toHaveBeenCalledWith(
      'submitted-request',
      { evaluation: { answers: {} } },
    );
    expect(paymentRequestsApi.decidePaymentRequest).toHaveBeenCalledWith(
      'decided-request',
      { decision: 'approved' },
    );
    expect(paymentRequestsApi.cancelPaymentRequest).toHaveBeenCalledWith(
      'cancelled-request',
    );
    expect(paymentRequestsApi.completeNotification).toHaveBeenCalledWith(
      'notification-2',
    );
    expect(paymentRequestsApi.markNotificationRead).toHaveBeenCalledWith(
      'notification-1',
    );

    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.relationshipSearch('shared'),
      ),
    ).toEqual([
      { ...cachedSearchResults[0], membershipStatus: 'pending' },
      cachedSearchResults[1],
    ]);
    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.detail('updated-request'),
      ),
    ).toEqual(updatedRequest);
    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.detail('submitted-request'),
      ),
    ).toEqual(submittedRequest);
    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.detail('decided-request'),
      ),
    ).toEqual(decidedRequest);
    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.detail('cancelled-request'),
      ),
    ).toEqual(cancelledRequest);

    const invalidatedKeys = invalidateQueries.mock.calls.map(
      ([filters]) => filters?.queryKey,
    );
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        paymentRequestQueryKeys.relationships,
        ['payment-requests', 'relationship-search'],
        paymentRequestQueryKeys.joinRequests('relationship-1'),
        paymentRequestQueryKeys.joinRequestDetail(
          'relationship-1',
          'join-request-1',
        ),
        paymentRequestQueryKeys.members('relationship-1'),
        ['payment-requests', 'list', 'relationship-1'],
        paymentRequestQueryKeys.calendarPrefix('relationship-1'),
        jointAccountChargeQueryKeys.listPrefix('relationship-1'),
        jointAccountChargeQueryKeys.calendarPrefix('relationship-1'),
        paymentRequestQueryKeys.notifications,
        paymentRequestQueryKeys.awaitingDecisionPrefix,
      ]),
    );
  });

  it('invalidates joint-account charges when submission auto-approves a request', async () => {
    const approvedRequest = makePaymentRequest(
      'single-member-request',
      'approved',
    );
    jest
      .mocked(paymentRequestsApi.submitPaymentRequest)
      .mockResolvedValue(approvedRequest);

    let submitMutation:
      | ReturnType<typeof useSubmitPaymentRequestMutation>
      | undefined;
    const harness = await mountHook(() => {
      submitMutation = useSubmitPaymentRequestMutation('relationship-1');
      return submitMutation;
    });
    const invalidateQueries = jest.spyOn(harness.client, 'invalidateQueries');

    if (!submitMutation) throw new Error('Mutation hook did not mount.');
    await act(async () => {
      await submitMutation?.mutateAsync({
        paymentRequestId: approvedRequest.id,
        input: { evaluation: { answers: {} } },
      });
    });

    const invalidatedKeys = invalidateQueries.mock.calls.map(
      ([filters]) => filters?.queryKey,
    );
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        jointAccountChargeQueryKeys.listPrefix('relationship-1'),
        jointAccountChargeQueryKeys.calendarPrefix('relationship-1'),
      ]),
    );
  });

  it('optimistically updates and rolls back cached relationship search results', async () => {
    let rejectJoinRequest!: (error: Error) => void;
    jest
      .mocked(paymentRequestsApi.requestToJoinRelationship)
      .mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectJoinRequest = reject;
          }),
      );

    const firstSearchResults = [
      makeSearchResult('relationship-1'),
      makeSearchResult('relationship-2'),
    ];
    const secondSearchResults = [makeSearchResult('relationship-1')];
    let mutation:
      | ReturnType<typeof useRequestToJoinRelationshipMutation>
      | undefined;
    const harness = await mountHook(() => {
      mutation = useRequestToJoinRelationshipMutation();
      return mutation;
    });
    const firstSearchKey = paymentRequestQueryKeys.relationshipSearch('shared');
    const secondSearchKey =
      paymentRequestQueryKeys.relationshipSearch('share-code');
    harness.client.setQueryData(firstSearchKey, firstSearchResults);
    harness.client.setQueryData(secondSearchKey, secondSearchResults);
    const currentMutation = mutation;
    if (!currentMutation)
      throw new Error('Join-request mutation did not mount.');

    let requestCompletion!: Promise<void>;
    await act(async () => {
      requestCompletion = currentMutation
        .mutateAsync({ relationshipId: 'relationship-1', displayName: 'Alex' })
        .then(
          () => undefined,
          () => undefined,
        );
      await flushPromises();
    });

    expect(harness.client.getQueryData(firstSearchKey)).toEqual([
      { ...firstSearchResults[0], membershipStatus: 'pending' },
      firstSearchResults[1],
    ]);
    expect(harness.client.getQueryData(secondSearchKey)).toEqual([
      { ...secondSearchResults[0], membershipStatus: 'pending' },
    ]);

    rejectJoinRequest(new Error('offline'));
    await act(async () => {
      await requestCompletion;
    });

    expect(harness.client.getQueryData(firstSearchKey)).toEqual(
      firstSearchResults,
    );
    expect(harness.client.getQueryData(secondSearchKey)).toEqual(
      secondSearchResults,
    );
  });

  it('keeps notification reads optimistic without inventing timestamps and rolls back failures', async () => {
    let rejectMarkRead!: (error: Error) => void;
    jest.mocked(paymentRequestsApi.markNotificationRead).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectMarkRead = reject;
        }),
    );

    const notifications = {
      items: [
        {
          id: 'notification-1',
          recipientUserId: 'user-1',
          eventId: 'event-1',
          title: 'Update',
          body: 'A new update is available.',
          deliveryStatus: 'delivered' as const,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      unreadCount: 1,
    };
    let mutation:
      | ReturnType<typeof useMarkNotificationReadMutation>
      | undefined;
    const harness = await mountHook(() => {
      mutation = useMarkNotificationReadMutation();
      return mutation;
    });
    harness.client.setQueryData(
      paymentRequestQueryKeys.notifications,
      notifications,
    );
    const currentMutation = mutation;
    if (!currentMutation)
      throw new Error('Notification mutation did not mount.');

    let requestCompletion!: Promise<void>;
    await act(async () => {
      requestCompletion = currentMutation.mutateAsync('notification-1').then(
        () => undefined,
        () => undefined,
      );
      await flushPromises();
    });

    expect(
      harness.client.getQueryData(paymentRequestQueryKeys.notifications),
    ).toEqual({
      ...notifications,
      optimisticReadIds: ['notification-1'],
    });
    expect('readAt' in notifications.items[0]).toBe(false);

    rejectMarkRead(new Error('offline'));
    await act(async () => {
      await requestCompletion;
    });

    expect(
      harness.client.getQueryData(paymentRequestQueryKeys.notifications),
    ).toEqual(notifications);
  });

  it('removes deleted relationship and request caches', async () => {
    jest
      .mocked(paymentRequestsApi.deleteRelationship)
      .mockResolvedValue(undefined);
    jest
      .mocked(paymentRequestsApi.deleteRelationshipJoinRequest)
      .mockResolvedValue(undefined);
    jest
      .mocked(paymentRequestsApi.deletePaymentRequest)
      .mockResolvedValue(undefined);

    const harness = await mountHook(() => ({
      deleteRelationship: useDeleteRelationshipMutation(),
      deleteJoinRequest:
        useDeleteRelationshipJoinRequestMutation('relationship-1'),
      deletePaymentRequest: useDeletePaymentRequestMutation('relationship-1'),
      deletePaymentRequestWithoutRelationship:
        useDeletePaymentRequestMutation(undefined),
    }));
    const mutations = harness.current;
    if (!mutations) throw new Error('Deletion hooks did not mount.');
    const invalidateQueries = jest.spyOn(harness.client, 'invalidateQueries');
    harness.client.setQueryData(
      paymentRequestQueryKeys.joinRequestDetail(
        'relationship-1',
        'join-request-1',
      ),
      makeJoinRequest(),
    );
    harness.client.setQueryData(
      paymentRequestQueryKeys.detail('request-1'),
      makePaymentRequest('request-1'),
    );

    await act(async () => {
      await mutations.deleteRelationship.mutateAsync('relationship-1');
      await mutations.deleteJoinRequest.mutateAsync('join-request-1');
      await mutations.deletePaymentRequest.mutateAsync('request-1');
      await mutations.deletePaymentRequestWithoutRelationship.mutateAsync(
        'request-without-relationship',
      );
    });

    expect(paymentRequestsApi.deleteRelationship).toHaveBeenCalledWith(
      'relationship-1',
    );
    expect(
      paymentRequestsApi.deleteRelationshipJoinRequest,
    ).toHaveBeenCalledWith('relationship-1', 'join-request-1');
    expect(paymentRequestsApi.deletePaymentRequest).toHaveBeenCalledTimes(2);
    expect(
      harness.client.getQueryState(
        paymentRequestQueryKeys.joinRequestDetail(
          'relationship-1',
          'join-request-1',
        ),
      ),
    ).toBeUndefined();
    expect(
      harness.client.getQueryState(paymentRequestQueryKeys.detail('request-1')),
    ).toBeUndefined();
    expect(
      invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey),
    ).toContain(paymentRequestQueryKeys.relationships);
    expect(
      invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey),
    ).toContain(paymentRequestQueryKeys.notifications);
    expect(
      invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey),
    ).toContain(paymentRequestQueryKeys.awaitingDecisionPrefix);
  });

  it('skips relationship-specific invalidation when no relationship is selected', async () => {
    const joinRequest = makeJoinRequest();
    const submittedRequest = makePaymentRequest(
      'submitted-request',
      'pending_approval',
    );
    const decidedRequest = makePaymentRequest('decided-request', 'approved');
    const cancelledRequest = makePaymentRequest(
      'cancelled-request',
      'cancelled',
    );
    jest
      .mocked(paymentRequestsApi.decideRelationshipJoinRequest)
      .mockResolvedValue(joinRequest);
    jest
      .mocked(paymentRequestsApi.submitPaymentRequest)
      .mockResolvedValue(submittedRequest);
    jest
      .mocked(paymentRequestsApi.decidePaymentRequest)
      .mockResolvedValue(decidedRequest);
    jest
      .mocked(paymentRequestsApi.cancelPaymentRequest)
      .mockResolvedValue(cancelledRequest);

    let mutations:
      | Pick<
          PaymentRequestMutationHooks,
          | 'decideRelationshipJoinRequest'
          | 'submitPaymentRequest'
          | 'decidePaymentRequest'
          | 'cancelPaymentRequest'
        >
      | undefined;
    const harness = await mountHook(() => {
      mutations = {
        decideRelationshipJoinRequest:
          useDecideRelationshipJoinRequestMutation(undefined),
        submitPaymentRequest: useSubmitPaymentRequestMutation(undefined),
        decidePaymentRequest: useDecidePaymentRequestMutation(undefined),
        cancelPaymentRequest: useCancelPaymentRequestMutation(undefined),
      };
      return mutations;
    });
    const invalidateQueries = jest.spyOn(harness.client, 'invalidateQueries');
    const currentMutations = mutations;
    if (!currentMutations) throw new Error('Mutation hooks did not mount.');

    await act(async () => {
      await currentMutations.decideRelationshipJoinRequest.mutateAsync({
        requestId: 'join-request-1',
        input: { decision: 'approved' },
      });
      await currentMutations.submitPaymentRequest.mutateAsync({
        paymentRequestId: 'submitted-request',
        input: { evaluation: { answers: {} } },
      });
      await currentMutations.decidePaymentRequest.mutateAsync({
        paymentRequestId: 'decided-request',
        input: { decision: 'approved' },
      });
      await currentMutations.cancelPaymentRequest.mutateAsync(
        'cancelled-request',
      );
    });

    expect(
      invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey),
    ).toEqual([
      paymentRequestQueryKeys.awaitingJoinRequestsPrefix,
      paymentRequestQueryKeys.notifications,
      paymentRequestQueryKeys.awaitingDecisionPrefix,
      paymentRequestQueryKeys.notifications,
      paymentRequestQueryKeys.awaitingDecisionPrefix,
      paymentRequestQueryKeys.notifications,
      paymentRequestQueryKeys.awaitingDecisionPrefix,
    ]);
    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.detail('submitted-request'),
      ),
    ).toEqual(submittedRequest);
    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.detail('decided-request'),
      ),
    ).toEqual(decidedRequest);
    expect(
      harness.client.getQueryData(
        paymentRequestQueryKeys.detail('cancelled-request'),
      ),
    ).toEqual(cancelledRequest);
  });
});
