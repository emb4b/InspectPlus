import React from 'react';
import { TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import type { AllReportItem } from '../hooks/useEstablishment';
import type { UseReportBrowserReturn } from '../hooks/useReportBrowser';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { Skeleton } from '../../../components/Skeleton';
// Imported here at the top rather than after the jest.mock() calls below
// (as the brief originally had it): babel-plugin-jest-hoist hoists every
// jest.mock() call to the top of the module regardless of where it's
// written, so mocking still takes effect before these resolve either way —
// ManageReportsTab.test.tsx and ReportFilterSheet.test.tsx both import the
// component under test at the top for exactly this reason, and eslint's
// import/first rule requires it.
import { ExportReportsTab } from './ExportReportsTab';
import { ReportListCard } from './ReportListCard';

// ExportReportsTab renders the real ReportListCard, which pulls in
// confirmResolveConflict -> the WatermelonDB sync adapter chain, which
// constructs a real SQLiteAdapter at import time (via db/database.ts) needing
// a native JSI binding absent under plain Jest — same rationale as
// ReportListCard.test.tsx and ManageReportsTab.test.tsx.
jest.mock('../../../db/database', () => ({ database: {}, collections: {} }));

// ExportReportsTab always mounts ReportFilterSheet (its Modal's `visible`
// prop is what's conditional, not the component itself), which imports
// useReanimatedKeyboardAnimation from react-native-keyboard-controller — a
// native module absent under plain Jest. react-native-keyboard-controller
// ships its own jest mock for exactly this situation — see
// node_modules/react-native-keyboard-controller/jest/index.js — wiring that
// hook to a static, inert shared value instead. Same fix already used by
// ReportFilterSheet.test.tsx.
jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));

// jest.config.js maps react-native-reanimated to the library's own
// react-native-reanimated/mock module for every test file, which covers
// useSharedValue/useAnimatedStyle/withTiming (what ReportListCard's swipe
// gesture needs — proven working by ReportListCard.test.tsx) but not the
// newer useReducedMotion, which src/design/motion.ts's useMotion() calls and
// which the loading-state test below reaches via Skeleton. Overriding just
// that export on top of the real module — not the mock module — is the same
// fix Skeleton.test.tsx already uses.
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => false,
}));

// Prefixed `mock` — babel-plugin-jest-hoist hoists every jest.mock() call to
// the top of the file, ahead of ordinary top-level declarations, and
// statically rejects any out-of-scope identifier a hoisted factory closes
// over unless its name starts with "mock" (case-insensitive). Every one of
// these is read from inside a jest.mock() factory below, so all need the
// prefix — matches the mockUseAllReports/mockUseEstablishmentFilterOptions
// convention already used in ManageReportsTab.test.tsx.
const mockReports: AllReportItem[] = [
  {
    key: 'inspection-r1', kind: 'inspection', reportId: 'r1', inspectorUid: 'u1', estabId: 'e1',
    estabName: 'Alpha Corp', estabProvince: 'Oriental Mindoro', estabCity: 'Calapan City',
    reportType: 'water_monitoring', title: 'Water Monitoring', date: '2026-08-01',
    controlNo: 'WQ-1', status: 'draft', syncStatus: 'synced',
  },
  {
    key: 'inspection-r2', kind: 'inspection', reportId: 'r2', inspectorUid: 'u1', estabId: 'e2',
    estabName: 'Beta Inc', estabProvince: 'Oriental Mindoro', estabCity: 'Calapan City',
    reportType: 'air_monitoring', title: 'Air Monitoring', date: '2026-08-02',
    controlNo: 'AQ-1', status: 'submitted', syncStatus: 'synced',
  },
];

const mockSetFabHidden = jest.fn();
let mockRegisteredFooter: React.ReactNode = null;

// A jest.fn() rather than a fixed return, so individual tests (loading, empty,
// alternate report sets for the select-all/draft-count coverage below) can
// swap in their own browser state via mockUseReportBrowser.mockImplementation
// — the same reason ManageReportsTab.test.tsx stubs useAllReports as a
// jest.fn() instead of a fixed object.
const mockUseReportBrowser = jest.fn();

const defaultBrowserState: UseReportBrowserReturn['state'] = {
  search: '', statusFilter: 'all', province: '', city: '',
  reportType: '', dateFrom: '', dateTo: '', sortOrder: 'newest',
};

