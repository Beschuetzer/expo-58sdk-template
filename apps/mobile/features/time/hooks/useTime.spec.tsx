import type {
  MeTime,
  RelationshipSummary,
  RelationshipTask,
  RelationshipTaskListResponse,
} from '@expo-50sdk-template/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  useCompleteRelationshipTaskMutation,
  useCreateMeTimeMutation,
  useCreateRelationshipTaskMutation,
  useDeleteMeTimeMutation,
  useDeleteRelationshipTaskMutation,
  timeQueryKeys,
  useMeTimeCalendarQuery,
  useMeTimeEntryQuery,
  useMeTimeInfiniteQuery,
  useRelationshipTaskCalendarQuery,
  useRelationshipTaskQuery,
  useRelationshipTasksInfiniteQuery,
  useAwaitingDecisionRelationshipTasksInfiniteQuery,
  useUpdateMeTimeMutation,
  useUpdateRelationshipTaskMutation,
} from './useTime';
import * as timeApi from '../api';
import type { MeTimeCalendarMonth } from '../api';

import { logDebug } from '@/utils/logging';

jest.mock('../api', () => ({
  completeRelationshipTask: jest.fn(),
  createMeTime: jest.fn(),
  createRelationshipTask: jest.fn(),
  deleteMeTime: jest.fn(),
  deleteRelationshipTask: jest.fn(),
  getMeTime: jest.fn(),
  getMeTimeCalendarMonth: jest.fn(),
  getMeTimeEntry: jest.fn(),
  getRelationshipTaskCalendarMonth: jest.fn(),
  getRelationshipTask: jest.fn(),
  getRelationshipTasks: jest.fn(),
  updateMeTime: jest.fn(),
  updateRelationshipTask: jest.fn(),
}));

jest.mock('@/utils/logging', () => ({
  logDebug: jest.fn(),
}));

function makeMeTime(id: string, startTime: string): MeTime {
  return {
    id,
    relationshipId: 'relationship-1',
    createdByUserId: 'user-1',
    startTime,
    endTime: new Date(
      new Date(startTime).getTime() + 60 * 60 * 1000,
    ).toISOString(),
    createdAt: '2026-10-29T12:00:00.000Z',
    updatedAt: '2026-10-29T12:00:00.000Z',
  };
}

function makeTask(
  id: string,
  createdAt: string,
  completedAt?: string,
): RelationshipTask {
  return {
    id,
    relationshipId: 'relationship-1',
    createdByUserId: 'user-1',
    name: id,
    visibleToUserIds: [],
    completableByUserIds: [],
    createdAt,
    updatedAt: createdAt,
    ...(completedAt ? { completedAt, completedByUserId: 'user-1' } : {}),
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        refetchOnMount: false,
        retry: false,
        staleTime: 60_000,
      },
      mutations: {
        gcTime: Infinity,
      },
    },
  });
}

