import type { DynamicRow } from '../../components/form';
import type {
  VerifyInfoItemKey,
  VerifyInfoStatus,
  CheckCommitmentItemKey,
  PermitSnapshotItem,
  EstablishmentSnapshot,
} from '../../services/sync/syncTypes';
import type { EstablishmentDTO } from '../establishments/types';
import type { PurposeOfInspection } from '../../db/models';

// ── General Information tab (shared across all report types) ──────────────────
export interface GeneralInfoFormState {
  name: string;
  includeFormerName: boolean;
  formerName: string;
  addressLine: string;
  barangay: string;
  city: string;
  province: string;
  geoLat: string;
  geoLng: string;
  natureOfBusiness: string;
  psicCode: string;
  operatingStatus: string; // 'Operational' | 'Temporarily Close' | 'Non-Operational'
  operatingHoursDay: string;
  operatingDaysWeek: string;
  operatingDaysYear: string;
  ownerName: string;
  managingHeadName: string;
  contactPersonName: string;
  contactPersonPosition: string;
  phoneFax: string;
  email: string;
  pcoName: string;
  pcoAccreditationNo: string;
  pcoEffectivity: string;
  productLines: DynamicRow[]; // { product_line, ecc_production_rate, actual_production_rate }
  denrPermits: PermitSnapshotItem[];
}

// ── Purpose of Inspection tab (shared across all report types) ────────────────
export interface VerifyInfoRowState {
  itemKey: VerifyInfoItemKey;
  label: string;
  status: VerifyInfoStatus;
  remarks: string;
}

export interface CommitmentRowState {
  itemKey: CheckCommitmentItemKey;
  label: string;
  checked: boolean;
  remarks: string;
}

export interface PurposeFormState {
  inspectionDate: string;
  verifyInfo: boolean;
  verifyInfoRows: VerifyInfoRowState[];
  determineCompliance: boolean;
  investigateComplaints: boolean;
  checkCommitments: boolean;
  commitmentRows: CommitmentRowState[];
  others: string;
}

export const VERIFY_INFO_ROWS: { itemKey: VerifyInfoItemKey; label: string }[] = [
  { itemKey: 'pmpin', label: 'PMPIN Application' },
  { itemKey: 'hazwaste_id', label: 'Hazardous Waste ID Registration' },
  { itemKey: 'hazwaste_transporter', label: 'Hazardous Waste Transporter Registration' },
  { itemKey: 'hazwaste_tsd', label: 'Hazardous Waste TSD Registration' },
  { itemKey: 'pto_air', label: 'Permit to Operate Air Pollution' },
  { itemKey: 'discharge_permit', label: 'Discharge Permit' },
];

export const COMMITMENT_ROWS: { itemKey: CheckCommitmentItemKey; label: string }[] = [
  { itemKey: 'industrial_ecowatch', label: 'Industrial EcoWatch' },
  { itemKey: 'pepp', label: 'PEPP' },
  { itemKey: 'pab', label: 'PAB' },
  { itemKey: 'others', label: 'Others' },
];

// ── Blank form, used when creating a brand-new establishment ───────────────────
export function emptyGeneralInfoForm(): GeneralInfoFormState {
  return {
    name: '',
    includeFormerName: false,
    formerName: '',
    addressLine: '',
    barangay: '',
    city: '',
    province: '',
    geoLat: '',
    geoLng: '',
    natureOfBusiness: '',
    psicCode: '',
    operatingStatus: 'Operational',
    operatingHoursDay: '',
    operatingDaysWeek: '',
    operatingDaysYear: '',
    ownerName: '',
    managingHeadName: '',
    contactPersonName: '',
    contactPersonPosition: '',
    phoneFax: '',
    email: '',
    pcoName: '',
    pcoAccreditationNo: '',
    pcoEffectivity: '',
    productLines: [{ product_line: '', ecc_production_rate: '', actual_production_rate: '' }],
    denrPermits: [],
  };
}

