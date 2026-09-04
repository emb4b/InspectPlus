import React from 'react';
import { BackHandler } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { useReducedMotion, withDelay } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SpeedDial } from './SpeedDial';
import { REPORT_TYPES } from '../../../constants/reportTypes';

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

const render = () => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<SpeedDial />); });
  return r;
};

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
});
