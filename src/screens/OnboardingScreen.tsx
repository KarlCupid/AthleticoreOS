import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard,
} from 'react-native';
import Animated, { FadeInRight, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, GRADIENTS, ANIMATION } from '../theme/theme';
import { supabase } from '../../lib/supabase';
import { IconChevronLeft, IconChevronRight, IconCheckCircle } from '../components/icons';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { DatePickerField } from '../components/DatePickerField';
import { DAY_OPTIONS } from './weeklyPlanSetup/constants';
import { addDays, todayLocalDate } from '../../lib/utils/date';
import type { AthleteGoalMode, BuildPhaseGoalType } from '../../lib/engine/types';
import {
    completeCoachIntake,
    type IntakeFixedSession,
    type IntakeFixedSessionType,
    type IntakeTrainingBackground,
} from './onboarding/completeCoachIntake';
import { styles } from './OnboardingScreen.styles';

interface OnboardingScreenProps {
    onComplete: () => void;
}

const TOTAL_STEPS = 3;

const STEP_META = [
    {
        eyebrow: 'Step 1',
        title: 'Meet Your Coach',
        description: 'We will build momentum first, then dial in the details as you train.',
    },
    {
        eyebrow: 'Step 2',
        title: 'Your Baseline',
        description: 'Just enough context to keep the first plan safe.',
    },
    {
        eyebrow: 'Step 3',
        title: 'First Week',
        description: 'Pick a clear direction and realistic training days.',
    },
] as const;

const BIO_SEX_OPTIONS = [
    { value: 'male', label: 'Male physiology', descriptor: 'Uses male nutrition and recovery defaults.' },
    { value: 'female', label: 'Female physiology', descriptor: 'Uses female nutrition and recovery defaults.' },
] as const;

const TRAINING_BACKGROUND_OPTIONS: Array<{
    value: IntakeTrainingBackground;
    label: string;
    descriptor: string;
}> = [
    { value: 'new', label: 'New to structure', descriptor: 'Start conservative and learn the basics.' },
    { value: 'some', label: 'Some experience', descriptor: 'I train consistently, but still want guidance.' },
    { value: 'advanced', label: 'Advanced', descriptor: 'I have years of structured training.' },
];

type MainGoal = BuildPhaseGoalType | 'fight_camp';

const MAIN_GOAL_OPTIONS: Array<{
    value: MainGoal;
    label: string;
    descriptor: string;
}> = [
    { value: 'conditioning', label: 'Build gas tank', descriptor: 'Improve pace and repeatability.' },
    { value: 'strength', label: 'Get stronger', descriptor: 'Build useful strength without overdoing it.' },
    { value: 'boxing_skill', label: 'Sharpen boxing', descriptor: 'Protect technical work and skill rhythm.' },
    { value: 'weight_class_prep', label: 'Move weight', descriptor: 'Start bodyweight prep steadily.' },
    { value: 'fight_camp', label: 'Fight booked', descriptor: 'Build toward a fight date.' },
];

const SESSION_TYPE_OPTIONS: Array<{ value: IntakeFixedSessionType; label: string }> = [
    { value: 'boxing_practice', label: 'Boxing' },
    { value: 'sparring', label: 'Sparring' },
];

const DURATION_OPTIONS = [60, 90, 120];
const INTENSITY_OPTIONS = [
    { value: 5, label: 'Easy' },
    { value: 7, label: 'Solid' },
    { value: 9, label: 'Hard' },
];

function parsePositiveNumber(value: string): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function createFixedSession(dayOfWeek: number = 1): IntakeFixedSession {
    return {
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        activityType: 'boxing_practice',
        dayOfWeek,
        startTime: '19:00',
        durationMin: 90,
        expectedIntensity: 7,
        label: '',
    };
}

