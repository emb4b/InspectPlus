import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Badge } from './Badge';
import { Colors } from '../design/colors';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

describe('Badge', () => {
  it('renders its label', () => {
    const r = render(<Badge label="Draft" />);
    expect(r.root.findByType(Text).props.children).toBe('Draft');
  });

  it('colors the label from the requested tone', () => {
    const r = render(<Badge label="Pending sync" tone="warning" />);
    expect(flatten(r.root.findByType(Text).props.style).color).toBe(Colors.warning.text);
  });

  it('defaults to the neutral tone', () => {
    const r = render(<Badge label="+2" />);
    expect(flatten(r.root.findByType(Text).props.style).color).toBe(Colors.textSecondary);
  });
});
