import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareSkeleton } from './ThemeAwareSkeleton';

import { COLORS } from '@/constants/colors';

let mockColorScheme: 'light' | 'dark' | null = 'light';

jest.mock('react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    View: (props: Record<string, unknown>) =>
      React.createElement('ViewHost', props),
  };
});

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

function flattenStyle(style: unknown): Record<string, unknown> {
  const styles = Array.isArray(style) ? style : [style];
  return styles.reduce<Record<string, unknown>>((result, value) => {
    if (value !== null && typeof value === 'object') {
      Object.assign(result, value);
    }
    return result;
  }, {});
}

function getSkeleton(tree: renderer.ReactTestRenderer) {
  return tree.root.find((instance) => String(instance.type) === 'ViewHost');
}

describe('ThemeAwareSkeleton', () => {
  afterEach(() => {
    mockColorScheme = 'light';
  });

  it.each([
    { color: COLORS.light.skeleton, scheme: 'light' as const },
    { color: COLORS.dark.skeleton, scheme: 'dark' as const },
  ])('uses the $scheme skeleton color', ({ color, scheme }) => {
    mockColorScheme = scheme;
    const tree = renderer.create(<ThemeAwareSkeleton testID="skeleton" />);

    expect(flattenStyle(getSkeleton(tree).props.style).backgroundColor).toBe(
      color,
    );

    act(() => tree.unmount());
  });

  it('falls back to the light theme when the system scheme is unavailable', () => {
    mockColorScheme = null;
    const tree = renderer.create(<ThemeAwareSkeleton />);

    expect(flattenStyle(getSkeleton(tree).props.style).backgroundColor).toBe(
      COLORS.light.skeleton,
    );

    act(() => tree.unmount());
  });

  it.each([
    { borderRadius: 4, height: 14, shape: 'text' as const },
    { borderRadius: 12, height: 144, shape: 'card' as const },
    { borderRadius: 8, height: 72, shape: 'row' as const },
  ])(
    'uses the default dimensions for the $shape shape',
    ({ borderRadius, height, shape }) => {
      const tree = renderer.create(<ThemeAwareSkeleton shape={shape} />);

      expect(flattenStyle(getSkeleton(tree).props.style)).toMatchObject({
        borderRadius,
        height,
        width: '100%',
      });

      act(() => tree.unmount());
    },
  );

  it('allows dimensions and styles to be tuned for a screen-specific layout', () => {
    const tree = renderer.create(
      <ThemeAwareSkeleton
        height={18}
        shape="text"
        style={{ borderRadius: 9, opacity: 0.5 }}
        width="65%"
      />,
    );

    expect(flattenStyle(getSkeleton(tree).props.style)).toMatchObject({
      borderRadius: 9,
      height: 18,
      opacity: 0.5,
      width: '65%',
    });

    act(() => tree.unmount());
  });

  it('is hidden from accessibility services', () => {
    const tree = renderer.create(<ThemeAwareSkeleton />);

    expect(getSkeleton(tree).props).toEqual(
      expect.objectContaining({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }),
    );

    act(() => tree.unmount());
  });
});
