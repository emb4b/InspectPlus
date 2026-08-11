import { useState, useCallback } from 'react';
import { database, collections } from '../../../db/database';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { generateId } from '../../../utils/crypto';
import { getDeviceId } from '../../../utils/device';
import { createEstablishmentRecord, resolveEstablishmentContentEdit } from '../establishmentPersistence';
import { notifySyncDataChanged } from '../../../services/sync/syncEvents';
import {
  GeneralInfoFormState,
  PurposeFormState,
  buildEstablishmentSnapshot,
  emptyPurposeForm,
} from '../types';
import type {
  VerifyInfoListItem,
  CheckCommitmentsListItem,
} from '../../../services/sync/syncTypes';

export type ReportSaveStatus = 'draft' | 'submitted';

interface UseReportFormStateOptions {
  // Pass the existing estab_id when reporting on an establishment — this
  // covers both one picked from the list and one just created via the
  // quick-create modal (which persists the row immediately, before this
  // hook ever runs). null is only a fallback for callers that haven't
  // created the row yet; a fresh id is generated and the row is created,
  // rather than found and updated, at save time.
  estabId: string | null;
  initialGeneralInfo: GeneralInfoFormState;
  initialInspectionDate?: string;
  // Pre-filled Purpose of Inspection answers — e.g. carried over from the
  // Add Report split panel, or copied from a past report via "Reuse
  // Existing". Falls back to a blank form when omitted.
  initialPurpose?: PurposeFormState;
  initialControlNumber?: string;
  reportType: string;
}

// Called inside the shared database.write transaction, after the
// purpose_of_inspection + inspection_reports rows have been created, so the
// caller can create its own type-specific compliance row(s) using the same
// reportId. Must NOT open its own database.write — it already runs inside
// one. Kept generic so other report types can reuse this hook later.
type WriteComplianceFn = (args: { reportId: string }) => Promise<void>;

function nowIso() {
  return new Date().toISOString();
}

