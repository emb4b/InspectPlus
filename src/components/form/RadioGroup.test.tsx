import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { RadioGroup } from './RadioGroup';
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

const options = [
  { label: 'Compliant', value: 'compliant' },
  { label: 'Non-compliant', value: 'non_compliant' },
];

const noop = () => {};

// react-native's own TouchableOpacity module wraps an inner, unexported
// class component of the same displayName, so a naive props-only predicate
// double-matches (once per fiber) - anchoring on `n.type === TouchableOpacity`
// (the module reference this file and RadioGroup.tsx both resolve to) keeps
// this to the outer fiber only, same convention as YesNoNAToggle.test.tsx.
const findPills = (r: Renderer) => {
  const matches = r.root.findAll((n) => n.type === TouchableOpacity);
  if (matches.length !== options.length) {
    throw new Error(`Expected exactly ${options.length} pills but found ${matches.length}`);
  }
  return matches;
};

describe('RadioGroup 48dp hit target', () => {
  it('brings the resolved hitSlop to the 48dp minimum without changing the visual box', () => {
    const r = render(<RadioGroup options={options} value={null} onChange={noop} />);
    const pills = findPills(r);

    pills.forEach((btn) => {
      const style = flattenStyle(btn.props.style);
      // Visual size did not grow: paddingVertical stays the original
      // literal 7 - there is no exact Spacing token for it, and snapping to
      // the nearest one (sm/8) would grow the pill by 2dp, which is exactly
      // what this fix must not do.
      expect(style.paddingVertical).toBe(7);

      // The pill's true rendered height is paddingVertical (top + bottom)
      // plus the option label's own line height - computed independently
      // here from the token symbol, not copied from the component's
      // internals.
      const measuredHeight = (style.paddingVertical as number) * 2 + Type.label.lineHeight;
      const hitSlop = btn.props.hitSlop as { top: number; bottom: number; left: number; right: number };
      expect(hitSlop.top).toBe(hitSlop.bottom);
      expect(hitSlop.left).toBe(hitSlop.right);
      expect(hitSlop.top).toBe(hitSlop.left);
      expect(measuredHeight + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(48);
    });
  });
});

describe('RadioGroup token resolution', () => {
  it("resolves every pill label's fontSize/lineHeight to Type.label, not the old 12.5", () => {
    const r = render(<RadioGroup options={options} value={null} onChange={noop} />);
    const labels = r.root.findAll(
      (n) => n.type === Text && flattenStyle(n.props.style).fontWeight === '600',
    );
    expect(labels).toHaveLength(options.length);
    labels.forEach((n) => {
      const style = flattenStyle(n.props.style);
      expect(style.fontSize).toBe(Type.label.fontSize);
      expect(style.lineHeight).toBe(Type.label.lineHeight);
    });
  });

  it('resolves the pill borderRadius to Radius.md', () => {
    const r = render(<RadioGroup options={options} value={null} onChange={noop} />);
    findPills(r).forEach((btn) => {
      expect(flattenStyle(btn.props.style).borderRadius).toBe(Radius.md);
    });
  });

  it('resolves every indicator dot borderRadius to Radius.pill, not a bare half-width literal', () => {
    const r = render(<RadioGroup options={options} value="compliant" onChange={noop} />);
    // Every option renders its own dot (active or not), so this is a
    // findAll, not a find() - both dots resolve the same borderRadius.
    // Anchored on `n.type === View`: View's own module wraps an inner host
    // instance sharing the same style prop, so an untyped predicate would
    // double-match (composite + host) per dot, the same convention used for
    // Text/TouchableOpacity elsewhere in this suite.
    const dots = r.root.findAll(
      (n) => n.type === View && flattenStyle(n.props.style).width === 10 && flattenStyle(n.props.style).height === 10,
    );
    expect(dots).toHaveLength(options.length);
    dots.forEach((dot) => expect(flattenStyle(dot.props.style).borderRadius).toBe(Radius.pill));
  });

  it("resolves the group label's fontSize/lineHeight to Type.label with a bare-6 marginBottom snapped to Spacing.sm", () => {
    const r = render(<RadioGroup label="Compliance" options={options} value={null} onChange={noop} />);
    const label = r.root.find(
      (n) => n.type === Text && flattenStyle(n.props.style).color === Colors.navy
        && flattenStyle(n.props.style).fontWeight === '700',
    );
    const style = flattenStyle(label.props.style);
    expect(style.fontSize).toBe(Type.label.fontSize);
    expect(style.lineHeight).toBe(Type.label.lineHeight);
    expect(style.marginBottom).toBe(Spacing.sm);
  });
});

describe('RadioGroup legibility guarantee', () => {
  it('renders nothing below Type.caption.fontSize with a label, required marker, and a selected value', () => {
    const r = render(<RadioGroup label="Compliance" options={options} value="compliant" onChange={noop} required />);
    const sizes = r.root
      .findAllByType(Text)
      .map((n) => flattenStyle(n.props.style).fontSize)
      .filter((size): size is number => typeof size === 'number');
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});

describe('RadioGroup behavior (unchanged by this task)', () => {
  it('calls onChange with the selected option value', () => {
    const onChange = jest.fn();
    const r = render(<RadioGroup options={options} value={null} onChange={onChange} />);
    const [, secondPill] = findPills(r);
    TestRenderer.act(() => { secondPill.props.onPress(); });
    expect(onChange).toHaveBeenCalledWith('non_compliant');
  });
});
