import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useInspectorName } from '../../../core/hooks/useInspectorName';
import { canManageAllRecords } from '../../establishments/hooks/useEstablishment';
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
  // Only the inspector who owns the report (or a Developer account, which
  // gets unrestricted write access — see canManageAllRecords) can delete
  // it — omitted entirely (rather than passed disabled) otherwise.
  onDelete?: () => void;
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
  onDelete,
}) => {
  const typeMeta = getReportTypeMeta(reportType);
  const IconAsset = typeMeta.iconAsset;
  const isSubmitted = reportStatus === 'submitted';

  // Same self-vs-other resolution as EstablishmentDetailScreen — fullName is
  // only ever the signed-in user's own name, so it can't be assumed to match
  // this report's assigned inspector.
  const { fullName, session, role } = useAuthContext();
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const isSelf = inspectorUid === currentUid;
  const canManage = isSelf || canManageAllRecords(role ?? '');
  const { name: resolvedInspectorName, loading: inspectorNameLoading } = useInspectorName(
    !isSelf ? inspectorUid : undefined,
  );
  const inspectorLabel = isSelf
    ? fullName || 'You'
    : resolvedInspectorName ?? (inspectorNameLoading ? 'Loading…' : 'Unknown inspector');

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={Colors.navy} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        {canManage && onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={14} color={Colors.conflict} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="business" size={22} color={Colors.green} />
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.name}>{establishmentName}</Text>
            <View style={styles.pillRow}>
              <View style={[styles.pill, { backgroundColor: typeMeta.bgColor }]}>
                {IconAsset && <IconAsset width={11} height={11} />}
                <Text style={[styles.pillText, { color: typeMeta.textColor }]}>{typeMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.location}>{establishmentLocation}</Text>
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
            <Text style={styles.metaText}>{formatDate(inspectionDate)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="pricetag-outline" size={11} color={Colors.textLight} />
            <Text style={styles.metaText}>
              {reportControlNo ? `Control No. ${reportControlNo}` : 'No control number yet'}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="person-circle-outline" size={12} color={Colors.textLight} />
            <Text style={styles.metaText}>{inspectorLabel}</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.conflict,
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
    alignItems: 'stretch',
    gap: 10,
  },
  iconWrap: {
    // No fixed size — stretches to the title block's height (topRow's
    // tallest child) and aspectRatio keeps it square, so it scales up
    // with the block instead of looking small next to a 3-line title.
    aspectRatio: 1,
    borderRadius: 12,
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
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
  },
  pillRow: {
    flexDirection: 'row',
    marginTop: 4,
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
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'center',
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
    alignItems: 'stretch',
    gap: 6,
  },
  metaChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metaText: {
    flex: 1,
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
