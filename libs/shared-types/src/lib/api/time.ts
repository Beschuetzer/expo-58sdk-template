import type { CalendarDateBounds } from './calendar';

export type MeTime = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  updatedByUserId?: string;
  startTime: string;
  endTime: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMeTimeInput = {
  startTime: string;
  endTime: string;
  description?: string;
};

export type UpdateMeTimeInput = CreateMeTimeInput;

export type MeTimeListFilters = {
  cursor?: string;
  limit?: number;
  startTimeFrom?: string;
  startTimeBefore?: string;
};

export type MeTimeListResponse = {
  items: MeTime[];
  nextCursor?: string;
  earliestStartTime?: string | null;
  latestStartTime?: string | null;
};

export type RelationshipTask = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  updatedByUserId?: string;
  lastEditedAt?: string;
  lastEditedFields?: RelationshipTaskEditableField[];
  name: string;
  dueDate?: string;
  reminderFrequencyDays?: number;
  visibleToUserIds: string[];
  completableByUserIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completedByUserId?: string;
};

export type RelationshipTaskEditableField =
  | 'name'
  | 'dueDate'
  | 'reminderFrequencyDays'
  | 'visibleToUserIds'
  | 'completableByUserIds';

export type CreateRelationshipTaskInput = {
  name: string;
  dueDate?: string;
  reminderFrequencyDays?: number;
  visibleToUserIds?: string[];
  completableByUserIds?: string[];
};

export type UpdateRelationshipTaskInput = Omit<
  CreateRelationshipTaskInput,
  'visibleToUserIds' | 'completableByUserIds'
> & {
  visibleToUserIds: string[];
  completableByUserIds: string[];
};

export type RelationshipTaskStatus = 'incomplete' | 'completed';

export type RelationshipTaskListFilters = {
  cursor?: string;
  limit?: number;
  status?: RelationshipTaskStatus;
  dateFrom?: string;
  dateBefore?: string;
};

export type RelationshipTaskListResponse = {
  items: RelationshipTask[];
  nextCursor?: string;
  calendarDateBounds?: CalendarDateBounds;
};
