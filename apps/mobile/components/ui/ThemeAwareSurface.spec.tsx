import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareSurface } from './ThemeAwareSurface';
import { ThemeAwareTextColorContext } from './ThemeAwareTextColorContext';

let mockColorScheme: 'light' | 'dark' = 'light';

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

jest.mock('@/components/ui/box', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Box: (props: Record<string, unknown>) =>
      React.createElement('BoxHost', props),
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

function getSurfaceStyle(tree: renderer.ReactTestRenderer) {
  const surface = tree.root.find(
    (instance) => String(instance.type) === 'BoxHost',
  );
  return flattenStyle(surface.props.style);
}

describe('ThemeAwareSurface', () => {
  afterEach(() => {
    mockColorScheme = 'light';
  });

  it('uses a transparent border when a dark bordered surface has no color', () => {
    mockColorScheme = 'dark';
    const tree = renderer.create(<ThemeAwareSurface borderWidth="$1" />);

    expect(getSurfaceStyle(tree)).toMatchObject({
      borderColor: 'transparent',
      borderWidth: 1,
    });

    act(() => tree.unmount());
  });

  it('uses a transparent border when a light bordered surface has no color', () => {
    const tree = renderer.create(<ThemeAwareSurface borderWidth="$1" />);

    expect(getSurfaceStyle(tree)).toMatchObject({
      borderColor: 'transparent',
      borderWidth: 1,
    });

    act(() => tree.unmount());
  });

  it('preserves an explicitly supplied border color', () => {
    mockColorScheme = 'dark';
    const tree = renderer.create(
      <ThemeAwareSurface borderColor="#123456" borderWidth="$1" />,
    );

    expect(getSurfaceStyle(tree).borderColor).toBe('#123456');

    act(() => tree.unmount());
  });

  it('resets inherited card text color for nested surfaces', () => {
    function TextColorProbe() {
      const color = React.useContext(ThemeAwareTextColorContext);
      return React.createElement('TextColorHost', { color });
    }

    const tree = renderer.create(
      <ThemeAwareTextColorContext.Provider value="#ffffff">
        <ThemeAwareSurface>
          <TextColorProbe />
        </ThemeAwareSurface>
      </ThemeAwareTextColorContext.Provider>,
    );
    const colorProbe = tree.root.find(
      (instance) => String(instance.type) === 'TextColorHost',
    );

    expect(colorProbe.props.color).toBeUndefined();

    act(() => tree.unmount());
  });
});
