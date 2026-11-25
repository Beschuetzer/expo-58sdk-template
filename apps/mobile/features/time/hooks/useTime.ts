import type {
  CreateMeTimeInput,
  CreateRelationshipTaskInput,
  MeTime,
  MeTimeListResponse,
  RelationshipTask,
  RelationshipTaskListResponse,
  RelationshipTaskStatus,
  RelationshipSummary,
  UpdateRelationshipTaskInput,
  UpdateMeTimeInput,
} from '@expo-50sdk-template/shared-types';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import type { MeTimeCalendarMonth as MeTimeCalendarMonthData } from '../api';
import {
  completeRelationshipTask,
  createMeTime,
  createRelationshipTask,
  deleteMeTime,
  deleteRelationshipTask,
  getMeTimeCalendarMonth,
  getMeTime,
  getMeTimeEntry,
  getRelationshipTaskCalendarMonth,
  getRelationshipTask,
  getRelationshipTasks,
  updateRelationshipTask,
  updateMeTime,
} from '../api';
import { canUserCompleteRelationshipTask } from '../filters';

import {
  getCalendarMonthFromCompleteList,
  type CalendarMonthData,
} from '@/utils/calendar';
import { logDebug } from '@/utils/logging';

const TIME_PAGE_SIZE = 20;

export const timeQueryKeys = {
  meTimeList: (relationshipId: string) =>
    ['time', 'me-time', relationshipId] as const,
  meTimeCalendar: (relationshipId: string, month: string) =>
    ['time', 'me-time', relationshipId, 'calendar', month] as const,
  meTimeEntry: (relationshipId: string, meTimeId: string) =>
    ['time', 'me-time', relationshipId, 'detail', meTimeId] as const,
  taskList: (relationshipId: string, status?: RelationshipTaskStatus) =>
    status
      ? (['time', 'tasks', relationshipId, status] as const)
      : (['time', 'tasks', relationshipId] as const),
  taskCalendar: (
    relationshipId: string,
    status: RelationshipTaskStatus,
    month: string,
  ) => ['time', 'tasks', relationshipId, 'calendar', status, month] as const,
  taskDetail: (relationshipId: string, taskId: string) =>
    ['time', 'tasks', relationshipId, 'detail', taskId] as const,
  awaitingDecision: (
    userId: string,
    relationships: Pick<RelationshipSummary, 'id' | 'name'>[],
  ) =>
    [
      'time',
      'awaiting-decision',
      userId,
      relationships.map(({ id, name }) => ({ id, name })),
    ] as const,
  awaitingDecisionPrefix: ['time', 'awaiting-decision'] as const,
};

export type AwaitingDecisionRelationshipTask = {
  relationshipName: string;
  task: RelationshipTask;
};

type AwaitingDecisionRelationshipTaskPageParam = {
  relationshipIndex: number;
  cursor?: string;
};

type AwaitingDecisionRelationshipTaskPage = {
  items: AwaitingDecisionRelationshipTask[];
  nextPageParam?: AwaitingDecisionRelationshipTaskPageParam;
};

export function useMeTimeInfiniteQuery(
  relationshipId: string | undefined,
  enabled = true,
) {
  return useInfiniteQuery<
    MeTimeListResponse,
    Error,
    InfiniteData<MeTimeListResponse>,
    ReturnType<typeof timeQueryKeys.meTimeList>,
    string | undefined
  >({
    enabled: Boolean(relationshipId) && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getMeTime(relationshipId as string, {
        cursor: pageParam,
        limit: TIME_PAGE_SIZE,
      }),
    queryKey: timeQueryKeys.meTimeList(relationshipId ?? ''),
  });
}

