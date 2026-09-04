import React from 'react';
import TestRenderer from 'react-test-renderer';
import { View } from 'react-native';
import { Card } from './Card';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

// In jest-expo, View is rendered but may not be easily findable by type.
// Find the card by looking for a View with backgroundColor set.
const findCardView = (r: Renderer) => {
  const views = r.root.findAll((n) => {
    return (n.type as any)?.name === 'View' || n.type === View;
  });

  const cardView = views.find((n) => {
    const style = n.props.style;
    if (!style) return false;
    // Look for the base card styles (backgroundColor, borderWidth, etc.)
    if (Array.isArray(style)) {
      return style.some((s) => s && typeof s === 'object' && 'backgroundColor' in s);
    }
    return style && typeof style === 'object' && 'backgroundColor' in style;
  });

  if (!cardView) throw new Error('No Card View found');
  return cardView;
};

describe('Card', () => {
  it('renders with base styles', () => {
    const r = render(<Card testID="test-card" />);
    const cardView = findCardView(r);
    expect(cardView).toBeDefined();
  });

  it('applies padding when padded=true (default)', () => {
    const r = render(<Card testID="test-card" />);
    const cardView = findCardView(r);
    const style = Array.isArray(cardView.props.style) ? cardView.props.style : [cardView.props.style];
    const hasLgPadding = style.some((s) => s && s.padding !== undefined);
    expect(hasLgPadding).toBe(true);
  });

  it('does not apply padding when padded=false', () => {
    const r = render(<Card testID="test-card" padded={false} />);
    const cardView = findCardView(r);
    const style = Array.isArray(cardView.props.style) ? cardView.props.style : [cardView.props.style];
    // When padded=false, the padding style should not be present (or should be undefined)
    const hasPadding = style.some((s) => s && s.padding !== undefined);
    expect(hasPadding).toBe(false);
  });

  it('renders children', () => {
    const r = render(
      <Card>
        <View testID="child-view" />
      </Card>,
    );
    const child = r.root.findByProps({ testID: 'child-view' });
    expect(child).toBeDefined();
  });

  it('forwards style prop', () => {
    const customStyle = { opacity: 0.5 };
    const r = render(<Card style={customStyle} />);
    const cardView = findCardView(r);
    const style = Array.isArray(cardView.props.style) ? cardView.props.style : [cardView.props.style];
    const hasOpacity = style.some((s) => s && s.opacity === 0.5);
    expect(hasOpacity).toBe(true);
  });
});
