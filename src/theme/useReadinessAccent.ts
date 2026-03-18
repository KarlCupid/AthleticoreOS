/**
 * useReadinessAccent — scoped hook for components that explicitly reflect readiness.
 *
 * Permitted consumers (≤5 total):
 *   - FeelCheck result indicator
 *   - AttentionCard for recovery notes
 *   - Coaching note on Training Floor (when session was modified by engine)
 *   - Weekly Review load chart color coding
 *
 * NOT permitted in: app chrome, navigation, Compass timeline, Nutrition, Profile/Settings.
 * For those, use APP_CHROME from theme.ts.
 */

import { useReadinessTheme, ReadinessLevel } from './ReadinessThemeContext';
import { COLORS } from './theme';

export interface ReadinessAccent {
    accentColor: string;
    tintColor: string;
    gradientColors: [string, string];
    level: ReadinessLevel;
}

const READINESS_PALETTES: Record<ReadinessLevel, ReadinessAccent> = {
    Prime: {
        accentColor:    COLORS.readiness.prime,
        tintColor:      COLORS.readiness.primeLight,
        gradientColors: ['#0FA888', '#0D8A70'],
        level:          'Prime',
    },
    Caution: {
        accentColor:    COLORS.readiness.caution,
        tintColor:      COLORS.readiness.cautionLight,
        gradientColors: ['#D97706', '#B45309'],
        level:          'Caution',
    },
    Depleted: {
        accentColor:    COLORS.readiness.depleted,
        tintColor:      COLORS.readiness.depletedLight,
        gradientColors: ['#DC2626', '#B91C1C'],
        level:          'Depleted',
    },
};

export function useReadinessAccent(): ReadinessAccent {
    const { currentLevel } = useReadinessTheme();
    return READINESS_PALETTES[currentLevel];
}
