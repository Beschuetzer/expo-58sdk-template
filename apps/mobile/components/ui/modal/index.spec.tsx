import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ModalBody } from './index';

jest.mock('react-native', () => ({
  TouchableOpacity: 'TouchableOpacityHost',
  View: 'ViewHost',
}));

jest.mock('react-native-gesture-handler', () => ({
  ScrollView: 'GestureHandlerScrollViewHost',
}));

jest.mock('react-native-reanimated', () => {
  const animation = {
    duration: () => animation,
    easing: () => animation,
    withInitialValues: () => animation,
  };

  return {
    __esModule: true,
    default: { createAnimatedComponent: (component: unknown) => component },
    Easing: { linear: jest.fn() },
    FadeIn: animation,
    FadeOut: animation,
    ZoomIn: animation,
    ZoomOut: animation,
  };
});

jest.mock('@gluestack-ui/utils/nativewind-utils', () => ({
  tva: () => () => 'style',
  useStyleContext: () => ({ size: 'md' }),
  withStyleContext: (component: unknown) => component,
}));

jest.mock('nativewind', () => ({
  cssInterop: jest.fn(),
}));

jest.mock('@gluestack-ui/core/modal/creator', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createHost =
    (name: string) =>
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(name, props, children);

  return {
    createModal: (components: Record<string, unknown>) =>
      Object.assign(createHost('ModalHost'), {
        Backdrop: createHost('ModalBackdropHost'),
        Body: components.Body,
        CloseButton: createHost('ModalCloseButtonHost'),
        Content: createHost('ModalContentHost'),
        Footer: createHost('ModalFooterHost'),
        Header: createHost('ModalHeaderHost'),
      }),
  };
});

describe('ModalBody', () => {
  it('allows scrolling by default', () => {
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(<ModalBody>Scrollable content</ModalBody>);
    });

    const body = screen.root.find(
      (instance) => String(instance.type) === 'GestureHandlerScrollViewHost',
    );
    expect(body.props.scrollEnabled).not.toBe(false);

    act(() => screen.unmount());
  });

  it('preserves an explicit scrollEnabled override', () => {
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ModalBody scrollEnabled={false}>Static content</ModalBody>,
      );
    });

    expect(
      screen.root.find(
        (instance) => String(instance.type) === 'GestureHandlerScrollViewHost',
      ).props.scrollEnabled,
    ).toBe(false);

    act(() => screen.unmount());
  });
});
