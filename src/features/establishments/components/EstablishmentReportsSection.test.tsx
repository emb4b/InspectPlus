import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { EstablishmentReportsSection } from './EstablishmentReportsSection';
import { REPORT_TYPE_DISPLAY, ReportDataKey } from '../../../constants/reportTypeDisplay';
import { Colors } from '../../../design/colors';
import { Radius } from '../../../design/radius';
import { FONT_SCALING, Type } from '../../../design/typography';
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

  const ALL_DATA_KEYS: ReportDataKey[] = [
    'air_monitoring',
    'water_monitoring',
    'hazardous_waste',
    'eia',
    'survey',
  ];

  it.each(ALL_DATA_KEYS)(
    'resolves %s icon and background/color from REPORT_TYPE_DISPLAY, not a hardcoded water treatment',
    (reportType) => {
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
      const expected = REPORT_TYPE_DISPLAY[reportType];

      const wrapStyle = flattenStyle(findIconWrap(r).props.style);
      expect(wrapStyle.backgroundColor).toBe(expected.bgColor);

      const icon = r.root.findAllByType(Ionicons).find((n) => n.props.size === 17);
      expect(icon?.props.name).toBe(expected.icon);
      expect(icon?.props.color).toBe(expected.textColor);
    },
  );

  // The bug this task fixes: every row previously rendered with a
  // hardcoded backgroundColor: Colors.water.bg / color: Colors.water.text
  // regardless of the report's actual type. Assert an air report resolves
  // to the air palette specifically, not water's.
  it('an air_monitoring report does not render with the water palette', () => {
    const item: EstablishmentReportItem = { ...baseItem, reportType: 'air_monitoring' };
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

    const wrapStyle = flattenStyle(findIconWrap(r).props.style);
    expect(wrapStyle.backgroundColor).not.toBe(Colors.water.bg);
    expect(wrapStyle.backgroundColor).toBe(Colors.air.bg);

    const icon = r.root.findAllByType(Ionicons).find((n) => n.props.size === 17);
    expect(icon?.props.color).not.toBe(Colors.water.text);
    expect(icon?.props.color).toBe(Colors.air.text);
  });

  // Regression coverage for the specific swapped-icon bug: eia and survey
  // must each resolve their OWN icon, not each other's — matches
  // ReportListCard's equivalent coverage.
  it('eia and survey resolve distinct, non-swapped icons', () => {
    const eiaItem: EstablishmentReportItem = { ...baseItem, reportType: 'eia' };
    const surveyItem: EstablishmentReportItem = { ...baseItem, reportType: 'survey' };

    const eiaR = render(
      <EstablishmentReportsSection reports={[eiaItem]} currentUid="uid-1" canManageAll={false} onAddReport={noop} onOpenReport={noop} onDeleteReport={noop} />,
    );
    const surveyR = render(
      <EstablishmentReportsSection reports={[surveyItem]} currentUid="uid-1" canManageAll={false} onAddReport={noop} onOpenReport={noop} onDeleteReport={noop} />,
    );

    const eiaIcon = eiaR.root.findAllByType(Ionicons).find((n) => n.props.size === 17);
    const surveyIcon = surveyR.root.findAllByType(Ionicons).find((n) => n.props.size === 17);

    expect(eiaIcon?.props.name).toBe('document-text-outline');
    expect(surveyIcon?.props.name).toBe('globe-outline');
    expect(eiaIcon?.props.name).not.toBe(surveyIcon?.props.name);
  });

  it('falls back to a neutral treatment for an unrecognized report type', () => {
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
    const wrapStyle = flattenStyle(findIconWrap(r).props.style);
    expect(wrapStyle.backgroundColor).toBe(Colors.bgLight);

    const icon = r.root.findAllByType(Ionicons).find((n) => n.props.size === 17);
    expect(icon?.props.name).toBe('document-outline');
    expect(icon?.props.color).toBe(Colors.textMuted);
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

  it('resolves the control number style from Type.label (matching the date) with OS font scaling disabled', () => {
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
    const controlNoStyle = flattenStyle(controlNoText?.props.style);
    // The bug this task fixes: the control number used to resolve
    // Type.caption (11/14) while the date beside it resolves Type.label
    // (12/16) — two different sizes on one row don't share a baseline.
    expect(controlNoStyle.fontSize).toBe(Type.label.fontSize);
    expect(controlNoStyle.lineHeight).toBe(Type.label.lineHeight);
    expect(controlNoStyle.fontFamily).toBe('monospace');
    expect(controlNoText?.props.allowFontScaling).toBe(FONT_SCALING.tabular);
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

describe('EstablishmentReportsSection date + control number row', () => {
  // Combining the two previously-separate lines is the point of this task —
  // this asserts real row MEMBERSHIP (both nodes appear as siblings in the
  // calendar icon's own parent's `.children`), which is exactly what would
  // fail if the control number were split back onto its own line below the
  // date row, unlike a bare "both render somewhere" presence check.
  it('renders the date and control number as siblings of the same row, not on separate lines', () => {
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
    const calendarIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'calendar-outline');
    expect(calendarIcon).toBeDefined();
    const rowChildren = calendarIcon!.parent!.children;

    const controlNoText = r.root.findAllByType(Text).find((n) => n.props.children === baseItem.controlNo);
    const dateText = proseTexts(r).find((n) => flattenStyle(n.props.style).color === Colors.textMuted);

    expect(rowChildren).toContain(dateText);
    expect(rowChildren).toContain(controlNoText);
  });

  // The bug this task fixes: the date and control number now sit side by
  // side on one row but used to resolve two different sizes/lineHeights
  // (Type.label vs Type.caption), so they didn't share a baseline. Asserting
  // a direct comparison between the two resolved values — rather than each
  // pinned separately to a token — is what keeps this test failing if either
  // side drifts back out of sync, independent of which token wins. Mirrors
  // ReportListCard.test.tsx's equivalent assertion.
  it("resolves the control number's fontSize and lineHeight to exactly match the date's, so they share a baseline", () => {
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
    const dateText = proseTexts(r).find((n) => flattenStyle(n.props.style).color === Colors.textMuted);
    const dateStyle = flattenStyle(dateText?.props.style);
    const controlNoStyle = flattenStyle(controlNoText?.props.style);

    expect(controlNoStyle.fontSize).toBe(dateStyle.fontSize);
    expect(controlNoStyle.lineHeight).toBe(dateStyle.lineHeight);

    // Colour is what keeps the date reading as primary and the control
    // number as secondary now that size no longer does that job — they must
    // not have been flattened to the same colour along the way.
    expect(controlNoStyle.color).not.toBe(dateStyle.color);
    expect(dateStyle.color).toBe(Colors.textMuted);
    expect(controlNoStyle.color).toBe(Colors.textLight);
  });

  // The second bug this task fixes: the control number had no icon of its
  // own, unlike the date's calendar-outline. pricetag-outline is the same
  // glyph InspectionReportHeader.tsx already uses for a control number
  // elsewhere in the app.
  it('renders a decorative pricetag-outline icon immediately before the control number text', () => {
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
    const calendarIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'calendar-outline');
    const pricetagIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'pricetag-outline');
    const controlNoText = r.root.findAllByType(Text).find((n) => n.props.children === baseItem.controlNo);
    expect(pricetagIcon).toBeDefined();
    expect(controlNoText).toBeDefined();

    // Decorative: the control number text right beside it already carries
    // the meaning, so this icon must stay out of the accessibility tree —
    // same convention as Button.tsx's own icons.
    expect(pricetagIcon?.props.importantForAccessibility).toBe('no');

    // Matches the calendar icon's own size/color treatment so the two icons
    // in this row read as one family.
    expect(pricetagIcon?.props.size).toBe(calendarIcon?.props.size);
    expect(pricetagIcon?.props.color).toBe(calendarIcon?.props.color);

    // Immediately before the control number text, mirroring how the
    // calendar icon precedes the date, within the shared date row.
    const rowChildren = calendarIcon!.parent!.children;
    const iconIndex = rowChildren.indexOf(pricetagIcon!);
    const textIndex = rowChildren.indexOf(controlNoText!);
    expect(iconIndex).toBeGreaterThanOrEqual(0);
    expect(textIndex).toBe(iconIndex + 1);

    // Never squeezed by a long control number sharing the row.
    expect(flattenStyle(pricetagIcon?.props.style).flexShrink).toBe(0);
  });

  it('never lets a long control number push the urgency badge out of the row or clip the date', () => {
    const longControlNo = 'CTRL-2026-0000001-EXTREMELY-LONG-CONTROL-NUMBER-VALUE';
    const item: EstablishmentReportItem = {
      ...baseItem,
      status: 'draft',
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      controlNo: longControlNo,
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

    // The badge still renders — a long control number sharing the row must
    // not crowd it out.
    const badge = r.root
      .findAll((n) => (n.type as any)?.name === 'View' || n.type === View)
      .find((n) => flattenStyle(n.props.style).backgroundColor === Colors.hazwaste.badgeBg);
    expect(badge).toBeDefined();
    expect(proseTexts(r).some((n) => n.props.children === 'Overdue')).toBe(true);

    // The date text is still present and untouched — it's the control
    // number that gives way, not the date.
    const dateText = proseTexts(r).find((n) => flattenStyle(n.props.style).color === Colors.textMuted);
    expect(dateText).toBeDefined();

    // The control number is the element that shrinks/truncates (flex: 1,
    // numberOfLines 1) — the date, its icon, and the badge are pinned
    // (flexShrink: 0) so none of them can be squeezed out by it.
    const controlNoText = r.root.findAllByType(Text).find((n) => n.props.children === longControlNo);
    expect(flattenStyle(controlNoText?.props.style).flex).toBe(1);
    expect(controlNoText?.props.numberOfLines).toBe(1);
    expect(flattenStyle(dateText?.props.style).flexShrink).toBe(0);
    expect(flattenStyle(badge?.props.style).flexShrink).toBe(0);

    const pricetagIcon = r.root.findAllByType(Ionicons).find((n) => n.props.name === 'pricetag-outline');
    expect(pricetagIcon).toBeDefined();
    expect(flattenStyle(pricetagIcon?.props.style).flexShrink).toBe(0);
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

describe('EstablishmentReportsSection button hierarchy', () => {
  // The button hierarchy this task establishes: exactly one filled `primary`
  // button per screen, and every section-header action is `sm` `outline`.
  // EstablishmentHeaderCard's own "Add Report" is the screen's one primary
  // action, so this section-header "Add Report" must not also be filled —
  // two filled navy buttons on the same screen was the bug.
  it('renders Add Report as outline, not primary, at sm size', () => {
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
    const style = flattenStyle(findAddReportButton(r).props.style);
    expect(style.minHeight).toBe(32); // sm
    expect(style.backgroundColor).toBe(Colors.white); // outline, not primary's navy fill
    expect(style.borderColor).toBe(Colors.navy);
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
