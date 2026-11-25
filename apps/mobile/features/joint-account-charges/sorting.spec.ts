import type { JointAccountCharge } from '@expo-50sdk-template/shared-types';

import {
  sortJointAccountCharges,
  type JointAccountChargeSortField,
  type JointAccountChargeSortOrder,
} from './sorting';

const charges: JointAccountCharge[] = [
  {
    id: 'charge-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'user-1',
    name: 'Dinner',
    amountMinorUnits: 3000,
    chargeDate: '2025-01-01T00:00:00.000Z',
    status: 'unpaid',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'charge-2',
    relationshipId: 'relationship-1',
    createdByUserId: 'user-2',
    name: 'Groceries',
    amountMinorUnits: 1000,
    chargeDate: '2025-01-03T00:00:00.000Z',
    status: 'paid',
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
  {
    id: 'charge-3',
    relationshipId: 'relationship-1',
    createdByUserId: 'user-3',
    name: 'Breakfast',
    amountMinorUnits: 2000,
    chargeDate: '2025-01-02T00:00:00.000Z',
    status: 'unpaid',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
];

const creatorNames: Record<string, string> = {
  'user-1': 'Zoe',
  'user-2': 'Amy',
  'user-3': 'Mia',
};

describe('sortJointAccountCharges', () => {
  const sortedIds = (
    field: JointAccountChargeSortField,
    order: JointAccountChargeSortOrder,
  ) =>
    sortJointAccountCharges(
      charges,
      (charge) => creatorNames[charge.createdByUserId],
      field,
      order,
    ).map((charge) => charge.id);

  it('sorts each displayed charge field in ascending and descending order', () => {
    expect(sortedIds('chargeDate', 'ascending')).toEqual([
      'charge-1',
      'charge-3',
      'charge-2',
    ]);
    expect(sortedIds('chargeDate', 'descending')).toEqual([
      'charge-2',
      'charge-3',
      'charge-1',
    ]);
    expect(sortedIds('name', 'ascending')).toEqual([
      'charge-3',
      'charge-1',
      'charge-2',
    ]);
    expect(sortedIds('name', 'descending')).toEqual([
      'charge-2',
      'charge-1',
      'charge-3',
    ]);
    expect(sortedIds('amount', 'ascending')).toEqual([
      'charge-2',
      'charge-3',
      'charge-1',
    ]);
    expect(sortedIds('amount', 'descending')).toEqual([
      'charge-1',
      'charge-3',
      'charge-2',
    ]);
    expect(sortedIds('status', 'ascending')).toEqual([
      'charge-2',
      'charge-1',
      'charge-3',
    ]);
    expect(sortedIds('status', 'descending')).toEqual([
      'charge-3',
      'charge-1',
      'charge-2',
    ]);
    expect(sortedIds('createdBy', 'ascending')).toEqual([
      'charge-2',
      'charge-3',
      'charge-1',
    ]);
    expect(sortedIds('createdBy', 'descending')).toEqual([
      'charge-1',
      'charge-3',
      'charge-2',
    ]);
  });
});
