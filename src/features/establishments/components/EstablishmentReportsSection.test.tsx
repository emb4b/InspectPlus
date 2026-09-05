import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { EstablishmentReportsSection } from './EstablishmentReportsSection';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { Type } from '../../../design/typography';
import type { EstablishmentReportItem } from '../hooks/useEstablishment';

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// Locate the report-icon wrap View by its resolved shape (width 38 / height
// 38 / borderRadius Radius.md — unique to this element in the row). Throws
// if zero or more than one match is found, per the ReportListCard/
// EstablishmentCard locator convention.
const findIconWrap = (r: Renderer) => {
  const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
  const matches = views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.width === 38 && flattened.height === 38 && flattened.borderRadius === Radius.md;
  });
  if (matches.length === 0) {
    throw new Error('No icon wrap View found: expected a View with width===38, height===38, borderRadius===Radius.md');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 icon wrap View but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

// react-native's own TouchableOpacity module is a thin wrapper that spreads
// every prop it receives onto an inner, unexported class component of the
// same displayName, so a props-only predicate double-matches: once on the
// outer wrapper fiber, once on the inner one. Anchoring on
// `n.type === TouchableOpacity` (the same module reference this file and
// EstablishmentReportsSection.tsx both resolve to, and that Button.tsx also
// resolves to for the Add Report control) narrows a find/findAll to the
// outer fiber only — same convention as ReportListCard.test.tsx /
// EstablishmentCard.test.tsx.
const findRow = (r: Renderer, item: EstablishmentReportItem) =>
  r.root.find((n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === item.title);

const findDeleteButtons = (r: Renderer, item: EstablishmentReportItem) =>
  r.root.findAll(
    (n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === `Delete ${item.title}`,
  );

const findAddReportButton = (r: Renderer) =>
  r.root.find((n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === 'Add Report');

// Each row owns exactly one GestureDetector for its swipe-to-reveal pan
// gesture. Gesture.Pan().enabled(x) stores the flag on the gesture's own
// `config` object (handlers/gestures/gesture.js), so reading it here
// inspects the actual recognizer state the native side would honor — same
// technique as ReportListCard.test.tsx. Every test that calls this renders
// exactly one report, so there is exactly one GestureDetector to find.
const isPanGestureEnabled = (r: Renderer): boolean =>
  (r.root.findByType(GestureDetector).props as { gesture: { config: { enabled: boolean } } }).gesture
    .config.enabled;

// @expo/vector-icons renders its glyph as a Text under the hood, with the
// icon's `size` prop applied as that Text's fontSize — that's an icon size,
// not prose, so it must be excluded before checking the type scale's floor.
// Same technique as EstablishmentCard.test.tsx.
const iconGlyphTexts = (r: Renderer): Set<TestRenderer.ReactTestInstance> =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

const proseTexts = (r: Renderer) => {
  const glyphs = iconGlyphTexts(r);
  return r.root.findAllByType(Text).filter((n) => !glyphs.has(n));
};

const allFontSizes = (r: Renderer): number[] =>
  proseTexts(r)
    .map((n) => flattenStyle(n.props.style).fontSize)
    .filter((size): size is number => typeof size === 'number');

const noop = () => {};

const baseItem: EstablishmentReportItem = {
  key: 'inspection-1',
  kind: 'inspection',
  reportId: 'r1',
  inspectorUid: 'uid-1',
  reportType: 'water_monitoring',
  title: 'Water Monitoring Report',
  date: new Date().toISOString(),
  controlNo: 'CTRL-1',
  status: 'submitted',
  syncStatus: 'synced',
};

describe('EstablishmentReportsSection report row token resolution', () => {
  it('resolves the icon wrap background and radius from tokens', () => {
    const r = render(
      <EstablishmentReportsSection
        reports={[baseItem]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const style = flattenStyle(findIconWrap(r).props.style);
    expect(style.backgroundColor).toBe(Colors.water.bg);
    expect(style.borderRadius).toBe(Radius.md);
  });

  it.each([
    ['air_monitoring', 'partly-sunny-outline'],
    ['water_monitoring', 'water-outline'],
    ['hazardous_waste', 'warning-outline'],
    ['eia', 'globe-outline'],
    ['survey', 'leaf-outline'],
  ] as const)('resolves the %s report icon glyph, always in the water text color', (reportType, glyph) => {
    const item: EstablishmentReportItem = { ...baseItem, reportType };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const icon = r.root.findAllByType(Ionicons).find((n) => n.props.size === 17);
    expect(icon?.props.name).toBe(glyph);
    // Unlike ReportListCard, this row intentionally uses one fixed treatment
    // for every report type — restyling this section must not change that.
    expect(icon?.props.color).toBe(Colors.water.text);
  });

  it('falls back to a neutral document icon for an unrecognized report type', () => {
    const item: EstablishmentReportItem = { ...baseItem, reportType: 'some_future_type' };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const icon = r.root.findAllByType(Ionicons).find((n) => n.props.size === 17);
    expect(icon?.props.name).toBe('document-outline');
  });

  it('resolves the title and date text sizes from the type scale', () => {
    const r = render(
      <EstablishmentReportsSection
        reports={[baseItem]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    // Title is the only prose text colored Colors.textPrimary in the row —
    // same locator technique as EstablishmentCard.test.tsx's "name" text,
    // which sidesteps AppText/MarqueeText's internal Text structure.
    const titleText = proseTexts(r).find((n) => flattenStyle(n.props.style).color === Colors.textPrimary);
    const dateStyle = flattenStyle(
      proseTexts(r).find((n) => flattenStyle(n.props.style).color === Colors.textMuted)?.props.style,
    );
    expect(flattenStyle(titleText?.props.style).fontSize).toBe(Type.body.fontSize);
    expect(flattenStyle(titleText?.props.style).lineHeight).toBe(Type.body.lineHeight);
    expect(dateStyle.fontSize).toBe(Type.label.fontSize);
    expect(dateStyle.lineHeight).toBe(Type.label.lineHeight);
  });

  it('resolves the control number style from Type.caption with OS font scaling disabled', () => {
    const r = render(
      <EstablishmentReportsSection
        reports={[baseItem]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const controlNoText = r.root.findAllByType(Text).find((n) => n.props.children === baseItem.controlNo);
    expect(flattenStyle(controlNoText?.props.style).fontSize).toBe(Type.caption.fontSize);
    expect(controlNoText?.props.allowFontScaling).toBe(false);
  });

  it("falls back to 'No control number yet' when controlNo is null", () => {
    const item: EstablishmentReportItem = { ...baseItem, controlNo: null };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(r.root.findAllByType(Text).some((n) => n.props.children === 'No control number yet')).toBe(true);
  });
});

describe('EstablishmentReportsSection urgency badge token resolution', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  it('resolves the overdue badge from the hazwaste palette, not the warning one', () => {
    const item: EstablishmentReportItem = { ...baseItem, status: 'draft', date: daysAgo(31) };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const badge = r.root
      .findAll((n) => (n.type as any)?.name === 'View' || n.type === View)
      .find((n) => flattenStyle(n.props.style).backgroundColor === Colors.hazwaste.badgeBg);
    expect(badge).toBeDefined();
    const label = proseTexts(r).find((n) => n.props.children === 'Overdue');
    expect(flattenStyle(label?.props.style).color).toBe(Colors.hazwaste.badgeText);

    const rowStyle = flattenStyle(findRow(r, item).props.style);
    expect(rowStyle.borderColor).toBe(Colors.hazwaste.border);
    expect(rowStyle.backgroundColor).toBe(Colors.hazwaste.bg);
  });

  it('resolves the due-soon badge from the warning palette, not the hazwaste one', () => {
    const item: EstablishmentReportItem = { ...baseItem, status: 'draft', date: daysAgo(15) };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const badge = r.root
      .findAll((n) => (n.type as any)?.name === 'View' || n.type === View)
      .find((n) => flattenStyle(n.props.style).backgroundColor === Colors.warning.badgeBg);
    expect(badge).toBeDefined();
    const label = proseTexts(r).find((n) => n.props.children === 'Due soon');
    expect(flattenStyle(label?.props.style).color).toBe(Colors.warning.text);

    const rowStyle = flattenStyle(findRow(r, item).props.style);
    expect(rowStyle.borderColor).toBe(Colors.warning.border);
    expect(rowStyle.backgroundColor).toBe(Colors.warning.bg);
  });

  it('shows no urgency badge for a submitted report regardless of age', () => {
    const item: EstablishmentReportItem = { ...baseItem, status: 'submitted', date: daysAgo(90) };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(proseTexts(r).some((n) => n.props.children === 'Overdue' || n.props.children === 'Due soon')).toBe(false);
  });
});

describe('EstablishmentReportsSection delete visibility and swipe gesture (unchanged by this task)', () => {
  it('shows Delete and enables the swipe gesture for an inspection report the viewer owns', () => {
    const item: EstablishmentReportItem = { ...baseItem, kind: 'inspection', inspectorUid: 'uid-1' };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(findDeleteButtons(r, item)).toHaveLength(1);
    expect(isPanGestureEnabled(r)).toBe(true);
  });

  it('shows Delete for a report the viewer does not own when canManageAll is true (Developer account)', () => {
    const item: EstablishmentReportItem = { ...baseItem, kind: 'inspection', inspectorUid: 'someone-else' };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(findDeleteButtons(r, item)).toHaveLength(1);
    expect(isPanGestureEnabled(r)).toBe(true);
  });

  it('hides Delete and disables the swipe gesture for an inspection report the viewer does not own', () => {
    const item: EstablishmentReportItem = { ...baseItem, kind: 'inspection', inspectorUid: 'someone-else' };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(findDeleteButtons(r, item)).toHaveLength(0);
    expect(isPanGestureEnabled(r)).toBe(false);
  });

  it('never shows Delete for a survey report, even when owned and manageable', () => {
    const item: EstablishmentReportItem = { ...baseItem, kind: 'survey', inspectorUid: 'uid-1' };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(findDeleteButtons(r, item)).toHaveLength(0);
    expect(isPanGestureEnabled(r)).toBe(false);
  });
});

describe('EstablishmentReportsSection press wiring (unchanged by this task)', () => {
  it('opens the report on press', () => {
    const onOpenReport = jest.fn();
    const r = render(
      <EstablishmentReportsSection
        reports={[baseItem]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={onOpenReport}
        onDeleteReport={noop}
      />,
    );
    TestRenderer.act(() => {
      findRow(r, baseItem).props.onPress();
    });
    expect(onOpenReport).toHaveBeenCalledWith(baseItem);
  });

  it('deletes the report when the delete action is pressed', () => {
    const onDeleteReport = jest.fn();
    const item: EstablishmentReportItem = { ...baseItem, kind: 'inspection', inspectorUid: 'uid-1' };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={onDeleteReport}
      />,
    );
    const [deleteBtn] = findDeleteButtons(r, item);
    TestRenderer.act(() => {
      deleteBtn.props.onPress();
    });
    expect(onDeleteReport).toHaveBeenCalledWith(item);
  });

  it('calls onAddReport when the header Add Report button is pressed', () => {
    const onAddReport = jest.fn();
    const r = render(
      <EstablishmentReportsSection
        reports={[baseItem]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={onAddReport}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    TestRenderer.act(() => {
      findAddReportButton(r).props.onPress();
    });
    expect(onAddReport).toHaveBeenCalledTimes(1);
  });
});

describe('EstablishmentReportsSection loading and empty states (unchanged by this task)', () => {
  it('shows a spinner and no rows while loading', () => {
    const r = render(
      <EstablishmentReportsSection
        reports={[]}
        loading
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(r.root.findAllByProps({ size: 'small' }).length).toBeGreaterThan(0);
    expect(r.root.findAllByType(GestureDetector)).toHaveLength(0);
  });

  it('shows the empty-state message when there are no reports and not loading', () => {
    const r = render(
      <EstablishmentReportsSection
        reports={[]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    expect(
      r.root.findAllByType(Text).some((n) => n.props.children === 'No reports filed yet for this establishment.'),
    ).toBe(true);
    expect(r.root.findAllByType(GestureDetector)).toHaveLength(0);
  });
});

describe('EstablishmentReportsSection legibility guarantee', () => {
  // The legibility guarantee this task exists to enforce: no text node's
  // resolved fontSize ever falls below the type scale's floor, Type.caption
  // (11), in any branch — loading, empty, a plain report, an overdue report
  // with the delete action visible, or a due-soon report without it.
  it('renders nothing below Type.caption.fontSize while loading', () => {
    const r = render(
      <EstablishmentReportsSection
        reports={[]}
        loading
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize in the empty state', () => {
    const r = render(
      <EstablishmentReportsSection
        reports={[]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize for an overdue, owned, deletable inspection report', () => {
    const item: EstablishmentReportItem = {
      ...baseItem,
      kind: 'inspection',
      inspectorUid: 'uid-1',
      status: 'draft',
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });

  it('renders nothing below Type.caption.fontSize for a due-soon survey report with no delete action', () => {
    const item: EstablishmentReportItem = {
      ...baseItem,
      kind: 'survey',
      status: 'draft',
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      controlNo: null,
    };
    const r = render(
      <EstablishmentReportsSection
        reports={[item]}
        currentUid="uid-1"
        canManageAll={false}
        onAddReport={noop}
        onOpenReport={noop}
        onDeleteReport={noop}
      />,
    );
    const sizes = allFontSizes(r);
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size) => expect(size).toBeGreaterThanOrEqual(Type.caption.fontSize));
  });
});
