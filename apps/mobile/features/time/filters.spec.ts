import type {
  MeTime,
  RelationshipMember,
  RelationshipTask,
} from '@expo-50sdk-template/shared-types';

import {
  canUserCompleteRelationshipTask,
  filterMeTime,
  filterRelationshipTasks,
  getMeTimeCreatedByDisplayName,
  hasInvalidMeTimeDateTimeFilters,
  type MeTimeDateTimeFilters,
} from './filters';

const members: RelationshipMember[] = [
  {
    id: 'member-record-1',
    relationshipId: 'relationship-1',
    userId: 'member-1',
    displayName: 'Alex',
    role: 'owner',
    active: true,
  },
  {
    id: 'member-record-2',
    relationshipId: 'relationship-1',
    userId: 'member-2',
    displayName: 'Sam',
    role: 'member',
    active: true,
  },
  {
    id: 'member-record-3',
    relationshipId: 'relationship-1',
    userId: 'member-3',
    displayName: 'Robin',
    role: 'member',
    active: true,
  },
];

const entries: MeTime[] = [
  {
    id: 'me-time-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'member-1',
    startTime: '2026-10-29T10:00:00.000Z',
    endTime: '2026-10-29T11:00:00.000Z',
    description: 'Read a book',
    createdAt: '2026-10-29T11:05:00.000Z',
    updatedAt: '2026-10-29T11:05:00.000Z',
  },
  {
    id: 'me-time-2',
    relationshipId: 'relationship-1',
    createdByUserId: 'member-2',
    startTime: '2026-10-28T10:00:00.000Z',
    endTime: '2026-10-28T11:00:00.000Z',
    createdAt: '2026-10-28T11:05:00.000Z',
    updatedAt: '2026-10-28T11:05:00.000Z',
  },
];

const tasks: RelationshipTask[] = [
  {
    id: 'task-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'member-1',
    name: 'Go grocery shopping',
    visibleToUserIds: ['member-1', 'member-2'],
    completableByUserIds: ['member-1', 'member-2'],
    createdAt: '2026-10-29T11:05:00.000Z',
    updatedAt: '2026-10-29T12:05:00.000Z',
    completedAt: '2026-10-29T12:05:00.000Z',
    completedByUserId: 'member-2',
  },
  {
    id: 'task-2',
    relationshipId: 'relationship-1',
    createdByUserId: 'member-1',
    name: 'Take out recycling',
    visibleToUserIds: ['member-3'],
    completableByUserIds: ['member-3'],
    createdAt: '2026-10-29T11:05:00.000Z',
    updatedAt: '2026-10-29T11:05:00.000Z',
  },
];

describe('filterMeTime', () => {
  it('searches descriptions and relationship member display names', () => {
    expect(filterMeTime(entries, 'read a book', members)).toEqual([entries[0]]);
    expect(filterMeTime(entries, 'sam', members)).toEqual([entries[1]]);
  });

  it('includes entries with no description for other searches', () => {
    expect(filterMeTime(entries, '2026-10-28', members)).toEqual([entries[1]]);
  });

  it('filters entries by an inclusive start date-time range', () => {
    const entryBeforeRange = {
      ...entries[0],
      id: 'me-time-before-range',
      startTime: '2026-10-29T09:59:00.000Z',
    };
    const entryAtEnd = {
      ...entries[0],
      id: 'me-time-at-end',
      startTime: '2026-10-29T10:30:00.000Z',
    };
    const filters: MeTimeDateTimeFilters = {
      fromStartTime: new Date('2026-10-29T10:00:00.000Z'),
      toStartTime: new Date('2026-10-29T10:30:00.000Z'),
    };

    expect(
      filterMeTime(
        [entryBeforeRange, entries[0], entryAtEnd],
        '',
        members,
        filters,
      ),
    ).toEqual([entries[0], entryAtEnd]);
  });

  it('rejects reversed or invalid start date-time ranges', () => {
    const reversedFilters: MeTimeDateTimeFilters = {
      fromStartTime: new Date('2026-10-29T11:00:00.000Z'),
      toStartTime: new Date('2026-10-29T10:00:00.000Z'),
    };
    const invalidFilters: MeTimeDateTimeFilters = {
      fromStartTime: new Date(Number.NaN),
      toStartTime: null,
    };

    expect(hasInvalidMeTimeDateTimeFilters(reversedFilters)).toBe(true);
    expect(filterMeTime(entries, '', members, reversedFilters)).toEqual([]);
    expect(hasInvalidMeTimeDateTimeFilters(invalidFilters)).toBe(true);
  });

  it('sorts entries by creator display name instead of the stored user ID', () => {
    const membersWithDifferentNameOrder = [
      { ...members[0], displayName: 'Zoe' },
      { ...members[1], displayName: 'Alex' },
    ];
    const sortedEntries = [...entries].sort((left, right) =>
      getMeTimeCreatedByDisplayName(
        left,
        membersWithDifferentNameOrder,
      ).localeCompare(
        getMeTimeCreatedByDisplayName(right, membersWithDifferentNameOrder),
      ),
    );

    expect(sortedEntries.map(({ id }) => id)).toEqual([
      'me-time-2',
      'me-time-1',
    ]);
  });
});

describe('filterRelationshipTasks', () => {
  it('searches task names and the member who last completed them', () => {
    expect(
      filterRelationshipTasks(tasks, 'grocery', members).map(({ id }) => id),
    ).toEqual(['task-1']);
    expect(
      filterRelationshipTasks(tasks, 'sam', members).map(({ id }) => id),
    ).toEqual(['task-1']);
  });

  it('returns all tasks for an empty search', () => {
    expect(filterRelationshipTasks(tasks, ' ', members)).toEqual(tasks);
  });

  it('searches task visibility and completion member names', () => {
    expect(
      filterRelationshipTasks(tasks, 'Robin', members).map(({ id }) => id),
    ).toEqual(['task-2']);
  });

  it('searches task due dates', () => {
    const taskWithDueDate = {
      ...tasks[1],
      dueDate: '2026-11-20T09:00:00.000Z',
    };

    expect(
      filterRelationshipTasks([taskWithDueDate], '2026-11-20', members),
    ).toEqual([taskWithDueDate]);
  });
});

describe('canUserCompleteRelationshipTask', () => {
  it('allows assigned members and allows everyone when no completers are set', () => {
    expect(canUserCompleteRelationshipTask(tasks[1], 'member-3')).toBe(true);
    expect(canUserCompleteRelationshipTask(tasks[1], 'member-1')).toBe(false);
    expect(
      canUserCompleteRelationshipTask(
        { ...tasks[1], completableByUserIds: [] },
        'member-1',
      ),
    ).toBe(true);
    expect(
      canUserCompleteRelationshipTask(
        { ...tasks[1], completableByUserIds: [] },
        undefined,
      ),
    ).toBe(false);
  });

  it('does not make completed tasks actionable', () => {
    expect(canUserCompleteRelationshipTask(tasks[0], 'member-1')).toBe(false);
  });
});
