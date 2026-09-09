import type { ChecklistItemDef } from '../../../components/form';

export const DAO_2005_10_CHECKLIST: ChecklistItemDef[] = [
  { ref: 'Section 3', requirement: 'Discharge Permit (DP) is valid and posted at facility' },
  { ref: 'Section 4', requirement: 'Treated effluent meets DP effluent standards' },
  { ref: 'Section 5', requirement: 'Wastewater self-monitoring reports (SMR) submitted on schedule' },
  { ref: 'Section 6', requirement: 'Flow meter installed at each outlet and properly maintained' },
  { ref: 'Section 7', requirement: 'WWTP properly operated and maintained' },
  { ref: 'Section 8', requirement: 'Wastewater treatment records available and up to date' },
];

export const DOCUMENTS_REVIEWED_OPTIONS = [
  'Synology',
  'OPMS',
  'IIS Transactions',
  'CMR Online',
  'SMR Online',
  'PCO Online',
  'Others',
];

export const WATER_SOURCE_TYPES = [
  'Surface water',
  'Groundwater',
  'Water utilities',
  'Desalination',
  'Recycled',
  'Others',
];

export const WASTEWATER_USE_TYPES = [
  'Process',
  'Domestic',
  'Cooling',
  'Maintenance',
  'Storm drain',
  'Others',
];

// Section 4C (Quality of Abstracted Water) asks where the sampled water was
// drawn from in two steps: the broad source, then the specific one catered
// to it. Kept as a category -> options map so DynamicRowTable's `dependsOn`
// cascade can resolve the second dropdown from the first. Deliberately
// separate from WATER_SOURCE_TYPES above, which answers a different
// question in 4A (every supply the site draws on, utilities and recycled
// water included) - only abstracted water is sampled here.
export const ABSTRACTED_WATER_SOURCES = ['Surface Water', 'Ground Water'];

export const ABSTRACTED_WATER_SOURCE_SPECIFICS: Record<string, string[]> = {
  'Surface Water': ['Lake', 'River', 'Seawater'],
  'Ground Water': ['Deep well'],
};

// The `options` resolver both 4C tables (create form and edit screen) hand
// to DynamicRowTable. Shared so the row key the cascade reads from lives in
// one place rather than being restated at each call site. An unrecognised
// source - including the free text older reports stored here before this
// was a dropdown - yields no choices, leaving that cell inert until the
// source is re-picked.
export const abstractedWaterSourceSpecifics = (row: Record<string, string>): string[] =>
  ABSTRACTED_WATER_SOURCE_SPECIFICS[row.source] ?? [];

// Section 5A's follow-up, asked only when the establishment has no WWTP.
// A site can run more than one of these at once - a septic tank for
// domestic waste and a separator on the motor pool is an ordinary pairing -
// so these are checkboxes, not a single choice.
export const NON_WWTP_TREATMENT_OTHERS = 'Others';

export const NON_WWTP_TREATMENT_OPTIONS = [
  'Septic Tank',
  'Oil and Water Separator (OWS)',
  NON_WWTP_TREATMENT_OTHERS,
];

// Shared by the create form and the edit screen so the question an
// inspector answers reads identically to the one a reviewer sees.
export const NON_WWTP_TREATMENT_PROMPT =
  "Select the establishment's current wastewater treatment system:";

export const NON_WWTP_TREATMENT_OTHER_LABEL = 'Others (specify)';

export const WWTP_TYPE_OPTIONS = ['Physical', 'Biological', 'Chemical', 'Combined', 'Others'];

export const WWTP_CONDITION_OPTIONS = [
  'Properly Maintained',
  'Inadequately Maintained',
  'Poor Maintenance',
  'Others',
];

export const SAMPLE_TYPE_OPTIONS = ['Grab', 'Composite'];
