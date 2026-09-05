import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { DynamicRowTable, DynamicColumn, DynamicRow } from './DynamicRowTable';
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

const columns: DynamicColumn[] = [
  { key: 'param', label: 'Parameter', width: 120 },
  { key: 'unit', label: 'Unit', width: 80, type: 'select', options: ['mg/L', 'ppm'] },
];

const rows: DynamicRow[] = [{ param: 'BOD', unit: 'mg/L' }];

const noop = () => {};

// Header cell labels are the only Text nodes in this component that
// uppercase their content - unique among the tree's own Text elements.
const findHeaderCells = (r: Renderer) =>
  r.root.findAll((n) => n.type === Text && flattenStyle(n.props.style).textTransform === 'uppercase');

// The one typed (non-select) column renders exactly one TextInput by
// default; findAllByType would double-match react-native's own internal
// wrapper the way TouchableOpacity does, but TextInput's host component
// does not have that problem in this RN version, matching the direct-type
// convention used for Text/View elsewhere in the suite.
const findCellInput = (r: Renderer) => {
  const matches = r.root.findAllByType(TextInput);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly 1 TextInput but found ${matches.length}`);
  }
  return matches[0];
};

// The select cell's TouchableOpacity is the only one in the default render
// with justifyContent 'space-between' (the remove button centers its icon;
// the modal overlay/backdrop touchables use flex: 1).
const findSelectCellTouchable = (r: Renderer) =>
  r.root.find((n) => n.type === TouchableOpacity && flattenStyle(n.props.style).justifyContent === 'space-between');

// AppText renders the select cell's current value as a Text styled with
// selectCellText - the only Text node in the default render colored
// Colors.textPrimary (the header cells resolve to Colors.textMuted, the
// remove icon isn't a styled Text at all).
const findSelectCellText = (r: Renderer) =>
  r.root.find((n) => n.type === Text && flattenStyle(n.props.style).color === Colors.textPrimary);

const iconGlyphTexts = (r: Renderer): Set<TestRenderer.ReactTestInstance> =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

const allFontSizes = (r: Renderer): number[] => {
  const glyphs = iconGlyphTexts(r);
  const textSizes = r.root
    .findAllByType(Text)
    .filter((n) => !glyphs.has(n))
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');
  const inputSizes = r.root
    .findAllByType(TextInput)
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');
  return [...textSizes, ...inputSizes];
};

describe('DynamicRowTable grid uses Type.tabular, never Type.body', () => {
  // The guard this task exists to add: a later refactor that "helpfully"
  // promotes this grid to body-sized text would clip every fixed-width
  // column. Every assertion below is written against the Type.tabular
  // symbol AND explicitly checks it is not the Type.body value, so that
  // refactor fails loudly here instead of shipping.
  it("resolves every header cell's fontSize/lineHeight to Type.tabular (12/16), not Type.body (14/20)", () => {
    const r = render(<DynamicRowTable columns={columns} rows={rows} onChange={noop} />);
    const headerCells = findHeaderCells(r);
    expect(headerCells).toHaveLength(columns.length);
    headerCells.forEach((n) => {
      const style = flattenStyle(n.props.style);
      expect(style.fontSize).toBe(Type.tabular.fontSize);
      expect(style.lineHeight).toBe(Type.tabular.lineHeight);
      expect(style.fontSize).not.toBe(Type.body.fontSize);
    });
  });

  it("resolves the typed cell's fontSize/lineHeight to Type.tabular, not Type.body", () => {
    const r = render(<DynamicRowTable columns={columns} rows={rows} onChange={noop} />);
    const style = flattenStyle(findCellInput(r).props.style);
    expect(style.fontSize).toBe(Type.tabular.fontSize);
    expect(style.lineHeight).toBe(Type.tabular.lineHeight);
    expect(style.fontSize).not.toBe(Type.body.fontSize);
  });

  it("resolves the select cell's displayed value fontSize/lineHeight to Type.tabular, not Type.body", () => {
    const r = render(<DynamicRowTable columns={columns} rows={rows} onChange={noop} />);
    const style = flattenStyle(findSelectCellText(r)?.props.style);
    expect(style.fontSize).toBe(Type.tabular.fontSize);
    expect(style.lineHeight).toBe(Type.tabular.lineHeight);
    expect(style.fontSize).not.toBe(Type.body.fontSize);
  });
});

describe('DynamicRowTable legibility guarantee', () => {
  it('renders nothing below Type.caption.fontSize in the default grid', () => {
    const r = render(<DynamicRowTable columns={columns} rows={rows} onChange={noop} />);
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize with the option picker sheet open', () => {
    const r = render(<DynamicRowTable columns={columns} rows={rows} onChange={noop} />);
    TestRenderer.act(() => {
      findSelectCellTouchable(r)?.props.onPress();
    });
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});

describe('DynamicRowTable behavior (unchanged by this task)', () => {
  it('preserves the totalWidth = sum(column widths) + 40 computation', () => {
    const r = render(<DynamicRowTable columns={columns} rows={rows} onChange={noop} />);
    const minWidthView = r.root.find((n) => flattenStyle(n.props.style).minWidth !== undefined);
    expect(flattenStyle(minWidthView.props.style).minWidth).toBe(120 + 80 + 40);
  });

  it('walks "next" from the typed cell to the next focusable cell rather than dismissing mid-row', () => {
    const twoTextColumns: DynamicColumn[] = [
      { key: 'a', label: 'A', width: 80 },
      { key: 'b', label: 'B', width: 80 },
    ];
    const twoRows: DynamicRow[] = [{ a: '1', b: '2' }];
    const r = render(<DynamicRowTable columns={twoTextColumns} rows={twoRows} onChange={noop} />);
    const inputs = r.root.findAllByType(TextInput);
    expect(inputs[0].props.returnKeyType).toBe('next');
    expect(inputs[0].props.blurOnSubmit).toBe(false);
    expect(inputs[1].props.returnKeyType).toBe('done');
    expect(inputs[1].props.blurOnSubmit).toBe(true);
  });

  it('does not allow removing the last remaining row', () => {
    const onChange = jest.fn();
    const r = render(<DynamicRowTable columns={columns} rows={rows} onChange={onChange} />);
    const removeBtn = r.root.find(
      (n) => n.type === TouchableOpacity && flattenStyle(n.props.style).width === 40 && flattenStyle(n.props.style).alignItems === 'center',
    );
    expect(removeBtn.props.disabled).toBe(true);
    TestRenderer.act(() => {
      removeBtn.props.onPress();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
