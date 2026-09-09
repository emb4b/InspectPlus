export const Colors = {
  // Primary brand
  navy: '#0d2137',
  navyLight: '#1a3550',
  green: '#1a9e45',
  greenLight: '#4ade80',
  greenMuted: '#d1fae5',
  // The active-tab underline color. It shipped as a bare '#5b4fcf' inside
  // HomeTabs and existed nowhere else in the palette — named here so the one
  // place it's used isn't the definition of it.
  accent: '#5b4fcf',

  // Backgrounds
  white: '#ffffff',
  bgLight: '#f3f4f6',
  bgMuted: '#f8fafc',
  // Non-fillable fields (readOnly TextField, disabled SelectField) — darker
  // than bgLight so locked inputs read as clearly inactive next to bgMuted's
  // near-white fillable fields, rather than blending together.
  bgDisabled: '#e5e7eb',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  textLight: '#94a3b8',
  textWhite: '#ffffff',

  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Status / compliance badge colors
  // Orange is the one hue left that separates cleanly from the other four
  // report types at glyph size — water's blue, survey's green, eia's violet
  // and hazwaste's red. It shipped as a neutral grey (the same value as
  // textMuted), which made air the only type whose tile read as "untyped".
  // badgeBg/badgeText stay blue: Badge's `info` tone is their only consumer
  // and has nothing to do with air monitoring.
  air: {
    bg: '#fff7ed',
    border: '#fed7aa',
    text: '#ea580c',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
  },
  water: {
    bg: '#f0f9ff',
    border: '#bae6fd',
    text: '#0284c7',
    badgeBg: '#dcfce7',
    badgeText: '#166534',
  },
  hazwaste: {
    bg: '#fff7f7',
    border: '#fecaca',
    text: '#dc2626',
    badgeBg: '#fee2e2',
    badgeText: '#991b1b',
  },
  eia: {
    bg: '#faf5ff',
    border: '#ddd6fe',
    text: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeText: '#5b21b6',
  },
  survey: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#059669',
    badgeBg: '#dcfce7',
    badgeText: '#166534',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#d97706',
    badgeBg: '#fef9c3',
    badgeText: '#854d0e',
  },

  // Sync status
  synced: '#059669',
  pending: '#d97706',
  conflict: '#dc2626',
  // Muted fills of the two states that need a chip background. The report
  // type palettes (warning/hazwaste) happen to be the right hues, but they
  // carry unrelated meaning — sync state gets its own so the two can't drift
  // into each other.
  pendingMuted: '#fef3c7',
  conflictMuted: '#fee2e2',

  // Utility
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.4)',
  shadow: 'rgba(0,0,0,0.08)',
};
