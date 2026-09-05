import React from 'react';
import { BackHandler, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { useReducedMotion, withDelay } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SpeedDial } from './SpeedDial';
import { FAB_SIZE } from './Fab';
import { REPORT_TYPES } from '../../../constants/reportTypes';
import { Spacing } from '../../../design/spacing';

// Mirrors the constant defined in SpeedDial.tsx
const FAB_EDGE_INSET = Spacing.xl;

// jest.mock calls are hoisted above these imports by babel-plugin-jest-hoist
// regardless of source order (see Fab.test.tsx / Skeleton.test.tsx for the
// same convention), so writing them after the imports they mock is safe and
// keeps eslint's import/first rule happy.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    useReducedMotion: jest.fn(() => false),
    withDelay: jest.fn(actual.withDelay),
  };
});

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (props: Partial<React.ComponentProps<typeof SpeedDial>> = {}) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<SpeedDial {...props} />); });
  return r;
};

// Flattens a (possibly nested/array) RN style prop into one plain object, so
// a computed inline `bottom` merged alongside the StyleSheet.create entry
// can be asserted on directly — same helper shape as Badge.test.tsx /
// Card.test.tsx use for the same reason.
const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// The trigger's wrapping View: pointerEvents box-none and `right: Spacing.lg`
// distinguish it from `host` (also box-none, but no `right`) and from `rows`
// (also `right: Spacing.lg`, but additionally carries `gap`). `.find()`
// throws on zero or multiple matches, so an accidental double-match (or a
// style regression that drops one of these properties) fails loudly instead
// of silently indexing into the wrong node.
const findFabWrapView = (r: Renderer) =>
  r.root.find(n => {
    if (n.type !== View) return false;
    const style = flattenStyle(n.props.style);
    return n.props.pointerEvents === 'box-none' && style.right === Spacing.lg && style.gap === undefined;
  });

// The rows container: only rendered while the dial is open, uniquely
// identified among the host's Views by carrying `gap: Spacing.md`.
const findRowsView = (r: Renderer) =>
  r.root.find(n => {
    if (n.type !== View) return false;
    const style = flattenStyle(n.props.style);
    return n.props.pointerEvents === 'box-none' && style.gap === Spacing.md;
  });

