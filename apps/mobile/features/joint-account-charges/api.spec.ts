import {
  createJointAccountCharge,
  deleteJointAccountCharge,
  getJointAccountCharge,
  getJointAccountChargeCalendarMonth,
  getJointAccountCharges,
  markAllJointAccountChargesPaid,
  markJointAccountChargePaid,
  updateJointAccountCharge,
} from './api';

const mockRequestAuthenticatedJson = jest.fn();

jest.mock('@/features/auth/authenticatedClient', () => ({
  requestAuthenticatedJson: (...args: unknown[]) =>
    mockRequestAuthenticatedJson(...args),
}));

describe('joint account charge calendar API', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches every page for the local calendar month', async () => {
    const firstCharge = {
      id: 'charge-1',
      relationshipId: 'relationship-1',
      createdByUserId: 'user-1',
      name: 'First charge',
      amountMinorUnits: 1200,
      chargeDate: '2026-10-15T12:00:00.000Z',
      status: 'unpaid',
      createdAt: '2026-10-15T12:00:00.000Z',
      updatedAt: '2026-10-15T12:00:00.000Z',
    };
    const secondCharge = {
      ...firstCharge,
      id: 'charge-2',
      chargeDate: '2026-10-20T12:00:00.000Z',
    };
    mockRequestAuthenticatedJson
      .mockResolvedValueOnce({
        data: {
          calendarDateBounds: {
            earliestDate: '2026-09-30T12:00:00.000Z',
            latestDate: '2026-11-02T12:00:00.000Z',
          },
          items: [firstCharge],
          nextCursor: 'charge-1',
        },
      })
      .mockResolvedValueOnce({ data: { items: [secondCharge] } });

    await expect(
      getJointAccountChargeCalendarMonth('relationship-1', '2026-10'),
    ).resolves.toEqual({
      earliestDate: '2026-09-30T12:00:00.000Z',
      latestDate: '2026-11-02T12:00:00.000Z',
      entries: [firstCharge, secondCharge],
    });

    const filters = new URLSearchParams({
      fromDate: new Date(2026, 9, 1).toISOString(),
      limit: '100',
      toDate: new Date(new Date(2026, 10, 1).getTime() - 1).toISOString(),
    }).toString();
    const listPath =
      '/api/v1/relationships/relationship-1/joint-account-charges';
    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      [`${listPath}?${filters}`, {}],
      [`${listPath}?cursor=charge-1&${filters}`, {}],
    ]);
  });

  it('lists charges and sends the expected charge mutations', async () => {
    const relationshipId = 'relationship/one';
    const chargeId = 'charge one';
    const createInput = { name: 'Household supplies', amountMinorUnits: 1500 };
    const updateInput = {
      ...createInput,
      chargeDate: '2026-10-15T12:00:00.000Z',
    };
    const filters = {
      name: 'Household supplies',
      status: 'unpaid' as const,
      cursor: 'cursor one',
      limit: 25,
    };
    mockRequestAuthenticatedJson.mockResolvedValue({
      data: { items: [] },
    });

    await getJointAccountCharges(relationshipId);
    await getJointAccountCharges(relationshipId, filters);
    await createJointAccountCharge(relationshipId, createInput);
    await getJointAccountCharge(chargeId);
    await deleteJointAccountCharge(chargeId);
    await updateJointAccountCharge(chargeId, updateInput);
    await markJointAccountChargePaid(chargeId);
    await markAllJointAccountChargesPaid(relationshipId);

    const listPath = `/api/v1/relationships/${encodeURIComponent(relationshipId)}/joint-account-charges`;
    const query = new URLSearchParams({
      name: filters.name,
      status: filters.status,
      cursor: filters.cursor,
      limit: String(filters.limit),
    }).toString();
    const chargePath = `/api/v1/joint-account-charges/${encodeURIComponent(chargeId)}`;

    expect(mockRequestAuthenticatedJson.mock.calls).toEqual([
      [listPath, {}],
      [`${listPath}?${query}`, {}],
      [listPath, { method: 'POST', body: JSON.stringify(createInput) }],
      [chargePath, {}],
      [chargePath, { method: 'DELETE' }],
      [
        `${chargePath}/update`,
        { method: 'POST', body: JSON.stringify(updateInput) },
      ],
      [`${chargePath}/mark-paid`, { method: 'POST' }],
      [`${listPath}/mark-all-paid`, { method: 'POST' }],
    ]);
  });
});