export function useMeTimeCalendarQuery(
  relationshipId: string | undefined,
  month: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const listQueryKey = timeQueryKeys.meTimeList(relationshipId ?? '');
  return useQuery<MeTimeCalendarMonthData, Error>({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: async () => {
      const listQuery = queryClient.getQueryCache().find({
        exact: true,
        queryKey: listQueryKey,
      });
      const listData =
        queryClient.getQueryData<InfiniteData<MeTimeListResponse>>(
          listQueryKey,
        );
      const isListStale =
        !listQuery ||
        listQuery.getObserversCount() === 0 ||
        listQuery.isStale();
      const cachedListMonth =
        listQuery && !isListStale
          ? getCalendarMonthFromCompleteList(
              listData,
              month,
              (entry) => entry.startTime,
            )
          : undefined;
      const listPageCount = listData?.pages.length ?? 0;

      if (cachedListMonth) {
        logDebug('me_time_calendar_cache_hit', {
          listPageCount,
          month,
          monthEntryCount: cachedListMonth.entries.length,
        });
        return {
          earliestStartTime: cachedListMonth.earliestDate,
          latestStartTime: cachedListMonth.latestDate,
          entries: cachedListMonth.entries,
        };
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

      logDebug('me_time_calendar_cache_miss', {
        listPageCount,
        month,
        reason: fallbackReason,
      });
      logDebug('me_time_calendar_month_fetch_started', {
        month,
        reason: fallbackReason,
      });
      const monthData = await getMeTimeCalendarMonth(
        relationshipId as string,
        month,
      );
      logDebug('me_time_calendar_month_fetch_completed', {
        entryCount: monthData.entries.length,
        month,
      });
      return monthData;
    },
    queryKey: timeQueryKeys.meTimeCalendar(relationshipId ?? '', month),
  });
}

export function useMeTimeEntryQuery(
  relationshipId: string | undefined,
  meTimeId: string | undefined,
  enabled = true,
) {
  return useQuery<MeTime, Error>({
    enabled: Boolean(relationshipId) && Boolean(meTimeId) && enabled,
    queryFn: () => getMeTimeEntry(relationshipId as string, meTimeId as string),
    queryKey: timeQueryKeys.meTimeEntry(relationshipId ?? '', meTimeId ?? ''),
  });
}

export function useRelationshipTasksInfiniteQuery(
  relationshipId: string | undefined,
  status: RelationshipTaskStatus = 'incomplete',
  enabled = true,
  pageSize = TIME_PAGE_SIZE,
) {
  return useInfiniteQuery<
    RelationshipTaskListResponse,
    Error,
    InfiniteData<RelationshipTaskListResponse>,
    ReturnType<typeof timeQueryKeys.taskList>,
    string | undefined
  >({
    enabled: Boolean(relationshipId) && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getRelationshipTasks(relationshipId as string, {
        cursor: pageParam,
        limit: pageSize,
        status,
      }),
    queryKey: timeQueryKeys.taskList(relationshipId ?? '', status),
  });
}

export function useAwaitingDecisionRelationshipTasksInfiniteQuery(
  relationships: Pick<RelationshipSummary, 'id' | 'name'>[],
  userId: string | undefined,
) {
  return useInfiniteQuery<
    AwaitingDecisionRelationshipTaskPage,
    Error,
    InfiniteData<AwaitingDecisionRelationshipTaskPage>,
    ReturnType<typeof timeQueryKeys.awaitingDecision>,
    AwaitingDecisionRelationshipTaskPageParam
  >({
    enabled: Boolean(userId) && relationships.length > 0,
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    initialPageParam: { relationshipIndex: 0 },
    queryFn: async ({ pageParam }) => {
      let relationshipIndex = pageParam.relationshipIndex;
      let cursor = pageParam.cursor;

      while (relationshipIndex < relationships.length) {
        const relationship = relationships[relationshipIndex];
        const page = await getRelationshipTasks(relationship.id, {
          cursor,
          limit: TIME_PAGE_SIZE,
          status: 'incomplete',
        });
        const items = page.items
          .filter((task) => canUserCompleteRelationshipTask(task, userId))
          .map((task) => ({
            task,
            relationshipName: relationship.name,
          }));

        if (items.length === 0) {
          if (page.nextCursor) {
            if (page.nextCursor === cursor) {
              throw new Error('Relationship task pagination did not advance.');
            }
            cursor = page.nextCursor;
          } else {
            relationshipIndex += 1;
            cursor = undefined;
          }
          continue;
        }

        let nextPageParam:
          | AwaitingDecisionRelationshipTaskPageParam
          | undefined;
        if (page.nextCursor) {
          if (page.nextCursor === cursor) {
            throw new Error('Relationship task pagination did not advance.');
          }
          nextPageParam = {
            relationshipIndex,
            cursor: page.nextCursor,
          };
        } else if (relationshipIndex + 1 < relationships.length) {
          nextPageParam = { relationshipIndex: relationshipIndex + 1 };
        }

        return { items, nextPageParam };
      }

      return { items: [], nextPageParam: undefined };
    },
    queryKey: timeQueryKeys.awaitingDecision(userId ?? '', relationships),
  });
}

export function useRelationshipTaskCalendarQuery(
  relationshipId: string | undefined,
  status: RelationshipTaskStatus,
  month: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const listQueryKey = timeQueryKeys.taskList(relationshipId ?? '', status);
  return useQuery<CalendarMonthData<RelationshipTask>, Error>({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: async () => {
      const listQuery = queryClient.getQueryCache().find({
        exact: true,
        queryKey: listQueryKey,
      });
      const listData =
        queryClient.getQueryData<InfiniteData<RelationshipTaskListResponse>>(
          listQueryKey,
        );
      const isListStale =
        !listQuery ||
        listQuery.getObserversCount() === 0 ||
        listQuery.isStale();
      const cachedMonth =
        listQuery && !isListStale
          ? getCalendarMonthFromCompleteList(listData, month, (task) =>
              status === 'completed' ? task.completedAt : task.createdAt,
            )
          : undefined;
      const listPageCount = listData?.pages.length ?? 0;

      if (cachedMonth) {
        logDebug('relationship_task_calendar_cache_hit', {
          listPageCount,
          month,
          monthEntryCount: cachedMonth.entries.length,
          status,
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

      logDebug('relationship_task_calendar_cache_miss', {
        listPageCount,
        month,
        reason: fallbackReason,
        status,
      });
      logDebug('relationship_task_calendar_month_fetch_started', {
        month,
        reason: fallbackReason,
        status,
      });
      const monthData = await getRelationshipTaskCalendarMonth(
        relationshipId as string,
        status,
        month,
      );
      logDebug('relationship_task_calendar_month_fetch_completed', {
        entryCount: monthData.entries.length,
        month,
        status,
      });
      return monthData;
    },
    queryKey: timeQueryKeys.taskCalendar(relationshipId ?? '', status, month),
  });
}

export function useRelationshipTaskQuery(
  relationshipId: string | undefined,
  taskId: string | undefined,
  enabled = true,
) {
  return useQuery<RelationshipTask, Error>({
    enabled: Boolean(relationshipId) && Boolean(taskId) && enabled,
    queryFn: () =>
      getRelationshipTask(relationshipId as string, taskId as string),
    queryKey: timeQueryKeys.taskDetail(relationshipId ?? '', taskId ?? ''),
  });
}

export function useCreateMeTimeMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeTimeInput) =>
      createMeTime(relationshipId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: timeQueryKeys.meTimeList(relationshipId),
      }),
  });
}

