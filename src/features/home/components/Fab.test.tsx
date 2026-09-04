import React from 'react';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { useReducedMotion, withTiming } from 'react-native-reanimated';
import { Fab, FAB_SIZE } from './Fab';
import { Colors } from '../../../design/colors';
import { Elevation } from '../../../design/elevation';
import { Radius } from '../../../design/radius';
import { Duration } from '../../../design/motion';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    useReducedMotion: jest.fn(),
    withTiming: jest.fn(actual.withTiming),
  };
});

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  act(() => { r = TestRenderer.create(element); });
  return r;
};

// Flatten a StyleProp (single object or array) into a single resolved style object.
const flattenStyle = (style: any): any => {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, s) => ({ ...acc, ...(s || {}) }), {});
  }
  return style;
};

// Locate the FAB view by its resolved styles: backgroundColor === Colors.green
// and borderRadius === Radius.pill. Throw a clear error if zero or more than one match is found.
const findFabView = (r: Renderer) => {
  const views = r.root.findAll((n) => {
    return (n.type as any)?.name === 'View' || n.type === View;
  });

  const matches = views.filter((n) => {
    const flattened = flattenStyle(n.props.style);
    return flattened.backgroundColor === Colors.green && flattened.borderRadius === Radius.pill;
  });

  if (matches.length === 0) {
    throw new Error('No FAB View found: expected a View with backgroundColor === Colors.green and borderRadius === Radius.pill');
  }
  if (matches.length > 1) {
    throw new Error(`Expected 1 FAB View but found ${matches.length}; the locator is not sufficiently specific`);
  }

  return matches[0];
};

describe('Fab', () => {
  afterEach(() => {
    (useReducedMotion as jest.Mock).mockReset();
    (withTiming as jest.Mock).mockClear();
  });

  it('exports FAB_SIZE constant', () => {
    expect(FAB_SIZE).toBe(56);
  });

  it('renders with base styles', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const r = render(<Fab open={false} onPress={() => {}} />);
    const fabView = findFabView(r);
    const flattened = flattenStyle(fabView.props.style);

    // Assert base style tokens are resolved correctly.
    expect(flattened.backgroundColor).toBe(Colors.green);
    expect(flattened.borderRadius).toBe(Radius.pill);
    expect(flattened.width).toBe(FAB_SIZE);
    expect(flattened.height).toBe(FAB_SIZE);
    expect(flattened.alignItems).toBe('center');
    expect(flattened.justifyContent).toBe('center');

    // Assert every field of Elevation.fab is present with its exact value.
    Object.entries(Elevation.fab).forEach(([key, value]) => {
      expect(flattened[key]).toEqual(value);
    });
  });

  it('has correct accessibility label when closed', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const r = render(<Fab open={false} onPress={() => {}} />);
    const touchable = r.root.findByProps({ accessibilityRole: 'button' });
    expect(touchable.props.accessibilityLabel).toBe('Create new report');
  });

  it('has correct accessibility label when open', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const r = render(<Fab open={true} onPress={() => {}} />);
    const touchable = r.root.findByProps({ accessibilityRole: 'button' });
    expect(touchable.props.accessibilityLabel).toBe('Close report type menu');
  });

  it('sets correct accessibility state when closed', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const r = render(<Fab open={false} onPress={() => {}} />);
    const touchable = r.root.findByProps({ accessibilityRole: 'button' });
    expect(touchable.props.accessibilityState.expanded).toBe(false);
  });

  it('sets correct accessibility state when open', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const r = render(<Fab open={true} onPress={() => {}} />);
    const touchable = r.root.findByProps({ accessibilityRole: 'button' });
    expect(touchable.props.accessibilityState.expanded).toBe(true);
  });

  it('animates rotation when motion is not reduced', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    (withTiming as jest.Mock).mockImplementation((target, config) => target);

    const r = render(<Fab open={false} onPress={() => {}} />);
    act(() => {
      r.update(<Fab open={true} onPress={() => {}} />);
    });

    // Assert that withTiming was called with the open rotation value.
    expect(withTiming).toHaveBeenCalledWith(45, { duration: Duration.short });
  });

  it('snaps rotation without animating when reduce-motion is on', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    (withTiming as jest.Mock).mockImplementation((target, config) => target);

    const r = render(<Fab open={false} onPress={() => {}} />);
    act(() => {
      r.update(<Fab open={true} onPress={() => {}} />);
    });

    // Assert that withTiming was not called when reduced motion is enabled.
    expect(withTiming).not.toHaveBeenCalled();
  });

  it('calls onPress when tapped', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const onPress = jest.fn();
    const r = render(<Fab open={false} onPress={onPress} />);

    const touchable = r.root.findByProps({ accessibilityRole: 'button' });
    act(() => {
      touchable.props.onPress();
    });

    expect(onPress).toHaveBeenCalled();
  });

  it('changes accessibility label when transitioning from closed to open', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const r = render(<Fab open={false} onPress={() => {}} />);

    let touchable = r.root.findByProps({ accessibilityRole: 'button' });
    expect(touchable.props.accessibilityLabel).toBe('Create new report');

    act(() => {
      r.update(<Fab open={true} onPress={() => {}} />);
    });

    touchable = r.root.findByProps({ accessibilityRole: 'button' });
    expect(touchable.props.accessibilityLabel).toBe('Close report type menu');
  });
});
