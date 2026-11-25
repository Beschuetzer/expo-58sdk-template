import type {
  PaymentRequestSummary,
  RelationshipJoinRequest,
  RelationshipRule,
  RelationshipSummary,
  RelationshipTask,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { useAwaitingDecisionItemsQuery } from './useAwaitingDecisionItems';

const mockPaymentQuery = {
  data: {
    pages: [
      {
        items: [
          {
            request: {
              id: 'payment-1',
              relationshipId: 'relationship-1',
              createdByUserId: 'user-2',
              title: 'Groceries',
              amountMinorUnits: 1200,
              currency: 'USD',
              purchaseDate: '2026-10-15',
              categories: [],
              status: 'pending_approval',
              createdAt: '2026-10-15T12:00:00.000Z',
              updatedAt: '2026-10-15T12:00:00.000Z',
            } satisfies PaymentRequestSummary,
            relationshipName: 'Shared space',
          },
        ],
      },
    ],
  },
  error: null as Error | null,
  fetchNextPage: jest.fn(),
  hasNextPage: true,
  isError: false,
  isFetchNextPageError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};

const mockRuleQuery = {
  data: {
    pages: [
      {
        items: [
          {
            rule: {
              id: 'rule-1',
              relationshipId: 'relationship-1',
              createdByUserId: 'user-2',
              name: 'Quiet hours',
              labels: [],
              description: 'Keep evenings quiet.',
              status: 'pending_approval',
              remindMeToReview: null,
              createdAt: '2026-10-16T12:00:00.000Z',
              updatedAt: '2026-10-16T12:00:00.000Z',
              approvals: [{ memberUserId: 'user-1' }],
            } satisfies RelationshipRule,
            relationshipName: 'Shared space',
          },
        ],
      },
    ],
  },
  error: null as Error | null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isError: false,
  isFetchNextPageError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};

const mockJoinRequestQuery = {
  data: [
    {
      request: {
        id: 'join-1',
        relationshipId: 'relationship-1',
        requesterUserId: 'user-3',
        requesterDisplayName: 'Taylor',
        status: 'pending',
        createdAt: '2026-10-17T12:00:00.000Z',
      } satisfies RelationshipJoinRequest,
      relationshipName: 'Shared space',
    },
  ],
  error: null as Error | null,
  isError: false,
  isFetching: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};

const mockTaskQuery = {
  data: {
    pages: [
      {
        items: [
          {
            task: {
              id: 'task-1',
              relationshipId: 'relationship-1',
              createdByUserId: 'user-2',
              name: 'Water the plants',
              visibleToUserIds: [],
              completableByUserIds: ['user-1'],
              createdAt: '2026-10-18T12:00:00.000Z',
              updatedAt: '2026-10-18T12:00:00.000Z',
            } satisfies RelationshipTask,
            relationshipName: 'Shared space',
          },
        ],
      },
    ],
  },
  error: null as Error | null,
  fetchNextPage: jest.fn(),
  hasNextPage: true,
  isError: false,
  isFetchNextPageError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isLoading: false,
  isRefetching: false,
  refetch: jest.fn(),
};

jest.mock('@/features/payment-requests/hooks/usePaymentRequests', () => ({
  useAwaitingDecisionPaymentRequestsInfiniteQuery: () => mockPaymentQuery,
  useAwaitingDecisionRelationshipJoinRequestsQuery: () => mockJoinRequestQuery,
}));

jest.mock('@/features/relationship-rules/hooks/useRelationshipRules', () => ({
  useAwaitingDecisionRelationshipRulesInfiniteQuery: () => mockRuleQuery,
}));

jest.mock('@/features/time/hooks/useTime', () => ({
  useAwaitingDecisionRelationshipTasksInfiniteQuery: () => mockTaskQuery,
}));

describe('useAwaitingDecisionItemsQuery', () => {
  let mountedRenderer: ReactTestRenderer | undefined;

  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = undefined;
    }
    jest.clearAllMocks();
  });

  it('combines all decision item types and coordinates pagination and refresh', async () => {
    let query: ReturnType<typeof useAwaitingDecisionItemsQuery> | undefined;
    function TestConsumer() {
      query = useAwaitingDecisionItemsQuery(
        [] as RelationshipSummary[],
        'user-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(<TestConsumer />);
    });

    expect(query?.data?.map((item) => item.kind)).toEqual([
      'paymentRequest',
      'relationshipRule',
      'joinRequest',
      'task',
    ]);
    expect(query?.data?.map((item) => item.navigationId)).toEqual([
      JSON.stringify(['paymentRequest', 'relationship-1', 'payment-1']),
      JSON.stringify(['relationshipRule', 'relationship-1', 'rule-1']),
      JSON.stringify(['joinRequest', 'relationship-1', 'join-1']),
      JSON.stringify(['task', 'relationship-1', 'task-1']),
    ]);
    expect(query?.hasNextPage).toBe(true);

    await act(async () => {
      await query?.fetchNextPage();
      await query?.refetch();
    });

    expect(mockPaymentQuery.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockRuleQuery.fetchNextPage).not.toHaveBeenCalled();
    expect(mockTaskQuery.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(mockPaymentQuery.refetch).toHaveBeenCalledTimes(1);
    expect(mockRuleQuery.refetch).toHaveBeenCalledTimes(1);
    expect(mockJoinRequestQuery.refetch).toHaveBeenCalledTimes(1);
    expect(mockTaskQuery.refetch).toHaveBeenCalledTimes(1);
  });
});
