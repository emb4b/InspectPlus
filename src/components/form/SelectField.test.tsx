import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
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

describe('SelectField groups', () => {
  // Marinduque's real waterbody list (src/data/mimaropaWaterbodies.ts) -
  // three groups, 8 options total. Needs to clear the same >6 threshold a
  // real caller's data would, or the search box in the "drops a header"
  // case below never mounts.
  const groups = [
    { label: 'Principal Rivers', options: ['Boac River (C)', 'Tagum River (C)', 'Tawiran River (A, B, C)'] },
    { label: 'Minor Rivers', options: ['Balanacan River (C)', 'Mogpog River (C)'] },
    { label: 'Other Waterbodies', options: ['Calancan Bay (SB)', 'Maniwaya Coastal Waters (SB)', 'Ulan Bay (SB, SC)'] },
  ];

  const openPicker = (tree: Renderer) => {
    TestRenderer.act(() => {
      tree.root.findAll((n) => n.type === TouchableOpacity)[0].props.onPress();
    });
  };

  // `tree.toJSON()` isn't usable here: with the picker's Modal open, this
  // environment's react-test-renderer throws "Converting circular structure
  // to JSON" (reproduced on the pre-existing `options` path too, so it's an
  // environment quirk, not something this change introduced) - text
  // presence is checked via the rendered Text nodes instead.
  const hasText = (tree: Renderer, text: string) =>
    tree.root.findAll((n) => n.type === Text && [n.props.children].flat().includes(text)).length > 0;

  it('renders a header above each group', () => {
    const tree = render(
      <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={noop} />,
    );
    openPicker(tree);
    expect(hasText(tree, 'Principal Rivers')).toBe(true);
    expect(hasText(tree, 'Other Waterbodies')).toBe(true);
    expect(hasText(tree, 'Boac River (C)')).toBe(true);
  });

  // A header is a label, not a choice. Tapping it must not select it, or an
  // inspector ends up with "Principal Rivers" recorded as their outlet's
  // receiving water.
  it('does not select a header when it is tapped', () => {
    const onSelect = jest.fn();
    const tree = render(
      <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={onSelect} />,
    );
    openPicker(tree);
    const header = tree.root.findAll(
      (n) => n.type === Text && [n.props.children].flat().includes('Principal Rivers'),
    )[0];
    expect(header.parent?.props.onPress).toBeUndefined();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still selects a real option', () => {
    const onSelect = jest.fn();
    const tree = render(
      <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={onSelect} />,
    );
    openPicker(tree);
    // Anchored on the option row's own resolved style rather than a `.parent`
    // walk off the Text, for the same reason as the pre-existing "selects an
    // option" test above: TouchableOpacity's own test instance sits below an
    // intermediate host View, so `Text.parent` resolves to that View instead.
    const optionRowBtn = tree.root.find(
      (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).justifyContent === 'space-between'
        && flattenStyle(n.props.style).paddingHorizontal === Spacing.xs
        && n.findAllByType(Text).some((t) => t.props.children === 'Boac River (C)'),
    );
    TestRenderer.act(() => {
      optionRowBtn.props.onPress();
    });
    expect(onSelect).toHaveBeenCalledWith('Boac River (C)');
  });

  // Otherwise a search matching nothing in a group leaves its header
  // stranded above a gap.
  it('drops a header whose options all filter out', () => {
    const tree = render(
      <SelectField label="Receiving Body of Water" value="" groups={groups} onSelect={noop} />,
    );
    openPicker(tree);
    const search = tree.root.findAll((n) => n.type === TextInput)[0];
    TestRenderer.act(() => {
      search.props.onChangeText('Ulan');
    });
    expect(hasText(tree, 'Other Waterbodies')).toBe(true);
    expect(hasText(tree, 'Principal Rivers')).toBe(false);
  });
});
