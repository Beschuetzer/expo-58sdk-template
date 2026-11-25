import type {
  JointAccountCharge,
  JointAccountChargeListResponse,
} from '@expo-50sdk-template/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  jointAccountChargeQueryKeys,
  useCreateJointAccountChargeMutation,
  useJointAccountChargeCalendarQuery,
  useDeleteJointAccountChargeMutation,
  useJointAccountChargeQuery,
  useJointAccountChargesInfiniteQuery,
  useMarkAllJointAccountChargesPaidMutation,
  useMarkJointAccountChargePaidMutation,
  useUpdateJointAccountChargeMutation,
} from './useJointAccountCharges';
import * as jointAccountChargesApi from '../api';

import { logDebug } from '@/utils/logging';

jest.mock('../api', () => ({
  createJointAccountCharge: jest.fn(),
  deleteJointAccountCharge: jest.fn(),
  getJointAccountCharge: jest.fn(),
  getJointAccountChargeCalendarMonth: jest.fn(),
  getJointAccountCharges: jest.fn(),
  markAllJointAccountChargesPaid: jest.fn(),
  markJointAccountChargePaid: jest.fn(),
  updateJointAccountCharge: jest.fn(),
}));

jest.mock('@/utils/logging', () => ({
  logDebug: jest.fn(),
}));

