import React from 'react';
import { Text, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Badge, BadgeTone } from './Badge';
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

// Locate the badge pill View by its resolved styles: backgroundColor (tone-specific)
// and borderRadius === Radius.pill. Throw a clear error if zero or more than one match is found.
const findBadgeView = (r: Renderer, expectedBg: string) => {
  const views = r.root.findAll((n) => {
    return (n.type as any)?.name === 'View' || n.type === View;
  });

  const matches = views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.backgroundColor === expectedBg && flattened.borderRadius === Radius.pill;
  });

  if (matches.length === 0) {
    throw new Error(
      `No Badge View found: expected a View with backgroundColor === "${expectedBg}" and borderRadius === ${Radius.pill}`
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Expected 1 Badge View but found ${matches.length}; the locator is not sufficiently specific`
    );
  }

  return matches[0];
};

// Tone table mapping: every tone to its background and text colors from the tokens.
const TONE_TABLE: [BadgeTone, string, string][] = [
  ['neutral', Colors.bgLight, Colors.textSecondary],
  ['success', Colors.greenMuted, Colors.green],
  ['warning', Colors.warning.badgeBg, Colors.warning.text],
  ['danger', Colors.conflictMuted, Colors.conflict],
  ['info', Colors.air.badgeBg, Colors.air.badgeText],
];

describe('Badge', () => {
  it('renders its label', () => {
    const r = render(<Badge label="Draft" />);
    expect(r.root.findByType(Text).props.children).toBe('Draft');
  });

  it.each(TONE_TABLE)('applies %s tone: background, text color, pill radius, and padding', (tone, expectedBg, expectedText) => {
    const r = render(<Badge label="Test" tone={tone} />);

    // Find the badge pill View using the expected background and pill radius.
    const badgeView = findBadgeView(r, expectedBg);
    const badgeViewStyle = flattenStyle(badgeView.props.style);

    // Find the Text node within the Badge.
    const textNode = r.root.findByType(Text);
    const textStyle = flattenStyle(textNode.props.style);

    // Assert the pill View's background color matches the tone's bg.
    expect(badgeViewStyle.backgroundColor).toBe(expectedBg);

    // Assert the pill View's border radius is the pill constant.
    expect(badgeViewStyle.borderRadius).toBe(Radius.pill);

    // Assert the pill View's padding matches the tokens used by the implementation.
    expect(badgeViewStyle.paddingHorizontal).toBe(Spacing.sm);
    expect(badgeViewStyle.paddingVertical).toBe(Spacing.xxs);

    // Assert the label's text color matches the tone's text color.
    expect(textStyle.color).toBe(expectedText);

    // Assert the label's typography matches Type.caption.
    expect(textStyle.fontSize).toBe(Type.caption.fontSize);
    expect(textStyle.lineHeight).toBe(Type.caption.lineHeight);
  });
});
