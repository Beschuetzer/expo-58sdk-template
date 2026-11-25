import React from 'react';
import renderer from 'react-test-renderer';

import { ThemeAwareDropdown } from './ThemeAwareDropdown';
import { ThemeAwareTextColorContext } from './ThemeAwareTextColorContext';

let mockTextColor = '$textLight900';
let mockColorScheme = 'light';

jest.mock('@/components/ui/select', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const createComponent =
    (name: string) =>
    ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(name, props, children as React.ReactNode);
  return {
    Select: createComponent('Select'),
    SelectBackdrop: createComponent('SelectBackdrop'),
    SelectContent: createComponent('SelectContent'),
    SelectIcon: createComponent('SelectIcon'),
    SelectInput: createComponent('SelectInput'),
    SelectItem: createComponent('SelectItem'),
    SelectItemText: createComponent('SelectItemText'),
    SelectPortal: createComponent('SelectPortal'),
    SelectScrollView: createComponent('SelectScrollView'),
    SelectTrigger: createComponent('SelectTrigger'),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 24, left: 0 }),
}));

jest.mock('@/components/ui/icon', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ChevronDownIcon: () => React.createElement('ChevronDownIcon'),
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: mockColorScheme,
    textColor: mockTextColor,
  }),
}));

jest.mock('@/components/ui/useThemeAwareTypography', () => ({
  useThemeAwareTypography: () => ({ fontFamily: 'test-font' }),
}));

describe('ThemeAwareDropdown', () => {
  afterEach(() => {
    mockTextColor = '$textLight900';
    mockColorScheme = 'light';
  });

  it('applies theme-aware text and displays the selected option label', () => {
    mockTextColor = '$textDark50';
    mockColorScheme = 'dark';
    const onValueChange = jest.fn();
    const tree = renderer.create(
      <ThemeAwareDropdown
        onValueChange={onValueChange}
        options={[
          { label: 'Shared', value: 'shared' },
          { label: 'Personal', value: 'personal' },
        ]}
        placeholder="Choose a space"
        selectedValue="personal"
      />,
    );
    const selectInput = tree.root.find(
      (instance) => String(instance.type) === 'SelectInput',
    );
    const selectIcon = tree.root.find(
      (instance) => String(instance.type) === 'SelectIcon',
    );
    const selectContent = tree.root.find(
      (instance) => String(instance.type) === 'SelectContent',
    );
    const selectScrollView = tree.root.find(
      (instance) => String(instance.type) === 'SelectScrollView',
    );
    const selectItems = tree.root.findAll(
      (instance) => String(instance.type) === 'SelectItem',
    );
    const select = tree.root.find(
      (instance) => String(instance.type) === 'Select',
    );

    expect(selectInput.props.style).toEqual({
      color: '$textDark50',
      fontFamily: 'test-font',
    });
    expect(selectInput.props.className).toBe('text-left');
    expect(selectInput.props.value).toBe('Personal');
    expect(selectIcon.props.color).toBe('$textDark50');
    expect(selectContent.props.style).toEqual({ paddingBottom: 32 });
    expect(selectScrollView.props.style.maxHeight).toBeGreaterThan(0);
    expect(selectItems).toHaveLength(2);
    expect(selectItems[1].props.style.backgroundColor).toBe('#262626');
    expect(
      selectItems[1].find(
        (instance) => String(instance.type) === 'SelectItemText',
      ).props.style,
    ).toEqual({ color: '$textDark50', fontFamily: 'test-font' });
    expect(select.props.selectedValue).toBe('personal');

    select.props.onValueChange('shared');
    expect(onValueChange).toHaveBeenCalledWith('shared');
  });

  it('uses the card foreground color for the trigger without changing menu text', () => {
    const tree = renderer.create(
      <ThemeAwareTextColorContext.Provider value="#ffffff">
        <ThemeAwareDropdown
          onValueChange={jest.fn()}
          options={[
            { label: 'Shared', value: 'shared' },
            { label: 'Personal', value: 'personal' },
          ]}
          placeholder="Choose a space"
          selectedValue="personal"
        />
      </ThemeAwareTextColorContext.Provider>,
    );
    const selectInput = tree.root.find(
      (instance) => String(instance.type) === 'SelectInput',
    );
    const selectIcon = tree.root.find(
      (instance) => String(instance.type) === 'SelectIcon',
    );
    const selectItemTexts = tree.root.findAll(
      (instance) => String(instance.type) === 'SelectItemText',
    );

    expect(selectInput.props.style.color).toBe('#ffffff');
    expect(selectIcon.props.color).toBe('#ffffff');
    expect(selectItemTexts).toHaveLength(2);
    for (const selectItemText of selectItemTexts) {
      expect(selectItemText.props.style).toEqual({
        color: '$textLight900',
        fontFamily: 'test-font',
      });
    }
  });

  it('uses the light checked background for the selected option', () => {
    const tree = renderer.create(
      <ThemeAwareDropdown
        onValueChange={jest.fn()}
        options={[
          { label: 'Shared', value: 'shared' },
          { label: 'Personal', value: 'personal' },
        ]}
        placeholder="Choose a space"
        selectedValue="personal"
      />,
    );
    const selectedItem = tree.root.find(
      (instance) =>
        String(instance.type) === 'SelectItem' &&
        instance.props.value === 'personal',
    );

    expect(selectedItem.props.style.backgroundColor).toBe('#d4d4d4');
  });

  it('shows an empty label when the selected value is not available', () => {
    const tree = renderer.create(
      <ThemeAwareDropdown
        onValueChange={jest.fn()}
        options={[{ label: 'Shared', value: 'shared' }]}
        placeholder="Choose a space"
        selectedValue="missing"
      />,
    );
    const selectInput = tree.root.find(
      (instance) => String(instance.type) === 'SelectInput',
    );

    expect(selectInput.props.value).toBe('');
  });
});
