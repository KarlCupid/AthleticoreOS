export const COLORS = {
    background: '#0A0A0A', // Matte Obsidian Black - app canvas
    surface: 'rgba(10, 10, 10, 0.64)', // Obsidian glass surface
    surfaceElevated: 'rgba(245, 245, 240, 0.13)', // Pearl-lit elevated glass
    surfaceSecondary: 'rgba(245, 245, 240, 0.08)', // Soft pearl supporting surface
    border: 'rgba(245, 245, 240, 0.18)', // Pearl edge
    borderLight: 'rgba(245, 245, 240, 0.10)',

    // Accent palette - brushed warm metal
    accent: '#D4AF37',
    accentLight: 'rgba(212, 175, 55, 0.16)',

    // Semantic colors
    success: '#B7D9A8',
    warning: '#D4AF37',
    error: '#D9827E',

    // Overlay
    overlay: 'rgba(10, 10, 10, 0.72)',

    text: {
        primary: '#F5F5F0',
        secondary: 'rgba(245, 245, 240, 0.76)',
        tertiary: 'rgba(245, 245, 240, 0.54)',
        inverse: '#0A0A0A',
    },

    readiness: {
        prime: '#D4AF37',
        primeLight: 'rgba(212, 175, 55, 0.18)',
        caution: '#B8892D',
        cautionLight: 'rgba(184, 137, 45, 0.18)',
        depleted: '#D9827E',
        depletedLight: 'rgba(217, 130, 126, 0.18)',
    },

    chart: {
        fitness: '#D4AF37',
        fatigue: '#8C6A1E',
        readiness: '#F5F5F0',
        accent: '#B8892D',
        protein: '#F5F5F0',
        carbs: '#D4AF37',
        fat: '#D9827E',
        water: '#B8C0C2',
    },

    status: {
        optimal: '#B7D9A8',
        caution: '#D4AF37',
        actionRequired: '#D9827E',
    },
};

export const GRADIENTS = {
    prime: ['#F5F5F0', '#D4AF37', '#8C6A1E'] as const,
    caution: ['#D4AF37', '#B8892D', '#8C6A1E'] as const,
    depleted: ['#D9827E', '#B85D58', '#7A3430'] as const,
    card: ['rgba(245, 245, 240, 0.14)', 'rgba(10, 10, 10, 0.58)'] as const,
    accent: ['#F5F5F0', '#D4AF37', '#8C6A1E'] as const,
};

export const BORDERS = {
    card: { borderWidth: 1, borderColor: 'rgba(245,245,240,0.16)' },
    elevated: { borderWidth: 1, borderColor: 'rgba(212,175,55,0.28)' },
    accent: { borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.34)' },
    glow: { borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.46)' },
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
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    card: { // Subtle glow for dark glass
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 2,
    },
    md: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 2,
    },
    cardElevated: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    xl: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 6,
    },
    header: {
        shadowColor: '#000000',
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
            shadowColor: '#D4AF37',
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
    background: '#0A0A0A', // Matte Obsidian Black - matches metallic marble base
    accent:     '#D4AF37', // Warm Metallic Gold - brushed metal accent
    text:       '#F5F5F0', // Pearl text for the dark theme
} as const;

// Semantic palette for AttentionCards and coaching notes
// Replaces the readiness palette in all UI contexts after Task 3
export const SEMANTIC_PALETTE = {
    positive: { edge: '#B7D9A8', tint: 'rgba(183, 217, 168, 0.16)' },
    caution:  { edge: '#D4AF37', tint: 'rgba(212, 175, 55, 0.16)' },
    alert:    { edge: '#D9827E', tint: 'rgba(217, 130, 126, 0.16)' },
    info:     { edge: '#F5F5F0', tint: 'rgba(245, 245, 240, 0.14)' },
} as const;

export type SemanticTier = keyof typeof SEMANTIC_PALETTE;

// Timer design tokens — used by SkiaRestTimer and related components
export const TIMER_COLORS = {
    calm:        '#D4AF37',
    caution:     '#B8892D',
    urgent:      '#D9827E',
    glow:        'rgba(212, 175, 55, 0.32)',
    glowUrgent:  'rgba(217, 130, 126, 0.35)',
    overlay:     'rgba(10, 10, 10, 0.94)',
    track:       'rgba(245, 245, 240, 0.08)',
    particle:    'rgba(212, 175, 55, 0.20)',
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
