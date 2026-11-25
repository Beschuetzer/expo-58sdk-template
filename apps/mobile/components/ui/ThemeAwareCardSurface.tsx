import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { View } from 'react-native';

import { useThemeAwareButtonPaletteIndex } from './ThemeAwareButtonPalette';
import { ThemeAwareSurface } from './ThemeAwareSurface';
import { ThemeAwareTextColorContext } from './ThemeAwareTextColorContext';

import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { COLORS } from '@/constants/colors';
import {
  getTileGradientColors,
  getTileGradientLocations,
  getTileGradientPoints,
} from '@/utils/tileGradient';
import { useTileSet } from '@/utils/tileSet';

const CARD_BACKGROUND_STYLE = {
  bottom: 0,
  left: 0,
  position: 'absolute' as const,
  right: 0,
  top: 0,
};
const CARD_BORDER_COLOR = 'transparent';
const NEUTRAL_GRADIENT_COLORS: [string, string, string] = [
  'rgba(0,0,0,0.50)',
  'rgba(0,0,0,0.70)',
  'rgba(0,0,0,0.80)',
];
const NEUTRAL_GRADIENT_LOCATIONS: [number, number, number] = [0, 0.48, 1];

type ThemeAwareCardSurfaceProps = Omit<
  ComponentProps<typeof ThemeAwareSurface>,
  'children' | 'darkBackground' | 'lightBackground'
> & {
  backgroundImage?: ComponentProps<typeof Image>['source'];
  children: ReactNode;
  customGradientEnabled?: boolean;
  paletteKey?: string;
};

export function ThemeAwareCardSurface({
  backgroundImage,
  borderColor = CARD_BORDER_COLOR,
  borderWidth = '$1',
  children,
  customGradientEnabled = true,
  paletteKey,
  style,
  ...surfaceProps
}: ThemeAwareCardSurfaceProps) {
  const { colorScheme, getTextColor } = useThemeAwareColors();
  const { tileGradientSettings, tileSet } = useTileSet();
  const useNeutralGradient = !customGradientEnabled && tileSet !== 'none';
  const paletteIndex = useThemeAwareButtonPaletteIndex(paletteKey);
  const [gradientSize, setGradientSize] = useState({ width: 0, height: 0 });
  const itemPalette = COLORS[colorScheme].buttonBackgrounds;
  const backgroundColor = itemPalette[paletteIndex % itemPalette.length];
  const gradientColors = useNeutralGradient
    ? NEUTRAL_GRADIENT_COLORS
    : getTileGradientColors(
        colorScheme,
        backgroundColor,
        tileGradientSettings.colors,
      );
  const gradientLocations = useNeutralGradient
    ? NEUTRAL_GRADIENT_LOCATIONS
    : getTileGradientLocations(tileGradientSettings.locations);
  const gradientPoints = getTileGradientPoints(
    useNeutralGradient ? 0 : tileGradientSettings.angle,
    gradientSize.width,
    gradientSize.height,
  );
  const shouldShowGradient = customGradientEnabled || useNeutralGradient;

  return (
    <ThemeAwareSurface
      {...surfaceProps}
      borderColor={borderColor}
      borderWidth={borderWidth}
      darkBackground={backgroundColor}
      lightBackground={backgroundColor}
      style={[{ overflow: 'hidden', position: 'relative' }, style]}
    >
      <View pointerEvents="none" style={CARD_BACKGROUND_STYLE}>
        {backgroundImage ? (
          <Image
            contentFit="cover"
            source={backgroundImage}
            style={{ height: '100%', width: '100%' }}
            transition={160}
          />
        ) : null}
        {shouldShowGradient ? (
          <LinearGradient
            colors={gradientColors}
            end={gradientPoints.end}
            locations={gradientLocations}
            onLayout={(event) => {
              const { height, width } = event.nativeEvent.layout;
              setGradientSize((currentSize) =>
                currentSize.width === width && currentSize.height === height
                  ? currentSize
                  : { width, height },
              );
            }}
            start={gradientPoints.start}
            style={[
              CARD_BACKGROUND_STYLE,
              {
                opacity: useNeutralGradient
                  ? 1
                  : tileGradientSettings.opacity / 100,
              },
            ]}
          />
        ) : null}
      </View>
      <ThemeAwareTextColorContext.Provider value={getTextColor(true)}>
        {children}
      </ThemeAwareTextColorContext.Provider>
    </ThemeAwareSurface>
  );
}
