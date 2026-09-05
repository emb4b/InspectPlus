import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Android asks for 48dp of tappable area. Rather than inflating the visual
// box of small controls, the shortfall is made up invisibly with hitSlop —
// the same trick Button.tsx uses, generalized to a control of any size by
// measuring it instead of being told its height up front.
const MIN_TARGET = 48;

export interface TouchableProps extends Omit<PressableProps, 'style' | 'hitSlop'> {
  // Required, not optional: the app shipped 138 touch targets with 2
  // accessibilityRoles between them. Putting these in the type is what stops
  // that recurring.
  accessibilityRole: NonNullable<PressableProps['accessibilityRole']>;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  minTargetSize?: number;
}

const NO_SLOP = { top: 0, bottom: 0, left: 0, right: 0 };

export const Touchable: React.FC<TouchableProps> = ({
  style,
  minTargetSize = MIN_TARGET,
  onLayout,
  children,
  ...rest
}) => {
  const [hitSlop, setHitSlop] = useState(NO_SLOP);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      const vertical = Math.max(0, Math.round((minTargetSize - height) / 2));
      const horizontal = Math.max(0, Math.round((minTargetSize - width) / 2));
      setHitSlop({ top: vertical, bottom: vertical, left: horizontal, right: horizontal });
      onLayout?.(event);
    },
    [minTargetSize, onLayout],
  );

  return (
    <Pressable style={style} hitSlop={hitSlop} onLayout={handleLayout} {...rest}>
      {children}
    </Pressable>
  );
};
