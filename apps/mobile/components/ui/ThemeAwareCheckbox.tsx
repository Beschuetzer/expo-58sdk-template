import { Checkbox } from 'expo-checkbox';
import type { ComponentProps } from 'react';

import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { COLORS } from '@/constants/colors';

export type ThemeAwareCheckboxProps = Omit<
  ComponentProps<typeof Checkbox>,
  'color' | 'onValueChange' | 'value'
> & {
  checkboxPosition?: 'left' | 'right';
  label?: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

export function ThemeAwareCheckbox({
  accessibilityLabel,
  checkboxPosition = 'left',
  label = '',
  onValueChange,
  value,
  ...checkboxProps
}: ThemeAwareCheckboxProps) {
  const { colorScheme } = useThemeAwareColors();
  const checkbox = (
    <Checkbox
      {...checkboxProps}
      accessibilityLabel={accessibilityLabel ?? label}
      color={COLORS[colorScheme].tint}
      onValueChange={onValueChange}
      value={value}
    />
  );
  const labelText = <ThemeAwareText flexShrink={1}>{label}</ThemeAwareText>;

  return (
    <HStack space="sm" className="items-center">
      {checkboxPosition === 'left' ? checkbox : labelText}
      {checkboxPosition === 'left' ? labelText : checkbox}
    </HStack>
  );
}
