import type React from 'react';
import type { SvgProps } from 'react-native-svg';
import type { ReportDataKey } from './reportTypeDisplay';
import { Colors } from '../design/colors';

export type ReportTypeKey =
  | 'air'
  | 'water'
  | 'hazwaste_generator'
  | 'hazwaste_tsd'
  | 'eia'
  | 'survey';

export interface ReportType {
  key: ReportTypeKey;
  // Which recorded-report bucket this create-flow produces. The two hazwaste
  // entries both resolve to 'hazardous_waste' — see reportTypeDisplay.ts.
  dataKey: ReportDataKey;
  // Compact label for the speed dial, where the full legal `title` does not
  // fit on a phone. The full title stays the accessibility label.
  shortTitle: string;
  law: string;
  title: string;
  iconName: string;       // Ionicons name
  iconLibrary: 'Ionicons' | 'MaterialCommunityIcons';
  // Custom illustration to use instead of the icon font glyph, once supplied.
  // Drop the file at assets/icons/<key>.svg and set this to
  // require('../../assets/icons/<key>.svg').default — falls back to iconName/iconLibrary when unset.
  iconAsset?: React.FC<SvgProps>;
  bgColor: string;
  borderColor: string;
  textColor: string;
  route: string;
}

// Only Water has a real form today — the rest are visibly disabled wherever
// a report type is picked (the home speed dial's "Soon" badge,
// AddReportSplitPanel's dimmed rows) rather than routing into today's
// placeholder screen. Single source of truth so enabling a type in one
// surface can't leave the other stale.
export const ENABLED_TYPES: ReportTypeKey[] = ['water'];

export const REPORT_TYPES: ReportType[] = [
  {
    key: 'air',
    dataKey: 'air_monitoring',
    shortTitle: 'Air quality',
    law: 'R.A. 8749',
    title: 'Air Quality Management',
    iconName: 'partly-sunny-outline',
    iconLibrary: 'Ionicons',
    iconAsset: require('../../assets/icons/air.svg').default,
    bgColor: Colors.air.bg,
    borderColor: Colors.air.border,
    textColor: Colors.air.text,
    route: '/inspection/new?type=air',
  },
  {
    key: 'water',
    dataKey: 'water_monitoring',
    shortTitle: 'Water quality',
    law: 'R.A. 9275',
    title: 'Water Quality Management',
    iconName: 'water-outline',
    iconLibrary: 'Ionicons',
    iconAsset: require('../../assets/icons/water.svg').default,
    bgColor: Colors.water.bg,
    borderColor: Colors.water.border,
    textColor: Colors.water.text,
    route: '/inspection/new?type=water',
  },
  {
    key: 'hazwaste_generator',
    dataKey: 'hazardous_waste',
    shortTitle: 'Hazwaste generators',
    law: 'R.A. 6969',
    title: 'Hazardous Waste Generators',
    iconName: 'warning-outline',
    iconLibrary: 'Ionicons',
    iconAsset: require('../../assets/icons/hazwaste_generator.svg').default,
    bgColor: Colors.hazwaste.bg,
    borderColor: Colors.hazwaste.border,
    textColor: Colors.hazwaste.text,
    route: '/inspection/new?type=hazwaste_generator',
  },
  {
    key: 'hazwaste_tsd',
    dataKey: 'hazardous_waste',
    shortTitle: 'Hazwaste TSD',
    law: 'R.A. 6969',
    title: 'Hazardous Waste Treaters and TSD Facilities',
    iconName: 'lock-closed-outline',
    iconLibrary: 'Ionicons',
    iconAsset: require('../../assets/icons/hazwaste_tsd.svg').default,
    bgColor: Colors.warning.bg,
    borderColor: Colors.warning.border,
    textColor: Colors.warning.text,
    route: '/inspection/new?type=hazwaste_tsd',
  },
  {
    key: 'eia',
    dataKey: 'eia',
    shortTitle: 'EIA',
    law: 'P.D. 1586',
    title: 'Environmental Impact Assessment',
    iconName: 'document-text-outline',
    iconLibrary: 'Ionicons',
    iconAsset: require('../../assets/icons/eia.svg').default,
    bgColor: Colors.eia.bg,
    borderColor: Colors.eia.border,
    textColor: Colors.eia.text,
    route: '/inspection/new?type=eia',
  },
  {
    key: 'survey',
    dataKey: 'survey',
    shortTitle: 'Site survey',
    law: 'ECC Survey Inspection',
    title: 'Site Inspection Report for New Project With/Without ECC Applications',
    iconName: 'globe-outline',
    iconLibrary: 'Ionicons',
    iconAsset: require('../../assets/icons/survey.svg').default,
    bgColor: Colors.survey.bg,
    borderColor: Colors.survey.border,
    textColor: Colors.survey.text,
    route: '/survey/new',
  },
];
