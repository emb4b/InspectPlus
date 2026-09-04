import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useReportBrowser } from './useReportBrowser';
import type { UseReportBrowserReturn } from './useReportBrowser';

const mockUseAllReports = jest.fn();
const mockUseEstablishmentFilterOptions = jest.fn();

// useReportBrowser pulls useAllReports/useEstablishmentFilterOptions from
// useEstablishment.ts, which constructs a real WatermelonDB SQLiteAdapter at
// import time (via db/database.ts) and transitively touches AsyncStorage and
// the Supabase client — none of that is relevant to the pure state-
// transition logic under test here, so stub the whole module the way
// useEstablishment.test.ts and ReportListCard.test.tsx already do for the
// same reason, rather than assembling that three-deep mock chain.
jest.mock('./useEstablishment', () => ({
  useAllReports: (...args: unknown[]) => mockUseAllReports(...args),
  useEstablishmentFilterOptions: () => mockUseEstablishmentFilterOptions(),
}));

type Renderer = TestRenderer.ReactTestRenderer;

function Harness({ onResult }: { onResult: (r: UseReportBrowserReturn) => void }) {
  onResult(useReportBrowser());
  return null;
}

// Mirrors the useMotion harness in design/__tests__/motion.test.tsx, extended
// to read the LATEST captured value after further `act()` calls drive state
// updates through the harness — `onResult` fires again on every re-render,
// so `probe.get()` always reflects the most recent render.
function createProbe() {
  let captured!: UseReportBrowserReturn;
  let renderer!: Renderer;
  act(() => {
    renderer = TestRenderer.create(<Harness onResult={r => { captured = r; }} />);
  });
  return {
    get: () => captured,
    unmount: () => act(() => renderer.unmount()),
  };
}

const REPORTS_STUB = [{ key: 'r1' }] as unknown as UseReportBrowserReturn['reports'];

