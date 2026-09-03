// One 4dp rhythm for every gap, pad, and margin in the app. `xxs` (2) is
// kept for the icon-to-text hairline. 6 is deliberately absent: it was the
// most common value in the pre-token codebase (121 uses) but sits off the
// rhythm — those sites resolve to `xs` (icon/text gaps) or `sm` (everything
// else) rather than earning the scale a permanent exception.
export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof Spacing;
