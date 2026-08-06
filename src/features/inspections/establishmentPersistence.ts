import { collections } from '../../db/database';
import { GeneralInfoFormState } from './types';
import type { EditEstablishmentFormState } from '../establishments/editEstablishmentForm';

interface CreateEstablishmentArgs {
  estabId: string;
  inspectorUid: string;
  deviceId: string;
  generalInfo: GeneralInfoFormState;
}

// Shared by the quick-create modal (creates immediately, before any report
// exists) and useReportFormState's save path (creates as part of the report
// transaction) so both insert identically-shaped rows. Must be called inside
// a database.write — it doesn't open its own.
export async function createEstablishmentRecord({
  estabId,
  inspectorUid,
  deviceId,
  generalInfo,
}: CreateEstablishmentArgs): Promise<void> {
  const now = new Date().toISOString();
  const productLines = generalInfo.productLines
    .filter(p => p.product_line?.trim())
    .map(p => ({
      product_line: p.product_line ?? '',
      ecc_production_rate: p.ecc_production_rate ?? '',
      actual_production_rate: p.actual_production_rate ?? '',
    }));
  const permitsSnapshot = generalInfo.denrPermits.filter(p => p.permit_serial?.trim());

  await collections.establishments.create(rec => {
    rec._raw.id = estabId;
    rec.estabId = estabId;
    rec.inspectorUid = inspectorUid;
    rec.name = generalInfo.name;
    rec.formerName = generalInfo.includeFormerName ? generalInfo.formerName || null : null;
    rec.addressLine = generalInfo.addressLine;
    rec.barangay = generalInfo.barangay;
    rec.city = generalInfo.city;
    rec.province = generalInfo.province;
    rec.geoLat = generalInfo.geoLat ? Number(generalInfo.geoLat) : null;
    rec.geoLng = generalInfo.geoLng ? Number(generalInfo.geoLng) : null;
    rec.natureOfBusiness = generalInfo.natureOfBusiness;
    rec.psicCode = generalInfo.psicCode || null;
    rec.operatingStatus = generalInfo.operatingStatus;
    rec.operatingHoursDay = generalInfo.operatingHoursDay ? Number(generalInfo.operatingHoursDay) : null;
    rec.operatingDaysWeek = generalInfo.operatingDaysWeek ? Number(generalInfo.operatingDaysWeek) : null;
    rec.operatingDaysYear = generalInfo.operatingDaysYear ? Number(generalInfo.operatingDaysYear) : null;
    rec.ownerName = generalInfo.ownerName;
    rec.managingHeadName = generalInfo.managingHeadName;
    rec.contactPersonName = generalInfo.contactPersonName;
    rec.contactPersonPosition = generalInfo.contactPersonPosition;
    rec.phoneFax = generalInfo.phoneFax;
    rec.email = generalInfo.email;
    rec.pcoName = generalInfo.pcoName || null;
    rec.pcoAccreditationNo = generalInfo.pcoAccreditationNo || null;
    rec.pcoEffectivity = generalInfo.pcoEffectivity || null;
    rec.productLines = productLines;
    rec.denrPermits = permitsSnapshot;
    rec.deviceId = deviceId;
    rec.createdAt = now;
    rec.updatedAt = now;
    rec.syncState = 'pending_create';
    rec.isArchived = false;
  });
}

interface UpdateEstablishmentArgs {
  estabId: string;
  form: EditEstablishmentFormState;
}

// Used by the Edit Establishment screen. Same field-mapping conventions as
// createEstablishmentRecord — must be called inside a database.write, it
// doesn't open its own. Only sets the fields the edit form manages; geoLat/
// geoLng/denrPermits/isArchived/deviceId/inspectorUid/createdAt are left as-is.
export async function updateEstablishmentRecord({ estabId, form }: UpdateEstablishmentArgs): Promise<void> {
  const now = new Date().toISOString();
  const productLines = form.productLines
    .filter(p => p.product_line?.trim())
    .map(p => ({
      product_line: p.product_line ?? '',
      ecc_production_rate: p.ecc_production_rate ?? '',
      actual_production_rate: p.actual_production_rate ?? '',
    }));

  const estabRecord = await collections.establishments.find(estabId);
  await estabRecord.update(rec => {
    rec.name = form.name;
    rec.formerName = form.includeFormerName ? form.formerName || null : null;
    rec.addressLine = form.addressLine;
    rec.barangay = form.barangay;
    rec.city = form.city;
    rec.province = form.province;
    rec.natureOfBusiness = form.natureOfBusiness;
    rec.psicCode = form.psicCode || null;
    rec.product = form.product || null;
    rec.yearEstablished = form.yearEstablished ? Number(form.yearEstablished) : null;
    rec.operatingStatus = form.operatingStatus;
    rec.operatingHoursDay = form.operatingHoursDay ? Number(form.operatingHoursDay) : null;
    rec.operatingDaysWeek = form.operatingDaysWeek ? Number(form.operatingDaysWeek) : null;
    rec.operatingDaysYear = form.operatingDaysYear ? Number(form.operatingDaysYear) : null;
    rec.ownerName = form.ownerName;
    rec.managingHeadName = form.managingHeadName;
    rec.contactPersonName = form.contactPersonName;
    rec.contactPersonPosition = form.contactPersonPosition;
    rec.phoneFax = form.phoneFax;
    rec.email = form.email;
    rec.pcoName = form.pcoName || null;
    rec.pcoAccreditationNo = form.pcoAccreditationNo || null;
    rec.pcoEffectivity = form.pcoEffectivity || null;
    rec.productLines = productLines;
    rec.updatedAt = now;
    rec.syncState = 'pending_update';
  });
}
