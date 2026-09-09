import type { DynamicRow, ChecklistValue, YnValue } from '../../../components/form';
import { DAO_2005_10_CHECKLIST, NON_WWTP_TREATMENT_OTHERS } from './waterChecklistData';

export interface WwtpDetailCard {
  outletNo: string;
  wwtpDetail: string;
  dateOfInstallation: string;
  designCapacity: string;
  annualMaintenanceCost: string;
  outletLocation: string;
  receivingBodyOfWater: string;
  flowMeterDevice: string;
  flowRate: string;
}

export interface WwtpComponentCard {
  outletNo: string;
  primaryTreatment: string;
  biologicalTreatment: string;
  chemicalTreatment: string;
  otherTreatment: string;
}

export interface SamplingParameterRow {
  parameterName: string;
  value: string;
  unit: string;
  denrStandard: string;
  compliant: YnValue;
  remarks: string;
}

export interface SamplingPointCard {
  pointNo: string;
  samplingStation: string;
  samplingTime: string;
  typeOfSample: string;
  remarks: string;
  parameters: SamplingParameterRow[];
}

export interface PreviousInspectionState {
  dateOfSampling: string;
  samplingStation: string;
  samplingTime: string;
  typeOfSample: string;
  parameters: SamplingParameterRow[];
}

export interface DpConditionRow {
  conditionNo: string;
  description: string;
  compliant: YnValue;
  remarks: string;
}

export interface WaterComplianceFormState {
  waterSources: DynamicRow[];
  wastewaterSources: DynamicRow[];
  abstractedWaterQuality: DynamicRow[];
  hasWwtp: 'yes' | 'no' | null;
  // Only meaningful on the "no" branch, but kept in state regardless so
  // toggling Has WWTP doesn't destroy the answer - see
  // nonWwtpTreatmentForSave for where the record stops being that lenient.
  nonWwtpSystems: string[];
  nonWwtpOther: string;
  wwtpType: string;
  wwtpDetails: WwtpDetailCard[];
  wwtpComponents: WwtpComponentCard[];
  wwtpCondition: string;
  wwtpUnderConstruction: 'yes' | 'no' | null;
  samplingPoints: SamplingPointCard[];
  previousInspection: PreviousInspectionState;
  checklistDao200510: ChecklistValue[];
  dpConditions: DpConditionRow[];
  documentsReviewed: string[];
  otherObservations: string;
  remarksRecommendations: string;
}

export const emptySamplingParameter = (): SamplingParameterRow => ({
  parameterName: '',
  value: '',
  unit: '',
  denrStandard: '',
  compliant: null,
  remarks: '',
});

export const emptySamplingPoint = (pointNo: string): SamplingPointCard => ({
  pointNo,
  samplingStation: '',
  samplingTime: '',
  typeOfSample: '',
  remarks: '',
  parameters: [],
});

export const emptyWwtpDetail = (outletNo: string): WwtpDetailCard => ({
  outletNo,
  wwtpDetail: '',
  dateOfInstallation: '',
  designCapacity: '',
  annualMaintenanceCost: '',
  outletLocation: '',
  receivingBodyOfWater: '',
  flowMeterDevice: '',
  flowRate: '',
});

export const emptyWwtpComponent = (outletNo: string): WwtpComponentCard => ({
  outletNo,
  primaryTreatment: '',
  biologicalTreatment: '',
  chemicalTreatment: '',
  otherTreatment: '',
});

export const emptyDpCondition = (conditionNo: string): DpConditionRow => ({
  conditionNo,
  description: '',
  compliant: null,
  remarks: '',
});

export function emptyWaterComplianceForm(): WaterComplianceFormState {
  return {
    waterSources: [{ source_type: '', daily_m3: '', annual_m3: '', specify: '' }],
    wastewaterSources: [{ use_type: '', consumed_m3_day: '', generated_m3_day: '', outlet_info: '' }],
    abstractedWaterQuality: [{ source: '', specify: '', bod_cod: '', tss: '', avfp: '', heavy_metal: '' }],
    hasWwtp: null,
    nonWwtpSystems: [],
    nonWwtpOther: '',
    wwtpType: '',
    wwtpDetails: [],
    wwtpComponents: [],
    wwtpCondition: '',
    wwtpUnderConstruction: null,
    samplingPoints: [],
    previousInspection: {
      dateOfSampling: '',
      samplingStation: '',
      samplingTime: '',
      typeOfSample: '',
      parameters: [],
    },
    checklistDao200510: DAO_2005_10_CHECKLIST.map(() => ({ compliant: null, remarks: '' })),
    dpConditions: [emptyDpCondition('1')],
    documentsReviewed: [],
    otherObservations: '',
    remarksRecommendations: '',
  };
}

// What section 5A's treatment-system answer contributes to the record.
export interface NonWwtpTreatment {
  systems: string[];
  other: string;
}

// The boundary between a forgiving form and a strict record. The form keeps
// a selection alive while an inspector toggles "Has WWTP?" back and forth,
// so an accidental Yes costs nothing; the stored report is not that
// lenient, because a report describing both a WWTP and a septic tank leaves
// a reader no way to tell which one is real. Same reason the free text is
// dropped unless Others is actually ticked - text stranded by an untick
// would otherwise contradict the boxes beside it.
// The rule itself, shared by the create form and the edit screen so a
// report saved from either one stores the same thing.
export function nonWwtpTreatmentFor(
  hasNoWwtp: boolean,
  systems: string[],
  other: string,
): NonWwtpTreatment | Record<string, never> {
  if (!hasNoWwtp) return {};
  return {
    systems,
    other: systems.includes(NON_WWTP_TREATMENT_OTHERS) ? other.trim() : '',
  };
}

export function nonWwtpTreatmentForSave(
  form: WaterComplianceFormState,
): NonWwtpTreatment | Record<string, never> {
  return nonWwtpTreatmentFor(form.hasWwtp === 'no', form.nonWwtpSystems, form.nonWwtpOther);
}

// One line summarising the answer for read-only views, folding the free
// text into the Others tick it belongs to rather than showing an orphaned
// "Others" beside a separate box.
export function describeNonWwtpTreatment(systems: string[], other: string): string {
  if (systems.length === 0) return '—';
  return systems
    .map(s => (s === NON_WWTP_TREATMENT_OTHERS && other ? `${s}: ${other}` : s))
    .join(', ');
}
