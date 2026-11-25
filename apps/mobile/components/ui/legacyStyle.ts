import type { TextStyle, ViewStyle } from 'react-native';

import { COLORS } from '@/constants/colors';
import type { ColorScheme } from '@/utils/theme';

export type LegacyStyleValue = string | number;

export type LegacyStyleProps = {
  p?: LegacyStyleValue;
  px?: LegacyStyleValue;
  py?: LegacyStyleValue;
  pt?: LegacyStyleValue;
  pb?: LegacyStyleValue;
  pl?: LegacyStyleValue;
  pr?: LegacyStyleValue;
  padding?: LegacyStyleValue;
  paddingHorizontal?: LegacyStyleValue;
  paddingVertical?: LegacyStyleValue;
  m?: LegacyStyleValue;
  mx?: LegacyStyleValue;
  my?: LegacyStyleValue;
  mt?: LegacyStyleValue;
  mb?: LegacyStyleValue;
  ml?: LegacyStyleValue;
  mr?: LegacyStyleValue;
  margin?: LegacyStyleValue;
  marginHorizontal?: LegacyStyleValue;
  marginVertical?: LegacyStyleValue;
  width?: LegacyStyleValue;
  height?: LegacyStyleValue;
  minWidth?: LegacyStyleValue;
  minHeight?: LegacyStyleValue;
  maxWidth?: LegacyStyleValue;
  maxHeight?: LegacyStyleValue;
  w?: LegacyStyleValue;
  h?: LegacyStyleValue;
  bg?: string;
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  borderTopColor?: string;
  borderRightColor?: string;
  borderBottomColor?: string;
  borderLeftColor?: string;
  borderWidth?: LegacyStyleValue;
  borderTopWidth?: LegacyStyleValue;
  borderRightWidth?: LegacyStyleValue;
  borderBottomWidth?: LegacyStyleValue;
  borderLeftWidth?: LegacyStyleValue;
  borderRadius?: LegacyStyleValue;
  borderTopLeftRadius?: LegacyStyleValue;
  borderTopRightRadius?: LegacyStyleValue;
  borderBottomLeftRadius?: LegacyStyleValue;
  borderBottomRightRadius?: LegacyStyleValue;
  borderStyle?: ViewStyle['borderStyle'];
  fontFamily?: string;
  fontSize?: LegacyStyleValue;
  fontWeight?: string | number;
  lineHeight?: LegacyStyleValue;
  letterSpacing?: number;
  textAlign?: TextStyle['textAlign'];
  textDecorationLine?: TextStyle['textDecorationLine'];
  textTransform?: TextStyle['textTransform'];
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexWrap?: ViewStyle['flexWrap'];
  flexDirection?: ViewStyle['flexDirection'];
  alignItems?: ViewStyle['alignItems'];
  alignSelf?: ViewStyle['alignSelf'];
  justifyContent?: ViewStyle['justifyContent'];
  position?: ViewStyle['position'];
  top?: LegacyStyleValue;
  right?: LegacyStyleValue;
  bottom?: LegacyStyleValue;
  left?: LegacyStyleValue;
  zIndex?: number;
  opacity?: number;
  overflow?: ViewStyle['overflow'];
  display?: ViewStyle['display'];
  elevation?: number;
  shadowColor?: string;
  shadowOffset?: ViewStyle['shadowOffset'];
  shadowOpacity?: number;
  shadowRadius?: number;
  gap?: LegacyStyleValue;
  rowGap?: LegacyStyleValue;
  columnGap?: LegacyStyleValue;
};

type ResolvedDimension = number | `${number}%` | 'auto';
type ResolvedStyle = ViewStyle & TextStyle;

const NAMED_SPACING: Record<string, number> = {
  px: 1,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 56,
};

const NAMED_RADIUS: Record<string, number> = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

const FONT_SIZES: Record<string, number> = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
};

const FONT_WEIGHTS: Record<string, NonNullable<TextStyle['fontWeight']>> = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: 'normal',
  medium: '500',
  semibold: '600',
  bold: 'bold',
  extrabold: '800',
  black: '900',
  '100': '100',
  '200': '200',
  '300': '300',
  '400': '400',
  '500': '500',
  '600': '600',
  '700': '700',
  '800': '800',
  '900': '900',
};

