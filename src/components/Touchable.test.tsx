import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Touchable } from './Touchable';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

// In jest-expo, Pressable is rendered but not findable by type reference.
// Find it by checking for the onLayout prop which is unique to Pressable in our tree.
const findPressable = (r: Renderer) => {
  const pressables = r.root.findAll((n) => {
    const type = n.type as any;
    return type?.name === 'Pressable' || n.props?.onLayout !== undefined && n.props?.hitSlop !== undefined;
  });
  const p = pressables.find(n => (n.type as any)?.name === 'Pressable');
  if (!p) throw new Error('No instances found with node type: "Pressable"');
  return p;
};

const layout = (r: Renderer, width: number, height: number) => {
  act(() => {
    findPressable(r).props.onLayout({ nativeEvent: { layout: { width, height } } });
  });
};

describe('Touchable', () => {
  it('pads a small control out to a 48dp hit target', () => {
    const r = render(
      <Touchable accessibilityRole="button" accessibilityLabel="Sync now" onPress={() => {}} />,
    );

    layout(r, 24, 24);

    expect(findPressable(r).props.hitSlop).toEqual({
      top: 12, bottom: 12, left: 12, right: 12,
    });
  });

  it('adds no hit slop to a control that already meets the target', () => {
    const r = render(
      <Touchable accessibilityRole="button" accessibilityLabel="Sync now" onPress={() => {}} />,
    );

    layout(r, 56, 56);

    expect(findPressable(r).props.hitSlop).toEqual({
      top: 0, bottom: 0, left: 0, right: 0,
    });
  });

  it('forwards the accessibility contract to the underlying Pressable', () => {
    const r = render(
      <Touchable accessibilityRole="checkbox" accessibilityLabel="Select report" onPress={() => {}} />,
    );

    const pressable = findPressable(r);
    expect(pressable.props.accessibilityRole).toBe('checkbox');
    expect(pressable.props.accessibilityLabel).toBe('Select report');
  });

  it('still calls a caller-supplied onLayout', () => {
    const onLayout = jest.fn();
    const r = render(
      <Touchable
        accessibilityRole="button"
        accessibilityLabel="Sync now"
        onPress={() => {}}
        onLayout={onLayout}
      />,
    );

    layout(r, 24, 24);

    expect(onLayout).toHaveBeenCalledTimes(1);
  });
});
