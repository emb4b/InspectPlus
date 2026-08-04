export type ReportTypeKey =
  | 'air'
  | 'water'
  | 'hazwaste_generator'
  | 'hazwaste_tsd'
  | 'eia'
  | 'survey';

export interface ReportType {
  key: ReportTypeKey;
  law: string;
  title: string;
  iconName: string;       // Ionicons name
  iconLibrary: 'Ionicons' | 'MaterialCommunityIcons';
  bgColor: string;
  borderColor: string;
  textColor: string;
  route: string;
}

export const REPORT_TYPES: ReportType[] = [
  {
    key: 'air',
    law: 'R.A. 8749',
    title: 'Air Quality Management',
    iconName: 'partly-sunny-outline',
    iconLibrary: 'Ionicons',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    textColor: '#6b7280',
    route: '/inspection/new?type=air',
  },
  {
    key: 'water',
    law: 'R.A. 9275',
    title: 'Water Quality Management',
    iconName: 'water-outline',
    iconLibrary: 'Ionicons',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    textColor: '#0284c7',
    route: '/inspection/new?type=water',
  },
  {
    key: 'hazwaste_generator',
    law: 'R.A. 6969',
    title: 'Hazardous Waste Generators',
    iconName: 'warning-outline',
    iconLibrary: 'Ionicons',
    bgColor: '#fff7f7',
    borderColor: '#fecaca',
    textColor: '#dc2626',
    route: '/inspection/new?type=hazwaste_generator',
  },
  {
    key: 'hazwaste_tsd',
    law: 'R.A. 6969',
    title: 'Hazardous Waste Treaters and TSD Facilities',
    iconName: 'lock-closed-outline',
    iconLibrary: 'Ionicons',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#d97706',
    route: '/inspection/new?type=hazwaste_tsd',
  },
  {
    key: 'eia',
    law: 'P.D. 1586',
    title: 'Environmental Impact Assessment',
    iconName: 'document-text-outline',
    iconLibrary: 'Ionicons',
    bgColor: '#faf5ff',
    borderColor: '#ddd6fe',
    textColor: '#7c3aed',
    route: '/inspection/new?type=eia',
  },
  {
    key: 'survey',
    law: 'Survey Inspection',
    title: 'Site Inspection Report for New Project With/Without ECC Applications',
    iconName: 'globe-outline',
    iconLibrary: 'Ionicons',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    textColor: '#059669',
    route: '/survey/new',
  },
];
