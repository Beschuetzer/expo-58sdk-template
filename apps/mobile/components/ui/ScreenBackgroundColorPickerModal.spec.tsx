import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ScreenBackgroundColorPickerModal } from './ScreenBackgroundColorPickerModal';

jest.mock('@/components/ui/ThemeAwareColorPicker', () => ({
  ThemeAwareColorPicker: 'ColorPickerHost',
}));
jest.mock('@/components/ui/ThemeAwareText', () => ({
  ThemeAwareText: 'TextHost',
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
jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({ colorScheme: 'light' }),
}));
jest.mock('@/components/ui/vstack', () => ({ VStack: 'VStackHost' }));
jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe('ScreenBackgroundColorPickerModal', () => {
  it('applies a valid custom color and supports cancellation', () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ScreenBackgroundColorPickerModal
          initialColor="#F6F0E5"
          isVisible
          onCancel={onCancel}
          onSave={onSave}
        />,
      );
    });

    const picker = screen.root.find(
      (instance) => String(instance.type) === 'ColorPickerHost',
    );
    expect(picker.props.value).toBe('#F6F0E5');
    act(() => picker.props.onColorChange('#123456'));

    const modal = screen.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.confirmButton.isEnabled).toBe(true);
    act(() => modal.props.confirmButton.onPress());
    expect(onSave).toHaveBeenCalledWith('#123456');
    act(() => modal.props.cancelButton.onPress());
    expect(onCancel).toHaveBeenCalledTimes(1);

    act(() => screen.unmount());
  });

  it('disables applying an invalid color', () => {
    const onSave = jest.fn();
    let screen!: renderer.ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <ScreenBackgroundColorPickerModal
          initialColor="#F6F0E5"
          isVisible
          onCancel={jest.fn()}
          onSave={onSave}
        />,
      );
    });

    const picker = screen.root.find(
      (instance) => String(instance.type) === 'ColorPickerHost',
    );
    act(() => picker.props.onColorChange('#1234'));

    const modal = screen.root.find(
      (instance) => String(instance.type) === 'ThemedModalHost',
    );
    expect(modal.props.confirmButton.isEnabled).toBe(false);
    act(() => modal.props.confirmButton.onPress());
    expect(onSave).not.toHaveBeenCalled();

    act(() => screen.unmount());
  });
});
