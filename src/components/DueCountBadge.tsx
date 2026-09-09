import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';
import type { DueReportsSummary } from '../utils/reportUrgency';

interface DueCountBadgeProps {
  summary: DueReportsSummary | null;
  style?: StyleProp<ViewStyle>;
}

// Saturated rather than the pale badge tints: this sits on top of an icon
// tile, where a tint would disappear into whatever is behind it.
const LEVEL_FILL = {
  overdue: Colors.hazwaste.text,
  'due-soon': Colors.warning.text,
} as const;

const LEVEL_PHRASE = {
  overdue: 'overdue',
  'due-soon': 'due soon',
} as const;

// How many reports at an establishment want attention, and how badly. The
// colour is the severity channel and the number the volume channel, which is
// why the count spans both states — see summarizeDueReports.
export const DueCountBadge: React.FC<DueCountBadgeProps> = ({ summary, style }) => {
  if (!summary) return null;

  const { level, count } = summary;
  const noun = count === 1 ? 'report' : 'reports';

  return (
    <View
      style={[styles.pill, { backgroundColor: LEVEL_FILL[level] }, style]}
      accessibilityRole="text"
      accessibilityLabel={`${count} ${noun} ${LEVEL_PHRASE[level]}`}>
      <Ionicons name="alert-circle" size={11} color={Colors.textWhite} />
      <Text style={styles.count}>{String(count)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    // Sits over an icon tile, so it needs to read as a separate object rather
    // than a coloured patch of it.
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  count: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
