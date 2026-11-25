import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

import {
  resolveLegacyColor,
  resolveLegacySpacing,
  splitLegacyStyleProps,
  type LegacyStyleProps,
} from './legacyStyle';

import { useThemeAwareButtonPaletteIndex } from '@/components/ui/ThemeAwareButtonPalette';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { useThemeAwareTypography } from '@/components/ui/useThemeAwareTypography';
import { COLORS } from '@/constants/colors';

const BUTTON_MIN_HEIGHTS = {
  xs: 32,
  sm: 36,
  md: 40,
  lg: 44,
  xl: 48,
} as const;

type ThemeAwareButtonProps = Omit<
  ComponentProps<typeof Button>,
  | 'className'
  | 'disabled'
  | 'isDisabled'
  | 'onPress'
  | 'size'
  | 'style'
  | 'variant'
> &
  LegacyStyleProps & {
    children: ReactNode;
    action?: 'default' | 'positive' | 'negative' | 'secondary' | 'primary';
    className?: string;
    darkBackground?: string;
    lightBackground?: string;
    paletteKey?: string;
    disabled?: boolean;
    isDisabled?: boolean;
    onPress?:
      | ((event: GestureResponderEvent) => void | Promise<unknown>)
      | null;
    size?: keyof typeof BUTTON_MIN_HEIGHTS;
    style?: StyleProp<ViewStyle>;
    variant?:
      | 'solid'
      | 'outline'
      | 'link'
      | 'default'
      | 'secondary'
      | 'destructive'
      | 'ghost';
  };

export function ThemeAwareButton(props: ThemeAwareButtonProps) {
  const {
    children,
    action,
    darkBackground,
    lightBackground,
    variant = 'solid',
    bg,
    onPress,
    disabled,
    isDisabled,
    size = 'md',
    h,
    height,
    minHeight,
    paletteKey,
    py,
    className,
    style: explicitStyle,
    ...styleProps
  } = props;
  const [isLoading, setIsLoading] = useState(false);
  const isPressInProgress = useRef(false);
  const resolvedPaletteKey =
    paletteKey ??
    (typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : undefined);
  const paletteIndex = useThemeAwareButtonPaletteIndex(resolvedPaletteKey);
  const { colorScheme, getTextColor } = useThemeAwareColors();
  const { fontFamily } = useThemeAwareTypography();
  const { props: buttonProps, style: legacyStyle } = splitLegacyStyleProps(
    styleProps,
    colorScheme,
  );
  const resolvedVariant =
    variant === 'outline' || variant === 'solid' ? 'default' : variant;
  const buttonSize =
    size === 'xs' || size === 'sm'
      ? 'sm'
      : size === 'lg' || size === 'xl'
        ? 'lg'
        : 'default';
  const shouldApplyDefaultBackground = resolvedVariant !== 'link';
  const buttonBackgrounds = COLORS[colorScheme].buttonBackgrounds;
  const background = colorScheme === 'dark' ? darkBackground : lightBackground;
  const paletteBackground =
    buttonBackgrounds[paletteIndex % buttonBackgrounds.length];
  const resolvedHeight = height ?? h ?? 'auto';
  const resolvedMinHeight =
    minHeight ??
    (resolvedHeight === 'auto'
      ? BUTTON_MIN_HEIGHTS[size] ?? BUTTON_MIN_HEIGHTS.md
      : resolvedHeight);
  const actionBackground =
    action === 'positive'
      ? COLORS[colorScheme].selected
      : action === 'negative'
        ? resolveLegacyColor('$error600', colorScheme)
        : action === 'primary'
          ? COLORS[colorScheme].primaryButtonBackground
          : action === 'secondary'
            ? COLORS[colorScheme].muted
            : undefined;
  const resolvedBackground =
    (bg === undefined ? undefined : resolveLegacyColor(bg, colorScheme)) ??
    (typeof legacyStyle.backgroundColor === 'string'
      ? legacyStyle.backgroundColor
      : undefined) ??
    (shouldApplyDefaultBackground
      ? (background === undefined
          ? undefined
          : resolveLegacyColor(background, colorScheme)) ??
        actionBackground ??
        paletteBackground
      : 'transparent');
  const textColor = shouldApplyDefaultBackground
    ? getTextColor(true)
    : paletteBackground;
  const buttonChildren =
    typeof children === 'string' || typeof children === 'number' ? (
      <ButtonText
        style={{
          color: textColor,
          flexShrink: 1,
          fontFamily,
          textAlign: 'center',
        }}
      >
        {children}
      </ButtonText>
    ) : (
      children
    );
  const isButtonDisabled = Boolean(disabled || isDisabled || isLoading);

  async function handlePress(event: GestureResponderEvent) {
    if (!onPress || isButtonDisabled || isPressInProgress.current) {
      return;
    }

    isPressInProgress.current = true;
    setIsLoading(true);

    try {
      await onPress(event);
    } finally {
      isPressInProgress.current = false;
      setIsLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      isPressInProgress.current = false;
      setIsLoading(false);
    };
  }, []);

  return (
    <Button
      {...buttonProps}
      className={className}
      size={buttonSize}
      variant={resolvedVariant}
      disabled={isButtonDisabled}
      isDisabled={isButtonDisabled}
      onPress={handlePress}
      style={[
        legacyStyle,
        {
          backgroundColor: resolvedBackground,
          height:
            resolvedHeight === 'auto'
              ? undefined
              : resolveLegacySpacing(resolvedHeight),
          minHeight: resolveLegacySpacing(resolvedMinHeight),
          paddingVertical: resolveLegacySpacing(py ?? '$2'),
        },
        explicitStyle,
      ]}
    >
      {isLoading ? <ButtonSpinner /> : buttonChildren}
    </Button>
  );
}
