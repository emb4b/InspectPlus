import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../design/colors';
import { Duration, useMotion } from '../design/motion';
import { Radius } from '../design/radius';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const RESTING_OPACITY = 0.4;
const PULSE_OPACITY = 0.8;
const STATIC_OPACITY = 0.5;

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  radius = Radius.sm,
  style,
}) => {
  const { reduced } = useMotion();
  const opacity = useSharedValue(RESTING_OPACITY);

  useEffect(() => {
    if (reduced) {
      // A settled value rather than a paused animation — a loading
      // placeholder that never resolves visually is worse than a static one.
      opacity.value = STATIC_OPACITY;
      return;
    }
    opacity.value = withRepeat(withTiming(PULSE_OPACITY, { duration: Duration.slow }), -1, true);
  }, [reduced, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bgDisabled,
  },
});
