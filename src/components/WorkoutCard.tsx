import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, GRADIENTS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { IconFire, IconCheckCircle } from '../components/icons';
import { ScheduledActivityRow, WorkoutPrescription } from '../../lib/engine/types';

interface WorkoutCardProps {
    prescription: WorkoutPrescription | null;
    primaryActivity?: ScheduledActivityRow | null;
    isCompleted?: boolean;
    onPress: () => void;
    entering?: boolean;
    enteringDelay?: number;
}

export function WorkoutCard({ prescription, primaryActivity = null, isCompleted, onPress, entering = false, enteringDelay = 0 }: WorkoutCardProps) {
    const { themeColor } = useReadinessTheme();

    const wrapWithEntering = (content: React.ReactNode) => {
        if (entering) {
            return (
                <Animated.View entering={FadeInDown.delay(enteringDelay).duration(ANIMATION.slow).springify()}>
                    {content}
                </Animated.View>
            );
        }
        return content;
    };

    if (!prescription) {
        if (primaryActivity) {
            const label = primaryActivity.custom_label ?? primaryActivity.activity_type.replace(/_/g, ' ');
            return wrapWithEntering(
                <Card style={styles.card}>
                    <View style={[styles.iconContainer, { backgroundColor: themeColor + '20' }]}>
                        <IconFire size={24} color={themeColor} />
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.title}>Today's Session</Text>
                        <Text style={styles.subtitle}>
                            {label.charAt(0).toUpperCase() + label.slice(1)} · {primaryActivity.estimated_duration_min} min · RPE {primaryActivity.expected_intensity}
                        </Text>
                    </View>
                </Card>
            );
        }

        return wrapWithEntering(
            <Card style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS.surfaceSecondary }]}>
                    <IconFire size={24} color={COLORS.text.tertiary} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Rest Day</Text>
                    <Text style={styles.subtitle}>Active recovery recommended</Text>
                </View>
            </Card>
        );
    }

    if (isCompleted) {
        return wrapWithEntering(
            <Card style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS.success + '20' }]}>
                    <IconCheckCircle size={24} color={COLORS.success} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Workout Complete</Text>
                    <Text style={styles.subtitle}>{prescription.focus?.replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
            </Card>
        );
    }

    // Exercise preview chips (first 3)
    const previewExercises = prescription.exercises.slice(0, 3);

    return wrapWithEntering(
        <AnimatedPressable onPress={onPress}>
            <Card style={styles.card}>
                <View style={styles.topRow}>
                    <View style={[styles.iconContainer, { backgroundColor: themeColor + '20' }]}>
                        <IconFire size={24} color={themeColor} />
                    </View>
                    <View style={styles.content}>
                        <Text style={styles.title}>Today's Workout</Text>
                        <View style={styles.statsRow}>
                            <Text style={styles.focusBadge}>{prescription.focus?.replace(/_/g, ' ').toUpperCase()}</Text>
                            <Text style={styles.statDot}>{'\u00B7'}</Text>
                            <Text style={styles.statText}>{prescription.exercises.length} Exercises</Text>
                        </View>
                    </View>
                </View>

                {/* Exercise preview chips */}
                {previewExercises.length > 0 && (
                    <View style={styles.chipRow}>
                        {previewExercises.map((ex, i) => (
                            <View key={i} style={styles.chip}>
                                <Text style={styles.chipText} numberOfLines={1}>
                                    {ex.exercise.name}
                                </Text>
                            </View>
                        ))}
                        {prescription.exercises.length > 3 && (
                            <View style={[styles.chip, styles.chipMore]}>
                                <Text style={styles.chipMoreText}>+{prescription.exercises.length - 3}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Gradient CTA button */}
                <View style={styles.ctaContainer}>
                    <LinearGradient
                        colors={[GRADIENTS.accent[0], GRADIENTS.accent[1]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaButton}
                    >
                        <Text style={styles.ctaText}>Start Workout</Text>
                    </LinearGradient>
                </View>
            </Card>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: SPACING.lg,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: 2,
    },
    focusBadge: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    statDot: {
        fontSize: 12,
        color: COLORS.text.tertiary,
        fontWeight: 'bold',
    },
    statText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    chip: {
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: SPACING.xs,
        maxWidth: '40%',
    },
    chipText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    chipMore: {
        backgroundColor: COLORS.accentLight,
    },
    chipMoreText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
    ctaContainer: {
        marginTop: SPACING.md,
        ...SHADOWS.colored.accent,
    },
    ctaButton: {
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm + 4,
        alignItems: 'center',
    },
    ctaText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
});
