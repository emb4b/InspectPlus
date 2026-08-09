import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { getReportUrgency } from '../../../utils/reportUrgency';
import type { EstablishmentReportItem } from '../hooks/useEstablishment';

interface EstablishmentReportsSectionProps {
  reports: EstablishmentReportItem[];
  loading?: boolean;
  currentUid: string;
  // Developer accounts can manage every report, not just their own — see
  // canManageAllRecords.
  canManageAll: boolean;
  onAddReport: () => void;
  onOpenReport: (item: EstablishmentReportItem) => void;
  onDeleteReport: (item: EstablishmentReportItem) => void;
}

const REPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  air_monitoring: 'partly-sunny-outline',
  water_monitoring: 'water-outline',
  hazardous_waste: 'warning-outline',
  eia: 'globe-outline',
  survey: 'leaf-outline',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Swipe-to-reveal Delete, matching ReportListCard's (Manage Reports tab)
// gesture treatment — this section only ever shows a single action, unlike
// ReportListCard's Edit+Delete, so revealWidth is just one ACTION_WIDTH or 0.
const ACTION_WIDTH = 72;
const OPEN_THRESHOLD_RATIO = 0.4;

const ReportRow: React.FC<{
  item: EstablishmentReportItem;
  onOpen: () => void;
  onDelete: () => void;
  showDelete: boolean;
}> = ({ item, onOpen, onDelete, showDelete }) => {
  const urgency = getReportUrgency(item.date, item.status);

  const revealWidth = showDelete ? ACTION_WIDTH : 0;
  const openThreshold = revealWidth * OPEN_THRESHOLD_RATIO;

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const close = () => {
    translateX.value = withTiming(0, { duration: 200 });
  };

  const panGesture = Gesture.Pan()
    .enabled(revealWidth > 0)
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(e => {
      translateX.value = Math.min(0, Math.max(-revealWidth, startX.value + e.translationX));
    })
    .onEnd(() => {
      translateX.value = withTiming(
        translateX.value < -openThreshold ? -revealWidth : 0,
        { duration: 200 },
      );
    });

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // A tap while the row is swiped open snaps it shut instead of opening the
  // report — same convention as ReportListCard.
  const handlePress = () => {
    if (translateX.value < -1) {
      close();
      return;
    }
    onOpen();
  };

  const handleDelete = () => {
    close();
    onDelete();
  };

  return (
    <View style={styles.rowWrap}>
      {showDelete && (
        <View style={styles.swipeActions}>
          <TouchableOpacity style={styles.deleteAction} onPress={handleDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={Colors.textWhite} />
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.row,
              urgency === 'overdue' && styles.rowOverdue,
              urgency === 'due-soon' && styles.rowDueSoon,
            ]}
            onPress={handlePress}
            activeOpacity={0.75}>
            <View style={styles.iconWrap}>
              <Ionicons name={REPORT_ICONS[item.reportType] ?? 'document-outline'} size={17} color={Colors.water.text} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
                <Text style={styles.date}>{formatDate(item.date)}</Text>
                {urgency !== 'none' && (
                  <View
                    style={[
                      styles.urgencyBadge,
                      { backgroundColor: urgency === 'overdue' ? Colors.hazwaste.badgeBg : Colors.warning.badgeBg },
                    ]}>
                    <Ionicons
                      name="alert-circle"
                      size={9}
                      color={urgency === 'overdue' ? Colors.hazwaste.badgeText : Colors.warning.text}
                    />
                    <Text
                      style={[
                        styles.urgencyBadgeText,
                        { color: urgency === 'overdue' ? Colors.hazwaste.badgeText : Colors.warning.text },
                      ]}>
                      {urgency === 'overdue' ? 'Overdue' : 'Due soon'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.controlNo}>{item.controlNo || 'No control number yet'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export const EstablishmentReportsSection: React.FC<EstablishmentReportsSectionProps> = ({
  reports,
  loading,
  currentUid,
  canManageAll,
  onAddReport,
  onOpenReport,
  onDeleteReport,
}) => (
  <View style={styles.section}>
    <View style={styles.headerRow}>
      <View style={styles.headerTitleRow}>
        <Ionicons name="document-text-outline" size={16} color={Colors.navy} />
        <Text style={styles.headerTitle}>Inspection Reports</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={onAddReport} activeOpacity={0.8}>
        <Ionicons name="add" size={13} color={Colors.textWhite} />
        <Text style={styles.addBtnText}>Add Report</Text>
      </TouchableOpacity>
    </View>

    {loading ? (
      <View style={styles.emptyState}>
        <ActivityIndicator size="small" color={Colors.navy} />
      </View>
    ) : reports.length === 0 ? (
      <View style={styles.emptyState}>
        <Ionicons name="document-outline" size={32} color={Colors.border} />
        <Text style={styles.emptyText}>No reports filed yet for this establishment.</Text>
      </View>
    ) : (
      reports.map(item => (
        <ReportRow
          key={item.key}
          item={item}
          onOpen={() => onOpenReport(item)}
          onDelete={() => onDeleteReport(item)}
          // Delete is only wired up for inspection reports, and only for
          // the inspector who owns the record or a Developer account —
          // matches the "own record" / Developer-full-access delete RLS
          // policies on the backend.
          showDelete={item.kind === 'inspection' && (item.inspectorUid === currentUid || canManageAll)}
        />
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: Colors.navy,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  rowWrap: {
    marginBottom: 10,
  },
  swipeActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
  },
  deleteAction: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#e74c3c',
  },
  deleteActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  rowDueSoon: {
    borderColor: Colors.warning.border,
    backgroundColor: Colors.warning.bg,
  },
  rowOverdue: {
    borderColor: Colors.hazwaste.border,
    backgroundColor: Colors.hazwaste.bg,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.water.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  date: {
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 20,
    marginLeft: 4,
  },
  urgencyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  controlNo: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
