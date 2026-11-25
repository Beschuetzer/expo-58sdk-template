import { useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeAwareTextColorContext } from '@/components/ui/ThemeAwareTextColorContext';
import { ChevronDownIcon } from '@/components/ui/icon';
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectScrollView,
  SelectTrigger,
} from '@/components/ui/select';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { useThemeAwareTypography } from '@/components/ui/useThemeAwareTypography';

export type ThemeAwareDropdownOption = {
  label: string;
  value: string;
};

type ThemeAwareDropdownProps = {
  onValueChange: (value: string) => void;
  options: readonly ThemeAwareDropdownOption[];
  placeholder: string;
  selectedValue: string;
};

export function ThemeAwareDropdown({
  onValueChange,
  options,
  placeholder,
  selectedValue,
}: ThemeAwareDropdownProps) {
  const { colorScheme, textColor } = useThemeAwareColors();
  const inheritedTextColor = useContext(ThemeAwareTextColorContext);
  const { fontFamily } = useThemeAwareTypography();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const triggerTextColor = inheritedTextColor ?? textColor;
  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? '';

  return (
    <Select selectedValue={selectedValue} onValueChange={onValueChange}>
      <SelectTrigger variant="outline" size="md">
        <SelectInput
          editable={false}
          placeholder={placeholder}
          value={selectedLabel}
          className="text-left"
          style={{ color: triggerTextColor, fontFamily }}
        />
        <SelectIcon
          as={ChevronDownIcon}
          className="mr-3"
          color={triggerTextColor}
        />
      </SelectTrigger>
      <SelectPortal>
        <SelectBackdrop />
        <SelectContent style={{ paddingBottom: insets.bottom + 8 }}>
          <SelectScrollView style={{ maxHeight: height * 0.8 }}>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                label={option.label}
                style={
                  option.value === selectedValue
                    ? {
                        backgroundColor:
                          colorScheme === 'dark' ? '#262626' : '#d4d4d4',
                      }
                    : undefined
                }
                value={option.value}
              >
                <SelectItemText style={{ color: textColor, fontFamily }}>
                  {option.label}
                </SelectItemText>
              </SelectItem>
            ))}
          </SelectScrollView>
        </SelectContent>
      </SelectPortal>
    </Select>
  );
}
