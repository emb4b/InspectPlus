import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer, { act } from 'react-test-renderer';
import { UrgencyBadge, URGENCY_BADGE_RESERVED_TOP } from './UrgencyBadge';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';
import type { ReportUrgency } from '../utils/reportUrgency';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// @expo/vector-icons renders its glyph through a Text, so the label lookup has
// to exclude the icon's own internal Text — same technique the card tests use.
const labelText = (r: Renderer) => {
  const glyphs = new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));
  const matches = r.root.findAllByType(Text).filter((n) => !glyphs.has(n));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly 1 label Text but found ${matches.length}`);
  }
  return matches[0];
};

const findPill = (r: Renderer) => {
  const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
  const matches = views.filter((n) => flattenStyle(n.props.style).borderRadius === Radius.pill);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly 1 pill View but found ${matches.length}`);
  }
  return matches[0];
};

describe('UrgencyBadge', () => {
  it('renders nothing when the report is not flagged', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'none', days: 0 }} />);
    expect(r.toJSON()).toBeNull();
  });

  it('names the days elapsed past the deadline for an overdue report', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 5 }} />);
    expect(labelText(r).props.children).toBe('Overdue by 5 days');
  });

  it('says just "Overdue" on the deadline day itself rather than "by 0 days"', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 0 }} />);
    expect(labelText(r).props.children).toBe('Overdue');
  });

  it('uses the singular day for a report one day past the deadline', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 1 }} />);
    expect(labelText(r).props.children).toBe('Overdue by 1 day');
  });

  it('names the days of runway left for a due-soon report', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'due-soon', days: 3 }} />);
    expect(labelText(r).props.children).toBe('Due in 3 days');
  });

  it('uses the singular day for a report with one day of runway left', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'due-soon', days: 1 }} />);
    expect(labelText(r).props.children).toBe('Due in 1 day');
  });

  it('resolves an overdue badge from the hazwaste palette', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 5 }} />);
    expect(flattenStyle(findPill(r).props.style).backgroundColor).toBe(Colors.hazwaste.badgeBg);
    expect(flattenStyle(labelText(r).props.style).color).toBe(Colors.hazwaste.badgeText);
  });

  it('resolves a due-soon badge from the warning palette', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'due-soon', days: 3 }} />);
    expect(flattenStyle(findPill(r).props.style).backgroundColor).toBe(Colors.warning.badgeBg);
    expect(flattenStyle(labelText(r).props.style).color).toBe(Colors.warning.text);
  });

  it('pins itself to its parent card\'s top-right corner, above the card content', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 5 }} />);
    const style = flattenStyle(findPill(r).props.style);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(Spacing.xs);
    expect(style.right).toBe(Spacing.md);
    // Overlays the card surface rather than being painted under it.
    expect(style.zIndex as number).toBeGreaterThan(0);
  });

  it('reserves enough top padding for consumers to clear the pill', () => {
    // The pill's own height, from the tokens it is built out of.
    const pillHeight = Type.caption.lineHeight + 2 * Spacing.xxs;
    expect(URGENCY_BADGE_RESERVED_TOP).toBeGreaterThanOrEqual(Spacing.xs + pillHeight);
  });

  it('describes itself to screen readers with the same wording as the label', () => {
    const urgency: ReportUrgency = { level: 'overdue', days: 5 };
    const r = render(<UrgencyBadge urgency={urgency} />);
    expect(findPill(r).props.accessibilityLabel).toBe('Overdue by 5 days');
  });
});
