import React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { ThemeAwareButton } from './ThemeAwareButton';
import {
  ThemeAwareButtonPaletteProvider,
  useThemeAwareButtonPaletteIndex,
} from './ThemeAwareButtonPalette';

import { COLORS } from '@/constants/colors';

let mockColorScheme = 'light';

jest.mock('@/components/ui/button', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    Button: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('Button', props, children as React.ReactNode),
    ButtonSpinner: () => React.createElement('ButtonSpinner'),
    ButtonText: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('ButtonText', props, children as React.ReactNode),
  };
});

jest.mock('@/components/ui/useThemeAwareColors', () => ({
  useThemeAwareColors: () => ({
    colorScheme: mockColorScheme,
    getTextColor: (onSolidBackground = false) =>
      onSolidBackground ? '#ffffff' : '$black',
  }),
}));

jest.mock('@/components/ui/useThemeAwareTypography', () => ({
  useThemeAwareTypography: () => ({ fontFamily: 'test-font' }),
}));

describe('ThemeAwareButton', () => {
  it('shows a spinner and blocks repeat presses until the callback finishes', async () => {
    let resolveCallback: (() => void) | undefined;
    const onPress = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCallback = resolve;
        }),
    );
    const tree = renderer.create(
      <ThemeAwareButton onPress={onPress}>Save</ThemeAwareButton>,
    );
    const findButton = () =>
      tree.root.find((instance) => String(instance.type) === 'Button');
    const findSpinners = () =>
      tree.root.findAll(
        (instance) => String(instance.type) === 'ButtonSpinner',
      );
    const findButtonText = () =>
      tree.root.findAll((instance) => String(instance.type) === 'ButtonText');
    const initialButton = findButton();
    let pressPromise!: Promise<void>;

    expect(findButtonText()).toHaveLength(1);

    act(() => {
      pressPromise = initialButton.props.onPress({});
      initialButton.props.onPress({});
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(findButton().props.isDisabled).toBe(true);
    expect(findSpinners()).toHaveLength(1);
    expect(findButtonText()).toHaveLength(0);

    await act(async () => {
      resolveCallback?.();
      await pressPromise;
    });

    expect(findButton().props.isDisabled).toBe(false);
    expect(findSpinners()).toHaveLength(0);
    expect(findButtonText()).toHaveLength(1);
    expect(findButtonText()[0].props.children).toBe('Save');
  });

  it('uses dark-theme backgrounds and supports custom button backgrounds', () => {
    mockColorScheme = 'dark';
    const darkTree = renderer.create(
      <ThemeAwareButton darkBackground="#123456">Dark</ThemeAwareButton>,
    );
    const darkButton = darkTree.root.find(
      (instance) => String(instance.type) === 'Button',
    );

    expect(StyleSheet.flatten(darkButton.props.style).backgroundColor).toBe(
      '#123456',
    );

    const customTree = renderer.create(
      <ThemeAwareButton bg="#abcdef">Custom</ThemeAwareButton>,
    );
    const customButton = customTree.root.find(
      (instance) => String(instance.type) === 'Button',
    );

    expect(StyleSheet.flatten(customButton.props.style).backgroundColor).toBe(
      '#abcdef',
    );
    mockColorScheme = 'light';
  });

  it('uses a readable primary background for dark-theme button labels', () => {
    mockColorScheme = 'dark';
    const tree = renderer.create(
      <ThemeAwareButton action="primary">Selected</ThemeAwareButton>,
    );
    const button = tree.root.find(
      (instance) => String(instance.type) === 'Button',
    );
    const buttonText = tree.root.find(
      (instance) => String(instance.type) === 'ButtonText',
    );

    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(
      COLORS.dark.primaryButtonBackground,
    );
    expect(StyleSheet.flatten(buttonText.props.style).color).toBe('#ffffff');
    expect(COLORS.dark.primaryButtonBackground).not.toBe('#ffffff');

    tree.unmount();
    mockColorScheme = 'light';
  });

  it('allows multiline labels to wrap and expand the button height', () => {
    const label =
      'Continue after reviewing the details below. This text should wrap on a narrow screen.';
    const tree = renderer.create(
      <ThemeAwareButton size="sm">{label}</ThemeAwareButton>,
    );
    const button = tree.root.find(
      (instance) => String(instance.type) === 'Button',
    );
    const buttonText = tree.root.find(
      (instance) => String(instance.type) === 'ButtonText',
    );

    const buttonStyle = StyleSheet.flatten(button.props.style);
    const buttonTextStyle = StyleSheet.flatten(buttonText.props.style);

    expect(buttonStyle.height).toBeUndefined();
    expect(buttonStyle.minHeight).toBe(36);
    expect(buttonStyle.paddingVertical).toBe(8);
    expect(buttonTextStyle.flexShrink).toBe(1);
    expect(buttonTextStyle.textAlign).toBe('center');
    expect(buttonText.props.children).toBe(label);
  });

  it('preserves explicitly configured button heights', () => {
    const tree = renderer.create(
      <ThemeAwareButton h="$8">Custom height</ThemeAwareButton>,
    );
    const button = tree.root.find(
      (instance) => String(instance.type) === 'Button',
    );

    const buttonStyle = StyleSheet.flatten(button.props.style);

    expect(buttonStyle.height).toBe(32);
    expect(buttonStyle.minHeight).toBe(32);
  });

  it('renders outline requests as solid buttons', () => {
    const tree = renderer.create(
      <ThemeAwareButton variant="outline">
        {React.createElement('Icon')}
      </ThemeAwareButton>,
    );
    const button = tree.root.find(
      (instance) => String(instance.type) === 'Button',
    );

    expect(button.props.variant).toBe('default');
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(
      '#1769aa',
    );
  });

  it('keeps palette colors stable and allows buttons to share a color', () => {
    const renderButtonColors = () => {
      const tree = renderer.create(
        <ThemeAwareButtonPaletteProvider>
          <ThemeAwareButton paletteKey="shared-action">First</ThemeAwareButton>
          <ThemeAwareButton paletteKey="shared-action">Second</ThemeAwareButton>
          <ThemeAwareButton>Save</ThemeAwareButton>
          <ThemeAwareButton>Save</ThemeAwareButton>
        </ThemeAwareButtonPaletteProvider>,
      );
      const backgrounds = tree.root
        .findAll((instance) => String(instance.type) === 'Button')
        .map(
          (button) => StyleSheet.flatten(button.props.style).backgroundColor,
        );

      act(() => tree.unmount());
      return backgrounds;
    };
    const firstLoadColors = renderButtonColors();

    expect(renderButtonColors()).toEqual(firstLoadColors);
    expect(firstLoadColors[0]).toBe(firstLoadColors[1]);
    expect(firstLoadColors[2]).toBe(firstLoadColors[3]);
  });

  it('reuses a palette index for a repeated button ID', () => {
    function PaletteIndexProbe({ buttonId }: { buttonId: string }) {
      const index = useThemeAwareButtonPaletteIndex(buttonId);
      return React.createElement('PaletteIndexHost', { index });
    }

    const tree = renderer.create(
      <ThemeAwareButtonPaletteProvider>
        <PaletteIndexProbe buttonId="first" />
        <PaletteIndexProbe buttonId="first" />
        <PaletteIndexProbe buttonId="second" />
      </ThemeAwareButtonPaletteProvider>,
    );
    const indexes = tree.root
      .findAll((instance) => String(instance.type) === 'PaletteIndexHost')
      .map((instance) => instance.props.index);

    expect(indexes[0]).toBe(indexes[1]);
  });

  it('keeps link buttons transparent', () => {
    const tree = renderer.create(
      <ThemeAwareButton variant="link">Link</ThemeAwareButton>,
    );
    const button = tree.root.find(
      (instance) => String(instance.type) === 'Button',
    );
    const buttonText = tree.root.find(
      (instance) => String(instance.type) === 'ButtonText',
    );

    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(
      'transparent',
    );
    expect(COLORS.light.buttonBackgrounds).toContain(
      StyleSheet.flatten(buttonText.props.style).color,
    );
  });

  it('reuses link text colors for buttons with the same label', () => {
    const tree = renderer.create(
      <ThemeAwareButtonPaletteProvider>
        <ThemeAwareButton variant="link">More</ThemeAwareButton>
        <ThemeAwareButton variant="link">More</ThemeAwareButton>
      </ThemeAwareButtonPaletteProvider>,
    );
    const textColors = tree.root
      .findAll((instance) => String(instance.type) === 'ButtonText')
      .map((text) => StyleSheet.flatten(text.props.style).color);

    expect(textColors[0]).toBe(textColors[1]);
  });

  it('keeps link icon buttons transparent', () => {
    const tree = renderer.create(
      <ThemeAwareButton variant="link">
        {React.createElement('Icon')}
      </ThemeAwareButton>,
    );
    const button = tree.root.find(
      (instance) => String(instance.type) === 'Button',
    );

    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(
      'transparent',
    );
    expect(
      tree.root.findAll((instance) => String(instance.type) === 'ButtonText'),
    ).toHaveLength(0);
  });

  it('ignores presses when no handler is provided or the button is disabled', () => {
    const withoutHandler = renderer.create(
      <ThemeAwareButton>Static</ThemeAwareButton>,
    );
    const disabled = renderer.create(
      <ThemeAwareButton disabled onPress={jest.fn()}>
        Disabled
      </ThemeAwareButton>,
    );

    act(() => {
      withoutHandler.root
        .find((instance) => String(instance.type) === 'Button')
        .props.onPress({});
      disabled.root
        .find((instance) => String(instance.type) === 'Button')
        .props.onPress({});
    });

    expect(
      disabled.root.find((instance) => String(instance.type) === 'Button').props
        .isDisabled,
    ).toBe(true);
  });
});
