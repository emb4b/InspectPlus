// The tagged EMB forms shipped in the binary, by inspection_reports.report_type
// (or 'survey'). A type with no entry can't be exported yet — the tab shows
// "No template yet" on its cards. Recipes live next to the templates; see
// scripts/docx-tag.js.
export interface TemplateEntry {
  label: string; // used in the output file name
  file: string;
  module: number;
}

export const TEMPLATES: Partial<Record<string, TemplateEntry>> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  water_monitoring: { label: 'Water Monitoring', file: 'water-monitoring.docx', module: require('../../../../assets/templates/water-monitoring.docx') },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  air_monitoring: { label: 'Air Monitoring', file: 'air-monitoring.docx', module: require('../../../../assets/templates/air-monitoring.docx') },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  eia: { label: 'EIA', file: 'eia.docx', module: require('../../../../assets/templates/eia.docx') },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  hazardous_waste: { label: 'Hazardous Waste Generators', file: 'hazardous-waste-generators.docx', module: require('../../../../assets/templates/hazardous-waste-generators.docx') },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  survey: { label: 'Survey', file: 'survey.docx', module: require('../../../../assets/templates/survey.docx') },
};

// How many `unused_N` checkbox placeholders each shared-block-only recipe
// names, in document order, for its type-specific checklist (see Task 13's
// report). Water and Survey have none: Water has its own full mapper, and
// Survey's options are plain "__" text blanks, not checkbox glyphs.
export const UNUSED_CHECKBOXES: Record<string, number> = {
  air_monitoring: 4,
  eia: 0,
  hazardous_waste: 2,
};

export const SURVEY_TEMPLATE_KEY = 'survey';

export function templateFor(kind: 'inspection' | 'survey', reportType: string): TemplateEntry | null {
  return (kind === 'survey' ? TEMPLATES[SURVEY_TEMPLATE_KEY] : TEMPLATES[reportType]) ?? null;
}

export function hasTemplate(kind: 'inspection' | 'survey', reportType: string): boolean {
  return templateFor(kind, reportType) !== null;
}
