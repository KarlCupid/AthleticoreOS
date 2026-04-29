import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard, Image,
    ImageBackground,
} from 'react-native';
import Animated, { FadeInRight, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, ANIMATION } from '../theme/theme';
import { supabase } from '../../lib/supabase';
import { IconChevronLeft, IconChevronRight, IconCheckCircle } from '../components/icons';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { DatePickerField } from '../components/DatePickerField';
import { TimePickerField } from '../components/TimePickerField';
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

const ONBOARDING_BACKGROUNDS = {
    phase: require('../../assets/images/dashboard/readiness-console-bg.png'),
    welcome: require('../../assets/images/dashboard/mission-card-bg.png'),
};

const BRAND_LOGO = require('../../assets/images/athleticore-logo.png');

const STEP_META = [
    {
        eyebrow: 'Step 1',
        title: 'Starting Profile',
        description: 'Set the core inputs used for training, fuel, and recovery.',
    },
    {
        eyebrow: 'Step 2',
        title: 'Body & Training',
        description: 'Add the essentials that shape safe starting targets.',
    },
    {
        eyebrow: 'Step 3',
        title: 'Objective & Schedule',
        description: 'Choose the first objective and the days the plan can use.',
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
    { value: 'new', label: 'New to structure', descriptor: 'Lower starting load while the system learns your response.' },
    { value: 'some', label: 'Some experience', descriptor: 'Consistent training with room for guided progression.' },
    { value: 'advanced', label: 'Advanced', descriptor: 'Higher training tolerance and more structured history.' },
];

type MainGoal = BuildPhaseGoalType | 'fight_camp';

const MAIN_GOAL_OPTIONS: Array<{
    value: MainGoal;
    label: string;
    descriptor: string;
}> = [
    { value: 'conditioning', label: 'Conditioning', descriptor: 'Improve pace, output, and repeatability.' },
    { value: 'strength', label: 'Strength', descriptor: 'Build strength while managing total load.' },
    { value: 'boxing_skill', label: 'Boxing skill', descriptor: 'Protect technical work and skill rhythm.' },
    { value: 'weight_class_prep', label: 'Weight-class prep', descriptor: 'Start bodyweight prep with controlled targets.' },
    { value: 'fight_camp', label: 'Fight camp', descriptor: 'Build toward a confirmed fight date.' },
];

const SESSION_TYPE_OPTIONS: Array<{ value: IntakeFixedSessionType; label: string }> = [
    { value: 'boxing_practice', label: 'Boxing' },
    { value: 'sparring', label: 'Sparring' },
];

const DAY_DISPLAY_OPTIONS = DAY_OPTIONS.map((day) => {
    const dayNames: Record<number, string> = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
    };

    return {
        ...day,
        shortLabel: day.label,
        fullLabel: dayNames[day.value],
    };
});

