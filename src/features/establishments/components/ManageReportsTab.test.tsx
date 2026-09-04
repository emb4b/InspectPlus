import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ManageReportsTab } from './ManageReportsTab';
import type { AllReportItem } from '../hooks/useEstablishment';

// ManageReportsTab (via ReportListCard) pulls in confirmResolveConflict ->
// the WatermelonDB sync adapter chain, which constructs a real SQLiteAdapter
// at import time (via db/database.ts) needing a native JSI binding absent
// under plain Jest — same rationale as ReportListCard.test.tsx and
// useEstablishment.test.ts.
jest.mock('../../../db/database', () => ({ database: {}, collections: {} }));

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const mockUseAllReports = jest.fn();
const mockUseEstablishmentFilterOptions = jest.fn();

// useReportBrowser (used for real below — this test exercises the actual
// hook, not a stand-in, since the page-reset behavior under test lives in
// the interaction between ManageReportsTab's effect and useReportBrowser's
// memoized `state`) still bottoms out in useEstablishment.ts's DB-backed
// hooks. Stub just those two, plus canManageAllRecords, which
// ManageReportsTab calls directly.
jest.mock('../hooks/useEstablishment', () => ({
  useAllReports: (...args: unknown[]) => mockUseAllReports(...args),
  useEstablishmentFilterOptions: () => mockUseEstablishmentFilterOptions(),
  canManageAllRecords: (role: string) => role === 'Developer',
}));

jest.mock('../../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({
    municipalities: [],
    session: { user: { id: 'uid-1' } },
    role: 'Inspector',
  }),
}));

jest.mock('../../inspections/reportPersistence', () => ({
  deleteInspectionReportRecord: jest.fn(),
}));

// Both child components get their own dedicated tests (ReportListCard.test.tsx,
// ReportFilterSheet.test.tsx) covering their internals — including
// ReportFilterSheet's real SelectField/DateField wiring and its
// keyboard-controller dependency. Standing them up for real here as well
// would mean re-mocking react-native-keyboard-controller and driving nested
// pickers just to reach a filter's onSelect. Stubbing them to thin,
// accessibility-labeled controls that call straight through to the
// `browser` setters isolates exactly what this file is responsible for:
// whether ManageReportsTab resets pagination on the right state changes.
// jest.mock factories can't reference this file's own top-level imports (its
// module scope isn't initialized yet when the factory runs — Jest hoists
// jest.mock() calls above them and throws "not allowed to reference any
// out-of-scope variables" otherwise), so React/react-native are pulled in
// via require() inside each factory instead — the one out-of-scope access
// Jest's hoist check allows unconditionally.
jest.mock('./ReportListCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const ReactLib = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const RN = require('react-native');
  return {
    ReportListCard: ({ item }: { item: AllReportItem }) =>
      ReactLib.createElement(RN.Text, { testID: 'row' }, item.key),
  };
});

jest.mock('./ReportFilterSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const ReactLib = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const RN = require('react-native');
  return {
    ReportFilterSheet: ({ visible, browser }: { visible: boolean; browser: any }) => {
      if (!visible) return null;
      return ReactLib.createElement(
        ReactLib.Fragment,
        null,
        ReactLib.createElement(RN.TouchableOpacity, {
          accessibilityLabel: 'test-set-province',
          onPress: () => browser.setProvince('Palawan'),
        }),
        ReactLib.createElement(RN.TouchableOpacity, {
          accessibilityLabel: 'test-set-sort-oldest',
          onPress: () => browser.setSortOrder('oldest'),
        }),
        ReactLib.createElement(RN.TouchableOpacity, {
          accessibilityLabel: 'test-clear-filters',
          onPress: () => browser.clearFilters(),
        }),
      );
    },
  };
});

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

