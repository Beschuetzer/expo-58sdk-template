import { createContext } from 'react';

export const ThemeAwareTextColorContext = createContext<string | undefined>(
  undefined,
);
