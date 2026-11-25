import type {
  MeTime,
  RelationshipMember,
  RelationshipTask,
} from '@expo-50sdk-template/shared-types';

import { getMemberDisplayName } from '@/features/relationships/utils';

export type MeTimeDateTimeFilters = {
  fromStartTime: Date | null;
  toStartTime: Date | null;
};

export function canUserCompleteRelationshipTask(
  task: RelationshipTask,
  userId: string | undefined,
) {
  if (!userId || task.completedAt) return false;

  return (
    task.completableByUserIds.length === 0 ||
    task.completableByUserIds.includes(userId)
  );
}

export function hasInvalidMeTimeDateTimeFilters(
  filters: MeTimeDateTimeFilters,
) {
  const { fromStartTime, toStartTime } = filters;
  return (
    (fromStartTime !== null && !Number.isFinite(fromStartTime.getTime())) ||
    (toStartTime !== null && !Number.isFinite(toStartTime.getTime())) ||
    (fromStartTime !== null &&
      toStartTime !== null &&
      fromStartTime.getTime() > toStartTime.getTime())
  );
}

export function getMeTimeCreatedByDisplayName(
  entry: MeTime,
  members: RelationshipMember[],
) {
  return getMemberDisplayName(entry.createdByUserId, members);
}

function matchesSearch(values: (string | undefined)[], search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return (
    !normalizedSearch ||
    values.some((value) =>
      value?.toLocaleLowerCase().includes(normalizedSearch),
    )
  );
}

export function filterMeTime(
  entries: readonly MeTime[],
  search: string,
  members: RelationshipMember[],
  filters: MeTimeDateTimeFilters = {
    fromStartTime: null,
    toStartTime: null,
  },
): MeTime[] {
  if (hasInvalidMeTimeDateTimeFilters(filters)) return [];

  const fromStartTime = filters.fromStartTime?.getTime();
  const toStartTime = filters.toStartTime?.getTime();

  return entries.filter((entry) => {
    const startTime = Date.parse(entry.startTime);
    const matchesStartTime =
      fromStartTime === undefined && toStartTime === undefined
        ? true
        : Number.isFinite(startTime) &&
          (fromStartTime === undefined || startTime >= fromStartTime) &&
          (toStartTime === undefined || startTime <= toStartTime);

    return (
      matchesStartTime &&
      matchesSearch(
        [
          entry.description,
          entry.startTime,
          entry.endTime,
          entry.createdAt,
          entry.createdByUserId,
          getMeTimeCreatedByDisplayName(entry, members),
        ],
        search,
      )
    );
  });
}

export function filterRelationshipTasks(
  tasks: readonly RelationshipTask[],
  search: string,
  members: RelationshipMember[],
): RelationshipTask[] {
  return tasks.filter((task) =>
    matchesSearch(
      [
        task.name,
        task.createdAt,
        task.dueDate,
        task.createdByUserId,
        getMemberDisplayName(task.createdByUserId, members),
        task.completedAt,
        task.completedByUserId,
        task.completedByUserId
          ? getMemberDisplayName(task.completedByUserId, members)
          : undefined,
        ...task.visibleToUserIds.map((userId) =>
          getMemberDisplayName(userId, members),
        ),
        ...task.completableByUserIds.map((userId) =>
          getMemberDisplayName(userId, members),
        ),
      ],
      search,
    ),
  );
}
