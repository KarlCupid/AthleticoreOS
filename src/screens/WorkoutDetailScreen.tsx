import React, { useCallback, useMemo } from 'react';
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
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { useWorkoutDetail } from '../hooks/useWorkoutDetail';
import { useWorkoutDetailController } from '../hooks/useWorkoutDetailController';
import type { TrainStackParamList } from '../navigation/types';
import type {
    WorkoutSessionSection,
    SectionExercisePrescription,
    ExerciseSubstitution,
    ExerciseLibraryRow,
} from '../../lib/engine/types';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';
import { formatShortWeekday } from '../../lib/utils/date';
import { formatRestForCoach, formatRpeForCoach } from '../components/workout/trainingCopy';
import { resolveWorkoutDetailParams } from '../navigation/routeValidation';

type NavProp = NativeStackNavigationProp<TrainStackParamList>;
type RouteProp = import('@react-navigation/native').RouteProp<TrainStackParamList, 'WorkoutDetail'>;

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

// ─── Screen ──────────────────────────────────────────────────────────────────

export function WorkoutDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProp>();
    const routeParams = useMemo(() => resolveWorkoutDetailParams(route.params), [route.params]);
    const weeklyPlanEntryId = routeParams?.weeklyPlanEntryId ?? '';
    const date = routeParams?.date ?? '';
    const readinessState = routeParams?.readinessState ?? 'Prime';
    const phase = routeParams?.phase ?? 'off-season';
    const fitnessLevel = routeParams?.fitnessLevel ?? 'intermediate';

    const {
        entry,
        prescription,
        exerciseLibrary,
        expandedExerciseId,
        isLoading,
        isRegenerating,
        swappedId,
        isMandatoryRecovery,
        mandatoryRecoveryReason,
        load,
        toggleExpanded,
        swapExercise,
        regenerate,
        markSkipped,
        restore,
    } = useWorkoutDetail();
    const {
        handleStartWorkout,
        handleSkipDay,
        handleRestore,
        handleReschedule: controllerHandleReschedule,
        handleOptionsPress,
    } = useWorkoutDetailController({
        navigation,
        entry,
        readinessState,
        phase,
        fitnessLevel,
        markSkipped,
        restore,
        regenerate,
    });

    useFocusEffect(
        useCallback(() => {
            if (!routeParams) return;
            void load(weeklyPlanEntryId);
        }, [load, routeParams, weeklyPlanEntryId]),
    );

    // ─── Handlers ────────────────────────────────────────────────────────────

    function handleReschedule() {
        // Navigate back — parent can use rescheduleDay from useWeeklyPlan
        controllerHandleReschedule();
    }

    // ─── Derived display data ─────────────────────────────────────────────────

    const status = entry?.status ?? 'planned';
    const showBottomCtaBar = false as boolean;
    const focus = entry?.focus ?? null;
    const focusLabel = getSessionFamilyLabel({
        sessionType: entry?.session_type ?? null,
        focus,
        prescription,
    });
    const dayLabel = date ? formatShortWeekday(date) : '';
    const durationMin = entry?.estimated_duration_min ?? 0;
    const intensity = entry?.target_intensity ?? null;
    const sessionGoal = prescription?.sessionGoal ?? prescription?.sessionIntent ?? null;

    const sections = prescription?.sections ?? [];
    const flatExercises = sections.length === 0 ? (prescription?.exercises ?? []) : [];
    const blockCount = sections.length > 0 ? sections.length : flatExercises.length > 0 ? 1 : 0;
    const movementCount = sections.length > 0
        ? sections.reduce((total, section) => total + section.exercises.length, 0)
        : flatExercises.length;
    const effortSummary = intensity != null ? `Effort ${intensity}/10` : 'Coach-paced effort';
    const whatToExpect = `${blockCount} block${blockCount === 1 ? '' : 's'}, ${movementCount} movement${movementCount === 1 ? '' : 's'}, about ${durationMin} min. ${effortSummary}.`;

    // ─── Render ───────────────────────────────────────────────────────────────

    if (!routeParams) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingHeader}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backText}>‹</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingCenter}>
                    <Text style={styles.emptyTitle}>Workout link unavailable</Text>
                    <Text style={styles.emptySubtitle}>Open this session from Train or Plan to review it safely.</Text>
                </View>
            </View>
        );
    }

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
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xl }]}
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
                        <Text style={styles.intentLabel}>COACH BRIEF</Text>
                        <Text style={styles.intentText}>{sessionGoal}</Text>
                        <Text style={styles.intentSubText}>{whatToExpect}</Text>
                    </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.actionPanel}>
                    <Text style={styles.actionLabel}>Ready to train?</Text>
                    {status === 'planned' || status === 'rescheduled' ? (
                        <View style={styles.ctaRow}>
                            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipDay}>
                                <Text style={styles.skipBtnText}>Skip Day</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
                                <Text style={styles.startBtnText}>Start Session</Text>
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
                </Animated.View>

                {/* Sectioned exercises */}
                {sections.length > 0 && sections.map((section, sIdx) => (
                    <SectionBlock
                        key={section.id}
                        section={section}
                        expandedExerciseId={expandedExerciseId}
                        swappedId={swappedId}
                        exerciseLibrary={exerciseLibrary}
                        isMandatoryRecovery={isMandatoryRecovery}
                        mandatoryRecoveryReason={mandatoryRecoveryReason}
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
                                isMandatoryRecovery={isMandatoryRecovery}
                                mandatoryRecoveryReason={mandatoryRecoveryReason}
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
            {showBottomCtaBar ? (
                <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom - SPACING.xs, SPACING.xs) }]}>
                {status === 'planned' || status === 'rescheduled' ? (
                    <View style={styles.ctaRow}>
                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkipDay}>
                            <Text style={styles.skipBtnText}>Skip Day</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
                            <Text style={styles.startBtnText}>Start Session</Text>
                        </TouchableOpacity>
                    </View>
                ) : status === 'completed' ? (
                    <View style={styles.ctaRow}>
                        <View style={styles.completedStats}>
                            {entry?.workout_log_id && (
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
            ) : null}
        </View>
    );
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────

interface SectionBlockProps {
    section: WorkoutSessionSection;
    expandedExerciseId: string | null;
    swappedId: string | null;
    exerciseLibrary: ExerciseLibraryRow[];
    isMandatoryRecovery: boolean;
    mandatoryRecoveryReason: string;
    onToggleExpanded: (id: string) => void;
    onSwapExercise: (exerciseId: string, sub: ExerciseSubstitution) => void;
    delay: number;
}

function SectionBlock({
    section,
    expandedExerciseId,
    swappedId,
    exerciseLibrary,
    isMandatoryRecovery,
    mandatoryRecoveryReason,
    onToggleExpanded,
    onSwapExercise,
    delay,
}: SectionBlockProps) {
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
                    isMandatoryRecovery={isMandatoryRecovery}
                    mandatoryRecoveryReason={mandatoryRecoveryReason}
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
    isMandatoryRecovery: boolean;
    mandatoryRecoveryReason: string;
    onToggle: () => void;
    onSwap: (sub: ExerciseSubstitution) => void;
}

function ExerciseRow({
    exercisePrescription: ep,
    isExpanded,
    isSwapped,
    isMandatoryRecovery,
    mandatoryRecoveryReason,
    onToggle,
    onSwap,
}: ExerciseRowProps) {
    const { exercise, setScheme, coachingCues, loadingNotes, substitutions, restSeconds, targetRPE, targetSets, targetReps } = ep;
    const hasDetails =
        Boolean(loadingNotes && loadingNotes.trim().length > 0)
        || (coachingCues && coachingCues.length > 0)
        || (substitutions && substitutions.length > 0);
    const restLabel = formatRestForCoach(restSeconds);
    const effortLabel = targetRPE ? formatRpeForCoach(targetRPE) : null;
    const actionLine = setScheme ?? (targetSets && targetReps ? `${targetSets} x ${targetReps}` : null);
    const focusCue = coachingCues?.[0] ?? null;

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
                        {actionLine ? <Text style={styles.setSchemeText}>{actionLine}</Text> : null}
                        {effortLabel ? <Text style={styles.effortText}>{effortLabel}</Text> : null}
                        {restLabel ? <Text style={styles.restText}>{restLabel}</Text> : null}
                    </View>
                    {focusCue ? <Text style={styles.quickCue} numberOfLines={1}>Focus: {focusCue}</Text> : null}
                </View>
                {hasDetails && (
                    <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>›</Text>
                )}
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.exerciseDetail}>
                    {loadingNotes ? (
                        <View style={styles.cuesBlock}>
                            <Text style={styles.detailLabel}>HOW TO DO IT</Text>
                            <Text style={styles.cueText}>{loadingNotes}</Text>
                        </View>
                    ) : null}
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
                            <Text style={styles.detailLabel}>{isMandatoryRecovery ? 'SUBSTITUTES LOCKED' : 'SUBSTITUTES'}</Text>
                            {isMandatoryRecovery ? (
                                <View style={styles.lockoutCard}>
                                    <Text style={styles.lockoutText}>{mandatoryRecoveryReason}</Text>
                                </View>
                            ) : (
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
                            )}
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
        backgroundColor: 'transparent',
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
    intentSubText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
        lineHeight: 19,
        marginTop: SPACING.sm,
    },

    // Session actions
    actionPanel: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    actionLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: SPACING.sm,
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
    effortText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },
    quickCue: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 4,
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
    lockoutCard: {
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.warning,
    },
    lockoutText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 18,
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
