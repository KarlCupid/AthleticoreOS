import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_CHROME, COLORS, FONT_FAMILY, SPACING, TYPOGRAPHY_V2 } from '../theme/theme';

// Visual Noise Removal (Task 6):
// - AnimatedBackgroundBlobs removed
// - AnimatedWaves removed
// - Glass pill (translucent statsRow) replaced with solid surface container
// - Gradient background replaced with APP_CHROME.background (flat)
// - AnimatedNumber replaced with plain Text (no odometer animation in Plan mode)
// Premium feel now comes from typographic clarity, not decorative motion.

interface HeroHeaderProps {
    greeting: string;
    phase: string;
    readinessScore: number;
    readinessLabel: string;
    acwr?: number;
    sleep?: number;
    weight?: string;
    weightTrend?: 'up' | 'down' | 'stable';
}

export function HeroHeader({
    greeting,
    phase,
    readinessScore,
    readinessLabel,
    acwr,
    sleep,
    weight,
    weightTrend,
}: HeroHeaderProps) {
    const insets = useSafeAreaInsets();

    const dots = 10;
    const filledDots = Math.round((readinessScore / 100) * dots);

    const readinessColor =
        readinessScore >= 70
            ? COLORS.readiness.prime
            : readinessScore >= 40
            ? COLORS.readiness.caution
            : COLORS.readiness.depleted;

    return (
        <View style={[styles.container, { paddingTop: insets.top + SPACING.md }]}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.phase}>{phase}</Text>

            {/* Readiness Score — plain text, no odometer animation */}
            <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>READINESS</Text>
                <Text style={[styles.scoreValue, { color: readinessColor }]}>
                    {Math.round(readinessScore)}
                </Text>
                <View style={styles.dotsRow}>
                    {Array.from({ length: dots }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { backgroundColor: i < filledDots ? readinessColor : COLORS.border },
                            ]}
                        />
                    ))}
                    <Text style={styles.levelLabel}>{readinessLabel}</Text>
                </View>
            </View>

            {/* Stats row — solid surface, no glassmorphism */}
            {(acwr !== undefined || sleep !== undefined || weight) && (
                <View style={styles.statsRow}>
                    {acwr !== undefined && (
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{acwr.toFixed(2)}</Text>
                            <Text style={styles.statLabel}>ACWR</Text>
                        </View>
                    )}
                    {sleep !== undefined && (
                        <>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{sleep}/5</Text>
                                <Text style={styles.statLabel}>Sleep</Text>
                            </View>
                        </>
                    )}
                    {weight && (
                        <>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                    <Text style={styles.statValue}>{weight}</Text>
                                    {weightTrend && (
                                        <Text style={{
                                            fontSize: 14,
                                            fontFamily: FONT_FAMILY.extraBold,
                                            color: weightTrend === 'down' ? COLORS.readiness.prime
                                                : weightTrend === 'up' ? COLORS.readiness.depleted
                                                : COLORS.text.tertiary,
                                        }}>
                                            {weightTrend === 'down' ? '↓' : weightTrend === 'up' ? '↑' : '→'}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.statLabel}>Weight</Text>
                            </View>
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: APP_CHROME.background, // Flat, never shifts with readiness
        paddingBottom: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    greeting: {
        ...TYPOGRAPHY_V2.plan.title,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    phase: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.secondary,
        marginBottom: SPACING.lg,
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    scoreLabel: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.tertiary,
        letterSpacing: 1.5,
        marginBottom: SPACING.xs,
    },
    scoreValue: {
        fontSize: 56,
        fontFamily: FONT_FAMILY.extraBold,
        lineHeight: 62,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: SPACING.sm,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    levelLabel: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.secondary,
        marginLeft: SPACING.sm,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.surface, // Solid white, no backdrop blur
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    statValue: {
        ...TYPOGRAPHY_V2.plan.headline,
        color: COLORS.text.primary,
    },
    statLabel: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.borderLight,
    },
});
