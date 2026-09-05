import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { ReportListCard } from './ReportListCard';
import { Colors } from '../../../design/colors';
import { REPORT_TYPE_DISPLAY, ReportDataKey } from '../../../constants/reportTypeDisplay';
import type { AllReportItem } from '../hooks/useEstablishment';

// ReportListCard pulls in confirmResolveConflict -> the WatermelonDB sync
// adapter chain, which constructs a real SQLiteAdapter at import time (via
// db/database.ts) needing the native JSI binding that isn't present under
// plain Jest — same rationale as establishmentPersistence.test.ts and
// useEstablishment.test.ts. jest.mock calls are hoisted above imports by
// babel-plugin-jest-hoist regardless of where they're written, so this
// still applies before ReportListCard is ever required.
jest.mock('../../../db/database', () => ({ database: {}, collections: {} }));

const mockConfirmResolveConflict = jest.fn();
jest.mock('../../../services/sync/syncConflictResolution', () => ({
  confirmResolveConflict: (...args: unknown[]) => mockConfirmResolveConflict(...args),
}));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

// Locate the report-icon wrap View by its resolved shape styles (width 38 /
// height 38 / borderRadius 8 — unique to this element in ReportListCard).
// Throws if zero or more than one match is found, per the Card/Badge
// locator convention.
const findIconWrap = (r: Renderer) => {
  const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
  const matches = views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.width === 38 && flattened.height === 38 && flattened.borderRadius === 8;
  });
  if (matches.length === 0) {
    throw new Error('No icon wrap View found: expected a View with width===38, height===38, borderRadius===8');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 icon wrap View but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

// Locate the report-type Ionicons glyph by its unique size (17 — every
// other Ionicons usage in ReportListCard uses a different size). Throws if
// zero or more than one match is found.
const findReportIcon = (r: Renderer) => {
  const icons = r.root.findAllByType(Ionicons).filter((n) => n.props.size === 17);
  if (icons.length === 0) {
    throw new Error('No report-type Ionicons found: expected an Ionicons with size===17');
  }
  if (icons.length > 1) {
    throw new Error(`Expected 1 report-type Ionicons but found ${icons.length}; the locator is not sufficiently specific`);
  }
  return icons[0];
};

// react-native's own TouchableOpacity module (Libraries/Components/Touchable/
// TouchableOpacity.js) is itself a thin wrapper that spreads every prop it
// receives — onPress included — onto an inner, unexported class component of
// the same displayName, so a props-only predicate (e.g. matching just
// accessibilityLabel) double-matches: once on the outer wrapper fiber, once
// on the inner one. Anchoring on `n.type === TouchableOpacity` (the same
// module reference this file and ReportListCard.tsx both resolve to)
// narrows a `find`/`findAll` to the outer fiber only, exactly one per
// on-screen button — confirmed by rendering the card and logging every
// matching node before writing these locators.
const findCard = (r: Renderer, item: AllReportItem) =>
  r.root.find(
    (n) =>
      n.type === TouchableOpacity &&
      n.props?.accessibilityLabel === `${item.title} for ${item.estabName}`,
  );

const findEditButtons = (r: Renderer, item: AllReportItem) =>
  r.root.findAll(
    (n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === `Edit ${item.title}`,
  );

const findDeleteButtons = (r: Renderer, item: AllReportItem) =>
  r.root.findAll(
    (n) => n.type === TouchableOpacity && n.props?.accessibilityLabel === `Delete ${item.title}`,
  );

// The card's single GestureDetector wraps the swipe-to-reveal pan gesture.
// Gesture.Pan().enabled(x) stores the flag on the gesture's own `config`
// object (handlers/gestures/gesture.js), so reading it here inspects the
// actual recognizer state the native side would honor — not a stand-in like
// button visibility, which selection mode also changes but which a broken
// `.enabled()` call would not affect.
const isPanGestureEnabled = (r: Renderer): boolean =>
  (r.root.findByType(GestureDetector).props as { gesture: { config: { enabled: boolean } } }).gesture
    .config.enabled;

// Checkbox is a 22x22 View with a 4px border radius (CHECKBOX_SIZE /
// Radius.xs in ReportListCard.tsx) — a shape no other View in the card
// shares. Same throw-on-zero-or-multiple convention as findIconWrap.
const findCheckboxes = (r: Renderer) => {
  const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
  return views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.width === 22 && flattened.height === 22 && flattened.borderRadius === 4;
  });
};

