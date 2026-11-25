import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { TileGradientCustomizerModal } from './TileGradientCustomizerModal';

import { DEFAULT_TILE_GRADIENT_SETTINGS } from '@/utils/tileGradient';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradientHost',
}));
jest.mock('reanimated-color-picker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    __esModule: true,
    default: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        'ColorPickerHost',
        props,
        children as React.ReactNode,
      ),
    HueSlider: 'ColorPickerHueSliderHost',
    Panel1: 'ColorPickerPanelHost',
  };
});
jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ThemeAwareButtonHost',
}));
jest.mock('@/components/ui/ThemeAwareInput', () => ({
  ThemeAwareInput: 'ThemeAwareInputHost',
}));
jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareText: 'ThemeAwareTextHost',
}));
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
jest.mock('@/components/ui/hstack', () => ({ HStack: 'HStackHost' }));
jest.mock('@/components/ui/vstack', () => ({ VStack: 'VStackHost' }));
jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({ colorScheme: 'light' }),
}));
jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('TileGradientCustomizerModal', () => {
  it('saves angle, colors, stop positions, and opacity', () => {
    const onSave = jest.fn();
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <TileGradientCustomizerModal
          initialSettings={DEFAULT_TILE_GRADIENT_SETTINGS}
          isVisible
          onCancel={jest.fn()}
          onSave={onSave}
        />,
      );
    });

    const input = (label: string) =>
      screen.root.find(
        (instance) =>
          String(instance.type) === 'ThemeAwareInputHost' &&
          instance.props.inputFieldProps.accessibilityLabel === label,
      );
    const colorPickers = () =>
      screen.root.findAll(
        (instance) => String(instance.type) === 'ColorPickerHost',
      );

    act(() => {
      input('tileSet.gradientAngle').props.onChangeText('90');
      input('tileSet.gradientOpacity').props.onChangeText('75');
      colorPickers()[0].props.onCompleteJS({ hex: '#1234566B' });
      colorPickers()[2].props.onCompleteJS({ hex: '#abcdefE6' });
      input('tileSet.gradientStartPosition').props.onChangeText('10');
      input('tileSet.gradientMiddlePosition').props.onChangeText('42');
      input('tileSet.gradientEndPosition').props.onChangeText('100');
    });
    expect(colorPickers()).toHaveLength(3);
    expect(
      screen.root.findAll(
        (instance) => String(instance.type) === 'ColorPickerPanelHost',
      ),
    ).toHaveLength(3);
    expect(
      screen.root.findAll(
        (instance) => String(instance.type) === 'ColorPickerHueSliderHost',
      ),
    ).toHaveLength(3);

    const modal = screen.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.confirmButton.isEnabled).toBe(true);
    act(() => modal.props.confirmButton.onPress());

    expect(onSave).toHaveBeenCalledWith({
      angle: 90,
      colors: ['#123456', null, '#ABCDEF'],
      locations: [10, 42, 100],
      opacity: 75,
    });
    act(() => screen.unmount());
  });

  it('disables applying invalid or out-of-order stop positions', () => {
    const onSave = jest.fn();
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <TileGradientCustomizerModal
          initialSettings={DEFAULT_TILE_GRADIENT_SETTINGS}
          isVisible
          onCancel={jest.fn()}
          onSave={onSave}
        />,
      );
    });

    const middlePosition = screen.root.find(
      (instance) =>
        String(instance.type) === 'ThemeAwareInputHost' &&
        instance.props.inputFieldProps.accessibilityLabel ===
          'tileSet.gradientMiddlePosition',
    );
    act(() => middlePosition.props.onChangeText('0'));

    const modal = screen.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.confirmButton.isEnabled).toBe(false);
    act(() => modal.props.confirmButton.onPress());
    expect(onSave).not.toHaveBeenCalled();

    act(() => screen.unmount());
  });
});
