import type {
  CreateSexEventInput,
  FlipSexCoinInput,
  FlipSexCoinResponse,
  SexCoinSide,
  SexDailyStatus,
} from '@expo-50sdk-template/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SexEventCalendarMonth } from '../api';
import {
  createSexEvent,
  flipSexCoin,
  getLocalDayKey,
  getSexEvents,
  getSexDailyStatus,
  resetTodaySexCoinFlip,
} from '../api';

function normalizeMemberUserIds(memberUserIds: string[]) {
  return [...memberUserIds].sort();
}

export const sexQueryKeys = {
  statusPrefix: (relationshipId: string) =>
    ['sex', 'status', relationshipId] as const,
  status: (
    relationshipId: string,
    memberUserIds: string[],
    today = getLocalDayKey(),
  ) =>
    [
      'sex',
      'status',
      relationshipId,
      normalizeMemberUserIds(memberUserIds),
      today,
    ] as const,
  eventsPrefix: (relationshipId: string) =>
    ['sex', 'events', relationshipId] as const,
  events: (relationshipId: string, month: string) =>
    ['sex', 'events', relationshipId, month] as const,
};

export function useSexDailyStatusQuery(
  relationshipId: string | undefined,
  memberUserIds: string[],
  enabled = true,
) {
  const selectedMemberUserIds = normalizeMemberUserIds(memberUserIds);
  const today = getLocalDayKey();
  return useQuery<SexDailyStatus, Error>({
    enabled:
      Boolean(relationshipId) && selectedMemberUserIds.length >= 2 && enabled,
    queryFn: () =>
      getSexDailyStatus(relationshipId as string, selectedMemberUserIds, today),
    queryKey: sexQueryKeys.status(
      relationshipId ?? '',
      selectedMemberUserIds,
      today,
    ),
  });
}

export function useSexEventsQuery(
  relationshipId: string | undefined,
  month: string,
  enabled = true,
) {
  return useQuery<SexEventCalendarMonth, Error>({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: () => getSexEvents(relationshipId as string, month),
    queryKey: sexQueryKeys.events(relationshipId ?? '', month),
  });
}

export function useFlipSexCoinMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation<FlipSexCoinResponse, Error, FlipSexCoinInput>({
    mutationFn: (input) => flipSexCoin(relationshipId, input),
    onSuccess: async (response, input) => {
      queryClient.setQueryData(
        sexQueryKeys.status(
          relationshipId,
          input.memberUserIds,
          response.status.today,
        ),
        response.status,
      );
      await queryClient.invalidateQueries({
        queryKey: sexQueryKeys.statusPrefix(relationshipId),
      });
    },
  });
}

export function useResetTodaySexCoinFlipMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => resetTodaySexCoinFlip(relationshipId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: sexQueryKeys.statusPrefix(relationshipId),
      }),
  });
}

export function useCreateSexEventMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSexEventInput) =>
      createSexEvent(relationshipId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: sexQueryKeys.statusPrefix(relationshipId),
        }),
        queryClient.invalidateQueries({
          queryKey: sexQueryKeys.eventsPrefix(relationshipId),
        }),
      ]);
    },
  });
}

export type { SexCoinSide };
