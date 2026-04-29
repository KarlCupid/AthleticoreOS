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
    type IntakeFightStatus,
    type IntakeFixedSession,
    type IntakeFixedSessionType,
    type IntakeFuelingPreference,
    type IntakeJourneyState,
    type IntakePainConcern,
    type IntakeReadinessBaseline,
    type IntakeTrainingBackground,
    type IntakeTrainingStatus,
} from './onboarding/completeCoachIntake';
import { styles } from './OnboardingScreen.styles';

interface OnboardingScreenProps {
    onComplete: () => void;
}

const TOTAL_STEPS = 6;

const ONBOARDING_BACKGROUNDS = {
    phase: require('../../assets/images/dashboard/readiness-console-bg.png'),
    welcome: require('../../assets/images/dashboard/mission-card-bg.png'),
};

const BRAND_LOGO = require('../../assets/images/athleticore-logo.png');

const STEP_META = [
    {
        eyebrow: 'Step 1',
        title: 'Welcome',
        description: 'Set the starting point for a continuous athlete journey.',
    },
    {
        eyebrow: 'Step 2',
        title: 'Athlete Basics',
        description: 'Confirm the sport, training level, goal, and current rhythm.',
    },
    {
        eyebrow: 'Step 3',
        title: 'Journey & Fight',
        description: 'Tell Athleticore where you are in the fight timeline.',
    },
    {
        eyebrow: 'Step 4',
        title: 'Anchors',
        description: 'Add fixed sessions and the days the plan can really use.',
    },
    {
        eyebrow: 'Step 5',
        title: 'Fuel & Readiness',
        description: 'Add lightweight safety context without overloading setup.',
    },
    {
        eyebrow: 'Step 6',
        title: "Today's Mission",
        description: 'Start with the daily coaching surface, not a generic dashboard.',
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
    { value: 'new', label: 'New to structure', descriptor: 'Lower starting load while Athleticore learns your response.' },
    { value: 'some', label: 'Some experience', descriptor: 'Consistent training with room for guided progression.' },
    { value: 'advanced', label: 'Advanced', descriptor: 'Higher training tolerance and more structured history.' },
];

const TRAINING_STATUS_OPTIONS: Array<{
    value: IntakeTrainingStatus;
    label: string;
    descriptor: string;
}> = [
    { value: 'consistent', label: 'Consistent now', descriptor: 'Training has a current rhythm Athleticore can build around.' },
    { value: 'inconsistent', label: 'Inconsistent lately', descriptor: 'The first mission should stay realistic while rhythm returns.' },
    { value: 'returning', label: 'Returning', descriptor: 'Recovery and load progression need a little more caution.' },
    { value: 'new_rhythm', label: 'New routine', descriptor: 'Start simple and let the plan learn from check-ins.' },
];

type MainGoal = BuildPhaseGoalType;

const MAIN_GOAL_OPTIONS: Array<{
    value: MainGoal;
    label: string;
    descriptor: string;
}> = [
    { value: 'conditioning', label: 'Conditioning', descriptor: 'Improve pace, output, and repeatability.' },
    { value: 'strength', label: 'Strength', descriptor: 'Build strength while managing total load.' },
    { value: 'boxing_skill', label: 'Boxing skill', descriptor: 'Protect technical work and skill rhythm.' },
    { value: 'weight_class_prep', label: 'Weight-class prep', descriptor: 'Keep body-mass context safety-first and gradual.' },
];

const JOURNEY_STATE_OPTIONS: Array<{
    value: IntakeJourneyState;
    label: string;
    descriptor: string;
}> = [
    { value: 'building', label: 'Building', descriptor: 'No immediate camp pressure. Build capacity and skill.' },
    { value: 'in_camp', label: 'In camp', descriptor: 'A confirmed fight is shaping training, fuel, and recovery.' },
    { value: 'fight_coming', label: 'Fight coming up', descriptor: 'Capture what is known and Athleticore will adapt around it.' },
    { value: 'recovering', label: 'Recovering', descriptor: 'Keep the first mission controlled while you absorb the work.' },
    { value: 'not_sure', label: 'Not sure', descriptor: 'Athleticore can recommend a starting point from your context.' },
];

const FIGHT_STATUS_OPTIONS: Array<{
    value: IntakeFightStatus;
    label: string;
    descriptor: string;
}> = [
    { value: 'none', label: 'No fight yet', descriptor: "No fight on the calendar? That's fine. Athleticore will help you build." },
    { value: 'tentative', label: 'Tentative fight', descriptor: 'Add what you know without forcing camp language too early.' },
    { value: 'confirmed', label: 'Confirmed fight', descriptor: 'Use the date to shape camp, fuel, recovery, and body-mass context.' },
];

const SESSION_TYPE_OPTIONS: Array<{ value: IntakeFixedSessionType; label: string }> = [
    { value: 'boxing_practice', label: 'Boxing' },
    { value: 'sparring', label: 'Sparring' },
    { value: 'conditioning', label: 'Conditioning' },
    { value: 'sc', label: 'Strength' },
    { value: 'other', label: 'Other' },
];

const FUELING_OPTIONS: Array<{
    value: IntakeFuelingPreference;
    label: string;
    descriptor: string;
}> = [
    { value: 'simple', label: 'Simple guidance', descriptor: 'Start with practical fueling prompts around training.' },
    { value: 'detailed', label: 'More detail', descriptor: 'Use food notes and preferences to sharpen guidance earlier.' },
    { value: 'later', label: 'Ask me later', descriptor: 'Keep fueling cautious and collect more context on Today.' },
];

const PAIN_OPTIONS: Array<{
    value: IntakePainConcern;
    label: string;
    descriptor: string;
}> = [
    { value: 'unknown', label: 'Skip for now', descriptor: 'Athleticore will treat pain context as unknown.' },
    { value: 'none', label: 'No concern', descriptor: 'No current pain or injury concern to account for.' },
    { value: 'some', label: 'Some concern', descriptor: 'The first mission should protect this and avoid guessing.' },
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

const BASELINE_SCALE_OPTIONS = [
    { value: null, label: 'Skip' },
    { value: 1, label: 'Low' },
    { value: 3, label: 'Okay' },
    { value: 5, label: 'High' },
] as const;

function parsePositiveNumber(value: string): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function splitNotes(value: string): string[] {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
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

function defaultSessionLabel(activityType: IntakeFixedSessionType): string {
    switch (activityType) {
        case 'sparring':
            return 'Sparring';
        case 'sc':
            return 'Strength';
        case 'conditioning':
            return 'Conditioning';
        case 'other':
            return 'Fixed session';
        case 'boxing_practice':
        default:
            return 'Boxing';
    }
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [bioSex, setBioSex] = useState<'male' | 'female'>('male');
    const [trainingBackground, setTrainingBackground] = useState<IntakeTrainingBackground>('new');
    const [trainingStatus, setTrainingStatus] = useState<IntakeTrainingStatus>('consistent');
    const [mainGoal, setMainGoal] = useState<MainGoal>('conditioning');
    const [journeyState, setJourneyState] = useState<IntakeJourneyState>('not_sure');
    const [fightStatus, setFightStatus] = useState<IntakeFightStatus>('none');
    const [knowsFightDate, setKnowsFightDate] = useState(false);
    const [knowsWeighIn, setKnowsWeighIn] = useState(false);
    const [targetWeight, setTargetWeight] = useState('');
    const [targetWeightClassName, setTargetWeightClassName] = useState('');
    const [opponentName, setOpponentName] = useState('');
    const [eventName, setEventName] = useState('');
    const [fightDate, setFightDate] = useState(addDays(todayLocalDate(), 84));
    const [weighInDate, setWeighInDate] = useState(addDays(todayLocalDate(), 83));
    const [weighInTime, setWeighInTime] = useState('18:00');
    const [availableDays, setAvailableDays] = useState<number[]>([1, 3, 5]);
    const [fixedSessions, setFixedSessions] = useState<IntakeFixedSession[]>([]);
    const [fuelingPreference, setFuelingPreference] = useState<IntakeFuelingPreference>('simple');
    const [dietaryNotes, setDietaryNotes] = useState('');
    const [sleepQuality, setSleepQuality] = useState<number | null>(null);
    const [recoveryBaseline, setRecoveryBaseline] = useState<number | null>(null);
    const [sorenessBaseline, setSorenessBaseline] = useState<number | null>(null);
    const [fatigueBaseline, setFatigueBaseline] = useState<number | null>(null);
    const [painConcern, setPainConcern] = useState<IntakePainConcern>('unknown');
    const [injuryNotes, setInjuryNotes] = useState('');
    const [effortTooltipBySessionId, setEffortTooltipBySessionId] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);

    const currentStepMeta = STEP_META[step];
    const shouldAskBodyMassContext = mainGoal === 'weight_class_prep'
        || fightStatus !== 'none'
        || Boolean(targetWeight.trim() || targetWeightClassName.trim());
    const fightDateWillBeSaved = fightStatus === 'confirmed' || (fightStatus === 'tentative' && knowsFightDate);

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
            case 2:
                return fightStatus !== 'confirmed' || Boolean(fightDate);
            case 3:
                return availableDays.length > 0;
            default:
                return true;
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

    const handleFightStatusChange = (value: IntakeFightStatus) => {
        setFightStatus(value);
        if (value === 'confirmed') {
            setKnowsFightDate(true);
            if (journeyState === 'not_sure' || journeyState === 'building') {
                setJourneyState('fight_coming');
            }
        }
        if (value === 'none') {
            setKnowsFightDate(false);
            setKnowsWeighIn(false);
        }
    };

    const resolveGoalMode = (): AthleteGoalMode => (
        fightStatus === 'confirmed' && fightDateWillBeSaved ? 'fight_camp' : 'build_phase'
    );

    const handleComplete = async () => {
        const parsedAge = age.trim() ? parsePositiveNumber(age) : null;
        const parsedWeight = weight.trim() ? parsePositiveNumber(weight) : null;
        const parsedTargetWeight = targetWeight.trim() ? parsePositiveNumber(targetWeight) : null;

        if (age.trim() && parsedAge == null) {
            Alert.alert('Check age', 'Age should be a number, or leave it blank for now.');
            return;
        }

        if (weight.trim() && parsedWeight == null) {
            Alert.alert('Check current weight', 'Current weight should be a number, or leave it blank for now.');
            return;
        }

        if (targetWeight.trim() && parsedTargetWeight == null) {
            Alert.alert('Check target', 'Target body mass should be a number, or leave it blank for now.');
            return;
        }

        if (availableDays.length === 0) {
            Alert.alert('Training days needed', 'Pick at least one day the plan can actually use.');
            return;
        }

        if (fightStatus === 'confirmed' && !fightDate) {
            Alert.alert('Fight date needed', 'Add the fight date so Athleticore can shape camp around the timeline.');
            return;
        }

        const invalidSession = fixedSessions.find((session) => !isValidTime(session.startTime));
        if (invalidSession) {
            Alert.alert('Check fixed session', 'Use a start time like 18:30.');
            return;
        }

        const goalMode = resolveGoalMode();
        const readinessBaseline: IntakeReadinessBaseline = {
            sleepQuality,
            recovery: recoveryBaseline,
            soreness: sorenessBaseline,
            fatigue: fatigueBaseline,
            painConcern,
            injuryNotes: injuryNotes.trim() || null,
        };

        setSaving(true);
        try {
            const result = await completeCoachIntake({
                age: parsedAge,
                currentWeightLbs: parsedWeight,
                biologicalSex: bioSex,
                trainingBackground,
                sport: 'boxing',
                currentTrainingStatus: trainingStatus,
                journeyState,
                fightStatus,
                goalMode,
                buildGoalType: mainGoal,
                fightDate: fightDateWillBeSaved ? fightDate : null,
                weighInDate: knowsWeighIn ? weighInDate : null,
                weighInTime: knowsWeighIn ? weighInTime : null,
                targetWeightClassName: targetWeightClassName.trim() || null,
                opponentName: opponentName.trim() || null,
                eventName: eventName.trim() || null,
                targetWeightLbs: parsedTargetWeight,
                availableDays,
                fixedSessions,
                dietaryNotes: splitNotes(dietaryNotes),
                fuelingPreference,
                readinessBaseline,
            });
            if (!result.generatedPlan) {
                setSaving(false);
                Alert.alert(
                    'Gym profile needed',
                    "Your athlete baseline is saved. Today's Mission will stay cautious until equipment context is added.",
                    [{ text: 'Continue', onPress: onComplete }],
                );
                return;
            }
            onComplete();
        } catch (err: any) {
            Alert.alert('Could not build your first mission', err.message || 'Please try again.');
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

    const renderScale = (
        label: string,
        value: number | null,
        onPress: (value: number | null) => void,
    ) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.pillRow}>
                {BASELINE_SCALE_OPTIONS.map((option) => {
                    const selected = value === option.value;
                    return (
                        <TouchableOpacity
                            key={`${label}-${option.label}`}
                            style={[styles.pill, selected && styles.pillActive]}
                            onPress={() => onPress(option.value)}
                        >
                            <Text style={[styles.pillText, selected && styles.pillTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderFixedSession = (session: IntakeFixedSession) => (
        <View key={session.id} style={styles.fixedSessionCard}>
            <View style={styles.fixedSessionHeader}>
                <Text style={styles.fixedSessionTitle}>{session.label || defaultSessionLabel(session.activityType)}</Text>
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
                                        accessibilityLabel="Athleticore OS logo"
                                    />
                                </View>
                                <View style={styles.welcomeHeaderCopy}>
                                    <Text style={styles.welcomeKicker}>ATHLETE JOURNEY</Text>
                                    <Text style={styles.welcomeSignal}>Coach in your corner</Text>
                                </View>
                            </View>
                            <Text style={styles.welcomeTitle}>Welcome to Athleticore.</Text>
                            <Text style={styles.welcomeSubtitle}>
                                We'll help you train, fuel, recover, and adapt around your real fight timeline.
                            </Text>
                        </ImageBackground>
                        <View style={styles.coachPointList}>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>Continuous journey</Text>
                                <Text style={styles.coachPointText}>
                                    Build phases, camp, recovery, and fight changes update the same athlete context.
                                </Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>Protected anchors</Text>
                                <Text style={styles.coachPointText}>
                                    Fixed boxing work stays anchored. Supporting work moves around it.
                                </Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>Today first</Text>
                                <Text style={styles.coachPointText}>
                                    The walkthrough ends with Today's Mission: what matters, why it matters, and what to do next.
                                </Text>
                            </View>
                        </View>
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Start with where you are now</Text>
                        <Text style={styles.stepSubtitle}>
                            Athleticore uses this to shape the first mission without pretending it knows your full history yet.
                        </Text>

                        <Text style={styles.inputLabel}>Sport</Text>
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, styles.pillActive]}>
                                <Text style={[styles.pillText, styles.pillTextActive]}>Boxing</Text>
                            </View>
                        </View>
                        <Text style={styles.helperText}>Multi-sport support can come later. This setup is boxing-first.</Text>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Age (optional)</Text>
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
                                <Text style={styles.inputLabel}>Current weight (optional)</Text>
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

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Experience level</Text>
                        <View style={styles.activityOptionsList}>
                            {TRAINING_BACKGROUND_OPTIONS.map((option) => renderOptionCard(
                                trainingBackground === option.value,
                                option,
                                setTrainingBackground,
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Current goal</Text>
                        <View style={styles.activityOptionsList}>
                            {MAIN_GOAL_OPTIONS.map((option) => renderOptionCard(
                                mainGoal === option.value,
                                option,
                                setMainGoal,
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Training status</Text>
                        <View style={styles.activityOptionsList}>
                            {TRAINING_STATUS_OPTIONS.map((option) => renderOptionCard(
                                trainingStatus === option.value,
                                option,
                                setTrainingStatus,
                            ))}
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Where are you in the journey?</Text>
                        <Text style={styles.stepSubtitle}>
                            Phase changes are transitions, not restarts. If you are not sure, Athleticore can start conservatively.
                        </Text>

                        <Text style={styles.inputLabel}>Current journey state</Text>
                        <View style={styles.activityOptionsList}>
                            {JOURNEY_STATE_OPTIONS.map((option) => renderOptionCard(
                                journeyState === option.value,
                                option,
                                setJourneyState,
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Fight context</Text>
                        <View style={styles.activityOptionsList}>
                            {FIGHT_STATUS_OPTIONS.map((option) => renderOptionCard(
                                fightStatus === option.value,
                                option,
                                handleFightStatusChange,
                            ))}
                        </View>

                        {fightStatus !== 'none' ? (
                            <View style={styles.optionalBlock}>
                                <Text style={styles.inputLabel}>Fight details</Text>
                                <Text style={styles.helperText}>
                                    Fight details can change. Athleticore will adapt without throwing away what it already knows.
                                </Text>
                                {fightStatus === 'tentative' ? (
                                    <View style={styles.pillRow}>
                                        <TouchableOpacity
                                            style={[styles.pill, knowsFightDate && styles.pillActive]}
                                            onPress={() => setKnowsFightDate((current) => !current)}
                                        >
                                            <Text style={[styles.pillText, knowsFightDate && styles.pillTextActive]}>
                                                {knowsFightDate ? 'Date known' : 'Add date'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                {fightDateWillBeSaved ? (
                                    <View style={[styles.inputGroup, { marginTop: SPACING.md }]}>
                                        <Text style={styles.inputLabel}>Fight date</Text>
                                        <DatePickerField label="Fight Date" value={fightDate} onChange={setFightDate} />
                                    </View>
                                ) : null}

                                <View style={styles.inputRow}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>Weight class (optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Lightweight"
                                            placeholderTextColor={COLORS.text.tertiary}
                                            value={targetWeightClassName}
                                            onChangeText={setTargetWeightClassName}
                                        />
                                    </View>
                                    <View style={{ width: SPACING.md }} />
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>Target body mass</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="145"
                                            placeholderTextColor={COLORS.text.tertiary}
                                            keyboardType="decimal-pad"
                                            value={targetWeight}
                                            onChangeText={setTargetWeight}
                                        />
                                    </View>
                                </View>

                                <Text style={styles.helperText}>
                                    Athleticore checks whether a target looks realistic while protecting performance.
                                </Text>

                                <View style={styles.pillRow}>
                                    <TouchableOpacity
                                        style={[styles.pill, knowsWeighIn && styles.pillActive]}
                                        onPress={() => setKnowsWeighIn((current) => !current)}
                                    >
                                        <Text style={[styles.pillText, knowsWeighIn && styles.pillTextActive]}>
                                            {knowsWeighIn ? 'Weigh-in added' : 'Add weigh-in'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {knowsWeighIn ? (
                                    <View style={[styles.inputRow, { marginTop: SPACING.md }]}>
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.inputLabel}>Weigh-in date</Text>
                                            <DatePickerField label="Weigh-in Date" value={weighInDate} onChange={setWeighInDate} />
                                        </View>
                                        <View style={{ width: SPACING.md }} />
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.inputLabel}>Weigh-in time</Text>
                                            <TimePickerField label="Weigh-in Time" value={weighInTime} onChange={setWeighInTime} />
                                        </View>
                                    </View>
                                ) : null}

                                <View style={styles.inputRow}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>Opponent (optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Name"
                                            placeholderTextColor={COLORS.text.tertiary}
                                            value={opponentName}
                                            onChangeText={setOpponentName}
                                        />
                                    </View>
                                    <View style={{ width: SPACING.md }} />
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.inputLabel}>Event (optional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Event"
                                            placeholderTextColor={COLORS.text.tertiary}
                                            value={eventName}
                                            onChangeText={setEventName}
                                        />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>No fight yet</Text>
                                <Text style={styles.coachPointText}>
                                    No fight on the calendar? That's fine. Athleticore will help you build so you're ready when the next opportunity shows up.
                                </Text>
                            </View>
                        )}
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Protect the work that cannot move</Text>
                        <Text style={styles.stepSubtitle}>
                            Some sessions are non-negotiable. Add sparring, team training, or fixed sessions here, and Athleticore will build around them.
                        </Text>

                        <Text style={styles.inputLabel}>Realistic training days</Text>
                        <Text style={styles.helperText}>Pick the days the plan can actually use. Honest availability beats an ideal week you cannot repeat.</Text>
                        {renderDayGrid(availableDays, toggleAvailableDay, 'multi')}

                        <View style={styles.optionalBlock}>
                            <View style={styles.optionalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Protected workouts</Text>
                                    <Text style={styles.helperText}>Add sparring, team training, coached sessions, fixed classes, or recurring workouts.</Text>
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
                            {fixedSessions.length === 0 ? (
                                <Text style={styles.helperText}>Optional. You can skip this and add anchors later.</Text>
                            ) : null}
                            {fixedSessions.map(renderFixedSession)}
                        </View>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Fuel and readiness baseline</Text>
                        <Text style={styles.stepSubtitle}>
                            Recovery is part of the work. Athleticore will help you know when to push and when to absorb the training.
                        </Text>

                        <Text style={styles.inputLabel}>Fueling basics</Text>
                        <Text style={styles.helperText}>Fueling helps Athleticore match your training, recovery, and fight timeline.</Text>
                        <View style={styles.activityOptionsList}>
                            {FUELING_OPTIONS.map((option) => renderOptionCard(
                                fuelingPreference === option.value,
                                option,
                                setFuelingPreference,
                            ))}
                        </View>

                        <View style={[styles.inputGroup, { marginTop: SPACING.lg }]}>
                            <Text style={styles.inputLabel}>Dietary preferences or restrictions (optional)</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 84, textAlignVertical: 'top' }]}
                                placeholder="Example: vegetarian, lactose sensitive"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={dietaryNotes}
                                onChangeText={setDietaryNotes}
                                multiline
                            />
                        </View>

                        {shouldAskBodyMassContext ? (
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>Body-mass safety</Text>
                                <Text style={styles.coachPointText}>
                                    Athleticore checks whether a target looks realistic while protecting performance. Missing body-mass context stays unknown and keeps confidence lower.
                                </Text>
                            </View>
                        ) : null}

                        {renderScale('Sleep/recovery', sleepQuality, setSleepQuality)}
                        {renderScale('Overall readiness', recoveryBaseline, setRecoveryBaseline)}
                        {renderScale('Soreness', sorenessBaseline, setSorenessBaseline)}
                        {renderScale('Fatigue', fatigueBaseline, setFatigueBaseline)}

                        <Text style={styles.inputLabel}>Pain or injury concern</Text>
                        <View style={styles.activityOptionsList}>
                            {PAIN_OPTIONS.map((option) => renderOptionCard(
                                painConcern === option.value,
                                option,
                                setPainConcern,
                            ))}
                        </View>

                        <View style={[styles.inputGroup, { marginTop: SPACING.lg }]}>
                            <Text style={styles.inputLabel}>Notes for Athleticore (optional)</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 84, textAlignVertical: 'top' }]}
                                placeholder="Shoulder has been irritated, coming back from illness"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={injuryNotes}
                                onChangeText={setInjuryNotes}
                                multiline
                            />
                        </View>
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Build your first mission</Text>
                        <Text style={styles.stepSubtitle}>
                            Each day, Athleticore gives you a mission: what matters today, why it matters, what changed, and what to do next.
                        </Text>

                        <View style={styles.coachPointList}>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>Training guidance</Text>
                                <Text style={styles.coachPointText}>
                                    Training starts with what matters most today, then adapts around readiness, anchors, and the week ahead.
                                </Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>Fueling guidance</Text>
                                <Text style={styles.coachPointText}>
                                    Fueling targets move with the work. Athleticore uses training demand, recovery, and safety context to guide the day.
                                </Text>
                            </View>
                            <View style={styles.coachPoint}>
                                <View style={styles.coachPointRail} />
                                <Text style={styles.coachPointTitle}>Low-confidence guidance</Text>
                                <Text style={styles.coachPointText}>
                                    If data is limited, Athleticore will stay calm, ask for the smallest useful check-in, and avoid treating unknowns as safe.
                                </Text>
                            </View>
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
                            accessibilityLabel="Athleticore OS logo"
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
                            {saving ? 'Building...' : step === TOTAL_STEPS - 1 ? 'Build my first mission' : 'Continue'}
                        </Text>
                        {step < TOTAL_STEPS - 1 ? <IconChevronRight size={18} color={COLORS.text.inverse} /> : null}
                    </AnimatedPressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
