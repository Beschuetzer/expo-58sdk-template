import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareCheckbox } from './ThemeAwareCheckbox';

let mockColorScheme = 'light';

jest.mock('@/components/ui/hstack', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    HStack: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('HStackHost', props, children as React.ReactNode),
  };
});

jest.mock('expo-checkbox', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    Checkbox: (props: Record<string, unknown>) =>
      React.createElement('CheckboxHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareText: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareTextHost',
        props,
        children as React.ReactNode,
      ),
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({ colorScheme: mockColorScheme }),
}));

describe('ThemeAwareCheckbox', () => {
  afterEach(() => {
    mockColorScheme = 'light';
  });

  it('places the checkbox to the left of the label by default', () => {
    const onValueChange = jest.fn();
    const tree = renderer.create(
      <ThemeAwareCheckbox label="Alex" onValueChange={onValueChange} value />,
    );
    const children = tree.root
      .findAll(
        (instance) =>
          String(instance.type) === 'CheckboxHost' ||
          String(instance.type) === 'ThemeAwareTextHost',
      )
      .map((instance) => String(instance.type));
    const checkbox = tree.root.find(
      (instance) => String(instance.type) === 'CheckboxHost',
    );

    expect(children).toEqual(['CheckboxHost', 'ThemeAwareTextHost']);
    expect(checkbox.props.accessibilityLabel).toBe('Alex');
    expect(checkbox.props.color).toBe('#1a1a1a');
    expect(checkbox.props.value).toBe(true);

    act(() => checkbox.props.onValueChange(false));

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('can place the checkbox to the right of the label with the dark theme tint', () => {
    mockColorScheme = 'dark';
    const tree = renderer.create(
      <ThemeAwareCheckbox
        checkboxPosition="right"
        label="Alex"
        onValueChange={jest.fn()}
        value={false}
      />,
    );
    const children = tree.root
      .findAll(
        (instance) =>
          String(instance.type) === 'CheckboxHost' ||
          String(instance.type) === 'ThemeAwareTextHost',
      )
      .map((instance) => String(instance.type));
    const checkbox = tree.root.find(
      (instance) => String(instance.type) === 'CheckboxHost',
    );

    expect(children).toEqual(['ThemeAwareTextHost', 'CheckboxHost']);
    expect(checkbox.props.color).toBe('#fff');
  });

  it('uses an explicit accessibility label when no visible label is provided', () => {
    const tree = renderer.create(
      <ThemeAwareCheckbox
        accessibilityLabel="Select Alex"
        onValueChange={jest.fn()}
        value={false}
      />,
    );
    const checkbox = tree.root.find(
      (instance) => String(instance.type) === 'CheckboxHost',
    );
    const label = tree.root.find(
      (instance) => String(instance.type) === 'ThemeAwareTextHost',
    );

    expect(checkbox.props.accessibilityLabel).toBe('Select Alex');
    expect(label.props.children).toBe('');
  });
});
