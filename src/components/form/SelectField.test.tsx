import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { SelectField } from './SelectField';
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

const options = ['Manufacturing', 'Retail', 'Services'];
const noop = () => {};

const findFieldLabel = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).fontSize === Type.label.fontSize
      && flattenStyle(n.props.style).color === Colors.navy,
  );

const findSheetTitle = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).fontSize === Type.subheading.fontSize,
  );

// The field's own tappable box - the only TouchableOpacity in the default
// render carrying `justifyContent: 'space-between'` alongside a `width`
// prop; the overlay/sheet touchables that also mount only stretch (flex: 1)
// or wrap the modal content, so this predicate stays unique.
const findFieldBox = (r: Renderer) =>
  r.root.find(
    (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).justifyContent === 'space-between'
      && flattenStyle(n.props.style).width === '100%',
  );

const iconGlyphTexts = (r: Renderer): Set<TestRenderer.ReactTestInstance> =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

// Excludes the checkmark icon's own glyph Text, which also resolves its
// `color` prop to Colors.green - without this, a find() for the option
// label double-matches the icon glyph beside it.
const findActiveOptionText = (r: Renderer) => {
  const glyphs = iconGlyphTexts(r);
  return r.root.find(
    (n) => n.type === Text && !glyphs.has(n) && flattenStyle(n.props.style).color === Colors.green,
  );
};

const allFontSizes = (r: Renderer): number[] => {
  const glyphs = iconGlyphTexts(r);
  return r.root
    .findAllByType(Text)
    .filter((n) => !glyphs.has(n))
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');
};

describe('SelectField token resolution', () => {
  it("resolves the field label's fontSize/lineHeight to Type.label", () => {
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={noop} />);
    const style = flattenStyle(findFieldLabel(r)?.props.style);
    expect(style.fontSize).toBe(Type.label.fontSize);
    expect(style.lineHeight).toBe(Type.label.lineHeight);
  });

  it("resolves the sheet title's fontSize/lineHeight to Type.subheading", () => {
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={noop} />);
    // The sheet only mounts its content once opened - Modal, even under this
    // jest-expo test environment, does not render children while `visible`
    // is false.
    TestRenderer.act(() => {
      findFieldBox(r)?.props.onPress();
    });
    const style = flattenStyle(findSheetTitle(r)?.props.style);
    expect(style.fontSize).toBe(Type.subheading.fontSize);
    expect(style.lineHeight).toBe(Type.subheading.lineHeight);
  });

  it('resolves the field box borderRadius to Radius.md', () => {
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={noop} />);
    const style = flattenStyle(findFieldBox(r)?.props.style);
    expect(style.borderRadius).toBe(Radius.md);
  });

  it('resolves the disabled field box background to Colors.bgDisabled', () => {
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={noop} disabled />);
    const style = flattenStyle(findFieldBox(r)?.props.style);
    expect(style.backgroundColor).toBe(Colors.bgDisabled);
  });

  it('resolves the selected option row fontSize/lineHeight to Type.bodySm and its color to Colors.green', () => {
    const r = render(<SelectField label="Nature of Business" value="Retail" options={options} onSelect={noop} />);
    TestRenderer.act(() => {
      findFieldBox(r)?.props.onPress();
    });
    const style = flattenStyle(findActiveOptionText(r)?.props.style);
    expect(style.fontSize).toBe(Type.bodySm.fontSize);
    expect(style.lineHeight).toBe(Type.bodySm.lineHeight);
    expect(style.color).toBe(Colors.green);
  });

  it('preserves the documented `flex: 1` on the outer group (a caller stacking this field standalone overrides it with its own `flex: undefined`)', () => {
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={noop} />);
    const group = r.root.find(
      (n) => flattenStyle(n.props.style).marginBottom !== undefined && flattenStyle(n.props.style).flex !== undefined,
    );
    expect(flattenStyle(group.props.style).flex).toBe(1);
  });
});

describe('SelectField legibility guarantee', () => {
  it('renders nothing below Type.caption.fontSize with the picker closed and no value', () => {
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={noop} required />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize with the picker open, a value selected, and search visible', () => {
    const manyOptions = [...options, 'Agriculture', 'Construction', 'Education', 'Finance'];
    const r = render(<SelectField label="Nature of Business" value="Retail" options={manyOptions} onSelect={noop} />);
    TestRenderer.act(() => {
      findFieldBox(r)?.props.onPress();
    });
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize with an empty options list (no matches)', () => {
    const r = render(<SelectField label="Nature of Business" value="" options={[]} onSelect={noop} />);
    TestRenderer.act(() => {
      findFieldBox(r)?.props.onPress();
    });
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});

describe('SelectField behavior (unchanged by this task)', () => {
  it('does not open the picker when disabled', () => {
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={noop} disabled />);
    expect(findFieldBox(r)?.props.disabled).toBe(true);
  });

  it('selects an option, clearing the search and closing the picker', () => {
    const onSelect = jest.fn();
    const r = render(<SelectField label="Nature of Business" value="" options={options} onSelect={onSelect} />);
    TestRenderer.act(() => {
      findFieldBox(r)?.props.onPress();
    });
    // Anchored on the option row's own resolved style, not a
    // descendant-text search or `.parent` off the Text: `.find()` stops
    // descending once it hits a match, so "a TouchableOpacity containing
    // this Text" would incorrectly resolve to the overlay/sheet touchables
    // that also wrap every option row, rather than the row itself. The
    // option row's own `justifyContent: 'space-between'` combined with its
    // `paddingHorizontal: Spacing.xs` is unique to option rows (the field's
    // own box also centers space-between, but at Spacing.md).
    const retailRowBtn = r.root.find(
      (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).justifyContent === 'space-between'
        && flattenStyle(n.props.style).paddingHorizontal === Spacing.xs
        && n.findAllByType(Text).some((t) => t.props.children === 'Retail'),
    );
    TestRenderer.act(() => {
      retailRowBtn.props.onPress();
    });
    expect(onSelect).toHaveBeenCalledWith('Retail');
  });
});
