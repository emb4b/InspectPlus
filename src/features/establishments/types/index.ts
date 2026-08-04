// ── Embedded object types — re-exported from the sync layer, which is the
// canonical source for JSONB shapes shared between Supabase and WatermelonDB ──

import type {
  PermitSnapshotItem,
  ProductLineItem,
} from '../../../services/sync/syncTypes';

export type { PermitSnapshotItem, ProductLineItem };

// ── Establishment operating_status values ─────────────────────────────────────
export type EstablishmentOperatingStatus =
  | 'Operational'
  | 'Temporarily Close'
  | 'Non-Operational';

// ── Sync status values (shared across all entities) ───────────────────────────
export type SyncStatus = 'pending' | 'synced' | 'conflict';

// ── Compliance tag — derived from report types ────────────────────────────────
// Used for display badges on EstablishmentCard
export type ComplianceTag =
  | 'Air Monitoring'
  | 'Water Monitoring'
  | 'Hazwaste'
  | 'EIA'
  | 'Survey';

// ── Full Establishment DTO — mirrors the establishments table ─────────────────
export interface EstablishmentDTO {
  id: string;                          // WatermelonDB internal ID
  estabId: string;                     // PK
  inspectorUid: string;                // FK → user_account.uid
  name: string;
  formerName: string | null;
  addressLine: string;
  barangay: string;
  city: string;
  province: string;
  geoLat: number | null;
  geoLng: number | null;
  natureOfBusiness: string;
  psicCode: string | null;
  product: string | null;
  yearEstablished: number | null;
  operatingStatus: EstablishmentOperatingStatus;
  operatingHoursDay: number | null;
  operatingDaysWeek: number | null;
  operatingDaysYear: number | null;
  productLines: ProductLineItem[];
  ownerName: string;
  managingHeadName: string;
  pcoName: string | null;
  pcoAccreditationNo: string | null;
  pcoEffectivity: string | null;
  phoneFax: string;
  email: string;
  contactPersonName: string;
  contactPersonPosition: string;
  denrPermits: PermitSnapshotItem[];
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  deviceId: string;
  isArchived: boolean;
  // Derived — computed from inspection_reports linked to this establishment
  complianceTags: ComplianceTag[];
}
