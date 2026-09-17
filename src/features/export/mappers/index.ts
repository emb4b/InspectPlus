import { UNUSED_CHECKBOXES } from '../templates';
import type { MapContext, ReportBundle, TemplateData } from '../types';
import { mapCommon } from './common';
import { UNTICKED } from './primitives';
import { mapSurvey } from './survey';
import { mapWater } from './water';

// Air, hazwaste and EIA's recipes name every checkbox glyph in their
// type-specific checklists `unused_1..N` (in document order) so the
// checkbox-count guard in docx-tag.js still passes; they need a value or
// nullGetter would blank them to '' and erase the printed box.
function unusedBoxes(count: number): TemplateData {
  const out: TemplateData = {};
  for (let i = 1; i <= count; i += 1) out[`unused_${i}`] = UNTICKED;
  return out;
}

// inspection_reports.report_type → mapper. Air, hazwaste and EIA print only
// the shared block until their forms exist (see the design spec).
export function mapBundle(bundle: ReportBundle, ctx: MapContext): TemplateData {
  if (bundle.kind === 'survey') return mapSurvey(bundle, ctx);
  switch (bundle.report.reportType) {
    case 'water_monitoring':
      return mapWater(bundle, ctx);
    case 'air_monitoring':
    case 'hazardous_waste':
    case 'eia':
      return { ...mapCommon(bundle, ctx), ...unusedBoxes(UNUSED_CHECKBOXES[bundle.report.reportType] ?? 0) };
    default:
      throw new Error(`No mapper for report type ${bundle.report.reportType}`);
  }
}
