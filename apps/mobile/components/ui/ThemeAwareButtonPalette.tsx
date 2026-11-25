import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

function getStablePaletteIndex(paletteKey: string) {
  let hash = 2166136261;

  for (let index = 0; index < paletteKey.length; index += 1) {
    hash = Math.imul(hash ^ paletteKey.charCodeAt(index), 16777619);
  }

  return hash >>> 0;
}

const ThemeAwareButtonPaletteContext = createContext<
  (paletteKey: string) => number
>(getStablePaletteIndex);

export function ThemeAwareButtonPaletteProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeAwareButtonPaletteContext.Provider value={getStablePaletteIndex}>
      {children}
    </ThemeAwareButtonPaletteContext.Provider>
  );
}

export function useThemeAwareButtonPaletteIndex(paletteKey?: string) {
  const getIndex = useContext(ThemeAwareButtonPaletteContext);
  return paletteKey === undefined ? 0 : getIndex(paletteKey);
}
