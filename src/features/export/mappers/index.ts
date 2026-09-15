import type { MapContext, ReportBundle, TemplateData } from '../types';
import { mapCommon } from './common';
import { mapSurvey } from './survey';
import { mapWater } from './water';

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
      return mapCommon(bundle, ctx);
    default:
      throw new Error(`No mapper for report type ${bundle.report.reportType}`);
  }
}
