import type {
  PaymentRequestSummary,
  RelationshipJoinRequest,
  RelationshipRule,
  RelationshipSummary,
  RelationshipTask,
} from '@expo-50sdk-template/shared-types';
import { useMemo } from 'react';

import {
  type AwaitingDecisionPaymentRequest,
  useAwaitingDecisionPaymentRequestsInfiniteQuery,
  useAwaitingDecisionRelationshipJoinRequestsQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import {
  type AwaitingDecisionRelationshipRule,
  useAwaitingDecisionRelationshipRulesInfiniteQuery,
} from '@/features/relationship-rules/hooks/useRelationshipRules';
import {
  type AwaitingDecisionRelationshipTask,
  useAwaitingDecisionRelationshipTasksInfiniteQuery,
} from '@/features/time/hooks/useTime';

export type AwaitingDecisionItemKind =
  | 'paymentRequest'
  | 'relationshipRule'
  | 'joinRequest'
  | 'task';

export type AwaitingDecisionItem =
  | {
      kind: 'paymentRequest';
      navigationId: string;
      relationshipName: string;
      request: PaymentRequestSummary;
    }
  | {
      kind: 'relationshipRule';
      navigationId: string;
      relationshipName: string;
      rule: RelationshipRule;
    }
  | {
      kind: 'joinRequest';
      navigationId: string;
      relationshipName: string;
      request: RelationshipJoinRequest;
    }
  | {
      kind: 'task';
      navigationId: string;
      relationshipName: string;
      task: RelationshipTask;
    };

export function getAwaitingDecisionNavigationId(
  kind: AwaitingDecisionItemKind,
  relationshipId: string,
  itemId: string,
) {
  return JSON.stringify([kind, relationshipId, itemId]);
}

function mapPaymentRequest(
  item: AwaitingDecisionPaymentRequest,
): AwaitingDecisionItem {
  return {
    kind: 'paymentRequest',
    navigationId: getAwaitingDecisionNavigationId(
      'paymentRequest',
      item.request.relationshipId,
      item.request.id,
    ),
    relationshipName: item.relationshipName,
    request: item.request,
  };
}

function mapRelationshipRule(
  item: AwaitingDecisionRelationshipRule,
): AwaitingDecisionItem {
  return {
    kind: 'relationshipRule',
    navigationId: getAwaitingDecisionNavigationId(
      'relationshipRule',
      item.rule.relationshipId,
      item.rule.id,
    ),
    relationshipName: item.relationshipName,
    rule: item.rule,
  };
}

function mapJoinRequest(item: {
  relationshipName: string;
  request: RelationshipJoinRequest;
}): AwaitingDecisionItem {
  return {
    kind: 'joinRequest',
    navigationId: getAwaitingDecisionNavigationId(
      'joinRequest',
      item.request.relationshipId,
      item.request.id,
    ),
    relationshipName: item.relationshipName,
    request: item.request,
  };
}

function mapRelationshipTask(
  item: AwaitingDecisionRelationshipTask,
): AwaitingDecisionItem {
  return {
    kind: 'task',
    navigationId: getAwaitingDecisionNavigationId(
      'task',
      item.task.relationshipId,
      item.task.id,
    ),
    relationshipName: item.relationshipName,
    task: item.task,
  };
}

export function useAwaitingDecisionItemsQuery(
  relationships: RelationshipSummary[],
  userId: string | undefined,
) {
  const paymentRequestsQuery = useAwaitingDecisionPaymentRequestsInfiniteQuery(
    relationships,
    userId,
  );
  const relationshipRulesQuery =
    useAwaitingDecisionRelationshipRulesInfiniteQuery(relationships, userId);
  const joinRequestsQuery = useAwaitingDecisionRelationshipJoinRequestsQuery(
    relationships,
    userId,
  );
  const tasksQuery = useAwaitingDecisionRelationshipTasksInfiniteQuery(
    relationships,
    userId,
  );

  const paymentRequests =
    paymentRequestsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const relationshipRules =
    relationshipRulesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const joinRequests = joinRequestsQuery.data ?? [];
  const tasks = tasksQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const items = useMemo(
    () => [
      ...paymentRequests.map(mapPaymentRequest),
      ...relationshipRules.map(mapRelationshipRule),
      ...joinRequests.map(mapJoinRequest),
      ...tasks.map(mapRelationshipTask),
    ],
    [joinRequests, paymentRequests, relationshipRules, tasks],
  );

  const fetchNextPage = () => {
    const pendingFetches: Promise<unknown>[] = [];
    if (
      paymentRequestsQuery.hasNextPage &&
      !paymentRequestsQuery.isFetchingNextPage
    ) {
      pendingFetches.push(paymentRequestsQuery.fetchNextPage());
    }
    if (
      relationshipRulesQuery.hasNextPage &&
      !relationshipRulesQuery.isFetchingNextPage
    ) {
      pendingFetches.push(relationshipRulesQuery.fetchNextPage());
    }
    if (tasksQuery.hasNextPage && !tasksQuery.isFetchingNextPage) {
      pendingFetches.push(tasksQuery.fetchNextPage());
    }
    return Promise.all(pendingFetches);
  };

  const refetch = () =>
    Promise.all([
      paymentRequestsQuery.refetch(),
      relationshipRulesQuery.refetch(),
      joinRequestsQuery.refetch(),
      tasksQuery.refetch(),
    ]);

  const pageKey = [
    paymentRequestsQuery.data?.pages.length ?? 0,
    relationshipRulesQuery.data?.pages.length ?? 0,
    tasksQuery.data?.pages.length ?? 0,
  ].join(':');

  return {
    data: items,
    error:
      paymentRequestsQuery.error ??
      relationshipRulesQuery.error ??
      joinRequestsQuery.error ??
      tasksQuery.error,
    fetchNextPage,
    hasNextPage: Boolean(
      paymentRequestsQuery.hasNextPage ||
        relationshipRulesQuery.hasNextPage ||
        tasksQuery.hasNextPage,
    ),
    isError:
      paymentRequestsQuery.isError ||
      relationshipRulesQuery.isError ||
      joinRequestsQuery.isError ||
      tasksQuery.isError,
    isFetchNextPageError:
      paymentRequestsQuery.isFetchNextPageError ||
      relationshipRulesQuery.isFetchNextPageError ||
      tasksQuery.isFetchNextPageError,
    isFetching:
      paymentRequestsQuery.isFetching ||
      relationshipRulesQuery.isFetching ||
      joinRequestsQuery.isFetching ||
      tasksQuery.isFetching,
    isFetchingNextPage:
      paymentRequestsQuery.isFetchingNextPage ||
      relationshipRulesQuery.isFetchingNextPage ||
      tasksQuery.isFetchingNextPage,
    isLoading:
      paymentRequestsQuery.isLoading ||
      relationshipRulesQuery.isLoading ||
      joinRequestsQuery.isLoading ||
      tasksQuery.isLoading,
    isRefetching:
      paymentRequestsQuery.isRefetching ||
      relationshipRulesQuery.isRefetching ||
      joinRequestsQuery.isRefetching ||
      tasksQuery.isRefetching,
    pageKey,
    refetch,
  };
}