const findCheckbox = (r: Renderer) => {
  const matches = findCheckboxes(r);
  if (matches.length === 0) {
    throw new Error('No checkbox View found: expected a View with width===22, height===22, borderRadius===4');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 checkbox View but found ${matches.length}; the locator is not sufficiently specific`);
  }
  return matches[0];
};

const findCheckmarkIcons = (r: Renderer) =>
  r.root.findAllByType(Ionicons).filter((n) => n.props.name === 'checkmark' && n.props.size === 14);

// Locate the ordered list of the card body's real JSX children — titleRow,
// metaRow, dateRow, controlNo, and (conditionally) the sync row — by first
// finding the `content` View by its resolved shape (flex 1, minWidth 0 —
// unique to this element in ReportListCard), throwing on zero-or-multiple
// matches per the findIconWrap convention.
//
// `View` from react-native is a forwardRef wrapping a single host layer of
// the same resolved style (confirmed by inspecting the rendered tree
// directly: content.children is a single-entry array holding that host
// layer, not the five JSX siblings), so the real, order-bearing siblings
// live one level deeper still, on that host layer's own `.children`.
const findContentChildren = (r: Renderer) => {
  const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
  const matches = views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.flex === 1 && flattened.minWidth === 0;
  });
  if (matches.length === 0) {
    throw new Error('No content View found: expected a View with flex===1, minWidth===0');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 content View but found ${matches.length}; the locator is not sufficiently specific`);
  }
  // Every direct JSX child in this card body is itself a View/Text/
  // TouchableOpacity element, never bare text — so this cast is safe.
  const hostLayer = matches[0].children[0] as TestRenderer.ReactTestInstance;
  return hostLayer.children as TestRenderer.ReactTestInstance[];
};

const baseItem: AllReportItem = {
  key: 'survey-1',
  kind: 'survey',
  reportId: 'r1',
  inspectorUid: 'uid-1',
  reportType: 'survey',
  title: 'Test Report',
  date: new Date().toISOString(),
  controlNo: 'CTRL-1',
  status: 'submitted',
  syncStatus: 'synced',
  estabId: 'estab-1',
  estabName: 'Test Establishment',
  estabProvince: 'Palawan',
  estabCity: 'Puerto Princesa',
};

const noop = () => {};

const ALL_DATA_KEYS: ReportDataKey[] = [
  'air_monitoring',
  'water_monitoring',
  'hazardous_waste',
  'eia',
  'survey',
];

