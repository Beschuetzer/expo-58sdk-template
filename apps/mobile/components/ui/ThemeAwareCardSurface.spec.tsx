import React, { useContext } from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareButtonPaletteProvider } from './ThemeAwareButtonPalette';
import { ThemeAwareCardSurface } from './ThemeAwareCardSurface';
import { ThemeAwareHeading } from './ThemeAwareHeading';
import { ThemeAwareText } from './ThemeAwareText';
import { ThemeAwareTextColorContext } from './ThemeAwareTextColorContext';

import { COLORS } from '@/constants/colors';
import type { TileGradientSettings } from '@/utils/tileGradient';

let mockColorScheme: 'light' | 'dark' = 'light';
let mockTileSet = 'default';
let mockTileGradientSettings: TileGradientSettings = {
  enabled: true,
  angle: 0,
  colors: [null, null, null],
  locations: [0, 48, 100],
  opacity: 100,
};

jest.mock('expo-image', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Image: (props: Record<string, unknown>) =>
      React.createElement('ExpoImageHost', props),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement('LinearGradientHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareSurface: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        'ThemeAwareSurfaceHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: mockColorScheme,
    getTextColor: (onSolidBackground = false) =>
      onSolidBackground ? '#ffffff' : '#111111',
  }),
}));

jest.mock('@/utils/tileSet', () => ({
  useTileSet: () => ({
    tileSet: mockTileSet,
    tileGradientSettings: mockTileGradientSettings,
  }),
}));

jest.mock('@/components/ui/useThemeAwareTypography', () => ({
  useThemeAwareTypography: () => ({
    color: '#111111',
    fontFamily: 'test-font',
  }),
}));

jest.mock('@/components/ui/text', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Text: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ThemedTextHost', props, children as React.ReactNode),
  };
});

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style : [style];
  return styles.reduce<Record<string, unknown>>((result, value) => {
    if (value !== null && typeof value === 'object') {
      Object.assign(result, value);
    }
    return result;
  }, {});
}

function CardTextColorProbe() {
  const color = useContext(ThemeAwareTextColorContext);
  return React.createElement('CardTextColorHost', { color });
}

