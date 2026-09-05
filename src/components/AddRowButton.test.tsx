import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer, { act } from 'react-test-renderer';
import { AddRowButton } from './AddRowButton';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

// react-native's own TouchableOpacity module is a thin wrapper that spreads
// every prop it receives onto an inner, unexported class component of the
// same displayName, so a props-only predicate double-matches: once on the
// outer wrapper fiber, once on the inner one. Anchoring on
// `n.type === TouchableOpacity` (the same module reference this file and
// Button.tsx both resolve to) narrows a find to the outer fiber only — same
// convention as EstablishmentReportsSection.test.tsx / EstablishmentCard.test.tsx.
const findButton = (r: Renderer) => {
  const matches = r.root.findAll((n) => n.type === TouchableOpacity);
  if (matches.length === 0) {
    throw new Error('No TouchableOpacity found: expected AddRowButton to render one via Button');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 TouchableOpacity but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

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

describe('AddRowButton', () => {
  it('renders the Ionicons "add" glyph', () => {
    const r = render(<AddRowButton label="Add Row" onPress={() => {}} />);
    const icon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'add');
    expect(icon).toBeDefined();
  });

  it('renders the label verbatim, with no leading "+" glued onto the icon', () => {
    const r = render(<AddRowButton label="Add Parameter" onPress={() => {}} />);
    const text = findLabelText(r, 'Add Parameter');
    expect(String(text.props.children).startsWith('+')).toBe(false);
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const r = render(<AddRowButton label="Add Row" onPress={onPress} />);
    act(() => { findButton(r).props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders at the md size by default', () => {
    const r = render(<AddRowButton label="Add Row" onPress={() => {}} />);
    expect(flattenStyle(findButton(r).props.style).minHeight).toBe(40);
  });

  it("renders at the sm size when small is set, preserving WaterExtraFormSections' compact treatment", () => {
    const r = render(<AddRowButton label="Add Parameter" onPress={() => {}} small />);
    expect(flattenStyle(findButton(r).props.style).minHeight).toBe(32);
  });

  it('is left-aligned rather than stretching full width, matching every prior call site', () => {
    const r = render(<AddRowButton label="Add Row" onPress={() => {}} />);
    expect(flattenStyle(findButton(r).props.style).alignSelf).toBe('flex-start');
  });
});
