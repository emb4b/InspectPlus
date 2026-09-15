// How many rows each looped table prints on the blank EMB form. The mapper
// pads every loop up to its minimum (see padRows) so a report with one
// outlet still prints the three outlet rows the form shows. Counted from
// the templates during tagging; each template's .tags.md restates the
// number beside the loop tag. Change both together.
export const ROW_MINIMUMS = {
  productLines: 1,
  permitsExtra: 0,
  abstractedWaterQuality: 5,
  wwtpOutlets: 3,
  wwtpComponents: 2,
  samplingPoints: 2,
  samplingParameters: 4,
  previousParameters: 4,
  dpConditions: 5,
  photoRows: 0,
} as const;
