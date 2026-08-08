import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

interface ScreenFooterContextValue {
  footer: React.ReactNode;
  setFooter: (node: React.ReactNode) => void;
}

const ScreenFooterContext = createContext<ScreenFooterContextValue | null>(null);

// Holds whatever the active screen registers as its bottom action bar (e.g.
// EditEstablishmentScreen's Cancel/Save Changes row) so AppChrome can render
// it as a direct sibling of the collapsing header, instead of nested several
// layers below it inside the Stack. Same immediate parent means both are
// resolved in the same Yoga layout pass — see useScreenFooter for why that
// matters.
export const ScreenFooterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [footer, setFooter] = useState<React.ReactNode>(null);
  // A fresh object whenever `footer` changes — unlike HeaderScrollContext's
  // ref-cached value (safe there because it only holds stable shared-value
  // identities Reanimated reads directly), this value carries plain React
  // state that AppChrome must actually re-render to pick up. Reusing the
  // same object reference across renders would make React's Context bail
  // out of notifying consumers, since it compares the value by identity.
  const value = useMemo<ScreenFooterContextValue>(() => ({ footer, setFooter }), [footer]);
  return <ScreenFooterContext.Provider value={value}>{children}</ScreenFooterContext.Provider>;
};

function useScreenFooterContext(): ScreenFooterContextValue {
  const ctx = useContext(ScreenFooterContext);
  if (!ctx) {
    throw new Error('useScreenFooterContext must be used within a ScreenFooterProvider');
  }
  return ctx;
}

// Consumed once by AppChrome to render whatever the active screen registered.
export function useActiveScreenFooter(): React.ReactNode {
  return useScreenFooterContext().footer;
}

// A screen with a persistent bottom action bar (Save/Cancel and similar)
// calls this instead of rendering that bar inline. Rendering it inline would
// nest it below the collapsing header through several component boundaries
// (this screen's own root -> the Stack navigator -> its scroll view), and
// that gap is exactly what let the header's height animation and the
// footer's resulting layout fall out of sync frame-to-frame — the header
// updates its shadow-tree height directly on the UI thread every animation
// frame, but the footer's position several layers down is only as fresh as
// the next ordinary Yoga relayout, which can lag by a frame. Hoisting the
// footer up to render as AppChrome's direct sibling of the header (see
// ScreenFooterProvider) puts both under the same immediate parent, so they
// resolve in the same layout pass instead of racing each other.
//
// Takes a factory + deps, like useMemo/useCallback, rather than a bare node.
// A bare JSX node is a new object every render, and registering it directly
// as an effect dependency creates an update loop: setFooter re-renders
// everything below the provider (this screen included), which recreates the
// node, which re-fires the effect, forever — hit exactly that "Maximum
// update depth exceeded" the first time this shipped. Requiring explicit
// deps forces the node to stay referentially stable across renders that
// don't actually change it, the same guarantee useMemo gives.
export function useScreenFooter(factory: () => React.ReactNode, deps: React.DependencyList): void {
  const { setFooter } = useScreenFooterContext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const node = useMemo(factory, deps);

  // Applied synchronously before paint so a prop change (e.g. `saving`
  // flipping true) swaps straight to the new node with no in-between frame
  // where the footer briefly disappears.
  useLayoutEffect(() => {
    setFooter(node);
  }, [node, setFooter]);

  // Cleared only on true unmount (navigating away), not on every node
  // change, so it doesn't flash empty on unrelated re-renders.
  useEffect(() => {
    return () => setFooter(null);
  }, [setFooter]);
}
