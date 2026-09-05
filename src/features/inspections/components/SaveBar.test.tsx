import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { SaveBar } from './SaveBar';
import { Colors } from '../../../design/colors';
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

// The bar: the only View in the tree with the 2px top border. Anchoring on
// that (rather than a bare `n.type === View` scan, which also matches every
// Button's own inner host View) throws on zero-or-multiple matches, per the
// EstablishmentCard/ReportListCard/Button locator convention.
const findBar = (r: Renderer) => {
  const matches = r.root.findAll(
    (n) =>
      ((n.type as any)?.name === 'View' || n.type === View) &&
      flattenStyle(n.props.style).borderTopWidth === 2 &&
      flattenStyle(n.props.style).borderTopColor === Colors.border,
  );
  if (matches.length === 0) {
    throw new Error('No View found matching: bar (borderTopWidth 2 / Colors.border)');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 View matching bar locator but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

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

// The style properties that actually determine a flex child's rendered
// width. Anything else (opacity, colors, border) is free to differ between
// idle and saving — only these must not.
const WIDTH_DETERMINING_KEYS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'width', 'minWidth', 'maxWidth'] as const;
const widthDeterminingStyle = (style: unknown): Record<string, unknown> => {
  const flat = flattenStyle(style);
  return Object.fromEntries(WIDTH_DETERMINING_KEYS.filter((key) => key in flat).map((key) => [key, flat[key]]));
};

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
  // Previously guaranteed by a minWidth fighting submitBtn's flex — which is
  // exactly what made Discard and Save Draft squeeze unevenly (the bug this
  // task also fixes). Now that all three widths come purely from flex
  // ratios, the guarantee is structural: swapping the label for the loading
  // spinner changes Submit's *content*, never the flex/width style that
  // determines its box, so it can't resize or shift its neighbours. Proven
  // here by diffing the resolved width-determining style between the idle
  // and saving renders, rather than assumed.
  it('resolves the same width-determining style for Submit Report whether idle or saving', () => {
    const idle = render(<SaveBar {...baseProps} saving={false} />);
    const saving = render(<SaveBar {...baseProps} saving />);
    const idleStyle = widthDeterminingStyle(findButtonByLabel(idle, 'Submit Report').props.style);
    const savingStyle = widthDeterminingStyle(findButtonByLabel(saving, 'Submit Report').props.style);
    expect(Object.keys(idleStyle).length).toBeGreaterThan(0);
    expect(savingStyle).toEqual(idleStyle);
  });

  it('has no minWidth left to fight the flex ratio (flex alone determines width)', () => {
    const r = render(<SaveBar {...baseProps} />);
    const style = widthDeterminingStyle(findButtonByLabel(r, 'Submit Report').props.style);
    expect(style.minWidth).toBeUndefined();
  });
});

describe('SaveBar button hierarchy', () => {
  // The user's explicit hierarchy: Submit Report and Save Draft equal in
  // size, Discard the smallest. Implemented with flex ratios only.
  it('gives Save Draft and Submit Report the same flex, and Discard a strictly smaller one', () => {
    const r = render(<SaveBar {...baseProps} />);
    const discardFlex = flattenStyle(findButtonByLabel(r, 'Discard').props.style).flex as number;
    const draftFlex = flattenStyle(findButtonByLabel(r, 'Save Draft').props.style).flex as number;
    const submitFlex = flattenStyle(findButtonByLabel(r, 'Submit Report').props.style).flex as number;

    expect(typeof discardFlex).toBe('number');
    expect(typeof draftFlex).toBe('number');
    expect(typeof submitFlex).toBe('number');
    expect(draftFlex).toBe(submitFlex);
    expect(discardFlex).toBeLessThan(draftFlex);
    expect(discardFlex).toBeLessThan(submitFlex);
  });

  it('lays the three buttons out in a single row', () => {
    const r = render(<SaveBar {...baseProps} />);
    expect(flattenStyle(findBar(r).props.style).flexDirection).toBe('row');
    expect(allActionButtons(r)).toHaveLength(3);
  });
});

describe('SaveBar legibility guarantee', () => {
  // The type scale's floor is Type.caption (11) — nothing this component
  // renders (the three button labels) may resolve below it, in either the
  // idle or the saving branch.
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

describe('SaveBar info text removal', () => {
  // The user-reported bug this fixes: an unwanted "Report for {name} ·
  // {typeLabel}" line above the buttons. It, and the establishmentName /
  // typeLabel props that fed it, are gone for good.
  it('renders no "Report for" text anywhere in the tree', () => {
    const r = render(<SaveBar {...baseProps} />);
    const hasReportForText = r.root.findAllByType(Text).some((n) => {
      const child = n.props.children;
      return typeof child === 'string' && child.includes('Report for');
    });
    expect(hasReportForText).toBe(false);
  });

  it('no longer accepts establishmentName or typeLabel props (type-level — npm run typecheck enforces this)', () => {
    // @ts-expect-error establishmentName was removed from SaveBarProps along
    // with the info block it fed; this line must fail to typecheck.
    const withEstablishmentName = <SaveBar {...baseProps} establishmentName="Test Facility" />;
    // @ts-expect-error typeLabel was removed from SaveBarProps for the same
    // reason; this line must fail to typecheck.
    const withTypeLabel = <SaveBar {...baseProps} typeLabel="Water Monitoring" />;
    // Rendering isn't the point (extra props are simply ignored at runtime);
    // the @ts-expect-error directives above are the actual assertion, and
    // `npm run typecheck` fails if either one goes unused.
    expect(withEstablishmentName).toBeTruthy();
    expect(withTypeLabel).toBeTruthy();
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
