import React from 'react';
import { Text, TextInput } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ChecklistTable, ChecklistItemDef, ChecklistValue } from './ChecklistTable';
import { Colors } from '../../design/colors';
import { Type } from '../../design/typography';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

const items: ChecklistItemDef[] = [
  { ref: '1.1', requirement: 'Maintains a valid Discharge Permit at all times.' },
  { ref: '1.2', requirement: 'Submits self-monitoring reports on schedule.' },
];

const values: ChecklistValue[] = [
  { compliant: 'Y', remarks: '' },
  { compliant: null, remarks: '' },
];

const noop = () => {};

// The requirement Text is uniquely identified among this component's own
// Text nodes by its color: only the requirement line resolves to
// Colors.navy (the ref label resolves to Colors.textLight, the toggle
// labels to Colors.textMuted or one of the Y/N/NA status colors).
const findRequirementTexts = (r: Renderer) =>
  r.root.findAll((n) => n.type === Text && flattenStyle(n.props.style).color === Colors.navy);

describe('ChecklistTable token resolution', () => {
  it("resolves every requirement line's fontSize/lineHeight to Type.body (14/20), not the old 12.5", () => {
    const r = render(<ChecklistTable items={items} values={values} onChange={noop} />);
    const requirementTexts = findRequirementTexts(r);
    expect(requirementTexts).toHaveLength(items.length);
    requirementTexts.forEach((n) => {
      const style = flattenStyle(n.props.style);
      expect(style.fontSize).toBe(Type.body.fontSize);
      expect(style.lineHeight).toBe(Type.body.lineHeight);
    });
  });
});

describe('ChecklistTable legibility guarantee', () => {
  // This is the highest-volume reading task in the app. Every resolved
  // fontSize below - the ref label, the requirement line, the remarks
  // TextInput, and the Y/N/NA toggle labels rendered inside it - must sit
  // at or above the type scale's floor, Type.caption (11).
  it('renders nothing below Type.caption.fontSize across the ref, requirement, remarks input, and toggle', () => {
    const r = render(<ChecklistTable items={items} values={values} onChange={noop} />);

    const textSizes = r.root
      .findAllByType(Text)
      .map((n) => flattenStyle(n.props.style).fontSize)
      .filter((size): size is number => typeof size === 'number');

    const inputSizes = r.root
      .findAllByType(TextInput)
      .map((n) => flattenStyle(n.props.style).fontSize)
      .filter((size): size is number => typeof size === 'number');

    const sizes = [...textSizes, ...inputSizes];
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});
