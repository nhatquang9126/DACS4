export const COLORS = {
  primary: '#4F46E5', // Indigo-600
  primaryLight: '#EEF2FF', // Indigo-50
  primaryHover: '#4338CA', // Indigo-700
  secondary: '#818CF8', // Indigo-400
  secondaryLight: '#F5F3FF', // Purple-50
  background: '#F9FAFB', // Gray-50
  surface: '#FFFFFF', // White
  surfaceMuted: '#F3F4F6', // Gray-100
  text: '#1F2937', // Gray-800
  textSecondary: '#6B7280', // Gray-500
  textLight: '#9CA3AF', // Gray-400
  border: '#E5E7EB', // Gray-200
  borderLight: '#F3F4F6', // Gray-100
  error: '#EF4444', // Red-500
  errorLight: '#FEF2F2', // Red-50
  warning: '#F59E0B', // Amber-500
  warningLight: '#FFFBEB', // Amber-50
  success: '#10B981', // Emerald-500
  successLight: '#ECFDF5', // Emerald-50
};

export const SIZES = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  radius: 12,
  radiusCard: 16,
  radiusBtn: 8,
  radiusFull: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: COLORS.text, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const, color: COLORS.text, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '600' as const, color: COLORS.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: COLORS.text, lineHeight: 20 },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const, color: COLORS.text, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, color: COLORS.textSecondary, lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: '600' as const, color: COLORS.textSecondary },
};
