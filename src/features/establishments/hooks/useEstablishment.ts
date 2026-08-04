import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '../../../db/database';
import { Establishment, InspectionReport, SurveyReport } from '../../../db/models';
import { Q } from '@nozbe/watermelondb';
import type { EstablishmentDTO, ComplianceTag } from '../types';

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

// ── useEstablishments ─────────────────────────────────────────────────────────
// Fetches all establishments from local WatermelonDB, ordered by name.
// Accepts an optional search query that filters by name, address, or city.
// Re-fetches when search changes or when refetch() is called — refetch()
// returns a promise so callers (e.g. pull-to-refresh) can await completion.
//
// NOTE: When the sync layer is wired up, a successful pull will update
// WatermelonDB directly — just call refetch() from the sync completion
// callback to refresh this list without any other changes.
// ─────────────────────────────────────────────────────────────────────────────
export function useEstablishments(search = ''): UseEstablishmentsReturn {
  const [establishments, setEstablishments] = useState<EstablishmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guards against a stale, slower request clobbering a fresher one when
  // refetch() overlaps with the search-driven effect (or a rapid double pull).
  const requestId = useRef(0);

  const fetchEstablishments = useCallback(async (searchTerm: string) => {
    const id = ++requestId.current;
    try {
      setLoading(true);
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

      const filtered = q
        ? all.filter(
            e =>
              e.name.toLowerCase().includes(q) ||
              e.addressLine.toLowerCase().includes(q) ||
              e.city.toLowerCase().includes(q) ||
              e.province.toLowerCase().includes(q),
          )
        : all;

      // Sort by name ascending
      filtered.sort((a, b) => a.name.localeCompare(b.name));

      const dtos = await Promise.all(filtered.map(modelToDTO));

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
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstablishments(search);
  }, [search, fetchEstablishments]);

  const refetch = useCallback(
    () => fetchEstablishments(search),
    [fetchEstablishments, search],
  );

  return { establishments, loading, error, refetch };
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

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  air_monitoring: 'Air Monitoring',
  water_monitoring: 'Water Monitoring',
  hazardous_waste: 'Hazwaste Monitoring',
  eia: 'EIA',
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

export interface AllReportItem extends EstablishmentReportItem {
  estabId: string;
  estabName: string;
}

interface UseAllReportsReturn {
  reports: AllReportItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Fetches inspection + survey reports across ALL establishments (unlike
// useEstablishmentReports, which is scoped to one). Filters by search text
// (establishment name, report title, or control number) and by draft/
// submitted status. Survey reports have no backend-synced status yet, so
// they default to 'draft' — see AllReportItem/EstablishmentReportItem.
export function useAllReports(search = '', statusFilter: ReportStatusFilter = 'all'): UseAllReportsReturn {
  const [reports, setReports] = useState<AllReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const fetchAllReports = useCallback(async (searchTerm: string, status: ReportStatusFilter) => {
    const id = ++requestId.current;
    try {
      setLoading(true);
      setError(null);

      const [establishments, inspectionReports, surveyReports] = await Promise.all([
        database.collections.get<Establishment>('establishments').query().fetch(),
        database.collections.get<InspectionReport>('inspection_reports').query().fetch(),
        database.collections.get<SurveyReport>('survey_reports').query().fetch(),
      ]);

      const estabNameById = new Map(establishments.map(e => [e.estabId, e.name]));

      const items: AllReportItem[] = [
        ...inspectionReports.map(r => ({
          key: `inspection-${r.reportId}`,
          kind: 'inspection' as const,
          reportId: r.reportId,
          estabId: r.estabId,
          estabName: estabNameById.get(r.estabId) ?? 'Unknown establishment',
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
        const matchesSearch =
          !q ||
          item.estabName.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.controlNo?.toLowerCase().includes(q) ?? false);
        return matchesStatus && matchesSearch;
      });

      // Most recent first
      filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

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
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllReports(search, statusFilter);
  }, [search, statusFilter, fetchAllReports]);

  const refetch = useCallback(
    () => fetchAllReports(search, statusFilter),
    [fetchAllReports, search, statusFilter],
  );

  return { reports, loading, error, refetch };
}