function makeBrowserReturn(overrides: Partial<UseReportBrowserReturn> = {}): UseReportBrowserReturn {
  return {
    reports: mockReports,
    loading: false,
    error: null,
    refetch: jest.fn(),
    state: defaultBrowserState,
    provinceOptions: [],
    activeFilterCount: 0,
    setSearch: jest.fn(),
    setStatusFilter: jest.fn(),
    setProvince: jest.fn(),
    setCity: jest.fn(),
    setReportType: jest.fn(),
    setDateFrom: jest.fn(),
    setDateTo: jest.fn(),
    setSortOrder: jest.fn(),
    clearFilters: jest.fn(),
    ...overrides,
  };
}

jest.mock('../hooks/useReportBrowser', () => ({
  useReportBrowser: () => mockUseReportBrowser(),
}));

jest.mock('../../home/context/ScreenFooterContext', () => ({
  useScreenFooter: (factory: () => React.ReactNode) => { mockRegisteredFooter = factory(); },
}));

// A real useEffect with a cleanup, not a bare function call — the brief's
// original `useSetFabHidden: (hidden) => { setFabHidden(hidden); }` only
// observes hidden flipping to true/false across renders; it has no lifecycle
// hook at all, so it cannot exercise (or even represent) the real hook's
// unmount-restores-visibility guarantee, which is exactly what this task
// requires proving ("restored ... when the tab unmounts" — a stuck-hidden FAB
// is invisible, permanent breakage). require() the already-hoisted `react`
// binding inside the factory (see the ReportListCard mock in
// ManageReportsTab.test.tsx for the same pattern and its rationale) so the
// mock keeps the real hook's effect+cleanup shape while still standing in for
// the FabVisibilityContext provider this test doesn't stand up.
jest.mock('../../home/context/FabVisibilityContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see comment above
  const ReactLib = require('react');
  return {
    useSetFabHidden: (hidden: boolean) => {
      ReactLib.useEffect(() => {
        mockSetFabHidden(hidden);
        return () => mockSetFabHidden(false);
      }, [hidden]);
    },
  };
});

jest.mock('../../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({ municipalities: [], session: { user: { id: 'u1' } }, role: 'Inspector' }),
}));

// canManageAllRecords is the only runtime import ExportReportsTab takes from
// useEstablishment (AllReportItem is type-only). Mocked so the test doesn't
// pull WatermelonDB's adapter in through that module's import chain.
jest.mock('../hooks/useEstablishment', () => ({
  canManageAllRecords: () => false,
  INSPECTION_TYPE_LABELS: { water_monitoring: 'Water Monitoring', air_monitoring: 'Air Monitoring' },
}));

type Renderer = TestRenderer.ReactTestRenderer;

const render = () => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(<ExportReportsTab />); });
  return r;
};

const selectRow = (r: Renderer, index: number) => {
  const cards = r.root.findAllByType(ReportListCard);
  act(() => { cards[index].props.onToggleSelect(mockReports[index]); });
};

// Generalized form of selectRow for tests that swap in their own report
// fixtures via mockUseReportBrowser rather than the module-level mockReports.
const toggleItem = (r: Renderer, item: AllReportItem) => {
  const card = r.root.find(
    n => n.type === ReportListCard && (n.props as { item: AllReportItem }).item.key === item.key,
  );
  act(() => { (card.props as { onToggleSelect: (i: AllReportItem) => void }).onToggleSelect(item); });
};

// Renders whatever the footer factory last produced into its own tree, so
// assertions can inspect real component instances/props (Button.disabled,
// Badge.tone) instead of only pattern-matching the serialized JSON.
const renderFooter = (): Renderer => {
  // Wrapped in act(), unlike the brief's original version: react-test-renderer
  // under React 19 does not guarantee create() has committed host components
  // synchronously before returning, so an un-acted create() here could read
  // back toJSON() as null even though mockRegisteredFooter itself holds real
  // JSX — matches the render()/selectRow() convention above, and the
  // established act()-wrapped-create() pattern in ReportListCard.test.tsx.
  let rendered!: Renderer;
  act(() => { rendered = TestRenderer.create(<>{mockRegisteredFooter}</>); });
  return rendered;
};

const footerText = (): string => JSON.stringify(renderFooter().toJSON());

