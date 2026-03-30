import { StyleSheet } from 'react-native';

export const COLORS = {
    background: '#F9FAFB', // Lighter, cleaner background
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSecondary: '#F3F6F8', // Lighter secondary background
    border: '#E8ECF0',
    borderLight: '#F0F3F5',

    // Accent palette — premium mint
    accent: '#0FA888',
    accentLight: '#E0F5F1',

    // Semantic colors
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',

    // Overlay
    overlay: 'rgba(0,0,0,0.4)',

    text: {
        primary: '#1C2B3A',
        secondary: '#5A7080',
        tertiary: '#90A4AE',
        inverse: '#FFFFFF',
    },

    readiness: {
        prime: '#0FA888',
        primeLight: '#E0F5F1',
        caution: '#D97706',
        cautionLight: '#FEF3C7',
        depleted: '#DC2626',
        depletedLight: '#FEE2E2',
    },

    chart: {
        fitness: '#3B82F6',
        fatigue: '#0FA888',
        readiness: '#14B8A6',
        accent: '#D97706',
        protein: '#6366F1',
        carbs: '#F59E0B',
        fat: '#EF4444',
        water: '#06B6D4',
    },

    status: {
        optimal: '#16A34A',
        caution: '#D97706',
        actionRequired: '#DC2626',
    },
};

export const GRADIENTS = {
    prime: ['#0FA888', '#0D8A70', '#0B7860'] as const,
    caution: ['#D97706', '#B45309', '#92400E'] as const,
    depleted: ['#DC2626', '#B91C1C', '#991B1B'] as const,
    card: ['#FFFFFF', '#FDFEFE'] as const,
    accent: ['#0FA888', '#0D8A70'] as const,
};

export const BORDERS = {
    card: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.05)' },
    elevated: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)' },
    accent: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(15,168,136,0.30)' },
    glow: { borderWidth: 1, borderColor: 'rgba(15,168,136,0.40)' },
} as const;

export const FONT_FAMILY = {
    regular: 'Outfit_400Regular',
    semiBold: 'Outfit_600SemiBold',
    extraBold: 'Outfit_800ExtraBold',
    black: 'Outfit_900Black',
} as const;

// V1 — retained for backward compatibility during migration
export const TYPOGRAPHY_LEGACY = {
    // Legacy compat
    sans: 'Outfit_400Regular',

    display: {
        fontSize: 36,
        fontFamily: FONT_FAMILY.black,
        letterSpacing: -0.8,
        color: COLORS.text.primary,
    },
    heading1: {
        fontSize: 30,
        fontFamily: FONT_FAMILY.black,
        letterSpacing: -0.5,
        color: COLORS.text.primary,
    },
    heading2: {
        fontSize: 22,
        fontFamily: FONT_FAMILY.extraBold,
        letterSpacing: -0.3,
        color: COLORS.text.primary,
    },
    heading3: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    bodyLarge: {
        fontSize: 17,
        fontFamily: FONT_FAMILY.regular,
        lineHeight: 24,
        color: COLORS.text.primary,
    },
    body: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        lineHeight: 22,
        color: COLORS.text.primary,
    },
    bodySmall: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        lineHeight: 18,
        color: COLORS.text.secondary,
    },
    caption: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        letterSpacing: 0.5,
        color: COLORS.text.tertiary,
    },
    label: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
} as const;

/** @deprecated Use TYPOGRAPHY_V2 for all new components. */
export const TYPOGRAPHY = TYPOGRAPHY_LEGACY;

