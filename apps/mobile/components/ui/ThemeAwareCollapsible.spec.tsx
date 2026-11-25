import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ThemeAwareCollapsible } from './ThemeAwareCollapsible';

jest.mock('react-native-collapsible', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    __esModule: true,
    default: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('CollapsibleHost', props, children),
  };
});

describe('ThemeAwareCollapsible', () => {
  it('forwards collapsible props and children', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ThemeAwareCollapsible align="top" collapsed duration={250}>
          Filter options
        </ThemeAwareCollapsible>,
      );
    });

    const collapsible = screen!.root.find(
      (instance) => String(instance.type) === 'CollapsibleHost',
    );
    expect(collapsible.props).toMatchObject({
      align: 'top',
      collapsed: true,
      duration: 250,
    });
    expect(collapsible.props.children).toBe('Filter options');

    act(() => screen!.unmount());
  });
});
