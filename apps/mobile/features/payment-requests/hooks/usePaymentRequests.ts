import type {
  CreateInvitationInput,
  CreatePaymentRequestInput,
  CreateRelationshipInput,
  DecideRelationshipJoinRequestInput,
  DecidePaymentRequestInput,
  NotificationListResponse,
  PaymentRequestListFilters,
  PaymentRequestListResponse,
  PaymentRequestSummary,
  RelationshipJoinRequest,
  RelationshipSearchResult,
  RelationshipSummary,
  SubmitPaymentRequestInput,
  UpdatePaymentRequestInput,
} from '@expo-50sdk-template/shared-types';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import {
  acceptInvitation,
  cancelPaymentRequest,
  completeNotification,
  createPaymentRequest,
  createRelationship,
  createRelationshipInvitation,
  deletePaymentRequest,
  deleteRelationship,
  deleteRelationshipJoinRequest,
  decideRelationshipJoinRequest,
  decidePaymentRequest,
  getNotifications,
  getPaymentRequestCalendarMonth,
  getPaymentRequest,
  getPaymentRequests,
  getRelationshipMembers,
  getRelationshipJoinRequest,
  getRelationshipJoinRequests,
  getRelationshipRubric,
  getRelationships,
  searchRelationships,
  getInvitationPreview,
  markNotificationRead,
  submitPaymentRequest,
  updatePaymentRequest,
  requestToJoinRelationship,
} from '../api';

import { jointAccountChargeQueryKeys } from '@/features/joint-account-charges/hooks/useJointAccountCharges';
import {
  getCalendarMonthFromCompleteList,
  type CalendarMonthData,
} from '@/utils/calendar';
import { logDebug } from '@/utils/logging';

const PAYMENT_REQUEST_PAGE_SIZE = 20;
type NotificationsQueryData = NotificationListResponse & {
  optimisticReadIds?: string[];
};

export const paymentRequestQueryKeys = {
  all: ['payment-requests'] as const,
  detail: (paymentRequestId: string) =>
    ['payment-requests', 'detail', paymentRequestId] as const,
  list: (relationshipId: string, filters: PaymentRequestListFilters) =>
    ['payment-requests', 'list', relationshipId, filters] as const,
  allList: (relationshipId: string) =>
    ['payment-requests', 'list', relationshipId, 'all'] as const,
  calendarPrefix: (relationshipId: string) =>
    ['payment-requests', 'calendar', relationshipId] as const,
  calendar: (relationshipId: string, month: string) =>
    ['payment-requests', 'calendar', relationshipId, month] as const,
  awaitingDecision: (
    userId: string,
    relationships: Pick<RelationshipSummary, 'id' | 'name'>[],
  ) =>
    [
      'payment-requests',
      'awaiting-decision',
      userId,
      relationships.map(({ id, name }) => ({ id, name })),
    ] as const,
  awaitingDecisionPrefix: ['payment-requests', 'awaiting-decision'] as const,
  awaitingJoinRequests: (
    userId: string,
    relationships: Pick<RelationshipSummary, 'id' | 'name'>[],
  ) =>
    [
      'payment-requests',
      'awaiting-join-requests',
      userId,
      relationships.map(({ id, name }) => ({ id, name })),
    ] as const,
  awaitingJoinRequestsPrefix: [
    'payment-requests',
    'awaiting-join-requests',
  ] as const,
  members: (relationshipId: string) =>
    ['payment-requests', 'members', relationshipId] as const,
  rubric: (relationshipId: string) =>
    ['payment-requests', 'rubric', relationshipId] as const,
  relationships: ['payment-requests', 'relationships'] as const,
  relationshipSearch: (query: string) =>
    ['payment-requests', 'relationship-search', query] as const,
  joinRequests: (relationshipId: string) =>
    ['payment-requests', 'join-requests', relationshipId] as const,
  joinRequestDetail: (relationshipId: string, requestId: string) =>
    ['payment-requests', 'join-requests', relationshipId, requestId] as const,
  notifications: ['payment-requests', 'notifications'] as const,
};

export function useRelationshipsQuery(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: getRelationships,
    queryKey: paymentRequestQueryKeys.relationships,
  });
}

export function useRelationshipSearchQuery(query: string, enabled = true) {
  return useQuery({
    enabled: enabled && query.trim().length >= 2,
    queryFn: () => searchRelationships(query.trim()),
    queryKey: paymentRequestQueryKeys.relationshipSearch(query.trim()),
  });
}

