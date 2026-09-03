import React from 'react';
import { View, Text, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { MarqueeText } from './MarqueeText';

export type AppTextVariant = 'single' | 'multiline' | 'marquee';

interface AppTextProps {
  // 'single'   — one line, clipped with an ellipsis if it doesn't fit.
  // 'multiline' — wraps up to `lines` lines, then clips with an ellipsis.
  // 'marquee'  — one line; if it doesn't fit, loops in a horizontal scroll
  //              instead of clipping. See MarqueeText for why.
  variant: AppTextVariant;
  text: string;
  style?: StyleProp<TextStyle>;
  // Sizes the wrapping box. Only meaningful for 'marquee' (that's what its
  // overflow check measures against) — accepted for 'single'/'multiline'
  // too so a field can switch variants without its caller needing to
  // restructure surrounding layout/spacing.
  containerStyle?: StyleProp<ViewStyle>;
  // 'multiline' only — how many lines before clipping. Default 2.
  lines?: number;
  // 'marquee' only — see MarqueeText's own prop docs.
  speed?: number;
  pauseDuration?: number;
  gap?: number;
  testID?: string;
}

// The app's single point of truth for how a piece of dynamic, potentially-
// overflowing text is displayed: clipped to one line, wrapped across a few,
// or scrolled. Picking the variant is a per-field editorial call — this
// component only handles rendering it once that call is made.
//
// When to use 'marquee' (the other two are the default otherwise):
//   - Use it when the field's length is solely dependent on this
//     inspection's own input and can genuinely run long — a name, an
//     address, a free-text description.
//   - Do NOT use it for predefined/uniform fields — menu tab titles,
//     section/field titles — these never come from inspection input at all.
//   - Do NOT use it for input-dependent fields that are intrinsically short
//     — dates, anything picked from a predefined set of choices, yes/no
//     answers. These stay short by construction, and every marquee
//     instance carries a real cost (an always-mounted ScrollView for
//     measurement, plus a continuously-running animation once one actually
//     scrolls) — not worth paying where it can never do anything.
export const AppText: React.FC<AppTextProps> = ({
  variant,
  text,
  style,
  containerStyle,
  lines = 2,
  speed,
  pauseDuration,
  gap,
  testID,
}) => {
  if (variant === 'marquee') {
    return (
      <MarqueeText
        text={text}
        style={style}
        containerStyle={containerStyle}
        speed={speed}
        pauseDuration={pauseDuration}
        gap={gap}
        testID={testID}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={style} numberOfLines={variant === 'multiline' ? lines : 1} ellipsizeMode="tail" testID={testID}>
        {text}
      </Text>
    </View>
  );
};
