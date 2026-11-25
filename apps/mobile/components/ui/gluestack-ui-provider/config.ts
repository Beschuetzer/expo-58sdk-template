import { vars } from 'nativewind';

import { COLORS } from '@/constants/colors';

function toRgb(hex: string) {
  const value = hex.slice(1);
  const normalized =
    value.length === 3
      ? [...value].map((channel) => `${channel}${channel}`).join('')
      : value;

  if (!/^[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`Invalid theme color: ${hex}`);
  }

  return [0, 2, 4]
    .map((index) => Number.parseInt(normalized.slice(index, index + 2), 16))
    .join(' ');
}

function createColorVariables(colorScheme: 'light' | 'dark') {
  const palette = COLORS[colorScheme];
  const foreground = toRgb(palette.text);
  const background = toRgb(palette.background);
  const primary = toRgb(palette.tint);
  const chart1 = toRgb(colorScheme === 'dark' ? '#2f95dc' : palette.tint);
  const secondary = toRgb(colorScheme === 'dark' ? '#262626' : '#f5f5f5');
  const border = toRgb(palette.border);
  const primaryForeground = toRgb(
    colorScheme === 'dark' ? '#000000' : '#ffffff',
  );
  const destructive = toRgb(colorScheme === 'dark' ? '#ff6467' : '#b42318');

  return {
    '--primary': primary,
    '--primary-foreground': primaryForeground,
    '--card': background,
    '--card-foreground': foreground,
    '--secondary': secondary,
    '--secondary-foreground': foreground,
    '--background': background,
    '--popover': background,
    '--popover-foreground': foreground,
    '--muted': secondary,
    '--muted-foreground': toRgb(palette.mutedText),
    '--destructive': destructive,
    '--foreground': foreground,
    '--border': border,
    '--input': border,
    '--ring': primary,
    '--accent': secondary,
    '--accent-foreground': foreground,
    '--chart-1': chart1,
    '--chart-2': toRgb('#27ae60'),
    '--chart-3': toRgb('#f59e0b'),
    '--chart-4': toRgb('#8b5cf6'),
    '--chart-5': toRgb('#ef4444'),
    '--sidebar': background,
    '--sidebar-foreground': foreground,
    '--sidebar-primary': primary,
    '--sidebar-primary-foreground': primaryForeground,
    '--sidebar-accent': secondary,
    '--sidebar-accent-foreground': foreground,
    '--sidebar-border': border,
    '--sidebar-ring': primary,
  };
}

export const colors = {
  light: createColorVariables('light'),
  dark: createColorVariables('dark'),
};

export const config = {
  light: vars(colors.light),
  dark: vars(colors.dark),
};
