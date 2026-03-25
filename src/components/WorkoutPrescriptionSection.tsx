import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { AnimatedPressable } from './AnimatedPressable';
import { IconFire } from './icons';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';

interface WorkoutPrescriptionSectionProps {
    prescription: any;
    themeColor: string;
    onStart: () => void;
}

function formatExerciseLine(exercise: any) {
    return exercise.setScheme ?? `${exercise.targetSets} x ${exercise.targetReps} @ RPE ${exercise.targetRPE}`;
}

function formatSubstitutions(exercise: any) {
    const substitutions = exercise.substitutions ?? [];
    if (substitutions.length === 0) return null;
    return substitutions.slice(0, 2).map((item: any) => item.exerciseName).join(' or ');
}

function renderFlatExercise(exercise: any, index: number, total: number, themeColor: string) {
    return (
        <Animated.View
            key={`${exercise.exercise.id}-${index}`}
            entering={FadeInDown.delay(40 * index).duration(ANIMATION.normal).springify()}
            style={[
                styles.exerciseRow,
                exercise.supersetGroup != null && styles.supersetRow,
                exercise.supersetGroup != null && { borderLeftColor: themeColor },
                index === total - 1 && { borderBottomWidth: 0 },
            ]}
        >
            <View style={styles.exerciseInfo}>
                <View style={styles.exerciseNameRow}>
                    {exercise.supersetGroup != null && (
                        <View style={[styles.supersetBadge, { backgroundColor: themeColor }]}>
                            <Text style={styles.supersetBadgeText}>SS</Text>
                        </View>
                    )}
                    <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                </View>
                <Text style={styles.exerciseSub}>
                    {formatExerciseLine(exercise)}  ·  {exercise.exercise.muscle_group.replace(/_/g, ' ')}
                </Text>
                {exercise.loadingStrategy ? (
                    <Text style={styles.exerciseDetail}>
                        {String(exercise.loadingStrategy).replace(/_/g, ' ')}  ·  Rest {exercise.restSeconds ?? 0}s
                    </Text>
                ) : null}
                {exercise.coachingCues?.length ? (
                    <Text style={styles.exerciseDetail}>Cue: {exercise.coachingCues[0]}</Text>
                ) : null}
                {formatSubstitutions(exercise) ? (
                    <Text style={styles.exerciseDetail}>Swap with: {formatSubstitutions(exercise)}</Text>
                ) : null}
            </View>
            <View style={[styles.cnsChip, { opacity: Math.max(0.3, exercise.exercise.cns_load / 10) }]}>
                <Text style={styles.cnsChipText}>CNS {exercise.exercise.cns_load}</Text>
            </View>
        </Animated.View>
    );
}

