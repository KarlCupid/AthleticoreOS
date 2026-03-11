import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { AnimatedPressable } from './AnimatedPressable';
import { IconFire } from './icons';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';

interface WorkoutPrescriptionSectionProps {
    prescription: any;
    themeColor: string;
    onStart: () => void;
}

export function WorkoutPrescriptionSection({ prescription, themeColor, onStart }: WorkoutPrescriptionSectionProps) {
    if (!prescription) return null;

    const renderSNC = () => (
        <>
            <SectionHeader title={`Today's Workout — ${prescription.focus?.replace(/_/g, ' ').toUpperCase()}`} />
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

                {prescription.exercises?.map((pe: any, i: number) => (
                    <Animated.View
                        key={`${pe.exercise.id}-${i}`}
                        entering={FadeInDown.delay(40 * i).duration(ANIMATION.normal).springify()}
                        style={[
                            styles.exerciseRow,
                            pe.supersetGroup != null && styles.supersetRow,
                            pe.supersetGroup != null && { borderLeftColor: themeColor },
                            i === (prescription.exercises?.length || 0) - 1 && { borderBottomWidth: 0 },
                        ]}
                    >
                        <View style={styles.exerciseInfo}>
                            <View style={styles.exerciseNameRow}>
                                {pe.supersetGroup != null && (
                                    <View style={[styles.supersetBadge, { backgroundColor: themeColor }]}>
                                        <Text style={styles.supersetBadgeText}>SS</Text>
                                    </View>
                                )}
                                <Text style={styles.exerciseName}>{pe.exercise.name}</Text>
                            </View>
                            <Text style={styles.exerciseSub}>
                                {pe.targetSets} × {pe.targetReps} @ RPE {pe.targetRPE}
                                {'  ·  '}{pe.exercise.muscle_group.replace(/_/g, ' ')}
                            </Text>
                        </View>
                        <View style={[styles.cnsChip, { opacity: Math.max(0.3, pe.exercise.cns_load / 10) }]}>
                            <Text style={styles.cnsChipText}>CNS {pe.exercise.cns_load}</Text>
                        </View>
                    </Animated.View>
                ))}
            </Card>
        </>
    );

    const renderRoadWork = () => (
        <>
            <SectionHeader title={`Road Work — ${(prescription.type || '').replace(/_/g, ' ').toUpperCase()}`} />
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

                <View style={{ paddingVertical: SPACING.md }}>
                    <Text style={[styles.exerciseName, { marginBottom: SPACING.xs }]}>Pace Guidance</Text>
                    <Text style={styles.exerciseSub}>{prescription.paceGuidance}</Text>
                </View>

                {prescription.intervals && prescription.intervals.length > 0 && (
                    <View style={{ paddingVertical: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLORS.borderLight }}>
                        <Text style={[styles.exerciseName, { marginBottom: SPACING.sm }]}>Intervals</Text>
                        {prescription.intervals.map((inv: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs }}>
                                <Text style={styles.exerciseSub}>{inv.type.toUpperCase()} ({inv.durationMin}m @ Z{inv.hrZoneTarget})</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ paddingTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLORS.borderLight }}>
                    <Text style={styles.exerciseSub}>{prescription.message}</Text>
                </View>
            </Card>
        </>
    );

    const renderConditioning = () => (
        <>
            <SectionHeader title={`Conditioning — ${(prescription.type || '').replace(/_/g, ' ').toUpperCase()}`} />
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

                {prescription.exercises && prescription.exercises.map((ex: any, i: number) => (
                    <View key={i} style={[styles.exerciseRow, i === prescription.exercises.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={styles.exerciseName}>{i + 1}. {ex}</Text>
                    </View>
                ))}

                <View style={{ paddingTop: SPACING.md, marginTop: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLORS.borderLight }}>
                    <Text style={styles.exerciseSub}>{prescription.message}</Text>
                </View>
            </Card>
        </>
    );

    let content = null;
    if (prescription.exercises && prescription.workoutType) {
        content = renderSNC();
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

            <AnimatedPressable
                style={styles.startButtonWrapper}
                onPress={onStart}
            >
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
