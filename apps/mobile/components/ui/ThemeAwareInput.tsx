import type { ComponentProps, ReactElement } from 'react';
import { useState } from 'react';

import {
  resolveLegacyColor,
  splitLegacyStyleProps,
  type LegacyStyleProps,
} from './legacyStyle';

import { AddIcon, RemoveIcon } from '@/components/ui/icon';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { useThemeAwareTypography } from '@/components/ui/useThemeAwareTypography';

type InputType = 'number' | 'text';

export type ThemeAwareInputProps = {
  decrementButtonProps?: Omit<ComponentProps<typeof InputSlot>, 'children'>;
  decrementAccessibilityLabel?: string;
  decrementIcon?: ReactElement;
  defaultValue?: string;
  incrementButtonProps?: Omit<ComponentProps<typeof InputSlot>, 'children'>;
  incrementAccessibilityLabel?: string;
  incrementIcon?: ReactElement;
  inputFieldProps?: Omit<
    ComponentProps<typeof InputField>,
    'defaultValue' | 'onChangeText' | 'value'
  > &
    LegacyStyleProps;
  inputProps?: ComponentProps<typeof Input> & LegacyStyleProps;
  inputType?: InputType;
  max?: number;
  min?: number;
  onChangeText?: (value: string) => void;
  step?: number;
  value?: string;
};

function parseNumber(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseFloat((value ?? '').replace(',', '.'));
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function ThemeAwareInput({
  decrementButtonProps,
  decrementAccessibilityLabel,
  decrementIcon = <RemoveIcon />,
  defaultValue = '',
  incrementButtonProps,
  incrementAccessibilityLabel,
  incrementIcon = <AddIcon />,
  inputFieldProps,
  inputProps,
  inputType = 'text',
  max,
  min,
  onChangeText,
  step = 1,
  value,
}: ThemeAwareInputProps) {
  const { colorScheme, textColor } = useThemeAwareColors();
  const { fontFamily } = useThemeAwareTypography();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const currentValue = value ?? uncontrolledValue;
  const isNumberInput = inputType === 'number';
  const { props: nativeInputProps, style: inputLegacyStyle } =
    splitLegacyStyleProps(inputProps ?? {}, colorScheme);
  const { props: nativeInputFieldProps, style: inputFieldLegacyStyle } =
    splitLegacyStyleProps(inputFieldProps ?? {}, colorScheme);

  const updateValue = (nextValue: string) => {
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }
    onChangeText?.(nextValue);
  };

  const adjustValue = (direction: 1 | -1) => {
    const nextValue =
      parseNumber(currentValue, min ?? 0) + direction * Math.abs(step);
    const boundedValue = Math.min(
      max ?? nextValue,
      Math.max(min ?? nextValue, nextValue),
    );
    const formattedValue = String(boundedValue);
    updateValue(
      currentValue.includes(',')
        ? formattedValue.replace('.', ',')
        : formattedValue,
    );
  };

  return (
    <Input {...nativeInputProps} style={[inputLegacyStyle, inputProps?.style]}>
      {isNumberInput ? (
        <InputSlot
          {...decrementButtonProps}
          disabled={
            decrementButtonProps?.disabled ||
            (min !== undefined && parseNumber(currentValue, min) <= min)
          }
          onPress={(event) => {
            decrementButtonProps?.onPress?.(event);
            adjustValue(-1);
          }}
          accessibilityLabel={
            decrementAccessibilityLabel ??
            decrementButtonProps?.accessibilityLabel
          }
          className="px-2"
        >
          {decrementIcon}
        </InputSlot>
      ) : null}
      <InputField
        {...nativeInputFieldProps}
        style={[
          {
            color: resolveLegacyColor(
              inputFieldProps?.color ?? textColor,
              colorScheme,
            ),
            fontFamily: inputFieldProps?.fontFamily ?? fontFamily,
          },
          inputFieldLegacyStyle,
          inputFieldProps?.style,
        ]}
        className={inputFieldProps?.className}
        keyboardType={isNumberInput ? 'numeric' : inputFieldProps?.keyboardType}
        onChangeText={updateValue}
        value={currentValue}
      />
      {isNumberInput ? (
        <InputSlot
          {...incrementButtonProps}
          disabled={
            incrementButtonProps?.disabled ||
            (max !== undefined && parseNumber(currentValue, max) >= max)
          }
          onPress={(event) => {
            incrementButtonProps?.onPress?.(event);
            adjustValue(1);
          }}
          accessibilityLabel={
            incrementAccessibilityLabel ??
            incrementButtonProps?.accessibilityLabel
          }
          className="px-2"
        >
          {incrementIcon}
        </InputSlot>
      ) : null}
    </Input>
  );
}
