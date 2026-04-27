import React, { useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
    COLORS,
    FONT_FAMILY,
    SPACING,
    RADIUS,
    SHADOWS,
    GRADIENTS,
    ANIMATION,
} from '../../theme/theme';
// Helpers
// ---------------------------------------------------------------------------

export function formatElapsed(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDisplayWeight(weight: number): string {
    return weight % 1 === 0 ? String(weight) : weight.toFixed(1);
}

export function weightIncrement(weight: number): number {
    return weight >= 100 ? 5 : 2.5;
}

// Map engine prType to the union PRCelebration accepts
export type PRCelebrationPRType = 'weight' | 'reps' | 'e1rm';
export function mapPRType(
    prType: 'weight' | 'reps' | 'estimated_1rm' | 'volume' | null,
): PRCelebrationPRType {
    if (prType === 'estimated_1rm') return 'e1rm';
    if (prType === 'reps') return 'reps';
    return 'weight';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        let going = true;
        const tick = () => {
            if (!going) return;
            opacity.value = withTiming(0.9, { duration: 700 });
            setTimeout(() => {
                if (!going) return;
                opacity.value = withTiming(0.4, { duration: 700 });
                setTimeout(tick, 700);
            }, 700);
        };
        tick();
        return () => { going = false; };
    }, [opacity]);

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: RADIUS.sm,
                    backgroundColor: COLORS.border,
                },
                animStyle,
                style,
            ]}
        />
    );
}

export function LoadingSkeleton() {
    return (
        <View style={skStyles.container}>
            <SkeletonBlock width="60%" height={20} style={{ marginBottom: SPACING.sm }} />
            <SkeletonBlock width="40%" height={14} style={{ marginBottom: SPACING.lg }} />
            <SkeletonBlock width="100%" height={6} style={{ borderRadius: RADIUS.full, marginBottom: SPACING.xl }} />
            <SkeletonBlock width="80%" height={36} style={{ marginBottom: SPACING.sm }} />
            <SkeletonBlock width="50%" height={20} style={{ marginBottom: SPACING.xl }} />
            <SkeletonBlock width="100%" height={90} style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.md }} />
            <SkeletonBlock width="100%" height={60} style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.md }} />
            <SkeletonBlock width="100%" height={110} style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.md }} />
            <SkeletonBlock width="100%" height={52} style={{ borderRadius: RADIUS.lg }} />
        </View>
    );
}

const skStyles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xl,
    },
});

// ---------------------------------------------------------------------------
// SetDot - filled/empty indicator for current set progress
// ---------------------------------------------------------------------------

export function SetDots({ total, completed }: { total: number; completed: number }) {
    return (
        <View style={dotStyles.row}>
            {Array.from({ length: total }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        dotStyles.dot,
                        i < completed ? dotStyles.dotFilled : dotStyles.dotEmpty,
                    ]}
                />
            ))}
        </View>
    );
}

const dotStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: RADIUS.full,
    },
    dotFilled: {
        backgroundColor: COLORS.accent,
    },
    dotEmpty: {
        backgroundColor: COLORS.border,
        borderWidth: 1.5,
        borderColor: COLORS.accent + '60',
    },
});

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

