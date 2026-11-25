import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { HomePageItem } from './HomePageItem';
import { ThemeAwareButtonPaletteProvider } from './ThemeAwareButtonPalette';

import { COLORS } from '@/constants/colors';

let mockColorScheme: 'light' | 'dark' = 'light';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement('FontAwesomeHost', props),
  };
});

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

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

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareText: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        'ThemeAwareTextHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/ThemedModal', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemedModal: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        'ThemedModalHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

function getRelativeLuminance(color: string) {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const red = linearize(Number.parseInt(color.slice(1, 3), 16));
  const green = linearize(Number.parseInt(color.slice(3, 5), 16));
  const blue = linearize(Number.parseInt(color.slice(5, 7), 16));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe.each(['light', 'dark'] as const)(
  'HomePageItem in %s mode',
  (colorScheme) => {
    beforeEach(() => {
      mockColorScheme = colorScheme;
    });

    it('uses stable title-based backgrounds with readable foregrounds', () => {
      const tree = renderer.create(
        <ThemeAwareButtonPaletteProvider>
          <HomePageItem
            description="More information"
            icon="bell"
            isUrgent
            onPress={jest.fn()}
            title="First item"
          />
          <HomePageItem icon="heart" onPress={jest.fn()} title="Second item" />
        </ThemeAwareButtonPaletteProvider>,
      );
      const surfaces = tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
      );
      const backgrounds = surfaces.map(
        (surface) => surface.props.lightBackground,
      );
      const titleNodes = tree.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          ['First item', 'Second item'].includes(
            String(instance.props.children),
          ),
      );
      const icons = tree.root.findAll(
        (instance) => String(instance.type) === 'FontAwesomeHost',
      );
      const iconBadges = tree.root.findAll(
        (instance) =>
          instance.props.style?.backgroundColor === 'rgba(255,255,255,0.16)',
      );

      expect(surfaces).toHaveLength(2);
      expect(
        backgrounds.every((background) =>
          COLORS[colorScheme].buttonBackgrounds.includes(background),
        ),
      ).toBe(true);
      expect(surfaces.map((surface) => surface.props.darkBackground)).toEqual(
        backgrounds,
      );
      expect(surfaces.map((surface) => surface.props.borderColor)).toEqual([
        'transparent',
        'transparent',
      ]);
      expect(titleNodes.map((title) => title.props.style.color)).toEqual([
        '#ffffff',
        '#ffffff',
      ]);
      expect(icons.every((icon) => icon.props.color === '#ffffff')).toBe(true);
      expect(iconBadges.length).toBeGreaterThan(0);
      expect(
        iconBadges.every(
          (iconBadge) => iconBadge.props.style.borderColor === 'transparent',
        ),
      ).toBe(true);

      act(() => tree.unmount());

      const reorderedTree = renderer.create(
        <ThemeAwareButtonPaletteProvider>
          <HomePageItem icon="heart" onPress={jest.fn()} title="Second item" />
          <HomePageItem
            description="More information"
            icon="bell"
            isUrgent
            onPress={jest.fn()}
            title="First item"
          />
        </ThemeAwareButtonPaletteProvider>,
      );
      const reorderedBackgrounds = reorderedTree.root
        .findAll(
          (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
        )
        .map((surface) => surface.props.lightBackground);

      expect(reorderedBackgrounds).toEqual([...backgrounds].reverse());
      act(() => reorderedTree.unmount());
    });
  },
);

it('keeps white foregrounds at WCAG AA contrast across both theme palettes', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const background of COLORS[colorScheme].buttonBackgrounds) {
      expect(getContrastRatio('#ffffff', background)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  }
});
