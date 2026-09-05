import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { CheckboxRow } from './CheckboxRow';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
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

const noop = () => {};

// react-native's own TouchableOpacity module wraps an inner, unexported
// class component of the same displayName, so a naive props-only predicate
// double-matches - anchoring on `n.type === TouchableOpacity` (the module
// reference this file and CheckboxRow.tsx both resolve to) keeps a `.find()`
// to the outer fiber only, same convention as YesNoNAToggle.test.tsx.
const findRow = (r: Renderer) => r.root.find((n) => n.type === TouchableOpacity);

describe('CheckboxRow 48dp hit target', () => {
  it('brings the resolved hitSlop to the 48dp minimum without changing the visual box', () => {
    const r = render(<CheckboxRow label="Has valid ECC" checked={false} onToggle={noop} />);
    const style = flattenStyle(findRow(r).props.style);

    // Visual size did not grow: paddingVertical resolves to Spacing.sm,
    // which is exactly the pre-migration literal 8 - a token substitution
    // with no numeric change.
    expect(style.paddingVertical).toBe(Spacing.sm);
    expect(style.paddingVertical).toBe(8);

    // The row's true rendered height is paddingVertical (top + bottom) plus
    // the label's own line height - computed independently here from the
    // token symbols, not copied from the component's internals.
    const measuredHeight = (style.paddingVertical as number) * 2 + Type.bodySm.lineHeight;
    const hitSlop = findRow(r).props.hitSlop as { top: number; bottom: number; left: number; right: number };
    expect(hitSlop.top).toBe(hitSlop.bottom);
    expect(hitSlop.left).toBe(hitSlop.right);
    expect(hitSlop.top).toBe(hitSlop.left);
    expect(measuredHeight + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(48);
  });
});

describe('CheckboxRow token resolution', () => {
  it("resolves the label's fontSize/lineHeight to Type.bodySm", () => {
    const r = render(<CheckboxRow label="Has valid ECC" checked={false} onToggle={noop} />);
    const label = r.root.find((n) => n.type === Text && n.props.children === 'Has valid ECC');
    const style = flattenStyle(label.props.style);
    expect(style.fontSize).toBe(Type.bodySm.fontSize);
    expect(style.lineHeight).toBe(Type.bodySm.lineHeight);
  });

  it("resolves the subLabel's fontSize/lineHeight to Type.caption", () => {
    const r = render(
      <CheckboxRow label="Has valid ECC" subLabel="Required for new projects" checked={false} onToggle={noop} />,
    );
    const sub = r.root.find((n) => n.type === Text && n.props.children === 'Required for new projects');
    const style = flattenStyle(sub.props.style);
    expect(style.fontSize).toBe(Type.caption.fontSize);
    expect(style.lineHeight).toBe(Type.caption.lineHeight);
  });

  it('resolves the row borderRadius to Radius.md', () => {
    const r = render(<CheckboxRow label="Has valid ECC" checked={false} onToggle={noop} />);
    expect(flattenStyle(findRow(r).props.style).borderRadius).toBe(Radius.md);
  });
});

describe('CheckboxRow legibility guarantee', () => {
  it('renders nothing below Type.caption.fontSize with a subLabel, checked and unchecked', () => {
    [false, true].forEach((checked) => {
      const r = render(
        <CheckboxRow label="Has valid ECC" subLabel="Required for new projects" checked={checked} onToggle={noop} />,
      );
      const glyphs = new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));
      const sizes = r.root
        .findAllByType(Text)
        .filter((n) => !glyphs.has(n))
        .map((n) => flattenStyle(n.props.style).fontSize)
        .filter((size): size is number => typeof size === 'number');
      expect(sizes.length).toBeGreaterThan(0);
      sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
    });
  });
});

describe('CheckboxRow behavior (unchanged by this task)', () => {
  it('calls onToggle when tapped', () => {
    const onToggle = jest.fn();
    const r = render(<CheckboxRow label="Has valid ECC" checked={false} onToggle={onToggle} />);
    TestRenderer.act(() => { findRow(r).props.onPress(); });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('swaps the icon (name and color) between unchecked and checked', () => {
    const unchecked = render(<CheckboxRow label="Has valid ECC" checked={false} onToggle={noop} />);
    const checked = render(<CheckboxRow label="Has valid ECC" checked={true} onToggle={noop} />);
    expect(unchecked.root.findByType(Ionicons).props.name).toBe('square-outline');
    expect(unchecked.root.findByType(Ionicons).props.color).toBe(Colors.textMuted);
    expect(checked.root.findByType(Ionicons).props.name).toBe('checkbox');
    expect(checked.root.findByType(Ionicons).props.color).toBe(Colors.green);
  });
});
