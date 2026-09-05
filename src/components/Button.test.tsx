import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer, { act } from 'react-test-renderer';
import { Button } from './Button';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// react-native's own TouchableOpacity module is a thin wrapper that spreads
// every prop it receives onto an inner, unexported class component of the
// same displayName, so a naive props-only predicate double-matches: once on
// the outer wrapper fiber, once on the inner one. Anchoring on
// `n.type === TouchableOpacity` (the module reference this file and
// Button.tsx both resolve to) narrows a find to the outer fiber only — same
// convention as EstablishmentReportsSection.test.tsx / EstablishmentCard.test.tsx.
const findButton = (r: Renderer) => {
  const matches = r.root.findAll((n) => n.type === TouchableOpacity);
  if (matches.length === 0) {
    throw new Error('No TouchableOpacity found');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 TouchableOpacity but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

const findLabelText = (r: Renderer, label: string) => {
  const matches = r.root.findAll((n) => n.type === Text && n.props.children === label);
  if (matches.length === 0) {
    throw new Error(`No Text found with children === "${label}"`);
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 label Text but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

describe('Button token resolution', () => {
  it('resolves the sm label from Type.label (12/16)', () => {
    const r = render(<Button label="Edit" onPress={() => {}} size="sm" />);
    const style = flattenStyle(findLabelText(r, 'Edit').props.style);
    expect(style.fontSize).toBe(Type.label.fontSize);
    expect(style.lineHeight).toBe(Type.label.lineHeight);
  });

  it('resolves the md label from Type.bodySm (13/18)', () => {
    const r = render(<Button label="Edit" onPress={() => {}} size="md" />);
    const style = flattenStyle(findLabelText(r, 'Edit').props.style);
    expect(style.fontSize).toBe(Type.bodySm.fontSize);
    expect(style.lineHeight).toBe(Type.bodySm.lineHeight);
  });

  it('resolves the corner radius from Radius.md', () => {
    const r = render(<Button label="Edit" onPress={() => {}} />);
    expect(flattenStyle(findButton(r).props.style).borderRadius).toBe(Radius.md);
  });

  it.each([
    ['primary', Colors.navy, Colors.textWhite],
    ['success', Colors.green, Colors.textWhite],
    ['danger', Colors.conflict, Colors.textWhite],
    ['outline', Colors.white, Colors.navy],
    ['subtle', Colors.bgLight, Colors.textPrimary],
    ['add', Colors.white, Colors.green],
  ] as const)('resolves the %s variant background and label color from tokens', (variant, bg, labelColor) => {
    const r = render(<Button label="Edit" onPress={() => {}} variant={variant} />);
    expect(flattenStyle(findButton(r).props.style).backgroundColor).toBe(bg);
    expect(flattenStyle(findLabelText(r, 'Edit').props.style).color).toBe(labelColor);
  });

  // 'add' is the odd one out among the variants above: its distinguishing
  // feature isn't its background (white, same as outline) but a dashed
  // green border, restoring the pre-consolidation add-row/add-card
  // treatment. Covered separately so the border itself is asserted, not
  // just background/label color.
  describe('add variant (dashed green, for "this appends something" actions)', () => {
    it('resolves a dashed border in Colors.greenLight', () => {
      const r = render(<Button label="Add Row" onPress={() => {}} variant="add" icon="add" />);
      const style = flattenStyle(findButton(r).props.style);
      expect(style.borderStyle).toBe('dashed');
      expect(style.borderColor).toBe(Colors.greenLight);
    });

    it('drives both the icon and the label color from Colors.green', () => {
      const r = render(<Button label="Add Row" onPress={() => {}} variant="add" icon="add" />);
      const icon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'add');
      expect(icon?.props.color).toBe(Colors.green);
      expect(flattenStyle(findLabelText(r, 'Add Row').props.style).color).toBe(Colors.green);
    });
  });

  it('resolves sm padding from Spacing.md/Spacing.sm', () => {
    const r = render(<Button label="Edit" onPress={() => {}} size="sm" />);
    const style = flattenStyle(findButton(r).props.style);
    expect(style.paddingHorizontal).toBe(Spacing.md);
    expect(style.paddingVertical).toBe(Spacing.sm);
  });

  it('resolves md padding from Spacing.lg/Spacing.md', () => {
    const r = render(<Button label="Edit" onPress={() => {}} size="md" />);
    const style = flattenStyle(findButton(r).props.style);
    expect(style.paddingHorizontal).toBe(Spacing.lg);
    expect(style.paddingVertical).toBe(Spacing.md);
  });

  it('resolves the icon-to-label gap from Spacing.xs', () => {
    const r = render(<Button label="Edit" onPress={() => {}} />);
    expect(flattenStyle(findButton(r).props.style).gap).toBe(Spacing.xs);
  });
});

describe('Button 48dp hit target (unchanged by the token migration)', () => {
  it('keeps sm at 32dp minHeight with 8dp of symmetric hitSlop up to the 48dp floor', () => {
    const r = render(<Button label="Edit" onPress={() => {}} size="sm" />);
    const button = findButton(r);
    expect(flattenStyle(button.props.style).minHeight).toBe(32);
    expect(button.props.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
  });

  it('keeps md at 40dp minHeight with 4dp of symmetric hitSlop up to the 48dp floor', () => {
    const r = render(<Button label="Edit" onPress={() => {}} size="md" />);
    const button = findButton(r);
    expect(flattenStyle(button.props.style).minHeight).toBe(40);
    expect(button.props.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
  });
});

describe('Button behavior (unchanged by the token migration)', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const r = render(<Button label="Edit" onPress={onPress} />);
    act(() => { findButton(r).props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled and reduced-opacity while loading, and shows a spinner instead of the label', () => {
    const r = render(<Button label="Save" onPress={() => {}} loading />);
    const button = findButton(r);
    expect(button.props.disabled).toBe(true);
    expect(flattenStyle(button.props.style).opacity).toBe(0.55);
    expect(r.root.findAllByType(Text).some((n) => n.props.children === 'Save')).toBe(false);
  });

  it('renders the requested icon glyph, decorative to accessibility', () => {
    const r = render(<Button label="Edit" icon="pencil" onPress={() => {}} />);
    const icon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'pencil');
    expect(icon).toBeDefined();
    expect(icon?.props.importantForAccessibility).toBe('no');
  });
});
