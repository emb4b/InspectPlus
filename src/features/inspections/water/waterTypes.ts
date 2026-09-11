import type { DynamicRow, ChecklistValue, YnValue } from '../../../components/form';
import {
  DAO_2005_10_CHECKLIST,
  NON_WWTP_TREATMENT_OTHERS,
  TREATMENT_OTHERS,
  WWTP_TYPE_OTHERS,
  PRIMARY_TREATMENT_OPTIONS,
  BIOLOGICAL_TREATMENT_OPTIONS,
  CHEMICAL_TREATMENT_OPTIONS,
} from './waterChecklistData';
import { getWaterbodyGroups, WATERBODY_NOT_LISTED } from '../../../constants/waterbodies';

export interface WwtpDetailCard {
  outletNo: string;
  wwtpDetail: string;
  dateOfInstallation: string;
  designCapacity: string;
  annualMaintenanceCost: string;
  outletLocation: string;
  receivingBodyOfWater: string;
  receivingBodyOfWaterOther: string;
  flowMeterDevice: string;
  flowRate: string;
}

export interface WwtpComponentCard {
  outletNo: string;
  wwtp: string;
  primaryTreatment: string[];
  primaryTreatmentOther: string;
  biologicalTreatment: string[];
  biologicalTreatmentOther: string;
  chemicalTreatment: string[];
  chemicalTreatmentOther: string;
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
  wwtpTypeOther: string;
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
  receivingBodyOfWaterOther: '',
  flowMeterDevice: '',
  flowRate: '',
});

