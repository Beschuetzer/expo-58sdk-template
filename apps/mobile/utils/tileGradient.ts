export type TileGradientColorOverrides = [
  string | null,
  string | null,
  string | null,
];

export type TileGradientLocations = [number, number, number];

export type TileGradientCustomization = {
  angle: number;
  colors: TileGradientColorOverrides;
  locations: TileGradientLocations;
  opacity: number;
};

export type TileGradientSettings = TileGradientCustomization & {
  enabled: boolean;
};

export const DEFAULT_TILE_GRADIENT_SETTINGS: TileGradientSettings = {
  enabled: true,
  angle: 0,
  colors: [null, null, null],
  locations: [0, 48, 100],
  opacity: 100,
};

export function createDefaultTileGradientSettings(): TileGradientSettings {
  return {
    ...DEFAULT_TILE_GRADIENT_SETTINGS,
    colors: [...DEFAULT_TILE_GRADIENT_SETTINGS.colors],
    locations: [...DEFAULT_TILE_GRADIENT_SETTINGS.locations],
  };
}

export function isValidTileGradientColor(value: string) {
  return /^#[\da-f]{6}$/i.test(value);
}

export function getTileGradientColors(
  colorScheme: 'light' | 'dark',
  backgroundColor: string,
  overrides: TileGradientColorOverrides,
): [string, string, string] {
  const defaults: [string, string, string] =
    colorScheme === 'dark'
      ? ['rgba(5,10,20,.97)', `${backgroundColor}e3`, 'rgba(2,6,16,.97)']
      : ['rgba(8,15,30,0.97)', `${backgroundColor}e3`, 'rgba(8,15,30,0.97)'];

  return defaults.map((defaultColor, index) => {
    const override = overrides[index];
    return override && isValidTileGradientColor(override)
      ? override
      : defaultColor;
  }) as [string, string, string];
}

export function getTileGradientLocations(
  locations: TileGradientLocations,
): [number, number, number] {
  return locations.map((location) => location / 100) as [
    number,
    number,
    number,
  ];
}

export type TileGradientPoint = {
  x: number;
  y: number;
};

export function getTileGradientPoints(
  angle: number,
  width: number,
  height: number,
): { start: TileGradientPoint; end: TileGradientPoint } {
  const safeAngle = Number.isFinite(angle) ? angle : 0;
  const normalizedAngle = ((safeAngle % 360) + 360) % 360;
  const radians = (normalizedAngle * Math.PI) / 180;
  const rawDx = Math.sin(radians);
  const rawDy = Math.cos(radians);
  const dx = Math.abs(rawDx) < 1e-8 ? 0 : rawDx;
  const dy = Math.abs(rawDy) < 1e-8 ? 0 : rawDy;
  const hasSize =
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0;
  const coordinateWidth = hasSize ? width : 1;
  const coordinateHeight = hasSize ? height : 1;
  const horizontalLimit =
    Math.abs(dx) < 1e-8
      ? Number.POSITIVE_INFINITY
      : coordinateWidth / (2 * Math.abs(dx));
  const verticalLimit =
    Math.abs(dy) < 1e-8
      ? Number.POSITIVE_INFINITY
      : coordinateHeight / (2 * Math.abs(dy));
  const halfLength = Math.min(horizontalLimit, verticalLimit);

  return {
    start: {
      x: 0.5 - (halfLength * dx) / coordinateWidth,
      y: 0.5 - (halfLength * dy) / coordinateHeight,
    },
    end: {
      x: 0.5 + (halfLength * dx) / coordinateWidth,
      y: 0.5 + (halfLength * dy) / coordinateHeight,
    },
  };
}
