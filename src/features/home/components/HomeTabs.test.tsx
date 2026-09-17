import React from 'react';
import { Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import TestRenderer, { act } from 'react-test-renderer';
import { HomeTabs, HomeTab, HOME_TAB_ORDER } from './HomeTabs';
import { Colors } from '../../../design/colors';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';

type Renderer = TestRenderer.ReactTestRenderer;

// Under jest.config's moduleNameMapper, react-native-reanimated resolves to
// its own mock, whose useSharedValue is a plain factory (no hook rules), so
// a test can build the pager position HomeTabs takes without a component.
// eslint-disable-next-line react-hooks/rules-of-hooks -- see above: the mock's factory, not a hook
const positionAt = (index: number) => useSharedValue(index);

const render = (active: HomeTab, onChange: (t: HomeTab) => void = () => {}, position = positionAt(0)) => {
  let r!: Renderer;
  act(() => {
    r = TestRenderer.create(<HomeTabs activeTab={active} onTabChange={onChange} position={position} />);
  });
  return r;
};

const labels = (r: Renderer) => r.root.findAllByType(Text).map(n => n.props.children);

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// `TestInstance.find` (unlike `findAll`) throws unless exactly one instance
// matches, so a locator built on it fails loudly on a missing or duplicated
// tab instead of silently indexing into the wrong node — see the same
// convention in SpeedDial.test.tsx / Card.test.tsx. The `onPress` check
// disambiguates the tab's own TouchableOpacity from the Pressable it wraps
// internally, which forwards accessibilityRole onto itself too.
const findTab = (r: Renderer, label: string) =>
  r.root.find(
    n =>
      n.props?.accessibilityRole === 'tab' &&
      typeof n.props?.onPress === 'function' &&
      n.findAllByType(Text).some(t => t.props.children === label),
  );

// The tab row measures itself once through onLayout; the underline's
// geometry is derived from that width, so tests feed a known one.
const layoutRow = (r: Renderer, width: number) => {
  const row = r.root.find(n => n.type === View && typeof n.props.onLayout === 'function');
  act(() => { row.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 44 } } }); });
};

// The underline is the bar's one non-interactive child. Under the reanimated
// mock Animated.View *is* View, and findByType stops descending at the first
// match (the row itself), so the locator anchors on pointerEvents instead.
// useAnimatedStyle runs its worklet once per render under the mock, so the
// resolved transform can be read straight off props.
const findUnderline = (r: Renderer) => r.root.find(n => n.type === View && n.props.pointerEvents === 'none');

describe('HomeTabs', () => {
  it('offers exactly the three post-restructure tabs, in pager order, without hard line breaks', () => {
    expect(labels(render('manageReports'))).toEqual([
      'Manage Reports',
      'Manage Establishments',
      'Export Inspection Reports',
    ]);
    expect(HOME_TAB_ORDER).toEqual(['manageReports', 'manageEstablishments', 'exportReports']);
  });

  it('no longer offers a create tab', () => {
    expect(labels(render('manageReports')).join(' ')).not.toMatch(/create/i);
  });

  it('marks the active tab in the brand green (the form tabs\' active colour), not a purple accent', () => {
    const r = render('manageReports');
    const active = flatten(findTab(r, 'Manage Reports').findByType(Text).props.style);
    const inactive = flatten(findTab(r, 'Manage Establishments').findByType(Text).props.style);
    expect(active.color).toBe(Colors.green);
    expect(active.fontWeight).toBe('700');
    expect(inactive.color).toBe(Colors.textMuted);
    expect(inactive.fontWeight).toBe('600');
  });

  it('sets the labels in Type.bodySm so they carry the same weight as the content below', () => {
    const r = render('manageReports');
    const style = flatten(findTab(r, 'Manage Reports').findByType(Text).props.style);
    expect(style.fontSize).toBe(Type.bodySm.fontSize);
    expect(style.lineHeight).toBe(Type.bodySm.lineHeight);
  });

  it('draws one green underline sized to a third of the row minus Spacing.sm each side', () => {
    const r = render('manageReports');
    layoutRow(r, 360);
    const style = flatten(findUnderline(r).props.style);
    expect(style.backgroundColor).toBe(Colors.green);
    expect(style.width).toBe(120 - Spacing.sm * 2);
    expect(style.left).toBe(Spacing.sm);
  });

  it('places the underline from the pager position, so it tracks a swipe rather than the settled tab', () => {
    // activeTab still says the first tab, but the pager is halfway to the
    // second — the underline must sit halfway too.
    const r = render('manageReports', () => {}, positionAt(0.5));
    layoutRow(r, 360);
    const transform = flatten(findUnderline(r).props.style).transform as { translateX: number }[];
    expect(transform).toEqual([{ translateX: 60 }]);
  });

  it('reports the tab the user picked', () => {
    const onChange = jest.fn();
    const r = render('manageReports', onChange);
    act(() => {
      findTab(r, 'Export Inspection Reports').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('exportReports');
  });
});
