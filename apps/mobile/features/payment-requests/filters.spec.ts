import type { PaymentRequestSummary } from '@expo-50sdk-template/shared-types';

import {
  filterPaymentRequests,
  parseAmountFilter,
  parseDateFilter,
  sortPaymentRequestItems,
} from './filters';

const requests: PaymentRequestSummary[] = [
  {
    id: 'request-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'user-1',
    title: 'Weekly groceries',
    amountMinorUnits: 1250,
    currency: 'USD',
    purchaseDate: '2026-10-01T00:00:00.000Z',
    categories: ['Household', 'Groceries'],
    status: 'pending_approval',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'request-2',
    relationshipId: 'relationship-1',
    createdByUserId: 'user-2',
    title: 'Train tickets',
    amountMinorUnits: 5000,
    currency: 'USD',
    purchaseDate: '2026-10-02T00:00:00.000Z',
    categories: ['Travel'],
    status: 'approved',
    createdAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  },
];

describe('parseAmountFilter', () => {
  it('supports decimal and comma-decimal amounts, including zero', () => {
    expect(parseAmountFilter('12.50')).toBe(1250);
    expect(parseAmountFilter('12,50')).toBe(1250);
    expect(parseAmountFilter('0')).toBe(0);
    expect(parseAmountFilter('')).toBeUndefined();
  });

  it('rejects invalid and over-precision values', () => {
    expect(parseAmountFilter('1.234')).toBeNull();
    expect(parseAmountFilter('-5')).toBeNull();
    expect(parseAmountFilter('9'.repeat(400))).toBeNull();
  });
});

describe('parseDateFilter', () => {
  it('accepts valid ISO dates and empty values', () => {
    expect(parseDateFilter(' 2026-10-02 ')).toBe('2026-10-02');
    expect(parseDateFilter('')).toBeUndefined();
  });

  it('rejects invalid ISO dates and other date formats', () => {
    expect(parseDateFilter('2026-02-30')).toBeNull();
    expect(parseDateFilter('10/02/2026')).toBeNull();
  });
});

