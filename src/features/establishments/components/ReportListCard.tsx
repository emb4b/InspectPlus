import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { getReportUrgency } from '../../../utils/reportUrgency';
import type { AllReportItem } from '../hooks/useEstablishment';

interface ReportListCardProps {
  item: AllReportItem;
  currentUid: string;
  // Developer accounts can manage every report, not just their own — see
  // canManageAllRecords.
  canManageAll: boolean;
  onPress: (item: AllReportItem) => void;
  onEdit: (item: AllReportItem) => void;
  onDelete: (item: AllReportItem) => void;
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

// Full-size action buttons revealed by swiping the card left — matches
// EstablishmentCard's swipe-actions treatment.
const ACTION_WIDTH = 72;
const OPEN_THRESHOLD_RATIO = 0.4;

export const ReportListCard: React.FC<ReportListCardProps> = ({
  item,
  currentUid,
  canManageAll,
  onPress,
  onEdit,
  onDelete,
}) => {
  const isSubmitted = item.status === 'submitted';
  const urgency = getReportUrgency(item.date, item.status);
  // Delete is only wired up for inspection reports, and only for the
  // inspector who owns the record or a Developer account — matches the
  // "own record" / Developer-full-access delete RLS policies on the
  // backend (see EstablishmentReportsSection's showDelete).
  const isOwnerOrManager = item.inspectorUid === currentUid || canManageAll;
  const showDelete = item.kind === 'inspection' && isOwnerOrManager;
  // Editing only exists for inspection reports (section-level edit on the
  // report detail screen — see InspectionReportDetailScreen's canEdit), and
  // only while still a draft owned by this inspector, or a Developer account.
  const showEdit = item.kind === 'inspection' && !isSubmitted && isOwnerOrManager;

  const visibleActionCount = (showEdit ? 1 : 0) + (showDelete ? 1 : 0);
  const revealWidth = ACTION_WIDTH * visibleActionCount;
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

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // A tap while the row is swiped open snaps it shut instead of navigating —
  // the standard swipe-actions convention.
  const handleCardPress = () => {
    if (translateX.value < -1) {
      close();
      return;
    }
    onPress(item);
  };

  const handleAction = (handler: (item: AllReportItem) => void) => {
    close();
    handler(item);
  };

  return (
    <View style={styles.rowWrap}>
      {/* Actions revealed behind the card when swiped left */}
      <View style={styles.swipeActions}>
        {showEdit && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionEdit]}
            onPress={() => handleAction(onEdit)}
            activeOpacity={0.8}>
            <Ionicons name="pencil" size={20} color={Colors.textWhite} />
            <Text style={styles.actionEditText}>Edit</Text>
          </TouchableOpacity>
        )}
        {showDelete && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDelete]}
            onPress={() => handleAction(onDelete)}
            activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={Colors.textWhite} />
            <Text style={styles.actionDeleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Foreground card — slides left via gesture to reveal the actions */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.card,
              urgency === 'overdue' && styles.cardOverdue,
              urgency === 'due-soon' && styles.cardDueSoon,
            ]}
            onPress={handleCardPress}
            activeOpacity={0.75}>
            <View style={styles.iconWrap}>
              <Ionicons name={REPORT_ICONS[item.reportType] ?? 'document-outline'} size={17} color={Colors.water.text} />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {item.status && (
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
                )}
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={10} color={Colors.textMuted} style={styles.metaIcon} />
                <Text style={styles.estabName} numberOfLines={2}>{item.estabName}</Text>
              </View>

              {/* Sync status indicator */}
              {item.syncStatus === 'pending' && (
                <View style={styles.syncRow}>
                  <Ionicons name="cloud-upload-outline" size={10} color={Colors.pending} />
                  <Text style={styles.syncText}>Pending sync</Text>
                </View>
              )}
              {item.syncStatus === 'conflict' && (
                <View style={styles.syncRow}>
                  <Ionicons name="alert-circle-outline" size={10} color={Colors.conflict} />
                  <Text style={[styles.syncText, { color: Colors.conflict }]}>Sync conflict</Text>
                </View>
              )}

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

            {/* Chevron */}
            <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
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
  actionBtn: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionEdit: {
    backgroundColor: Colors.navy,
  },
  actionEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  actionDelete: {
    backgroundColor: '#e74c3c',
  },
  actionDeleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDueSoon: {
    borderColor: Colors.warning.border,
    backgroundColor: Colors.warning.bg,
  },
  cardOverdue: {
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 3,
  },
  // Nudges the icon down from the row's true top edge to align with the
  // text's cap-height instead of its full line-height box, now that
  // metaRow no longer vertically centers it against (potentially 2-line)
  // wrapped estabName text.
  metaIcon: {
    marginTop: 1,
  },
  estabName: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  syncText: {
    fontSize: 9,
    color: Colors.pending,
    fontWeight: '600',
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
