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
import { styles } from './OnboardingScreen.styles';

interface OnboardingScreenProps {
    onComplete: () => void;
}

const TOTAL_STEPS = 4;

const STEP_META = [
    {
        eyebrow: 'Phase 1',
        title: 'Welcome',
        description: 'We will collect only the inputs that actually power your training and nutrition recommendations.',
    },
    {
        eyebrow: 'Phase 2',
        title: 'Body Stats',
        description: 'These numbers set your baseline for bodyweight trends, calorie targets, and weight planning.',
    },
    {
        eyebrow: 'Phase 3',
        title: 'Athlete Profile',
        description: 'These selections control physiology and fight-context assumptions used in daily guidance.',
    },
    {
        eyebrow: 'Phase 4',
        title: 'Fueling Setup',
        description: 'This sets your baseline nutrition direction before planning setup personalizes the week.',
    },
] as const;

const ACTIVITY_LEVEL_OPTIONS = [
    { value: 'sedentary', label: 'Sedentary', descriptor: 'Mostly seated day' },
    { value: 'light', label: 'Light', descriptor: 'Easy movement most days' },
    { value: 'moderate', label: 'Moderate', descriptor: 'Regular training and an active day' },
    { value: 'very_active', label: 'Very Active', descriptor: 'Hard training and high daily movement' },
    { value: 'extra_active', label: 'Extra Active', descriptor: 'Two-a-days or very high workload' },
] as const;

const FIGHT_STATUS_OPTIONS = [
    { value: 'amateur', label: 'Amateur', descriptor: 'Building competitive experience' },
    { value: 'pro', label: 'Pro', descriptor: 'Competing at professional level' },
] as const;

const BIO_SEX_OPTIONS = [
    { value: 'male', label: 'Male', descriptor: 'Uses male physiology defaults' },
    { value: 'female', label: 'Female', descriptor: 'Supports cycle-aware readiness options' },
] as const;

const CYCLE_TRACKING_OPTIONS = [
    { value: true, label: 'Enable', descriptor: 'Use cycle phases in readiness guidance' },
    { value: false, label: 'Skip', descriptor: 'Use standard readiness guidance only' },
] as const;

