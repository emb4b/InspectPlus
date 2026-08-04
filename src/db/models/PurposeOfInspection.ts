import { Model } from '@nozbe/watermelondb';
import { field, json } from '@nozbe/watermelondb/decorators';
import type {
  VerifyInfoListItem,
  CheckCommitmentsListItem,
} from '../../services/sync/syncTypes';

const asArray = (v: unknown) => (Array.isArray(v) ? v : []);

// Independent per-visit entity — created before any inspection_reports row
// exists. A single purpose row can be shared by several reports generated
// from the same site visit (one per report type).
export class PurposeOfInspection extends Model {
  static table = 'purpose_of_inspection';

  @field('purposeId')                     purposeId!: string;
  @field('estabId')                       estabId!: string;
  @field('inspectorUid')                  inspectorUid!: string;
  @field('inspectionDate')                inspectionDate!: string;

  @field('verifyInfo')                    verifyInfo!: boolean;
  @json('verifyInfoList', asArray)        verifyInfoList!: VerifyInfoListItem[];

  @field('determineCompliance')           determineCompliance!: boolean;
  @field('investigateComplaints')         investigateComplaints!: boolean;

  @field('checkCommitments')              checkCommitments!: boolean;
  @json('checkCommitmentsList', asArray)  checkCommitmentsList!: CheckCommitmentsListItem[];

  @field('others')                        others!: string | null;

  @field('deviceId')                      deviceId!: string;
  @field('createdAt')                     createdAt!: string;
  @field('updatedAt')                     updatedAt!: string;
  // ↓ 'syncState' instead of 'syncStatus'
  @field('syncState')                     syncState!: string;
}