export function useRelationshipMembersQuery(
  relationshipId: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: () => getRelationshipMembers(relationshipId as string),
    queryKey: paymentRequestQueryKeys.members(relationshipId ?? ''),
  });
}

export function useRelationshipJoinRequestsQuery(
  relationshipId: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: () => getRelationshipJoinRequests(relationshipId as string),
    queryKey: paymentRequestQueryKeys.joinRequests(relationshipId ?? ''),
  });
}

export type AwaitingDecisionRelationshipJoinRequest = {
  relationshipName: string;
  request: RelationshipJoinRequest;
};

export function useAwaitingDecisionRelationshipJoinRequestsQuery(
  relationships: RelationshipSummary[],
  userId: string | undefined,
) {
  const ownedRelationships = relationships.filter((relationship) =>
    relationship.members.some(
      (member) => member.userId === userId && member.role === 'owner',
    ),
  );

  return useQuery<AwaitingDecisionRelationshipJoinRequest[], Error>({
    enabled: Boolean(userId) && ownedRelationships.length > 0,
    queryFn: async () => {
      const requestsByRelationship = await Promise.all(
        ownedRelationships.map(async (relationship) => {
          const requests = await getRelationshipJoinRequests(relationship.id);
          return requests
            .filter((request) => request.status === 'pending')
            .map((request) => ({
              request,
              relationshipName: relationship.name,
            }));
        }),
      );
      return requestsByRelationship.flat();
    },
    queryKey: paymentRequestQueryKeys.awaitingJoinRequests(
      userId ?? '',
      ownedRelationships,
    ),
  });
}

export function useRelationshipJoinRequestQuery(
  relationshipId: string | undefined,
  requestId: string | undefined,
  enabled = true,
) {
  return useQuery<RelationshipJoinRequest, Error>({
    enabled: Boolean(relationshipId) && Boolean(requestId) && enabled,
    queryFn: () =>
      getRelationshipJoinRequest(relationshipId as string, requestId as string),
    queryKey: paymentRequestQueryKeys.joinRequestDetail(
      relationshipId ?? '',
      requestId ?? '',
    ),
  });
}

export function useInvitationPreviewQuery(
  token: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(token) && enabled,
    queryFn: () => getInvitationPreview(token as string),
    queryKey: ['relationships', 'invitation', token ?? ''],
  });
}

export function useRelationshipRubricQuery(
  relationshipId: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: () => getRelationshipRubric(relationshipId as string),
    queryKey: paymentRequestQueryKeys.rubric(relationshipId ?? ''),
  });
}

export function usePaymentRequestsQuery(
  relationshipId: string | undefined,
  filters: PaymentRequestListFilters = {},
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: () => getPaymentRequests(relationshipId as string, filters),
    queryKey: paymentRequestQueryKeys.list(relationshipId ?? '', filters),
  });
}

export function usePaymentRequestsInfiniteQuery(
  relationshipId: string | undefined,
  enabled = true,
) {
  return useInfiniteQuery<
    PaymentRequestListResponse,
    Error,
    InfiniteData<PaymentRequestListResponse>,
    ReturnType<typeof paymentRequestQueryKeys.allList>,
    string | undefined
  >({
    enabled: Boolean(relationshipId) && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getPaymentRequests(relationshipId as string, {
        cursor: pageParam,
        limit: PAYMENT_REQUEST_PAGE_SIZE,
      }),
    queryKey: paymentRequestQueryKeys.allList(relationshipId ?? ''),
  });
}