// A JSX child list like `{n} of {m} selected` compiles to SEPARATE array
// entries per expression/literal ("1", " of ", "2", " selected", ...), not
// one concatenated string — react-test-renderer's toJSON() preserves that
// split, so JSON.stringify(...).toContain('1 of 2 selected...') can never
// match even when the rendered text reads correctly (confirmed by running
// this test against the real component: the naive assertion failed while
// the on-screen text was right). Recursively joining every string leaf
// reproduces what a reader — or an accessibility tree walker — actually
// sees, which is what "assert resolved values" means for fragmented RN text.
type JsonNode = TestRenderer.ReactTestRendererJSON | string;
const flattenText = (node: JsonNode | JsonNode[] | null): string => {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children as JsonNode[] | null);
};
const footerFlatText = (): string => flattenText(renderFooter().toJSON());

// RN's own TouchableOpacity module is a thin wrapper that spreads every prop
// it receives onto an inner, unexported class component of the same
// displayName, so a props-only predicate (matching just accessibilityLabel)
// double-matches: once on the outer wrapper fiber, once on the inner one —
// same hazard documented in ReportListCard.test.tsx's findCard. Anchoring on
// `n.type === TouchableOpacity` (the module reference this file and
// ExportReportsTab.tsx both resolve to) narrows to the outer fiber only.
// Uses .find() (not .findAll()[0]) so a broken locator — or a second row
// this component didn't intend to render — throws instead of silently
// resolving to the wrong node.
const findSelectAllToggle = (r: Renderer) =>
  r.root.find(
    n =>
      n.type === TouchableOpacity &&
      (n.props?.accessibilityLabel === 'Select all reports' ||
        n.props?.accessibilityLabel === 'Clear all reports'),
  );

