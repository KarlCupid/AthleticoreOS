import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import type { TrainStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<TrainStackParamList>;
type RoutePropType = RouteProp<TrainStackParamList, 'WorkoutSummary'>;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getRpeColor(rpe: number | null): string {
    if (rpe === null) return COLORS.text.tertiary;
    if (rpe < 6) return COLORS.success;
    if (rpe <= 7.5) return COLORS.warning;
    return COLORS.error;
}

function getRpeBgColor(rpe: number | null): string {
    if (rpe === null) return COLORS.surfaceSecondary;
    if (rpe < 6) return COLORS.success + '18';
    if (rpe <= 7.5) return COLORS.warning + '18';
    return COLORS.error + '18';
}

function getFatigueMessage(rpe: number | null): string {
    if (rpe === null) return 'Session logged. Nice work. Start recovery now.';
    if (rpe < 6) {
        return 'Good work. You had more in the tank. If readiness is good next time, nudge the effort up.';
    }
    if (rpe <= 7.5) {
        return 'Solid dose. You trained hard and kept enough room to recover.';
    }
    return 'Hard day logged. Eat, hydrate, and protect sleep tonight.';
}

function formatVolume(lbs: number): string {
    if (lbs >= 1000) {
        return (lbs / 1000).toFixed(1) + 'k';
    }
    return lbs.toLocaleString();
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ConfettiDots() {
    const dots = [
        { color: COLORS.accent, size: 10, top: -8, left: 24 },
        { color: COLORS.success, size: 7, top: -4, left: 80 },
        { color: COLORS.warning, size: 12, top: -12, left: 148 },
        { color: '#EC4899', size: 8, top: -6, left: 220 },
    ];

    return (
        <View style={confettiStyles.container} pointerEvents="none">
            {dots.map((dot, i) => (
                <Animated.View
                    key={i}
                    entering={ZoomIn.delay(i * 80).duration(400)}
                    style={[
                        confettiStyles.dot,
                        {
                            backgroundColor: dot.color,
                            width: dot.size,
                            height: dot.size,
                            borderRadius: dot.size / 2,
                            top: dot.top,
                            left: dot.left,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const confettiStyles = StyleSheet.create({
    container: {
        height: 20,
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    dot: {
        position: 'absolute',
    },
});

interface StatPillProps {
    label: string;
    value: string | number;
    delay?: number;
}

function StatPill({ label, value, delay = 0 }: StatPillProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400)}
            style={statPillStyles.wrapper}
        >
            <Text style={statPillStyles.value}>{value}</Text>
            <Text style={statPillStyles.label}>{label}</Text>
        </Animated.View>
    );
}

const statPillStyles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    value: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 22,
        color: COLORS.text.primary,
        letterSpacing: 0,
    },
    label: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 11,
        color: COLORS.text.tertiary,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
});

// â”€â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function WorkoutSummaryScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RoutePropType>();

    const {
        durationMin,
        totalSets,
        totalVolume,
        avgRPE,
        exercisesCompleted,
        hadPR,
        prExerciseName,
    } = route.params;

    const rpeColor = getRpeColor(avgRPE);
    const rpeBgColor = getRpeBgColor(avgRPE);
    const fatigueMessage = getFatigueMessage(avgRPE);

    function handleBackToPlan() {
        navigation.getParent()?.navigate('Plan' as never);
    }

    function handleViewHistory() {
        navigation.navigate('WorkoutHome');
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + SPACING.xxl + 148 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* â”€â”€ Confetti decoration â”€â”€ */}
                <ConfettiDots />

                {/* â”€â”€ Checkmark hero â”€â”€ */}
                <Animated.View entering={ZoomIn.delay(50).duration(500)} style={styles.heroCenter}>
                    <View style={styles.checkCircle}>
                        <Text style={styles.checkMark}>âœ“</Text>
                    </View>
                    <Text style={styles.heroTitle}>Session Complete</Text>
                    <Text style={styles.heroSubtitle}>
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </Text>
                </Animated.View>

                {/* â”€â”€ Duration stat â”€â”€ */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.durationBlock}>
                    <Text style={styles.durationNumber}>{durationMin}</Text>
                    <Text style={styles.durationUnit}>min</Text>
                </Animated.View>

                {/* â”€â”€ Stats row â”€â”€ */}
                <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.statsRow}>
                    <StatPill label="Sets" value={totalSets} delay={280} />
                    <View style={styles.statsGap} />
                    <StatPill label="Exercises" value={exercisesCompleted ?? 0} delay={340} />
                    <View style={styles.statsGap} />
                    <StatPill label="Volume (lbs)" value={formatVolume(totalVolume)} delay={400} />
                </Animated.View>

                {/* â”€â”€ RPE Badge â”€â”€ */}
                {avgRPE !== null && (
                    <Animated.View entering={FadeInDown.delay(460).duration(400)}>
                        <View style={[styles.rpeBadge, { backgroundColor: rpeBgColor }]}>
                            <Text style={[styles.rpeBadgeText, { color: rpeColor }]}>
                                Avg RPE: {avgRPE.toFixed(1)}
                            </Text>
                            <View style={[styles.rpeDot, { backgroundColor: rpeColor }]} />
                        </View>
                    </Animated.View>
                )}

                {/* â”€â”€ PR Celebration Card â”€â”€ */}
                {hadPR && prExerciseName && (
                    <Animated.View entering={FadeInDown.delay(520).duration(450)}>
                        <View style={styles.prCard}>
                            <Text style={styles.prIcon}>ðŸ†</Text>
                            <View style={styles.prTextBlock}>
                                <Text style={styles.prTitle}>New Personal Record!</Text>
                                <Text style={styles.prExercise}>{prExerciseName}</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* â”€â”€ Fatigue / Recovery Message â”€â”€ */}
                <Animated.View entering={FadeInDown.delay(580).duration(400)}>
                    <View style={styles.messageCard}>
                        <Text style={styles.messageLabel}>Coach Note</Text>
                        <Text style={styles.messageText}>{fatigueMessage}</Text>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* â”€â”€ Sticky bottom buttons â”€â”€ */}
            <Animated.View
                entering={FadeInDown.delay(660).duration(400)}
                style={[
                    styles.bottomButtons,
                    { paddingBottom: insets.bottom + SPACING.md },
                ]}
            >
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleBackToPlan}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryButtonText}>Back to Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.outlinedButton}
                    onPress={handleViewHistory}
                    activeOpacity={0.8}
                >
                    <Text style={styles.outlinedButtonText}>Training Home</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
    },

    // Hero
    heroCenter: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    checkCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.success + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.success + '40',
    },
    checkMark: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 28,
        color: COLORS.success,
        lineHeight: 34,
    },
    heroTitle: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 28,
        color: COLORS.text.primary,
        letterSpacing: 0,
        marginBottom: SPACING.xs,
    },
    heroSubtitle: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 14,
        color: COLORS.text.tertiary,
    },

    // Duration block
    durationBlock: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        gap: SPACING.xs,
    },
    durationNumber: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 72,
        color: COLORS.text.primary,
        letterSpacing: 0,
        lineHeight: 80,
    },
    durationUnit: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 24,
        color: COLORS.text.secondary,
        paddingBottom: SPACING.xs,
    },

    // Stats row
    statsRow: {
        flexDirection: 'row',
        marginBottom: SPACING.md,
    },
    statsGap: {
        width: SPACING.sm,
    },

    // RPE badge
    rpeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        gap: SPACING.xs,
        marginBottom: SPACING.md,
    },
    rpeBadgeText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
    },
    rpeDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },

    // PR celebration card
    prCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warning + '18',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        gap: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.warning + '35',
        ...SHADOWS.card,
    },
    prIcon: {
        fontSize: 32,
    },
    prTextBlock: {
        flex: 1,
    },
    prTitle: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 15,
        color: COLORS.warning,
        marginBottom: 2,
    },
    prExercise: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 14,
        color: COLORS.warning,
    },

    // Fatigue / coach message card
    messageCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    messageLabel: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 11,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: SPACING.xs,
    },
    messageText: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 15,
        color: COLORS.text.primary,
        lineHeight: 22,
    },

    // Bottom buttons (fixed to bottom)
    bottomButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 10, 10, 0.86)',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        gap: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    primaryButton: {
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    primaryButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 16,
        color: COLORS.text.inverse,
    },
    outlinedButton: {
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md - 2,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
    },
    outlinedButtonText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 15,
        color: COLORS.text.secondary,
    },
});