const LEGACY_COLORS: Record<string, string> = {
  transparent: 'transparent',
  black: '#000000',
  white: '#ffffff',
  textLight0: '#ffffff',
  textLight50: '#fafafa',
  textLight900: COLORS.light.text,
  textDark0: '#ffffff',
  textDark50: COLORS.dark.text,
  backgroundLight0: COLORS.light.background,
  backgroundLight300: '#d4d4d4',
  backgroundDark800: '#262626',
  backgroundDark900: '#171717',
  backgroundDark950: COLORS.dark.background,
  coolGray50: '#f9fafb',
  coolGray100: '#f3f4f6',
  coolGray700: '#374151',
  error100: '#fee2e2',
  error600: '#dc2626',
  error700: '#b91c1c',
  error800: '#991b1b',
  error900: '#7f1d1d',
  success100: '#dcfce7',
  success600: '#16a34a',
  success800: '#166534',
  success900: '#14532d',
  warning100: '#fef3c7',
  warning800: '#92400e',
  warning900: '#78350f',
};

function getTokenName(value: string) {
  return value.startsWith('$') ? value.slice(1) : undefined;
}

function resolveDimension(
  value: LegacyStyleValue | undefined,
  namedTokens: Record<string, number> = NAMED_SPACING,
): ResolvedDimension | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;

  const token = getTokenName(value);
  if (token === 'full') return '100%';
  if (token === 'auto' || value === 'auto') return 'auto';
  if (token !== undefined && namedTokens[token] !== undefined) {
    return namedTokens[token];
  }

  if (token !== undefined && /^\d+(?:\.\d+)?$/.test(token)) {
    return Number(token) * 4;
  }

  if (/^\d+(?:\.\d+)?%$/.test(value)) {
    return value as `${number}%`;
  }

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  throw new Error(`Unsupported Gluestack dimension token: ${value}`);
}

function resolveBorderWidth(value: LegacyStyleValue | undefined) {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;

  const token = getTokenName(value) ?? value;
  if (/^\d+(?:\.\d+)?$/.test(token)) return Number(token);

  throw new Error(`Unsupported Gluestack border width token: ${value}`);
}

function resolveFontSize(value: LegacyStyleValue | undefined) {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;

  const token = getTokenName(value);
  if (token !== undefined && FONT_SIZES[token] !== undefined) {
    return FONT_SIZES[token];
  }

  const resolved = resolveDimension(value);
  return typeof resolved === 'number' ? resolved : undefined;
}

function resolveFontWeight(
  value: string | number | undefined,
): TextStyle['fontWeight'] {
  if (value === undefined) return undefined;

  const token = String(value).replace(/^\$/, '');
  const weight = FONT_WEIGHTS[token];
  if (weight === undefined) {
    throw new Error(`Unsupported Gluestack font weight token: ${value}`);
  }

  return weight;
}

export function resolveLegacyColor(
  value: string | undefined,
  colorScheme: ColorScheme,
): string | undefined {
  if (value === undefined) return undefined;
  if (!value.startsWith('$')) return value;
  if (value === '$primary500') return COLORS[colorScheme].tint;
  if (value === '$primary50') {
    return colorScheme === 'light' ? '#f5f5f5' : '#eff6ff';
  }
  if (value === '$primary200') {
    return colorScheme === 'light' ? '#d4d4d4' : '#bfdbfe';
  }
  if (value === '$textLight500') return COLORS[colorScheme].mutedText;

  const color = LEGACY_COLORS[value.slice(1)];
  if (color === undefined) {
    throw new Error(`Unsupported Gluestack color token: ${value}`);
  }

  return color;
}

export function resolveLegacySpacing(value: LegacyStyleValue | undefined) {
  return resolveDimension(value);
}

function resolveLineHeight(value: LegacyStyleValue | undefined) {
  if (value === undefined) return undefined;
  const resolved = resolveDimension(value);
  if (typeof resolved !== 'number') {
    throw new Error(`Unsupported Gluestack line-height token: ${value}`);
  }
  return resolved;
}

