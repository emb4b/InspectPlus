import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useInspectorName } from '../../../core/hooks/useInspectorName';
import { getReportTypeMeta } from '../reportTypeMeta';

export type ReportDetailTabKey = 'geninfo' | 'purpose' | 'compliance';

const TABS: { key: ReportDetailTabKey; label: string }[] = [
  { key: 'geninfo', label: 'General Information' },
  { key: 'purpose', label: 'Purpose of Inspection' },
  { key: 'compliance', label: 'Compliance Status' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface InspectionReportHeaderProps {
  establishmentName: string;
  establishmentLocation: string;
  reportType: string;
  reportControlNo: string | null;
  inspectionDate: string;
  reportStatus: string;
  inspectorUid: string;
  activeTab: ReportDetailTabKey;
  onTabChange: (tab: ReportDetailTabKey) => void;
  onBack: () => void;
}

export const InspectionReportHeader: React.FC<InspectionReportHeaderProps> = ({
  establishmentName,
  establishmentLocation,
  reportType,
  reportControlNo,
  inspectionDate,
  reportStatus,
  inspectorUid,
  activeTab,
  onTabChange,
  onBack,
}) => {
  const typeMeta = getReportTypeMeta(reportType);
  const IconAsset = typeMeta.iconAsset;
  const isSubmitted = reportStatus === 'submitted';

  // Same self-vs-other resolution as EstablishmentDetailScreen — fullName is
  // only ever the signed-in user's own name, so it can't be assumed to match
  // this report's assigned inspector.
  const { fullName, session } = useAuthContext();
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const isSelf = inspectorUid === currentUid;
  const { name: resolvedInspectorName, loading: inspectorNameLoading } = useInspectorName(
    !isSelf ? inspectorUid : undefined,
  );
  const inspectorLabel = isSelf
    ? fullName || 'You'
    : resolvedInspectorName ?? (inspectorNameLoading ? 'Loading…' : 'Unknown inspector');

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={16} color={Colors.navy} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="business" size={16} color={Colors.green} />
          </View>
          <View style={styles.titleInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{establishmentName}</Text>
              <View style={[styles.pill, { backgroundColor: typeMeta.bgColor }]}>
                {IconAsset && <IconAsset width={11} height={11} />}
                <Text style={[styles.pillText, { color: typeMeta.textColor }]}>{typeMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.location} numberOfLines={1}>{establishmentLocation}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isSubmitted ? Colors.greenMuted : Colors.warning.badgeBg },
            ]}>
            <Text
              style={[
                styles.statusBadgeText,
                { color: isSubmitted ? Colors.green : Colors.warning.text },
              ]}>
              {isSubmitted ? 'Submitted' : 'Draft'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={11} color={Colors.textLight} />
            <Text style={styles.metaText} numberOfLines={1}>{formatDate(inspectionDate)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="pricetag-outline" size={11} color={Colors.textLight} />
            <Text style={styles.metaText} numberOfLines={1}>
              {reportControlNo ? `Control No. ${reportControlNo}` : 'No control number yet'}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="person-circle-outline" size={12} color={Colors.textLight} />
            <Text style={styles.metaText} numberOfLines={1}>{inspectorLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            activeOpacity={0.7}
            onPress={() => onTabChange(tab.key)}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    flexShrink: 1,
  },
  pill: {
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
  location: {
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.green,
  },
  tabText: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: Colors.navy,
  },
});