// ── Establishment → form state, and back to snapshot shapes at save time ──────
export function buildGeneralInfoFromEstablishment(estab: EstablishmentDTO): GeneralInfoFormState {
  return {
    name: estab.name,
    includeFormerName: !!estab.formerName,
    formerName: estab.formerName ?? '',
    addressLine: estab.addressLine,
    barangay: estab.barangay,
    city: estab.city,
    province: estab.province,
    geoLat: estab.geoLat != null ? String(estab.geoLat) : '',
    geoLng: estab.geoLng != null ? String(estab.geoLng) : '',
    natureOfBusiness: estab.natureOfBusiness,
    psicCode: estab.psicCode ?? '',
    operatingStatus: estab.operatingStatus,
    operatingHoursDay: estab.operatingHoursDay != null ? String(estab.operatingHoursDay) : '',
    operatingDaysWeek: estab.operatingDaysWeek != null ? String(estab.operatingDaysWeek) : '',
    operatingDaysYear: estab.operatingDaysYear != null ? String(estab.operatingDaysYear) : '',
    ownerName: estab.ownerName,
    managingHeadName: estab.managingHeadName,
    contactPersonName: estab.contactPersonName,
    contactPersonPosition: estab.contactPersonPosition,
    phoneFax: estab.phoneFax,
    email: estab.email,
    pcoName: estab.pcoName ?? '',
    pcoAccreditationNo: estab.pcoAccreditationNo ?? '',
    pcoEffectivity: estab.pcoEffectivity ?? '',
    productLines: estab.productLines.length
      ? estab.productLines.map(p => ({
          product_line: p.product_line,
          ecc_production_rate: p.ecc_production_rate,
          actual_production_rate: p.actual_production_rate,
        }))
      : [{ product_line: '', ecc_production_rate: '', actual_production_rate: '' }],
    denrPermits: estab.denrPermits ?? [],
  };
}

export function buildEstablishmentSnapshot(g: GeneralInfoFormState, estabId: string): EstablishmentSnapshot {
  return {
    estab_id: estabId,
    name: g.name,
    former_name: g.includeFormerName ? g.formerName || null : null,
    address_line: g.addressLine,
    barangay: g.barangay,
    city: g.city,
    province: g.province,
    geo_lat: g.geoLat ? Number(g.geoLat) : null,
    geo_lng: g.geoLng ? Number(g.geoLng) : null,
    nature_of_business: g.natureOfBusiness,
    psic_code: g.psicCode || null,
    operating_status: g.operatingStatus,
    operating_hours_day: g.operatingHoursDay ? Number(g.operatingHoursDay) : null,
    operating_days_week: g.operatingDaysWeek ? Number(g.operatingDaysWeek) : null,
    operating_days_year: g.operatingDaysYear ? Number(g.operatingDaysYear) : null,
    owner_name: g.ownerName,
    managing_head_name: g.managingHeadName,
    pco_name: g.pcoName || null,
    pco_accreditation_no: g.pcoAccreditationNo || null,
    pco_effectivity: g.pcoEffectivity || null,
    phone_fax: g.phoneFax,
    email: g.email,
    contact_person_name: g.contactPersonName,
    contact_person_position: g.contactPersonPosition,
    product_lines: g.productLines
      .filter(p => p.product_line?.trim())
      .map(p => ({
        product_line: p.product_line ?? '',
        ecc_production_rate: p.ecc_production_rate ?? '',
        actual_production_rate: p.actual_production_rate ?? '',
      })),
  };
}

// Reconstructs a PurposeFormState from a saved purpose_of_inspection row —
// used by "Reuse Existing" to carry a past report's answers into a new one.
export function buildPurposeFormFromModel(model: PurposeOfInspection): PurposeFormState {
  return {
    inspectionDate: model.inspectionDate,
    verifyInfo: model.verifyInfo,
    verifyInfoRows: VERIFY_INFO_ROWS.map(r => {
      const saved = model.verifyInfoList.find(v => v.item_key === r.itemKey);
      return { ...r, status: saved?.status ?? null, remarks: saved?.remarks ?? '' };
    }),
    determineCompliance: model.determineCompliance,
    investigateComplaints: model.investigateComplaints,
    checkCommitments: model.checkCommitments,
    commitmentRows: COMMITMENT_ROWS.map(r => {
      const saved = model.checkCommitmentsList.find(v => v.item_key === r.itemKey);
      return { ...r, checked: !!saved, remarks: saved?.remarks ?? '' };
    }),
    others: model.others ?? '',
  };
}

export function emptyPurposeForm(inspectionDate: string): PurposeFormState {
  return {
    inspectionDate,
    verifyInfo: false,
    verifyInfoRows: VERIFY_INFO_ROWS.map(r => ({ ...r, status: null, remarks: '' })),
    determineCompliance: false,
    investigateComplaints: false,
    checkCommitments: false,
    commitmentRows: COMMITMENT_ROWS.map(r => ({ ...r, checked: false, remarks: '' })),
    others: '',
  };
}