export function usePaymentRequestCalendarQuery(
  relationshipId: string | undefined,
  month: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const listQueryKey = paymentRequestQueryKeys.allList(relationshipId ?? '');
  return useQuery<CalendarMonthData<PaymentRequestSummary>, Error>({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: async () => {
      const listQuery = queryClient.getQueryCache().find({
        exact: true,
        queryKey: listQueryKey,
      });
      const listData =
        queryClient.getQueryData<InfiniteData<PaymentRequestListResponse>>(
          listQueryKey,
        );
      const isListStale =
        !listQuery ||
        listQuery.getObserversCount() === 0 ||
        listQuery.isStale();
      const cachedMonth =
        listQuery && !isListStale
          ? getCalendarMonthFromCompleteList(
              listData,
              month,
              (request) => request.purchaseDate,
            )
          : undefined;
      const listPageCount = listData?.pages.length ?? 0;

      if (cachedMonth) {
        logDebug('payment_request_calendar_cache_hit', {
          listPageCount,
          month,
          monthEntryCount: cachedMonth.entries.length,
        });
        return cachedMonth;
      }

      const fallbackReason = !listQuery
        ? 'list_query_not_found'
        : listQuery.getObserversCount() === 0
          ? 'list_query_inactive'
          : isListStale
            ? 'list_query_stale'
            : listPageCount === 0
              ? 'list_cache_empty'
              : 'list_cache_incomplete';
      logDebug('payment_request_calendar_cache_miss', {
        listPageCount,
        month,
        reason: fallbackReason,
      });
      logDebug('payment_request_calendar_month_fetch_started', {
        month,
        reason: fallbackReason,
      });
      const monthData = await getPaymentRequestCalendarMonth(
        relationshipId as string,
        month,
      );
      logDebug('payment_request_calendar_month_fetch_completed', {
        entryCount: monthData.entries.length,
        month,
      });
      return monthData;
    },
    queryKey: paymentRequestQueryKeys.calendar(relationshipId ?? '', month),
  });
}

export type AwaitingDecisionPaymentRequest = {
  request: PaymentRequestSummary;
  relationshipName: string;
};

type AwaitingDecisionPageParam = {
  relationshipIndex: number;
  cursor?: string;
};

type AwaitingDecisionPage = {
  items: AwaitingDecisionPaymentRequest[];
  nextPageParam?: AwaitingDecisionPageParam;
};

export function useAwaitingDecisionPaymentRequestsInfiniteQuery(
  relationships: Pick<RelationshipSummary, 'id' | 'name'>[],
  userId: string | undefined,
) {
  return useInfiniteQuery<
    AwaitingDecisionPage,
    Error,
    InfiniteData<AwaitingDecisionPage>,
    ReturnType<typeof paymentRequestQueryKeys.awaitingDecision>,
    AwaitingDecisionPageParam
  >({
    enabled: Boolean(userId) && relationships.length > 0,
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    initialPageParam: { relationshipIndex: 0 },
    queryFn: async ({ pageParam }) => {
      let relationshipIndex = pageParam.relationshipIndex;
      let cursor = pageParam.cursor;

      while (relationshipIndex < relationships.length) {
        const relationship = relationships[relationshipIndex];
        const page = await getPaymentRequests(relationship.id, {
          awaitingMyDecision: true,
          cursor,
          limit: PAYMENT_REQUEST_PAGE_SIZE,
        });

        if (page.items.length === 0) {
          if (page.nextCursor) {
            if (page.nextCursor === cursor) {
              throw new Error('Payment request pagination did not advance.');
            }
            cursor = page.nextCursor;
          } else {
            relationshipIndex += 1;
            cursor = undefined;
          }
          continue;
        }

        let nextPageParam: AwaitingDecisionPageParam | undefined;
        if (page.nextCursor) {
          if (page.nextCursor === cursor) {
            throw new Error('Payment request pagination did not advance.');
          }
          nextPageParam = {
            relationshipIndex,
            cursor: page.nextCursor,
          };
        } else if (relationshipIndex + 1 < relationships.length) {
          nextPageParam = { relationshipIndex: relationshipIndex + 1 };
        }

        return {
          items: page.items.map((request) => ({
            request,
            relationshipName: relationship.name,
          })),
          nextPageParam,
        };
      }

      return { items: [], nextPageParam: undefined };
    },
    queryKey: paymentRequestQueryKeys.awaitingDecision(
      userId ?? '',
      relationships,
    ),
  });
}

export function usePaymentRequestQuery(
  paymentRequestId: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(paymentRequestId) && enabled,
    queryFn: () => getPaymentRequest(paymentRequestId as string),
    queryKey: paymentRequestQueryKeys.detail(paymentRequestId ?? ''),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending_approval' ? 15_000 : false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
}

export function useNotificationsQuery(enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = paymentRequestQueryKeys.notifications;

  return useQuery({
    enabled,
    queryFn: async (): Promise<NotificationsQueryData> => {
      const notifications = await getNotifications();
      const optimisticReadIds =
        queryClient.getQueryData<NotificationsQueryData>(queryKey)
          ?.optimisticReadIds ?? [];
      const remainingOptimisticReadIds = optimisticReadIds.filter((id) => {
        const notification = notifications.items.find((item) => item.id === id);
        return notification && !notification.readAt;
      });

      return remainingOptimisticReadIds.length > 0
        ? { ...notifications, optimisticReadIds: remainingOptimisticReadIds }
        : notifications;
    },
    queryKey,
  });
}

