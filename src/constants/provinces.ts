// EMB Region 4-B provinces, plus their cities/municipalities and barangays —
// the region every sample fixture and constant in this app is scoped to (see
// supabase/tests and the "EMB Region 4-B" copy throughout the home screen).
// Not an exhaustive PH province list. Backed by the bundled dataset in
// src/data/mimaropaLocations.ts so address entry can cascade Province ->
// City/Municipality -> Barangay while staying fully offline.
import { LOCATIONS } from '../data/mimaropaLocations';

export const PROVINCE_OPTIONS = Object.keys(LOCATIONS);

export function getCityOptions(province: string): string[] {
  return province ? Object.keys(LOCATIONS[province] ?? {}) : [];
}

export function getBarangayOptions(province: string, city: string): string[] {
  if (!province || !city) return [];
  return LOCATIONS[province]?.[city] ?? [];
}
