import React from 'react';
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../design/colors';
import { Radius } from '../design/radius';
import { Spacing } from '../design/spacing';
import { Type } from '../design/typography';

// The app's single button vocabulary. Before this existed, the same action
// was drawn differently depending on which screen it landed on — "Edit" was
// navy/1.5px/radius-7 beside a section header but grey/1px/radius-8 on the
// establishment card, and the confirm button was green at two different
// sizes. Everything here is one radius, one stroke weight, and paddings on
// the 4/8dp rhythm so that can't drift again.
export type ButtonVariant = 'primary' | 'success' | 'danger' | 'outline' | 'subtle';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  // Swaps the label for a spinner while an action is in flight. Kept as its
  // own flag rather than folded into `disabled` so the button can stay the
  // same width and not make the row jump.
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Android asks for 48dp of tappable area, which is taller than these buttons
// want to look sitting next to a section title. hitSlop makes up the
// difference invisibly rather than inflating the visual box: a control this
// small was previously ~27dp tall, small enough that real taps missed it.
const MIN_TARGET = 48;
const HEIGHT: Record<ButtonSize, number> = { sm: 32, md: 40 };
const hitSlopFor = (size: ButtonSize) => {
  const pad = Math.max(0, Math.round((MIN_TARGET - HEIGHT[size]) / 2));
  return { top: pad, bottom: pad, left: pad, right: pad };
};

const LABEL_COLOR: Record<ButtonVariant, string> = {
  primary: Colors.textWhite,
  success: Colors.textWhite,
  danger: Colors.textWhite,
  outline: Colors.navy,
  subtle: Colors.textPrimary,
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'outline',
  size = 'sm',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const isInactive = disabled || loading;
  const labelColor = LABEL_COLOR[variant];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        style,
      ]}
      onPress={onPress}
      disabled={isInactive}
      hitSlop={hitSlopFor(size)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}>
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <>
          {/* Decorative: the label right beside it already carries the
              meaning, so it stays out of the accessibility tree. */}
          {icon && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 13 : 15}
              color={labelColor}
              importantForAccessibility="no"
            />
          )}
          <Text style={[styles.label, styles[`${size}Label`], { color: labelColor }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // An icon-to-label gap, same as every other icon+text pairing in the
    // app (see spacing.ts: 6 is deliberately off the 4dp rhythm and
    // resolves to `xs` for this kind of gap) — was a bare 6 before this
    // migrated onto the scale.
    gap: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.transparent,
  },
  sm: {
    minHeight: HEIGHT.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  md: {
    minHeight: HEIGHT.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  fullWidth: {
    flex: 1,
  },
  // Reduced emphasis rather than a different shape, so a disabled control
  // still reads as the same button.
  inactive: {
    opacity: 0.55,
  },
  primary: {
    backgroundColor: Colors.navy,
  },
  success: {
    backgroundColor: Colors.green,
  },
  danger: {
    backgroundColor: Colors.conflict,
  },
  outline: {
    backgroundColor: Colors.white,
    borderColor: Colors.navy,
  },
  subtle: {
    backgroundColor: Colors.bgLight,
  },
  label: {
    fontWeight: '700',
  },
  // `sm`'s label maps to Type.label (12) and `md`'s to Type.bodySm (13) —
  // the conservative reading that keeps both sizes exactly where they
  // already were, just resolved from the scale instead of a bare literal.
  smLabel: {
    fontSize: Type.label.fontSize,
    lineHeight: Type.label.lineHeight,
  },
  mdLabel: {
    fontSize: Type.bodySm.fontSize,
    lineHeight: Type.bodySm.lineHeight,
  },
});