describe('ReportListCard report-type icon', () => {
  it.each(ALL_DATA_KEYS)(
    'resolves %s icon and background/color from REPORT_TYPE_DISPLAY, not a hardcoded water treatment',
    (reportType) => {
      const item: AllReportItem = { ...baseItem, reportType };
      const r = render(
        <ReportListCard
          item={item}
          currentUid="uid-1"
          canManageAll={false}
          onPress={noop}
          onEdit={noop}
          onDelete={noop}
        />,
      );

      const expected = REPORT_TYPE_DISPLAY[reportType];

      const iconWrap = findIconWrap(r);
      const wrapStyle = flattenStyle(iconWrap.props.style);
      expect(wrapStyle.backgroundColor).toBe(expected.bgColor);

      const icon = findReportIcon(r);
      expect(icon.props.name).toBe(expected.icon);
      expect(icon.props.color).toBe(expected.textColor);
    },
  );

  // The bug this task fixes: every card previously rendered with a
  // hardcoded backgroundColor: Colors.water.bg / color: Colors.water.text
  // regardless of the report's actual type. Assert an air report resolves
  // to the air palette specifically, not water's.
  it('an air_monitoring report does not render with the water palette', () => {
    const item: AllReportItem = { ...baseItem, reportType: 'air_monitoring' };
    const r = render(
      <ReportListCard
        item={item}
        currentUid="uid-1"
        canManageAll={false}
        onPress={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );

    const wrapStyle = flattenStyle(findIconWrap(r).props.style);
    expect(wrapStyle.backgroundColor).not.toBe(Colors.water.bg);
    expect(wrapStyle.backgroundColor).toBe(Colors.air.bg);

    const icon = findReportIcon(r);
    expect(icon.props.color).not.toBe(Colors.water.text);
    expect(icon.props.color).toBe(Colors.air.text);
  });

  // Regression coverage for the specific swapped-icon bug: eia and survey
  // must each resolve their OWN icon, not each other's.
  it('eia and survey resolve distinct, non-swapped icons', () => {
    const eiaItem: AllReportItem = { ...baseItem, reportType: 'eia' };
    const surveyItem: AllReportItem = { ...baseItem, reportType: 'survey' };

    const eiaR = render(
      <ReportListCard item={eiaItem} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    const surveyR = render(
      <ReportListCard item={surveyItem} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );

    const eiaIcon = findReportIcon(eiaR);
    const surveyIcon = findReportIcon(surveyR);

    expect(eiaIcon.props.name).toBe('document-text-outline');
    expect(surveyIcon.props.name).toBe('globe-outline');
    expect(eiaIcon.props.name).not.toBe(surveyIcon.props.name);
  });

  it('falls back to a neutral treatment for an unrecognized report type', () => {
    const item: AllReportItem = { ...baseItem, reportType: 'some_future_type' };
    const r = render(
      <ReportListCard item={item} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );

    const wrapStyle = flattenStyle(findIconWrap(r).props.style);
    expect(wrapStyle.backgroundColor).toBe(Colors.bgLight);

    const icon = findReportIcon(r);
    expect(icon.props.name).toBe('document-outline');
    expect(icon.props.color).toBe(Colors.textMuted);
  });
});

// An inspection report, in draft, owned by the viewer — this combination is
// what makes both showEdit and showDelete true, which in turn is what makes
// the swipe gesture enabled by default. Using it (rather than baseItem,
// where neither action shows and the gesture is already off) is what lets
// the selection-mode tests below prove selection mode is what turns the
// gesture off, not that it was off already.
const ownedDraftInspection: AllReportItem = {
  ...baseItem,
  key: 'inspection-1',
  kind: 'inspection',
  reportType: 'water_monitoring',
  inspectorUid: 'uid-1',
  status: 'draft',
};

describe('ReportListCard selection mode', () => {
  it('renders no checkbox when not selectable', () => {
    const r = render(
      <ReportListCard item={ownedDraftInspection} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(findCheckboxes(r)).toHaveLength(0);
  });

  it('renders a checkbox when selectable', () => {
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        selectable
        onPress={noop}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={noop}
      />,
    );
    expect(findCheckbox(r)).toBeDefined();
  });

  it('renders the checkbox unchecked, distinctly from the checked state, when selected is false', () => {
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        selectable
        selected={false}
        onPress={noop}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={noop}
      />,
    );
    const checkboxStyle = flattenStyle(findCheckbox(r).props.style);
    expect(checkboxStyle.backgroundColor).not.toBe(Colors.accent);
    expect(findCheckmarkIcons(r)).toHaveLength(0);
  });

  it('renders the checkbox checked, distinctly from the unchecked state, when selected is true', () => {
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        selectable
        selected
        onPress={noop}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={noop}
      />,
    );
    const checkboxStyle = flattenStyle(findCheckbox(r).props.style);
    expect(checkboxStyle.backgroundColor).toBe(Colors.accent);
    expect(findCheckmarkIcons(r)).toHaveLength(1);
  });

  it('opens the report on press when not selectable, and never touches onToggleSelect', () => {
    const onPress = jest.fn();
    const onToggleSelect = jest.fn();
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        onPress={onPress}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={onToggleSelect}
      />,
    );

    TestRenderer.act(() => {
      findCard(r, ownedDraftInspection).props.onPress();
    });

    expect(onPress).toHaveBeenCalledWith(ownedDraftInspection);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('toggles selection instead of opening the report when selectable, and never touches onPress', () => {
    const onPress = jest.fn();
    const onToggleSelect = jest.fn();
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        selectable
        onPress={onPress}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={onToggleSelect}
      />,
    );

    TestRenderer.act(() => {
      findCard(r, ownedDraftInspection).props.onPress();
    });

    expect(onToggleSelect).toHaveBeenCalledWith(ownedDraftInspection);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes accessibilityRole="button" and no accessibilityState when not selectable', () => {
    const r = render(
      <ReportListCard item={ownedDraftInspection} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    const card = findCard(r, ownedDraftInspection);
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityState).toBeUndefined();
  });

  it('exposes accessibilityRole="checkbox" and a checked accessibilityState reflecting `selected`', () => {
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        selectable
        selected
        onPress={noop}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={noop}
      />,
    );
    const card = findCard(r, ownedDraftInspection);
    expect(card.props.accessibilityRole).toBe('checkbox');
    expect(card.props.accessibilityState).toEqual({ checked: true });
  });

  it('reflects selected=false in accessibilityState too, not just selected=true', () => {
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        selectable
        selected={false}
        onPress={noop}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={noop}
      />,
    );
    expect(findCard(r, ownedDraftInspection).props.accessibilityState).toEqual({ checked: false });
  });
});