export function useReportFormState({
  estabId,
  initialGeneralInfo,
  initialInspectionDate,
  initialPurpose,
  initialControlNumber,
  reportType,
}: UseReportFormStateOptions) {
  const { session } = useAuthContext();
  const inspectorUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';

  const today = nowIso().slice(0, 10);

  const [generalInfo, setGeneralInfo] = useState<GeneralInfoFormState>(initialGeneralInfo);
  const [purpose, setPurpose] = useState<PurposeFormState>(
    () => initialPurpose ?? emptyPurposeForm(initialInspectionDate || today),
  );
  const [controlNumber, setControlNumber] = useState(initialControlNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = useCallback(
    async (status: ReportSaveStatus, writeCompliance: WriteComplianceFn) => {
      setSaving(true);
      setSaveError(null);
      try {
        const deviceId = await getDeviceId();
        const resolvedEstabId = estabId ?? generateId();
        const purposeId = generateId();
        const reportId = generateId();
        const now = nowIso();

        const verifyInfoList: VerifyInfoListItem[] = purpose.verifyInfoRows
          .filter(r => r.status || r.remarks.trim())
          .map(r => ({ item_key: r.itemKey, status: r.status, remarks: r.remarks || null }));

        const checkCommitmentsList: CheckCommitmentsListItem[] = purpose.commitmentRows
          .filter(r => r.checked)
          .map(r => ({ item_key: r.itemKey, remarks: r.remarks || null }));

        const establishmentSnapshot = buildEstablishmentSnapshot(generalInfo, resolvedEstabId);
        const permitsSnapshot = generalInfo.denrPermits.filter(p => p.permit_serial?.trim());
        const productLines = generalInfo.productLines
          .filter(p => p.product_line?.trim())
          .map(p => ({
            product_line: p.product_line ?? '',
            ecc_production_rate: p.ecc_production_rate ?? '',
            actual_production_rate: p.actual_production_rate ?? '',
          }));

        await database.write(async () => {
          if (estabId) {
            // Keep the live establishment record current with any edits
            // made on the General Information tab — but only if something
            // actually changed. Every report save used to touch and re-flag
            // the establishment unconditionally, which meant adding a report
            // always marked an otherwise-untouched establishment as pending
            // sync too.
            const estabRecord = await collections.establishments.find(estabId);
            const nextEstabFields = {
              name: generalInfo.name,
              formerName: generalInfo.includeFormerName ? generalInfo.formerName || null : null,
              addressLine: generalInfo.addressLine,
              barangay: generalInfo.barangay,
              city: generalInfo.city,
              province: generalInfo.province,
              geoLat: generalInfo.geoLat ? Number(generalInfo.geoLat) : null,
              geoLng: generalInfo.geoLng ? Number(generalInfo.geoLng) : null,
              natureOfBusiness: generalInfo.natureOfBusiness,
              psicCode: generalInfo.psicCode || null,
              operatingStatus: generalInfo.operatingStatus,
              operatingHoursDay: generalInfo.operatingHoursDay ? Number(generalInfo.operatingHoursDay) : null,
              operatingDaysWeek: generalInfo.operatingDaysWeek ? Number(generalInfo.operatingDaysWeek) : null,
              operatingDaysYear: generalInfo.operatingDaysYear ? Number(generalInfo.operatingDaysYear) : null,
              operatingStatusSince: generalInfo.operatingStatusSince || null,
              ownerName: generalInfo.ownerName,
              managingHeadName: generalInfo.managingHeadName,
              contactPersonName: generalInfo.contactPersonName,
              contactPersonPosition: generalInfo.contactPersonPosition,
              phoneFax: generalInfo.phoneFax,
              email: generalInfo.email,
              pcoName: generalInfo.pcoName || null,
              pcoAccreditationNo: generalInfo.pcoAccreditationNo || null,
              pcoEffectivity: generalInfo.pcoEffectivity || null,
              productLines,
              denrPermits: permitsSnapshot,
            } as const;

            const resolved = resolveEstablishmentContentEdit(
              estabRecord as unknown as Record<string, unknown> & { syncState: string; lastSyncedSnapshot?: string | null },
              nextEstabFields,
            );

            if (resolved.isDirty) {
              await estabRecord.update(rec => {
                Object.assign(rec, nextEstabFields);
                rec.updatedAt = now;
                rec.syncState = resolved.syncState;
              });
            }
          } else {
            // Brand-new establishment that wasn't already persisted by the
            // quick-create modal (e.g. an older draft) — insert it now so
            // the report can reference a real row.
            await createEstablishmentRecord({ estabId: resolvedEstabId, inspectorUid, deviceId, generalInfo });
          }

          await collections.purposeOfInspection.create(rec => {
            rec._raw.id = purposeId;
            rec.purposeId = purposeId;
            rec.estabId = resolvedEstabId;
            rec.inspectorUid = inspectorUid;
            rec.inspectionDate = purpose.inspectionDate;
            rec.verifyInfo = purpose.verifyInfo;
            rec.verifyInfoList = verifyInfoList;
            rec.determineCompliance = purpose.determineCompliance;
            rec.investigateComplaints = purpose.investigateComplaints;
            rec.checkCommitments = purpose.checkCommitments;
            rec.checkCommitmentsList = checkCommitmentsList;
            rec.others = purpose.others || null;
            rec.deviceId = deviceId;
            rec.createdAt = now;
            rec.updatedAt = now;
            rec.syncState = 'pending_create';
          });

          await collections.inspectionReports.create(rec => {
            rec._raw.id = reportId;
            rec.reportId = reportId;
            rec.estabId = resolvedEstabId;
            rec.inspectorUid = inspectorUid;
            rec.purposeId = purposeId;
            rec.reportType = reportType;
            rec.reportControlNo = controlNumber.trim() || null;
            rec.inspectionDate = purpose.inspectionDate;
            rec.establishmentSnapshot = establishmentSnapshot;
            rec.permitsSnapshot = permitsSnapshot;
            rec.isArchived = false;
            rec.deviceId = deviceId;
            rec.createdAt = now;
            rec.updatedAt = now;
            rec.deletedAt = null;
            rec.syncState = 'pending_create';
            rec.reportStatus = status;
          });

          await writeCompliance({ reportId });
        });

        // Home's establishment/report lists don't observe WatermelonDB
        // directly (see useEstablishments et al.) — this is what makes a
        // newly created/drafted/submitted report show up there once the
        // caller navigates back, instead of only after a manual pull-to-refresh.
        notifySyncDataChanged();

        return { reportId, estabId: resolvedEstabId };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save report.';
        setSaveError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [estabId, generalInfo, purpose, controlNumber, inspectorUid, reportType],
  );

  return {
    generalInfo,
    setGeneralInfo,
    purpose,
    setPurpose,
    controlNumber,
    setControlNumber,
    saving,
    saveError,
    save,
  };
}
