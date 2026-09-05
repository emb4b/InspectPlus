import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  required?: boolean;
  style?: object;
}

// Each pill is a compliance-form control tapped repeatedly across a long
// inspection, one-handed, outdoors. Its visual box stays exactly as compact
// as before (a form's density can't change), so the 48dp minimum comes
// entirely from `hitSlop` padding the invisible tappable area around it,
// following the same MIN_TARGET / hitSlopFor formula as Button.tsx and
// YesNoNAToggle.
const MIN_TARGET = 48;
// The pill's own vertical padding stays a literal 7 (not Spacing.sm/8):
// snapping it onto the scale would grow the visible pill by a couple of
// pixels, which is exactly the visual change this fix must not make. This
// constant is that literal, reused below for both the style and this
// measurement so the two can't drift apart.
const PILL_PADDING_VERTICAL = 7;
// The pill's true height: paddingVertical top + bottom, plus the option
// label's own line height - there's no declared height/minHeight here, so
// this mirrors how YesNoNAToggle's own MEASURED_HEIGHT is derived.
// 7 + 7 + 16 = 30dp, short of the 48dp minimum by 18dp.
const MEASURED_HEIGHT = PILL_PADDING_VERTICAL * 2 + Type.label.lineHeight;
const hitSlop = (() => {
  const pad = Math.max(0, Math.round((MIN_TARGET - MEASURED_HEIGHT) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
})();

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  options,
  value,
  onChange,
  required,
  style,
}) => (
  <View style={[styles.group, style]}>
    {label && (
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.req}> *</Text>}
      </Text>
    )}
    <View style={styles.row}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pill, active && styles.pillActive]}
            activeOpacity={0.7}
            hitSlop={hitSlop}
            onPress={() => onChange(opt.value)}>
            <View style={[styles.dot, active && styles.dotActive]} />
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  group: {
    marginBottom: Spacing.lg,
    flex: 1,
  },
  label: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
    // Bare 6, not an icon/text gap - resolves to sm (8) per spacing.ts's
    // documented rule for that value.
    marginBottom: Spacing.sm,
  },
  req: {
    color: Colors.conflict,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    // Bare 7 sat off the 4dp rhythm, nearer to sm (8) than xs (4).
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    // Deliberately NOT Spacing.sm - see PILL_PADDING_VERTICAL above. This is
    // the one value in this file that stays off the token scale on purpose.
    paddingVertical: PILL_PADDING_VERTICAL,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  pillActive: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenMuted,
  },
  dot: {
    // The dot's own diameter, not a spacing value - stays a literal, same
    // reasoning as DynamicRowTable's removeBtn width.
    width: 10,
    height: 10,
    // Was a bare 5 (half of `width`, for a circle). RN clamps borderRadius
    // to half the shorter side, so Radius.pill renders the identical circle
    // without a magic number - same substitution as DateField's dayBtn.
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.textLight,
  },
  dotActive: {
    borderColor: Colors.green,
    backgroundColor: Colors.green,
  },
  pillText: {
    // Bare 12.5 sits exactly between label (12) and bodySm (13); resolved
    // down to label - this is a compact chip label, not prose.
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
    fontWeight: '600',
    color: Colors.navy,
  },
  pillTextActive: {
    color: Colors.green,
  },
});
