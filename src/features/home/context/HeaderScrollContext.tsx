import React, { createContext, useContext, useRef } from 'react';
import {
  SharedValue,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface HeaderScrollContextValue {
  // 0 = expanded, 1 = collapsed. A shared value rather than React state so
  // the header animates entirely on the UI thread — updated straight from
  // the scroll worklet below, with no JS-thread round trip per scroll frame.
  // That's what actually fixed the stutter: RN core's Animated API (and any
  // React-state-driven animation) has to cross the bridge on every frame,
  // competing with the scroll event handling itself for JS-thread time.
  collapsed: SharedValue<number>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  expand: () => void;
}

const HeaderScrollContext = createContext<HeaderScrollContextValue | null>(null);

// Near the top the header always stays expanded, regardless of direction.
const TOP_OFFSET = 8;
// Distance (px) the offset has to move away from the last committed point
// before the header reacts — collapsing takes a deliberate scroll into
// content, expanding reacts to a smaller scroll back toward the top. The
// anchor only moves when one of these fires, so small back-and-forth noise
// within a single scroll gesture (touch jitter, momentum deceleration)
// can't repeatedly flip the state — it takes a real reversal each time.
const COLLAPSE_DISTANCE = 24;
const EXPAND_DISTANCE = 10;
const ANIM_DURATION = 220;

export const HeaderScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const collapsed = useSharedValue(0);
  const anchor = useSharedValue(0);
  // True only while the user's finger is actually on the list (through any
  // resulting momentum). Libraries like KeyboardAwareScrollView call
  // `scrollTo()` programmatically to keep a focused field above the
  // keyboard — on a long form with many fields, each focus change fires one
  // of these synthetic jumps, which look exactly like a big user scroll to
  // a plain `onScroll` handler and were flipping `collapsed` back and forth
  // on every field tap, well outside of any real scrolling. Gating on this
  // flag means only a real drag (or its momentum) can ever move `collapsed`.
  const dragging = useSharedValue(false);

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      'worklet';
      dragging.value = true;
    },
    onMomentumEnd: () => {
      'worklet';
      dragging.value = false;
    },
    onScroll: event => {
      'worklet';
      if (!dragging.value) {
        return;
      }

      const offsetY = event.contentOffset.y;

      if (offsetY <= TOP_OFFSET) {
        anchor.value = offsetY;
        collapsed.value = withTiming(0, { duration: ANIM_DURATION });
        return;
      }

      const diff = offsetY - anchor.value;

      if (diff > COLLAPSE_DISTANCE) {
        anchor.value = offsetY;
        collapsed.value = withTiming(1, { duration: ANIM_DURATION });
      } else if (diff < -EXPAND_DISTANCE) {
        anchor.value = offsetY;
        collapsed.value = withTiming(0, { duration: ANIM_DURATION });
      }
    },
  });

  const expand = () => {
    anchor.value = 0;
    collapsed.value = withTiming(0, { duration: ANIM_DURATION });
  };

  // Stable across renders — the Provider itself never re-renders (its own
  // state lives in shared values), so this only needs to be computed once.
  const value = useRef<HeaderScrollContextValue>({ collapsed, onScroll, expand }).current;

  return <HeaderScrollContext.Provider value={value}>{children}</HeaderScrollContext.Provider>;
};

export function useHeaderScroll(): HeaderScrollContextValue {
  const ctx = useContext(HeaderScrollContext);
  if (!ctx) {
    throw new Error('useHeaderScroll must be used within a HeaderScrollProvider');
  }
  return ctx;
}
