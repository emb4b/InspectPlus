// Eight sizes, down from the 13 distinct values in use before this. Two
// things matter here and were decided deliberately:
//
//   1. `body` is 14, not the 12 the app previously used for body copy. The
//      old scale bottomed out at 7-9px, which is not legible on a phone
//      held at arm's length in daylight — the actual working condition for
//      an environmental inspector. 11 is now the absolute floor.
//   2. Every entry carries its own lineHeight. Setting fontSize without
//      lineHeight was the main source of uneven vertical rhythm between
//      screens that otherwise used the same size.
export const Type = {
  display: { fontSize: 24, lineHeight: 30 },
  title: { fontSize: 20, lineHeight: 26 },
  heading: { fontSize: 17, lineHeight: 24 },
  subheading: { fontSize: 15, lineHeight: 21 },
  body: { fontSize: 14, lineHeight: 20 },
  bodySm: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16 },
  caption: { fontSize: 11, lineHeight: 14 },
} as const;

export type TypeToken = keyof typeof Type;

// The app previously left `allowFontScaling` unset everywhere, which means
// the OS font-size setting silently resized everything — including
// fixed-width table cells that break when it does. These are the two
// deliberate positions: prose scales, tabular content does not.
export const FONT_SCALING = {
  content: true,
  tabular: false,
} as const;
