import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareInput } from './ThemeAwareInput';

jest.mock('@/components/ui/icon', () => ({
  AddIcon: 'AddIconHost',
  RemoveIcon: 'RemoveIconHost',
}));
jest.mock('@/components/ui/input', () => ({
  Input: 'InputHost',
  InputField: 'InputFieldHost',
  InputSlot: 'InputSlotHost',
}));
jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({ colorScheme: 'light', textColor: '#111111' }),
}));
jest.mock('@/components/ui/useThemeAwareTypography', () => ({
  useThemeAwareTypography: () => ({ fontFamily: 'TestFont' }),
}));

describe('ThemeAwareInput numeric controls', () => {
  it.each([
    ['12,5', '13,5', '11,5'],
    ['12.5', '13.5', '11.5'],
    ['12', '13', '11'],
  ])(
    'adjusts %s without losing its decimal separator',
    (value, incremented, decremented) => {
      const onChangeText = jest.fn();
      let input!: renderer.ReactTestRenderer;
      act(() => {
        input = renderer.create(
          <ThemeAwareInput
            inputType="number"
            onChangeText={onChangeText}
            value={value}
          />,
        );
      });

      const buttons = input.root.findAll(
        (instance) => String(instance.type) === 'InputSlotHost',
      );
      act(() => buttons[1].props.onPress({}));
      expect(onChangeText).toHaveBeenLastCalledWith(incremented);
      act(() => buttons[0].props.onPress({}));
      expect(onChangeText).toHaveBeenLastCalledWith(decremented);
      act(() => input.unmount());
    },
  );

  it('compares comma-decimal values correctly against numeric bounds', () => {
    let input!: renderer.ReactTestRenderer;
    act(() => {
      input = renderer.create(
        <ThemeAwareInput
          inputType="number"
          min={12.25}
          max={12.75}
          value="12,50"
        />,
      );
    });

    const buttons = () =>
      input.root.findAll(
        (instance) => String(instance.type) === 'InputSlotHost',
      );
    expect(buttons()[0].props.disabled).toBe(false);
    expect(buttons()[1].props.disabled).toBe(false);

    act(() => {
      input.update(
        <ThemeAwareInput inputType="number" max={12.4} value="12,50" />,
      );
    });
    expect(buttons()[1].props.disabled).toBe(true);
    act(() => input.unmount());
  });
});
