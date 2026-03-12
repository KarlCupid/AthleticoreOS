import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { IconChevronLeft, IconActivity } from '../components/icons';
import { ExerciseLibraryRow } from '../../lib/engine/types';
import { PlanStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<PlanStackParamList>;
type RouteParams = {
    ExerciseDetail: { exercise: ExerciseLibraryRow; workoutLogId?: string };
};

export function ExerciseDetailScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteProp<RouteParams, 'ExerciseDetail'>>();
    const { exercise, workoutLogId } = route.params;
    const { themeColor } = useReadinessTheme();

    const handleAdd = () => {
        if (workoutLogId) {
            // Navigate back to ActiveWorkout and pass a unique token so the screen can add exactly one set.
            navigation.navigate('ActiveWorkout', {
                workoutLogId,
                focus: null,
                workoutType: 'strength',
                selectedExerciseId: exercise.id,
                selectionToken: `${Date.now()}`,
            });
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <IconChevronLeft size={24} color={COLORS.text.primary} />
                </AnimatedPressable>
                <Text style={styles.title} numberOfLines={1}>{exercise.name}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()}>
                    {/* Exercise Info Card */}
                    <Card>
                        <View style={styles.infoGrid}>
                            <InfoBox label="Type" value={exercise.type.replace(/_/g, ' ')} />
                            <InfoBox label="Muscle" value={exercise.muscle_group.replace(/_/g, ' ')} />
                            <InfoBox label="Equipment" value={exercise.equipment.replace(/_/g, ' ')} />
                            <InfoBox label="CNS Load" value={`${exercise.cns_load}/10`} />
                        </View>
                    </Card>

                    {/* CNS Load Meter */}
                    <Card style={{ marginTop: SPACING.md }}>
                        <Text style={styles.sectionTitle}>CNS Demand</Text>
                        <View style={styles.cnsMeter}>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.cnsBlock,
                                        {
                                            backgroundColor: i < exercise.cns_load
                                                ? exercise.cns_load >= 8
                                                    ? COLORS.readiness.depleted
                                                    : exercise.cns_load >= 5
                                                        ? COLORS.readiness.caution
                                                        : COLORS.readiness.prime
                                                : COLORS.borderLight,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    </Card>

                    {/* Description */}
                    {exercise.description ? (
                        <Card style={{ marginTop: SPACING.md }}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.descriptionText}>{exercise.description}</Text>
                        </Card>
                    ) : null}

                    {/* Cues */}
                    {exercise.cues ? (
                        <Card style={{ marginTop: SPACING.md }}>
                            <Text style={styles.sectionTitle}>Coaching Cues</Text>
                            <Text style={styles.cuesText}>{exercise.cues}</Text>
                        </Card>
                    ) : null}

                    {/* Sport Tags */}
                    {exercise.sport_tags.length > 0 && (
                        <Card style={{ marginTop: SPACING.md }}>
                            <Text style={styles.sectionTitle}>Sport Tags</Text>
                            <View style={styles.tagRow}>
                                {exercise.sport_tags.map(tag => (
                                    <View key={tag} style={[styles.tag, { backgroundColor: themeColor + '20', borderColor: themeColor }]}>
                                        <Text style={[styles.tagText, { color: themeColor }]}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </Card>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Bottom Action */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
                <AnimatedPressable
                    style={styles.addButtonWrapper}
                    onPress={handleAdd}
                >
                    <LinearGradient
                        colors={[...GRADIENTS.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.addButton}
                    >
                        <Text style={styles.addButtonText}>
                            {workoutLogId ? 'Add to Workout' : 'Done'}
                        </Text>
                    </LinearGradient>
                </AnimatedPressable>
            </View>
        </View>
    );
}

function InfoBox({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    backButton: { padding: SPACING.sm, marginRight: SPACING.sm },
    title: {
        flex: 1,
        fontSize: 20,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    content: { padding: SPACING.lg },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    infoBox: {
        width: '50%',
        paddingVertical: SPACING.sm,
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    cnsMeter: {
        flexDirection: 'row',
        gap: 4,
        marginTop: SPACING.sm,
    },
    cnsBlock: {
        flex: 1,
        height: 8,
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    descriptionText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
        lineHeight: 22,
    },
    cuesText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    tag: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 1,
        borderRadius: RADIUS.full,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        textTransform: 'capitalize',
    },
    bottomBar: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        backgroundColor: COLORS.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border,
    },
    addButtonWrapper: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    addButton: {
        paddingVertical: SPACING.md + 2,
        alignItems: 'center',
        borderRadius: RADIUS.lg,
    },
    addButtonText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
});
