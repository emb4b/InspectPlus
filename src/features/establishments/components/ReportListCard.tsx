import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../../components/AppText';
import { Badge } from '../../../components/Badge';
import { UrgencyRibbon } from '../../../components/UrgencyRibbon';
import { REPORT_TYPE_DISPLAY, ReportDataKey } from '../../../constants/reportTypeDisplay';
import { Colors } from '../../../design/colors';
import { Duration } from '../../../design/motion';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Spacing } from '../../../design/spacing';
import { FONT_SCALING, Type } from '../../../design/typography';
import { getReportUrgency } from '../../../utils/reportUrgency';
import { confirmResolveConflict } from '../../../services/sync/syncConflictResolution';
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
  // Selection mode (the Export tab). Omitted everywhere else, which leaves
  // the card's original open/swipe behavior exactly as it was.
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (item: AllReportItem) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Full-size action buttons revealed by swiping the card left — matches
// EstablishmentCard's swipe-actions treatment.
const ACTION_WIDTH = 72;
const OPEN_THRESHOLD_RATIO = 0.4;
const CHECKBOX_SIZE = 22;
const ICON_BOX = 38;

export const ReportListCard: React.FC<ReportListCardProps> = ({
  item,
  currentUid,
  canManageAll,
  onPress,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect,
}) => {
  const isSubmitted = item.status === 'submitted';
  const urgency = getReportUrgency(item.date, item.status);
  // An unrecognized type still renders — a report written by a newer app
  // version shouldn't produce a blank row on an older one.
  const display = REPORT_TYPE_DISPLAY[item.reportType as ReportDataKey];

  // Delete is only wired up for inspection reports, and only for the
  // inspector who owns the record or a Developer account — matches the
  // "own record" / Developer-full-access delete RLS policies on the backend.
  const isOwnerOrManager = item.inspectorUid === currentUid || canManageAll;
  const showDelete = item.kind === 'inspection' && isOwnerOrManager;
  // Editing only exists for inspection reports, and only while still a draft
  // owned by this inspector, or a Developer account.
  const showEdit = item.kind === 'inspection' && !isSubmitted && isOwnerOrManager;

  const visibleActionCount = (showEdit ? 1 : 0) + (showDelete ? 1 : 0);
  const revealWidth = ACTION_WIDTH * visibleActionCount;
  const openThreshold = revealWidth * OPEN_THRESHOLD_RATIO;

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const close = () => {
    translateX.value = withTiming(0, { duration: Duration.base });
  };

  const panGesture = Gesture.Pan()
    // Swiping for edit/delete and ticking rows for export are two conflicting
    // gestures on one row, so the swipe is off while selecting.
    .enabled(revealWidth > 0 && !selectable)
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(e => {
      translateX.value = Math.min(0, Math.max(-revealWidth, startX.value + e.translationX));
    })
    .onEnd(() => {
      translateX.value = withTiming(translateX.value < -openThreshold ? -revealWidth : 0, {
        duration: Duration.base,
      });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleCardPress = () => {
    if (selectable) {
      onToggleSelect?.(item);
      return;
    }
    // A tap while the row is swiped open snaps it shut instead of navigating.
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
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}>
            <Ionicons name="pencil" size={20} color={Colors.textWhite} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
        {showDelete && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDelete]}
            onPress={() => handleAction(onDelete)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.title}`}>
            <Ionicons name="trash-outline" size={20} color={Colors.textWhite} />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Foreground card — slides left via gesture to reveal the actions */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.card,
              urgency.level === 'overdue' && styles.cardOverdue,
              urgency.level === 'due-soon' && styles.cardDueSoon,
            ]}
            onPress={handleCardPress}
            activeOpacity={0.75}
            accessibilityRole={selectable ? 'checkbox' : 'button'}
            accessibilityLabel={`${item.title} for ${item.estabName}`}
            accessibilityState={selectable ? { checked: selected } : undefined}>
            {/* Wraps the card's top-left corner. It clips itself rather than
                asking the card for overflow:'hidden', which would fight the
                Android elevation in Elevation.raised.

                Suppressed in selection mode: the checkbox takes that corner,
                and the band's diagonal crosses it. Urgency is still carried
                there by the card's own border and background tint. */}
            {!selectable && <UrgencyRibbon urgency={urgency} />}

            {selectable && (
              <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                {selected && <Ionicons name="checkmark" size={14} color={Colors.textWhite} />}
              </View>
            )}

            <View style={[styles.iconWrap, { backgroundColor: display?.bgColor ?? Colors.bgLight }]}>
              <Ionicons
                name={display?.icon ?? 'document-outline'}
                size={17}
                color={display?.textColor ?? Colors.textMuted}
              />
            </View>

            <View style={styles.content}>
              <View style={styles.titleRow}>
                <AppText
                  variant="marquee"
                  text={item.title}
                  style={styles.title}
                  containerStyle={styles.titleContainer}
                />
                {/* Filing status only — urgency moved to the corner ribbon,
                    so this slot no longer has to say two things at once. */}
                {item.status && (
                  <Badge
                    label={isSubmitted ? 'Submitted' : 'Draft'}
                    tone={isSubmitted ? 'success' : 'warning'}
                  />
                )}
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name="business-outline"
                  size={10}
                  color={Colors.textMuted}
                  style={styles.metaIcon}
                />
                <AppText
                  variant="marquee"
                  text={item.estabName}
                  style={styles.estabName}
                  containerStyle={styles.estabNameContainer}
                />
              </View>

              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={10} color={Colors.textMuted} />
                <Text style={styles.date}>{formatDate(item.date)}</Text>
                {/* The pricetag icon and control number travel together as
                    one unit, pushed to the end of the row by flexGrow: 1 +
                    justifyContent: 'flex-end' on the group (below) rather
                    than sitting right after the date — the date and its icon
                    stay put at the start via their own flexShrink: 0.
                    dateRow's existing `gap` still guarantees a minimum
                    separation from the date even when the group is short
                    enough that it wouldn't otherwise need the room. (An
                    earlier version of this used
                    marginLeft: 'auto' instead, which reads as "push me to
                    the end" but silently no-ops in Yoga on some RN
                    versions when the parent row also declares `gap` — the
                    row rendered pixel-identical to no alignment at all,
                    passing every unit test because they only asserted the
                    style prop was applied, never that the group actually
                    moved. flexGrow + justifyContent doesn't depend on that
                    auto-margin/gap interaction at all.) */}
                <View style={styles.controlNoGroup}>
                  {/* Decorative: the control number text right beside it
                      already carries the meaning, so it stays out of the
                      accessibility tree — same treatment as Button.tsx's own
                      icons. Matches the calendar icon's size/color so both
                      icons in this row read as one family; flexShrink: 0
                      keeps it from being squeezed within the group. */}
                  <Ionicons
                    name="pricetag-outline"
                    size={10}
                    color={Colors.textMuted}
                    style={styles.controlNoIcon}
                    importantForAccessibility="no"
                  />
                  {/* The control number now shares the date's exact style —
                      size, line height, colour and font family — rather than
                      merely matching size, because the two are meant to read
                      as one even though the group now sits at the opposite
                      end of the row from the date. FONT_SCALING.tabular (OS
                      font scaling disabled) existed to protect this text
                      when it sat alone on its own line with no truncation;
                      it now carries numberOfLines={1}/ellipsizeMode="tail"
                      below, so an over-long value truncates rather than
                      overflowing — that's what protects the row now, so the
                      scaling opt-out would only reintroduce a new
                      inconsistency (the date growing under a large system
                      font while this stayed fixed). It switches to
                      FONT_SCALING.content, the same scaling behavior as the
                      date. flexShrink: 1 below (plus the group's own
                      flexShrink: 1/minWidth: 0) still makes this the element
                      that truncates first, so a long control number still
                      can't clip the date or push the urgency badge off the
                      row — matches EstablishmentReportsSection's controlNo.
                      It deliberately carries no flexGrow: a growing child
                      would claim all of controlNoGroup's width for itself,
                      leaving justifyContent: 'flex-end' on the group nothing
                      to push against — the exact bug this task fixes.
                      textAlign: 'right' below is a second line of defence in
                      case this Text's box is ever wider than its content. */}
                  <Text
                    style={styles.controlNo}
                    allowFontScaling={FONT_SCALING.content}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {item.controlNo || 'No control number yet'}
                  </Text>
                </View>
              </View>

              {/* Sync status sits last in the card body, below every other
                  detail, so it reads as a footer note rather than
                  competing with the title/meta/date for attention. */}
              {item.syncStatus === 'pending' && (
                <View style={styles.syncRow}>
                  <Ionicons name="cloud-upload-outline" size={10} color={Colors.pending} />
                  <Text style={styles.syncText}>Pending sync</Text>
                </View>
              )}
              {item.syncStatus === 'conflict' && (
                <TouchableOpacity
                  style={styles.syncRow}
                  onPress={() =>
                    confirmResolveConflict(
                      item.kind === 'inspection' ? 'inspection_reports' : 'survey_reports',
                      item.reportId,
                      item.title,
                    )
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Resolve sync conflict for ${item.title}`}>
                  <Ionicons name="alert-circle-outline" size={10} color={Colors.conflict} />
                  <Text style={[styles.syncText, styles.syncTextConflict]}>Sync conflict</Text>
                </TouchableOpacity>
              )}
            </View>

            {!selectable && <Ionicons name="chevron-forward" size={14} color={Colors.textLight} />}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
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
  actionBtn: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  actionEdit: {
    backgroundColor: Colors.navy,
  },
  actionDelete: {
    backgroundColor: Colors.conflict,
  },
  actionText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Elevation.raised,
  },
  cardDueSoon: {
    borderColor: Colors.warning.border,
    backgroundColor: Colors.warning.bg,
  },
  cardOverdue: {
    borderColor: Colors.hazwaste.border,
    backgroundColor: Colors.hazwaste.bg,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  iconWrap: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: Radius.md,
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
    gap: Spacing.sm,
  },
  title: {
    fontSize: Type.body.fontSize,
    lineHeight: Type.body.lineHeight,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  titleContainer: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // Nudges the icon down from the row's true top edge to align with the
  // text's cap-height rather than its full line-height box.
  metaIcon: {
    marginTop: 1,
  },
  estabName: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  estabNameContainer: {
    flexShrink: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  syncText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.pending,
    fontWeight: '600',
  },
  syncTextConflict: {
    color: Colors.conflict,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  // Fixed width in the row — the control number is what shrinks/truncates,
  // not the date. Matches EstablishmentReportsSection's "date" token choice.
  date: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
    flexShrink: 0,
  },
  controlNo: {
    // Identical to the date's style below — size, line height, colour and
    // font family — now that the two share one row and are meant to read as
    // one, even though the group sits at the opposite end from the date.
    // There is no fontFamily override here (it used to be 'monospace'):
    // dropping it leaves this on the same default family as the date, which
    // is what "same font style" means for this row.
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    color: Colors.textMuted,
    // Must SHRINK (so a long value truncates within controlNoGroup, together
    // with numberOfLines/ellipsizeMode above) but must NEVER GROW. flex: 1
    // here was the actual bug: it's shorthand for flexGrow: 1 too, so the
    // text grew to fill controlNoGroup completely, leaving
    // justifyContent: 'flex-end' on the group zero free space to distribute
    // — the text rendered flush against the group's (and row's) start
    // instead of its end. flexShrink: 1 alone keeps the truncation without
    // reintroducing that growth. textAlign: 'right' is a second line of
    // defence: even if this Text's box ever ends up wider than its content
    // for some other reason, the glyphs still sit right-aligned inside it.
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  // Never squeezed by a long control number sharing the row — same
  // flexShrink: 0 guard as the date and urgency badge.
  controlNoIcon: {
    flexShrink: 0,
  },
  // Glues the pricetag icon and control number text together as one unit
  // and pushes that unit to the end of dateRow by growing to fill the row's
  // remaining space (flexGrow: 1) and right-aligning its own children
  // (justifyContent: 'flex-end') — dateRow deliberately keeps
  // flexDirection: 'row' rather than justifyContent: 'space-between', which
  // would also spread the date, icon and badge apart. flexShrink: 1 plus
  // minWidth: 0 (rather than the default flexShrink: 0 every other dateRow
  // child pins explicitly) let this group give way when a long control
  // number would otherwise overflow the row, so controlNo's own flex: 1/
  // numberOfLines still get a chance to truncate it instead of the row
  // overflowing. The icon and text stay adjacent (only the `gap` above
  // separates them) so flex-end carries them to the row's end together —
  // the icon can't be stranded mid-row on its own.
  controlNoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
});
