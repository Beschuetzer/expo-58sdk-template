import type {
  RelationshipMember,
  RelationshipRule,
} from '@expo-50sdk-template/shared-types';

import {
  canUserAgreeToRelationshipRule,
  filterRelationshipRules,
  hasInvalidRelationshipRuleDateFilters,
  parseDateFilter,
  type RelationshipRuleFilters,
} from './filters';

const members: RelationshipMember[] = [
  {
    id: 'creator-record',
    relationshipId: 'relationship-1',
    userId: 'creator-1',
    displayName: 'Alex',
    role: 'owner',
    active: true,
  },
  {
    id: 'approver-record',
    relationshipId: 'relationship-1',
    userId: 'member-2',
    displayName: 'Sam',
    role: 'member',
    active: true,
  },
];

function createRule(
  overrides: Partial<RelationshipRule> = {},
): RelationshipRule {
  return {
    id: 'rule-1',
    relationshipId: 'relationship-1',
    createdByUserId: 'creator-1',
    name: 'Quiet hours',
    labels: ['Home', 'Finances'],
    description: 'Keep noise low after 10 PM.',
    status: 'ratified',
    remindMeToReview: null,
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-22T12:00:00.000Z',
    ratifiedAt: '2026-10-22T12:00:00.000Z',
    approvals: [
      {
        memberUserId: 'member-2',
        agreedAt: '2026-10-22T12:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

function createFilters(
  overrides: Partial<RelationshipRuleFilters> = {},
): RelationshipRuleFilters {
  return {
    search: '',
    label: '',
    status: 'all',
    createdByUserId: 'all',
    requiredApproverUserId: 'all',
    createdFromDate: undefined,
    createdToDate: undefined,
    ratifiedFromDate: undefined,
    ratifiedToDate: undefined,
    ...overrides,
  };
}

describe('parseDateFilter', () => {
  it('accepts empty and valid dates, and rejects invalid dates', () => {
    expect(parseDateFilter('')).toBeUndefined();
    expect(parseDateFilter(' 2026-10-28 ')).toBe('2026-10-28');
    expect(parseDateFilter('2026-02-30')).toBeNull();
    expect(parseDateFilter('10/28/2026')).toBeNull();
  });
});

describe('canUserAgreeToRelationshipRule', () => {
  it('requires an unsigned approval for the current member on a pending rule', () => {
    const pendingRule = createRule({
      status: 'pending_approval',
      approvals: [{ memberUserId: 'member-2' }],
    });

    expect(canUserAgreeToRelationshipRule(pendingRule, 'member-2')).toBe(true);
    expect(canUserAgreeToRelationshipRule(pendingRule, 'creator-1')).toBe(
      false,
    );
    expect(
      canUserAgreeToRelationshipRule(
        {
          ...pendingRule,
          approvals: [
            { memberUserId: 'member-2', agreedAt: '2026-10-22T12:00:00Z' },
          ],
        },
        'member-2',
      ),
    ).toBe(false);
    expect(
      canUserAgreeToRelationshipRule(
        { ...pendingRule, status: 'ratified' },
        'member-2',
      ),
    ).toBe(false);
  });
});

describe('filterRelationshipRules', () => {
  it('searches all rule properties and resolves member names', () => {
    const rule = createRule();
    const searchableTerms = [
      'rule-1',
      'relationship-1',
      'Alex',
      'Quiet hours',
      'Home',
      'Finances',
      'noise low',
      'ratified',
      '2026-10-20',
      '2026-10-22',
      'Sam',
      'member-2',
    ];

    searchableTerms.forEach((search) => {
      expect(
        filterRelationshipRules([rule], createFilters({ search }), members),
      ).toEqual([rule]);
    });
  });

  it('filters by any label with case-insensitive partial matching', () => {
    const matchingRule = createRule();
    const otherRule = createRule({
      id: 'rule-2',
      labels: ['Travel'],
    });

    expect(
      filterRelationshipRules(
        [matchingRule, otherRule],
        createFilters({ label: 'FINAN' }),
        members,
      ),
    ).toEqual([matchingRule]);
    expect(
      filterRelationshipRules(
        [matchingRule, otherRule],
        createFilters({ label: 'trav' }),
        members,
      ),
    ).toEqual([otherRule]);
  });

  it('filters by status, creator, required approver, and both date ranges', () => {
    const matchingRule = createRule();
    const pendingRule = createRule({
      id: 'rule-2',
      status: 'pending_approval',
      ratifiedAt: undefined,
      approvals: [{ memberUserId: 'member-2' }],
    });
    const rules = [matchingRule, pendingRule];

    expect(
      filterRelationshipRules(
        rules,
        createFilters({
          status: 'ratified',
          createdByUserId: 'creator-1',
          requiredApproverUserId: 'member-2',
          createdFromDate: '2026-10-20',
          createdToDate: '2026-10-20',
          ratifiedFromDate: '2026-10-22',
          ratifiedToDate: '2026-10-22',
        }),
        members,
      ),
    ).toEqual([matchingRule]);
  });

  it('returns no matches for invalid or reversed date ranges', () => {
    const filters = createFilters({
      createdFromDate: '2026-10-28',
      createdToDate: '2026-10-20',
    });

    expect(hasInvalidRelationshipRuleDateFilters(filters)).toBe(true);
    expect(filterRelationshipRules([createRule()], filters, members)).toEqual(
      [],
    );
  });

  it('supports date ranges with only a lower or upper bound', () => {
    const earlierRule = createRule();
    const laterRule = createRule({
      id: 'rule-2',
      createdAt: '2026-10-28T12:00:00.000Z',
    });

    expect(
      filterRelationshipRules(
        [earlierRule, laterRule],
        createFilters({ createdToDate: '2026-10-21' }),
        members,
      ),
    ).toEqual([earlierRule]);
    expect(
      filterRelationshipRules(
        [earlierRule, laterRule],
        createFilters({ createdFromDate: '2026-10-21' }),
        members,
      ),
    ).toEqual([laterRule]);
  });
});