describe('useReportBrowser', () => {
  beforeEach(() => {
    mockUseAllReports.mockReset().mockReturnValue({
      reports: REPORTS_STUB,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseEstablishmentFilterOptions.mockReset().mockReturnValue({
      provinceOptions: ['Palawan', 'Cebu'],
      inspectorOptions: [],
      loading: false,
    });
  });

  it('passes reports/loading/error/refetch and provinceOptions straight through from the underlying hooks', () => {
    const refetch = jest.fn();
    mockUseAllReports.mockReturnValue({ reports: REPORTS_STUB, loading: true, error: 'boom', refetch });

    const probe = createProbe();

    expect(probe.get().reports).toBe(REPORTS_STUB);
    expect(probe.get().loading).toBe(true);
    expect(probe.get().error).toBe('boom');
    expect(probe.get().refetch).toBe(refetch);
    expect(probe.get().provinceOptions).toEqual(['Palawan', 'Cebu']);
  });

  it('starts every field at the same defaults ManageReportsTab used to initialize with', () => {
    const probe = createProbe();

    expect(probe.get().state).toEqual({
      search: '',
      statusFilter: 'all',
      province: '',
      city: '',
      reportType: '',
      dateFrom: '',
      dateTo: '',
      sortOrder: 'newest',
    });
    expect(probe.get().activeFilterCount).toBe(0);
  });

  describe('state transitions', () => {
    it('setSearch updates only state.search', () => {
      const probe = createProbe();
      act(() => probe.get().setSearch('acme corp'));

      expect(probe.get().state.search).toBe('acme corp');
      expect(probe.get().state.statusFilter).toBe('all');
      expect(probe.get().state.province).toBe('');
    });

    it('setStatusFilter updates only state.statusFilter', () => {
      const probe = createProbe();
      act(() => probe.get().setStatusFilter('draft'));

      expect(probe.get().state.statusFilter).toBe('draft');
      expect(probe.get().state.search).toBe('');
    });

    it.each([
      ['setProvince', 'province', 'Palawan'] as const,
      ['setCity', 'city', 'Puerto Princesa'] as const,
      ['setReportType', 'reportType', 'air_monitoring'] as const,
      ['setDateFrom', 'dateFrom', '2026-01-01'] as const,
      ['setDateTo', 'dateTo', '2026-12-31'] as const,
    ])('%s updates only state.%s', (setter, field, value) => {
      const probe = createProbe();
      act(() => (probe.get()[setter] as (v: string) => void)(value));

      expect(probe.get().state[field]).toBe(value);
    });

    it('setSortOrder updates state.sortOrder', () => {
      const probe = createProbe();
      act(() => probe.get().setSortOrder('oldest'));

      expect(probe.get().state.sortOrder).toBe('oldest');
    });
  });

  describe('activeFilterCount', () => {
    it('counts province, city, reportType, dateFrom, and dateTo — matching the original [province, city, reportType, dateFrom, dateTo].filter(Boolean) logic', () => {
      const probe = createProbe();

      act(() => probe.get().setProvince('Palawan'));
      expect(probe.get().activeFilterCount).toBe(1);

      act(() => probe.get().setCity('Puerto Princesa'));
      expect(probe.get().activeFilterCount).toBe(2);

      act(() => probe.get().setReportType('air_monitoring'));
      expect(probe.get().activeFilterCount).toBe(3);

      act(() => probe.get().setDateFrom('2026-01-01'));
      expect(probe.get().activeFilterCount).toBe(4);

      act(() => probe.get().setDateTo('2026-12-31'));
      expect(probe.get().activeFilterCount).toBe(5);
    });

    it('does NOT count search, statusFilter, or sortOrder as active filters', () => {
      const probe = createProbe();

      act(() => probe.get().setSearch('acme'));
      act(() => probe.get().setStatusFilter('submitted'));
      act(() => probe.get().setSortOrder('oldest'));

      expect(probe.get().activeFilterCount).toBe(0);
    });
  });

  describe('clearFilters', () => {
    it('resets province, city, reportType, dateFrom, dateTo, and sortOrder to their defaults', () => {
      const probe = createProbe();

      act(() => {
        probe.get().setProvince('Palawan');
        probe.get().setCity('Puerto Princesa');
        probe.get().setReportType('air_monitoring');
        probe.get().setDateFrom('2026-01-01');
        probe.get().setDateTo('2026-12-31');
        probe.get().setSortOrder('oldest');
      });
      expect(probe.get().activeFilterCount).toBe(5);

      act(() => probe.get().clearFilters());

      expect(probe.get().state).toMatchObject({
        province: '',
        city: '',
        reportType: '',
        dateFrom: '',
        dateTo: '',
        sortOrder: 'newest',
      });
      expect(probe.get().activeFilterCount).toBe(0);
    });

    it('leaves search and statusFilter untouched — matching the original clearFilters, which never touched either', () => {
      const probe = createProbe();

      act(() => {
        probe.get().setSearch('acme');
        probe.get().setStatusFilter('draft');
        probe.get().setProvince('Palawan');
      });

      act(() => probe.get().clearFilters());

      expect(probe.get().state.search).toBe('acme');
      expect(probe.get().state.statusFilter).toBe('draft');
    });
  });

  describe('the filters object passed to useAllReports (fetch-loop guard)', () => {
    // useAllReports takes the filters object as an effect dependency (see
    // useEstablishment.ts), so a fresh object literal every render would
    // re-trigger its fetch on a loop — the exact bug the useMemo in
    // useReportBrowser exists to prevent. Assert the guarantee directly by
    // inspecting the object identity useAllReports actually received on
    // each render, rather than trusting the memoization is present.
    function lastFiltersArg(): unknown {
      const calls = mockUseAllReports.mock.calls;
      return calls[calls.length - 1][2];
    }

    it('stays referentially stable across a re-render that changes an unrelated field (search)', () => {
      const probe = createProbe();
      const before = lastFiltersArg();

      act(() => probe.get().setSearch('acme'));

      expect(lastFiltersArg()).toBe(before);
    });

    it('stays referentially stable across a re-render that changes another unrelated field (statusFilter)', () => {
      const probe = createProbe();
      const before = lastFiltersArg();

      act(() => probe.get().setStatusFilter('submitted'));

      expect(lastFiltersArg()).toBe(before);
    });

    it('changes identity when a filter field actually changes', () => {
      const probe = createProbe();
      const before = lastFiltersArg();

      act(() => probe.get().setProvince('Palawan'));

      expect(lastFiltersArg()).not.toBe(before);
      expect(lastFiltersArg()).toMatchObject({ province: 'Palawan' });
    });

    it('changes identity when sortOrder changes', () => {
      const probe = createProbe();
      const before = lastFiltersArg();

      act(() => probe.get().setSortOrder('oldest'));

      expect(lastFiltersArg()).not.toBe(before);
      expect(lastFiltersArg()).toMatchObject({ sortOrder: 'oldest' });
    });
  });
});
