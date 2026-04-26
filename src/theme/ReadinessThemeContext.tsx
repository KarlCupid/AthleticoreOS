import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GRADIENTS, COLORS } from './theme';

export type ReadinessLevel = 'Prime' | 'Caution' | 'Depleted';

const READINESS_CONFIG = {
    Prime: {
        color: COLORS.readiness.prime,
        gradient: [...GRADIENTS.prime],
        lightTint: COLORS.readiness.primeLight,
    },
    Caution: {
        color: COLORS.readiness.caution,
        gradient: [...GRADIENTS.caution],
        lightTint: COLORS.readiness.cautionLight,
    },
    Depleted: {
        color: COLORS.readiness.depleted,
        gradient: [...GRADIENTS.depleted],
        lightTint: COLORS.readiness.depletedLight,
    },
} as const;

interface ReadinessThemeContextType {
    themeColor: string;
    gradient: string[];
    lightTint: string;
    setReadiness: (level: ReadinessLevel) => void;
    currentLevel: ReadinessLevel;
}

const ReadinessThemeContext = createContext<ReadinessThemeContextType | undefined>(undefined);

/**
 * Legacy readiness color context used by app-root consumers that still
 * explicitly opt into readiness accents.
 * Use APP_CHROME from theme.ts for all app chrome and screen backgrounds.
 */
export const ReadinessThemeProvider = ({ children }: { children: ReactNode }) => {
    const [currentLevel, setCurrentLevel] = useState<ReadinessLevel>('Prime');

    const config = READINESS_CONFIG[currentLevel];

    return (
        <ReadinessThemeContext.Provider value={{
            themeColor: config.color,
            gradient: [...config.gradient],
            lightTint: config.lightTint,
            setReadiness: setCurrentLevel,
            currentLevel,
        }}>
            {children}
        </ReadinessThemeContext.Provider>
    );
};

export const useReadinessTheme = () => {
    const context = useContext(ReadinessThemeContext);
    if (context === undefined) {
        throw new Error('useReadinessTheme must be used within a ReadinessThemeProvider');
    }
    return context;
};

// Re-export for backward compatibility
export type ReadinessColor = ReadinessLevel;
export const THEME_COLORS = {
    Prime: COLORS.readiness.prime,
    Caution: COLORS.readiness.caution,
    Depleted: COLORS.readiness.depleted,
} as const;
