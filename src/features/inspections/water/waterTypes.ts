import type { DynamicRow, ChecklistValue, YnValue } from '../../../components/form';
import { DAO_2005_10_CHECKLIST } from './waterChecklistData';

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
    abstractedWaterQuality: [{ source: '', bod_cod: '', tss: '', avfp: '', heavy_metal: '', specify: '' }],
    hasWwtp: null,
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
