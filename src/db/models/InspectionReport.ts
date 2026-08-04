import { Model } from '@nozbe/watermelondb';
import { field, json } from '@nozbe/watermelondb/decorators';
import type { EstablishmentSnapshot, PermitSnapshotItem } from '../../services/sync/syncTypes';

const asObject = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const asArray = (v: unknown) => (Array.isArray(v) ? v : []);

export class InspectionReport extends Model {
  static table = 'inspection_reports';

  @field('reportId')            reportId!: string;
  @field('estabId')             estabId!: string;
  @field('inspectorUid')        inspectorUid!: string;
  @field('purposeId')           purposeId!: string;
  @field('reportType')          reportType!: string;
  @field('reportControlNo')     reportControlNo!: string | null;
  @field('inspectionDate')      inspectionDate!: string;
  @json('establishmentSnapshot', asObject) establishmentSnapshot!: EstablishmentSnapshot;
  @json('permitsSnapshot', asArray)        permitsSnapshot!: PermitSnapshotItem[];
  @field('isArchived')          isArchived!: boolean;
  @field('deviceId')            deviceId!: string;
  @field('createdAt')           createdAt!: string;
  @field('updatedAt')           updatedAt!: string;
  @field('deletedAt')           deletedAt!: string | null;
  // ↓ 'syncState' instead of 'syncStatus'
  @field('syncState')           syncState!: string;
  // 'draft' | 'submitted'
  @field('reportStatus')        reportStatus!: string;
}
