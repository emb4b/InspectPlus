export const Colors = {
  // Primary brand
  navy: '#0d2137',
  navyLight: '#1a3550',
  green: '#1a9e45',
  greenLight: '#4ade80',
  greenMuted: '#d1fae5',

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
  air: {
    bg: '#f9fafb',
    border: '#d1d5db',
    text: '#6b7280',
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

  // Utility
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.4)',
  shadow: 'rgba(0,0,0,0.08)',
};
