import { parseCommaSeparatedValues } from './parseCommaSeparatedValues';

describe('parseCommaSeparatedValues', () => {
  it('splits, trims, and removes empty or duplicate values', () => {
    expect(parseCommaSeparatedValues(' Home, Finances, , Home , ')).toEqual([
      'Home',
      'Finances',
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(parseCommaSeparatedValues('  ,  ')).toEqual([]);
  });
});
