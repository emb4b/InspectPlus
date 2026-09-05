import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';

interface CheckboxRowProps {
  label: string;
  subLabel?: string;
  checked: boolean;
  onToggle: () => void;
}

// A compliance-form control tapped repeatedly across a long inspection,
// one-handed, outdoors. Its visual box stays exactly as compact as before (a
// form's density can't change), so the 48dp minimum comes entirely from
// `hitSlop` padding the invisible tappable area around it, following the
// same MIN_TARGET / hitSlopFor formula as Button.tsx and YesNoNAToggle.
const MIN_TARGET = 48;
// The row's true height: paddingVertical top + bottom, plus the label's own
// line height (the checkbox icon is the same size and the row centers on
// neither, but the label sets the taller of the two) - there's no declared
// height/minHeight here, so this mirrors YesNoNAToggle's own derivation.
// 8 + 8 + 18 = 34dp, short of the 48dp minimum by 14dp.
const MEASURED_HEIGHT = Spacing.sm * 2 + Type.bodySm.lineHeight;
const hitSlop = (() => {
  const pad = Math.max(0, Math.round((MIN_TARGET - MEASURED_HEIGHT) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
})();

export const CheckboxRow: React.FC<CheckboxRowProps> = ({
  label,
  subLabel,
  checked,
  onToggle,
}) => (
  <TouchableOpacity
    style={[styles.row, checked && styles.rowChecked]}
    activeOpacity={0.7}
    hitSlop={hitSlop}
    onPress={onToggle}>
    <Ionicons
      name={checked ? 'checkbox' : 'square-outline'}
      size={18}
      color={checked ? Colors.green : Colors.textMuted}
    />
    <View style={styles.textWrap}>
      <Text style={styles.label}>{label}</Text>
      {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    // Bare 10 sat off the 4dp rhythm, equidistant between sm (8) and md
    // (12); this is an icon-to-text gap, which the sm/md tie resolves in
    // favor of the smaller candidate, same as spacing.ts's own bare-6 rule.
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  rowChecked: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenMuted,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
    fontWeight: '600',
    color: Colors.navy,
  },
  subLabel: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    color: Colors.textMuted,
    marginTop: Spacing.xxs,
  },
});
