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

// Two absolute offsets, not one — a Schmitt trigger. Expand fires below
// EXPAND_OFFSET, collapse fires above COLLAPSE_OFFSET, and the gap between
// them (48–140px) is a dead zone where neither fires. Both properties this
// needs fall out of using fixed absolute thresholds instead of a per-gesture
// anchor: a short/minor scroll that never leaves the dead zone produces no
// visible movement at all (it isn't "overly sensitive"), and because the
// thresholds never move, there's no way for one trigger to arm the other —
// getting from collapsed back to expanded requires the offset to actually
// cross back under EXPAND_OFFSET, a real reversal, not gesture-relative
// noise (nothing to oscillate).
const EXPAND_OFFSET = 48;
const COLLAPSE_OFFSET = 140;
const ANIM_DURATION = 220;

export const HeaderScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const collapsed = useSharedValue(0);
  // Discrete commit, separate from `collapsed` (the animated 0..1 value) —
  // guards each branch below so withTiming only ever fires once per actual
  // transition. Without it, `offsetY >= COLLAPSE_OFFSET` stays true for
  // every scroll frame for the rest of the scroll, not just the one frame it
  // first crosses, and each frame would restart the animation from wherever
  // it had gotten to — it never got to finish, which showed up as the header
  // fidgeting instead of collapsing smoothly once.
  const isCollapsed = useSharedValue(false);
  // True only while the user's finger is actually on the list (through any
  // resulting momentum). Libraries like KeyboardAwareScrollView call
  // `scrollTo()` programmatically to keep a focused field above the
  // keyboard — on a long form with many fields, each focus change fires one
  // of these synthetic jumps, which look exactly like a big user scroll to
  // a plain `onScroll` handler and were flipping `collapsed` back and forth
  // on every field tap, well outside of any real scrolling. Gating on this
  // flag means only a real drag (or its momentum) can ever move `collapsed`.
  //
  // A short, slow drag that's released with ~zero velocity never enters a
  // momentum phase at all — the native scroll view skips
  // onMomentumScrollBegin/End entirely in that case, so onEndDrag has to
  // clear this itself rather than waiting on onMomentumEnd. onMomentumBegin
  // sets it back to true only when a release actually continues into real
  // momentum.
  const dragging = useSharedValue(false);

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      'worklet';
      dragging.value = true;
    },
    onEndDrag: () => {
      'worklet';
      dragging.value = false;
    },
    onMomentumBegin: () => {
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

      // `collapsed` only ever animates on an actual state change (see
      // isCollapsed above) — a single, bounded ~220ms transition, not a
      // per-frame update. The collapsing blocks it drives (see
      // InspectionReportHeader/HomeHeader) reclaim real layout space via
      // height/maxHeight, which forces a Yoga layout pass on every write;
      // driving that continuously from every scroll frame (an earlier
      // version of this file did) was expensive enough to drop frames
      // during an ordinary scroll, and the resulting frame coalescing made
      // the header's motion look like it was flickering between states
      // even though the underlying value was never actually oscillating.
      if (offsetY <= EXPAND_OFFSET && isCollapsed.value) {
        isCollapsed.value = false;
        collapsed.value = withTiming(0, { duration: ANIM_DURATION });
      } else if (offsetY >= COLLAPSE_OFFSET && !isCollapsed.value) {
        isCollapsed.value = true;
        collapsed.value = withTiming(1, { duration: ANIM_DURATION });
      }
    },
  });

  const expand = () => {
    isCollapsed.value = false;
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
