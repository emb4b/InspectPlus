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
