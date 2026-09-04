import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design/colors';

// How an ALREADY-RECORDED report of a given type is labeled and colored.
// The data layer only distinguishes five types: both create-flow hazwaste
// entries (generator and TSD — see ReportTypeKey in reportTypes.ts) store
// 'hazardous_waste', because the distinction only matters while choosing
// which form to open.
//
// This is the single source of truth for that vocabulary. It exists because
// ReportListCard and reportTypes.ts previously each kept their own copy and
// drifted: eia and survey ended up with each other's icons, and every card
// rendered with a hardcoded water-blue icon regardless of its actual type.
export type ReportDataKey =
  | 'air_monitoring'
  | 'water_monitoring'
  | 'hazardous_waste'
  | 'eia'
  | 'survey';

export interface ReportTypeDisplay {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
}

export const REPORT_TYPE_DISPLAY: Record<ReportDataKey, ReportTypeDisplay> = {
  air_monitoring: {
    label: 'Air Monitoring',
    icon: 'partly-sunny-outline',
    bgColor: Colors.air.bg,
    borderColor: Colors.air.border,
    textColor: Colors.air.text,
    badgeBg: Colors.air.badgeBg,
    badgeText: Colors.air.badgeText,
  },
  water_monitoring: {
    label: 'Water Monitoring',
    icon: 'water-outline',
    bgColor: Colors.water.bg,
    borderColor: Colors.water.border,
    textColor: Colors.water.text,
    badgeBg: Colors.water.badgeBg,
    badgeText: Colors.water.badgeText,
  },
  hazardous_waste: {
    // The generator flow's icon stands for the collapsed bucket; the TSD
    // flow keeps its own lock glyph in the create dial, where the two are
    // still distinguishable.
    label: 'Hazwaste Monitoring',
    icon: 'warning-outline',
    bgColor: Colors.hazwaste.bg,
    borderColor: Colors.hazwaste.border,
    textColor: Colors.hazwaste.text,
    badgeBg: Colors.hazwaste.badgeBg,
    badgeText: Colors.hazwaste.badgeText,
  },
  eia: {
    label: 'EIA',
    icon: 'document-text-outline',
    bgColor: Colors.eia.bg,
    borderColor: Colors.eia.border,
    textColor: Colors.eia.text,
    badgeBg: Colors.eia.badgeBg,
    badgeText: Colors.eia.badgeText,
  },
  survey: {
    label: 'Survey',
    icon: 'globe-outline',
    bgColor: Colors.survey.bg,
    borderColor: Colors.survey.border,
    textColor: Colors.survey.text,
    badgeBg: Colors.survey.badgeBg,
    badgeText: Colors.survey.badgeText,
  },
};
