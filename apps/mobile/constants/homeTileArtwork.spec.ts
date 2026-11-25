import {
  HOME_TILE_ARTWORK,
  getHomeTileArtwork,
  type HomeTileArtworkKey,
  type TileSet,
} from './homeTileArtwork';

const HOME_TILE_ARTWORK_KEYS = Object.keys(
  HOME_TILE_ARTWORK,
) as HomeTileArtworkKey[];
const IMAGE_TILE_SETS = [
  'default',
  'futuristic',
  'classic',
] as const satisfies readonly TileSet[];

describe('getHomeTileArtwork', () => {
  it('returns the registered artwork for the Default set', () => {
    expect(getHomeTileArtwork('default', 'createBudget')).toBe(
      HOME_TILE_ARTWORK.createBudget,
    );
  });

  it.each(IMAGE_TILE_SETS)(
    'uses a distinct image for every tile in the %s set',
    (tileSet) => {
      const artwork = HOME_TILE_ARTWORK_KEYS.map((artworkKey) =>
        getHomeTileArtwork(tileSet, artworkKey),
      );

      expect(new Set(artwork).size).toBe(HOME_TILE_ARTWORK_KEYS.length);
      expect(artwork).not.toContain(undefined);
    },
  );

  it.each(HOME_TILE_ARTWORK_KEYS)(
    'uses a different image for %s in each visual tile set',
    (artworkKey) => {
      const artwork = IMAGE_TILE_SETS.map((tileSet) =>
        getHomeTileArtwork(tileSet, artworkKey),
      );

      expect(new Set(artwork).size).toBe(IMAGE_TILE_SETS.length);
    },
  );

  it('returns no artwork for the None set', () => {
    expect(getHomeTileArtwork('none', 'createBudget')).toBeUndefined();
  });
});
