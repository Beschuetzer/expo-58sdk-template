import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { useThemeAwareColors } from './useThemeAwareColors';

import { COLORS } from '@/constants/colors';

let mockColorScheme: 'light' | 'dark' | undefined;

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

function ThemeAwareColorsProbe() {
  const colors = useThemeAwareColors();

  return React.createElement('ThemeAwareColorsHost', {
    backgroundColor: colors.backgroundColor,
    colorScheme: colors.colorScheme,
    inverseTextColor: colors.getTextColor(true),
    textColor: colors.textColor,
  });
}

describe('useThemeAwareColors', () => {
  afterEach(() => {
    mockColorScheme = undefined;
  });

  it('uses the system theme palette and supports text on solid backgrounds', () => {
    mockColorScheme = 'dark';
    const darkTree = renderer.create(<ThemeAwareColorsProbe />);
    const darkColors = darkTree.root.find(
      (instance) => String(instance.type) === 'ThemeAwareColorsHost',
    );

    expect(darkColors.props).toEqual({
      backgroundColor: COLORS.dark.background,
      colorScheme: 'dark',
      inverseTextColor: '#ffffff',
      textColor: COLORS.dark.text,
    });
    act(() => darkTree.unmount());

    mockColorScheme = undefined;
    const lightTree = renderer.create(<ThemeAwareColorsProbe />);
    const lightColors = lightTree.root.find(
      (instance) => String(instance.type) === 'ThemeAwareColorsHost',
    );
    expect(lightColors.props).toEqual({
      backgroundColor: COLORS.light.background,
      colorScheme: 'light',
      inverseTextColor: '#ffffff',
      textColor: COLORS.light.text,
    });
    act(() => lightTree.unmount());
  });
});