function makeCharge(id: string, chargeDate: string): JointAccountCharge {
  return {
    id,
    relationshipId: 'relationship-1',
    createdByUserId: 'user-1',
    name: id,
    amountMinorUnits: 1200,
    chargeDate,
    status: 'unpaid',
    createdAt: chargeDate,
    updatedAt: chargeDate,
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

describe('joint account charge calendar query cache reuse', () => {
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
    observeList = true,
  ) {
    let calendarQuery:
      | ReturnType<typeof useJointAccountChargeCalendarQuery>
      | undefined;

    function ListObserver() {
      useJointAccountChargesInfiniteQuery('relationship-1');
      return null;
    }

    function TestConsumer() {
      calendarQuery = useJointAccountChargeCalendarQuery(
        'relationship-1',
        '2026-10',
      );
      return observeList ? <ListObserver /> : null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
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

  it('derives the month from the fresh complete list cache', async () => {
    const queryClient = createTestQueryClient();
    const earliest = makeCharge('earliest', '2026-09-30T12:00:00.000Z');
    const monthEntry = makeCharge('october', '2026-10-15T12:00:00.000Z');
    const latest = makeCharge('latest', '2026-11-02T12:00:00.000Z');
    const listData: InfiniteData<JointAccountChargeListResponse> = {
      pages: [{ items: [latest, monthEntry, earliest] }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(
      jointAccountChargeQueryKeys.list('relationship-1', {}),
      listData,
    );

    const result = await mountCalendarQuery(queryClient);

    expect(result.calendarQuery?.data).toEqual({
      earliestDate: earliest.chargeDate,
      latestDate: latest.chargeDate,
      entries: [monthEntry],
    });
    expect(
      jointAccountChargesApi.getJointAccountChargeCalendarMonth,
    ).not.toHaveBeenCalled();
    expect(
      jointAccountChargesApi.getJointAccountCharges,
    ).not.toHaveBeenCalled();
    expect(logDebug).toHaveBeenCalledWith(
      'joint_account_charge_calendar_cache_hit',
      {
        listPageCount: 1,
        month: '2026-10',
        monthEntryCount: 1,
      },
    );
    queryClient.clear();
  });

  it('fetches the month when list pagination is incomplete', async () => {
    const queryClient = createTestQueryClient();
    const monthEntry = makeCharge('october', '2026-10-15T12:00:00.000Z');
    const fallbackData = {
      earliestDate: '2026-09-30T12:00:00.000Z',
      latestDate: '2026-11-02T12:00:00.000Z',
      entries: [monthEntry],
    };
    queryClient.setQueryData(
      jointAccountChargeQueryKeys.list('relationship-1', {}),
      {
        pages: [{ items: [monthEntry], nextCursor: 'next-page' }],
        pageParams: [undefined],
      } satisfies InfiniteData<JointAccountChargeListResponse>,
    );
    jest
      .mocked(jointAccountChargesApi.getJointAccountChargeCalendarMonth)
      .mockResolvedValue(fallbackData);

    const result = await mountCalendarQuery(queryClient);

    expect(
      jointAccountChargesApi.getJointAccountChargeCalendarMonth,
    ).toHaveBeenCalledWith('relationship-1', '2026-10');
    expect(result.calendarQuery?.data).toEqual(fallbackData);
    expect(logDebug).toHaveBeenCalledWith(
      'joint_account_charge_calendar_cache_miss',
      {
        listPageCount: 1,
        month: '2026-10',
        reason: 'list_cache_incomplete',
      },
    );
    queryClient.clear();
  });

  it('does not reuse a list cache without an active list observer', async () => {
    const queryClient = createTestQueryClient();
    const monthEntry = makeCharge('october', '2026-10-15T12:00:00.000Z');
    const fallbackData = {
      earliestDate: monthEntry.chargeDate,
      latestDate: monthEntry.chargeDate,
      entries: [monthEntry],
    };
    queryClient.setQueryData(
      jointAccountChargeQueryKeys.list('relationship-1', {}),
      {
        pages: [{ items: [monthEntry] }],
        pageParams: [undefined],
      } satisfies InfiniteData<JointAccountChargeListResponse>,
    );
    jest
      .mocked(jointAccountChargesApi.getJointAccountChargeCalendarMonth)
      .mockResolvedValue(fallbackData);

    await mountCalendarQuery(queryClient, false);

    expect(
      jointAccountChargesApi.getJointAccountChargeCalendarMonth,
    ).toHaveBeenCalledWith('relationship-1', '2026-10');
    expect(logDebug).toHaveBeenCalledWith(
      'joint_account_charge_calendar_cache_miss',
      {
        listPageCount: 1,
        month: '2026-10',
        reason: 'list_query_inactive',
      },
    );
    queryClient.clear();
  });

  it('fetches charge details and respects disabled query identifiers', async () => {
    const queryClient = createTestQueryClient();
    const charge = makeCharge('charge-1', '2026-10-15T12:00:00.000Z');
    jest
      .mocked(jointAccountChargesApi.getJointAccountCharge)
      .mockResolvedValueOnce(charge);
    let queries:
      | {
          enabled: ReturnType<typeof useJointAccountChargeQuery>;
          missingId: ReturnType<typeof useJointAccountChargeQuery>;
          disabled: ReturnType<typeof useJointAccountChargeQuery>;
        }
      | undefined;

    function TestConsumer() {
      queries = {
        enabled: useJointAccountChargeQuery('charge-1'),
        missingId: useJointAccountChargeQuery(undefined),
        disabled: useJointAccountChargeQuery('charge-2', false),
      };
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

    expect(jointAccountChargesApi.getJointAccountCharge).toHaveBeenCalledTimes(
      1,
    );
    expect(jointAccountChargesApi.getJointAccountCharge).toHaveBeenCalledWith(
      'charge-1',
    );
    expect(queries?.enabled.data).toEqual(charge);
    expect(queries?.missingId.fetchStatus).toBe('idle');
    expect(queries?.disabled.fetchStatus).toBe('idle');
    queryClient.clear();
  });

  it('fetches joint account charge pages with the requested cursor and disables missing relationships', async () => {
    const queryClient = createTestQueryClient();
    const first = makeCharge('first', '2026-10-15T12:00:00.000Z');
    const second = makeCharge('second', '2026-10-16T12:00:00.000Z');
    jest
      .mocked(jointAccountChargesApi.getJointAccountCharges)
      .mockResolvedValueOnce({ items: [first], nextCursor: 'next-page' })
      .mockResolvedValueOnce({ items: [second] });
    let queries:
      | {
          enabled: ReturnType<typeof useJointAccountChargesInfiniteQuery>;
          missingId: ReturnType<typeof useJointAccountChargesInfiniteQuery>;
          disabled: ReturnType<typeof useJointAccountChargesInfiniteQuery>;
        }
      | undefined;

    function TestConsumer() {
      queries = {
        enabled: useJointAccountChargesInfiniteQuery('relationship-1'),
        missingId: useJointAccountChargesInfiniteQuery(undefined),
        disabled: useJointAccountChargesInfiniteQuery(
          'relationship-2',
          {},
          false,
        ),
      };
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
    await act(async () => {
      await queries?.enabled.fetchNextPage();
    });
    await settleQueries();

    expect(jointAccountChargesApi.getJointAccountCharges).toHaveBeenCalledTimes(
      2,
    );
    expect(
      jointAccountChargesApi.getJointAccountCharges,
    ).toHaveBeenNthCalledWith(1, 'relationship-1', {
      cursor: undefined,
      limit: 20,
    });
    expect(
      jointAccountChargesApi.getJointAccountCharges,
    ).toHaveBeenNthCalledWith(2, 'relationship-1', {
      cursor: 'next-page',
      limit: 20,
    });
    expect(
      queryClient
        .getQueryData<
          InfiniteData<JointAccountChargeListResponse>
        >(jointAccountChargeQueryKeys.list('relationship-1', {}))
        ?.pages.map((page) => page.items[0]?.id),
    ).toEqual(['first', 'second']);
    expect(queries?.missingId.fetchStatus).toBe('idle');
    expect(queries?.disabled.fetchStatus).toBe('idle');
    queryClient.clear();
  });

  it('invalidates list and calendar data after marking all charges paid', async () => {
    const queryClient = createTestQueryClient();
    jest
      .mocked(jointAccountChargesApi.markAllJointAccountChargesPaid)
      .mockResolvedValue({ updatedCount: 2 });
    let mutation:
      | ReturnType<typeof useMarkAllJointAccountChargesPaidMutation>
      | undefined;

    function TestConsumer() {
      mutation = useMarkAllJointAccountChargesPaidMutation();
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    const mountedMutation = mutation;
    if (!mountedMutation) {
      throw new Error('Bulk charge mutation hook did not mount.');
    }
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await mountedMutation.mutateAsync('relationship-1');
    });

    expect(
      jointAccountChargesApi.markAllJointAccountChargesPaid,
    ).toHaveBeenCalledWith('relationship-1');
    expect(
      invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey),
    ).toEqual([
      jointAccountChargeQueryKeys.listPrefix('relationship-1'),
      jointAccountChargeQueryKeys.calendarPrefix('relationship-1'),
    ]);
    queryClient.clear();
  });

  it('falls back to the calendar endpoint when no complete list cache exists', async () => {
    const queryClient = createTestQueryClient();
    const fallbackData = {
      earliestDate: '2026-10-01T00:00:00.000Z',
      latestDate: '2026-10-31T23:59:59.999Z',
      entries: [],
    };
    jest
      .mocked(jointAccountChargesApi.getJointAccountChargeCalendarMonth)
      .mockResolvedValue(fallbackData);

    await mountCalendarQuery(queryClient, false);

    expect(logDebug).toHaveBeenCalledWith(
      'joint_account_charge_calendar_cache_miss',
      {
        listPageCount: 0,
        month: '2026-10',
        reason: 'list_query_not_found',
      },
    );
    expect(
      jointAccountChargesApi.getJointAccountChargeCalendarMonth,
    ).toHaveBeenCalledWith('relationship-1', '2026-10');
    queryClient.clear();
  });

  it('uses the calendar endpoint for empty and stale list caches', async () => {
    const queryClient = createTestQueryClient();
    const fallbackData = {
      earliestDate: '2026-10-01T00:00:00.000Z',
      latestDate: '2026-10-31T23:59:59.999Z',
      entries: [],
    };
    jest
      .mocked(jointAccountChargesApi.getJointAccountChargeCalendarMonth)
      .mockResolvedValue(fallbackData);
    const listKey = jointAccountChargeQueryKeys.list('relationship-1', {});
    queryClient.setQueryData<InfiniteData<JointAccountChargeListResponse>>(
      listKey,
      { pages: [], pageParams: [] },
    );

    await mountCalendarQuery(queryClient);

    expect(logDebug).toHaveBeenCalledWith(
      'joint_account_charge_calendar_cache_miss',
      {
        listPageCount: 0,
        month: '2026-10',
        reason: 'list_cache_empty',
      },
    );
    act(() => mountedRenderer?.unmount());
    mountedRenderer = undefined;

    const staleQueryClient = createTestQueryClient();
    const charge = makeCharge('stale', '2026-10-15T12:00:00.000Z');
    staleQueryClient.setQueryData<InfiniteData<JointAccountChargeListResponse>>(
      listKey,
      { pages: [{ items: [charge] }], pageParams: [undefined] },
      { updatedAt: Date.now() - 120_000 },
    );
    await mountCalendarQuery(staleQueryClient);

    expect(logDebug).toHaveBeenCalledWith(
      'joint_account_charge_calendar_cache_miss',
      {
        listPageCount: 1,
        month: '2026-10',
        reason: 'list_query_stale',
      },
    );
    staleQueryClient.clear();
    queryClient.clear();
  });

  it('removes deleted charge detail without invalidating absent relationship caches', async () => {
    const queryClient = createTestQueryClient();
    const charge = makeCharge('charge-1', '2026-10-15T12:00:00.000Z');
    const updatedCharge = { ...charge, name: 'Updated charge' };
    const paidCharge = { ...updatedCharge, status: 'paid' as const };
    queryClient.setQueryData(
      jointAccountChargeQueryKeys.detail(charge.id),
      charge,
    );
    jest
      .mocked(jointAccountChargesApi.updateJointAccountCharge)
      .mockResolvedValueOnce(updatedCharge);
    jest
      .mocked(jointAccountChargesApi.markJointAccountChargePaid)
      .mockResolvedValueOnce(paidCharge);
    jest
      .mocked(jointAccountChargesApi.deleteJointAccountCharge)
      .mockResolvedValueOnce(undefined);
    let mutations:
      | {
          update: ReturnType<typeof useUpdateJointAccountChargeMutation>;
          markPaid: ReturnType<typeof useMarkJointAccountChargePaidMutation>;
          deleteCharge: ReturnType<typeof useDeleteJointAccountChargeMutation>;
        }
      | undefined;

    function TestConsumer() {
      mutations = {
        update: useUpdateJointAccountChargeMutation(undefined),
        markPaid: useMarkJointAccountChargePaidMutation(undefined),
        deleteCharge: useDeleteJointAccountChargeMutation(undefined),
      };
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    const mountedMutations = mutations;
    if (!mountedMutations) {
      throw new Error('Charge mutation hooks did not mount.');
    }
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await mountedMutations.update.mutateAsync({
        chargeId: charge.id,
        input: {
          name: updatedCharge.name,
          amountMinorUnits: updatedCharge.amountMinorUnits,
          chargeDate: updatedCharge.chargeDate,
        },
      });
      await mountedMutations.markPaid.mutateAsync(charge.id);
      await mountedMutations.deleteCharge.mutateAsync(charge.id);
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(jointAccountChargeQueryKeys.detail(charge.id)),
    ).toBeUndefined();
    expect(
      jointAccountChargesApi.deleteJointAccountCharge,
    ).toHaveBeenCalledWith(charge.id);
    queryClient.clear();
  });

  it('invalidates the calendar cache when charge data changes', async () => {
    const queryClient = createTestQueryClient();
    const createdCharge = makeCharge('created', '2026-10-15T12:00:00.000Z');
    const updatedCharge = { ...createdCharge, name: 'Updated charge' };
    const paidCharge = { ...createdCharge, status: 'paid' as const };
    jest
      .mocked(jointAccountChargesApi.createJointAccountCharge)
      .mockResolvedValue(createdCharge);
    jest
      .mocked(jointAccountChargesApi.updateJointAccountCharge)
      .mockResolvedValue(updatedCharge);
    jest
      .mocked(jointAccountChargesApi.markJointAccountChargePaid)
      .mockResolvedValue(paidCharge);
    let mutations:
      | {
          create: ReturnType<typeof useCreateJointAccountChargeMutation>;
          update: ReturnType<typeof useUpdateJointAccountChargeMutation>;
          markPaid: ReturnType<typeof useMarkJointAccountChargePaidMutation>;
        }
      | undefined;

    function TestConsumer() {
      mutations = {
        create: useCreateJointAccountChargeMutation('relationship-1'),
        update: useUpdateJointAccountChargeMutation('relationship-1'),
        markPaid: useMarkJointAccountChargePaidMutation('relationship-1'),
      };
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const mountedMutations = mutations;
    if (!mountedMutations)
      throw new Error('Charge mutation hooks did not mount.');

    await act(async () => {
      await mountedMutations.create.mutateAsync({
        name: 'New charge',
        amountMinorUnits: 1200,
      });
      await mountedMutations.update.mutateAsync({
        chargeId: createdCharge.id,
        input: {
          name: updatedCharge.name,
          amountMinorUnits: updatedCharge.amountMinorUnits,
          chargeDate: updatedCharge.chargeDate,
        },
      });
      await mountedMutations.markPaid.mutateAsync(createdCharge.id);
    });

    const invalidatedKeys = invalidateQueries.mock.calls.map(
      ([filters]) => filters?.queryKey,
    );
    expect(invalidatedKeys).toEqual([
      jointAccountChargeQueryKeys.listPrefix('relationship-1'),
      jointAccountChargeQueryKeys.calendarPrefix('relationship-1'),
      jointAccountChargeQueryKeys.listPrefix('relationship-1'),
      jointAccountChargeQueryKeys.calendarPrefix('relationship-1'),
      jointAccountChargeQueryKeys.listPrefix('relationship-1'),
      jointAccountChargeQueryKeys.calendarPrefix('relationship-1'),
    ]);
    queryClient.clear();
  });
});
