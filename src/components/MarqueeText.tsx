import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, StyleProp, TextStyle, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface MarqueeTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  // Pixels per second the text scrolls once a loop starts moving.
  speed?: number;
  // How long the text holds still — at the start of each loop — before it starts scrolling.
  pauseDuration?: number;
  // Space between the looped copy and its repeat, so the seam doesn't read as text running together.
  gap?: number;
  testID?: string;
}

const DEFAULT_SPEED = 40;
const DEFAULT_PAUSE_MS = 1200;
const DEFAULT_GAP = 32;

// Drop-in replacement for a single-line, truncated <Text numberOfLines={1}>.
// Measures the text against its container and, only when it actually
// overflows, loops it in a continuous horizontal scroll (pause, scroll,
// snap back) instead of clipping it with an ellipsis. Text that fits
// renders exactly as a normal <Text> would (same alignment, no animation,
// no overhead) via an off-screen probe rather than the visible node.
//
// That probe is a horizontal ScrollView, not a plain absolutely-positioned
// Text — width is read from the ScrollView's own onContentSizeChange rather
// than a layout measurement. A plain Text probe measured via onLayout goes
// through the same Yoga box-sizing pass as any other node — and
// empirically, when nothing else pins its width, Yoga caps an unconstrained
// node's reported size at its nearest resolved ancestor width instead of
// its true (larger) content width. That cap only bites when the content is
// actually wider than the container — exactly the overflowing case a
// marquee exists for — so short values measured fine and the very ones
// that needed scrolling silently didn't. A ScrollView's content size is
// never subject to that: it's what tells the ScrollView how far there is
// to scroll, so it's always the content's true width, regardless of
// whatever width Yoga gives the (invisible) ScrollView itself.
export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  style,
  containerStyle,
  speed = DEFAULT_SPEED,
  pauseDuration = DEFAULT_PAUSE_MS,
  gap = DEFAULT_GAP,
  testID,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const offset = useSharedValue(0);

  const shouldScroll = containerWidth > 0 && contentWidth > containerWidth;

  // Translating the track is deliberately NOT the same as scrolling a
  // ScrollView. Driving a native scroll offset (scrollTo + a per-frame
  // useAnimatedReaction, which is what this used to do) pushes a scroll
  // command through native scroll handling and the mounting layer on every
  // single frame, for every instance that happens to be looping. A transform
  // is a composited property the UI thread can apply on its own. That
  // difference is the whole reason a screen with only two marquees on it
  // could still feel like it was dropping touches.
  useEffect(() => {
    if (!shouldScroll) {
      offset.value = 0;
      return;
    }
    const distance = contentWidth + gap;
    const scrollDuration = (distance / speed) * 1000;
    offset.value = 0;
    offset.value = withRepeat(
      withSequence(
        withTiming(0, { duration: pauseDuration }),
        withTiming(-distance, { duration: scrollDuration, easing: Easing.linear }),
      ),
      -1,
      false,
    );
  }, [shouldScroll, contentWidth, gap, speed, pauseDuration, offset]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // The probe stays mounted and keeps accepting reports: onContentSizeChange
  // fires more than once, and an early report can be the constrained width
  // from before the text has fully laid out. Latching the first non-zero
  // value instead locks in a width too small for `contentWidth >
  // containerWidth` to ever be true, which silently turns every marquee on
  // the screen back into a plain ellipsis.
  //
  // Once shouldScroll adds the second copy for the loop, further reports
  // cover both copies + the gap — those are ignored; the single-copy
  // measurement already taken is what the loop's distance is computed from.
  const handleContentSizeChange = useCallback(
    (w: number) => {
      if (!shouldScroll) setContentWidth(w);
    },
    [shouldScroll],
  );

  return (
    <View style={[styles.container, containerStyle]} onLayout={handleContainerLayout} testID={testID}>
      {/* Off-screen probe — see the module comment for why this measures via
          a ScrollView's content size rather than a Text's own layout. Plain
          ScrollView, not Animated: nothing here ever animates, it only
          reports a width. */}
      <ScrollView
        style={styles.hiddenMeasure}
        horizontal
        scrollEnabled={false}
        pointerEvents="none"
        onContentSizeChange={handleContentSizeChange}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        <Text style={style} numberOfLines={1}>
          {text}
        </Text>
      </ScrollView>
      {shouldScroll ? (
        // Both copies are pinned to the measured content width. Inside a flex
        // row they are otherwise bounded by the container and a
        // numberOfLines={1} Text that hits that bound ellipsizes — which put
        // a "…" in the middle of the scrolling string. flexShrink: 0 keeps
        // the row from compressing them back down; the pair overflows the
        // track on purpose and the container's overflow: hidden clips it.
        <Animated.View style={[styles.track, trackStyle]} pointerEvents="none">
          {/* Only the first copy is exposed to accessibility — the second
              exists purely so the loop has something to scroll into, and
              would otherwise read the same value twice. */}
          <Text style={[style, styles.copy, { width: contentWidth }]} numberOfLines={1}>{text}</Text>
          <View style={{ width: gap }} />
          <Text
            style={[style, styles.copy, { width: contentWidth }]}
            numberOfLines={1}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden>
            {text}
          </Text>
        </Animated.View>
      ) : (
        <Text style={style} numberOfLines={1} ellipsizeMode="tail">
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  hiddenMeasure: {
    position: 'absolute',
    opacity: 0,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    flexShrink: 0,
  },
});
