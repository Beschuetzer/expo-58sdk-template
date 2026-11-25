import type { ComponentProps } from 'react';
import Collapsible from 'react-native-collapsible';

export type ThemeAwareCollapsibleProps = ComponentProps<typeof Collapsible>;

export function ThemeAwareCollapsible(props: ThemeAwareCollapsibleProps) {
  return <Collapsible {...props} />;
}
