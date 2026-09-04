import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { FabVisibilityProvider, useFabHidden, useSetFabHidden } from './FabVisibilityContext';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

// Stands in for AppChrome, which renders the FAB as
// `{isFabRoute(pathname) && !fabHidden && <SpeedDial />}`. Recording the
// resolved boolean on every render (rather than searching the tree for a
// stand-in node) is the more direct assertion — it's the exact value
// AppChrome branches on to decide whether SpeedDial mounts at all.
function HiddenProbe({ onRender }: { onRender: (hidden: boolean) => void }) {
  const hidden = useFabHidden();
  onRender(hidden);
  return null;
}

// Stands in for a screen that imperatively suppresses the FAB, e.g. Task
// 17's Export tab while its selection bar is pinned to the bottom.
function HidingScreen({ hidden }: { hidden: boolean }) {
  useSetFabHidden(hidden);
  return null;
}

describe('FabVisibilityContext', () => {
  it('is visible (not hidden) by default, before any screen sets it', () => {
    let hidden: boolean | undefined;
    render(
      <FabVisibilityProvider>
        <HiddenProbe onRender={(h) => { hidden = h; }} />
      </FabVisibilityProvider>,
    );

    expect(hidden).toBe(false);
  });

  it('suppresses the FAB once a mounted screen sets it hidden', () => {
    let hidden: boolean | undefined;
    render(
      <FabVisibilityProvider>
        <HiddenProbe onRender={(h) => { hidden = h; }} />
        <HidingScreen hidden={true} />
      </FabVisibilityProvider>,
    );

    expect(hidden).toBe(true);
  });

  it('restores visibility when the hiding screen unmounts', () => {
    let hidden: boolean | undefined;
    const onRender = (h: boolean) => { hidden = h; };

    const Tree = ({ showHidingScreen }: { showHidingScreen: boolean }) => (
      <FabVisibilityProvider>
        <HiddenProbe onRender={onRender} />
        {showHidingScreen && <HidingScreen hidden={true} />}
      </FabVisibilityProvider>
    );

    const r = render(<Tree showHidingScreen={true} />);
    expect(hidden).toBe(true);

    // Navigating away unmounts the screen that hid the FAB — a stuck-hidden
    // FAB (visibility never coming back) would be invisible-but-permanent
    // breakage, so this is the behaviour that actually matters here.
    act(() => { r.update(<Tree showHidingScreen={false} />); });

    expect(hidden).toBe(false);
  });

  it('does not leak one screen’s hidden state onto the next screen mounted after it', () => {
    // A screen that hides the FAB and is replaced by a screen that never
    // touches useSetFabHidden at all (no HidingScreen in the new tree)
    // must not leave the FAB permanently hidden — same failure mode as
    // above, approached from the "next screen is a plain browsing screen"
    // angle rather than "hidden flips back to false".
    let hidden: boolean | undefined;
    const onRender = (h: boolean) => { hidden = h; };

    const Tree = ({ onHomeScreen }: { onHomeScreen: boolean }) => (
      <FabVisibilityProvider>
        <HiddenProbe onRender={onRender} />
        {!onHomeScreen && <HidingScreen hidden={true} />}
      </FabVisibilityProvider>
    );

    const r = render(<Tree onHomeScreen={false} />);
    expect(hidden).toBe(true);

    act(() => { r.update(<Tree onHomeScreen={true} />); });

    expect(hidden).toBe(false);
  });
});
