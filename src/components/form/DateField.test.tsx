import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { DateField } from './DateField';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
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

// Every fontSize/color pairing below is unique among this component's own
// Text nodes, the same disambiguation strategy ChecklistTable.test.tsx and
// DynamicRowTable.test.tsx use for their own same-color or same-size labels.
const findFieldLabel = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).fontSize === Type.label.fontSize
      && flattenStyle(n.props.style).color === Colors.navy,
  );

const findSheetTitle = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).fontSize === Type.subheading.fontSize,
  );

const findCalTitle = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).fontSize === Type.bodySm.fontSize
      && flattenStyle(n.props.style).color === Colors.navy,
  );

// Excludes icon glyphs: the modal's own close icon also resolves its
// `color` prop to Colors.textMuted, which would otherwise double up with
// the 7 weekday letters.
const findWeekLabels = (r: Renderer) => {
  const glyphs = iconGlyphTexts(r);
  return r.root.findAll(
    (n) => n.type === Text && !glyphs.has(n) && flattenStyle(n.props.style).color === Colors.textMuted,
  );
};

const findTodayBtnText = (r: Renderer) =>
  r.root.find(
    (n) => n.type === Text && flattenStyle(n.props.style).fontSize === Type.label.fontSize
      && flattenStyle(n.props.style).color === Colors.green,
  );

