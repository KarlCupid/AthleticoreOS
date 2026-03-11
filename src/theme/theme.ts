import { Platform } from 'react-native';

export const COLORS = {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSecondary: '#F1F3F5',
    border: '#E8ECF0',
    borderLight: '#F1F3F5',

    // Accent palette
    accent: '#6366F1',
    accentLight: '#EEF2FF',

    // Semantic colors
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',

    // Overlay
    overlay: 'rgba(0,0,0,0.5)',

    text: {
        primary: '#1A1A2E',
        secondary: '#6B7280',
        tertiary: '#9CA3AF',
        inverse: '#FFFFFF',
    },

    readiness: {
        prime: '#16A34A',
        primeLight: '#DCFCE7',
        caution: '#D97706',
        cautionLight: '#FEF3C7',
        depleted: '#DC2626',
        depletedLight: '#FEE2E2',
    },

    chart: {
        fitness: '#3B82F6',
        fatigue: '#8B5CF6',
        readiness: '#10B981',
        accent: '#F59E0B',
        protein: '#60A5FA',
        carbs: '#FBBF24',
        fat: '#F87171',
        water: '#34D399',
    },

    // Keep legacy status colors for backward compat during migration
    status: {
        optimal: '#22C55E',
        caution: '#EAB308',
        actionRequired: '#EF4444',
    },
};

export const GRADIENTS = {
    prime: ['#16A34A', '#15803D', '#166534'] as const,
    caution: ['#D97706', '#B45309', '#92400E'] as const,
    depleted: ['#DC2626', '#B91C1C', '#991B1B'] as const,
    card: ['#FFFFFF', '#F8F9FA'] as const,
    accent: ['#6366F1', '#8B5CF6'] as const,
};

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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    cardElevated: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 6,
    },
    header: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    colored: {
        prime: {
            shadowColor: COLORS.readiness.prime,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 4,
        },
        accent: {
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
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
