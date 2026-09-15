import Constants from 'expo-constants';

// Compares dotted-integer version strings segment by segment (so "1.10.0" >
// "1.9.0", unlike a plain string comparison). Missing trailing segments are
// treated as 0, e.g. "1.2" == "1.2.0".
export function compareVersions(a: string, b: string): number {
  const segmentsA = a.split('.').map(Number);
  const segmentsB = b.split('.').map(Number);
  const length = Math.max(segmentsA.length, segmentsB.length);

  for (let i = 0; i < length; i++) {
    const segmentA = segmentsA[i] ?? 0;
    const segmentB = segmentsB[i] ?? 0;
    if (segmentA !== segmentB) return segmentA < segmentB ? -1 : 1;
  }

  return 0;
}

// Falls back to '0.0.0' (rather than throwing) if expoConfig is ever
// unavailable, so a version check that can't determine the running version
// fails safe by assuming it's outdated instead of silently skipping the gate.
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

// What the app prints about itself - "v1.0.3 (12)" when a native build
// number is known, "v1.0.3" otherwise (Expo Go, or a build without one).
// This is the string an inspector reads off the footer when asked which
// version they are on, so it should match what a support ticket needs:
// the marketing version and the build that actually shipped.
//
// Constants.nativeBuildVersion is deprecated in favour of expo-application,
// which this project doesn't depend on; it still reports the value and
// pulling in a package for one string isn't worth it.
export function describeAppVersion(): string {
  const build = Constants.nativeBuildVersion;
  return build ? `v${getCurrentAppVersion()} (${build})` : `v${getCurrentAppVersion()}`;
}
