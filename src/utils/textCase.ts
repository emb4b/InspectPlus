export type TextCaseMode = 'upper' | 'sentence' | 'none';

export function toUpperCaseText(value: string): string {
  return value.toUpperCase();
}

// Capitalizes the first letter of the string and the first letter following
// sentence-ending punctuation (". ", "! ", "? "), leaving the rest of the
// text as typed so acronyms/proper nouns the user capitalized aren't undone.
export function toSentenceCaseText(value: string): string {
  return value.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, match => match.toUpperCase());
}

export function applyTextCase(value: string, mode: TextCaseMode): string {
  if (mode === 'upper') return toUpperCaseText(value);
  if (mode === 'none') return value;
  return toSentenceCaseText(value);
}

// Trailing whitespace isn't meaningful input — e.g. an establishment name
// saved with a trailing space would silently fail exact-match lookups
// elsewhere. Only the trailing edge is stripped so spaces between words
// typed mid-sentence are left alone.
export function stripTrailingSpaces(value: string): string {
  return value.replace(/[ \t]+$/, '');
}
