import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer, { act } from 'react-test-renderer';
import { DueCountBadge } from './DueCountBadge';
import { Colors } from '../design/colors';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

const glyphTexts = (r: Renderer) =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

const countText = (r: Renderer) => {
  const glyphs = glyphTexts(r);
  const matches = r.root.findAllByType(Text).filter((n) => !glyphs.has(n));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly 1 count Text but found ${matches.length}`);
  }
  return matches[0];
};

const pill = (r: Renderer) =>
  r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View)[0];

describe('DueCountBadge', () => {
  it('renders nothing when the establishment has nothing flagged', () => {
    expect(render(<DueCountBadge summary={null} />).toJSON()).toBeNull();
  });

  it('shows the count', () => {
    expect(countText(render(<DueCountBadge summary={{ level: 'overdue', count: 3 }} />)).props.children).toBe('3');
  });

  // Colour is the severity channel, the number is the volume channel — an
  // establishment with one overdue among five flagged reads red 5, not red 1.
  it('takes the saturated overdue hue when anything has lapsed', () => {
    const r = render(<DueCountBadge summary={{ level: 'overdue', count: 5 }} />);
    expect(flattenStyle(pill(r).props.style).backgroundColor).toBe(Colors.hazwaste.text);
    expect(flattenStyle(countText(r).props.style).color).toBe(Colors.textWhite);
  });

  it('takes the saturated due-soon hue when nothing has lapsed yet', () => {
    const r = render(<DueCountBadge summary={{ level: 'due-soon', count: 5 }} />);
    expect(flattenStyle(pill(r).props.style).backgroundColor).toBe(Colors.warning.text);
  });

  it('carries an alert glyph beside the count', () => {
    const r = render(<DueCountBadge summary={{ level: 'overdue', count: 2 }} />);
    const icons = r.root.findAllByType(Ionicons);
    expect(icons).toHaveLength(1);
    expect(icons[0].props.name).toBe('alert-circle');
  });

  // The count alone is meaningless to a screen reader — it has to say what is
  // being counted, and in which state.
  it('spells out what the number means for screen readers', () => {
    expect(pill(render(<DueCountBadge summary={{ level: 'overdue', count: 1 }} />)).props.accessibilityLabel).toBe(
      '1 report overdue',
    );
    expect(pill(render(<DueCountBadge summary={{ level: 'overdue', count: 4 }} />)).props.accessibilityLabel).toBe(
      '4 reports overdue',
    );
    expect(pill(render(<DueCountBadge summary={{ level: 'due-soon', count: 1 }} />)).props.accessibilityLabel).toBe(
      '1 report due soon',
    );
    expect(pill(render(<DueCountBadge summary={{ level: 'due-soon', count: 6 }} />)).props.accessibilityLabel).toBe(
      '6 reports due soon',
    );
  });

  it('accepts a style override so a host can pin it to an icon corner', () => {
    const r = render(
      <DueCountBadge summary={{ level: 'overdue', count: 2 }} style={{ position: 'absolute', top: -6 }} />,
    );
    const style = flattenStyle(pill(r).props.style);
    expect(style.position).toBe('absolute');
    expect(style.top).toBe(-6);
  });
});
