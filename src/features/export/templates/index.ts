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
  water_monitoring: { label: 'Water Monitoring', file: 'Water Monitoring.docx', module: require('../../../../assets/templates/Water Monitoring.docx') },
};

export const SURVEY_TEMPLATE_KEY = 'survey';

export function templateFor(kind: 'inspection' | 'survey', reportType: string): TemplateEntry | null {
  return (kind === 'survey' ? TEMPLATES[SURVEY_TEMPLATE_KEY] : TEMPLATES[reportType]) ?? null;
}

export function hasTemplate(kind: 'inspection' | 'survey', reportType: string): boolean {
  return templateFor(kind, reportType) !== null;
}