// V2 — sentence-first hierarchy. No 800/900 weights in plan mode.
// All new components from the UX revamp must import from TYPOGRAPHY_V2.
export const TYPOGRAPHY_V2 = {
    // Plan mode: planning screens, Morning Flow, Compass, Nutrition
    plan: {
        display:  { fontSize: 32, fontWeight: '700' as const, fontFamily: FONT_FAMILY.extraBold, lineHeight: 40 },
        title:    { fontSize: 26, fontWeight: '700' as const, fontFamily: FONT_FAMILY.extraBold, lineHeight: 34 },
        headline: { fontSize: 22, fontWeight: '600' as const, fontFamily: FONT_FAMILY.semiBold,  lineHeight: 28 },
        body:     { fontSize: 16, fontWeight: '400' as const, fontFamily: FONT_FAMILY.regular,   lineHeight: 24 },
        caption:  { fontSize: 12, fontWeight: '500' as const, fontFamily: FONT_FAMILY.semiBold,  lineHeight: 16 },
    },
    // Focus mode: Training Floor, Gym Floor Mode — larger targets, arm's-length readability
    focus: {
        display:  { fontSize: 28, fontWeight: '700' as const, fontFamily: FONT_FAMILY.extraBold, lineHeight: 36 },
        target:   { fontSize: 36, fontWeight: '800' as const, fontFamily: FONT_FAMILY.extraBold, lineHeight: 44 },
        action:   { fontSize: 20, fontWeight: '700' as const, fontFamily: FONT_FAMILY.extraBold, lineHeight: 28 },
        caption:  { fontSize: 16, fontWeight: '500' as const, fontFamily: FONT_FAMILY.semiBold,  lineHeight: 22 },
    },
} as const;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
} as const;

// Focus/Gym Floor Mode spacing — increased density for fatigued/gloved athletes
export const SPACING_FOCUS = {
    elementGap:    24, // Between interactive elements (up from 16)
    blockGap:      32, // Between exercise blocks (up from 24)
    actionPadding: 48, // Around primary action button
    screenPadding: 20, // Horizontal screen margin (up from 16)
} as const;

// Minimum tap targets per mode (dp)
export const TAP_TARGETS = {
    plan:         { min: 44, recommended: 48 },
    focus:        { min: 56, recommended: 64 },
    focusPrimary: { min: 64, recommended: 72 }, // Complete Set, Start Timer
} as const;

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 999,
} as const;

export const SHADOWS = {
    sm: { // Subtler glassy feel
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    card: { // The new default subtle glassy elevation
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    md: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 2,
    },
    cardElevated: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    lg: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    xl: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
    },
    header: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 8,
    },
    colored: {
        prime: {
            shadowColor: COLORS.readiness.prime,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 4,
        },
        accent: {
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 4,
        },
    },
};

export const ANIMATION = {
    fast: 150,
    normal: 300,
    slow: 500,
    spring: { damping: 15, stiffness: 150 },
} as const;

// Fixed chrome palette — never shifts with readiness level
export const APP_CHROME = {
    background: COLORS.background, // Always #F0F4F5
    accent:     '#0FA888',          // Always Mint
    text:       COLORS.text.primary,
} as const;

// Semantic palette for AttentionCards and coaching notes
// Replaces the readiness palette in all UI contexts after Task 3
export const SEMANTIC_PALETTE = {
    positive: { edge: '#0FA888', tint: '#F0FFF8' }, // Performance gains, compliance streaks
    caution:  { edge: '#D4932B', tint: '#FFF8F0' }, // Nutrition alerts, weight check reminders
    alert:    { edge: '#D4432B', tint: '#FFF0ED' }, // Recovery warnings, safety gates
    info:     { edge: '#4A7BD4', tint: '#F0F4FF' }, // Schedule changes, phase transitions
} as const;

export type SemanticTier = keyof typeof SEMANTIC_PALETTE;

// Timer design tokens — used by SkiaRestTimer and related components
export const TIMER_COLORS = {
    calm:        '#0FA888',               // mint — full rest
    caution:     '#D97706',               // amber — ~30% remaining
    urgent:      '#DC2626',               // red — ~15% remaining
    glow:        'rgba(15, 168, 136, 0.35)',
    glowUrgent:  'rgba(220, 38, 38, 0.35)',
    overlay:     'rgba(10, 12, 20, 0.92)',
    track:       'rgba(255, 255, 255, 0.06)',
    particle:    'rgba(15, 168, 136, 0.22)',
} as const;

export const TIMER_DIMENSIONS = {
    ringSize:              280,
    ringStroke:            10,
    glowStroke:            18,
    glowSigmaCalm:         8,
    glowSigmaUrgent:       14,
    breathingRadiusMin:    130,
    breathingRadiusMax:    140,
    breathingDuration:     4000,
    endCapRadius:          6,
} as const;
