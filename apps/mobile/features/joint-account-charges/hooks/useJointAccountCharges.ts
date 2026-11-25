import type {
  CreateJointAccountChargeInput,
  JointAccountCharge,
  JointAccountChargeListFilters,
  JointAccountChargeListResponse,
  UpdateJointAccountChargeInput,
} from '@expo-50sdk-template/shared-types';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import {
  createJointAccountCharge,
  deleteJointAccountCharge,
  getJointAccountChargeCalendarMonth,
  getJointAccountCharge,
  getJointAccountCharges,
  markAllJointAccountChargesPaid,
  markJointAccountChargePaid,
  updateJointAccountCharge,
} from '../api';

import {
  getCalendarMonthFromCompleteList,
  type CalendarMonthData,
} from '@/utils/calendar';
import { logDebug } from '@/utils/logging';

const JOINT_ACCOUNT_CHARGE_PAGE_SIZE = 20;

export const jointAccountChargeQueryKeys = {
  detail: (chargeId: string) =>
    ['joint-account-charges', 'detail', chargeId] as const,
  list: (relationshipId: string, filters: JointAccountChargeListFilters) =>
    ['joint-account-charges', 'list', relationshipId, filters] as const,
  listPrefix: (relationshipId: string) =>
    ['joint-account-charges', 'list', relationshipId] as const,
  calendarPrefix: (relationshipId: string) =>
    ['joint-account-charges', 'calendar', relationshipId] as const,
  calendar: (relationshipId: string, month: string) =>
    ['joint-account-charges', 'calendar', relationshipId, month] as const,
};

export function useJointAccountChargesInfiniteQuery(
  relationshipId: string | undefined,
  filters: JointAccountChargeListFilters = {},
  enabled = true,
) {
  return useInfiniteQuery<
    JointAccountChargeListResponse,
    Error,
    InfiniteData<JointAccountChargeListResponse>,
    ReturnType<typeof jointAccountChargeQueryKeys.list>,
    string | undefined
  >({
    enabled: Boolean(relationshipId) && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getJointAccountCharges(relationshipId as string, {
        ...filters,
        cursor: pageParam,
        limit: JOINT_ACCOUNT_CHARGE_PAGE_SIZE,
      }),
    queryKey: jointAccountChargeQueryKeys.list(relationshipId ?? '', filters),
  });
}

export function useJointAccountChargeCalendarQuery(
  relationshipId: string | undefined,
  month: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const listQueryKey = jointAccountChargeQueryKeys.list(
    relationshipId ?? '',
    {},
  );
  return useQuery<CalendarMonthData<JointAccountCharge>, Error>({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: async () => {
      const listQuery = queryClient.getQueryCache().find({
        exact: true,
        queryKey: listQueryKey,
      });
      const listData =
        queryClient.getQueryData<InfiniteData<JointAccountChargeListResponse>>(
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
              (charge) => charge.chargeDate,
            )
          : undefined;
      const listPageCount = listData?.pages.length ?? 0;

      if (cachedMonth) {
        logDebug('joint_account_charge_calendar_cache_hit', {
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
          : listQuery.isStale()
            ? 'list_query_stale'
            : listPageCount === 0
              ? 'list_cache_empty'
              : 'list_cache_incomplete';
      logDebug('joint_account_charge_calendar_cache_miss', {
        listPageCount,
        month,
        reason: fallbackReason,
      });
      logDebug('joint_account_charge_calendar_month_fetch_started', {
        month,
        reason: fallbackReason,
      });
      const monthData = await getJointAccountChargeCalendarMonth(
        relationshipId as string,
        month,
      );
      logDebug('joint_account_charge_calendar_month_fetch_completed', {
        entryCount: monthData.entries.length,
        month,
      });
      return monthData;
    },
    queryKey: jointAccountChargeQueryKeys.calendar(relationshipId ?? '', month),
  });
}

export function useJointAccountChargeQuery(
  chargeId: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(chargeId) && enabled,
    queryFn: () => getJointAccountCharge(chargeId as string),
    queryKey: jointAccountChargeQueryKeys.detail(chargeId ?? ''),
  });
}

export function useCreateJointAccountChargeMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJointAccountChargeInput) =>
      createJointAccountCharge(relationshipId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: jointAccountChargeQueryKeys.listPrefix(relationshipId),
      });
      queryClient.invalidateQueries({
        queryKey: jointAccountChargeQueryKeys.calendarPrefix(relationshipId),
      });
    },
  });
}

export function useUpdateJointAccountChargeMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      chargeId,
      input,
    }: {
      chargeId: string;
      input: UpdateJointAccountChargeInput;
    }) => updateJointAccountCharge(chargeId, input),
    onSuccess: (charge: JointAccountCharge) => {
      queryClient.setQueryData(
        jointAccountChargeQueryKeys.detail(charge.id),
        charge,
      );
      if (relationshipId) {
        queryClient.invalidateQueries({
          queryKey: jointAccountChargeQueryKeys.listPrefix(relationshipId),
        });
        queryClient.invalidateQueries({
          queryKey: jointAccountChargeQueryKeys.calendarPrefix(relationshipId),
        });
      }
    },
  });
}

export function useMarkJointAccountChargePaidMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markJointAccountChargePaid,
    onSuccess: (charge: JointAccountCharge) => {
      queryClient.setQueryData(
        jointAccountChargeQueryKeys.detail(charge.id),
        charge,
      );
      if (relationshipId) {
        queryClient.invalidateQueries({
          queryKey: jointAccountChargeQueryKeys.listPrefix(relationshipId),
        });
        queryClient.invalidateQueries({
          queryKey: jointAccountChargeQueryKeys.calendarPrefix(relationshipId),
        });
      }
    },
  });
}

export function useMarkAllJointAccountChargesPaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllJointAccountChargesPaid,
    onSuccess: (_result, relationshipId) => {
      queryClient.invalidateQueries({
        queryKey: jointAccountChargeQueryKeys.listPrefix(relationshipId),
      });
      queryClient.invalidateQueries({
        queryKey: jointAccountChargeQueryKeys.calendarPrefix(relationshipId),
      });
    },
  });
}

export function useDeleteJointAccountChargeMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteJointAccountCharge,
    onSuccess: async (_result, chargeId) => {
      queryClient.removeQueries({
        queryKey: jointAccountChargeQueryKeys.detail(chargeId),
        exact: true,
      });
      if (relationshipId) {
        await queryClient.invalidateQueries({
          queryKey: jointAccountChargeQueryKeys.listPrefix(relationshipId),
        });
        await queryClient.invalidateQueries({
          queryKey: jointAccountChargeQueryKeys.calendarPrefix(relationshipId),
        });
      }
    },
  });
}
