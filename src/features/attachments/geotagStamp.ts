import * as Location from 'expo-location';
import { withTimeout } from '../../utils/withTimeout';

const REVERSE_GEOCODE_TIMEOUT_MS = 8000;

// "12° 52' 0" N" / "121° 25' 45" E" — matches the degrees/minutes/seconds
// format DENR's existing photo-stamping convention uses (see the reference
// screenshots this feature was built from), not the decimal-degree format
// used elsewhere in this app (Establishment.geoLat/geoLng etc.).
export function toDms(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);
  const direction = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export function formatDmsPair(lat: number, lng: number): string {
  return `${toDms(lat, true)}, ${toDms(lng, false)}`;
}

// "July 8, 2026 at 8:54 AM"
export function formatStampDate(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} at ${timePart}`;
}

// Best-effort place name for the exact GPS spot — "region, city/municipality,
// district" style, joining whatever the platform geocoder actually returns
// (it varies by OS/provider and won't reliably match a specific admin
// hierarchy like region/municipality/barangay). Returns null — meaning the
// stamp's location line is simply omitted — when offline, when the lookup
// times out, or when the geocoder has nothing to offer, per the confirmed
// requirement: only add the location line when it can actually be resolved
// online at capture time, never block or fail the photo over it.
export async function reverseGeocodeLabel(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await withTimeout(
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
      REVERSE_GEOCODE_TIMEOUT_MS,
      'reverseGeocodeAsync'
    );
    const address = results?.[0];
    if (!address) return null;

    const parts = [address.region, address.subregion, address.district ?? address.city]
      .filter((part): part is string => !!part && part.trim().length > 0);

    return parts.length > 0 ? parts.join(', ') : null;
  } catch {
    return null;
  }
}