describe('ExportReportsTab', () => {
  beforeEach(() => {
    mockSetFabHidden.mockClear();
    mockRegisteredFooter = null;
    mockUseReportBrowser.mockReset();
    mockUseReportBrowser.mockImplementation(() => makeBrowserReturn());
  });

  it('renders every filtered report as a selectable row', () => {
    const r = render();
    const cards = r.root.findAllByType(ReportListCard);
    expect(cards).toHaveLength(2);
    expect(cards[0].props.selectable).toBe(true);
  });

  it('registers no selection bar until something is selected', () => {
    render();
    expect(mockRegisteredFooter).toBeNull();
  });

  it('reports the selected count once a row is ticked', () => {
    const r = render();
    selectRow(r, 0);
    expect(footerText()).toContain('1 selected');
  });

  describe('the Generate button', () => {
    // The most important assertion in this task: Generate must render
    // disabled with copy explaining why, never as a live-looking control that
    // silently does nothing — document generation is a separate spec/spike
    // not part of this branch. A future refactor that accidentally enables it
    // must fail this test.
    it('renders disabled, with copy saying document generation is not available yet', () => {
      const r = render();
      selectRow(r, 0);

      const footer = renderFooter();
      const generateButton = footer.root.findByType(Button);
      expect(generateButton.props.label).toBe('Generate');
      expect(generateButton.props.disabled).toBe(true);

      // Button.tsx computes accessibilityState.disabled from the `disabled`
      // prop it was given (`isInactive = disabled || loading`) and sets it on
      // the TouchableOpacity it renders internally — asserting that resolved,
      // screen-reader-visible value too, not just the prop ExportReportsTab
      // passed in, so a future rewrite of that computation can't quietly stop
      // propagating it.
      const innerTouchable = generateButton.findByType(TouchableOpacity);
      expect(innerTouchable.props.accessibilityState).toEqual({ disabled: true, busy: false });
      expect(innerTouchable.props.disabled).toBe(true);

      expect(JSON.stringify(footer.toJSON())).toContain(
        'Document generation arrives in a future release.',
      );
    });

    it('stays disabled regardless of how many reports are selected', () => {
      const r = render();
      act(() => { findSelectAllToggle(r).props.onPress(); });

      const generateButton = renderFooter().root.findByType(Button);
      expect(generateButton.props.disabled).toBe(true);
    });
  });

  describe('draft warning reflects the SELECTED reports, not the visible list', () => {
    it('shows no draft warning when zero of the selected reports are drafts', () => {
      const r = render();
      selectRow(r, 1); // r2 is submitted
      const footer = renderFooter();
      expect(() => footer.root.findByType(Badge)).toThrow();
      expect(footerText()).not.toContain('draft');
    });

    it('warns with the exact selected-vs-draft counts when some selected reports are drafts', () => {
      const r = render();
      selectRow(r, 0); // r1: draft
      selectRow(r, 1); // r2: submitted — selecting both keeps the draft count at 1, not 2
      expect(footerText()).toContain('2 selected');
      expect(footerText()).toContain('1 draft');
      expect(footerFlatText()).toContain('1 of 2 selected is a draft and may be incomplete.');
    });

    it('warns with plural counts when every selected report is a draft', () => {
      const bothDrafts: AllReportItem[] = [
        { ...mockReports[0], key: 'inspection-d1', reportId: 'd1', status: 'draft' },
        { ...mockReports[0], key: 'inspection-d2', reportId: 'd2', status: 'draft' },
      ];
      mockUseReportBrowser.mockImplementation(() => makeBrowserReturn({ reports: bothDrafts }));

      const r = render();
      toggleItem(r, bothDrafts[0]);
      toggleItem(r, bothDrafts[1]);

      expect(footerText()).toContain('2 selected');
      expect(footerText()).toContain('2 drafts');
      expect(footerFlatText()).toContain('2 of 2 selected are drafts and may be incomplete.');
    });
  });

  it('hides the FAB while a selection is active', () => {
    const r = render();
    selectRow(r, 0);
    expect(mockSetFabHidden).toHaveBeenLastCalledWith(true);
  });

  it('restores the FAB once the selection is cleared back to zero', () => {
    const r = render();
    selectRow(r, 0);
    expect(mockSetFabHidden).toHaveBeenLastCalledWith(true);

    selectRow(r, 0); // toggling the same row again deselects it
    expect(mockSetFabHidden).toHaveBeenLastCalledWith(false);
  });

  it('restores the FAB when the tab unmounts while a selection is still active', () => {
    const r = render();
    selectRow(r, 0);
    expect(mockSetFabHidden).toHaveBeenLastCalledWith(true);

    act(() => { r.unmount(); });
    expect(mockSetFabHidden).toHaveBeenLastCalledWith(false);
  });

  describe('select all', () => {
    it('selects and clears every filtered report at once', () => {
      const r = render();
      act(() => { findSelectAllToggle(r).props.onPress(); });
      expect(footerText()).toContain('2 selected');

      act(() => { findSelectAllToggle(r).props.onPress(); });
      expect(mockRegisteredFooter).toBeNull();
    });

    it('selects exactly the reports the current filter returned, not a fixed or larger count', () => {
      const threeReports: AllReportItem[] = [
        mockReports[0],
        mockReports[1],
        { ...mockReports[1], key: 'inspection-r3', reportId: 'r3', estabName: 'Gamma LLC' },
      ];
      mockUseReportBrowser.mockImplementation(() => makeBrowserReturn({ reports: threeReports }));

      const r = render();
      act(() => { findSelectAllToggle(r).props.onPress(); });

      const cards = r.root.findAllByType(ReportListCard);
      expect(cards).toHaveLength(3);
      expect(cards.every(c => c.props.selected === true)).toBe(true);
      expect(footerText()).toContain('3 selected');
    });

    it('flips its label from Select all to Clear all once everything is selected', () => {
      const r = render();
      expect(findSelectAllToggle(r).props.accessibilityLabel).toBe('Select all reports');

      act(() => { findSelectAllToggle(r).props.onPress(); });
      expect(findSelectAllToggle(r).props.accessibilityLabel).toBe('Clear all reports');
    });
  });

  describe('loading and empty states', () => {
    it('renders Skeleton placeholders while the browser is loading, not the report list', () => {
      mockUseReportBrowser.mockImplementation(() => makeBrowserReturn({ reports: [], loading: true }));
      const r = render();
      expect(r.root.findAllByType(Skeleton).length).toBeGreaterThan(0);
      expect(r.root.findAllByType(ReportListCard)).toHaveLength(0);
    });

    it('renders EmptyState when no reports exist and nothing is filtered', () => {
      mockUseReportBrowser.mockImplementation(() => makeBrowserReturn({ reports: [] }));
      const r = render();
      const empty = r.root.findByType(EmptyState);
      expect(empty.props.message).toBe('No reports to export yet.');
    });

    it('renders EmptyState with the filtered-empty message when a filter is active and matches nothing', () => {
      mockUseReportBrowser.mockImplementation(() =>
        makeBrowserReturn({ reports: [], activeFilterCount: 1 }),
      );
      const r = render();
      const empty = r.root.findByType(EmptyState);
      expect(empty.props.message).toBe('No reports match your filters.');
    });
  });
});