export function ProgressBar({ progress }: { progress: number }) {
    const width = useSharedValue(0);

    useEffect(() => {
        width.value = withTiming(Math.min(1, Math.max(0, progress)), { duration: ANIMATION.normal });
    }, [progress, width]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${width.value * 100}%` as any,
    }));

    return (
        <View style={pbStyles.track}>
            <Animated.View style={[pbStyles.fill, barStyle]} />
        </View>
    );
}

const pbStyles = StyleSheet.create({
    track: {
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.full,
    },
});

// ---------------------------------------------------------------------------
// NumberStepper
// ---------------------------------------------------------------------------

interface NumberStepperProps {
    value: number;
    onDecrement: () => void;
    onIncrement: () => void;
    label: string;
    formatValue?: (v: number) => string;
}

export function NumberStepper({ value, onDecrement, onIncrement, label, formatValue }: NumberStepperProps) {
    const display = formatValue ? formatValue(value) : String(value);
    return (
        <View style={stepStyles.wrapper}>
            <Text style={stepStyles.label}>{label}</Text>
            <View style={stepStyles.row}>
                <TouchableOpacity
                    style={stepStyles.btn}
                    onPress={onDecrement}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={stepStyles.btnText}>-</Text>
                </TouchableOpacity>
                <View style={stepStyles.display}>
                    <Text style={stepStyles.value}>{display}</Text>
                </View>
                <TouchableOpacity
                    style={stepStyles.btn}
                    onPress={onIncrement}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={stepStyles.btnText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const stepStyles = StyleSheet.create({
    wrapper: {
        flex: 1,
        alignItems: 'center',
    },
    label: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 11,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: SPACING.xs,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
        ...SHADOWS.card,
    },
    btn: {
        width: 44,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
    },
    btnText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 22,
        color: COLORS.accent,
        lineHeight: 26,
    },
    display: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
    },
    value: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 28,
        color: COLORS.text.primary,
        letterSpacing: 0,
    },
});

// ---------------------------------------------------------------------------
// Not-started prescription preview
// ---------------------------------------------------------------------------

interface PrescriptionPreviewProps {
    prescription: any;
    gymProfile: { name?: string } | null | undefined;
    onBegin: () => void;
}

export function PrescriptionPreview({ prescription, gymProfile, onBegin }: PrescriptionPreviewProps) {
    return (
        <Animated.View entering={FadeIn.duration(400)} style={ppStyles.container}>
            <Text style={ppStyles.heading}>Today's Workout</Text>

            {gymProfile && (
                <View style={ppStyles.gymRow}>
                    <Text style={ppStyles.gymIcon}>GYM</Text>
                    <Text style={ppStyles.gymName}>{gymProfile.name}</Text>
                </View>
            )}

            <View style={ppStyles.metaRow}>
                <View style={ppStyles.metaBadge}>
                    <Text style={ppStyles.metaText}>
                        {prescription.estimatedDurationMin} min
                    </Text>
                </View>
                <View style={ppStyles.metaBadge}>
                    <Text style={ppStyles.metaText}>
                        {prescription.exercises.length} exercises
                    </Text>
                </View>
                <View style={ppStyles.metaBadge}>
                    <Text style={ppStyles.metaText}>
                        {prescription.focus.replace(/_/g, ' ')}
                    </Text>
                </View>
            </View>

            {prescription.message ? (
                <View style={ppStyles.messageCard}>
                    <Text style={ppStyles.messageText}>{prescription.message}</Text>
                </View>
            ) : null}

            <View style={ppStyles.exerciseList}>
                {prescription.exercises.map((ex: any, i: number) => (
                    <Animated.View
                        key={ex.exercise.id}
                        entering={FadeInDown.delay(60 * i).duration(ANIMATION.normal).springify()}
                        style={ppStyles.exerciseRow}
                    >
                        <View style={ppStyles.exerciseNumber}>
                            <Text style={ppStyles.exerciseNumberText}>{i + 1}</Text>
                        </View>
                        <View style={ppStyles.exerciseInfo}>
                            <Text style={ppStyles.exerciseName}>{ex.exercise.name}</Text>
                            <Text style={ppStyles.exerciseMeta}>
                                {ex.targetSets} x {ex.targetReps} reps
                                {ex.suggestedWeight ? ` | ${ex.suggestedWeight} lbs` : ''}
                                {' | RPE '}{ex.targetRPE}
                            </Text>
                        </View>
                        <View style={[ppStyles.muscleBadge]}>
                            <Text style={ppStyles.muscleBadgeText}>
                                {ex.exercise.muscle_group.replace(/_/g, ' ')}
                            </Text>
                        </View>
                    </Animated.View>
                ))}
            </View>

            <TouchableOpacity
                onPress={onBegin}
                activeOpacity={0.85}
                style={ppStyles.beginWrapper}
            >
                <LinearGradient
                    colors={[...GRADIENTS.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={ppStyles.beginButton}
                >
                    <Text style={ppStyles.beginText}>Begin Workout</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const ppStyles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.xxxl,
    },
    heading: {
        fontFamily: FONT_FAMILY.black,
        fontSize: 30,
        color: COLORS.text.primary,
        letterSpacing: 0,
        marginBottom: SPACING.sm,
    },
    gymRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.xs,
    },
    gymIcon: {
        fontSize: 16,
    },
    gymName: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    metaBadge: {
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm + 4,
        paddingVertical: SPACING.xs,
    },
    metaText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 12,
        color: COLORS.accent,
        textTransform: 'capitalize',
    },
    messageCard: {
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 4,
        marginBottom: SPACING.md,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    messageText: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 14,
        color: COLORS.accent,
        lineHeight: 20,
    },
    exerciseList: {
        gap: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.md,
        ...SHADOWS.card,
    },
    exerciseNumber: {
        width: 28,
        height: 28,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.accentLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseNumberText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 13,
        color: COLORS.accent,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 15,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    exerciseMeta: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: COLORS.text.secondary,
    },
    muscleBadge: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
    },
    muscleBadgeText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 10,
        color: COLORS.text.tertiary,
        textTransform: 'capitalize',
    },
    beginWrapper: {
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    beginButton: {
        paddingVertical: SPACING.md + 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    beginText: {
        fontFamily: FONT_FAMILY.extraBold,
        fontSize: 18,
        color: '#F5F5F0',
        letterSpacing: 0.3,
    },
});

// ---------------------------------------------------------------------------
