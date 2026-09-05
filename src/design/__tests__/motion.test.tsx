import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useReducedMotion, withTiming, withSpring } from 'react-native-reanimated';
import { useMotion } from '../motion';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    useReducedMotion: jest.fn(),
    withTiming: jest.fn(actual.withTiming),
    withSpring: jest.fn(actual.withSpring),
  };
});

type MotionResult = ReturnType<typeof useMotion>;

function Harness({ onResult }: { onResult: (r: MotionResult) => void }) {
  onResult(useMotion());
  return null;
}

function renderMotion(): MotionResult {
  let captured!: MotionResult;
  act(() => {
    TestRenderer.create(<Harness onResult={r => { captured = r; }} />);
  });
  return captured;
}

describe('useMotion', () => {
  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReset();
    (withTiming as jest.Mock).mockClear();
    (withSpring as jest.Mock).mockClear();
  });

  it('drives animations through Reanimated when motion is not reduced', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const motion = renderMotion();

    expect(motion.reduced).toBe(false);
    motion.timing(10);
    motion.spring(20);
    expect(withTiming).toHaveBeenCalledWith(10, undefined);
    expect(withSpring).toHaveBeenCalledWith(20, undefined);
  });

  it('snaps straight to the target value when reduced motion is enabled', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const motion = renderMotion();

    expect(motion.reduced).toBe(true);
    expect(motion.timing(10)).toBe(10);
    expect(motion.spring(20)).toBe(20);
    expect(withTiming).not.toHaveBeenCalled();
    expect(withSpring).not.toHaveBeenCalled();
  });
});