function isValidTime(value: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [bioSex, setBioSex] = useState<'male' | 'female'>('male');
    const [trainingBackground, setTrainingBackground] = useState<IntakeTrainingBackground>('new');
    const [mainGoal, setMainGoal] = useState<MainGoal>('conditioning');
    const [targetWeight, setTargetWeight] = useState('');
    const [fightDate, setFightDate] = useState(addDays(todayLocalDate(), 84));
    const [availableDays, setAvailableDays] = useState<number[]>([1, 3, 5]);
    const [fixedSessions, setFixedSessions] = useState<IntakeFixedSession[]>([]);
    const [saving, setSaving] = useState(false);

    const currentStepMeta = STEP_META[step];
    const needsTargetWeight = mainGoal === 'weight_class_prep' || mainGoal === 'fight_camp';

    React.useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const canProceed = () => {
        switch (step) {
            case 0:
                return true;
            case 1:
                return parsePositiveNumber(age) != null && parsePositiveNumber(weight) != null;
            default:
                return availableDays.length > 0 && (mainGoal !== 'fight_camp' || Boolean(fightDate));
        }
    };

    const progressStyle = useAnimatedStyle(() => ({
        width: withTiming(`${((step + 1) / TOTAL_STEPS) * 100}%`, { duration: 400 }),
    }));

    const toggleAvailableDay = (dayOfWeek: number) => {
        setAvailableDays((current) => {
            if (current.includes(dayOfWeek)) {
                return current.filter((day) => day !== dayOfWeek);
            }
            return [...current, dayOfWeek].sort((a, b) => {
                const order = [1, 2, 3, 4, 5, 6, 0];
                return order.indexOf(a) - order.indexOf(b);
            });
        });
    };

    const updateFixedSession = (id: string, patch: Partial<IntakeFixedSession>) => {
        setFixedSessions((current) => current.map((session) => (
            session.id === id ? { ...session, ...patch } : session
        )));
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS - 1) {
            setStep((current) => current + 1);
            return;
        }

        void handleComplete();
    };

    const handleBack = () => {
        if (step > 0) {
            setStep((current) => current - 1);
        }
    };

    const handleComplete = async () => {
        const parsedAge = parsePositiveNumber(age);
        const parsedWeight = parsePositiveNumber(weight);
        const parsedTargetWeight = targetWeight.trim() ? parsePositiveNumber(targetWeight) : null;

        if (parsedAge == null || parsedWeight == null) {
            Alert.alert('Baseline needed', 'Add your age and current body weight so your first plan starts safely.');
            return;
        }

        if (targetWeight.trim() && parsedTargetWeight == null) {
            Alert.alert('Check target weight', 'Target weight should be a number, or leave it blank for now.');
            return;
        }

        if (availableDays.length === 0) {
            Alert.alert('Training days needed', 'Pick at least one day you can train.');
            return;
        }

        const invalidSession = fixedSessions.find((session) => !isValidTime(session.startTime));
        if (invalidSession) {
            Alert.alert('Check fixed session', 'Use a start time like 18:30.');
            return;
        }

        const goalMode: AthleteGoalMode = mainGoal === 'fight_camp' ? 'fight_camp' : 'build_phase';
        const buildGoalType: BuildPhaseGoalType = mainGoal === 'fight_camp' ? 'conditioning' : mainGoal;

        setSaving(true);
        try {
            await completeCoachIntake({
                age: parsedAge,
                currentWeightLbs: parsedWeight,
                biologicalSex: bioSex,
                trainingBackground,
                goalMode,
                buildGoalType,
                fightDate: goalMode === 'fight_camp' ? fightDate : null,
                targetWeightLbs: parsedTargetWeight,
                availableDays,
                fixedSessions,
            });
            onComplete();
        } catch (err: any) {
            Alert.alert('Could not build your first week', err.message || 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const renderOptionCard = <T extends string>(
        selected: boolean,
        option: { value: T; label: string; descriptor?: string },
        onPress: (value: T) => void,
    ) => (
        <TouchableOpacity
            key={option.value}
            style={[styles.activityOptionCard, selected && styles.activityOptionCardActive]}
            onPress={() => onPress(option.value)}
            activeOpacity={0.85}
        >
            <View style={styles.activityOptionCopy}>
                <Text style={[styles.activityOptionTitle, selected && styles.activityOptionTitleActive]}>
                    {option.label}
                </Text>
                {option.descriptor ? (
                    <Text style={[styles.activityOptionDescription, selected && styles.activityOptionDescriptionActive]}>
                        {option.descriptor}
                    </Text>
                ) : null}
            </View>
            <View style={[styles.activityOptionIndicator, selected && styles.activityOptionIndicatorActive]}>
                {selected ? <IconCheckCircle size={14} color={COLORS.readiness.prime} /> : null}
            </View>
        </TouchableOpacity>
    );

    const renderFixedSession = (session: IntakeFixedSession) => (
        <View key={session.id} style={styles.fixedSessionCard}>
            <View style={styles.fixedSessionHeader}>
                <Text style={styles.fixedSessionTitle}>{session.label || 'Fixed session'}</Text>
                <TouchableOpacity onPress={() => setFixedSessions((current) => current.filter((item) => item.id !== session.id))}>
                    <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.pillRow}>
                {SESSION_TYPE_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[styles.pill, session.activityType === option.value && styles.pillActive]}
                        onPress={() => updateFixedSession(session.id, { activityType: option.value })}
                    >
                        <Text style={[styles.pillText, session.activityType === option.value && styles.pillTextActive]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Day</Text>
            <View style={styles.pillRow}>
                {DAY_OPTIONS.map((day) => {
                    const selected = session.dayOfWeek === day.value;
                    return (
                        <TouchableOpacity
                            key={day.value}
                            style={[styles.pill, selected && styles.pillActive]}
                            onPress={() => updateFixedSession(session.id, { dayOfWeek: day.value })}
                        >
                            <Text style={[styles.pillText, selected && styles.pillTextActive]}>{day.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={[styles.inputRow, { marginTop: SPACING.md }]}>
                <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                    <Text style={styles.inputLabel}>Start</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="19:00"
                        placeholderTextColor={COLORS.text.tertiary}
                        value={session.startTime}
                        onChangeText={(value) => updateFixedSession(session.id, { startTime: value })}
                    />
                </View>
                <View style={{ width: SPACING.md }} />
                <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                    <Text style={styles.inputLabel}>Name (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Team class"
                        placeholderTextColor={COLORS.text.tertiary}
                        value={session.label}
                        onChangeText={(value) => updateFixedSession(session.id, { label: value })}
                    />
                </View>
            </View>

            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Duration</Text>
            <View style={styles.pillRow}>
                {DURATION_OPTIONS.map((minutes) => {
                    const selected = session.durationMin === minutes;
                    return (
                        <TouchableOpacity
                            key={minutes}
                            style={[styles.pill, selected && styles.pillActive]}
                            onPress={() => updateFixedSession(session.id, { durationMin: minutes })}
                        >
                            <Text style={[styles.pillText, selected && styles.pillTextActive]}>{minutes} min</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Usual effort</Text>
            <View style={styles.pillRow}>
                {INTENSITY_OPTIONS.map((option) => {
                    const selected = session.expectedIntensity === option.value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.pill, selected && styles.pillActive]}
                            onPress={() => updateFixedSession(session.id, { expectedIntensity: option.value })}
                        >
                            <Text style={[styles.pillText, selected && styles.pillTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <View style={styles.stepContent}>
                        <View style={styles.welcomeIcon}>
                            <LinearGradient
                                colors={[...GRADIENTS.prime]}
                                style={styles.welcomeIconGradient}
                            >
                                <IconCheckCircle size={48} color="#F5F5F0" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <Text style={styles.welcomeTitle}>Start simple. Build momentum.</Text>
                        <Text style={styles.welcomeSubtitle}>
                            A good coach does not hand you the whole system on day one. We will set your first week, then teach the rest as you go.
                        </Text>
                        <View style={styles.coachPointList}>
                            <View style={styles.coachPoint}>
                                <Text style={styles.coachPointTitle}>1. Baseline</Text>
                                <Text style={styles.coachPointText}>A few details to keep training and fuel targets safe.</Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <Text style={styles.coachPointTitle}>2. First week</Text>
                                <Text style={styles.coachPointText}>Realistic days, a clear goal, and any fixed boxing work.</Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <Text style={styles.coachPointTitle}>3. First wins</Text>
                                <Text style={styles.coachPointText}>Check in once, train once, and log one meal.</Text>
                            </View>
                        </View>
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Coach Intake</Text>
                        <Text style={styles.stepSubtitle}>No perfect answers needed. Start where you are.</Text>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Age</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="25"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    keyboardType="numeric"
                                    value={age}
                                    onChangeText={setAge}
                                />
                            </View>
                            <View style={{ width: SPACING.md }} />
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Current weight (lbs)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="155"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    keyboardType="decimal-pad"
                                    value={weight}
                                    onChangeText={setWeight}
                                />
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Physiology defaults</Text>
                        <View style={styles.activityOptionsList}>
                            {BIO_SEX_OPTIONS.map((option) => renderOptionCard(
                                bioSex === option.value,
                                option,
                                setBioSex,
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Training background</Text>
                        <View style={styles.activityOptionsList}>
                            {TRAINING_BACKGROUND_OPTIONS.map((option) => renderOptionCard(
                                trainingBackground === option.value,
                                option,
                                setTrainingBackground,
                            ))}
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>First Plan</Text>
                        <Text style={styles.stepSubtitle}>Pick the first direction. You can adjust it later.</Text>

                        <Text style={styles.inputLabel}>Main goal</Text>
                        <View style={styles.activityOptionsList}>
                            {MAIN_GOAL_OPTIONS.map((option) => renderOptionCard(
                                mainGoal === option.value,
                                option,
                                setMainGoal,
                            ))}
                        </View>

                        {mainGoal === 'fight_camp' ? (
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Fight date</Text>
                                <DatePickerField label="Fight Date" value={fightDate} onChange={setFightDate} />
                            </View>
                        ) : null}

                        {needsTargetWeight ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Target weight (optional)</Text>
                                <Text style={styles.helperText}>Leave this blank if you are not sure yet.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="145"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    keyboardType="decimal-pad"
                                    value={targetWeight}
                                    onChangeText={setTargetWeight}
                                />
                            </View>
                        ) : null}

                        <Text style={styles.inputLabel}>Realistic training days</Text>
                        <Text style={styles.helperText}>Pick days you can usually show up. Three is a strong start.</Text>
                        <View style={styles.pillRow}>
                            {DAY_OPTIONS.map((day) => {
                                const selected = availableDays.includes(day.value);
                                return (
                                    <TouchableOpacity
                                        key={day.value}
                                        style={[styles.pill, selected && styles.pillActive]}
                                        onPress={() => toggleAvailableDay(day.value)}
                                    >
                                        <Text style={[styles.pillText, selected && styles.pillTextActive]}>{day.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.optionalBlock}>
                            <View style={styles.optionalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Fixed boxing or sparring</Text>
                                    <Text style={styles.helperText}>Only add sessions that already happen every week.</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addSmallButton}
                                    onPress={() => setFixedSessions((current) => [
                                        ...current,
                                        createFixedSession(availableDays[0] ?? 1),
                                    ])}
                                >
                                    <Text style={styles.addSmallButtonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                            {fixedSessions.map(renderFixedSession)}
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="height"
        >
            <View style={[styles.inner, { paddingTop: insets.top + (keyboardVisible ? SPACING.sm : SPACING.lg) }]}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutButtonIcon}>
                        <IconChevronLeft size={24} color={COLORS.text.tertiary} />
                        <Text style={styles.signOutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, progressStyle]} />
                    </View>
                    <Text style={styles.stepIndicator}>{step + 1} of {TOTAL_STEPS}</Text>
                </View>

                <View style={[styles.phaseCard, keyboardVisible && styles.phaseCardKeyboard]}>
                    <Text style={styles.phaseEyebrow}>{currentStepMeta.eyebrow}</Text>
                    <Text style={styles.phaseTitle}>{currentStepMeta.title}</Text>
                    <Text style={styles.phaseDescription}>{currentStepMeta.description}</Text>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, keyboardVisible && styles.scrollContentKeyboard]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <Animated.View key={step} entering={FadeInRight.duration(ANIMATION.normal).springify()} style={{ flex: 1 }}>
                        {renderStep()}
                    </Animated.View>
                </ScrollView>

                <View
                    style={[
                        styles.navRow,
                        keyboardVisible && styles.navRowKeyboard,
                        { paddingBottom: keyboardVisible ? SPACING.xs : insets.bottom + SPACING.md },
                    ]}
                >
                    {step > 0 ? (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <IconChevronLeft size={20} color={COLORS.text.secondary} />
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View />
                    )}

                    <AnimatedPressable
                        style={[styles.nextButtonWrapper, !canProceed() && styles.nextButtonDisabled]}
                        onPress={handleNext}
                        disabled={!canProceed() || saving}
                    >
                        <LinearGradient
                            colors={canProceed() ? [...GRADIENTS.accent] : [COLORS.text.tertiary, COLORS.text.tertiary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.nextButton}
                        >
                            <Text style={styles.nextText}>
                                {saving ? 'Building...' : step === TOTAL_STEPS - 1 ? 'Build My First Week' : 'Continue'}
                            </Text>
                            {step < TOTAL_STEPS - 1 ? <IconChevronRight size={18} color="#F5F5F0" /> : null}
                        </LinearGradient>
                    </AnimatedPressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