// Same locator convention as SpeedDial.test.tsx's byLabel: `.find()` throws
// on 0 or >1 matches rather than silently indexing into an ambiguous result.
const findByLabel = (r: Renderer, label: string) =>
  r.root.find(n => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function');

function makeReport(i: number): AllReportItem {
  return {
    key: `report-${i}`,
    kind: 'inspection',
    reportId: `r${i}`,
    inspectorUid: 'uid-1',
    estabId: `e${i}`,
    estabName: `Establishment ${i}`,
    estabProvince: 'Palawan',
    estabCity: 'Puerto Princesa',
    reportType: 'air_monitoring',
    title: 'Air Quality Monitoring Report',
    date: '2026-01-01',
    controlNo: null,
    status: 'draft',
    syncStatus: 'synced',
  };
}

// PAGE_SIZE is 5 inside ManageReportsTab; 12 reports gives 3 full pages
// (5, 5, 2) so page-2 navigation and "does this reset to page 1" checks
// have real headroom.
const REPORTS = Array.from({ length: 12 }, (_, i) => makeReport(i));

describe('ManageReportsTab pagination reset', () => {
  beforeEach(() => {
    mockUseAllReports.mockReset().mockReturnValue({
      reports: REPORTS,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseEstablishmentFilterOptions.mockReset().mockReturnValue({
      provinceOptions: ['Palawan'],
      inspectorOptions: [],
      loading: false,
    });
  });

  const goToPage2 = (r: Renderer) => {
    act(() => findByLabel(r, 'Go to page 2').props.onPress());
  };

  const isOnPageOne = (r: Renderer) => findByLabel(r, 'Previous page').props.disabled === true;

  it('starts on page 1', () => {
    const r = render(<ManageReportsTab />);
    expect(isOnPageOne(r)).toBe(true);
  });

  it('moving to page 2 leaves page 1 behind (Previous becomes enabled)', () => {
    const r = render(<ManageReportsTab />);
    goToPage2(r);
    expect(isOnPageOne(r)).toBe(false);
  });

  it('typing a search query resets pagination back to page 1', () => {
    const r = render(<ManageReportsTab />);
    goToPage2(r);
    expect(isOnPageOne(r)).toBe(false);

    const searchInput = r.root.findByProps({ placeholder: 'Search by establishment name...' });
    act(() => searchInput.props.onChangeText('acme'));

    expect(isOnPageOne(r)).toBe(true);
  });

  it('switching the status chip resets pagination back to page 1', () => {
    const r = render(<ManageReportsTab />);
    goToPage2(r);

    act(() => findByLabel(r, 'Show draft reports').props.onPress());

    expect(isOnPageOne(r)).toBe(true);
  });

  it('changing a filter-sheet field (region) resets pagination back to page 1', () => {
    const r = render(<ManageReportsTab />);
    goToPage2(r);
    act(() => findByLabel(r, 'Filter reports').props.onPress());

    act(() => findByLabel(r, 'test-set-province').props.onPress());

    expect(isOnPageOne(r)).toBe(true);
  });

  it('clearing filters resets pagination back to page 1', () => {
    const r = render(<ManageReportsTab />);
    goToPage2(r);
    act(() => findByLabel(r, 'Filter reports').props.onPress());

    act(() => findByLabel(r, 'test-clear-filters').props.onPress());

    expect(isOnPageOne(r)).toBe(true);
  });

  // The one deliberate asymmetry (see the useEffect comment in
  // ManageReportsTab.tsx): every other filter/search change above resets
  // pagination, but changing ONLY the sort order must not — matching the
  // pre-extraction behavior where the sort SelectField's onSelect was the
  // one handler that never called setPage(1).
  it('changing ONLY the sort order does NOT reset pagination', () => {
    const r = render(<ManageReportsTab />);
    goToPage2(r);
    act(() => findByLabel(r, 'Filter reports').props.onPress());

    act(() => findByLabel(r, 'test-set-sort-oldest').props.onPress());

    expect(isOnPageOne(r)).toBe(false);
  });
});
