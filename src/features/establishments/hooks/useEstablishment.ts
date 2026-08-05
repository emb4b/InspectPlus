import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '../../../db/database';
import { Establishment, InspectionReport, SurveyReport } from '../../../db/models';
import { Q } from '@nozbe/watermelondb';
import type { EstablishmentDTO, ComplianceTag } from '../types';
import { resolveInspectorNames } from '../../../services/inspectorNames';

// ── Report type → compliance tag mapping ──────────────────────────────────────
// 'air_monitoring' | 'water_monitoring' | 'hazardous_waste' | 'eia'
// + survey_reports as a separate entity
const REPORT_TYPE_TO_TAG: Record<string, ComplianceTag> = {
  air_monitoring:   'Air Monitoring',
  water_monitoring: 'Water Monitoring',
  hazardous_waste:  'Hazwaste',
  eia:              'EIA',
};

// ── Map WatermelonDB model → EstablishmentDTO ──────────────────────────────────
async function modelToDTO(model: Establishment): Promise<EstablishmentDTO> {
  // Derive compliance tags from linked inspection reports
  const reports = await database.collections
    .get('inspection_reports')
    .query(Q.where('estabId', model.estabId))
    .fetch();

  const surveyReports = await database.collections
    .get('survey_reports')
    .query(Q.where('estabId', model.estabId))
    .fetch();

  const tagSet = new Set<ComplianceTag>();
  reports.forEach((r: any) => {
    const tag = REPORT_TYPE_TO_TAG[r.reportType];
    if (tag) tagSet.add(tag);
  });
  if (surveyReports.length > 0) tagSet.add('Survey');

  return {
    id:                     model.id,
    estabId:                model.estabId,
    inspectorUid:           model.inspectorUid,
    name:                   model.name,
    formerName:             model.formerName,
    addressLine:            model.addressLine,
    barangay:               model.barangay,
    city:                   model.city,
    province:               model.province,
    geoLat:                 model.geoLat,
    geoLng:                 model.geoLng,
    natureOfBusiness:       model.natureOfBusiness,
    psicCode:               model.psicCode,
    product:                model.product,
    yearEstablished:        model.yearEstablished,
    operatingStatus:        model.operatingStatus as any,
    operatingHoursDay:      model.operatingHoursDay,
    operatingDaysWeek:      model.operatingDaysWeek,
    operatingDaysYear:      model.operatingDaysYear,
    productLines:           model.productLines ?? [],
    ownerName:              model.ownerName,
    managingHeadName:       model.managingHeadName,
    pcoName:                model.pcoName,
    pcoAccreditationNo:     model.pcoAccreditationNo,
    pcoEffectivity:         model.pcoEffectivity,
    phoneFax:               model.phoneFax,
    email:                  model.email,
    contactPersonName:      model.contactPersonName,
    contactPersonPosition:  model.contactPersonPosition,
    denrPermits:            model.denrPermits ?? [],
    createdAt:              model.createdAt,
    updatedAt:              model.updatedAt,
    syncStatus:             model.syncState as any,
    deviceId:               model.deviceId,
    isArchived:             model.isArchived,
    complianceTags:         Array.from(tagSet),
  };
}