const NUTRITION_GOAL_OPTIONS = [
    { value: 'maintain', label: 'Maintain', descriptor: 'Hold bodyweight while fueling performance' },
    { value: 'cut', label: 'Cut Weight', descriptor: 'Reduce bodyweight with controlled deficit' },
    { value: 'bulk', label: 'Lean Gain', descriptor: 'Add size and strength with surplus' },
] as const;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const [name, setName] = useState('');
    const [heightFeet, setHeightFeet] = useState('');
    const [heightInches, setHeightInches] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [targetWeight, setTargetWeight] = useState('');
    const [fightStatus, setFightStatus] = useState<'amateur' | 'pro'>('amateur');
    const [bioSex, setBioSex] = useState<'male' | 'female'>('male');
    const [cycleTracking, setCycleTracking] = useState(false);
    const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'>('moderate');
    const [nutritionGoal, setNutritionGoal] = useState<'maintain' | 'cut' | 'bulk'>('maintain');
    const [saving, setSaving] = useState(false);

    const currentStepMeta = STEP_META[step];

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
                return weight.trim().length > 0;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS - 1) {
            setStep((current) => current + 1);
            return;
        }

        handleComplete();
    };

    const handleBack = () => {
        if (step > 0) {
            setStep((current) => current - 1);
        }
    };

    const progressStyle = useAnimatedStyle(() => ({
        width: withTiming(`${((step + 1) / TOTAL_STEPS) * 100}%`, { duration: 400 }),
    }));

    const handleComplete = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('Not authenticated');

            const totalInches = heightFeet || heightInches
                ? (parseInt(heightFeet, 10) || 0) * 12 + (parseInt(heightInches, 10) || 0)
                : null;

            const { error } = await supabase.from('athlete_profiles').insert({
                user_id: session.user.id,
                biological_sex: bioSex,
                fight_status: fightStatus,
                phase: 'off-season',
                target_weight: targetWeight ? parseFloat(targetWeight) : null,
                base_weight: weight ? parseFloat(weight) : null,
                cycle_tracking: cycleTracking,
                height_inches: totalInches,
                age: age ? parseInt(age, 10) : null,
                activity_level: activityLevel,
                nutrition_goal: nutritionGoal,
                athlete_goal_mode: 'build_phase',
                performance_goal_type: 'conditioning',
                planning_setup_version: 0,
                fight_date: null,
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                onComplete();
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not save profile.');
        }
        setSaving(false);
    };

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
                                <IconCheckCircle size={48} color="#FFF" strokeWidth={2} />
                            </LinearGradient>
                        </View>
                        <Text style={styles.welcomeTitle}>Welcome to Athleticore</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Setup happens in short phases. Each one explains what we need and why it matters before you move on.
                        </Text>
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Body Stats</Text>
                        <Text style={styles.stepSubtitle}>We use these numbers to anchor bodyweight trends, nutrition targets, and weight-class recommendations.</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Name (optional)</Text>
                            <Text style={styles.helperText}>Only used to personalize the experience inside your profile.</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Your name"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Height (optional)</Text>
                                <Text style={styles.helperText}>Helps improve calorie estimates and body-composition context.</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="ft"
                                        placeholderTextColor={COLORS.text.tertiary}
                                        keyboardType="numeric"
                                        value={heightFeet}
                                        onChangeText={setHeightFeet}
                                    />
                                    <View style={{ width: SPACING.sm }} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="in"
                                        placeholderTextColor={COLORS.text.tertiary}
                                        keyboardType="numeric"
                                        value={heightInches}
                                        onChangeText={setHeightInches}
                                    />
                                </View>
                            </View>
                            <View style={{ width: SPACING.md }} />
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Age (optional)</Text>
                                <Text style={styles.helperText}>Used to tune recovery and workload assumptions.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="25"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    keyboardType="numeric"
                                    value={age}
                                    onChangeText={setAge}
                                />
                            </View>
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Body Weight (lbs)</Text>
                                <Text style={styles.helperText}>Your current walk-around weight. This is required.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="155"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    keyboardType="numeric"
                                    value={weight}
                                    onChangeText={setWeight}
                                />
                            </View>
                            <View style={{ width: SPACING.md }} />
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.inputLabel}>Target Weight (optional)</Text>
                                <Text style={styles.helperText}>The division or performance weight you want to work toward.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="145"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    keyboardType="numeric"
                                    value={targetWeight}
                                    onChangeText={setTargetWeight}
                                />
                            </View>
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Athlete Profile</Text>
                        <Text style={styles.stepSubtitle}>These settings influence readiness, recovery assumptions, and fight-specific safety guidance.</Text>

                        <Text style={styles.inputLabel}>Fight Status</Text>
                        <Text style={styles.helperText}>Choose the level you currently compete at so training assumptions match your experience.</Text>
                        <View style={styles.activityOptionsList}>
                            {FIGHT_STATUS_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.activityOptionCard, fightStatus === option.value && styles.activityOptionCardActive]}
                                    onPress={() => setFightStatus(option.value)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.activityOptionCopy}>
                                        <Text style={[styles.activityOptionTitle, fightStatus === option.value && styles.activityOptionTitleActive]}>
                                            {option.label}
                                        </Text>
                                        <Text style={[styles.activityOptionDescription, fightStatus === option.value && styles.activityOptionDescriptionActive]}>
                                            {option.descriptor}
                                        </Text>
                                    </View>
                                    <View style={[styles.activityOptionIndicator, fightStatus === option.value && styles.activityOptionIndicatorActive]}>
                                        {fightStatus === option.value ? (
                                            <IconCheckCircle size={14} color={COLORS.readiness.prime} />
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Biological Sex</Text>
                        <Text style={styles.helperText}>Used for physiology-specific planning logic. It does not change the rest of your profile experience.</Text>
                        <View style={styles.activityOptionsList}>
                            {BIO_SEX_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.activityOptionCard, bioSex === option.value && styles.activityOptionCardActive]}
                                    onPress={() => {
                                        setBioSex(option.value);
                                        if (option.value === 'male') setCycleTracking(false);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.activityOptionCopy}>
                                        <Text style={[styles.activityOptionTitle, bioSex === option.value && styles.activityOptionTitleActive]}>
                                            {option.label}
                                        </Text>
                                        <Text style={[styles.activityOptionDescription, bioSex === option.value && styles.activityOptionDescriptionActive]}>
                                            {option.descriptor}
                                        </Text>
                                    </View>
                                    <View style={[styles.activityOptionIndicator, bioSex === option.value && styles.activityOptionIndicatorActive]}>
                                        {bioSex === option.value ? (
                                            <IconCheckCircle size={14} color={COLORS.readiness.prime} />
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {bioSex === 'female' ? (
                            <View style={{ marginTop: SPACING.lg }}>
                                <Text style={styles.inputLabel}>Cycle Tracking</Text>
                                <Text style={styles.helperText}>Turn this on if you want readiness and workload suggestions to account for cycle phases.</Text>
                                <View style={styles.activityOptionsList}>
                                    {CYCLE_TRACKING_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.label}
                                            style={[styles.activityOptionCard, cycleTracking === option.value && styles.activityOptionCardActive]}
                                            onPress={() => setCycleTracking(option.value)}
                                            activeOpacity={0.85}
                                        >
                                            <View style={styles.activityOptionCopy}>
                                                <Text style={[styles.activityOptionTitle, cycleTracking === option.value && styles.activityOptionTitleActive]}>
                                                    {option.label}
                                                </Text>
                                                <Text style={[styles.activityOptionDescription, cycleTracking === option.value && styles.activityOptionDescriptionActive]}>
                                                    {option.descriptor}
                                                </Text>
                                            </View>
                                            <View style={[styles.activityOptionIndicator, cycleTracking === option.value && styles.activityOptionIndicatorActive]}>
                                                {cycleTracking === option.value ? (
                                                    <IconCheckCircle size={14} color={COLORS.readiness.prime} />
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : null}
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Fueling Setup</Text>
                        <Text style={styles.stepSubtitle}>These answers define the baseline we use for calories, recovery needs, and body-composition direction.</Text>

                        <Text style={styles.inputLabel}>Activity Level</Text>
                        <Text style={styles.helperText}>Think beyond formal training and choose the option that best matches your full-day workload.</Text>
                        <View style={styles.activityOptionsList}>
                            {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.activityOptionCard, activityLevel === option.value && styles.activityOptionCardActive]}
                                    onPress={() => setActivityLevel(option.value)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.activityOptionCopy}>
                                        <Text style={[styles.activityOptionTitle, activityLevel === option.value && styles.activityOptionTitleActive]}>
                                            {option.label}
                                        </Text>
                                        <Text style={[styles.activityOptionDescription, activityLevel === option.value && styles.activityOptionDescriptionActive]}>
                                            {option.descriptor}
                                        </Text>
                                    </View>
                                    <View style={[styles.activityOptionIndicator, activityLevel === option.value && styles.activityOptionIndicatorActive]}>
                                        {activityLevel === option.value ? (
                                            <IconCheckCircle size={14} color={COLORS.readiness.prime} />
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Nutrition Goal</Text>
                        <Text style={styles.helperText}>Tell us whether you want to maintain, cut, or add lean mass so targets move in the right direction.</Text>
                        <View style={styles.activityOptionsList}>
                            {NUTRITION_GOAL_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.activityOptionCard, nutritionGoal === option.value && styles.activityOptionCardActive]}
                                    onPress={() => setNutritionGoal(option.value)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.activityOptionCopy}>
                                        <Text style={[styles.activityOptionTitle, nutritionGoal === option.value && styles.activityOptionTitleActive]}>
                                            {option.label}
                                        </Text>
                                        <Text style={[styles.activityOptionDescription, nutritionGoal === option.value && styles.activityOptionDescriptionActive]}>
                                            {option.descriptor}
                                        </Text>
                                    </View>
                                    <View style={[styles.activityOptionIndicator, nutritionGoal === option.value && styles.activityOptionIndicatorActive]}>
                                        {nutritionGoal === option.value ? (
                                            <IconCheckCircle size={14} color={COLORS.readiness.prime} />
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            ))}
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
                                {saving ? 'Saving...' : step === TOTAL_STEPS - 1 ? 'Finish Profile' : 'Continue'}
                            </Text>
                            {step < TOTAL_STEPS - 1 ? <IconChevronRight size={18} color="#FFF" /> : null}
                        </LinearGradient>
                    </AnimatedPressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
