import {
  completeRelationshipTask,
  createMeTime,
  createRelationshipTask,
  deleteMeTime,
  deleteRelationshipTask,
  getMeTime,
  getMeTimeCalendarMonth,
  getMeTimeEntry,
  getRelationshipTask,
  getRelationshipTaskCalendarMonth,
  getRelationshipTasks,
  updateRelationshipTask,
  updateMeTime,
} from './api';

const mockRequestAuthenticatedJson = jest.fn();

jest.mock('@/features/auth/authenticatedClient', () => ({
  requestAuthenticatedJson: (path: string, init?: RequestInit) =>
    mockRequestAuthenticatedJson(path, init),
}));

describe('Me Time calendar API', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches every page for the local calendar month', async () => {
    const firstEntry = {
      id: 'me-time-1',
      relationshipId: 'relationship-1',
      createdByUserId: 'user-1',
      startTime: '2026-10-28T10:00:00.000Z',
      endTime: '2026-10-28T11:00:00.000Z',
      createdAt: '2026-10-28T12:00:00.000Z',
      updatedAt: '2026-10-28T12:00:00.000Z',
    };
    const secondEntry = {
      ...firstEntry,
      id: 'me-time-2',
      startTime: '2026-10-29T10:00:00.000Z',
      endTime: '2026-10-29T11:00:00.000Z',
    };
    mockRequestAuthenticatedJson
      .mockResolvedValueOnce({
        data: {
          earliestStartTime: '2026-09-30T10:00:00.000Z',
          items: [firstEntry],
          latestStartTime: '2026-11-02T10:00:00.000Z',
          nextCursor: 'me-time-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [secondEntry],
        },
      });

    await expect(
      getMeTimeCalendarMonth('relationship-1', '2026-10'),
    ).resolves.toEqual({
      earliestStartTime: '2026-09-30T10:00:00.000Z',
      entries: [firstEntry, secondEntry],
      latestStartTime: '2026-11-02T10:00:00.000Z',
    });

    const monthFilters = new URLSearchParams({
      startTimeFrom: new Date(2026, 9, 1).toISOString(),
      startTimeBefore: new Date(2026, 10, 1).toISOString(),
      limit: '100',
    }).toString();
    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      [`/api/v1/relationships/relationship-1/me-time?${monthFilters}`, {}],
      [
        `/api/v1/relationships/relationship-1/me-time?${monthFilters}&cursor=me-time-1`,
        {},
      ],
    ]);
  });

  it('omits empty and undefined list filters from request URLs', async () => {
    mockRequestAuthenticatedJson.mockResolvedValue({ data: { items: [] } });

    await getMeTime('relationship-1');
    await getMeTime('relationship-1', { cursor: undefined });
    await getRelationshipTasks('relationship-1');

    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      ['/api/v1/relationships/relationship-1/me-time', {}],
      ['/api/v1/relationships/relationship-1/me-time', {}],
      ['/api/v1/relationships/relationship-1/tasks', {}],
    ]);
  });

  it('returns null date bounds when the first page omits them', async () => {
    mockRequestAuthenticatedJson.mockResolvedValueOnce({
      data: { items: [] },
    });

    await expect(
      getMeTimeCalendarMonth('relationship-1', '2026-10'),
    ).resolves.toEqual({
      earliestStartTime: null,
      latestStartTime: null,
      entries: [],
    });
    expect(mockRequestAuthenticatedJson).toHaveBeenCalledTimes(1);
  });

  it('encodes entry IDs and sends the expected time and task requests', async () => {
    const relationshipId = 'relationship/one';
    const meTimeId = 'entry one';
    const taskId = 'task/one';
    const meTimeInput = {
      startTime: '2026-10-28T10:00:00.000Z',
      endTime: '2026-10-28T11:00:00.000Z',
      description: 'Quiet time',
    };
    const taskInput = {
      name: 'Take out trash',
      dueDate: '2026-11-10T09:00:00.000Z',
      reminderFrequencyDays: 3,
      visibleToUserIds: ['user-1'],
    };
    const updateTaskInput = {
      name: 'Wash dishes',
      visibleToUserIds: ['user-1'],
      completableByUserIds: ['user-2'],
    };
    const taskFilters = {
      cursor: 'cursor one',
      limit: 5,
      status: 'incomplete' as const,
      dateFrom: '2026-10-01T00:00:00.000Z',
      dateBefore: '2026-11-01T00:00:00.000Z',
    };
    mockRequestAuthenticatedJson.mockResolvedValue({
      data: { items: [] },
    });

    await getMeTimeEntry(relationshipId, meTimeId);
    await deleteMeTime(relationshipId, meTimeId);
    await createMeTime(relationshipId, meTimeInput);
    await updateMeTime(relationshipId, meTimeId, meTimeInput);
    await getRelationshipTasks(relationshipId, taskFilters);
    await expect(
      getRelationshipTaskCalendarMonth(relationshipId, 'completed', '2026-10'),
    ).resolves.toEqual({
      earliestDate: null,
      latestDate: null,
      entries: [],
    });
    await getRelationshipTask(relationshipId, taskId);
    await deleteRelationshipTask(relationshipId, taskId);
    await createRelationshipTask(relationshipId, taskInput);
    await updateRelationshipTask(relationshipId, taskId, updateTaskInput);
    await completeRelationshipTask(relationshipId, taskId);

    const taskQuery = new URLSearchParams({
      cursor: taskFilters.cursor,
      limit: String(taskFilters.limit),
      status: taskFilters.status,
      dateFrom: taskFilters.dateFrom,
      dateBefore: taskFilters.dateBefore,
    }).toString();
    const taskCalendarQuery = new URLSearchParams({
      dateBefore: new Date(2026, 10, 1).toISOString(),
      dateFrom: new Date(2026, 9, 1).toISOString(),
      limit: '100',
      status: 'completed',
    }).toString();
    const meTimePath = `/api/v1/relationships/${encodeURIComponent(relationshipId)}/me-time`;
    const taskPath = `/api/v1/relationships/${encodeURIComponent(relationshipId)}/tasks`;
    const taskEntryPath = `${taskPath}/${encodeURIComponent(taskId)}`;

    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      [`${meTimePath}/${encodeURIComponent(meTimeId)}`, {}],
      [`${meTimePath}/${encodeURIComponent(meTimeId)}`, { method: 'DELETE' }],
      [meTimePath, { method: 'POST', body: JSON.stringify(meTimeInput) }],
      [
        `${meTimePath}/${encodeURIComponent(meTimeId)}`,
        { method: 'PATCH', body: JSON.stringify(meTimeInput) },
      ],
      [`${taskPath}?${taskQuery}`, {}],
      [`${taskPath}?${taskCalendarQuery}`, {}],
      [taskEntryPath, {}],
      [taskEntryPath, { method: 'DELETE' }],
      [taskPath, { method: 'POST', body: JSON.stringify(taskInput) }],
      [
        taskEntryPath,
        { method: 'PATCH', body: JSON.stringify(updateTaskInput) },
      ],
      [`${taskEntryPath}/complete`, { method: 'POST' }],
    ]);
  });
});
