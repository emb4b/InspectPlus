import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
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
// two card components — overdue borrows hazwaste's red, due-soon warning's
// amber. They deliberately match the border/background tint the card itself
// takes on at the same level, so chip and card read as one signal.
const LEVEL_TONE = {
  overdue: { bg: Colors.hazwaste.badgeBg, text: Colors.hazwaste.badgeText },
  'due-soon': { bg: Colors.warning.badgeBg, text: Colors.warning.text },
} as const;

const plural = (days: number) => (days === 1 ? 'day' : 'days');

// On the deadline day there is no elapsed count worth naming, so both forms
// fall back to the bare state rather than reading "0d overdue".
function compactLabel(urgency: ReportUrgency): string {
  if (urgency.level === 'due-soon') return `Due in ${urgency.days}d`;
  if (urgency.days === 0) return 'Overdue';
  return `${urgency.days}d overdue`;
}

// The badge shares a row with a marquee title, so the visible text is
// abbreviated — but a screen reader gets the sentence, since "5d overdue" is
// not something you want read aloud.
function spokenLabel(urgency: ReportUrgency): string {
  if (urgency.level === 'due-soon') return `Due in ${urgency.days} ${plural(urgency.days)}`;
  if (urgency.days === 0) return 'Overdue';
  return `Overdue by ${urgency.days} ${plural(urgency.days)}`;
}

// A chip flagging how a draft report sits against its filing deadline. It
// occupies a card's existing status-badge slot rather than a corner of its
// own: a flagged report is always a draft (getReportUrgency never flags a
// submitted one), so this and a "Draft" chip would say overlapping things,
// and an earlier absolutely-positioned version cost every flagged card a
// reserved band of top padding — a wasted row of height.
export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency, style }) => {
  if (urgency.level === 'none') return null;

  const { bg, text } = LEVEL_TONE[urgency.level];

  return (
    <View
      style={[styles.pill, { backgroundColor: bg }, style]}
      accessibilityRole="text"
      accessibilityLabel={spokenLabel(urgency)}>
      <Text style={[styles.label, { color: text }]}>{compactLabel(urgency)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Matches Badge.tsx's shape exactly — the two occupy the same slot in a
  // card's title row and must not read as different kinds of object.
  pill: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  label: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
  },
});
