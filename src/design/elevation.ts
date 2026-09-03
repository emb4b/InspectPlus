// Each level emits the iOS shadow properties AND the Android elevation
// value together. React Native ignores whichever set doesn't apply to the
// running platform, so a single spread keeps the two in step — the bug this
// prevents is real: EstablishmentCard shipped `shadowOpacity: 0.04` beside
// `elevation: 1`, which do not read as the same weight on the two platforms.
interface ElevationStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const SHADOW_COLOR = '#000000';

function level(height: number, opacity: number, radius: number, elevation: number): ElevationStyle {
  return {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const Elevation = {
  flat: level(0, 0, 0, 0),
  raised: level(1, 0.08, 3, 2),
  overlay: level(3, 0.12, 8, 4),
  modal: level(6, 0.16, 16, 8),
  fab: level(4, 0.2, 10, 6),
} as const;

export type ElevationToken = keyof typeof Elevation;
