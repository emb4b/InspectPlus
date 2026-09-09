import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer, { act } from 'react-test-renderer';
import { UrgencyBadge } from './UrgencyBadge';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import type { ReportUrgency } from '../utils/reportUrgency';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

const labelText = (r: Renderer) => {
  const matches = r.root.findAllByType(Text);
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

  it('counts the days elapsed past the deadline, compactly', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 5 }} />);
    expect(labelText(r).props.children).toBe('5d overdue');
  });

  it('says just "Overdue" on the deadline day itself rather than "0d overdue"', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 0 }} />);
    expect(labelText(r).props.children).toBe('Overdue');
  });

  it('counts the days of runway left, compactly', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'due-soon', days: 3 }} />);
    expect(labelText(r).props.children).toBe('Due in 3d');
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

  // It used to be an absolutely positioned corner chip, which forced every
  // flagged card to reserve a band of extra top padding for it — a whole
  // wasted row of height. It now sits in the card's existing badge slot.
  it('lays out in normal flow so it costs a card no extra height', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 5 }} />);
    const style = flattenStyle(findPill(r).props.style);
    expect(style.position).toBeUndefined();
    expect(style.top).toBeUndefined();
    expect(style.right).toBeUndefined();
    expect(style.zIndex).toBeUndefined();
  });

  // The colour already carries severity, and the badge now shares a row with
  // a scrolling title — an icon would cost width that the title needs.
  it('renders no icon', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 5 }} />);
    expect(r.root.findAllByType(Ionicons)).toHaveLength(0);
  });

  it('spells the label out in full for screen readers, not the compact form', () => {
    const urgency: ReportUrgency = { level: 'overdue', days: 5 };
    const r = render(<UrgencyBadge urgency={urgency} />);
    expect(findPill(r).props.accessibilityLabel).toBe('Overdue by 5 days');
  });

  it('uses the singular day in the spoken label one day past the deadline', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'overdue', days: 1 }} />);
    expect(findPill(r).props.accessibilityLabel).toBe('Overdue by 1 day');
    expect(labelText(r).props.children).toBe('1d overdue');
  });

  it('spells the due-soon label out in full for screen readers', () => {
    const r = render(<UrgencyBadge urgency={{ level: 'due-soon', days: 1 }} />);
    expect(findPill(r).props.accessibilityLabel).toBe('Due in 1 day');
    expect(labelText(r).props.children).toBe('Due in 1d');
  });
});
