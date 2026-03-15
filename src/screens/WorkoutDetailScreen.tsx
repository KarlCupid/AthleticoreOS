import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { useWorkoutDetail } from '../hooks/useWorkoutDetail';
import type { PlanStackParamList } from '../navigation/types';
import type {
    WorkoutFocus,
    WorkoutSessionSection,
    SectionExercisePrescription,
    ExerciseSubstitution,
    ExerciseLibraryRow,
} from '../../lib/engine/types';

type NavProp = NativeStackNavigationProp<PlanStackParamList>;
type RouteProp = import('@react-navigation/native').RouteProp<PlanStackParamList, 'WorkoutDetail'>;

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, string> = {
    activation: '⚡',
    power: '💥',
    main_strength: '🏋',
    secondary_strength: '🔁',
    accessory: '＋',
    durability: '🛡',
    finisher: '🔥',
    cooldown: '🌀',
};

const FOCUS_LABELS: Record<WorkoutFocus, string> = {
    lower: 'Lower Body',
    upper_push: 'Upper Push',
    upper_pull: 'Upper Pull',
    full_body: 'Full Body',
    conditioning: 'Conditioning',
    sport_specific: 'Sport Specific',
    recovery: 'Recovery',
};

const STATUS_COLORS: Record<string, string> = {
    planned: COLORS.text.tertiary,
    completed: COLORS.success,
    skipped: COLORS.warning,
    rescheduled: COLORS.warning,
};

const STATUS_LABELS: Record<string, string> = {
    planned: 'Planned',
    completed: 'Completed',
    skipped: 'Skipped',
    rescheduled: 'Rescheduled',
};

