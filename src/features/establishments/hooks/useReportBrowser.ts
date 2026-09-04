import { useCallback, useMemo, useState } from 'react';
import {
  useAllReports,
  useEstablishmentFilterOptions,
  AllReportItem,
  ReportFilters,
  ReportSortOrder,
  ReportStatusFilter,
} from './useEstablishment';

export interface ReportBrowserState {
  search: string;
  statusFilter: ReportStatusFilter;
  province: string;
  city: string;
  reportType: string;
  dateFrom: string;
  dateTo: string;
  sortOrder: ReportSortOrder;
}

export interface UseReportBrowserReturn {
  reports: AllReportItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  state: ReportBrowserState;
  provinceOptions: string[];
  activeFilterCount: number;
  setSearch: (value: string) => void;
  setStatusFilter: (value: ReportStatusFilter) => void;
  setProvince: (value: string) => void;
  setCity: (value: string) => void;
  setReportType: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setSortOrder: (value: ReportSortOrder) => void;
  clearFilters: () => void;
}

// The search/filter/sort state and the query behind it, lifted out of
// ManageReportsTab so ExportReportsTab drives identical filtering rather
// than reimplementing it.
//
// Pagination is deliberately NOT here: Manage pages its results for
// browsing, while Export needs the whole filtered set at once so "select all
// in this filter" means something. That split stays in each consumer.
export function useReportBrowser(): UseReportBrowserReturn {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<ReportSortOrder>('newest');

  const { provinceOptions } = useEstablishmentFilterOptions();

  // Stable reference so the filter object only changes when a filter value
  // actually changes — a fresh object literal every render would re-trigger
  // useAllReports' fetch effect on a loop.
  const filters: ReportFilters = useMemo(
    () => ({ province, city, reportType, dateFrom, dateTo, sortOrder }),
    [province, city, reportType, dateFrom, dateTo, sortOrder],
  );

  // Memoized for the same reason: consumers key effects off this (resetting
  // their page to 1), and a new object each render would fire those forever.
  const state = useMemo<ReportBrowserState>(
    () => ({ search, statusFilter, province, city, reportType, dateFrom, dateTo, sortOrder }),
    [search, statusFilter, province, city, reportType, dateFrom, dateTo, sortOrder],
  );

  const { reports, loading, error, refetch } = useAllReports(search, statusFilter, filters);

  const clearFilters = useCallback(() => {
    setProvince('');
    setCity('');
    setReportType('');
    setDateFrom('');
    setDateTo('');
    setSortOrder('newest');
  }, []);

  const activeFilterCount = [province, city, reportType, dateFrom, dateTo].filter(Boolean).length;

  return {
    reports,
    loading,
    error,
    refetch,
    state,
    provinceOptions,
    activeFilterCount,
    setSearch,
    setStatusFilter,
    setProvince,
    setCity,
    setReportType,
    setDateFrom,
    setDateTo,
    setSortOrder,
    clearFilters,
  };
}
