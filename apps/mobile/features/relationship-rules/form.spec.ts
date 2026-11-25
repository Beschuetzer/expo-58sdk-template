import { parseRelationshipRuleLabels } from './form';

describe('parseRelationshipRuleLabels', () => {
  it('splits, trims, and removes empty or duplicate labels', () => {
    expect(parseRelationshipRuleLabels(' Home, Finances, , Home , ')).toEqual([
      'Home',
      'Finances',
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(parseRelationshipRuleLabels('  ,  ')).toEqual([]);
  });
});
