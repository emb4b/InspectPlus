import type React from 'react';
import type { SvgProps } from 'react-native-svg';
import { REPORT_TYPES, ReportTypeKey } from '../../constants/reportTypes';
import { Colors } from '../../constants/colors';

// inspection_reports.report_type values (see useReportFormState.ts / REPORT_TYPE
// consts in each report-type form) → the ReportTypeKey used by REPORT_TYPES,
// which carries the icon asset + colors shown when picking a report type.
const DB_TYPE_TO_KEY: Record<string, ReportTypeKey> = {
  air_monitoring: 'air',
  water_monitoring: 'water',
  hazardous_waste: 'hazwaste_generator',
  eia: 'eia',
};

export interface ReportTypeMeta {
  label: string;
  law: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  // The Ionicons glyph the list card's tile uses for this type, so a report
  // can wear the same glyph on its own screen as it does in the list.
  iconName: string;
  iconAsset?: React.FC<SvgProps>;
}

export function getReportTypeMeta(reportType: string): ReportTypeMeta {
  const key = DB_TYPE_TO_KEY[reportType];
  const found = key ? REPORT_TYPES.find(t => t.key === key) : undefined;
  if (found) {
    return {
      label: found.title,
      law: found.law,
      textColor: found.textColor,
      bgColor: found.bgColor,
      borderColor: found.borderColor,
      iconName: found.iconName,
      iconAsset: found.iconAsset,
    };
  }
  return {
    label: reportType,
    law: '',
    textColor: Colors.textMuted,
    bgColor: Colors.bgLight,
    borderColor: Colors.border,
    iconName: 'document-outline',
  };
}