const READINESS_COLORS: Record<string, string> = {
    Prime: COLORS.readiness.prime,
    Caution: COLORS.readiness.caution,
    Depleted: COLORS.readiness.depleted,
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return DAY_NAMES[d.getDay()];
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function WorkoutDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProp>();
    const { weeklyPlanEntryId, date, readinessState, phase, fitnessLevel, isDeloadWeek: _isDeloadWeek } = route.params;

    const {
        entry,
        prescription,
        exerciseLibrary,
        expandedExerciseId,
        isLoading,
        isRegenerating,
        swappedId,
        load,
        toggleExpanded,
        swapExercise,
        regenerate,
        markSkipped,
        restore,
    } = useWorkoutDetail();

    useFocusEffect(
        useCallback(() => {
            void load(weeklyPlanEntryId);
        }, [load, weeklyPlanEntryId]),
    );

    // ─── Handlers ────────────────────────────────────────────────────────────

    function handleStartWorkout() {
        if (!entry) return;
        navigation.navigate('GuidedWorkout', {
            weeklyPlanEntryId: entry.id,
            scheduledActivityId: entry.scheduled_activity_id ?? undefined,
            focus: entry.focus ?? undefined,
            availableMinutes: entry.estimated_duration_min,
            readinessState,
            phase,
            fitnessLevel,
            trainingDate: entry.date,
            isDeloadWeek: entry.is_deload,
        });
    }

    function handleSkipDay() {
        Alert.alert('Skip Day?', 'This session will be marked as skipped.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Skip', style: 'destructive', onPress: () => void markSkipped() },
        ]);
    }

    function handleRestore() {
        void restore();
    }

    function handleReschedule() {
        // Navigate back — parent can use rescheduleDay from useWeeklyPlan
        navigation.goBack();
    }

    async function handleOptionsPress() {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId || !entry) return;

        Alert.alert('Workout Options', '', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Regenerate Workout',
                onPress: () => {
                    Alert.alert(
                        'Regenerate?',
                        'This will replace the current workout with a newly generated one.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Regenerate', onPress: () => void regenerate(userId) },
                        ],
                    );
                },
            },
            {
                text: 'Change Focus',
                onPress: () => showFocusPicker(userId),
            },
            {
                text: 'Mark as Rest Day',
                style: 'destructive',
                onPress: handleSkipDay,
            },
        ]);
    }

    function showFocusPicker(userId: string) {
        const focusOptions: WorkoutFocus[] = ['lower', 'upper_push', 'upper_pull', 'full_body', 'conditioning', 'sport_specific'];
        Alert.alert(
            'Choose Focus',
            'Select a new focus for this session.',
            [
                { text: 'Cancel', style: 'cancel' },
                ...focusOptions.map(f => ({
                    text: FOCUS_LABELS[f],
                    onPress: () => void regenerate(userId, f),
                })),
            ],
        );
    }

    // ─── Derived display data ─────────────────────────────────────────────────

    const status = entry?.status ?? 'planned';
    const focus = entry?.focus ?? null;
    const focusLabel = focus ? FOCUS_LABELS[focus] : 'Session';
    const dayLabel = date ? formatDayLabel(date) : '';
    const durationMin = entry?.estimated_duration_min ?? 0;
    const intensity = entry?.target_intensity ?? null;
    const sessionGoal = prescription?.sessionGoal ?? prescription?.sessionIntent ?? null;

    const sections = prescription?.sections ?? [];
    const flatExercises = sections.length === 0 ? (prescription?.exercises ?? []) : [];

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>‹</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={styles.loadingText}>Loading workout…</Text>
                </View>
            </View>
        );
    }

    if (!entry || !prescription) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>‹</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingCenter}>
                    <Text style={styles.emptyTitle}>No workout found</Text>
                    <Text style={styles.emptySubtitle}>This session has no prescription yet.</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => void load(weeklyPlanEntryId)}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>‹</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{focusLabel} · {dayLabel}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] + '20' }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => void handleOptionsPress()} style={styles.optionsBtn}>
                    <Text style={styles.optionsText}>⋮</Text>
                </TouchableOpacity>
            </View>

            {/* ── Regenerating overlay ── */}
            {isRegenerating && (
                <View style={styles.regenOverlay}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                    <Text style={styles.regenText}>Regenerating…</Text>
                </View>
            )}

            {/* ── Scrollable content ── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Meta row */}
                <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.metaRow}>
                    <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>{durationMin} min</Text>
                    </View>
                    {intensity != null && (
                        <View style={styles.metaChip}>
                            <Text style={styles.metaChipText}>Intensity {intensity}/10</Text>
                        </View>
                    )}
                    <View style={[styles.metaChip, { backgroundColor: (READINESS_COLORS[readinessState] ?? COLORS.accent) + '20' }]}>
                        <Text style={[styles.metaChipText, { color: READINESS_COLORS[readinessState] ?? COLORS.accent }]}>{readinessState}</Text>
                    </View>
                </Animated.View>

                {/* Session intent */}
                {sessionGoal != null && (
                    <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.intentCard}>
                        <Text style={styles.intentLabel}>SESSION GOAL</Text>
                        <Text style={styles.intentText}>{sessionGoal}</Text>
                    </Animated.View>
                )}

                {/* Sectioned exercises */}
                {sections.length > 0 && sections.map((section, sIdx) => (
                    <SectionBlock
                        key={section.id}
                        section={section}
                        expandedExerciseId={expandedExerciseId}
                        swappedId={swappedId}
                        exerciseLibrary={exerciseLibrary}
                        onToggleExpanded={toggleExpanded}
                        onSwapExercise={(exerciseId, sub) => {
                            const resolved = exerciseLibrary.find(e => e.id === sub.exerciseId);
                            if (!resolved) {
                                Alert.alert('Not found', 'Could not find substitute exercise in library.');
                                return;
                            }
                            void swapExercise(section.id, exerciseId, resolved);
                        }}
                        delay={150 + sIdx * 60}
                    />
                ))}

                {/* Flat fallback */}
                {flatExercises.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.section}>
                        <Text style={styles.sectionTitle}>Exercises</Text>
                        {flatExercises.map(ex => (
                            <ExerciseRow
                                key={ex.exercise.id}
                                exercisePrescription={ex as SectionExercisePrescription}
                                isExpanded={expandedExerciseId === ex.exercise.id}
                                isSwapped={swappedId === ex.exercise.id}
                                exerciseLibrary={exerciseLibrary}
                                onToggle={() => toggleExpanded(ex.exercise.id)}
                                onSwap={(sub) => {
                                    const resolved = exerciseLibrary.find(e => e.id === sub.exerciseId);
                                    if (!resolved) return;
                                    void swapExercise('flat', ex.exercise.id, resolved);
                                }}
                            />
                        ))}
                    </Animated.View>
                )}
            </ScrollView>

            {/* ── Bottom CTA bar ── */}
            <View style={[styles.ctaBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
                {status === 'planned' || status === 'rescheduled' ? (
                    <View style={styles.ctaRow}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkipDay}>
                            <Text style={styles.skipBtnText}>Skip Day</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
                            <Text style={styles.startBtnText}>Start Workout →</Text>
                        </TouchableOpacity>
                    </View>
                ) : status === 'completed' ? (
                    <View style={styles.ctaRow}>
                        <View style={styles.completedStats}>
                            {entry.workout_log_id && (
                                <Text style={styles.completedHint}>Workout logged ✓</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.viewLogBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.viewLogBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                ) : status === 'skipped' ? (
                    <View style={styles.ctaRow}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleRestore}>
                            <Text style={styles.skipBtnText}>Restore</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.startBtn} onPress={handleReschedule}>
                            <Text style={styles.startBtnText}>Reschedule</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────

interface SectionBlockProps {
    section: WorkoutSessionSection;
    expandedExerciseId: string | null;
    swappedId: string | null;
    exerciseLibrary: ExerciseLibraryRow[];
    onToggleExpanded: (id: string) => void;
    onSwapExercise: (exerciseId: string, sub: ExerciseSubstitution) => void;
    delay: number;
}

function SectionBlock({ section, expandedExerciseId, swappedId, exerciseLibrary, onToggleExpanded, onSwapExercise, delay }: SectionBlockProps) {
    const icon = SECTION_ICONS[section.template] ?? '•';

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{icon}</Text>
                <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.intent ? <Text style={styles.sectionIntent} numberOfLines={2}>{section.intent}</Text> : null}
                </View>
                {section.timeCap > 0 && (
                    <Text style={styles.sectionTimeCap}>~{section.timeCap} min</Text>
                )}
            </View>
            {section.restRule ? (
                <Text style={styles.sectionRule}>{section.restRule}</Text>
            ) : null}
            {section.exercises.map(ex => (
                <ExerciseRow
                    key={ex.exercise.id}
                    exercisePrescription={ex}
                    isExpanded={expandedExerciseId === ex.exercise.id}
                    isSwapped={swappedId === ex.exercise.id}
                    exerciseLibrary={exerciseLibrary}
                    onToggle={() => onToggleExpanded(ex.exercise.id)}
                    onSwap={(sub) => onSwapExercise(ex.exercise.id, sub)}
                />
            ))}
        </Animated.View>
    );
}

// ─── ExerciseRow ──────────────────────────────────────────────────────────────

interface ExerciseRowProps {
    exercisePrescription: SectionExercisePrescription;
    isExpanded: boolean;
    isSwapped: boolean;
    exerciseLibrary: ExerciseLibraryRow[];
    onToggle: () => void;
    onSwap: (sub: ExerciseSubstitution) => void;
}

function ExerciseRow({ exercisePrescription: ep, isExpanded, isSwapped, onToggle, onSwap }: ExerciseRowProps) {
    const { exercise, setScheme, coachingCues, substitutions, restSeconds } = ep;
    const hasDetails = (coachingCues && coachingCues.length > 0) || (substitutions && substitutions.length > 0);
    const restMin = restSeconds ? Math.floor(restSeconds / 60) : null;
    const restSec = restSeconds ? restSeconds % 60 : null;
    const restLabel = restSeconds
        ? restMin && restMin > 0
            ? `${restMin}m${restSec ? ` ${restSec}s` : ''} rest`
            : `${restSeconds}s rest`
        : null;

    return (
        <View style={styles.exerciseRow}>
            <TouchableOpacity
                style={styles.exerciseSummary}
                onPress={hasDetails ? onToggle : undefined}
                activeOpacity={hasDetails ? 0.7 : 1}
            >
                <View style={styles.exerciseMain}>
                    <View style={styles.exerciseNameRow}>
                        <Text style={styles.exerciseName} numberOfLines={1}>{exercise.name}</Text>
                        {isSwapped && (
                            <View style={styles.swappedBadge}>
                                <Text style={styles.swappedBadgeText}>Swapped</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.exerciseMeta}>
                        <View style={styles.muscleChip}>
                            <Text style={styles.muscleChipText}>{exercise.muscle_group}</Text>
                        </View>
                        {setScheme ? <Text style={styles.setSchemeText}>{setScheme}</Text> : null}
                        {restLabel ? <Text style={styles.restText}>{restLabel}</Text> : null}
                    </View>
                </View>
                {hasDetails && (
                    <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>›</Text>
                )}
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.exerciseDetail}>
                    {coachingCues && coachingCues.length > 0 && (
                        <View style={styles.cuesBlock}>
                            <Text style={styles.detailLabel}>COACHING CUES</Text>
                            {coachingCues.map((cue, i) => (
                                <Text key={i} style={styles.cueText}>• {cue}</Text>
                            ))}
                        </View>
                    )}
                    {substitutions && substitutions.length > 0 && (
                        <View style={styles.subsBlock}>
                            <Text style={styles.detailLabel}>SUBSTITUTES</Text>
                            <View style={styles.subChipsRow}>
                                {substitutions.slice(0, 3).map(sub => (
                                    <TouchableOpacity
                                        key={sub.exerciseId}
                                        style={styles.subChip}
                                        onPress={() => onSwap(sub)}
                                    >
                                        <Text style={styles.subChipName} numberOfLines={1}>{sub.exerciseName}</Text>
                                        {sub.rationale ? (
                                            <Text style={styles.subChipRationale} numberOfLines={1}>{sub.rationale}</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: {
        fontSize: 28,
        color: COLORS.text.primary,
        fontFamily: FONT_FAMILY.regular,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'row',
        gap: SPACING.sm,
        marginHorizontal: SPACING.xs,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.full,
    },
    statusText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        letterSpacing: 0.3,
    },
    optionsBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionsText: {
        fontSize: 22,
        color: COLORS.text.secondary,
    },

    // Regen overlay
    regenOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.accentLight,
    },
    regenText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },

    // Loading
    loadingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    loadingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
        padding: SPACING.xl,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        fontFamily: FONT_FAMILY.regular,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.text.secondary,
        fontFamily: FONT_FAMILY.regular,
        textAlign: 'center',
    },
    retryBtn: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.md,
    },
    retryText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: {
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },

    // Meta row
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    metaChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: RADIUS.full,
    },
    metaChipText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },

    // Intent card
    intentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    intentLabel: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        letterSpacing: 1,
        marginBottom: SPACING.xs,
    },
    intentText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
        lineHeight: 20,
    },

    // Section
    section: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    sectionIcon: {
        fontSize: 18,
        lineHeight: 24,
    },
    sectionHeaderText: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    sectionIntent: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
        lineHeight: 16,
    },
    sectionTimeCap: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    sectionRule: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.sm,
        paddingLeft: 28,
    },

    // Exercise rows
    exerciseRow: {
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        paddingTop: SPACING.sm,
        marginTop: SPACING.xs,
    },
    exerciseSummary: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    exerciseMain: {
        flex: 1,
    },
    exerciseNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: 4,
    },
    exerciseName: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        flex: 1,
    },
    swappedBadge: {
        backgroundColor: COLORS.accentLight,
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    swappedBadgeText: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
    exerciseMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    muscleChip: {
        backgroundColor: COLORS.surfaceSecondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    muscleChipText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'capitalize',
    },
    setSchemeText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    restText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    chevron: {
        fontSize: 20,
        color: COLORS.text.tertiary,
        paddingLeft: SPACING.sm,
    },
    chevronOpen: {
        transform: [{ rotate: '90deg' }],
    },

    // Exercise detail (expanded)
    exerciseDetail: {
        marginTop: SPACING.sm,
        paddingLeft: 4,
        gap: SPACING.sm,
    },
    cuesBlock: {
        gap: 4,
    },
    detailLabel: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    cueText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 18,
    },
    subsBlock: {
        gap: 4,
    },
    subChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    subChip: {
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxWidth: 160,
    },
    subChipName: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    subChipRationale: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginTop: 1,
    },

    // CTA bar
    ctaBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        ...SHADOWS.card,
    },
    ctaRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignItems: 'center',
    },
    skipBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    skipBtnText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    startBtn: {
        flex: 2,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.accent,
    },
    startBtnText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
    viewLogBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surfaceSecondary,
    },
    viewLogBtnText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    completedStats: {
        flex: 1,
        justifyContent: 'center',
    },
    completedHint: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.success,
    },
});
