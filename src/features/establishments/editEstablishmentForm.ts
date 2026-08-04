import type { DynamicRow } from '../../components/form';
import type { EstablishmentDTO, EstablishmentOperatingStatus } from './types';

// ── Edit Establishment form (dedicated shape — not GeneralInfoFormState) ──────
// GeneralInfoFormState (src/features/inspections/types.ts) is shared across
// every report-creation flow and doesn't carry `product`/`yearEstablished` —
// extending it would ripple into all of those. This screen edits the full
// establishment master record, so it gets its own form shape instead.
export interface EditEstablishmentFormState {
  name: string;
  includeFormerName: boolean;
  formerName: string;
  addressLine: string;
  barangay: string;
  city: string;
  province: string;
  natureOfBusiness: string;
  psicCode: string;
  product: string;
  yearEstablished: string;
  operatingStatus: EstablishmentOperatingStatus;
  operatingHoursDay: string;
  operatingDaysWeek: string;
  operatingDaysYear: string;
  ownerName: string;
  managingHeadName: string;
  pcoName: string;
  pcoAccreditationNo: string;
  pcoEffectivity: string;
  contactPersonName: string;
  contactPersonPosition: string;
  phoneFax: string;
  email: string;
  productLines: DynamicRow[]; // { product_line, ecc_production_rate, actual_production_rate }
}

export function buildEditFormFromEstablishment(estab: EstablishmentDTO): EditEstablishmentFormState {
  return {
    name: estab.name,
    includeFormerName: !!estab.formerName,
    formerName: estab.formerName ?? '',
    addressLine: estab.addressLine,
    barangay: estab.barangay,
    city: estab.city,
    province: estab.province,
    natureOfBusiness: estab.natureOfBusiness,
    psicCode: estab.psicCode ?? '',
    product: estab.product ?? '',
    yearEstablished: estab.yearEstablished != null ? String(estab.yearEstablished) : '',
    operatingStatus: estab.operatingStatus,
    operatingHoursDay: estab.operatingHoursDay != null ? String(estab.operatingHoursDay) : '',
    operatingDaysWeek: estab.operatingDaysWeek != null ? String(estab.operatingDaysWeek) : '',
    operatingDaysYear: estab.operatingDaysYear != null ? String(estab.operatingDaysYear) : '',
    ownerName: estab.ownerName,
    managingHeadName: estab.managingHeadName,
    pcoName: estab.pcoName ?? '',
    pcoAccreditationNo: estab.pcoAccreditationNo ?? '',
    pcoEffectivity: estab.pcoEffectivity ?? '',
    contactPersonName: estab.contactPersonName,
    contactPersonPosition: estab.contactPersonPosition,
    phoneFax: estab.phoneFax,
    email: estab.email,
    productLines: estab.productLines.length
      ? estab.productLines.map(p => ({
          product_line: p.product_line,
          ecc_production_rate: p.ecc_production_rate,
          actual_production_rate: p.actual_production_rate,
        }))
      : [{ product_line: '', ecc_production_rate: '', actual_production_rate: '' }],
  };
}
