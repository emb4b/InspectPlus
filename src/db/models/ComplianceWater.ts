import { Model } from '@nozbe/watermelondb';
import { field, json } from '@nozbe/watermelondb/decorators';

const asArray  = (v: unknown) => (Array.isArray(v) ? v : []);
const asObject = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

export class ComplianceWater extends Model {
  static table = 'compliance_water';

  // ── Identifiers ─────────────────────────────────────────────────────────────
  @field('complianceId')              complianceId!: string;
  @field('reportId')                  reportId!: string;

  // ── Water usage ──────────────────────────────────────────────────────────────
  // Each item: { source_type, daily_m3, annual_m3, specify }
  @json('waterSources', asArray)             waterSources!: any[];
  // Each item: { use_type, consumed_m3_day, generated_m3_day, outlet_info }
  @json('wastewaterSources', asArray)        wastewaterSources!: any[];
  // Each item: { source, bod_cod, tss, avfp, heavy_metal, specify }
  @json('abstractedWaterQuality', asArray)   abstractedWaterQuality!: any[];

  // ── WWTP ─────────────────────────────────────────────────────────────────────
  @field('hasWwtp')                          hasWwtp!: boolean | null;
  // wwtpType: 'Physical' | 'Biological' | 'Chemical' | 'Others'
  @field('wwtpType')                         wwtpType!: string | null;
  // Each item: { outlet_no, wwtp_detail, date_of_installation,
  //   design_capacity, annual_maintenance_cost, outlet_location,
  //   receiving_body_of_water, flow_meter_device, flow_rate }
  @json('wwtpDetails', asArray)              wwtpDetails!: any[];
  // Each item: { outlet_no, primary_treatment[], biological_treatment[],
  //   chemical_treatment[], other_treatment }
  @json('wwtpComponents', asArray)           wwtpComponents!: any[];
  // wwtpCondition: 'Properly Maintained' | 'Inadequately Maintained' |
  //                'Poor Maintenance' | 'Others'
  @field('wwtpCondition')                    wwtpCondition!: string | null;
  @field('wwtpUnderConstruction')            wwtpUnderConstruction!: boolean | null;

  // ── Sampling ─────────────────────────────────────────────────────────────────
  // Each item: { point_no, sampling_station, sampling_time, type_of_sample,
  //   parameters[{ parameter_name, value, unit, denr_standard, compliant, remarks }],
  //   remarks }
  @json('samplingPoints', asArray)           samplingPoints!: any[];
  // { date_of_sampling, sampling_station, sampling_time, type_of_sample,
  //   parameters[] }
  @json('previousInspectionSummary', asObject) previousInspectionSummary!: Record<string, any>;

  // ── Checklists ───────────────────────────────────────────────────────────────
  // Each item: { legal_ref, requirement, compliant: 'Y'|'N'|'NA', remarks }
  @json('checklistDao200510', asArray)       checklistDao200510!: any[];
  // Each item: { condition_no, description, compliant: 'Y'|'N'|'NA', remarks }
  @json('dpConditions', asArray)             dpConditions!: any[];

  // ── Narrative fields ─────────────────────────────────────────────────────────
  @field('otherObservations')                otherObservations!: string | null;
  @field('remarksRecommendations')           remarksRecommendations!: string | null;
  @json('documentsReviewed', asArray)        documentsReviewed!: string[];

  // ↓ 'syncState' instead of 'syncStatus' — avoids collision with
  //   WatermelonDB's internal Model.syncStatus property
  @field('syncState')                        syncState!: string;
}