// `Touchable` forwards its props onto the `Pressable` it wraps, so a plain
// (deep) `findAll` picks up both layers for the same on-screen control.
// `TestInstance.find` uses react-test-renderer's own shallow-stop traversal
// (it does not descend past a match) and throws unless exactly one instance
// matches — the built-in equivalent of a locator that fails loudly on an
// ambiguous or missing match instead of silently indexing [0].
const byLabel = (r: Renderer, label: string) =>
  r.root.find(n => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function');

const openDial = (r: Renderer) => {
  act(() => { byLabel(r, 'Create new report').props.onPress(); });
};

describe('SpeedDial', () => {
  let backSpy: jest.SpyInstance;

  beforeEach(() => {
    backSpy = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    (router.push as jest.Mock).mockClear();
    (withDelay as jest.Mock).mockClear();
  });

  afterEach(() => {
    backSpy.mockRestore();
  });

  it('shows no report type rows until it is opened', () => {
    const r = render();
    expect(r.root.findAll(n => n.props?.accessibilityLabel === REPORT_TYPES[0].title)).toHaveLength(0);
  });

  it('reveals a row per report type when opened', () => {
    const r = render();
    openDial(r);
    REPORT_TYPES.forEach(type => {
      expect(byLabel(r, type.title)).toBeDefined();
    });
  });

  it('labels each row with the full legal title, not the short one', () => {
    const r = render();
    openDial(r);
    const hazwasteTsd = REPORT_TYPES.find(t => t.key === 'hazwaste_tsd')!;
    expect(byLabel(r, hazwasteTsd.title)).toBeDefined();
    expect(hazwasteTsd.title).not.toBe(hazwasteTsd.shortTitle);
  });

  it('navigates to the selected report type route and closes', () => {
    const r = render();
    openDial(r);
    act(() => { byLabel(r, REPORT_TYPES[0].title).props.onPress(); });

    expect(router.push).toHaveBeenCalledWith(REPORT_TYPES[0].route);
    expect(r.root.findAll(n => n.props?.accessibilityLabel === REPORT_TYPES[0].title)).toHaveLength(0);
  });

  it.each(REPORT_TYPES)('presses row for $title and navigates to its own route', (type) => {
    const r = render();
    openDial(r);
    act(() => { byLabel(r, type.title).props.onPress(); });

    expect(router.push).toHaveBeenCalledWith(type.route);
  });

  it('closes on Android hardware back instead of letting it navigate away', () => {
    const r = render();
    openDial(r);

    const handler = backSpy.mock.calls.at(-1)?.[1] as () => boolean;
    let consumed!: boolean;
    act(() => { consumed = handler(); });

    expect(consumed).toBe(true);
    expect(r.root.findAll(n => n.props?.accessibilityLabel === REPORT_TYPES[0].title)).toHaveLength(0);
  });

  it('does not register a hardware back handler while closed', () => {
    render();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('removes the hardware back subscription when a row selection closes the dial', () => {
    const r = render();
    openDial(r);

    expect(backSpy).toHaveBeenCalledTimes(1);
    const removeSpy = (backSpy.mock.results[0].value as { remove: jest.Mock }).remove;
    expect(removeSpy).not.toHaveBeenCalled();

    act(() => { byLabel(r, REPORT_TYPES[0].title).props.onPress(); });

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the hardware back subscription on unmount while open, so it cannot leak past this screen', () => {
    const r = render();
    openDial(r);

    const removeSpy = (backSpy.mock.results[0].value as { remove: jest.Mock }).remove;
    expect(removeSpy).not.toHaveBeenCalled();

    act(() => { r.unmount(); });

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('skips the staggered entrance under reduced motion', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const r = render();
    openDial(r);

    expect(byLabel(r, REPORT_TYPES[0].title)).toBeDefined();
    expect(withDelay).not.toHaveBeenCalled();
  });

  // Regression coverage for the FAB overlapping AppChrome's footer bar on
  // device: fabWrap/rows used to hardcode `bottom: Spacing.lg`, which put the
  // trigger underneath HomeFooter (and any taller screen-registered footer)
  // instead of above it. bottomInset is how AppChrome's measured footer
  // height reaches this component now.
  describe('bottom inset (footer clearance)', () => {
    const FOOTER_INSET = 40;

    it('anchors the trigger FAB_EDGE_INSET above the bottom when bottomInset is omitted', () => {
      const r = render();
      const style = flattenStyle(findFabWrapView(r).props.style);
      expect(style.bottom).toBe(FAB_EDGE_INSET);
    });

    it('stacks the rows to clear the trigger and its own inset when bottomInset is omitted', () => {
      const r = render();
      openDial(r);
      const style = flattenStyle(findRowsView(r).props.style);
      expect(style.bottom).toBe(FAB_EDGE_INSET + FAB_SIZE + Spacing.md);
    });

    it('shifts the trigger up by the measured footer inset', () => {
      const r = render({ bottomInset: FOOTER_INSET });
      const style = flattenStyle(findFabWrapView(r).props.style);
      expect(style.bottom).toBe(FAB_EDGE_INSET + FOOTER_INSET);
    });

    it('shifts the rows up by the same footer inset, still clearing the trigger by FAB_SIZE + Spacing.md', () => {
      const r = render({ bottomInset: FOOTER_INSET });
      openDial(r);
      const style = flattenStyle(findRowsView(r).props.style);
      expect(style.bottom).toBe(FAB_EDGE_INSET + FOOTER_INSET + FAB_SIZE + Spacing.md);
    });
  });
});