describe('filterPaymentRequests', () => {
  it('searches request titles and any category without case sensitivity', () => {
    const filtered = filterPaymentRequests(requests, {
      search: 'HOUSEHOLD',
      status: 'all',
      minimumAmountMinorUnits: undefined,
      maximumAmountMinorUnits: undefined,
    });

    expect(filtered.map((request) => request.id)).toEqual(['request-1']);

    const matchingSecondaryCategory = filterPaymentRequests(requests, {
      search: 'groceries',
      status: 'all',
      minimumAmountMinorUnits: undefined,
      maximumAmountMinorUnits: undefined,
    });

    expect(matchingSecondaryCategory.map((request) => request.id)).toEqual([
      'request-1',
    ]);
  });

  it('filters by any category with case-insensitive partial matching', () => {
    const matchingPrimaryCategory = filterPaymentRequests(requests, {
      search: '',
      category: 'gRoCe',
      status: 'all',
      minimumAmountMinorUnits: undefined,
      maximumAmountMinorUnits: undefined,
    });
    const matchingSecondaryCategory = filterPaymentRequests(requests, {
      search: '',
      category: 'TRAV',
      status: 'all',
      minimumAmountMinorUnits: undefined,
      maximumAmountMinorUnits: undefined,
    });

    expect(matchingPrimaryCategory.map((request) => request.id)).toEqual([
      'request-1',
    ]);
    expect(matchingSecondaryCategory.map((request) => request.id)).toEqual([
      'request-2',
    ]);
  });

  it('combines status and inclusive amount bounds', () => {
    const filtered = filterPaymentRequests(requests, {
      search: '',
      status: 'approved',
      minimumAmountMinorUnits: 5000,
      maximumAmountMinorUnits: 5000,
    });

    expect(filtered.map((request) => request.id)).toEqual(['request-2']);
  });

  it('filters requests by creator', () => {
    const filtered = filterPaymentRequests(requests, {
      search: '',
      status: 'all',
      createdByUserId: 'user-2',
      minimumAmountMinorUnits: undefined,
      maximumAmountMinorUnits: undefined,
    });

    expect(filtered.map((request) => request.id)).toEqual(['request-2']);
  });

  it('filters requests by inclusive purchase date bounds', () => {
    const filtered = filterPaymentRequests(requests, {
      search: '',
      status: 'all',
      minimumAmountMinorUnits: undefined,
      maximumAmountMinorUnits: undefined,
      fromPurchaseDate: '2026-10-02',
      toPurchaseDate: '2026-10-02',
    });

    expect(filtered.map((request) => request.id)).toEqual(['request-2']);
  });

  it('returns no results for invalid or reversed amount bounds', () => {
    expect(
      filterPaymentRequests(requests, {
        search: '',
        status: 'all',
        minimumAmountMinorUnits: null,
        maximumAmountMinorUnits: undefined,
      }),
    ).toEqual([]);
    expect(
      filterPaymentRequests(requests, {
        search: '',
        status: 'all',
        minimumAmountMinorUnits: 5000,
        maximumAmountMinorUnits: 1000,
      }),
    ).toEqual([]);
  });

  it('returns no results for invalid or reversed date bounds', () => {
    expect(
      filterPaymentRequests(requests, {
        search: '',
        status: 'all',
        minimumAmountMinorUnits: undefined,
        maximumAmountMinorUnits: undefined,
        fromPurchaseDate: null,
      }),
    ).toEqual([]);
    expect(
      filterPaymentRequests(requests, {
        search: '',
        status: 'all',
        minimumAmountMinorUnits: undefined,
        maximumAmountMinorUnits: undefined,
        fromPurchaseDate: '2026-10-03',
        toPurchaseDate: '2026-10-01',
      }),
    ).toEqual([]);
  });
});

describe('sortPaymentRequestItems', () => {
  const sortRequests: PaymentRequestSummary[] = [
    requests[0],
    {
      ...requests[0],
      id: 'request-3',
      title: 'Coffee beans',
      amountMinorUnits: 2500,
      purchaseDate: '2026-10-01T12:00:00.000Z',
    },
    requests[1],
  ];

  it('sorts by date, name, and amount in both directions', () => {
    const sortedNames = (
      field: 'date' | 'name' | 'amount',
      order: 'ascending' | 'descending',
    ) =>
      sortPaymentRequestItems(
        sortRequests,
        (request) => request,
        field,
        order,
      ).map((request) => request.title);

    expect(sortedNames('date', 'ascending')).toEqual([
      'Weekly groceries',
      'Coffee beans',
      'Train tickets',
    ]);
    expect(sortedNames('date', 'descending')).toEqual([
      'Train tickets',
      'Coffee beans',
      'Weekly groceries',
    ]);
    expect(sortedNames('name', 'ascending')).toEqual([
      'Coffee beans',
      'Train tickets',
      'Weekly groceries',
    ]);
    expect(sortedNames('name', 'descending')).toEqual([
      'Weekly groceries',
      'Train tickets',
      'Coffee beans',
    ]);
    expect(sortedNames('amount', 'ascending')).toEqual([
      'Weekly groceries',
      'Coffee beans',
      'Train tickets',
    ]);
    expect(sortedNames('amount', 'descending')).toEqual([
      'Train tickets',
      'Coffee beans',
      'Weekly groceries',
    ]);
  });

  it('uses request IDs to break ties in sort values', () => {
    const tiedRequests = [
      { ...requests[0], id: 'request-z' },
      { ...requests[0], id: 'request-a' },
    ];

    expect(
      sortPaymentRequestItems(
        tiedRequests,
        (request) => request,
        'amount',
        'ascending',
      ).map((request) => request.id),
    ).toEqual(['request-a', 'request-z']);
  });
});
