import { Spacing } from '../../design/spacing';

// The gap between the Generate button and the app's bottom chrome, shared by
// the selection bar (ExportReportsTab) and the signatory sheet
// (SignatorySheet) so the button doesn't jump when the sheet opens over it.
// This was Spacing.xl while Button's fullWidth was `flex: 1`: Yoga measured
// that button as padding+border only and it overflowed 13dp into this gap,
// so 24 read as ~11 on screen. Now that the button sits where it's told,
// md is the value that visual tuning was actually settling on.
export const GENERATE_BOTTOM_GAP = Spacing.md;