const findInput = (r: Renderer) => {
  const matches = r.root.findAllByType(TextInput);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly 1 TextInput but found ${matches.length}`);
  }
  return matches[0];
};

// The calendar toggle button - the only TouchableOpacity with a borderRadius
// in the default (picker-closed) render; the overlay/sheet touchables that
// share Radius.md-adjacent styling only mount once the modal is open.
const findCalendarBtn = (r: Renderer) =>
  r.root.find(
    (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).width === 38,
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

describe('DateField token resolution', () => {
  it("resolves the field label's fontSize/lineHeight to Type.label", () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    const style = flattenStyle(findFieldLabel(r)?.props.style);
    expect(style.fontSize).toBe(Type.label.fontSize);
    expect(style.lineHeight).toBe(Type.label.lineHeight);
  });

  // The calendar sheet only mounts its content once opened - Modal, even
  // under this jest-expo test environment, does not render children while
  // `visible` is false, so every test below opens it first.
  const openPicker = (r: Renderer) => {
    TestRenderer.act(() => {
      findCalendarBtn(r)?.props.onPress();
    });
  };

  it("resolves the sheet title's fontSize/lineHeight to Type.subheading", () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    openPicker(r);
    const style = flattenStyle(findSheetTitle(r)?.props.style);
    expect(style.fontSize).toBe(Type.subheading.fontSize);
    expect(style.lineHeight).toBe(Type.subheading.lineHeight);
  });

  it("resolves the calendar month/year heading's fontSize/lineHeight to Type.bodySm, not the old 13.5", () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    openPicker(r);
    const style = flattenStyle(findCalTitle(r)?.props.style);
    expect(style.fontSize).toBe(Type.bodySm.fontSize);
    expect(style.lineHeight).toBe(Type.bodySm.lineHeight);
  });

  it("resolves every weekday header letter's fontSize/lineHeight to Type.caption, not the old 10.5", () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    openPicker(r);
    const weekLabels = findWeekLabels(r);
    expect(weekLabels).toHaveLength(7);
    weekLabels.forEach((n) => {
      const style = flattenStyle(n.props.style);
      expect(style.fontSize).toBe(Type.caption.fontSize);
      expect(style.lineHeight).toBe(Type.caption.lineHeight);
    });
  });

  it("resolves the 'Today' button label's fontSize/lineHeight to Type.label, not the old 12.5", () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    openPicker(r);
    const style = flattenStyle(findTodayBtnText(r)?.props.style);
    expect(style.fontSize).toBe(Type.label.fontSize);
    expect(style.lineHeight).toBe(Type.label.lineHeight);
  });

  it("resolves the typed input's fontSize/lineHeight to Type.bodySm and its borderRadius to Radius.md", () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    const style = flattenStyle(findInput(r).props.style);
    expect(style.fontSize).toBe(Type.bodySm.fontSize);
    expect(style.lineHeight).toBe(Type.bodySm.lineHeight);
    expect(style.borderRadius).toBe(Radius.md);
  });

  it('resolves the calendar toggle button borderRadius to Radius.md', () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    const style = flattenStyle(findCalendarBtn(r)?.props.style);
    expect(style.borderRadius).toBe(Radius.md);
  });

  it('resolves the selected-day circle borderRadius to Radius.pill, not a bare half-width literal', () => {
    const r = render(<DateField label="Date of Inspection" value="2026-09-05" onChange={noop} />);
    openPicker(r);
    // Anchored on the selected day's own resolved backgroundColor
    // (dayBtnSelected), not a descendant-text search - `.find()` prunes a
    // matched node's subtree (it stops at the first/outermost match), so a
    // "TouchableOpacity containing a Text styled like this" predicate would
    // incorrectly resolve to the overlay/sheet touchables that also wrap
    // that Text, rather than the day button itself. No other touchable in
    // this tree sets backgroundColor: Colors.green.
    const dayBtn = r.root.find(
      (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).backgroundColor === Colors.green,
    );
    expect(flattenStyle(dayBtn.props.style).borderRadius).toBe(Radius.pill);
  });
});

describe('DateField legibility guarantee', () => {
  it('renders nothing below Type.caption.fontSize with no value set', () => {
    const r = render(<DateField label="Date of Inspection" value="" onChange={noop} />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize with a selected value and required marker', () => {
    const r = render(<DateField label="Date of Inspection" value="2026-09-05" onChange={noop} required />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize with the calendar picker open', () => {
    const r = render(<DateField label="Date of Inspection" value="2026-09-05" onChange={noop} />);
    TestRenderer.act(() => {
      findCalendarBtn(r)?.props.onPress();
    });
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});

describe('DateField behavior (unchanged by this task)', () => {
  it('masks free-typed digits into YYYY-MM-DD as the user types', () => {
    const onChange = jest.fn();
    const r = render(<DateField label="Date of Inspection" value="" onChange={onChange} />);
    TestRenderer.act(() => {
      findInput(r).props.onChangeText('20260905');
    });
    expect(onChange).toHaveBeenCalledWith('2026-09-05');
  });

  it('opens the calendar picker and selects a day, closing the modal', () => {
    const onChange = jest.fn();
    const r = render(<DateField label="Date of Inspection" value="2026-09-01" onChange={onChange} />);
    TestRenderer.act(() => {
      findCalendarBtn(r)?.props.onPress();
    });
    // Anchored on the day button's own resolved width ('80%', from
    // `styles.dayBtn` itself - the overlay/sheet touchables that also wrap
    // this Text do not carry it) combined with its child text, not
    // `.parent` off the Text or a plain descendant-text search - see the
    // borderRadius test above for why both are unreliable here.
    const dayFifteenBtn = r.root.find(
      (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).width === '80%'
        && n.findAllByType(Text).some((t) => t.props.children === 15),
    );
    TestRenderer.act(() => {
      dayFifteenBtn.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('2026-09-15');
  });

  it("rejects an impossible calendar date (e.g. Feb 30) rather than treating it as selected", () => {
    const r = render(<DateField label="Date of Inspection" value="2026-02-30" onChange={noop} />);
    TestRenderer.act(() => {
      findCalendarBtn(r)?.props.onPress();
    });
    // parseDate returns null for this value, so no day cell should render as
    // selected (Colors.textWhite is only applied to a selected day's text).
    const selected = r.root.findAll(
      (n) => n.type === Text && flattenStyle(n.props.style).color === Colors.textWhite,
    );
    expect(selected).toHaveLength(0);
  });
});