const DURATION_OPTIONS = [60, 90, 120];
const INTENSITY_OPTIONS = [
    {
        value: 5,
        label: 'Easy',
        tooltip: 'Low strain. Skill work, light drilling, or a session you should recover from quickly.',
    },
    {
        value: 7,
        label: 'Solid',
        tooltip: 'Moderate-hard. Productive work with clear fatigue, but no redline finish.',
    },
    {
        value: 9,
        label: 'Hard',
        tooltip: 'High strain. Sparring, hard conditioning, or sessions that affect tomorrow.',
    },
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
    const [effortTooltipBySessionId, setEffortTooltipBySessionId] = useState<Record<string, number>>({});
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

    const renderDayGrid = (
        selectedDayValues: number[],
        onPressDay: (dayOfWeek: number) => void,
        mode: 'multi' | 'single',
    ) => (
        <View style={styles.dayGrid}>
            {DAY_DISPLAY_OPTIONS.map((day) => {
                const selected = selectedDayValues.includes(day.value);
                return (
                    <TouchableOpacity
                        key={day.value}
                        style={[styles.dayCard, selected && styles.dayCardActive]}
                        onPress={() => onPressDay(day.value)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${day.fullLabel}${selected ? ', selected' : ''}`}
                    >
                        <Text style={[styles.dayCardLabel, selected && styles.dayCardLabelActive]}>
                            {day.shortLabel}
                        </Text>
                        <Text style={[styles.dayCardCaption, selected && styles.dayCardCaptionActive]}>
                            {mode === 'multi' ? (selected ? 'On' : 'Off') : day.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

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
            const result = await completeCoachIntake({
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
            if (!result.generatedPlan) {
                setSaving(false);
                Alert.alert(
                    'Gym profile needed',
                    'Your training setup is saved. Add a gym profile next so workout plans match your equipment.',
                    [{ text: 'Continue', onPress: onComplete }],
                );
                return;
            }
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
            accessibilityRole="button"
            accessibilityState={{ selected }}
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
                {selected ? <IconCheckCircle size={14} color={COLORS.accent} /> : null}
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
            {renderDayGrid(
                [session.dayOfWeek],
                (dayOfWeek) => updateFixedSession(session.id, { dayOfWeek }),
                'single',
            )}

            <View style={[styles.inputRow, { marginTop: SPACING.md }]}>
                <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                    <Text style={styles.inputLabel}>Start</Text>
                    <TimePickerField
                        label={`${session.label || 'Fixed session'} Start`}
                        value={session.startTime}
                        onChange={(value) => updateFixedSession(session.id, { startTime: value })}
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
            <View style={styles.effortGrid}>
                {INTENSITY_OPTIONS.map((option) => {
                    const selected = session.expectedIntensity === option.value;
                    const tooltipVisible = (effortTooltipBySessionId[session.id] ?? session.expectedIntensity) === option.value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.effortCard, selected && styles.effortCardActive]}
                            onPress={() => {
                                updateFixedSession(session.id, { expectedIntensity: option.value });
                                setEffortTooltipBySessionId((current) => ({
                                    ...current,
                                    [session.id]: option.value,
                                }));
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityHint={option.tooltip}
                        >
                            <View style={styles.effortCardHeader}>
                                <Text style={[styles.effortValue, selected && styles.effortValueActive]}>
                                    {option.value}
                                </Text>
                                <View style={[styles.tooltipBadge, tooltipVisible && styles.tooltipBadgeActive]}>
                                    <Text style={[styles.tooltipBadgeText, tooltipVisible && styles.tooltipBadgeTextActive]}>
                                        ?
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.effortLabel, selected && styles.effortLabelActive]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            {INTENSITY_OPTIONS.map((option) => {
                const tooltipVisible = (effortTooltipBySessionId[session.id] ?? session.expectedIntensity) === option.value;
                return tooltipVisible ? (
                    <View key={option.value} style={styles.effortTooltip}>
                        <Text style={styles.effortTooltipTitle}>{option.label} effort</Text>
                        <Text style={styles.effortTooltipText}>{option.tooltip}</Text>
                    </View>
                ) : null;
            })}
        </View>
    );

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <View style={styles.stepContent}>
                        <ImageBackground
                            source={ONBOARDING_BACKGROUNDS.welcome}
                            style={styles.welcomePanel}
                            imageStyle={styles.welcomePanelImage}
                            resizeMode="cover"
                        >
                            <View style={styles.welcomePanelScrim} />
                            <View style={styles.welcomeHeaderRow}>
                                <View style={styles.welcomeIcon}>
                                    <Image
                                        source={BRAND_LOGO}
                                        style={styles.welcomeLogo}
                                        resizeMode="cover"
                                        accessibilityLabel="AthletiCore OS logo"
                                    />
                                </View>
                                <View style={styles.welcomeHeaderCopy}>
                                    <Text style={styles.welcomeKicker}>START PROFILE</Text>
                                    <Text style={styles.welcomeSignal}>Training foundation</Text>
                                </View>
                            </View>
                            <Text style={styles.welcomeTitle}>Set Your Training Foundation</Text>
                            <Text style={styles.welcomeSubtitle}>
                                AthletiCore starts your athlete journey here. Week one is generated from this baseline and keeps adapting as training data comes in.
                            </Text>
                        </ImageBackground>
                        <View style={styles.coachPointList}>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>1. Profile</Text>
                                <Text style={styles.coachPointText}>Age, weight, physiology, and training history.</Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>2. Objective</Text>
                                <Text style={styles.coachPointText}>One primary direction for the first training block.</Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>3. Schedule</Text>
                                <Text style={styles.coachPointText}>Available days plus fixed boxing or sparring.</Text>
                            </View>
                        </View>
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Body & Training</Text>
                        <Text style={styles.stepSubtitle}>These inputs set your first load and fuel defaults.</Text>

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
                        <Text style={styles.stepTitle}>Objective & Schedule</Text>
                        <Text style={styles.stepSubtitle}>Set the training objective, availability, and fixed sessions.</Text>

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
                                <Text style={styles.helperText}>Skip this for now if the target is not set.</Text>
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
                        <Text style={styles.helperText}>Select the days the plan can reliably use.</Text>
                        {renderDayGrid(availableDays, toggleAvailableDay, 'multi')}

                        <View style={styles.optionalBlock}>
                            <View style={styles.optionalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Fixed boxing or sparring</Text>
                                    <Text style={styles.helperText}>Add recurring sessions already on the weekly schedule.</Text>
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.inner, { paddingTop: insets.top + (keyboardVisible ? SPACING.sm : SPACING.lg) }]}>
                <View style={styles.topNav}>
                    <View style={styles.brandHeader}>
                        <Image
                            source={BRAND_LOGO}
                            style={styles.brandMarkImage}
                            resizeMode="cover"
                            accessibilityLabel="AthletiCore OS logo"
                        />
                        <View style={styles.brandTitleBlock}>
                            <Text style={styles.brandEyebrow}>ATHLETICORE OS</Text>
                            <Text style={styles.brandTitle}>Setup</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => supabase.auth.signOut()}
                        style={styles.signOutButtonIcon}
                        accessibilityRole="button"
                        testID="onboarding-sign-out"
                    >
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

                <ImageBackground
                    source={ONBOARDING_BACKGROUNDS.phase}
                    style={[styles.phaseCard, keyboardVisible && styles.phaseCardKeyboard]}
                    imageStyle={styles.phaseCardImage}
                    resizeMode="cover"
                >
                    <View style={styles.phaseCardScrim} />
                    <View style={styles.phaseHeaderRow}>
                        <View style={styles.phaseStepBadge}>
                            <Text style={styles.phaseStepBadgeText}>{step + 1}</Text>
                        </View>
                        <View style={styles.phaseHeaderCopy}>
                            <Text style={styles.phaseEyebrow}>{currentStepMeta.eyebrow}</Text>
                            <Text style={styles.phaseTitle}>{currentStepMeta.title}</Text>
                        </View>
                        <Text style={styles.phaseStepPill}>{step + 1}/{TOTAL_STEPS}</Text>
                    </View>
                    <Text style={styles.phaseDescription}>{currentStepMeta.description}</Text>
                </ImageBackground>

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
                        <TouchableOpacity style={styles.backButton} onPress={handleBack} testID="onboarding-back">
                            <IconChevronLeft size={20} color={COLORS.text.secondary} />
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View />
                    )}

                    <AnimatedPressable
                        testID={step === TOTAL_STEPS - 1 ? 'onboarding-submit' : 'onboarding-continue'}
                        style={[styles.nextButton, (!canProceed() || saving) && styles.nextButtonDisabled]}
                        onPress={handleNext}
                        disabled={!canProceed() || saving}
                    >
                        <Text style={styles.nextText}>
                            {saving ? 'Building...' : step === TOTAL_STEPS - 1 ? 'Generate First Week' : 'Continue'}
                        </Text>
                        {step < TOTAL_STEPS - 1 ? <IconChevronRight size={18} color={COLORS.text.inverse} /> : null}
                    </AnimatedPressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