describe.each(['light', 'dark'] as const)(
  'ThemeAwareCardSurface in %s mode',
  (colorScheme) => {
    beforeEach(() => {
      mockColorScheme = colorScheme;
      mockTileSet = 'default';
      mockTileGradientSettings = {
        enabled: true,
        angle: 0,
        colors: [null, null, null],
        locations: [0, 48, 100],
        opacity: 100,
      };
    });

    it('uses the screen palette, artwork, gradient, and readable card text', () => {
      const tree = renderer.create(
        <ThemeAwareButtonPaletteProvider>
          <ThemeAwareCardSurface backgroundImage={42} borderRadius="$md">
            <ThemeAwareHeading>Card heading</ThemeAwareHeading>
            <ThemeAwareText>Card copy</ThemeAwareText>
            <ThemeAwareText color="#dc2626">Explicit color</ThemeAwareText>
            <CardTextColorProbe />
          </ThemeAwareCardSurface>
          <ThemeAwareCardSurface borderRadius="$md">
            <ThemeAwareText>Card without artwork</ThemeAwareText>
          </ThemeAwareCardSurface>
        </ThemeAwareButtonPaletteProvider>,
      );
      const surfaces = tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
      );
      const images = tree.root.findAll(
        (instance) => String(instance.type) === 'ExpoImageHost',
      );
      const gradients = tree.root.findAll(
        (instance) => String(instance.type) === 'LinearGradientHost',
      );
      const defaultBackground = COLORS[colorScheme].buttonBackgrounds[0];
      const expectedBackgrounds = [defaultBackground, defaultBackground];
      const textNodes = tree.root.findAll(
        (instance) => String(instance.type) === 'ThemedTextHost',
      );
      const textColors = textNodes.map(
        (node) => flattenStyle(node.props.style).color,
      );
      const foregroundProbe = tree.root.find(
        (instance) => String(instance.type) === 'CardTextColorHost',
      );

      expect(surfaces.map((surface) => surface.props.lightBackground)).toEqual(
        expectedBackgrounds,
      );
      expect(surfaces.map((surface) => surface.props.darkBackground)).toEqual(
        expectedBackgrounds,
      );
      expect(surfaces.map((surface) => surface.props.borderColor)).toEqual([
        'transparent',
        'transparent',
      ]);
      expect(
        surfaces.map((surface) => flattenStyle(surface.props.style)),
      ).toEqual([
        { overflow: 'hidden', position: 'relative' },
        { overflow: 'hidden', position: 'relative' },
      ]);
      expect(images).toHaveLength(1);
      expect(images[0].props).toMatchObject({
        contentFit: 'cover',
        source: 42,
        transition: 160,
      });
      expect(gradients).toHaveLength(2);
      expect(gradients[0].props.colors).toEqual(
        colorScheme === 'dark'
          ? [
              'rgba(5,10,20,.97)',
              `${expectedBackgrounds[0]}e3`,
              'rgba(2,6,16,.97)',
            ]
          : [
              'rgba(8,15,30,0.97)',
              `${expectedBackgrounds[0]}e3`,
              'rgba(8,15,30,0.97)',
            ],
      );
      expect(textColors).toEqual(['#ffffff', '#ffffff', '#dc2626', '#ffffff']);
      expect(foregroundProbe.props.color).toBe('#ffffff');

      act(() => tree.unmount());
    });

    it('uses a neutral gradient when tile gradients are disabled', () => {
      mockTileGradientSettings = {
        enabled: false,
        angle: 90,
        colors: ['#ff0000', '#00ff00', '#0000ff'],
        locations: [10, 50, 90],
        opacity: 0,
      };
      const tree = renderer.create(
        <ThemeAwareButtonPaletteProvider>
          <ThemeAwareCardSurface customGradientEnabled={false}>
            <ThemeAwareText>Plain tile</ThemeAwareText>
            <CardTextColorProbe />
          </ThemeAwareCardSurface>
        </ThemeAwareButtonPaletteProvider>,
      );
      const gradient = tree.root.find(
        (instance) => String(instance.type) === 'LinearGradientHost',
      );
      const foregroundProbe = tree.root.find(
        (instance) => String(instance.type) === 'CardTextColorHost',
      );

      expect(gradient.props.colors).toEqual([
        'rgba(0,0,0,0.50)',
        'rgba(0,0,0,0.70)',
        'rgba(0,0,0,0.80)',
      ]);
      expect(gradient.props.locations).toEqual([0, 0.48, 1]);
      expect(flattenStyle(gradient.props.style).opacity).toBe(1);
      expect(foregroundProbe.props.color).toBe('#ffffff');

      act(() => tree.unmount());
    });

    it('updates gradient endpoints after measuring the card', () => {
      mockTileGradientSettings = {
        ...mockTileGradientSettings,
        angle: 45,
      };
      const tree = renderer.create(
        <ThemeAwareButtonPaletteProvider>
          <ThemeAwareCardSurface>
            <ThemeAwareText>Measured tile</ThemeAwareText>
          </ThemeAwareCardSurface>
        </ThemeAwareButtonPaletteProvider>,
      );
      const layout = {
        nativeEvent: { layout: { height: 100, width: 200 } },
      };
      const gradient = () =>
        tree.root.find(
          (instance) => String(instance.type) === 'LinearGradientHost',
        );

      act(() => gradient().props.onLayout(layout));
      expect(gradient().props.start.x).toBeCloseTo(0.25);
      expect(gradient().props.start.y).toBeCloseTo(0);
      expect(gradient().props.end.x).toBeCloseTo(0.75);
      expect(gradient().props.end.y).toBeCloseTo(1);
      act(() => gradient().props.onLayout(layout));

      act(() => tree.unmount());
    });

    it('keeps keyed surface colors stable and allows them to repeat', () => {
      const renderBackgrounds = (paletteKeys: string[]) => {
        const tree = renderer.create(
          <ThemeAwareButtonPaletteProvider>
            {paletteKeys.map((paletteKey, index) => (
              <ThemeAwareCardSurface
                key={`${paletteKey}-${index}`}
                paletteKey={paletteKey}
              >
                <ThemeAwareText>{paletteKey}</ThemeAwareText>
              </ThemeAwareCardSurface>
            ))}
          </ThemeAwareButtonPaletteProvider>,
        );
        const backgrounds = tree.root
          .findAll(
            (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
          )
          .map((surface) => surface.props.lightBackground);

        act(() => tree.unmount());
        return backgrounds;
      };
      const firstLoad = renderBackgrounds(['shared', 'first', 'shared']);
      const reorderedLoad = renderBackgrounds(['shared', 'shared', 'first']);

      expect(firstLoad[0]).toBe(firstLoad[2]);
      expect(reorderedLoad[0]).toBe(reorderedLoad[1]);
      expect(reorderedLoad).toEqual([firstLoad[0], firstLoad[2], firstLoad[1]]);
    });

    it('omits the neutral gradient when the tile set is none', () => {
      mockTileSet = 'none';
      mockTileGradientSettings = {
        ...mockTileGradientSettings,
        enabled: false,
      };
      const tree = renderer.create(
        <ThemeAwareButtonPaletteProvider>
          <ThemeAwareCardSurface customGradientEnabled={false}>
            <ThemeAwareText>Plain tile</ThemeAwareText>
          </ThemeAwareCardSurface>
        </ThemeAwareButtonPaletteProvider>,
      );

      expect(
        tree.root.findAll(
          (instance) => String(instance.type) === 'LinearGradientHost',
        ),
      ).toHaveLength(0);

      act(() => tree.unmount());
    });
  },
);
