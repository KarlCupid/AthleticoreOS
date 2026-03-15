export const COLORS = {
    background: '#F0F4F5',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSecondary: '#E8EEF1',
    border: '#D0DAE0',
    borderLight: '#E4ECEF',

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
    card: ['#FFFFFF', '#F5F8FA'] as const,
    accent: ['#0FA888', '#0D8A70'] as const,
};

export const BORDERS = {
    card: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
    elevated: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)' },
    accent: { borderWidth: 1, borderColor: 'rgba(15,168,136,0.25)' },
    glow: { borderWidth: 1, borderColor: 'rgba(15,168,136,0.40)' },
} as const;

export const FONT_FAMILY = {
    regular: 'Inter_400Regular',
    semiBold: 'Inter_600SemiBold',
    extraBold: 'Inter_800ExtraBold',
    black: 'Inter_900Black',
} as const;

export const TYPOGRAPHY = {
    // Legacy compat
    sans: 'Inter_400Regular',

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

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
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
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    card: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    md: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    cardElevated: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
        elevation: 4,
    },
    lg: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
        elevation: 4,
    },
    xl: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
        elevation: 6,
    },
    header: {
        shadowColor: '#1C2B3A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
    },
    colored: {
        prime: {
            shadowColor: COLORS.readiness.prime,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.30,
            shadowRadius: 12,
            elevation: 4,
        },
        accent: {
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.30,
            shadowRadius: 12,
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
