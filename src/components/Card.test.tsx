import React from 'react';
import TestRenderer from 'react-test-renderer';
import { View } from 'react-native';
import { Card } from './Card';
import { Colors } from '../design/colors';
import { Elevation } from '../design/elevation';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

// Flatten a StyleProp (single object or array) into a single resolved style object.
const flattenStyle = (style: any): any => {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, s) => ({ ...acc, ...(s || {}) }), {});
  }
  return style;
};

// Locate the Card view by its resolved base styles: backgroundColor === Colors.white
// AND borderRadius === Radius.lg. These properties are unique to the Card primitive.
// Throw a clear error if zero or more than one match is found.
const findCardView = (r: Renderer) => {
  const views = r.root.findAll((n) => {
    return (n.type as any)?.name === 'View' || n.type === View;
  });

  const matches = views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.backgroundColor === Colors.white && flattened.borderRadius === Radius.lg;
  });

  if (matches.length === 0) {
    throw new Error('No Card View found: expected a View with backgroundColor === Colors.white and borderRadius === Radius.lg');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 Card View but found ${matches.length}; the locator is not sufficiently specific`);
  }

  return matches[0];
};

describe('Card', () => {
  it('renders with base styles', () => {
    const r = render(<Card testID="test-card" />);
    const cardView = findCardView(r);
    const flattened = flattenStyle(cardView.props.style);

    // Assert base style tokens are resolved correctly.
    expect(flattened.backgroundColor).toBe(Colors.white);
    expect(flattened.borderRadius).toBe(Radius.lg);
    expect(flattened.borderColor).toBe(Colors.border);
    expect(flattened.borderWidth).toBe(1);

    // Assert every field of Elevation.raised is present with its exact value.
    Object.entries(Elevation.raised).forEach(([key, value]) => {
      expect(flattened[key]).toEqual(value);
    });
  });

  it('applies padding when padded=true (default)', () => {
    const r = render(<Card testID="test-card" />);
    const cardView = findCardView(r);
    const flattened = flattenStyle(cardView.props.style);

    // With padded=true (the default), assert padding === Spacing.lg.
    expect(flattened.padding).toBe(Spacing.lg);
  });

  it('does not apply padding when padded=false', () => {
    const r = render(<Card testID="test-card" padded={false} />);
    const cardView = findCardView(r);
    const flattened = flattenStyle(cardView.props.style);

    // With padded=false, the padding key should not be present.
    expect(flattened.padding).toBeUndefined();
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
    const flattened = flattenStyle(cardView.props.style);

    // Assert that the custom style prop is applied and resolves to its intended value.
    expect(flattened.opacity).toBe(0.5);
  });
});
