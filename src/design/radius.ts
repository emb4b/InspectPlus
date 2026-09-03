// Six corner radii, down from the 17 distinct values in use before this.
// `pill` is deliberately far larger than any control it's applied to — RN
// clamps it to half the shorter side, which is what makes it read as a
// capsule at any height.
export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof Radius;
