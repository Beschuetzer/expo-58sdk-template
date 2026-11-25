import type {
  CreateDateNightEventInput,
  DateNightEvent,
} from '@expo-50sdk-template/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createDateNightEvent, getDateNightEvents } from '../api';

export const dateNightQueryKeys = {
  eventsPrefix: (relationshipId: string) =>
    ['date-nights', 'events', relationshipId] as const,
  events: (relationshipId: string, month: string) =>
    ['date-nights', 'events', relationshipId, month] as const,
};

export function useDateNightEventsQuery(
  relationshipId: string | undefined,
  month: string,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: () => getDateNightEvents(relationshipId as string, month),
    queryKey: dateNightQueryKeys.events(relationshipId ?? '', month),
  });
}

export function useCreateDateNightEventMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation<DateNightEvent, Error, CreateDateNightEventInput>({
    mutationFn: (input) => createDateNightEvent(relationshipId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: dateNightQueryKeys.eventsPrefix(relationshipId),
      }),
  });
}
