import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useReducedMotion, withRepeat } from 'react-native-reanimated';
import { Skeleton } from './Skeleton';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    useReducedMotion: jest.fn(),
    withRepeat: jest.fn(actual.withRepeat),
  };
});

const render = (element: React.ReactElement) => {
  act(() => { TestRenderer.create(element); });
};

describe('Skeleton', () => {
  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReset();
    (withRepeat as jest.Mock).mockClear();
  });

  it('pulses when motion is not reduced', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    render(<Skeleton />);
    expect(withRepeat).toHaveBeenCalled();
  });

  it('renders a static placeholder under reduced motion', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    render(<Skeleton />);
    expect(withRepeat).not.toHaveBeenCalled();
  });
});
