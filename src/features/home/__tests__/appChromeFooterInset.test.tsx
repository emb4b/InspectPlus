import React from 'react';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
// Imported from its route path — a normal module import, not a file placed
// inside src/app, so expo-router never treats this test file itself as a
// route. Same convention as homeScreen.test.tsx's import of app/(app)/home:
// tests for expo-router route files live under src/features/**/__tests__,
// never under src/app itself.
import AppLayout from '../../../app/(app)/_layout';

type Renderer = TestRenderer.ReactTestRenderer;

// AppChrome pulls in the real header/sync/auth stack through HomeHeader, none
// of which is relevant to whether AppChrome measures its footer stack and
// forwards that height to SpeedDial — so, like homeScreen.test.tsx does for
// the tab content components, it's swapped for an inert stand-in here.
jest.mock('../components/HomeHeader', () => ({
  HomeHeader: () => null,
}));

// Stands in for the real gradient bar so this test isn't also exercising
// expo-linear-gradient. Renders a plain View with a fixed height so the
// wrapping View's onLayout has something deterministic to measure in a real
// layout pass — irrelevant here since react-test-renderer never runs Yoga,
// but keeping the shape honest documents what onLayout would see on device.
jest.mock('../components/HomeFooter', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory can't close over top-level imports (babel-plugin-jest-hoist)
  const ReactLib = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
  const RN = require('react-native');
  return {
    HomeFooter: () => ReactLib.createElement(RN.View, { style: { height: 20 } }),
  };
});

// Captures every prop SpeedDial is rendered with, so the test can assert on
// `bottomInset` without needing to reach back into AppChrome's own state.
interface CapturedSpeedDialProps {
  bottomInset: number;
}
const mockSpeedDial = jest.fn((_props: CapturedSpeedDialProps) => null);
jest.mock('../components/SpeedDial', () => ({
  SpeedDial: (props: CapturedSpeedDialProps) => mockSpeedDial(props),
}));

jest.mock('expo-router', () => ({
  Stack: () => null,
  usePathname: () => '/home',
}));

const render = () => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<AppLayout />); });
  return r;
};

// The View AppChrome wraps around {screenFooter} + <HomeFooter /> to measure
// its combined height — uniquely identified among every View in the tree by
// carrying an `onLayout` function prop, which no other node in this tree
// sets. `.find()` throws on zero or multiple matches, so a refactor that
// moves onLayout elsewhere (or adds a second onLayout host) fails the test
// instead of silently measuring the wrong node.
const findFooterMeasuringView = (r: Renderer) =>
  r.root.find(n => n.type === View && typeof n.props.onLayout === 'function');

const fireFooterLayout = (r: Renderer, height: number) => {
  act(() => {
    findFooterMeasuringView(r).props.onLayout({ nativeEvent: { layout: { height, width: 0, x: 0, y: 0 } } });
  });
};

describe('AppChrome footer-height measurement', () => {
  beforeEach(() => {
    mockSpeedDial.mockClear();
  });

  const lastSpeedDialProps = (): CapturedSpeedDialProps => {
    const calls = mockSpeedDial.mock.calls;
    return calls[calls.length - 1][0];
  };

  it('renders SpeedDial with bottomInset 0 before any layout has been measured', () => {
    render();

    expect(lastSpeedDialProps().bottomInset).toBe(0);
  });

  it('passes the measured footer-stack height through to SpeedDial as bottomInset', () => {
    const r = render();

    fireFooterLayout(r, 84);

    expect(lastSpeedDialProps().bottomInset).toBe(84);
  });

  // Simulates a screen registering a taller Save/Cancel row through
  // useScreenFooter (e.g. WaterInspectionFormScreen): the wrapper View's
  // measured height grows accordingly, and AppChrome must re-forward the new
  // height rather than latching onto whatever it first measured.
  it('re-measures and updates bottomInset when the footer stack grows taller', () => {
    const r = render();

    fireFooterLayout(r, 20);
    expect(lastSpeedDialProps().bottomInset).toBe(20);

    fireFooterLayout(r, 96);
    expect(lastSpeedDialProps().bottomInset).toBe(96);
  });
});
