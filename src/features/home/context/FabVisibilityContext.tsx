import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface FabVisibilityContextValue {
  hidden: boolean;
  setFabHidden: (hidden: boolean) => void;
}

const FabVisibilityContext = createContext<FabVisibilityContextValue | null>(null);

// Lets a screen suppress the FAB while it has overlapping UI of its own
// showing — the same hoisting problem ScreenFooterContext solves for bottom
// action bars, and deliberately shaped the same way.
export const FabVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hidden, setHidden] = useState(false);
  const value = useMemo<FabVisibilityContextValue>(
    () => ({ hidden, setFabHidden: setHidden }),
    [hidden],
  );
  return <FabVisibilityContext.Provider value={value}>{children}</FabVisibilityContext.Provider>;
};

function useFabVisibilityContext(): FabVisibilityContextValue {
  const ctx = useContext(FabVisibilityContext);
  if (!ctx) {
    throw new Error('useFabVisibilityContext must be used within a FabVisibilityProvider');
  }
  return ctx;
}

// Consumed once by AppChrome.
export function useFabHidden(): boolean {
  return useFabVisibilityContext().hidden;
}

// A screen calls this instead of reaching into the provider. The cleanup
// restores visibility on unmount, so a screen can't leave the FAB hidden
// behind it.
export function useSetFabHidden(hidden: boolean): void {
  const { setFabHidden } = useFabVisibilityContext();
  useEffect(() => {
    setFabHidden(hidden);
    return () => setFabHidden(false);
  }, [hidden, setFabHidden]);
}
