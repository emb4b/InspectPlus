import { useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { collections } from '../../../db/database';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { isEstablishmentVisible, isPrivilegedRole } from '../../establishments/hooks/useEstablishment';
import { buildPurposeFormFromModel, PurposeFormState } from '../types';
import type { EstablishmentSnapshot, PermitSnapshotItem } from '../../../services/sync/syncTypes';
import type { YnValue } from '../../../components/form';
import type {
  WwtpDetailCard,
  WwtpComponentCard,
  SamplingPointCard,
  DpConditionRow,
  PreviousInspectionState,
} from '../water/waterTypes';

export interface InspectionReportSummary {
  reportId: string;
  estabId: string;
  inspectorUid: string;
  purposeId: string;
  reportType: string;
  reportControlNo: string | null;
  inspectionDate: string;
  reportStatus: string;
  syncState: string;
  establishmentSnapshot: EstablishmentSnapshot;
  permitsSnapshot: PermitSnapshotItem[];
  createdAt: string;
  updatedAt: string;
}

// legal_ref/requirement + Y/N/NA + remarks — the common shape every
// checklist_* JSONB array uses across compliance_water/hazwaste/air/eia.
export interface ChecklistEntry {
  legal_ref?: string;
  requirement?: string;
  compliant: YnValue;
  remarks?: string | null;
  [key: string]: unknown;
}

// condition_no/description (permit & HWID conditions) OR
// requirement/ecc_description (EIA ECC-EMP conditions) + Y/N/NA + remarks.
export interface ConditionEntry {
  condition_no?: string;
  description?: string;
  requirement?: string;
  relevant_ecc_no?: string;
  ecc_description?: string;
  compliant: YnValue;
  remarks?: string | null;
  proof_of_compliance?: string | null;
  [key: string]: unknown;
}

export interface ChecklistGroup {
  title: string;
  items: ChecklistEntry[];
}

export interface WaterComplianceView {
  kind: 'water';
  complianceId: string;
  waterSources: Record<string, unknown>[];
  wastewaterSources: Record<string, unknown>[];
  abstractedWaterQuality: Record<string, unknown>[];
  hasWwtp: boolean | null;
  wwtpType: string | null;
  // wwtpDetails/wwtpComponents/samplingPoints/dpConditions are written by
  // the create flow (WaterInspectionFormScreen -> useReportFormState) using
  // WaterComplianceFormState's camelCase field names verbatim, unlike the
  // rest of this schema's snake_case JSONB convention — see waterTypes.ts.
  wwtpDetails: WwtpDetailCard[];
  wwtpComponents: WwtpComponentCard[];
  wwtpCondition: string | null;
  wwtpUnderConstruction: boolean | null;
  samplingPoints: SamplingPointCard[];
  previousInspectionSummary: PreviousInspectionState;
  checklistDao200510: ChecklistEntry[];
  dpConditions: DpConditionRow[];
  otherObservations: string | null;
  remarksRecommendations: string | null;
  documentsReviewed: string[];
}

export interface HazwasteComplianceView {
  kind: 'hazwaste';
  hazwasteGeneratorId: string | null;
  hazwasteIdDateIssued: string | null;
  wasteTypesGenerated: Record<string, unknown>[];
  checklists: ChecklistGroup[];
  hwidConditions: ConditionEntry[];
  otherObservations: string | null;
  remarksRecommendations: string | null;
  documentsReviewed: string[];
}

export interface AirComplianceView {
  kind: 'air';
  emissionSources: Record<string, unknown>[];
  checklists: ChecklistGroup[];
  ptoConditions: ConditionEntry[];
  otherObservations: string | null;
  remarksRecommendations: string | null;
  documentsReviewed: string[];
}

export interface EiaComplianceView {
  kind: 'eia';
  checklistDao200330: ChecklistEntry[];
  eccEmpConditions: ConditionEntry[];
  otherObservations: string | null;
  remarksRecommendations: string | null;
  documentsReviewed: string[];
}

export type ComplianceView =
  | WaterComplianceView
  | HazwasteComplianceView
  | AirComplianceView
  | EiaComplianceView
  | { kind: 'none' };

interface UseInspectionReportReturn {
  report: InspectionReportSummary | null;
  purpose: PurposeFormState | null;
  compliance: ComplianceView;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Loads a single inspection report plus its linked purpose_of_inspection and
// type-specific compliance_* row from local WatermelonDB, for the read-only
// report detail screen. Follows the same fetch-once + tick-refetch shape as
// useEstablishment.ts.
export function useInspectionReport(reportId: string | undefined): UseInspectionReportReturn {
  const [report, setReport] = useState<InspectionReportSummary | null>(null);
  const [purpose, setPurpose] = useState<PurposeFormState | null>(null);
  const [compliance, setCompliance] = useState<ComplianceView>({ kind: 'none' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const { session, province, role } = useAuthContext();
  const myUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const myProvince = province ?? '';
  const myRole = role ?? '';
  const ready = !!myUid && !!myProvince;

  const refetch = () => setTick(t => t + 1);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!reportId || !ready) {
        setReport(null);
        setPurpose(null);
        setCompliance({ kind: 'none' });
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const reportMatches = await collections.inspectionReports
          .query(Q.where('reportId', reportId))
          .fetch();
        let reportModel: typeof reportMatches[number] | undefined = reportMatches[0];

        // Jurisdiction check, mirroring the "inspectors can read
        // jurisdiction inspection reports" / "admins and developers can
        // read all inspection reports" RLS policies: visible if this
        // inspector wrote it, the role is unrestricted, or its
        // establishment is jurisdiction-visible. A non-visible report is
        // treated exactly like "not found".
        if (reportModel && reportModel.inspectorUid !== myUid && !isPrivilegedRole(myRole)) {
          const estabMatches = await collections.establishments
            .query(Q.where('estabId', reportModel.estabId))
            .fetch();
          const estab = estabMatches[0];
          if (!estab || !isEstablishmentVisible(estab, myProvince, myUid, myRole)) {
            reportModel = undefined;
          }
        }

        if (!reportModel) {
          if (!cancelled) {
            setReport(null);
            setPurpose(null);
            setCompliance({ kind: 'none' });
          }
          return;
        }

        const summary: InspectionReportSummary = {
          reportId: reportModel.reportId,
          estabId: reportModel.estabId,
          inspectorUid: reportModel.inspectorUid,
          purposeId: reportModel.purposeId,
          reportType: reportModel.reportType,
          reportControlNo: reportModel.reportControlNo,
          inspectionDate: reportModel.inspectionDate,
          reportStatus: reportModel.reportStatus,
          syncState: reportModel.syncState,
          establishmentSnapshot: reportModel.establishmentSnapshot,
          permitsSnapshot: reportModel.permitsSnapshot ?? [],
          createdAt: reportModel.createdAt,
          updatedAt: reportModel.updatedAt,
        };

        const purposeMatches = await collections.purposeOfInspection
          .query(Q.where('purposeId', reportModel.purposeId))
          .fetch();
        const purposeForm = purposeMatches[0] ? buildPurposeFormFromModel(purposeMatches[0]) : null;

        let complianceView: ComplianceView = { kind: 'none' };

        if (reportModel.reportType === 'water_monitoring') {
          const rows = await collections.complianceWater
            .query(Q.where('reportId', reportModel.reportId))
            .fetch();
          const c = rows[0];
          if (c) {
            complianceView = {
              kind: 'water',
              complianceId: c.complianceId,
              waterSources: c.waterSources ?? [],
              wastewaterSources: c.wastewaterSources ?? [],
              abstractedWaterQuality: c.abstractedWaterQuality ?? [],
              hasWwtp: c.hasWwtp,
              wwtpType: c.wwtpType,
              wwtpDetails: c.wwtpDetails ?? [],
              wwtpComponents: c.wwtpComponents ?? [],
              wwtpCondition: c.wwtpCondition,
              wwtpUnderConstruction: c.wwtpUnderConstruction,
              samplingPoints: c.samplingPoints ?? [],
              previousInspectionSummary: {
                dateOfSampling: c.previousInspectionSummary?.dateOfSampling ?? '',
                samplingStation: c.previousInspectionSummary?.samplingStation ?? '',
                samplingTime: c.previousInspectionSummary?.samplingTime ?? '',
                typeOfSample: c.previousInspectionSummary?.typeOfSample ?? '',
                parameters: c.previousInspectionSummary?.parameters ?? [],
              },
              checklistDao200510: c.checklistDao200510 ?? [],
              dpConditions: c.dpConditions ?? [],
              otherObservations: c.otherObservations,
              remarksRecommendations: c.remarksRecommendations,
              documentsReviewed: c.documentsReviewed ?? [],
            };
          }
        } else if (reportModel.reportType === 'hazardous_waste') {
          const rows = await collections.complianceHazwaste
            .query(Q.where('reportId', reportModel.reportId))
            .fetch();
          const c = rows[0];
          if (c) {
            complianceView = {
              kind: 'hazwaste',
              hazwasteGeneratorId: c.hazwasteGeneratorId,
              hazwasteIdDateIssued: c.hazwasteIdDateIssued,
              wasteTypesGenerated: c.wasteTypesGenerated ?? [],
              checklists: [
                { title: 'Registration', items: c.checklistRegistration ?? [] },
                { title: 'Storage', items: c.checklistStorage ?? [] },
                { title: 'Packaging', items: c.checklistPackaging ?? [] },
                { title: 'Labeling', items: c.checklistLabeling ?? [] },
                { title: 'Transport', items: c.checklistTransport ?? [] },
                { title: 'Emergency Preparedness', items: c.checklistEmergency ?? [] },
                { title: 'Personnel Training', items: c.checklistPersonnelTraining ?? [] },
                { title: 'Manifest System', items: c.checklistManifestSystem ?? [] },
              ],
              hwidConditions: c.hwidConditions ?? [],
              otherObservations: c.otherObservations,
              remarksRecommendations: c.remarksRecommendations,
              documentsReviewed: c.documentsReviewed ?? [],
            };
          }
        } else if (reportModel.reportType === 'air_monitoring') {
          const rows = await collections.complianceAir
            .query(Q.where('reportId', reportModel.reportId))
            .fetch();
          const c = rows[0];
          if (c) {
            complianceView = {
              kind: 'air',
              emissionSources: c.emissionSources ?? [],
              checklists: [
                { title: 'DAO 2000-81', items: c.checklistDao200081 ?? [] },
                { title: 'DAO 2004-26', items: c.checklistDao200426 ?? [] },
                { title: 'EMB Memorandum Circular', items: c.checklistEmbMc ?? [] },
              ],
              ptoConditions: c.ptoConditions ?? [],
              otherObservations: c.otherObservations,
              remarksRecommendations: c.remarksRecommendations,
              documentsReviewed: c.documentsReviewed ?? [],
            };
          }
        } else if (reportModel.reportType === 'eia') {
          const rows = await collections.complianceEia
            .query(Q.where('reportId', reportModel.reportId))
            .fetch();
          const c = rows[0];
          if (c) {
            complianceView = {
              kind: 'eia',
              checklistDao200330: c.checklistDao200330 ?? [],
              eccEmpConditions: c.eccEmpConditions ?? [],
              otherObservations: c.otherObservations,
              remarksRecommendations: c.remarksRecommendations,
              documentsReviewed: c.documentsReviewed ?? [],
            };
          }
        }

        if (!cancelled) {
          setReport(summary);
          setPurpose(purposeForm);
          setCompliance(complianceView);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load inspection report.';
          setError(message);
          console.error('[useInspectionReport]', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [reportId, tick, ready, myProvince, myUid, myRole]);

  return { report, purpose, compliance, loading, error, refetch };
}
