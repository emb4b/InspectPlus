import type { PermitSnapshotItem } from '../../../services/sync/syncTypes';

// ── Two-row tab structure for the water inspection report ──────────────────
// Row 1 = main sections (numbered 1-6, matching the report template's own
// section numbering). Row 2 = subsections of the active main section, shown
// only when that section has any — lettered A-E for sections 4 and 5, roman
// numerals I-V for section 6 (mirrors the template's own marker style per
// section rather than a single scheme across all of them).

export type WaterMainTabKey =
  | 'geninfo'
  | 'purpose'
  | 'compliance'
  | 'watersupply'
  | 'wastewaterpollution'
  | 'samplingfindings';

export type WaterSupplySubKey = 'waterSources' | 'wastewaterSources' | 'abstractedWaterQuality';

export type WastewaterPollutionSubKey =
  | 'treatmentSystemType'
  | 'wwtpType'
  | 'wwtpDetails'
  | 'wwtpComponents'
  | 'wwtpCondition';

export type SamplingFindingsSubKey =
  | 'samplingPoints'
  | 'previousInspection'
  | 'summaryOfFindings'
  | 'dpConditions'
  | 'observations';

export interface WaterSubTabDef<K extends string = string> {
  key: K;
  marker: string;
  label: string;
}

export interface WaterMainTabDef {
  key: WaterMainTabKey;
  number: string;
  label: string;
  subTabs?: WaterSubTabDef[];
}

const WATER_SUPPLY_SUBTABS: WaterSubTabDef<WaterSupplySubKey>[] = [
  { key: 'waterSources', marker: 'A', label: 'Water Sources' },
  { key: 'wastewaterSources', marker: 'B', label: 'Wastewater Sources' },
  { key: 'abstractedWaterQuality', marker: 'C', label: 'Quality of Abstracted Water' },
];

const WASTEWATER_POLLUTION_SUBTABS: WaterSubTabDef<WastewaterPollutionSubKey>[] = [
  { key: 'treatmentSystemType', marker: 'A', label: 'Type of Wastewater Treatment System' },
  { key: 'wwtpType', marker: 'B', label: 'Type of WWTP' },
  { key: 'wwtpDetails', marker: 'C', label: 'WWTP Details' },
  { key: 'wwtpComponents', marker: 'D', label: 'Components of the WWTP' },
  { key: 'wwtpCondition', marker: 'E', label: 'Condition of the WWTP' },
];

const SAMPLING_FINDINGS_SUBTABS: WaterSubTabDef<SamplingFindingsSubKey>[] = [
  { key: 'samplingPoints', marker: 'I', label: 'Water Quality Sampling' },
  { key: 'previousInspection', marker: 'II', label: 'Previous Inspection' },
  { key: 'summaryOfFindings', marker: 'III', label: 'Summary of Findings' },
  { key: 'dpConditions', marker: 'IV', label: 'Compliance to DP Conditions' },
  { key: 'observations', marker: 'V', label: 'Observations and Recommendations' },
];

// The "Compliance to DP Conditions" subsection only applies when the
// establishment has an existing Discharge Permit on record — inferred from
// its DENR permits list rather than a dedicated flag, since that's the only
// place a DP shows up today (see the "DENR Permits, Licenses & Clearances"
// section under "3. Compliance Status").
export function establishmentHasDischargePermit(permits: PermitSnapshotItem[]): boolean {
  return permits.some(p => /discharge permit/i.test(p.permit_type) || /discharge permit/i.test(p.envi_law));
}

export function buildWaterReportTabs(hasDp: boolean): WaterMainTabDef[] {
  return [
    { key: 'geninfo', number: '1', label: 'General Information' },
    { key: 'purpose', number: '2', label: 'Purpose of Inspection' },
    { key: 'compliance', number: '3', label: 'Compliance Status' },
    { key: 'watersupply', number: '4', label: 'Water Supply and Wastewater Generation', subTabs: WATER_SUPPLY_SUBTABS },
    { key: 'wastewaterpollution', number: '5', label: 'Information on Wastewater Pollution', subTabs: WASTEWATER_POLLUTION_SUBTABS },
    {
      key: 'samplingfindings',
      number: '6',
      label: 'Sampling and Compliance Findings',
      subTabs: hasDp ? SAMPLING_FINDINGS_SUBTABS : SAMPLING_FINDINGS_SUBTABS.filter(t => t.key !== 'dpConditions'),
    },
  ];
}
