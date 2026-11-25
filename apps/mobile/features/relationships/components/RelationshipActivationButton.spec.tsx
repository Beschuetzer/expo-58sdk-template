import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { RelationshipActivationButton } from './RelationshipActivationButton';

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        'ThemeAwareButtonHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('RelationshipActivationButton', () => {
  let screen: ReactTestRenderer | undefined;

  afterEach(() => {
    if (screen) {
      act(() => screen?.unmount());
      screen = undefined;
    }
  });

  it('shows active status with solid styling', () => {
    act(() => {
      screen = renderer.create(
        <RelationshipActivationButton isActive onActivate={jest.fn()} />,
      );
    });

    const button = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareButtonHost',
    );

    expect(button.props.children).toBe('home.activeRelationship');
    expect(button.props.variant).toBe('solid');
    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      selected: true,
    });
    expect(button.props.isDisabled).toBe(true);
  });

  it('shows inactive status with outline styling and activates on press', () => {
    const onActivate = jest.fn();
    act(() => {
      screen = renderer.create(
        <RelationshipActivationButton
          isActive={false}
          onActivate={onActivate}
        />,
      );
    });

    const button = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareButtonHost',
    );

    expect(button.props.children).toBe('home.inactiveRelationship');
    expect(button.props.variant).toBe('outline');
    expect(button.props.accessibilityState).toEqual({
      disabled: false,
      selected: false,
    });
    expect(button.props.isDisabled).toBe(false);

    act(() => button.props.onPress());

    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
