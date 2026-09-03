import React from 'react';
import { TextInput } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { TextField } from './TextField';

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