describe('ReportListCard swipe gesture', () => {
  it('is enabled outside selection mode when at least one swipe action is visible', () => {
    // ownedDraftInspection has both showEdit and showDelete true, so this
    // also doubles as the control for the "selectable turns it off" test
    // below — same item, only `selectable` differs.
    const r = render(
      <ReportListCard item={ownedDraftInspection} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(isPanGestureEnabled(r)).toBe(true);
  });

  it('is disabled in selection mode even though the same item would otherwise show swipe actions', () => {
    const r = render(
      <ReportListCard
        item={ownedDraftInspection}
        currentUid="uid-1"
        canManageAll={false}
        selectable
        onPress={noop}
        onEdit={noop}
        onDelete={noop}
        onToggleSelect={noop}
      />,
    );
    expect(isPanGestureEnabled(r)).toBe(false);
  });

  it('stays disabled outside selection mode when no swipe action is visible (unchanged prior behavior)', () => {
    // baseItem is a survey report, so both showEdit and showDelete are
    // false regardless of ownership — this is the pre-existing "nothing to
    // reveal" case that selection mode must not be needed to reproduce.
    const r = render(
      <ReportListCard item={baseItem} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(isPanGestureEnabled(r)).toBe(false);
  });
});

describe('ReportListCard Edit/Delete visibility (unchanged by this task)', () => {
  it('shows both Edit and Delete for a draft inspection report owned by the viewer', () => {
    const r = render(
      <ReportListCard item={ownedDraftInspection} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(findEditButtons(r, ownedDraftInspection)).toHaveLength(1);
    expect(findDeleteButtons(r, ownedDraftInspection)).toHaveLength(1);
  });

  it('hides Edit but keeps Delete once an owned inspection report is submitted', () => {
    const submitted: AllReportItem = { ...ownedDraftInspection, status: 'submitted' };
    const r = render(
      <ReportListCard item={submitted} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(findEditButtons(r, submitted)).toHaveLength(0);
    expect(findDeleteButtons(r, submitted)).toHaveLength(1);
  });

  it('hides both Edit and Delete for a draft inspection report the viewer does not own and cannot manage', () => {
    const othersReport: AllReportItem = { ...ownedDraftInspection, inspectorUid: 'someone-else' };
    const r = render(
      <ReportListCard item={othersReport} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(findEditButtons(r, othersReport)).toHaveLength(0);
    expect(findDeleteButtons(r, othersReport)).toHaveLength(0);
  });

  it('shows both Edit and Delete for a report the viewer does not own when canManageAll is true (Developer account)', () => {
    const othersReport: AllReportItem = { ...ownedDraftInspection, inspectorUid: 'someone-else' };
    const r = render(
      <ReportListCard item={othersReport} currentUid="uid-1" canManageAll onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(findEditButtons(r, othersReport)).toHaveLength(1);
    expect(findDeleteButtons(r, othersReport)).toHaveLength(1);
  });

  it('never shows Edit or Delete for a survey report, even when owned and manageable', () => {
    const surveyReport: AllReportItem = { ...ownedDraftInspection, kind: 'survey' };
    const r = render(
      <ReportListCard item={surveyReport} currentUid="uid-1" canManageAll onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(findEditButtons(r, surveyReport)).toHaveLength(0);
    expect(findDeleteButtons(r, surveyReport)).toHaveLength(0);
  });
});

describe('ReportListCard sync flag placement', () => {
  afterEach(() => {
    mockConfirmResolveConflict.mockClear();
  });

  // The bug this task fixes: the sync flag used to sit between metaRow and
  // dateRow, mid-card. This asserts actual render ORDER — not just that the
  // row exists — so it would fail against the old position.
  it('renders the pending-sync row after every other element in the card body', () => {
    const item: AllReportItem = { ...baseItem, syncStatus: 'pending' };
    const r = render(
      <ReportListCard item={item} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    const children = findContentChildren(r);
    expect(children.length).toBeGreaterThan(1);

    const lastChild = children[children.length - 1];
    expect(lastChild.findAllByType(Ionicons).some((n) => n.props.name === 'cloud-upload-outline')).toBe(true);

    // The control number — previously the very last element — must now sit
    // strictly earlier than the sync row.
    const controlNoText = r.root.findAllByType(Text).find((n) => n.props.children === item.controlNo);
    const controlNoIndex = children.indexOf(controlNoText!);
    expect(controlNoIndex).toBeGreaterThanOrEqual(0);
    expect(controlNoIndex).toBeLessThan(children.length - 1);
  });

  it('renders the conflict-sync row after every other element in the card body', () => {
    const item: AllReportItem = { ...baseItem, syncStatus: 'conflict' };
    const r = render(
      <ReportListCard item={item} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    const children = findContentChildren(r);
    expect(children.length).toBeGreaterThan(1);

    const lastChild = children[children.length - 1];
    expect(lastChild.findAllByType(Ionicons).some((n) => n.props.name === 'alert-circle-outline')).toBe(true);

    const controlNoText = r.root.findAllByType(Text).find((n) => n.props.children === item.controlNo);
    const controlNoIndex = children.indexOf(controlNoText!);
    expect(controlNoIndex).toBeGreaterThanOrEqual(0);
    expect(controlNoIndex).toBeLessThan(children.length - 1);
  });

  it('shows only the pending row, never the conflict row, when syncStatus is "pending"', () => {
    const item: AllReportItem = { ...baseItem, syncStatus: 'pending' };
    const r = render(
      <ReportListCard item={item} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'cloud-upload-outline')).toBe(true);
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'alert-circle-outline')).toBe(false);
  });

  it('shows only the conflict row, never the pending row, when syncStatus is "conflict"', () => {
    const item: AllReportItem = { ...baseItem, syncStatus: 'conflict' };
    const r = render(
      <ReportListCard item={item} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'alert-circle-outline')).toBe(true);
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'cloud-upload-outline')).toBe(false);
  });

  it('shows neither sync row when syncStatus is "synced"', () => {
    const r = render(
      <ReportListCard item={baseItem} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'cloud-upload-outline')).toBe(false);
    expect(r.root.findAllByType(Ionicons).some((n) => n.props.name === 'alert-circle-outline')).toBe(false);
  });

  it('still resolves and fires confirmResolveConflict when the (now-last) conflict row is pressed', () => {
    const item: AllReportItem = { ...baseItem, syncStatus: 'conflict' };
    const r = render(
      <ReportListCard item={item} currentUid="uid-1" canManageAll={false} onPress={noop} onEdit={noop} onDelete={noop} />,
    );
    const children = findContentChildren(r);
    const conflictRow = children[children.length - 1];

    TestRenderer.act(() => {
      conflictRow.props.onPress();
    });

    // baseItem.kind is 'survey', so the conflict resolves against
    // 'survey_reports' — the branch's condition is unchanged by the move.
    expect(mockConfirmResolveConflict).toHaveBeenCalledWith('survey_reports', item.reportId, item.title);
  });
});
