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

export const WWTP_TYPE_OPTIONS = ['Physical', 'Biological', 'Chemical', 'Combined', 'Others'];

export const WWTP_CONDITION_OPTIONS = [
  'Properly Maintained',
  'Inadequately Maintained',
  'Poor Maintenance',
  'Others',
];

export const SAMPLE_TYPE_OPTIONS = ['Grab', 'Composite'];