export function useCreateRelationshipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRelationshipInput) => createRelationship(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.relationships,
      });
    },
  });
}

export function useDeleteRelationshipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRelationship,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.relationships,
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.notifications,
      });
    },
  });
}

export function useRequestToJoinRelationshipMutation() {
  const queryClient = useQueryClient();
  const relationshipSearchQueryKey = [
    'payment-requests',
    'relationship-search',
  ] as const;
  const setRelationshipSearchPending = (relationshipId: string) => {
    queryClient.setQueriesData<RelationshipSearchResult[]>(
      { queryKey: relationshipSearchQueryKey },
      (results) =>
        results?.map((result) =>
          result.id === relationshipId
            ? { ...result, membershipStatus: 'pending' }
            : result,
        ),
    );
  };

  return useMutation({
    mutationFn: ({
      relationshipId,
      displayName,
    }: {
      relationshipId: string;
      displayName?: string;
    }) => requestToJoinRelationship(relationshipId, displayName),
    onMutate: async ({ relationshipId }) => {
      await queryClient.cancelQueries({
        queryKey: relationshipSearchQueryKey,
      });
      const previousSearchResults = queryClient.getQueriesData<
        RelationshipSearchResult[]
      >({
        queryKey: relationshipSearchQueryKey,
      });
      setRelationshipSearchPending(relationshipId);

      return { previousSearchResults };
    },
    onError: (_error, _variables, context) => {
      context?.previousSearchResults.forEach(([queryKey, results]) => {
        if (results) {
          queryClient.setQueryData(queryKey, results);
        }
      });
    },
    onSuccess: async (_joinRequest, { relationshipId }) => {
      setRelationshipSearchPending(relationshipId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: paymentRequestQueryKeys.relationships,
        }),
        queryClient.invalidateQueries({
          queryKey: relationshipSearchQueryKey,
        }),
      ]);
    },
  });
}

export function useDecideRelationshipJoinRequestMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      input,
    }: {
      requestId: string;
      input: DecideRelationshipJoinRequestInput;
    }) =>
      decideRelationshipJoinRequest(relationshipId as string, requestId, input),
    onSuccess: (_request, { requestId }) => {
      if (relationshipId) {
        return Promise.all([
          queryClient.invalidateQueries({
            queryKey: paymentRequestQueryKeys.joinRequests(relationshipId),
          }),
          queryClient.invalidateQueries({
            queryKey: paymentRequestQueryKeys.joinRequestDetail(
              relationshipId,
              requestId,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: paymentRequestQueryKeys.relationships,
          }),
          queryClient.invalidateQueries({
            queryKey: paymentRequestQueryKeys.members(relationshipId),
          }),
          queryClient.invalidateQueries({
            queryKey: paymentRequestQueryKeys.awaitingJoinRequestsPrefix,
          }),
        ]);
      }
      return queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.awaitingJoinRequestsPrefix,
      });
    },
  });
}

export function useDeleteRelationshipJoinRequestMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      deleteRelationshipJoinRequest(relationshipId as string, requestId),
    onSuccess: async (_result, requestId) => {
      if (relationshipId) {
        queryClient.removeQueries({
          queryKey: paymentRequestQueryKeys.joinRequestDetail(
            relationshipId,
            requestId,
          ),
          exact: true,
        });
        await queryClient.invalidateQueries({
          queryKey: paymentRequestQueryKeys.joinRequests(relationshipId),
        });
        await queryClient.invalidateQueries({
          queryKey: paymentRequestQueryKeys.awaitingJoinRequestsPrefix,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.relationships,
      });
    },
  });
}

export function useCreateRelationshipInvitationMutation(
  relationshipId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput = {}) =>
      createRelationshipInvitation(relationshipId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.relationships,
      });
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      token,
      displayName,
    }: {
      token: string;
      displayName?: string;
    }) => acceptInvitation(token, displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.relationships,
      });
    },
  });
}

export function useCreatePaymentRequestMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentRequestInput) =>
      createPaymentRequest(relationshipId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payment-requests', 'list', relationshipId],
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.calendarPrefix(relationshipId),
      });
    },
  });
}

export function useUpdatePaymentRequestMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentRequestId,
      input,
    }: {
      paymentRequestId: string;
      input: UpdatePaymentRequestInput;
    }) => updatePaymentRequest(paymentRequestId, input),
    onSuccess: (request) => {
      queryClient.setQueryData(
        paymentRequestQueryKeys.detail(request.id),
        request,
      );
      const affectedRelationshipId = relationshipId ?? request.relationshipId;
      queryClient.invalidateQueries({
        queryKey: ['payment-requests', 'list', affectedRelationshipId],
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.calendarPrefix(
          affectedRelationshipId,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.notifications,
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.awaitingDecisionPrefix,
      });
    },
  });
}

export function useSubmitPaymentRequestMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentRequestId,
      input,
    }: {
      paymentRequestId: string;
      input: SubmitPaymentRequestInput;
    }) => submitPaymentRequest(paymentRequestId, input),
    onSuccess: (request) => {
      queryClient.setQueryData(
        paymentRequestQueryKeys.detail(request.id),
        request,
      );
      if (relationshipId) {
        queryClient.invalidateQueries({
          queryKey: ['payment-requests', 'list', relationshipId],
        });
        queryClient.invalidateQueries({
          queryKey: paymentRequestQueryKeys.calendarPrefix(relationshipId),
        });
        if (request.status === 'approved') {
          queryClient.invalidateQueries({
            queryKey: jointAccountChargeQueryKeys.listPrefix(relationshipId),
          });
          queryClient.invalidateQueries({
            queryKey:
              jointAccountChargeQueryKeys.calendarPrefix(relationshipId),
          });
        }
      }
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.notifications,
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.awaitingDecisionPrefix,
      });
    },
  });
}

export function useDecidePaymentRequestMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentRequestId,
      input,
    }: {
      paymentRequestId: string;
      input: DecidePaymentRequestInput;
    }) => decidePaymentRequest(paymentRequestId, input),
    onSuccess: (request) => {
      queryClient.setQueryData(
        paymentRequestQueryKeys.detail(request.id),
        request,
      );
      if (relationshipId) {
        queryClient.invalidateQueries({
          queryKey: ['payment-requests', 'list', relationshipId],
        });
        queryClient.invalidateQueries({
          queryKey: paymentRequestQueryKeys.calendarPrefix(relationshipId),
        });
        if (request.status === 'approved') {
          queryClient.invalidateQueries({
            queryKey: jointAccountChargeQueryKeys.listPrefix(relationshipId),
          });
          queryClient.invalidateQueries({
            queryKey:
              jointAccountChargeQueryKeys.calendarPrefix(relationshipId),
          });
        }
      }
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.notifications,
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.awaitingDecisionPrefix,
      });
    },
  });
}

export function useCancelPaymentRequestMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentRequestId: string) =>
      cancelPaymentRequest(paymentRequestId),
    onSuccess: (request) => {
      queryClient.setQueryData(
        paymentRequestQueryKeys.detail(request.id),
        request,
      );
      if (relationshipId) {
        queryClient.invalidateQueries({
          queryKey: ['payment-requests', 'list', relationshipId],
        });
        queryClient.invalidateQueries({
          queryKey: paymentRequestQueryKeys.calendarPrefix(relationshipId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.notifications,
      });
      queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.awaitingDecisionPrefix,
      });
    },
  });
}

export function useDeletePaymentRequestMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePaymentRequest,
    onSuccess: async (_result, paymentRequestId) => {
      queryClient.removeQueries({
        queryKey: paymentRequestQueryKeys.detail(paymentRequestId),
        exact: true,
      });
      if (relationshipId) {
        await queryClient.invalidateQueries({
          queryKey: ['payment-requests', 'list', relationshipId],
        });
        await queryClient.invalidateQueries({
          queryKey: paymentRequestQueryKeys.calendarPrefix(relationshipId),
        });
      }
      await queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.notifications,
      });
      await queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.awaitingDecisionPrefix,
      });
    },
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  const queryKey = paymentRequestQueryKeys.notifications;

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousNotifications =
        queryClient.getQueryData<NotificationsQueryData>(queryKey);

      if (previousNotifications) {
        const optimisticReadIds = new Set(
          previousNotifications.optimisticReadIds ?? [],
        );
        optimisticReadIds.add(notificationId);
        queryClient.setQueryData<NotificationsQueryData>(queryKey, {
          ...previousNotifications,
          optimisticReadIds: [...optimisticReadIds],
        });
      }

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
}

export function useCompleteNotificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeNotification,
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: paymentRequestQueryKeys.notifications,
      });
    },
  });
}
