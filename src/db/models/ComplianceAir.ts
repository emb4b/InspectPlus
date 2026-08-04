import { Model } from '@nozbe/watermelondb';
import { field, json } from '@nozbe/watermelondb/decorators';

const asArray = (v: unknown) => (Array.isArray(v) ? v : []);

export class ComplianceAir extends Model {
  static table = 'compliance_air';

  // ── Identifiers ─────────────────────────────────────────────────────────────
  @field('complianceId')         complianceId!: string;
  @field('reportId')             reportId!: string;

  // ── Emission sources ─────────────────────────────────────────────────────────
  // Each item: { source_no, type, rated_capacity, fuel_type,
  //              fuel_quantity, operating_capacity, control_facility, notes }
  @json('emissionSources', asArray)    emissionSources!: any[];

  // ── Checklists ───────────────────────────────────────────────────────────────
  // Each item: { legal_ref, requirement, compliant: 'Y'|'N'|'NA', remarks }
  @json('checklistDao200426', asArray) checklistDao200426!: any[];
  @json('checklistDao200081', asArray) checklistDao200081!: any[];
  @json('checklistEmbMc', asArray)     checklistEmbMc!: any[];

  // ── Permit to Operate conditions ─────────────────────────────────────────────
  // Each item: { condition_no, description, compliant: 'Y'|'N'|'NA', remarks }
  @json('ptoConditions', asArray)      ptoConditions!: any[];

  // ── Narrative fields ─────────────────────────────────────────────────────────
  @field('otherObservations')          otherObservations!: string | null;
  @field('remarksRecommendations')     remarksRecommendations!: string | null;

  // ── Documents reviewed ───────────────────────────────────────────────────────
  // Values: 'Synology' | 'OPMS' | 'IIS Transactions' | 'CMR Online' |
  //         'SMR Online' | 'PCO Online' | 'Others'
  @json('documentsReviewed', asArray)  documentsReviewed!: string[];
}
