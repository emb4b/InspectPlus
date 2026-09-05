import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { YesNoNAToggle } from './YesNoNAToggle';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// react-native's own TouchableOpacity module is itself a thin wrapper that
// spreads every prop it receives onto an inner, unexported class component
// of the same displayName, so a naive props-only predicate double-matches:
// once on the outer wrapper fiber, once on the inner one. Anchoring on
// `n.type === TouchableOpacity` (the module reference this file and
// YesNoNAToggle.tsx both resolve to) narrows a findAll to the outer fiber
// only - same convention as Button.test.tsx / SaveBar.test.tsx.
const findToggleButtons = (r: Renderer) => {
  const matches = r.root.findAll((n) => n.type === TouchableOpacity);
  if (matches.length !== 3) {
    throw new Error(`Expected exactly 3 toggle buttons (Y/N/NA) but found ${matches.length}`);
  }
  return matches;
};

const noop = () => {};

describe('YesNoNAToggle 48dp hit target', () => {
  it('brings the resolved hitSlop to the 48dp minimum without changing the visual box', () => {
    const r = render(<YesNoNAToggle value={null} onChange={noop} />);
    const buttons = findToggleButtons(r);

    buttons.forEach((btn) => {
      const style = flattenStyle(btn.props.style);
      // Visual size did not grow: paddingHorizontal stays the original
      // literal 10 (there's no exact Spacing token for it, and rounding to
      // one would change the box), paddingVertical stays exactly
      // Spacing.xs (4), matching the pre-migration value.
      expect(style.paddingHorizontal).toBe(10);
      expect(style.paddingVertical).toBe(Spacing.xs);

      // The box's true rendered height is paddingVertical (top + bottom)
      // plus the label's own line height - computed independently here
      // from the token symbols, not copied from the component's internals.
      const measuredHeight = (style.paddingVertical as number) * 2 + Type.caption.lineHeight;
      const hitSlop = btn.props.hitSlop as { top: number; bottom: number; left: number; right: number };
      expect(hitSlop.top).toBe(hitSlop.bottom);
      expect(hitSlop.left).toBe(hitSlop.right);
      expect(hitSlop.top).toBe(hitSlop.left);
      expect(measuredHeight + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(48);
    });
  });
});

describe('YesNoNAToggle legibility guarantee', () => {
  it('renders every label at Type.caption.fontSize, the type scale floor, never below it', () => {
    const r = render(<YesNoNAToggle value="Y" onChange={noop} />);
    const labels = r.root.findAllByType(Text);
    expect(labels).toHaveLength(3);
    labels.forEach((n) => {
      const style = flattenStyle(n.props.style);
      expect(style.fontSize).toBe(Type.caption.fontSize);
      expect(style.lineHeight).toBe(Type.caption.lineHeight);
      expect(style.fontSize).toBeGreaterThanOrEqual(Type.caption.fontSize);
    });
  });
});

describe('YesNoNAToggle behavior (unchanged by this task)', () => {
  it('selects a value on tap', () => {
    const onChange = jest.fn();
    const r = render(<YesNoNAToggle value={null} onChange={onChange} />);
    const [yBtn] = findToggleButtons(r);
    TestRenderer.act(() => { yBtn.props.onPress(); });
    expect(onChange).toHaveBeenCalledWith('Y');
  });

  it('deselects (returns null) when tapping the already-active option', () => {
    const onChange = jest.fn();
    const r = render(<YesNoNAToggle value="N" onChange={onChange} />);
    const [, nBtn] = findToggleButtons(r);
    TestRenderer.act(() => { nBtn.props.onPress(); });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