export const emptyWwtpComponent = (outletNo: string): WwtpComponentCard => ({
  outletNo,
  wwtp: '',
  primaryTreatment: [],
  primaryTreatmentOther: '',
  biologicalTreatment: [],
  biologicalTreatmentOther: '',
  chemicalTreatment: [],
  chemicalTreatmentOther: '',
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
    wwtpTypeOther: '',
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

// ── Receiving body of water ──────────────────────────────────────────────────
// The field stores one string either way: the picked option, or - when the
// receiving water isn't on EMB's list - whatever the inspector typed. The
// form splits that back into a selection and a text box on open and rejoins
// it on save, so the record never holds a "Not listed (specify)" label
// standing in for a real name.

export function decodeReceivingBodyOfWater(
  stored: string,
  province: string,
): { selection: string; other: string } {
  if (!stored) return { selection: '', other: '' };
  const known = getWaterbodyGroups(province).some(g => g.options.includes(stored));
  return known
    ? { selection: stored, other: '' }
    : { selection: WATERBODY_NOT_LISTED, other: stored };
}

export function receivingBodyOfWaterForSave(selection: string, other: string): string {
  if (selection !== WATERBODY_NOT_LISTED) return selection;
  return other.trim();
}

// Both entry paths - the create form and the edit screen - write a whole
// outlet card, not one field at a time, so this is the boundary they
// actually share, exactly as wwtpComponentForSave is for section 5D. The
// specify key is blanked because the record holds one string: what the
// inspector typed is now *in* receivingBodyOfWater, and a copy left beside
// it would be text the next open has to reconcile.
export function wwtpDetailForSave(d: WwtpDetailCard): WwtpDetailCard {
  return {
    ...d,
    receivingBodyOfWater: receivingBodyOfWaterForSave(
      d.receivingBodyOfWater,
      d.receivingBodyOfWaterOther,
    ),
    receivingBodyOfWaterOther: '',
  };
}

export function describeReceivingBodyOfWater(detail: WwtpDetailCard): string {
  const value = receivingBodyOfWaterForSave(
    detail.receivingBodyOfWater,
    detail.receivingBodyOfWaterOther,
  );
  return value || '—';
}

// ── WWTP treatment components ────────────────────────────────────────────────
// Rows written before section 5D became checkboxes hold a comma-separated
// string here, because the field was one free-text box hinted
// "Comma-separated". Decoding is lenient and happens on read: no data
// migration, and a report nobody re-opens is never rewritten.

export function decodeTreatment(
  stored: unknown,
  options: string[],
): { selected: string[]; other: string } {
  const parts = Array.isArray(stored)
    ? stored.map(String)
    : typeof stored === 'string'
      ? stored.split(',').map(s => s.trim())
      : [];
  const selected: string[] = [];
  const unmatched: string[] = [];
  parts.filter(Boolean).forEach(part => {
    const match = options.find(o => o.toLowerCase() === part.toLowerCase());
    if (match) {
      if (!selected.includes(match)) selected.push(match);
    } else {
      unmatched.push(part);
    }
  });
  // What the list doesn't recognise is still what the inspector wrote, so it
  // moves under Others rather than being discarded.
  if (unmatched.length > 0 && !selected.includes(TREATMENT_OTHERS)) {
    selected.push(TREATMENT_OTHERS);
  }
  return { selected, other: unmatched.join(', ') };
}

// A stage's specify text can arrive two ways. A legacy row has no specify
// key at all - its unrecognised fragments are what decodeTreatment
// recovered. A row this build wrote keeps the text in its own key, and the
// array beside it normally holds nothing but ticks. Normally: if an option
// is later renamed, that array also carries an entry the list no longer
// knows, and then both parts are the inspector's words. So they are joined
// rather than one preferred - anything unrecognised is preserved verbatim,
// never displaced by the other copy.
const treatmentOtherFor = (recovered: string, stored: unknown): string =>
  [recovered, String(stored ?? '')].filter(Boolean).join(', ');

export function decodeWwtpComponent(stored: Record<string, unknown>): WwtpComponentCard {
  const primary = decodeTreatment(stored.primaryTreatment, PRIMARY_TREATMENT_OPTIONS);
  const biological = decodeTreatment(stored.biologicalTreatment, BIOLOGICAL_TREATMENT_OPTIONS);
  const chemical = decodeTreatment(stored.chemicalTreatment, CHEMICAL_TREATMENT_OPTIONS);
  return {
    outletNo: String(stored.outletNo ?? ''),
    wwtp: String(stored.wwtp ?? ''),
    primaryTreatment: primary.selected,
    primaryTreatmentOther: treatmentOtherFor(primary.other, stored.primaryTreatmentOther),
    biologicalTreatment: biological.selected,
    biologicalTreatmentOther: treatmentOtherFor(biological.other, stored.biologicalTreatmentOther),
    chemicalTreatment: chemical.selected,
    chemicalTreatmentOther: treatmentOtherFor(chemical.other, stored.chemicalTreatmentOther),
    otherTreatment: String(stored.otherTreatment ?? ''),
  };
}

// Same boundary nonWwtpTreatmentFor draws: text stranded by an untick would
// contradict the boxes beside it, so it never reaches the record.
export function treatmentForSave(
  selected: string[],
  other: string,
): { selected: string[]; other: string } {
  return { selected, other: selected.includes(TREATMENT_OTHERS) ? other.trim() : '' };
}

// Both entry paths - the create form and the edit screen - write a whole
// component card, not one stage at a time, so this is the boundary they
// actually share. Reconciling all three stages in one place means a fourth
// stage, or a rename, can't update one call site and silently leave the
// other persisting text stranded by an unticked Others.
export function wwtpComponentForSave(c: WwtpComponentCard): WwtpComponentCard {
  const primary = treatmentForSave(c.primaryTreatment, c.primaryTreatmentOther);
  const biological = treatmentForSave(c.biologicalTreatment, c.biologicalTreatmentOther);
  const chemical = treatmentForSave(c.chemicalTreatment, c.chemicalTreatmentOther);
  return {
    ...c,
    primaryTreatment: primary.selected,
    primaryTreatmentOther: primary.other,
    biologicalTreatment: biological.selected,
    biologicalTreatmentOther: biological.other,
    chemicalTreatment: chemical.selected,
    chemicalTreatmentOther: chemical.other,
  };
}

export function describeTreatment(selected: string[], other: string): string {
  if (selected.length === 0) return '—';
  return selected.map(s => (s === TREATMENT_OTHERS && other ? `${s}: ${other}` : s)).join(', ');
}

// ── Type of WWTP ─────────────────────────────────────────────────────────────
// "Others" says the plant is none of the listed kinds; this says which kind
// it is. Same boundary as nonWwtpTreatmentFor: text stranded by re-picking a
// listed type would contradict the choice beside it, so it never reaches the
// record.

export function wwtpTypeOtherForSave(wwtpType: string, other: string): string {
  return wwtpType === WWTP_TYPE_OTHERS ? other.trim() : '';
}

export function describeWwtpType(wwtpType: string, other: string): string {
  if (!wwtpType) return '—';
  return wwtpType === WWTP_TYPE_OTHERS && other ? `${wwtpType}: ${other}` : wwtpType;
}
