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
        gradientColors: ['#D4AF37', '#8C6A1E'],
        level:          'Prime',
    },
    Caution: {
        accentColor:    COLORS.readiness.caution,
        tintColor:      COLORS.readiness.cautionLight,
        gradientColors: ['#B8892D', '#8C6A1E'],
        level:          'Caution',
    },
    Depleted: {
        accentColor:    COLORS.readiness.depleted,
        tintColor:      COLORS.readiness.depletedLight,
        gradientColors: ['#D9827E', '#B85D58'],
        level:          'Depleted',
    },
};

export function useReadinessAccent(): ReadinessAccent {
    const { currentLevel } = useReadinessTheme();
    return READINESS_PALETTES[currentLevel];
}
