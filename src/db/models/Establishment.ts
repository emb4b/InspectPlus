import { Model } from '@nozbe/watermelondb';
import { field, json } from '@nozbe/watermelondb/decorators';
import type { PermitSnapshotItem, ProductLineItem } from '../../services/sync/syncTypes';

const asArray = (v: unknown) => (Array.isArray(v) ? v : []);

export class Establishment extends Model {
  static table = 'establishments';

  @field('estabId')               estabId!: string;
  @field('inspectorUid')          inspectorUid!: string;
  @field('name')                  name!: string;
  @field('formerName')            formerName!: string | null;
  @field('addressLine')           addressLine!: string;
  @field('barangay')              barangay!: string;
  @field('city')                  city!: string;
  @field('province')              province!: string;
  @field('geoLat')                geoLat!: number | null;
  @field('geoLng')                geoLng!: number | null;
  @field('natureOfBusiness')      natureOfBusiness!: string;
  @field('psicCode')              psicCode!: string | null;
  @field('product')               product!: string | null;
  @field('yearEstablished')       yearEstablished!: number | null;
  @field('operatingStatus')       operatingStatus!: string;
  @field('operatingHoursDay')     operatingHoursDay!: number | null;
  @field('operatingDaysWeek')     operatingDaysWeek!: number | null;
  @field('operatingDaysYear')     operatingDaysYear!: number | null;
  @field('operatingStatusSince')  operatingStatusSince!: string | null;
  @json('productLines', asArray)  productLines!: ProductLineItem[];
  @field('ownerName')             ownerName!: string;
  @field('managingHeadName')      managingHeadName!: string;
  @field('pcoName')               pcoName!: string | null;
  @field('pcoAccreditationNo')    pcoAccreditationNo!: string | null;
  @field('pcoEffectivity')        pcoEffectivity!: string | null;
  @field('phoneFax')              phoneFax!: string;
  @field('email')                 email!: string;
  @field('contactPersonName')     contactPersonName!: string;
  @field('contactPersonPosition') contactPersonPosition!: string;
  @json('denrPermits', asArray)   denrPermits!: PermitSnapshotItem[];
  @field('deviceId')              deviceId!: string;
  @field('createdAt')             createdAt!: string;
  @field('updatedAt')             updatedAt!: string;
  // ↓ 'syncState' instead of 'syncStatus' — avoids collision with
  //   WatermelonDB's internal Model.syncStatus property
  @field('syncState')             syncState!: string;
  @field('isArchived')            isArchived!: boolean;
  // JSON snapshot of the content fields as of the last successful sync — see
  // schema.ts's column comment and establishmentPersistence.ts's
  // resolveEstablishmentContentEdit. Null until the row has synced once.
  @field('lastSyncedSnapshot')    lastSyncedSnapshot!: string | null;
}
