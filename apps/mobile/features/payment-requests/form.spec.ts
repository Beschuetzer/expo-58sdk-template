import {
  getMemberDisplayName,
  getSelectedMemberNames,
  hasRubricAnswer,
  parseAmountToMinorUnits,
  toggleMemberSelection,
} from './form';

describe('parseAmountToMinorUnits', () => {
  it('converts decimal and comma-decimal amounts to minor units', () => {
    expect(parseAmountToMinorUnits('12.34')).toBe(1234);
    expect(parseAmountToMinorUnits('12,34')).toBe(1234);
    expect(parseAmountToMinorUnits('5')).toBe(500);
  });

  it('rejects invalid, non-positive, and over-precision amounts', () => {
    expect(parseAmountToMinorUnits('')).toBeUndefined();
    expect(parseAmountToMinorUnits('0')).toBeUndefined();
    expect(parseAmountToMinorUnits('-1')).toBeUndefined();
    expect(parseAmountToMinorUnits('1.234')).toBeUndefined();
    expect(parseAmountToMinorUnits('1,2.3')).toBeUndefined();
  });
});

describe('hasRubricAnswer', () => {
  it('treats false and zero as valid answers', () => {
    expect(hasRubricAnswer(false)).toBe(true);
    expect(hasRubricAnswer(0)).toBe(true);
  });

  it('rejects blank answers', () => {
    expect(hasRubricAnswer(undefined)).toBe(false);
    expect(hasRubricAnswer('  ')).toBe(false);
    expect(hasRubricAnswer([])).toBe(false);
  });
});

describe('toggleMemberSelection', () => {
  it('adds and removes a member without changing other selections', () => {
    expect(toggleMemberSelection([], 'member-1')).toEqual(['member-1']);
    expect(toggleMemberSelection(['member-1', 'member-2'], 'member-1')).toEqual(
      ['member-2'],
    );
  });
});

describe('getSelectedMemberNames', () => {
  it('resolves selected member IDs to names and falls back to IDs', () => {
    const members = [
      {
        id: 'record-1',
        relationshipId: 'relationship-1',
        userId: 'member-1',
        displayName: 'Alex',
        role: 'owner' as const,
        active: true,
      },
    ];

    expect(getSelectedMemberNames(['member-1', 'member-2'], members)).toEqual([
      'Alex',
      'member-2',
    ]);
  });
});

describe('getMemberDisplayName', () => {
  it('resolves a member ID to its display name and falls back to the ID', () => {
    const members = [
      {
        id: 'record-1',
        relationshipId: 'relationship-1',
        userId: 'member-1',
        displayName: 'Alex',
        role: 'owner' as const,
        active: true,
      },
    ];

    expect(getMemberDisplayName('member-1', members)).toBe('Alex');
    expect(getMemberDisplayName('member-2', members)).toBe('member-2');
  });
});
