import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}

// Every tone reuses a pair already present in the palette rather than
// introducing new values — these are the fills the hand-rolled chips across
// the app were already reaching for.
const TONE: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: Colors.bgLight, text: Colors.textSecondary },
  success: { bg: Colors.greenMuted, text: Colors.green },
  warning: { bg: Colors.warning.badgeBg, text: Colors.warning.text },
  danger: { bg: Colors.conflictMuted, text: Colors.conflict },
  info: { bg: Colors.air.badgeBg, text: Colors.air.badgeText },
};

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'neutral', style }) => {
  const { bg, text } = TONE[tone];
  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
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
