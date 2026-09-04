import React from 'react';
import { View } from 'react-native';
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
