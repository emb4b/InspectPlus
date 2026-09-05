import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../../components/AppText';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { Colors } from '../../../design/colors';
import { Duration } from '../../../design/motion';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { FONT_SCALING, Type } from '../../../design/typography';
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
    translateX.value = withTiming(0, { duration: Duration.base });
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
        { duration: Duration.base },
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
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={handleDelete}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.title}`}>
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
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={item.title}>
            <View style={styles.iconWrap}>
              <Ionicons name={REPORT_ICONS[item.reportType] ?? 'document-outline'} size={17} color={Colors.water.text} />
            </View>
            <View style={styles.content}>
              <AppText variant="marquee" text={item.title} style={styles.title} />
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
                <Text style={styles.date}>{formatDate(item.date)}</Text>
                {/* Fixed-format monospace: OS font scaling blows it past the
                    row width, so it opts out per the FONT_SCALING policy —
                    matches ReportListCard's controlNo. Shares this row with
                    the date; flexShrink+numberOfLines let it truncate first
                    so a long control number can't clip the date or push an
                    urgency badge off the row. */}
                <Text
                  style={styles.controlNo}
                  allowFontScaling={FONT_SCALING.tabular}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {item.controlNo || 'No control number yet'}
                </Text>
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
      {/* A section-header action, not the screen's one primary — the
          EstablishmentHeaderCard's filled Add Report already fills that
          role, so this stays outline to avoid two filled navy buttons on
          the same screen. */}
      <Button label="Add Report" icon="add" variant="outline" size="sm" onPress={onAddReport} />
    </View>

    {loading ? (
      <View style={styles.loadingState}>
        <ActivityIndicator size="small" color={Colors.navy} />
      </View>
    ) : reports.length === 0 ? (
      <EmptyState icon="document-outline" message="No reports filed yet for this establishment." />
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
    marginBottom: Spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Type.subheading.fontSize,
    lineHeight: Type.subheading.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  rowWrap: {
    marginBottom: Spacing.md,
  },
  swipeActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  // Same "delete" red as ReportListCard/EstablishmentCard's swipe actions —
  // this row previously hardcoded its own separate red hex instead of
  // reusing it.
  deleteAction: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.conflict,
  },
  deleteActionText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
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
    borderRadius: Radius.md,
    backgroundColor: Colors.water.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  // Matches ReportListCard's "title" token choice.
  title: {
    fontSize: Type.body.fontSize,
    lineHeight: Type.body.lineHeight,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // Matches ReportListCard's "date" token choice. Fixed width in the row —
  // the control number is what shrinks/truncates, not the date.
  date: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
    flexShrink: 0,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    marginLeft: Spacing.xs,
    // Never squeezed by a long control number sharing the row — it's the
    // control number that truncates, not this badge.
    flexShrink: 0,
  },
  urgencyBadgeText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
  },
  controlNo: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textLight,
    fontFamily: 'monospace',
    // Shares the date row rather than sitting on its own line below it; it's
    // the one that shrinks/truncates so a long value can't clip the date or
    // shove the urgency badge off the row.
    flex: 1,
    minWidth: 0,
  },
});
