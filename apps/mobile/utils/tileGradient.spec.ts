import {
  DEFAULT_TILE_GRADIENT_SETTINGS,
  createDefaultTileGradientSettings,
  getTileGradientColors,
  getTileGradientLocations,
  getTileGradientPoints,
  isValidTileGradientColor,
} from './tileGradient';

describe('tile gradient settings', () => {
  it('creates independent default settings while preserving the original tile gradient', () => {
    const defaults = createDefaultTileGradientSettings();
    defaults.colors[0] = '#123456';
    defaults.locations[1] = 50;

    expect(DEFAULT_TILE_GRADIENT_SETTINGS.colors).toEqual([null, null, null]);
    expect(DEFAULT_TILE_GRADIENT_SETTINGS.locations).toEqual([0, 48, 100]);
    expect(defaults).toEqual({
      enabled: true,
      angle: 0,
      colors: ['#123456', null, null],
      locations: [0, 50, 100],
      opacity: 100,
    });
  });

  it('uses theme-aware defaults and applies valid overrides', () => {
    expect(
      getTileGradientColors('light', '#1769aa', [null, null, null]),
    ).toEqual(['rgba(8,15,30,0.97)', '#1769aae3', 'rgba(8,15,30,0.97)']);
    expect(
      getTileGradientColors('dark', '#1769aa', [null, null, null]),
    ).toEqual(['rgba(5,10,20,.97)', '#1769aae3', 'rgba(2,6,16,.97)']);
    expect(
      getTileGradientColors('dark', '#1769aa', [
        '#123456',
        'not-a-color',
        '#abcdef',
      ]),
    ).toEqual(['#123456', '#1769aae3', '#abcdef']);
  });

  it('converts stop positions from percentages to linear-gradient locations', () => {
    expect(getTileGradientLocations([5, 42, 95])).toEqual([0.05, 0.42, 0.95]);
  });

  it.each([
    [0, 200, 100, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }],
    [90, 200, 100, { x: 0, y: 0.5 }, { x: 1, y: 0.5 }],
    [180, 200, 100, { x: 0.5, y: 1 }, { x: 0.5, y: 0 }],
  ])(
    'calculates endpoints for %i degrees',
    (angle, width, height, start, end) => {
      expect(getTileGradientPoints(angle, width, height)).toEqual({
        start,
        end,
      });
    },
  );

  it('validates six-digit hex colors', () => {
    expect(isValidTileGradientColor('#12aBcF')).toBe(true);
    expect(isValidTileGradientColor('#12345')).toBe(false);
    expect(isValidTileGradientColor('123456')).toBe(false);
    expect(isValidTileGradientColor('#12345678')).toBe(false);
  });
});
