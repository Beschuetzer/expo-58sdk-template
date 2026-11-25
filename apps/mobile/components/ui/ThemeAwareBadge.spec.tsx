import React from 'react';
import renderer from 'react-test-renderer';

import { ThemeAwareBadge } from './ThemeAwareBadge';

import { COLORS } from '@/constants/colors';

let mockColorScheme = 'light';

jest.mock('@/components/ui/badge', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createComponent =
    (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children as React.ReactNode);

  return {
    Badge: createComponent('Badge'),
    BadgeText: createComponent('BadgeText'),
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({ colorScheme: mockColorScheme }),
}));

jest.mock('@/components/ui/useThemeAwareTypography', () => ({
  useThemeAwareTypography: () => ({ fontFamily: 'test-font' }),
}));

describe('ThemeAwareBadge', () => {
  afterEach(() => {
    mockColorScheme = 'light';
  });

  it('uses dark background and text colors', () => {
    mockColorScheme = 'dark';
    const tree = renderer.create(
      <ThemeAwareBadge
        darkBackground="$error900"
        darkTextColor="$error100"
        lightBackground="$error100"
        lightTextColor="$error800"
      >
        Rejected
      </ThemeAwareBadge>,
    );
    const badge = tree.root.find(
      (instance) => String(instance.type) === 'Badge',
    );
    const badgeText = tree.root.find(
      (instance) => String(instance.type) === 'BadgeText',
    );

    expect(badge.props.style.backgroundColor).toBe('#7f1d1d');
    expect(badgeText.props.style.color).toBe('#fee2e2');
    expect(badgeText.props.style.fontFamily).toBe('test-font');
  });

  it('uses light background and text colors', () => {
    const tree = renderer.create(
      <ThemeAwareBadge
        darkBackground="$error900"
        darkTextColor="$error100"
        lightBackground="$error100"
        lightTextColor="$error800"
      >
        Rejected
      </ThemeAwareBadge>,
    );
    const badge = tree.root.find(
      (instance) => String(instance.type) === 'Badge',
    );
    const badgeText = tree.root.find(
      (instance) => String(instance.type) === 'BadgeText',
    );

    expect(badge.props.style.backgroundColor).toBe('#fee2e2');
    expect(badgeText.props.style.color).toBe('#991b1b');
    expect(badgeText.props.style.fontFamily).toBe('test-font');
  });

  it('uses the theme-aware default colors when no overrides are provided', () => {
    const tree = renderer.create(<ThemeAwareBadge>Pending</ThemeAwareBadge>);
    const badge = tree.root.find(
      (instance) => String(instance.type) === 'Badge',
    );
    const badgeText = tree.root.find(
      (instance) => String(instance.type) === 'BadgeText',
    );

    expect(badge.props.style.backgroundColor).toBe('#f3f4f6');
    expect(badgeText.props.style.color).toBe(COLORS.light.text);
  });
});
