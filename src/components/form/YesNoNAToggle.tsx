import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../design/colors';
import { Radius } from '../../design/radius';
import { Spacing } from '../../design/spacing';
import { Type } from '../../design/typography';

export type YnValue = 'Y' | 'N' | 'NA' | null;

interface YesNoNAToggleProps {
  value: YnValue;
  onChange: (value: YnValue) => void;
}

const OPTIONS: { key: Exclude<YnValue, null>; label: string; color: string }[] = [
  { key: 'Y', label: 'Y', color: Colors.synced },
  { key: 'N', label: 'N', color: Colors.conflict },
  { key: 'NA', label: 'NA', color: Colors.pending },
];

// This is the control an inspector taps on every row of a DAO compliance
// checklist — dozens of times per report, one-handed, outdoors. Its visual
// box stays exactly as compact as before (a checklist row's density can't
// change), so the 48dp Android minimum comes entirely from `hitSlop`
// padding the invisible tappable area around it, following the same
// MIN_TARGET / hitSlopFor formula as Button.tsx.
const MIN_TARGET = 48;
// The box's own rendered height: paddingVertical (Spacing.xs top + bottom)
// plus the label's own line height (Type.caption.lineHeight) — there's no
// declared height/minHeight here, so this is that box's true height,
// computed the same way Button.tsx's HEIGHT record names its minHeight.
// 4 + 4 + 14 = 22dp, well under half of 48.
const MEASURED_HEIGHT = Spacing.xs * 2 + Type.caption.lineHeight;
const hitSlop = (() => {
  const pad = Math.max(0, Math.round((MIN_TARGET - MEASURED_HEIGHT) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
})();

export const YesNoNAToggle: React.FC<YesNoNAToggleProps> = ({ value, onChange }) => (
  <View style={styles.row}>
    {OPTIONS.map(opt => {
      const active = value === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.btn,
            active && { borderColor: opt.color, backgroundColor: `${opt.color}1a` },
          ]}
          activeOpacity={0.7}
          hitSlop={hitSlop}
          onPress={() => onChange(active ? null : opt.key)}>
          <Text style={[styles.btnText, active && { color: opt.color }]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // Bare 6, not an icon/text gap - resolves to sm (8) per spacing.ts's
    // documented rule for that value.
    gap: Spacing.sm,
  },
  btn: {
    // paddingHorizontal stays a literal 10, deliberately NOT rounded onto
    // the Spacing scale (sm=8 / md=12): either token would change this
    // control's visual footprint, and the whole point of the hitSlop above
    // is to close the reachability gap withOUT touching the visual box.
    // paddingVertical=4 does land exactly on Spacing.xs, so that one is
    // tokenized.
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  // Already exactly Type.caption (11/14) - the type scale's floor, which is
  // appropriate here: this is a compact per-row control, not prose.
  btnText: {
    fontSize: Type.caption.fontSize,
    lineHeight: Type.caption.lineHeight,
    fontWeight: '700',
    color: Colors.textMuted,
  },
});