export function WorkoutPrescriptionSection({ prescription, themeColor, onStart }: WorkoutPrescriptionSectionProps) {
    if (!prescription) return null;

    const renderStrengthAndConditioning = () => {
        const hasSections = Array.isArray(prescription.sections) && prescription.sections.length > 0;
        const sessionLabel = getSessionFamilyLabel({
            sessionType: prescription.workoutType,
            focus: prescription.focus,
            prescription,
        });

        return (
            <>
                <SectionHeader title={`Today's Workout - ${sessionLabel.toUpperCase()}`} />
                <Card>
                    <View style={styles.prescriptionHeader}>
                        <View style={styles.prescriptionMeta}>
                            <Text style={styles.metaLabel}>Exercises</Text>
                            <Text style={styles.metaValue}>{prescription.exercises?.length || 0}</Text>
                        </View>
                        <View style={styles.prescriptionMeta}>
                            <Text style={styles.metaLabel}>CNS Load</Text>
                            <Text style={styles.metaValue}>{prescription.usedCNS}/{prescription.totalCNSBudget}</Text>
                        </View>
                        <View style={styles.prescriptionMeta}>
                            <Text style={styles.metaLabel}>Type</Text>
                            <Text style={styles.metaValue}>{prescription.workoutType}</Text>
                        </View>
                    </View>

                    {prescription.sessionGoal ? (
                        <View style={styles.sessionCopy}>
                            <Text style={styles.sessionGoal}>{prescription.sessionGoal}</Text>
                            {prescription.sessionIntent ? (
                                <Text style={styles.sessionIntent}>{prescription.sessionIntent}</Text>
                            ) : null}
                        </View>
                    ) : null}

                    {hasSections ? (
                        <View style={styles.sectionList}>
                            {prescription.sections.map((section: any, sectionIndex: number) => (
                                <Animated.View
                                    key={section.id ?? `${section.template}-${sectionIndex}`}
                                    entering={FadeInDown.delay(50 * sectionIndex).duration(ANIMATION.normal).springify()}
                                    style={[
                                        styles.sectionBlock,
                                        sectionIndex === prescription.sections.length - 1 && styles.sectionBlockLast,
                                    ]}
                                >
                                    <View style={styles.sectionHeadingRow}>
                                        <View style={styles.sectionHeadingText}>
                                            <Text style={styles.sectionTitle}>{section.title}</Text>
                                            <Text style={styles.sectionIntentText}>{section.intent}</Text>
                                        </View>
                                        <View style={[styles.sectionTag, { borderColor: themeColor }]}>
                                            <Text style={[styles.sectionTagText, { color: themeColor }]}>
                                                {String(section.template).replace(/_/g, ' ')}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.sectionRules}>
                                        {section.restRule}
                                        {section.densityRule ? `  ·  ${section.densityRule}` : ''}
                                        {section.timeCap ? `  ·  ~${section.timeCap} min` : ''}
                                    </Text>

                                    {section.exercises.map((exercise: any, exerciseIndex: number) => (
                                        <View
                                            key={`${exercise.exercise.id}-${exerciseIndex}`}
                                            style={[
                                                styles.sectionExercise,
                                                exerciseIndex === section.exercises.length - 1 && styles.sectionExerciseLast,
                                            ]}
                                        >
                                            <View style={styles.exerciseInfo}>
                                                <View style={styles.exerciseNameRow}>
                                                    {exercise.supersetGroup != null ? (
                                                        <View style={[styles.supersetBadge, { backgroundColor: themeColor }]}>
                                                            <Text style={styles.supersetBadgeText}>SS</Text>
                                                        </View>
                                                    ) : null}
                                                    <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                                                </View>
                                                <Text style={styles.exerciseSub}>
                                                    {formatExerciseLine(exercise)}
                                                </Text>
                                                <Text style={styles.exerciseDetail}>
                                                    {String(exercise.loadingStrategy || 'straight_sets').replace(/_/g, ' ')}  ·  Rest {exercise.restSeconds ?? 0}s
                                                </Text>
                                                {exercise.loadingNotes ? (
                                                    <Text style={styles.exerciseDetail}>{exercise.loadingNotes}</Text>
                                                ) : null}
                                                {exercise.coachingCues?.length ? (
                                                    <Text style={styles.exerciseDetail}>Cue: {exercise.coachingCues.join(' · ')}</Text>
                                                ) : null}
                                                {formatSubstitutions(exercise) ? (
                                                    <Text style={styles.exerciseDetail}>Swap with: {formatSubstitutions(exercise)}</Text>
                                                ) : null}
                                                {exercise.progressionAnchor?.label ? (
                                                    <Text style={styles.exerciseDetail}>Anchor: {exercise.progressionAnchor.label}</Text>
                                                ) : null}
                                            </View>
                                            <View style={styles.exerciseAside}>
                                                <View style={[styles.cnsChip, { opacity: Math.max(0.3, exercise.exercise.cns_load / 10) }]}>
                                                    <Text style={styles.cnsChipText}>CNS {exercise.exercise.cns_load}</Text>
                                                </View>
                                                <Text style={styles.fatigueText}>{exercise.fatigueCost} fatigue</Text>
                                            </View>
                                        </View>
                                    ))}

                                    {section.finisherReason ? (
                                        <Text style={styles.finisherNote}>{section.finisherReason}</Text>
                                    ) : null}
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <View>
                            {prescription.exercises?.map((exercise: any, index: number) =>
                                renderFlatExercise(exercise, index, prescription.exercises.length, themeColor))}
                        </View>
                    )}
                </Card>
            </>
        );
    };

    const renderRoadWork = () => (
        <>
            <SectionHeader title={`Road Work - ${String(prescription.type || '').replace(/_/g, ' ').toUpperCase()}`} />
            <Card>
                <View style={styles.prescriptionHeader}>
                    <View style={styles.prescriptionMeta}>
                        <Text style={styles.metaLabel}>Duration</Text>
                        <Text style={styles.metaValue}>{prescription.totalDurationMin} min</Text>
                    </View>
                    <View style={styles.prescriptionMeta}>
                        <Text style={styles.metaLabel}>Target</Text>
                        <Text style={styles.metaValue}>
                            {prescription.targetDistanceMiles ? `${prescription.targetDistanceMiles} mi` : 'Intervals'}
                        </Text>
                    </View>
                    <View style={styles.prescriptionMeta}>
                        <Text style={styles.metaLabel}>HR Zone</Text>
                        <Text style={styles.metaValue}>Z{prescription.hrZoneRange?.[0]}-Z{prescription.hrZoneRange?.[1]}</Text>
                    </View>
                </View>

                <View style={styles.sessionCopy}>
                    <Text style={styles.exerciseName}>Pace Guidance</Text>
                    <Text style={styles.exerciseSub}>{prescription.paceGuidance}</Text>
                </View>

                {prescription.intervals?.length ? (
                    <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>Intervals</Text>
                        {prescription.intervals.map((interval: any, index: number) => (
                            <View key={index} style={styles.simpleRow}>
                                <Text style={styles.exerciseSub}>{interval.type?.toUpperCase()} ({interval.durationMin}m @ Z{interval.hrZoneTarget})</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                <Text style={styles.exerciseDetail}>{prescription.message}</Text>
            </Card>
        </>
    );

    const renderConditioning = () => (
        <>
            <SectionHeader title={`Conditioning - ${String(prescription.type || '').replace(/_/g, ' ').toUpperCase()}`} />
            <Card>
                <View style={styles.prescriptionHeader}>
                    <View style={styles.prescriptionMeta}>
                        <Text style={styles.metaLabel}>Rounds</Text>
                        <Text style={styles.metaValue}>{prescription.rounds}</Text>
                    </View>
                    <View style={styles.prescriptionMeta}>
                        <Text style={styles.metaLabel}>Work/Rest</Text>
                        <Text style={styles.metaValue}>{prescription.workIntervalSec}s / {prescription.restIntervalSec}s</Text>
                    </View>
                    <View style={styles.prescriptionMeta}>
                        <Text style={styles.metaLabel}>Intensity</Text>
                        <Text style={styles.metaValue}>{String(prescription.intensityLabel || '').toUpperCase()}</Text>
                    </View>
                </View>

                {prescription.exercises?.map((exercise: any, index: number) => (
                    <View key={index} style={[styles.exerciseRow, index === prescription.exercises.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={styles.exerciseName}>{index + 1}. {exercise}</Text>
                    </View>
                ))}

                <Text style={styles.exerciseDetail}>{prescription.message}</Text>
            </Card>
        </>
    );

    let content = null;
    if (prescription.exercises && prescription.workoutType) {
        content = renderStrengthAndConditioning();
    } else if (prescription.targetDistanceMiles !== undefined || prescription.paceGuidance) {
        content = renderRoadWork();
    } else if (prescription.rounds !== undefined && prescription.workIntervalSec !== undefined) {
        content = renderConditioning();
    } else {
        return null;
    }

    return (
        <>
            {content}
            <AnimatedPressable style={styles.startButtonWrapper} onPress={onStart}>
                <LinearGradient
                    colors={[...GRADIENTS.accent] as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.startButton}
                >
                    <IconFire size={20} color="#FFF" />
                    <Text style={styles.startButtonText}>Start Workout</Text>
                </LinearGradient>
            </AnimatedPressable>
        </>
    );
}

const styles = StyleSheet.create({
    prescriptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
    },
    prescriptionMeta: {
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginTop: 2,
    },
    sessionCopy: {
        marginBottom: SPACING.md,
    },
    sessionGoal: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    sessionIntent: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    sectionList: {
        gap: SPACING.md,
    },
    sectionBlock: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.borderLight,
        paddingTop: SPACING.md,
    },
    sectionBlockLast: {
        paddingBottom: 0,
    },
    sectionHeadingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.md,
        marginBottom: SPACING.xs,
    },
    sectionHeadingText: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    sectionIntentText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    sectionTag: {
        borderWidth: 1,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    sectionTagText: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        textTransform: 'uppercase',
    },
    sectionRules: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.sm,
    },
    sectionExercise: {
        paddingVertical: SPACING.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    sectionExerciseLast: {
        borderBottomWidth: 0,
    },
    exerciseRow: {
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    supersetRow: {
        borderLeftWidth: 3,
        paddingLeft: SPACING.sm,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseAside: {
        alignItems: 'flex-end',
        gap: 6,
    },
    exerciseNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    exerciseName: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    exerciseSub: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    exerciseDetail: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginTop: 3,
    },
    fatigueText: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
    },
    finisherNote: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: SPACING.sm,
    },
    supersetBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    supersetBadgeText: {
        fontSize: 9,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    cnsChip: {
        backgroundColor: COLORS.readiness.depleted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    cnsChipText: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    simpleRow: {
        marginBottom: SPACING.xs,
    },
    startButtonWrapper: {
        marginTop: SPACING.lg,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md + 2,
        borderRadius: RADIUS.lg,
    },
    startButtonText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
});
