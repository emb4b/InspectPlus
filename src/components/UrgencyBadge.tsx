import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';
import type { ReportUrgency } from '../utils/reportUrgency';

interface UrgencyBadgeProps {
  urgency: ReportUrgency;
  style?: StyleProp<ViewStyle>;
}

// Both palettes were already in use for this badge before it moved out of the
// two card components — overdue borrows hazwaste's red, due-soon warning's amber.
const LEVEL_TONE = {
  overdue: { bg: Colors.hazwaste.badgeBg, text: Colors.hazwaste.badgeText },
  'due-soon': { bg: Colors.warning.badgeBg, text: Colors.warning.text },
} as const;

const plural = (days: number) => (days === 1 ? 'day' : 'days');

function formatLabel(urgency: ReportUrgency): string {
  if (urgency.level === 'due-soon') return `Due in ${urgency.days} ${plural(urgency.days)}`;
  // On the deadline day there is no elapsed count worth naming, so the badge
  // falls back to the bare state rather than reading "Overdue by 0 days".
  if (urgency.days === 0) return 'Overdue';
  return `Overdue by ${urgency.days} ${plural(urgency.days)}`;
}

// The pill overhangs no edges — it sits inside the card's own top padding
// band. Consumers reserve that band with URGENCY_BADGE_RESERVED_TOP so the
// badge never lands on top of a title or a status chip.
const INSET_TOP = Spacing.xs;
const INSET_RIGHT = Spacing.md;
const PILL_HEIGHT = Type.caption.lineHeight + 2 * Spacing.xxs;

// The paddingTop a card applies in place of its usual one while a badge is
// showing: the pill's own band, plus a gap before the content starts.
export const URGENCY_BADGE_RESERVED_TOP = INSET_TOP + PILL_HEIGHT + Spacing.xs;

// A corner chip flagging how a draft report sits against its filing deadline.
// Positions itself against the nearest positioned ancestor — drop it in as a
// direct child of the card surface it belongs to.
export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency, style }) => {
  if (urgency.level === 'none') return null;

  const { bg, text } = LEVEL_TONE[urgency.level];
  const label = formatLabel(urgency);

  return (
    <View
      style={[styles.pill, { backgroundColor: bg }, style]}
      accessibilityRole="text"
      accessibilityLabel={label}>
      <Ionicons name="alert-circle" size={9} color={text} />
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: INSET_TOP,
    right: INSET_RIGHT,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
  },
  label: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
  },
});
