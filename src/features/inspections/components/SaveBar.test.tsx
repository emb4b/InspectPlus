import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { SaveBar } from './SaveBar';
import { Colors } from '../../../design/colors';
import { Spacing } from '../../../design/spacing';
import { Type } from '../../../design/typography';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

const noop = () => {};

const baseProps = {
  establishmentName: 'Test Facility',
  typeLabel: 'Water Monitoring',
  saving: false,
  onDiscard: noop,
  onSaveDraft: noop,
  onSubmit: noop,
};

// react-native's own TouchableOpacity module is itself a thin wrapper that
// spreads every prop it receives onto an inner, unexported class component of
// the same displayName, so a naive props-only predicate double-matches: once
// on the outer wrapper fiber, once on the inner one. Anchoring on
// `n.type === TouchableOpacity` (the same module reference this file and
// Button.tsx both resolve to) narrows a find/findAll to the outer fiber only
// — same convention as Button.test.tsx / EstablishmentCard.test.tsx.
const findButtonByLabel = (r: Renderer, label: string) => {
  const matches = r.root.findAll(
    (n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === label,
  );
  if (matches.length === 0) {
    throw new Error(`No TouchableOpacity found with accessibilityLabel === "${label}"`);
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 TouchableOpacity with accessibilityLabel "${label}" but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

const allActionButtons = (r: Renderer) => r.root.findAll((n) => n.type === TouchableOpacity);

// react-native's own View module is itself a thin forwardRef wrapper: each
// of the three Buttons' TouchableOpacity renders its own inner host View
// carrying the button's resolved style, so a bare `n.type === View` search
// over the whole tree returns 8 nodes here (bar, info row, the marquee's
// container, actions row, and one inner View per Button) — not just the two
// rows this component's own JSX declares. Every locator below is anchored on
// a style shape unique to its target among all 8, confirmed by rendering the
// tree and diffing every match before writing these. Throws on
// zero-or-multiple matches, per the EstablishmentCard/ReportListCard/Button
// locator convention.
const allViews = (r: Renderer) => r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);

const findUniqueView = (r: Renderer, predicate: (flat: Record<string, unknown>) => boolean, description: string) => {
  const matches = allViews(r).filter((n) => predicate(flattenStyle(n.props.style)));
  if (matches.length === 0) {
    throw new Error(`No View found matching: ${description}`);
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 View matching "${description}" but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

// The bar: only View in the tree with the 2px top border.
const findBar = (r: Renderer) =>
  findUniqueView(r, (flat) => flat.borderTopWidth === 2 && flat.borderTopColor === Colors.border, 'bar (borderTopWidth 2 / Colors.border)');

// The info row: flexDirection row + alignItems center, but (unlike each
// Button's inner View) with neither a gap nor a borderRadius of its own.
const findInfoRow = (r: Renderer) =>
  findUniqueView(
    r,
    (flat) => flat.flexDirection === 'row' && flat.alignItems === 'center' && flat.gap === undefined && flat.borderRadius === undefined,
    'info row (flexDirection row / alignItems center, no gap or borderRadius)',
  );

// The actions row: the only View in the tree with an 8px gap (each Button's
// own internal icon-to-label gap is 4).
const findActionsRow = (r: Renderer) =>
  findUniqueView(r, (flat) => flat.flexDirection === 'row' && flat.gap === Spacing.sm, 'actions row (flexDirection row / gap Spacing.sm)');

// @expo/vector-icons renders its glyph as a Text under the hood, with the
// icon's `size` prop applied as that Text's fontSize — that's an icon size,
// not prose, so it must be excluded before checking the type scale's floor.
// Same convention as EstablishmentCard.test.tsx.
const iconGlyphTexts = (r: Renderer): Set<TestRenderer.ReactTestInstance> =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

const proseTexts = (r: Renderer) => {
  const glyphs = iconGlyphTexts(r);
  return r.root.findAllByType(Text).filter((n) => !glyphs.has(n));
};

const allFontSizes = (r: Renderer): number[] =>
  proseTexts(r)
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');

describe('SaveBar callback wiring', () => {
  it('fires onDiscard only from the Discard button', () => {
    const onDiscard = jest.fn();
    const onSaveDraft = jest.fn();
    const onSubmit = jest.fn();
    const r = render(<SaveBar {...baseProps} onDiscard={onDiscard} onSaveDraft={onSaveDraft} onSubmit={onSubmit} />);
    TestRenderer.act(() => { findButtonByLabel(r, 'Discard').props.onPress(); });
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('fires onSaveDraft only from the Save Draft button', () => {
    const onDiscard = jest.fn();
    const onSaveDraft = jest.fn();
    const onSubmit = jest.fn();
    const r = render(<SaveBar {...baseProps} onDiscard={onDiscard} onSaveDraft={onSaveDraft} onSubmit={onSubmit} />);
    TestRenderer.act(() => { findButtonByLabel(r, 'Save Draft').props.onPress(); });
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('fires onSubmit only from the Submit Report button', () => {
    const onDiscard = jest.fn();
    const onSaveDraft = jest.fn();
    const onSubmit = jest.fn();
    const r = render(<SaveBar {...baseProps} onDiscard={onDiscard} onSaveDraft={onSaveDraft} onSubmit={onSubmit} />);
    TestRenderer.act(() => { findButtonByLabel(r, 'Submit Report').props.onPress(); });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
    expect(onSaveDraft).not.toHaveBeenCalled();
  });
});

describe('SaveBar saving state', () => {
  it('disables all three buttons while saving', () => {
    const r = render(<SaveBar {...baseProps} saving />);
    expect(findButtonByLabel(r, 'Discard').props.disabled).toBe(true);
    expect(findButtonByLabel(r, 'Save Draft').props.disabled).toBe(true);
    expect(findButtonByLabel(r, 'Submit Report').props.disabled).toBe(true);
  });

  it('leaves all three buttons enabled when not saving', () => {
    const r = render(<SaveBar {...baseProps} saving={false} />);
    expect(findButtonByLabel(r, 'Discard').props.disabled).toBe(false);
    expect(findButtonByLabel(r, 'Save Draft').props.disabled).toBe(false);
    expect(findButtonByLabel(r, 'Submit Report').props.disabled).toBe(false);
  });

  it('shows a loading spinner on the submit button instead of its label while saving', () => {
    const r = render(<SaveBar {...baseProps} saving />);
    const submitBtn = findButtonByLabel(r, 'Submit Report');
    expect(submitBtn.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(r.root.findAllByType(Text).some((n) => n.props.children === 'Submit Report')).toBe(false);
  });

  it('does not show a spinner on the submit button when not saving', () => {
    const r = render(<SaveBar {...baseProps} saving={false} />);
    const submitBtn = findButtonByLabel(r, 'Submit Report');
    expect(submitBtn.findAllByType(ActivityIndicator)).toHaveLength(0);
  });
});

describe('SaveBar no-resize-during-save guarantee', () => {
  it('keeps the submit button at its minWidth regardless of saving state', () => {
    const idle = render(<SaveBar {...baseProps} saving={false} />);
    const saving = render(<SaveBar {...baseProps} saving />);
    const idleStyle = flattenStyle(findButtonByLabel(idle, 'Submit Report').props.style);
    const savingStyle = flattenStyle(findButtonByLabel(saving, 'Submit Report').props.style);
    expect(idleStyle.minWidth).toBe(120);
    expect(savingStyle.minWidth).toBe(120);
  });
});

describe('SaveBar legibility guarantee', () => {
  // The type scale's floor is Type.caption (11) — nothing this component
  // renders may resolve below it, in either the idle or the saving branch.
  it('renders nothing below Type.caption.fontSize when idle', () => {
    const r = render(<SaveBar {...baseProps} saving={false} />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize while saving', () => {
    const r = render(<SaveBar {...baseProps} saving />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});

describe('SaveBar layout: info text and actions are separate rows', () => {
  // The bug this task fixes: the info text and all three action buttons
  // packed into one horizontal row, leaving too little width for either. The
  // fix stacks them — info on its own row, actions on a full-width row below
  // — so this locks in the structural split rather than just the visuals.
  it('renders the info text and the action row as two separate rows under the bar, not merged into one', () => {
    const r = render(<SaveBar {...baseProps} />);
    const bar = findBar(r);
    const infoRow = findInfoRow(r);
    const actionsRow = findActionsRow(r);

    // The bar itself must stack its two rows vertically. If someone put the
    // info text and the buttons back on one line, this would need to be
    // 'row' instead — this, together with the two distinct row locators
    // above (which would themselves fail to resolve to two different nodes
    // if the rows were merged into one), pins down the actual restructure.
    expect(flattenStyle(bar.props.style).flexDirection).toBe('column');

    // The info row carries the marquee text and no buttons at all.
    expect(infoRow.findAll((n) => n.type === TouchableOpacity)).toHaveLength(0);
    expect(infoRow.findAllByType(Text).some((n) => n.props.children === 'Report for ')).toBe(true);

    // The actions row carries all three buttons and none of the info text.
    expect(actionsRow.findAll((n) => n.type === TouchableOpacity)).toHaveLength(3);
    expect(actionsRow.findAllByType(Text).some((n) => n.props.children === 'Report for ')).toBe(false);
  });

  it('spans the action row full width beneath the info text (both rows resolve to a row flex direction)', () => {
    const r = render(<SaveBar {...baseProps} />);
    const infoRow = findInfoRow(r);
    const actionsRow = findActionsRow(r);
    expect(flattenStyle(infoRow.props.style).flexDirection).toBe('row');
    expect(flattenStyle(actionsRow.props.style).flexDirection).toBe('row');
  });
});

describe('SaveBar establishment name marquee', () => {
  it('renders the establishment name via AppText marquee so a long name can scroll instead of clipping', () => {
    const longName = 'A Very Long Establishment Name That Would Overflow The Available Width On A Small Phone Screen';
    const r = render(<SaveBar {...baseProps} establishmentName={longName} />);
    // MarqueeText always renders a hidden measuring copy of the text, plus
    // either a plain ellipsis Text or two scrolling copies once it overflows
    // — every branch renders the establishment name string at least once.
    expect(r.root.findAllByType(Text).some((n) => n.props.children === longName)).toBe(true);
  });

  it('still shows the plain "Report for" / type label text alongside the marquee name', () => {
    const r = render(<SaveBar {...baseProps} />);
    expect(r.root.findAllByType(Text).some((n) => n.props.children === 'Report for ')).toBe(true);
    // `{' · '}{typeLabel}` compiles to a children array, not one string —
    // joined here rather than compared directly, same as the "+1 more"
    // pattern in EstablishmentCard.test.tsx.
    expect(
      r.root.findAllByType(Text).some((n) => Array.isArray(n.props.children) && n.props.children.join('') === ' · Water Monitoring'),
    ).toBe(true);
  });
});

describe('SaveBar button count and count sanity', () => {
  it('renders exactly three action buttons', () => {
    const r = render(<SaveBar {...baseProps} />);
    expect(allActionButtons(r)).toHaveLength(3);
  });

  it('does not label any button starting with a literal "+"', () => {
    const r = render(<SaveBar {...baseProps} />);
    const labels = allActionButtons(r).map((n) => n.props.accessibilityLabel as string);
    expect(labels).toEqual(['Discard', 'Save Draft', 'Submit Report']);
    labels.forEach((label) => expect(label.startsWith('+')).toBe(false));
  });
});
