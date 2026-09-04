import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { HomeTabs, HomeTab } from './HomeTabs';
import { Colors } from '../../../design/colors';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (active: HomeTab, onChange: (t: HomeTab) => void = () => {}) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<HomeTabs activeTab={active} onTabChange={onChange} />); });
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

describe('HomeTabs', () => {
  it('offers exactly the three post-restructure tabs', () => {
    expect(labels(render('manageReports'))).toEqual([
      'Manage Reports',
      'Manage\nEstablishments',
      'Export Inspection\nReports',
    ]);
  });

  it('no longer offers a create tab', () => {
    expect(labels(render('manageReports')).join(' ')).not.toMatch(/create/i);
  });

  it('marks the active tab with the accent color token', () => {
    const r = render('manageReports');
    const activeLabel = findTab(r, 'Manage Reports').findByType(Text);
    expect(flatten(activeLabel.props.style).color).toBe(Colors.accent);
  });

  it('reports the tab the user picked', () => {
    const onChange = jest.fn();
    const r = render('manageReports', onChange);
    act(() => {
      findTab(r, 'Export Inspection\nReports').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('exportReports');
  });
});
