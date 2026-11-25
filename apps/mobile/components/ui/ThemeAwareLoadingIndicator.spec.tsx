import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareLoadingIndicator } from './ThemeAwareLoadingIndicator';

import { COLORS } from '@/constants/colors';

let mockColorScheme: 'light' | 'dark' | undefined;

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicatorHost',
}));

jest.mock('@/components/hooks/useColorScheme', () => ({
  useColorScheme: () => mockColorScheme,
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('ThemeAwareLoadingIndicator', () => {
  afterEach(() => {
    mockColorScheme = undefined;
  });

  it('uses the light theme when the system scheme is unavailable', () => {
    const tree = renderer.create(
      <ThemeAwareLoadingIndicator testID="loading-default" />,
    );
    const indicator = tree.root.find(
      (instance) => String(instance.type) === 'ActivityIndicatorHost',
    );

    expect(indicator.props).toEqual({
      accessibilityLabel: 'common.loading',
      color: COLORS.light.tint,
      size: 'large',
      testID: 'loading-default',
    });

    act(() => tree.unmount());
  });

  it('uses dark theme colors and forwards a small size', () => {
    mockColorScheme = 'dark';
    const tree = renderer.create(
      <ThemeAwareLoadingIndicator size="small" testID="loading-small" />,
    );
    const indicator = tree.root.find(
      (instance) => String(instance.type) === 'ActivityIndicatorHost',
    );

    expect(indicator.props).toEqual({
      accessibilityLabel: 'common.loading',
      color: COLORS.dark.tint,
      size: 'small',
      testID: 'loading-small',
    });

    act(() => tree.unmount());
  });
});