export function useUpdateMeTimeMutation(relationshipId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      meTimeId,
      input,
    }: {
      meTimeId: string;
      input: UpdateMeTimeInput;
    }) => {
      if (!relationshipId) {
        throw new Error('A relationship is required to update Me time.');
      }
      return updateMeTime(relationshipId, meTimeId, input);
    },
    onSuccess: async () => {
      if (relationshipId) {
        await queryClient.invalidateQueries({
          queryKey: timeQueryKeys.meTimeList(relationshipId),
        });
      }
    },
  });
}

export function useDeleteMeTimeMutation(relationshipId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meTimeId: string) =>
      deleteMeTime(relationshipId as string, meTimeId),
    onSuccess: async (_result, meTimeId) => {
      queryClient.removeQueries({
        queryKey: timeQueryKeys.meTimeEntry(relationshipId ?? '', meTimeId),
        exact: true,
      });
      if (relationshipId) {
        await queryClient.invalidateQueries({
          queryKey: timeQueryKeys.meTimeList(relationshipId),
        });
      }
    },
  });
}

export function useCreateRelationshipTaskMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRelationshipTaskInput) =>
      createRelationshipTask(relationshipId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: timeQueryKeys.taskList(relationshipId),
        }),
        queryClient.invalidateQueries({
          queryKey: timeQueryKeys.awaitingDecisionPrefix,
        }),
      ]),
  });
}

export function useUpdateRelationshipTaskMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      input,
    }: {
      taskId: string;
      input: UpdateRelationshipTaskInput;
    }) => {
      if (!relationshipId) {
        throw new Error('A relationship is required to update a task.');
      }
      return updateRelationshipTask(relationshipId, taskId, input);
    },
    onSuccess: async (task: RelationshipTask) => {
      if (!relationshipId) return;
      queryClient.setQueryData(
        timeQueryKeys.taskDetail(relationshipId, task.id),
        task,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: timeQueryKeys.taskList(relationshipId),
        }),
        queryClient.invalidateQueries({
          queryKey: timeQueryKeys.awaitingDecisionPrefix,
        }),
      ]);
    },
  });
}

export function useDeleteRelationshipTaskMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      deleteRelationshipTask(relationshipId as string, taskId),
    onSuccess: async (_result, taskId) => {
      queryClient.removeQueries({
        queryKey: timeQueryKeys.taskDetail(relationshipId ?? '', taskId),
        exact: true,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: timeQueryKeys.awaitingDecisionPrefix,
        }),
        ...(relationshipId
          ? [
              queryClient.invalidateQueries({
                queryKey: timeQueryKeys.taskList(relationshipId),
              }),
            ]
          : []),
      ]);
    },
  });
}

export function useCompleteRelationshipTaskMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      completeRelationshipTask(relationshipId, taskId),
    onSuccess: async (task: RelationshipTask) => {
      queryClient.setQueryData(
        timeQueryKeys.taskDetail(relationshipId, task.id),
        task,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: timeQueryKeys.taskList(relationshipId),
        }),
        queryClient.invalidateQueries({
          queryKey: timeQueryKeys.awaitingDecisionPrefix,
        }),
      ]);
    },
  });
}
