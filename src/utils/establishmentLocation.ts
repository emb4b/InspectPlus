// Parts of an address as they're held on both the establishment record and
// the report's own general-info form draft — structural rather than tied to
// EstablishmentDTO, so the same helper serves the form state too.
interface EstablishmentLocationParts {
  addressLine?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
}

// The address subtitle shown under an establishment's name, wherever it
// appears — the list rows, the detail and edit headers, the report headers
// and the picker.
//
// Barangay sits between the street address and the city, which is how a
// Philippine address is written and what an inspector needs to actually find
// the site: "2713 Zamora St., Cabigaan, Aborlan, Palawan".
//
// Empty parts drop out rather than leaving their separators behind. Two call
// sites used to build this by interpolating directly, so an establishment
// with no street address on record yet rendered as ", Aborlan, Palawan".
export function formatEstablishmentLocation(parts: EstablishmentLocationParts): string {
  return [parts.addressLine, parts.barangay, parts.city, parts.province]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(', ');
}
