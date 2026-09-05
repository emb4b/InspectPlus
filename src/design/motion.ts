import {
  useReducedMotion,
  withSpring,
  withTiming,
  WithSpringConfig,
  WithTimingConfig,
} from 'react-native-reanimated';

export const Duration = {
  fast: 100,
  short: 150,
  base: 200,
  slow: 300,
} as const;

export const Spring = {
  press: { damping: 15, stiffness: 300, mass: 1 } as WithSpringConfig,
  sheet: { damping: 18, stiffness: 200, mass: 1 } as WithSpringConfig,
} as const;

// Every token-driven animation in the app goes through this rather than
// calling withTiming/withSpring directly, so honoring the OS "reduce motion"
// setting is the default instead of something each component has to
// remember. Under reduced motion the target value is returned as-is, which
// assigns to a shared value as an instant state change.
export function useMotion() {
  const reduced = useReducedMotion();

  const timing = (toValue: number, config?: WithTimingConfig): number => {
    'worklet';
    return reduced ? toValue : withTiming(toValue, config);
  };

  const spring = (toValue: number, config?: WithSpringConfig): number => {
    'worklet';
    return reduced ? toValue : withSpring(toValue, config);
  };

  return { reduced, timing, spring };
}
