import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { getReportTypeMeta } from '../reportTypeMeta';
import { TwoRowTabs, TwoRowMainTabDef } from './TwoRowTabs';

interface ReportFormHeaderProps {
  establishmentName: string;
  establishmentLocation: string;
  reportType: string;
  tabs: TwoRowMainTabDef[];
  activeMain: string;
  onMainChange: (key: string) => void;
}

export const ReportFormHeader: React.FC<ReportFormHeaderProps> = ({
  establishmentName,
  establishmentLocation,
  reportType,
  tabs,
  activeMain,
  onMainChange,
}) => {
  const typeMeta = getReportTypeMeta(reportType);
  const IconAsset = typeMeta.iconAsset;

  // Icon box grows to match the combined height of the name + address,
  // measured once on first layout and locked in — same treatment as
  // InspectionReportHeader/EstablishmentHeaderCard, so all three header
  // cards read as the same design rather than this one (the only one with
  // no scroll-collapse animation to coordinate with) drifting back to a
  // small fixed square. Width tracks height 1:1 to stay square, and the
  // glyph scales with it at the original ~1:2 ratio (16/34).
  const [titleBlockHeight, setTitleBlockHeight] = useState<number | null>(null);
  const titleBlockMeasured = useRef(false);
  const handleTitleBlockLayout = (e: LayoutChangeEvent) => {
    if (titleBlockMeasured.current) return;
    titleBlockMeasured.current = true;
    setTitleBlockHeight(e.nativeEvent.layout.height);
  };
  const iconSize = titleBlockHeight ?? 34;
  const iconGlyphSize = Math.round(iconSize * 0.47);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color={Colors.navy} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={[styles.iconWrap, { width: iconSize, height: iconSize }]}>
          <Ionicons name="document-text" size={iconGlyphSize} color={Colors.green} />
        </View>
        <View style={styles.titleInfo}>
          <View onLayout={handleTitleBlockLayout}>
            <Text style={styles.name} numberOfLines={2}>{establishmentName}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={11} color={Colors.green} style={styles.locationIcon} />
              <Text style={styles.location} numberOfLines={2}>{establishmentLocation}</Text>
            </View>
          </View>
        </View>
        <View style={styles.badgeGroup}>
          {/* The law citation (e.g. "R.A. 9275") stands in for the full report
              type name here, matching InspectionReportHeader's pill — same
              shared REPORT_TYPES source (via getReportTypeMeta), so this can
              never show a different law/color than the report's own detail
              screen does once created. */}
          <View style={[styles.pill, { backgroundColor: typeMeta.bgColor }]}>
            {IconAsset && <IconAsset width={11} height={11} />}
            <Text style={[styles.pillText, { color: typeMeta.textColor }]} numberOfLines={1}>
              {typeMeta.law || typeMeta.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TwoRowTabs tabs={tabs} activeMain={activeMain} onMainChange={onMainChange} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  // Nudges the icon down from the row's true top edge to align with the
  // text's cap-height instead of its full line-height box.
  locationIcon: {
    marginTop: 2,
  },
  location: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
  },
  badgeGroup: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  pill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  tabRow: {
    marginTop: 8,
    paddingBottom: 8,
  },
});