export function splitLegacyStyleProps<T extends LegacyStyleProps>(
  props: T,
  colorScheme: ColorScheme,
): { props: Omit<T, keyof LegacyStyleProps>; style: ResolvedStyle } {
  const {
    p,
    px,
    py,
    pt,
    pb,
    pl,
    pr,
    padding,
    paddingHorizontal,
    paddingVertical,
    m,
    mx,
    my,
    mt,
    mb,
    ml,
    mr,
    margin,
    marginHorizontal,
    marginVertical,
    width,
    height,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    w,
    h,
    bg,
    backgroundColor,
    color,
    borderColor,
    borderTopColor,
    borderRightColor,
    borderBottomColor,
    borderLeftColor,
    borderWidth,
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
    borderLeftWidth,
    borderRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderStyle,
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    textAlign,
    textDecorationLine,
    textTransform,
    flex,
    flexGrow,
    flexShrink,
    flexWrap,
    flexDirection,
    alignItems,
    alignSelf,
    justifyContent,
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
    opacity,
    overflow,
    display,
    elevation,
    shadowColor,
    shadowOffset,
    shadowOpacity,
    shadowRadius,
    gap,
    rowGap,
    columnGap,
    ...nativeProps
  } = props;

  const resolvedPadding = p ?? padding;
  const resolvedMargin = m ?? margin;
  const resolvedRadius = resolveDimension(borderRadius, NAMED_RADIUS);
  const style: ResolvedStyle = {
    padding: resolveDimension(resolvedPadding),
    paddingHorizontal: resolveDimension(
      px ?? paddingHorizontal ?? resolvedPadding,
    ),
    paddingVertical: resolveDimension(py ?? paddingVertical ?? resolvedPadding),
    paddingTop: resolveDimension(pt ?? py ?? resolvedPadding),
    paddingBottom: resolveDimension(pb ?? py ?? resolvedPadding),
    paddingLeft: resolveDimension(
      pl ?? px ?? paddingHorizontal ?? resolvedPadding,
    ),
    paddingRight: resolveDimension(
      pr ?? px ?? paddingHorizontal ?? resolvedPadding,
    ),
    margin: resolveDimension(resolvedMargin),
    marginHorizontal: resolveDimension(
      mx ?? marginHorizontal ?? resolvedMargin,
    ),
    marginVertical: resolveDimension(my ?? marginVertical ?? resolvedMargin),
    marginTop: resolveDimension(mt ?? my ?? resolvedMargin),
    marginBottom: resolveDimension(mb ?? my ?? resolvedMargin),
    marginLeft: resolveDimension(
      ml ?? mx ?? marginHorizontal ?? resolvedMargin,
    ),
    marginRight: resolveDimension(
      mr ?? mx ?? marginHorizontal ?? resolvedMargin,
    ),
    width: resolveDimension(w ?? width),
    height: resolveDimension(h ?? height),
    minWidth: resolveDimension(minWidth),
    minHeight: resolveDimension(minHeight),
    maxWidth: resolveDimension(maxWidth),
    maxHeight: resolveDimension(maxHeight),
    backgroundColor: resolveLegacyColor(bg ?? backgroundColor, colorScheme),
    color: resolveLegacyColor(color, colorScheme),
    borderColor: resolveLegacyColor(borderColor, colorScheme),
    borderTopColor: resolveLegacyColor(borderTopColor, colorScheme),
    borderRightColor: resolveLegacyColor(borderRightColor, colorScheme),
    borderBottomColor: resolveLegacyColor(borderBottomColor, colorScheme),
    borderLeftColor: resolveLegacyColor(borderLeftColor, colorScheme),
    borderWidth: resolveBorderWidth(borderWidth),
    borderTopWidth: resolveBorderWidth(borderTopWidth),
    borderRightWidth: resolveBorderWidth(borderRightWidth),
    borderBottomWidth: resolveBorderWidth(borderBottomWidth),
    borderLeftWidth: resolveBorderWidth(borderLeftWidth),
    borderRadius: resolvedRadius,
    borderTopLeftRadius:
      resolveDimension(borderTopLeftRadius, NAMED_RADIUS) ?? resolvedRadius,
    borderTopRightRadius:
      resolveDimension(borderTopRightRadius, NAMED_RADIUS) ?? resolvedRadius,
    borderBottomLeftRadius:
      resolveDimension(borderBottomLeftRadius, NAMED_RADIUS) ?? resolvedRadius,
    borderBottomRightRadius:
      resolveDimension(borderBottomRightRadius, NAMED_RADIUS) ?? resolvedRadius,
    borderStyle,
    fontFamily,
    fontSize: resolveFontSize(fontSize),
    fontWeight: resolveFontWeight(fontWeight),
    lineHeight: resolveLineHeight(lineHeight),
    letterSpacing,
    textAlign,
    textDecorationLine,
    textTransform,
    flex,
    flexGrow,
    flexShrink,
    flexWrap,
    flexDirection,
    alignItems,
    alignSelf,
    justifyContent,
    position,
    top: resolveDimension(top),
    right: resolveDimension(right),
    bottom: resolveDimension(bottom),
    left: resolveDimension(left),
    zIndex,
    opacity,
    overflow,
    display,
    elevation,
    shadowColor: resolveLegacyColor(shadowColor, colorScheme),
    shadowOffset,
    shadowOpacity,
    shadowRadius,
    gap: resolveDimension(gap),
    rowGap: resolveDimension(rowGap),
    columnGap: resolveDimension(columnGap),
  };

  const resolvedStyle = Object.fromEntries(
    Object.entries(style).filter(([, value]) => value !== undefined),
  ) as ResolvedStyle;

  return { props: nativeProps, style: resolvedStyle };
}
