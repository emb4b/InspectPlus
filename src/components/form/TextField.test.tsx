import React from 'react';
import { Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer, { act } from 'react-test-renderer';
import { TextField } from './TextField';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Type } from '../../design/typography';

type Renderer = TestRenderer.ReactTestRenderer;

const VALUE = 'NELTEX PHILIPPINE HARDWAREHOUSE CO., INC.';

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

// MarqueeText is the only thing in this tree that measures via a ScrollView's
// content size, so an onContentSizeChange handler anywhere below a field means
// the marquee machinery got mounted.
const marqueeProbes = (r: Renderer) =>
  r.root.findAll(n => typeof n.props?.onContentSizeChange === 'function');

const valueNode = (r: Renderer) =>
  r.root.findAll(n => n.props?.children === VALUE)[0];

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// The field label ("Establishment Name" here) is uniquely identified among
// this component's own Text nodes by its color + weight: the read-only
// label recedes to Colors.textLight (see labelDisplay), so an editable
// field's label (Colors.navy, weight 700) never collides with it.
const findEditableLabel = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).color === Colors.navy
      && flattenStyle(n.props.style).fontWeight === '700',
  );

const findDisplayLabel = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).color === Colors.textLight
      && flattenStyle(n.props.style).fontWeight === '700',
  );

const iconGlyphTexts = (r: Renderer): Set<TestRenderer.ReactTestInstance> =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

const allFontSizes = (r: Renderer): number[] => {
  const glyphs = iconGlyphTexts(r);
  const textSizes = r.root
    .findAllByType(Text)
    .filter((n) => !glyphs.has(n))
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');
  const inputSizes = r.root
    .findAllByType(TextInput)
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');
  return [...textSizes, ...inputSizes];
};

describe('TextField read-only rendering', () => {
  // The whole point of the read-only presentation: a detail screen stacks
  // ~15 of these, and each marquee used to bring a hidden ScrollView and a
  // perpetual animation with it — even for a value like "—".
  it('renders a read-only value without mounting any marquee machinery', () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} readOnly />);

    expect(marqueeProbes(r)).toHaveLength(0);
  });

  it('renders the read-only value as plain text', () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} readOnly />);

    expect(valueNode(r)).toBeDefined();
  });

  // Wrapping is what replaces the marquee: the full value has to stay
  // readable, so it must not be capped to a line count or ellipsized.
  it('does not clip or truncate the read-only value', () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} readOnly />);

    expect(valueNode(r).props.numberOfLines).toBeUndefined();
    expect(valueNode(r).props.ellipsizeMode).toBeUndefined();
  });

  it('still renders an editable input when not read-only', () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} onChangeText={() => {}} />);

    expect(r.root.findAllByType(TextInput).length).toBeGreaterThan(0);
  });
});

describe('TextField token resolution', () => {
  it("resolves the editable label's fontSize/lineHeight to Type.label", () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} onChangeText={() => {}} />);
    const style = flattenStyle(findEditableLabel(r)?.props.style);
    expect(style.fontSize).toBe(Type.label.fontSize);
    expect(style.lineHeight).toBe(Type.label.lineHeight);
  });

  it("resolves the editable input's fontSize/lineHeight to Type.bodySm and its borderRadius to Radius.md", () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} onChangeText={() => {}} />);
    const style = flattenStyle(r.root.findByType(TextInput).props.style);
    expect(style.fontSize).toBe(Type.bodySm.fontSize);
    expect(style.lineHeight).toBe(Type.bodySm.lineHeight);
    expect(style.borderRadius).toBe(Radius.md);
  });

  it("resolves the read-only value's fontSize/lineHeight to Type.body", () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} readOnly />);
    const style = flattenStyle(valueNode(r).props.style);
    expect(style.fontSize).toBe(Type.body.fontSize);
    expect(style.lineHeight).toBe(Type.body.lineHeight);
  });

  it("resolves the read-only display label's fontSize/lineHeight to Type.caption, not the old bare 10", () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} readOnly />);
    const style = flattenStyle(findDisplayLabel(r)?.props.style);
    expect(style.fontSize).toBe(Type.caption.fontSize);
    expect(style.lineHeight).toBe(Type.caption.lineHeight);
  });

  it('resolves the read-only display surface borderRadius to Radius.lg', () => {
    const r = render(<TextField label="Establishment Name" value={VALUE} readOnly />);
    const displaySurface = r.root.find(
      (n) => flattenStyle(n.props.style).backgroundColor === Colors.bgMuted
        && flattenStyle(n.props.style).borderRadius !== undefined,
    );
    expect(flattenStyle(displaySurface.props.style).borderRadius).toBe(Radius.lg);
  });

  it("resolves the changeNote's fontSize/lineHeight to Type.caption", () => {
    const r = render(
      <TextField label="Establishment Name" value={VALUE} onChangeText={() => {}} changeNote="Differs from record" />,
    );
    const note = r.root.find((n) => n.type === Text && n.props.children === 'Differs from record');
    const style = flattenStyle(note.props.style);
    expect(style.fontSize).toBe(Type.caption.fontSize);
    expect(style.lineHeight).toBe(Type.caption.lineHeight);
  });
});

describe('TextField legibility guarantee', () => {
  it('renders nothing below Type.caption.fontSize when editable, with a hint and required marker', () => {
    const r = render(
      <TextField label="Establishment Name" value={VALUE} onChangeText={() => {}} required hint="As on the permit" />,
    );
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize when read-only, with a changeNote and an empty value', () => {
    const r = render(<TextField label="Establishment Name" value="—" readOnly changeNote="Differs from record" />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize in the disabled multiline path', () => {
    const r = render(
      <TextField label="Remarks" value={VALUE} onChangeText={() => {}} multiline readOnly numberOfLines={4} />,
    );
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});