async function settleQueries() {
  await act(async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await Promise.resolve();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

describe('time calendar query cache reuse', () => {
  let mountedRenderer: ReactTestRenderer | undefined;

  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = undefined;
    }
    jest.clearAllMocks();
  });

  async function mountCalendarQuery(
    queryClient: QueryClient,
    month = '2026-10',
    observeList = true,
  ) {
    let calendarQuery: ReturnType<typeof useMeTimeCalendarQuery> | undefined;

    function ListQueryObserver() {
      useMeTimeInfiniteQuery('relationship-1');
      return null;
    }

    function CalendarConsumer() {
      calendarQuery = useMeTimeCalendarQuery('relationship-1', month);
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <>
            {observeList ? <ListQueryObserver /> : null}
            <CalendarConsumer />
          </>
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    return {
      get calendarQuery() {
        return calendarQuery;
      },
    };
  }

  async function mountTaskCalendarQuery(
    queryClient: QueryClient,
    status: 'incomplete' | 'completed',
    month = '2026-10',
    observeList = true,
  ) {
    let calendarQuery:
      | ReturnType<typeof useRelationshipTaskCalendarQuery>
      | undefined;

    function ListQueryObserver() {
      useRelationshipTasksInfiniteQuery('relationship-1', status);
      return null;
    }

    function CalendarConsumer() {
      calendarQuery = useRelationshipTaskCalendarQuery(
        'relationship-1',
        status,
        month,
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <>
            {observeList ? <ListQueryObserver /> : null}
            <CalendarConsumer />
          </>
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    return {
      get calendarQuery() {
        return calendarQuery;
      },
    };
  }

  it('does not fetch calendar data when the relationship is missing or disabled', async () => {
    const queryClient = createTestQueryClient();

    function CalendarConsumer() {
      useMeTimeCalendarQuery(undefined, '2026-10');
      useMeTimeCalendarQuery('relationship-1', '2026-10', false);
      useRelationshipTaskCalendarQuery(undefined, 'incomplete', '2026-10');
      useRelationshipTaskCalendarQuery(
        'relationship-1',
        'incomplete',
        '2026-10',
        false,
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <CalendarConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    expect(timeApi.getMeTimeCalendarMonth).not.toHaveBeenCalled();
    expect(timeApi.getRelationshipTaskCalendarMonth).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it('derives a month from fresh, fully loaded list data without another request', async () => {
    const queryClient = createTestQueryClient();
    const latestEntry = makeMeTime('latest', '2026-11-02T12:00:00.000Z');
    const monthEntry = makeMeTime('october', '2026-10-15T12:00:00.000Z');
    const earliestEntry = makeMeTime('earliest', '2026-09-30T12:00:00.000Z');
    const listData: InfiniteData<{ items: MeTime[] }> = {
      pages: [{ items: [latestEntry, monthEntry, earliestEntry] }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(
      timeQueryKeys.meTimeList('relationship-1'),
      listData,
    );

    const result = await mountCalendarQuery(queryClient);

    expect(result.calendarQuery?.data).toEqual({
      earliestStartTime: earliestEntry.startTime,
      latestStartTime: latestEntry.startTime,
      entries: [monthEntry],
    });
    expect(timeApi.getMeTimeCalendarMonth).not.toHaveBeenCalled();
    expect(timeApi.getMeTime).not.toHaveBeenCalled();
    expect(logDebug).toHaveBeenCalledWith('me_time_calendar_cache_hit', {
      listPageCount: 1,
      month: '2026-10',
      monthEntryCount: 1,
    });
    queryClient.clear();
  });

  it('uses the month endpoint when list pages are incomplete', async () => {
    const queryClient = createTestQueryClient();
    const monthEntry = makeMeTime('october', '2026-10-15T12:00:00.000Z');
    const fallbackData: MeTimeCalendarMonth = {
      earliestStartTime: monthEntry.startTime,
      latestStartTime: monthEntry.startTime,
      entries: [monthEntry],
    };
    queryClient.setQueryData(timeQueryKeys.meTimeList('relationship-1'), {
      pages: [{ items: [monthEntry], nextCursor: 'next-page' }],
      pageParams: [undefined],
    } satisfies InfiniteData<{ items: MeTime[]; nextCursor?: string }>);
    jest.mocked(timeApi.getMeTimeCalendarMonth).mockResolvedValue(fallbackData);

    const result = await mountCalendarQuery(queryClient);

    expect(timeApi.getMeTimeCalendarMonth).toHaveBeenCalledWith(
      'relationship-1',
      '2026-10',
    );
    expect(result.calendarQuery?.data).toEqual(fallbackData);
    expect(logDebug).toHaveBeenCalledWith('me_time_calendar_cache_miss', {
      listPageCount: 1,
      month: '2026-10',
      reason: 'list_cache_incomplete',
    });
    expect(logDebug).toHaveBeenCalledWith(
      'me_time_calendar_month_fetch_completed',
      { entryCount: 1, month: '2026-10' },
    );
    queryClient.clear();
  });

  it('uses the month endpoint when fully loaded list data is stale', async () => {
    const queryClient = createTestQueryClient();
    const monthEntry = makeMeTime('october', '2026-10-15T12:00:00.000Z');
    const fallbackData: MeTimeCalendarMonth = {
      earliestStartTime: monthEntry.startTime,
      latestStartTime: monthEntry.startTime,
      entries: [monthEntry],
    };
    queryClient.setQueryData(
      timeQueryKeys.meTimeList('relationship-1'),
      {
        pages: [{ items: [monthEntry] }],
        pageParams: [undefined],
      },
      { updatedAt: Date.now() - 120_000 },
    );
    jest.mocked(timeApi.getMeTimeCalendarMonth).mockResolvedValue(fallbackData);

    const result = await mountCalendarQuery(queryClient);

    expect(timeApi.getMeTimeCalendarMonth).toHaveBeenCalledWith(
      'relationship-1',
      '2026-10',
    );
    expect(result.calendarQuery?.data).toEqual(fallbackData);
    expect(logDebug).toHaveBeenCalledWith('me_time_calendar_cache_miss', {
      listPageCount: 1,
      month: '2026-10',
      reason: 'list_query_stale',
    });
    queryClient.clear();
  });

  it('fetches a me-time month when the list query is missing or inactive', async () => {
    const monthEntry = makeMeTime('october', '2026-10-15T12:00:00.000Z');
    const fallbackData: MeTimeCalendarMonth = {
      earliestStartTime: monthEntry.startTime,
      latestStartTime: monthEntry.startTime,
      entries: [monthEntry],
    };

    for (const reason of ['list_query_not_found', 'list_query_inactive']) {
      const queryClient = createTestQueryClient();
      if (reason === 'list_query_inactive') {
        queryClient.setQueryData(timeQueryKeys.meTimeList('relationship-1'), {
          pages: [{ items: [monthEntry] }],
          pageParams: [undefined],
        });
      }
      jest
        .mocked(timeApi.getMeTimeCalendarMonth)
        .mockResolvedValue(fallbackData);

      const result = await mountCalendarQuery(queryClient, '2026-10', false);

      expect(result.calendarQuery?.data).toEqual(fallbackData);
      expect(logDebug).toHaveBeenCalledWith('me_time_calendar_cache_miss', {
        listPageCount: reason === 'list_query_not_found' ? 0 : 1,
        month: '2026-10',
        reason,
      });
      act(() => mountedRenderer?.unmount());
      mountedRenderer = undefined;
      queryClient.clear();
    }
    expect(timeApi.getMeTimeCalendarMonth).toHaveBeenCalledTimes(2);
  });

  it('fetches a me-time month when the active list cache has no pages', async () => {
    const queryClient = createTestQueryClient();
    const fallbackData: MeTimeCalendarMonth = {
      earliestStartTime: null,
      latestStartTime: null,
      entries: [],
    };
    queryClient.setQueryData(timeQueryKeys.meTimeList('relationship-1'), {
      pages: [],
      pageParams: [],
    });
    jest.mocked(timeApi.getMeTimeCalendarMonth).mockResolvedValue(fallbackData);

    const result = await mountCalendarQuery(queryClient);

    expect(result.calendarQuery?.data).toEqual(fallbackData);
    expect(logDebug).toHaveBeenCalledWith('me_time_calendar_cache_miss', {
      listPageCount: 0,
      month: '2026-10',
      reason: 'list_cache_empty',
    });
    queryClient.clear();
  });

  it('derives completed-task dates from the fresh complete list cache', async () => {
    const queryClient = createTestQueryClient();
    const latestTask = makeTask(
      'latest',
      '2026-10-01T12:00:00.000Z',
      '2026-11-02T12:00:00.000Z',
    );
    const monthTask = makeTask(
      'october',
      '2026-09-30T12:00:00.000Z',
      '2026-10-15T12:00:00.000Z',
    );
    const taskList: InfiniteData<RelationshipTaskListResponse> = {
      pages: [{ items: [latestTask, monthTask] }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(
      timeQueryKeys.taskList('relationship-1', 'completed'),
      taskList,
    );

    const result = await mountTaskCalendarQuery(queryClient, 'completed');

    expect(result.calendarQuery?.data).toEqual({
      earliestDate: monthTask.completedAt,
      latestDate: latestTask.completedAt,
      entries: [monthTask],
    });
    expect(timeApi.getRelationshipTaskCalendarMonth).not.toHaveBeenCalled();
    expect(timeApi.getRelationshipTasks).not.toHaveBeenCalled();
    expect(logDebug).toHaveBeenCalledWith(
      'relationship_task_calendar_cache_hit',
      {
        listPageCount: 1,
        month: '2026-10',
        monthEntryCount: 1,
        status: 'completed',
      },
    );
    queryClient.clear();
  });

  it('derives incomplete-task dates from the fresh complete list cache', async () => {
    const queryClient = createTestQueryClient();
    const earlierTask = makeTask('earlier', '2026-09-30T12:00:00.000Z');
    const monthTask = makeTask('october', '2026-10-15T12:00:00.000Z');
    const taskList: InfiniteData<RelationshipTaskListResponse> = {
      pages: [{ items: [earlierTask, monthTask] }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(
      timeQueryKeys.taskList('relationship-1', 'incomplete'),
      taskList,
    );

    const result = await mountTaskCalendarQuery(queryClient, 'incomplete');

    expect(result.calendarQuery?.data).toEqual({
      earliestDate: earlierTask.createdAt,
      latestDate: monthTask.createdAt,
      entries: [monthTask],
    });
    expect(timeApi.getRelationshipTaskCalendarMonth).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it('falls back to the task month endpoint when list pagination is incomplete', async () => {
    const queryClient = createTestQueryClient();
    const monthTask = makeTask('october', '2026-10-15T12:00:00.000Z');
    const fallbackData = {
      earliestDate: '2026-09-30T12:00:00.000Z',
      latestDate: '2026-11-02T12:00:00.000Z',
      entries: [monthTask],
    };
    queryClient.setQueryData(
      timeQueryKeys.taskList('relationship-1', 'incomplete'),
      {
        pages: [{ items: [monthTask], nextCursor: 'next-page' }],
        pageParams: [undefined],
      } satisfies InfiniteData<RelationshipTaskListResponse>,
    );
    jest
      .mocked(timeApi.getRelationshipTaskCalendarMonth)
      .mockResolvedValue(fallbackData);

    const result = await mountTaskCalendarQuery(queryClient, 'incomplete');

    expect(timeApi.getRelationshipTaskCalendarMonth).toHaveBeenCalledWith(
      'relationship-1',
      'incomplete',
      '2026-10',
    );
    expect(result.calendarQuery?.data).toEqual(fallbackData);
    expect(logDebug).toHaveBeenCalledWith(
      'relationship_task_calendar_cache_miss',
      {
        listPageCount: 1,
        month: '2026-10',
        reason: 'list_cache_incomplete',
        status: 'incomplete',
      },
    );
    queryClient.clear();
  });

  it('fetches a task month when the list query is missing or inactive', async () => {
    const monthTask = makeTask('october', '2026-10-15T12:00:00.000Z');
    const fallbackData = {
      earliestDate: monthTask.createdAt,
      latestDate: monthTask.createdAt,
      entries: [monthTask],
    };

    for (const reason of ['list_query_not_found', 'list_query_inactive']) {
      const queryClient = createTestQueryClient();
      if (reason === 'list_query_inactive') {
        queryClient.setQueryData(
          timeQueryKeys.taskList('relationship-1', 'incomplete'),
          {
            pages: [{ items: [monthTask] }],
            pageParams: [undefined],
          },
        );
      }
      jest
        .mocked(timeApi.getRelationshipTaskCalendarMonth)
        .mockResolvedValue(fallbackData);

      const result = await mountTaskCalendarQuery(
        queryClient,
        'incomplete',
        '2026-10',
        false,
      );

      expect(result.calendarQuery?.data).toEqual(fallbackData);
      expect(logDebug).toHaveBeenCalledWith(
        'relationship_task_calendar_cache_miss',
        {
          listPageCount: reason === 'list_query_not_found' ? 0 : 1,
          month: '2026-10',
          reason,
          status: 'incomplete',
        },
      );
      act(() => mountedRenderer?.unmount());
      mountedRenderer = undefined;
      queryClient.clear();
    }
    expect(timeApi.getRelationshipTaskCalendarMonth).toHaveBeenCalledTimes(2);
  });

  it('fetches a task month when the active list cache has no pages', async () => {
    const queryClient = createTestQueryClient();
    const fallbackData = {
      earliestDate: null,
      latestDate: null,
      entries: [],
    };
    queryClient.setQueryData(
      timeQueryKeys.taskList('relationship-1', 'incomplete'),
      {
        pages: [],
        pageParams: [],
      },
    );
    jest
      .mocked(timeApi.getRelationshipTaskCalendarMonth)
      .mockResolvedValue(fallbackData);

    const result = await mountTaskCalendarQuery(queryClient, 'incomplete');

    expect(result.calendarQuery?.data).toEqual(fallbackData);
    expect(logDebug).toHaveBeenCalledWith(
      'relationship_task_calendar_cache_miss',
      {
        listPageCount: 0,
        month: '2026-10',
        reason: 'list_cache_empty',
        status: 'incomplete',
      },
    );
    queryClient.clear();
  });

  it('gates list queries on relationship IDs and fetches their pages', async () => {
    const queryClient = createTestQueryClient();
    const meTime = makeMeTime('me-time-1', '2026-10-15T12:00:00.000Z');
    const task = makeTask('task-1', '2026-10-15T12:00:00.000Z');
    jest
      .mocked(timeApi.getMeTime)
      .mockResolvedValueOnce({ items: [meTime], nextCursor: 'me-time-next' })
      .mockResolvedValueOnce({ items: [] });
    jest
      .mocked(timeApi.getRelationshipTasks)
      .mockResolvedValueOnce({ items: [task], nextCursor: 'task-next' })
      .mockResolvedValueOnce({ items: [] });

    let meTimeQuery: ReturnType<typeof useMeTimeInfiniteQuery> | undefined;
    let taskQuery:
      | ReturnType<typeof useRelationshipTasksInfiniteQuery>
      | undefined;
    function TestConsumer() {
      useMeTimeInfiniteQuery(undefined);
      useMeTimeInfiniteQuery('relationship-disabled', false);
      meTimeQuery = useMeTimeInfiniteQuery('relationship-1');
      useRelationshipTasksInfiniteQuery(undefined);
      useRelationshipTasksInfiniteQuery(
        'relationship-disabled',
        'completed',
        false,
      );
      taskQuery = useRelationshipTasksInfiniteQuery('relationship-1');
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    expect(timeApi.getMeTime).toHaveBeenCalledWith('relationship-1', {
      cursor: undefined,
      limit: 20,
    });
    expect(timeApi.getRelationshipTasks).toHaveBeenCalledWith(
      'relationship-1',
      {
        cursor: undefined,
        limit: 20,
        status: 'incomplete',
      },
    );
    if (!meTimeQuery || !taskQuery) {
      throw new Error('Expected list queries to be mounted.');
    }
    const mountedMeTimeQuery = meTimeQuery;
    const mountedTaskQuery = taskQuery;
    await act(async () => {
      await mountedMeTimeQuery.fetchNextPage();
      await mountedTaskQuery.fetchNextPage();
    });
    expect(timeApi.getMeTime).toHaveBeenNthCalledWith(2, 'relationship-1', {
      cursor: 'me-time-next',
      limit: 20,
    });
    expect(timeApi.getRelationshipTasks).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      {
        cursor: 'task-next',
        limit: 20,
        status: 'incomplete',
      },
    );
    expect(timeQueryKeys.taskList('relationship-1')).toEqual([
      'time',
      'tasks',
      'relationship-1',
    ]);
    queryClient.clear();
  });

  it('loads only completable tasks across relationships as pages advance', async () => {
    const queryClient = createTestQueryClient();
    const assignedToOther = {
      ...makeTask('task-other', '2026-10-15T12:00:00.000Z'),
      completableByUserIds: ['user-2'],
    };
    const assignedToCurrentUser = {
      ...makeTask('task-current', '2026-10-16T12:00:00.000Z'),
      completableByUserIds: ['user-1'],
    };
    const availableToEveryone = {
      ...makeTask('task-everyone', '2026-10-17T12:00:00.000Z'),
      relationshipId: 'relationship-2',
    };
    jest
      .mocked(timeApi.getRelationshipTasks)
      .mockResolvedValueOnce({
        items: [assignedToOther, assignedToCurrentUser],
        nextCursor: 'task-next',
      })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [availableToEveryone] });

    const relationships: Pick<RelationshipSummary, 'id' | 'name'>[] = [
      { id: 'relationship-1', name: 'Shared space' },
      { id: 'relationship-2', name: 'Other space' },
    ];
    let taskQuery:
      | ReturnType<typeof useAwaitingDecisionRelationshipTasksInfiniteQuery>
      | undefined;
    function TestConsumer() {
      taskQuery = useAwaitingDecisionRelationshipTasksInfiniteQuery(
        relationships,
        'user-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    expect(timeApi.getRelationshipTasks).toHaveBeenCalledWith(
      'relationship-1',
      {
        cursor: undefined,
        limit: 20,
        status: 'incomplete',
      },
    );
    expect(taskQuery?.data?.pages.flatMap((page) => page.items)).toEqual([
      {
        task: assignedToCurrentUser,
        relationshipName: 'Shared space',
      },
    ]);
    expect(taskQuery?.hasNextPage).toBe(true);

    await act(async () => {
      await taskQuery?.fetchNextPage();
    });
    await settleQueries();

    expect(timeApi.getRelationshipTasks).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      {
        cursor: 'task-next',
        limit: 20,
        status: 'incomplete',
      },
    );
    expect(timeApi.getRelationshipTasks).toHaveBeenNthCalledWith(
      3,
      'relationship-2',
      {
        cursor: undefined,
        limit: 20,
        status: 'incomplete',
      },
    );
    expect(taskQuery?.data?.pages.flatMap((page) => page.items)).toEqual([
      {
        task: assignedToCurrentUser,
        relationshipName: 'Shared space',
      },
      {
        task: availableToEveryone,
        relationshipName: 'Other space',
      },
    ]);
    expect(taskQuery?.hasNextPage).toBe(false);
    queryClient.clear();
  });

  it('advances to the next relationship after an eligible task page', async () => {
    const queryClient = createTestQueryClient();
    const relationships: Pick<RelationshipSummary, 'id' | 'name'>[] = [
      { id: 'relationship-1', name: 'Shared space' },
      { id: 'relationship-2', name: 'Other space' },
    ];
    const firstTask = makeTask('task-1', '2026-10-15T12:00:00.000Z');
    const secondTask = {
      ...makeTask('task-2', '2026-10-16T12:00:00.000Z'),
      relationshipId: 'relationship-2',
    };
    jest
      .mocked(timeApi.getRelationshipTasks)
      .mockResolvedValueOnce({ items: [firstTask] })
      .mockResolvedValueOnce({ items: [secondTask] });

    let taskQuery:
      | ReturnType<typeof useAwaitingDecisionRelationshipTasksInfiniteQuery>
      | undefined;
    function TestConsumer() {
      taskQuery = useAwaitingDecisionRelationshipTasksInfiniteQuery(
        relationships,
        'user-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();
    expect(taskQuery?.hasNextPage).toBe(true);

    await act(async () => {
      await taskQuery?.fetchNextPage();
    });
    await settleQueries();

    expect(timeApi.getRelationshipTasks).toHaveBeenNthCalledWith(
      2,
      'relationship-2',
      {
        cursor: undefined,
        limit: 20,
        status: 'incomplete',
      },
    );
    expect(taskQuery?.data?.pages.flatMap((page) => page.items)).toEqual([
      { task: firstTask, relationshipName: 'Shared space' },
      { task: secondTask, relationshipName: 'Other space' },
    ]);
    expect(taskQuery?.hasNextPage).toBe(false);
    queryClient.clear();
  });

  it('returns an empty awaiting-task list when no tasks are eligible', async () => {
    const queryClient = createTestQueryClient();
    const relationships: Pick<RelationshipSummary, 'id' | 'name'>[] = [
      { id: 'relationship-1', name: 'Shared space' },
    ];
    jest.mocked(timeApi.getRelationshipTasks).mockResolvedValue({ items: [] });

    let taskQuery:
      | ReturnType<typeof useAwaitingDecisionRelationshipTasksInfiniteQuery>
      | undefined;
    function TestConsumer() {
      useAwaitingDecisionRelationshipTasksInfiniteQuery([], 'user-1');
      useAwaitingDecisionRelationshipTasksInfiniteQuery(
        relationships,
        undefined,
      );
      taskQuery = useAwaitingDecisionRelationshipTasksInfiniteQuery(
        relationships,
        'user-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    expect(timeApi.getRelationshipTasks).toHaveBeenCalledTimes(1);
    expect(taskQuery?.data?.pages[0].items).toEqual([]);
    expect(taskQuery?.hasNextPage).toBe(false);
    queryClient.clear();
  });

  it('continues past ineligible task pages and rejects a repeated empty cursor', async () => {
    const queryClient = createTestQueryClient();
    const relationships: Pick<RelationshipSummary, 'id' | 'name'>[] = [
      { id: 'relationship-1', name: 'Shared space' },
    ];
    const ineligibleTask = {
      ...makeTask('task-other', '2026-10-15T12:00:00.000Z'),
      completableByUserIds: ['user-2'],
    };
    jest
      .mocked(timeApi.getRelationshipTasks)
      .mockResolvedValueOnce({
        items: [ineligibleTask],
        nextCursor: 'task-next',
      })
      .mockResolvedValueOnce({
        items: [ineligibleTask],
        nextCursor: 'task-next',
      });

    function TestConsumer() {
      useAwaitingDecisionRelationshipTasksInfiniteQuery(
        relationships,
        'user-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    expect(timeApi.getRelationshipTasks).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      { cursor: 'task-next', limit: 20, status: 'incomplete' },
    );
    expect(
      queryClient.getQueryState(
        timeQueryKeys.awaitingDecision('user-1', relationships),
      )?.error?.message,
    ).toBe('Relationship task pagination did not advance.');
    queryClient.clear();
  });

  it('rejects repeated cursors after returning eligible awaiting tasks', async () => {
    const queryClient = createTestQueryClient();
    const relationships: Pick<RelationshipSummary, 'id' | 'name'>[] = [
      { id: 'relationship-1', name: 'Shared space' },
    ];
    const task = makeTask('task-1', '2026-10-15T12:00:00.000Z');
    jest
      .mocked(timeApi.getRelationshipTasks)
      .mockResolvedValueOnce({ items: [task], nextCursor: 'task-next' })
      .mockResolvedValueOnce({ items: [task], nextCursor: 'task-next' });

    let taskQuery:
      | ReturnType<typeof useAwaitingDecisionRelationshipTasksInfiniteQuery>
      | undefined;
    function TestConsumer() {
      taskQuery = useAwaitingDecisionRelationshipTasksInfiniteQuery(
        relationships,
        'user-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();
    expect(taskQuery?.hasNextPage).toBe(true);

    await act(async () => {
      await taskQuery?.fetchNextPage();
    });
    await settleQueries();

    expect(
      queryClient.getQueryState(
        timeQueryKeys.awaitingDecision('user-1', relationships),
      )?.fetchFailureReason?.message,
    ).toBe('Relationship task pagination did not advance.');
    queryClient.clear();
  });

  it('gates Me Time and task detail queries until all identifiers are available', async () => {
    const queryClient = createTestQueryClient();
    const meTime = makeMeTime('me-time-1', '2026-10-15T12:00:00.000Z');
    const task = makeTask('task-1', '2026-10-15T12:00:00.000Z');
    jest.mocked(timeApi.getMeTimeEntry).mockResolvedValue(meTime);
    jest.mocked(timeApi.getRelationshipTask).mockResolvedValue(task);

    function TestConsumer() {
      useMeTimeEntryQuery(undefined, undefined);
      useMeTimeEntryQuery('relationship-1', undefined);
      useMeTimeEntryQuery('relationship-1', 'disabled-entry', false);
      useMeTimeEntryQuery('relationship-1', 'me-time-1');
      useRelationshipTaskQuery(undefined, undefined);
      useRelationshipTaskQuery('relationship-1', undefined);
      useRelationshipTaskQuery('relationship-1', 'disabled-task', false);
      useRelationshipTaskQuery('relationship-1', 'task-1');
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    expect(timeApi.getMeTimeEntry).toHaveBeenCalledTimes(1);
    expect(timeApi.getMeTimeEntry).toHaveBeenCalledWith(
      'relationship-1',
      'me-time-1',
    );
    expect(timeApi.getRelationshipTask).toHaveBeenCalledTimes(1);
    expect(timeApi.getRelationshipTask).toHaveBeenCalledWith(
      'relationship-1',
      'task-1',
    );
    queryClient.clear();
  });

  it('invalidates the appropriate lists after time mutations', async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const meTime = makeMeTime('me-time-1', '2026-10-15T12:00:00.000Z');
    const updatedMeTime = {
      ...meTime,
      updatedAt: '2026-10-16T12:00:00.000Z',
      updatedByUserId: 'user-1',
    };
    const task = makeTask('task-1', '2026-10-15T12:00:00.000Z');
    const completedTask = {
      ...task,
      completedAt: '2026-10-16T12:00:00.000Z',
      completedByUserId: 'user-1',
    };
    const updatedTask: RelationshipTask = {
      ...task,
      updatedByUserId: 'user-2',
      lastEditedAt: '2026-10-16T12:00:00.000Z',
      lastEditedFields: ['name'],
      name: 'Updated task',
    };
    jest.mocked(timeApi.createMeTime).mockResolvedValue(meTime);
    jest.mocked(timeApi.updateMeTime).mockResolvedValue(updatedMeTime);
    jest.mocked(timeApi.createRelationshipTask).mockResolvedValue(task);
    jest.mocked(timeApi.updateRelationshipTask).mockResolvedValue(updatedTask);
    jest
      .mocked(timeApi.completeRelationshipTask)
      .mockResolvedValue(completedTask);

    let createMeTimeMutation:
      | ReturnType<typeof useCreateMeTimeMutation>
      | undefined;
    let createTaskMutation:
      | ReturnType<typeof useCreateRelationshipTaskMutation>
      | undefined;
    let updateMeTimeMutation:
      | ReturnType<typeof useUpdateMeTimeMutation>
      | undefined;
    let completeTaskMutation:
      | ReturnType<typeof useCompleteRelationshipTaskMutation>
      | undefined;
    let updateTaskMutation:
      | ReturnType<typeof useUpdateRelationshipTaskMutation>
      | undefined;
    function TestConsumer() {
      createMeTimeMutation = useCreateMeTimeMutation('relationship-1');
      updateMeTimeMutation = useUpdateMeTimeMutation('relationship-1');
      createTaskMutation = useCreateRelationshipTaskMutation('relationship-1');
      completeTaskMutation =
        useCompleteRelationshipTaskMutation('relationship-1');
      updateTaskMutation = useUpdateRelationshipTaskMutation('relationship-1');
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    if (
      !createMeTimeMutation ||
      !updateMeTimeMutation ||
      !createTaskMutation ||
      !completeTaskMutation ||
      !updateTaskMutation
    ) {
      throw new Error('Expected time mutations to be mounted.');
    }
    const mountedCreateMeTimeMutation = createMeTimeMutation;
    const mountedUpdateMeTimeMutation = updateMeTimeMutation;
    const mountedCreateTaskMutation = createTaskMutation;
    const mountedCompleteTaskMutation = completeTaskMutation;
    const mountedUpdateTaskMutation = updateTaskMutation;
    await act(async () => {
      await mountedCreateMeTimeMutation.mutateAsync({
        startTime: meTime.startTime,
        endTime: meTime.endTime,
      });
      await mountedUpdateMeTimeMutation.mutateAsync({
        meTimeId: meTime.id,
        input: {
          startTime: updatedMeTime.startTime,
          endTime: updatedMeTime.endTime,
          description: 'Updated entry',
        },
      });
      await mountedCreateTaskMutation.mutateAsync({ name: task.name });
      await mountedUpdateTaskMutation.mutateAsync({
        taskId: task.id,
        input: {
          name: 'Updated task',
          visibleToUserIds: ['user-1'],
          completableByUserIds: ['user-2'],
        },
      });
      expect(
        queryClient.getQueryData(
          timeQueryKeys.taskDetail('relationship-1', task.id),
        ),
      ).toEqual(updatedTask);
      await mountedCompleteTaskMutation.mutateAsync(task.id);
    });

    expect(timeApi.createMeTime).toHaveBeenCalledWith('relationship-1', {
      startTime: meTime.startTime,
      endTime: meTime.endTime,
    });
    expect(timeApi.updateMeTime).toHaveBeenCalledWith(
      'relationship-1',
      meTime.id,
      {
        startTime: updatedMeTime.startTime,
        endTime: updatedMeTime.endTime,
        description: 'Updated entry',
      },
    );
    expect(timeApi.createRelationshipTask).toHaveBeenCalledWith(
      'relationship-1',
      { name: task.name },
    );
    expect(timeApi.updateRelationshipTask).toHaveBeenCalledWith(
      'relationship-1',
      task.id,
      {
        name: 'Updated task',
        visibleToUserIds: ['user-1'],
        completableByUserIds: ['user-2'],
      },
    );
    expect(timeApi.completeRelationshipTask).toHaveBeenCalledWith(
      'relationship-1',
      task.id,
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: timeQueryKeys.meTimeList('relationship-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: timeQueryKeys.taskList('relationship-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: timeQueryKeys.awaitingDecisionPrefix,
    });
    expect(
      queryClient.getQueryData(
        timeQueryKeys.taskDetail('relationship-1', task.id),
      ),
    ).toEqual(completedTask);
    queryClient.clear();
  });

  it('removes deleted time entries and rejects updates without a relationship', async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const meTime = makeMeTime('me-time-1', '2026-10-15T12:00:00.000Z');
    const task = makeTask('task-1', '2026-10-15T12:00:00.000Z');
    jest.mocked(timeApi.deleteMeTime).mockResolvedValue(undefined);
    jest.mocked(timeApi.deleteRelationshipTask).mockResolvedValue(undefined);

    let deleteMeTimeMutation:
      | ReturnType<typeof useDeleteMeTimeMutation>
      | undefined;
    let deleteTaskMutation:
      | ReturnType<typeof useDeleteRelationshipTaskMutation>
      | undefined;
    let updateWithoutRelationship:
      | ReturnType<typeof useUpdateMeTimeMutation>
      | undefined;
    function TestConsumer() {
      deleteMeTimeMutation = useDeleteMeTimeMutation('relationship-1');
      deleteTaskMutation = useDeleteRelationshipTaskMutation('relationship-1');
      updateWithoutRelationship = useUpdateMeTimeMutation(undefined);
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    if (
      !deleteMeTimeMutation ||
      !deleteTaskMutation ||
      !updateWithoutRelationship
    ) {
      throw new Error('Expected time mutations to be mounted.');
    }
    const mountedDeleteMeTimeMutation = deleteMeTimeMutation;
    const mountedDeleteTaskMutation = deleteTaskMutation;
    const mountedUpdateWithoutRelationship = updateWithoutRelationship;
    queryClient.setQueryData(
      timeQueryKeys.meTimeEntry('relationship-1', meTime.id),
      meTime,
    );
    queryClient.setQueryData(
      timeQueryKeys.taskDetail('relationship-1', task.id),
      task,
    );

    await act(async () => {
      await mountedDeleteMeTimeMutation.mutateAsync(meTime.id);
      await mountedDeleteTaskMutation.mutateAsync(task.id);
      await expect(
        mountedUpdateWithoutRelationship.mutateAsync({
          meTimeId: meTime.id,
          input: {
            startTime: meTime.startTime,
            endTime: meTime.endTime,
          },
        }),
      ).rejects.toThrow('A relationship is required to update Me time.');
    });

    expect(timeApi.deleteMeTime).toHaveBeenCalledWith(
      'relationship-1',
      meTime.id,
    );
    expect(timeApi.deleteRelationshipTask).toHaveBeenCalledWith(
      'relationship-1',
      task.id,
    );
    expect(
      queryClient.getQueryState(
        timeQueryKeys.meTimeEntry('relationship-1', meTime.id),
      ),
    ).toBeUndefined();
    expect(
      queryClient.getQueryState(
        timeQueryKeys.taskDetail('relationship-1', task.id),
      ),
    ).toBeUndefined();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: timeQueryKeys.meTimeList('relationship-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: timeQueryKeys.taskList('relationship-1'),
    });
    queryClient.clear();
  });

  it('removes deleted time data when relationship ids are missing', async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const meTime = makeMeTime('me-time-1', '2026-10-15T12:00:00.000Z');
    const task = makeTask('task-1', '2026-10-15T12:00:00.000Z');
    jest.mocked(timeApi.deleteMeTime).mockResolvedValue(undefined);
    jest.mocked(timeApi.deleteRelationshipTask).mockResolvedValue(undefined);

    let deleteMeTimeMutation:
      | ReturnType<typeof useDeleteMeTimeMutation>
      | undefined;
    let deleteTaskMutation:
      | ReturnType<typeof useDeleteRelationshipTaskMutation>
      | undefined;
    function TestConsumer() {
      deleteMeTimeMutation = useDeleteMeTimeMutation(undefined);
      deleteTaskMutation = useDeleteRelationshipTaskMutation(undefined);
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    if (!deleteMeTimeMutation || !deleteTaskMutation) {
      throw new Error('Expected delete mutations to be mounted.');
    }
    const mountedDeleteMeTimeMutation = deleteMeTimeMutation;
    const mountedDeleteTaskMutation = deleteTaskMutation;
    queryClient.setQueryData(timeQueryKeys.meTimeEntry('', meTime.id), meTime);
    queryClient.setQueryData(timeQueryKeys.taskDetail('', task.id), task);

    await act(async () => {
      await mountedDeleteMeTimeMutation.mutateAsync(meTime.id);
      await mountedDeleteTaskMutation.mutateAsync(task.id);
    });

    expect(
      queryClient.getQueryState(timeQueryKeys.meTimeEntry('', meTime.id)),
    ).toBeUndefined();
    expect(
      queryClient.getQueryState(timeQueryKeys.taskDetail('', task.id)),
    ).toBeUndefined();
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: timeQueryKeys.awaitingDecisionPrefix,
    });
    queryClient.clear();
  });
});