// ── Hook return type ──────────────────────────────────────────────────────────
interface UseEstablishmentsReturn {
  establishments: EstablishmentDTO[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface EstablishmentFilters {
  province?: string;
  inspectorUid?: string;
  complianceTag?: ComplianceTag | '';
}

const EMPTY_ESTABLISHMENT_FILTERS: EstablishmentFilters = {};

// ── useEstablishments ─────────────────────────────────────────────────────────
// Fetches all establishments from local WatermelonDB, ordered by name.
// Accepts an optional search query that filters by name, address, or city,
// plus optional region/inspector/compliance-type filters. Re-fetches when
// search or filters change or when refetch() is called — refetch() returns
// a promise so callers (e.g. pull-to-refresh) can await completion.
//
// NOTE: When the sync layer is wired up, a successful pull will update
// WatermelonDB directly — just call refetch() from the sync completion
// callback to refresh this list without any other changes.
// ─────────────────────────────────────────────────────────────────────────────
export function useEstablishments(
  search = '',
  filters: EstablishmentFilters = EMPTY_ESTABLISHMENT_FILTERS,
): UseEstablishmentsReturn {
  const [establishments, setEstablishments] = useState<EstablishmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guards against a stale, slower request clobbering a fresher one when
  // refetch() overlaps with the search-driven effect (or a rapid double pull).
  const requestId = useRef(0);

  // Only the very first fetch should show the full-screen spinner. Every
  // later fetch (search-as-you-type, refetch()) sets `loading` back to
  // true too if left ungated — which unmounts the search bar's TextInput
  // via the tab component's `if (loading) return <spinner>` and drops
  // native keyboard focus after every keystroke. Subsequent fetches just
  // update the list in place instead.
  const hasLoadedOnce = useRef(false);

  const fetchEstablishments = useCallback(async (searchTerm: string, f: EstablishmentFilters) => {
    const id = ++requestId.current;
    try {
      if (!hasLoadedOnce.current) setLoading(true);
      setError(null);

      const q = searchTerm.trim().toLowerCase();

      // Fetch all, then filter — WatermelonDB SQLite adapter supports
      // Q.where with string matching but case-insensitive LIKE requires
      // a raw query; filtering in JS is simpler and fast for typical
      // inspector-level dataset sizes (hundreds, not millions).
      const all = await database.collections
        .get<Establishment>('establishments')
        .query()
        .fetch();

      // Name-only — matching on address/city/province too used to pull in
      // unrelated establishments that merely shared a location with the
      // search term, which read as inaccurate results.
      let filtered = q
        ? all.filter(e => e.name.toLowerCase().includes(q))
        : all;

      if (f.province) filtered = filtered.filter(e => e.province === f.province);
      if (f.inspectorUid) filtered = filtered.filter(e => e.inspectorUid === f.inspectorUid);

      // Sort by name ascending
      filtered.sort((a, b) => a.name.localeCompare(b.name));

      let dtos = await Promise.all(filtered.map(modelToDTO));

      if (f.complianceTag) {
        dtos = dtos.filter(d => d.complianceTags.includes(f.complianceTag as ComplianceTag));
      }

      if (id === requestId.current) {
        setEstablishments(dtos);
      }
    } catch (err) {
      if (id === requestId.current) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load establishments.';
        setError(message);
        console.error('[useEstablishments]', err);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        hasLoadedOnce.current = true;
      }
    }
  }, []);

  useEffect(() => {
    fetchEstablishments(search, filters);
  }, [search, filters, fetchEstablishments]);

  const refetch = useCallback(
    () => fetchEstablishments(search, filters),
    [fetchEstablishments, search, filters],
  );

  return { establishments, loading, error, refetch };
}

// ── useEstablishmentFilterOptions ─────────────────────────────────────────────
// Derives the option lists for the Manage Establishments filter sheet: every
// province actually in use, and every inspector actually assigned to at
// least one establishment (resolved to a display name). Independent of the
// search/filter state above so the option lists don't shrink as filters
// are applied.
interface InspectorOption {
  uid: string;
  name: string;
}

interface UseEstablishmentFilterOptionsReturn {
  provinceOptions: string[];
  inspectorOptions: InspectorOption[];
  loading: boolean;
}

export function useEstablishmentFilterOptions(): UseEstablishmentFilterOptionsReturn {
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [inspectorOptions, setInspectorOptions] = useState<InspectorOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const all = await database.collections
          .get<Establishment>('establishments')
          .query()
          .fetch();

        const provinces = Array.from(new Set(all.map(e => e.province).filter(Boolean))).sort();
        const inspectorUids = Array.from(new Set(all.map(e => e.inspectorUid).filter(Boolean)));

        const names = await resolveInspectorNames(inspectorUids);
        const inspectors = inspectorUids
          .map(uid => ({ uid, name: names[uid] ?? uid }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled) {
          setProvinceOptions(provinces);
          setInspectorOptions(inspectors);
        }
      } catch (err) {
        console.error('[useEstablishmentFilterOptions]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { provinceOptions, inspectorOptions, loading };
}

// ── Hook return type for a single establishment ──────────────────────────────
interface UseEstablishmentReturn {
  establishment: EstablishmentDTO | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── useEstablishment ──────────────────────────────────────────────────────────
// Fetches a single establishment by estabId from local WatermelonDB.
// Used by the establishment detail screen (features/establishments/EstablishmentDetailScreen).
export function useEstablishment(estabId: string | undefined): UseEstablishmentReturn {
  const [establishment, setEstablishment] = useState<EstablishmentDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchEstablishment() {
      if (!estabId) {
        setEstablishment(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const matches = await database.collections
          .get<Establishment>('establishments')
          .query(Q.where('estabId', estabId))
          .fetch();

        if (!cancelled) {
          setEstablishment(matches.length ? await modelToDTO(matches[0]) : null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load establishment.';
          setError(message);
          console.error('[useEstablishment]', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEstablishment();
    return () => { cancelled = true; };
  }, [estabId, tick]);

  return { establishment, loading, error, refetch };
}

// ── Establishment reports (inspection + survey), for the detail screen ────────
export interface EstablishmentReportItem {
  key: string;
  kind: 'inspection' | 'survey';
  reportId: string;
  reportType: string;
  title: string;
  date: string;
  controlNo: string | null;
  status: string | null;
  // Linked purpose_of_inspection row id — only set for inspection-kind
  // items, used by "Reuse Existing" to copy a past report's purpose
  // answers into a new one. Survey reports have no linked purpose row.
  purposeId?: string;
}

export const INSPECTION_TYPE_LABELS: Record<string, string> = {
  air_monitoring: 'Air Monitoring',
  water_monitoring: 'Water Monitoring',
  hazardous_waste: 'Hazwaste Monitoring',
  eia: 'EIA',
  survey: 'Survey',
};

interface UseEstablishmentReportsReturn {
  reports: EstablishmentReportItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEstablishmentReports(estabId: string | undefined): UseEstablishmentReportsReturn {
  const [reports, setReports] = useState<EstablishmentReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchReports() {
      if (!estabId) {
        setReports([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const [inspectionReports, surveyReports] = await Promise.all([
          database.collections
            .get<InspectionReport>('inspection_reports')
            .query(Q.where('estabId', estabId))
            .fetch(),
          database.collections
            .get<SurveyReport>('survey_reports')
            .query(Q.where('estabId', estabId))
            .fetch(),
        ]);

        const items: EstablishmentReportItem[] = [
          ...inspectionReports.map(r => ({
            key: `inspection-${r.reportId}`,
            kind: 'inspection' as const,
            reportId: r.reportId,
            reportType: r.reportType,
            title: INSPECTION_TYPE_LABELS[r.reportType] ?? r.reportType,
            date: r.inspectionDate,
            controlNo: r.reportControlNo,
            status: r.reportStatus,
            purposeId: r.purposeId,
          })),
          ...surveyReports.map(r => ({
            key: `survey-${r.surveyId}`,
            kind: 'survey' as const,
            reportId: r.surveyId,
            reportType: 'survey',
            title: r.projectName || 'Survey Report',
            date: r.inspectionDate,
            controlNo: r.reportControlNumber,
            // Mobile-only field, absent on rows written before it existed.
            status: r.reportStatus ?? 'draft',
          })),
        ];

        // Most recent first
        items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

        if (!cancelled) setReports(items);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load reports.';
          setError(message);
          console.error('[useEstablishmentReports]', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReports();
    return () => { cancelled = true; };
  }, [estabId, tick]);

  return { reports, loading, error, refetch };
}

// ── All reports across establishments, for the "Manage Reports" tab ───────────
export type ReportStatusFilter = 'all' | 'draft' | 'submitted';
export type ReportSortOrder = 'newest' | 'oldest';

export interface AllReportItem extends EstablishmentReportItem {
  estabId: string;
  estabName: string;
  estabProvince: string;
}

export interface ReportFilters {
  province?: string;
  reportType?: string;
  dateFrom?: string; // YYYY-MM-DD, inclusive
  dateTo?: string;   // YYYY-MM-DD, inclusive
  sortOrder?: ReportSortOrder;
}

const EMPTY_REPORT_FILTERS: ReportFilters = {};

interface UseAllReportsReturn {
  reports: AllReportItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Fetches inspection + survey reports across ALL establishments (unlike
// useEstablishmentReports, which is scoped to one). Filters by search text
// (establishment name, report title, or control number), draft/submitted
// status, and optional region/report-type/date-range filters. Survey
// reports have no backend-synced status yet, so they default to 'draft' —
// see AllReportItem/EstablishmentReportItem.
export function useAllReports(
  search = '',
  statusFilter: ReportStatusFilter = 'all',
  filters: ReportFilters = EMPTY_REPORT_FILTERS,
): UseAllReportsReturn {
  const [reports, setReports] = useState<AllReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  // Same rationale as useEstablishments — only gate the full-screen
  // spinner on the very first load, so search/filter changes don't
  // unmount (and defocus) the search TextInput on every keystroke.
  const hasLoadedOnce = useRef(false);

  const fetchAllReports = useCallback(async (
    searchTerm: string,
    status: ReportStatusFilter,
    f: ReportFilters,
  ) => {
    const id = ++requestId.current;
    try {
      if (!hasLoadedOnce.current) setLoading(true);
      setError(null);

      const [establishments, inspectionReports, surveyReports] = await Promise.all([
        database.collections.get<Establishment>('establishments').query().fetch(),
        database.collections.get<InspectionReport>('inspection_reports').query().fetch(),
        database.collections.get<SurveyReport>('survey_reports').query().fetch(),
      ]);

      const estabNameById = new Map(establishments.map(e => [e.estabId, e.name]));
      const estabProvinceById = new Map(establishments.map(e => [e.estabId, e.province]));

      const items: AllReportItem[] = [
        ...inspectionReports.map(r => ({
          key: `inspection-${r.reportId}`,
          kind: 'inspection' as const,
          reportId: r.reportId,
          estabId: r.estabId,
          estabName: estabNameById.get(r.estabId) ?? 'Unknown establishment',
          estabProvince: estabProvinceById.get(r.estabId) ?? '',
          reportType: r.reportType,
          title: INSPECTION_TYPE_LABELS[r.reportType] ?? r.reportType,
          date: r.inspectionDate,
          controlNo: r.reportControlNo,
          status: r.reportStatus,
          purposeId: r.purposeId,
        })),
        ...surveyReports.map(r => ({
          key: `survey-${r.surveyId}`,
          kind: 'survey' as const,
          reportId: r.surveyId,
          estabId: r.estabId,
          estabName: estabNameById.get(r.estabId) ?? 'Unknown establishment',
          estabProvince: estabProvinceById.get(r.estabId) ?? '',
          reportType: 'survey',
          title: r.projectName || 'Survey Report',
          date: r.inspectionDate,
          controlNo: r.reportControlNumber,
          status: r.reportStatus ?? 'draft',
        })),
      ];

      const q = searchTerm.trim().toLowerCase();
      const filtered = items.filter(item => {
        const matchesStatus = status === 'all' || item.status === status;
        // Name-only — matching on report title/control-no too used to pull
        // in unrelated reports that merely shared a word with the search
        // term, which read as inaccurate results.
        const matchesSearch = !q || item.estabName.toLowerCase().includes(q);
        const matchesProvince = !f.province || item.estabProvince === f.province;
        const matchesReportType = !f.reportType || item.reportType === f.reportType;
        const matchesDateFrom = !f.dateFrom || item.date >= f.dateFrom;
        const matchesDateTo = !f.dateTo || item.date <= f.dateTo;
        return (
          matchesStatus &&
          matchesSearch &&
          matchesProvince &&
          matchesReportType &&
          matchesDateFrom &&
          matchesDateTo
        );
      });

      const sortDir = f.sortOrder === 'oldest' ? 1 : -1;
      filtered.sort((a, b) => (a.date < b.date ? -sortDir : a.date > b.date ? sortDir : 0));

      if (id === requestId.current) {
        setReports(filtered);
      }
    } catch (err) {
      if (id === requestId.current) {
        const message = err instanceof Error ? err.message : 'Failed to load reports.';
        setError(message);
        console.error('[useAllReports]', err);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        hasLoadedOnce.current = true;
      }
    }
  }, []);

  useEffect(() => {
    fetchAllReports(search, statusFilter, filters);
  }, [search, statusFilter, filters, fetchAllReports]);

  const refetch = useCallback(
    () => fetchAllReports(search, statusFilter, filters),
    [fetchAllReports, search, statusFilter, filters],
  );

  return { reports, loading, error, refetch };
}
