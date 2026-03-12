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

const TOTAL_STEPS = 6;

const STEP_META = [
    {
        eyebrow: 'Phase 1',
        title: 'Welcome',
        description: 'We will collect the basics first, then tailor training and nutrition around your athlete profile.',
    },
    {
        eyebrow: 'Phase 2',
        title: 'Body Stats',
        description: 'These numbers set your starting point for bodyweight, fueling, and weight-class planning.',
    },
    {
        eyebrow: 'Phase 3',
        title: 'Training Context',
        description: 'This tells us what kind of athlete you are and whether we should plan around a live fight date.',
    },
    {
        eyebrow: 'Phase 4',
        title: 'Biology',
        description: 'We ask this so readiness and workload guidance can reflect physiology-specific training considerations.',
    },
    {
        eyebrow: 'Phase 5',
        title: 'Fueling Setup',
        description: 'These answers shape your baseline calorie and nutrition recommendations.',
    },
    {
        eyebrow: 'Phase 6',
        title: 'Priorities',
        description: 'Share the outcome you want so recommendations can stay aligned with your current focus.',
    },
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
    const [phase, setPhase] = useState<'off-season' | 'pre-camp' | 'fight-camp'>('off-season');
    const [bioSex, setBioSex] = useState<'male' | 'female'>('male');
    const [cycleTracking, setCycleTracking] = useState(false);
    const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'>('moderate');
    const [nutritionGoal, setNutritionGoal] = useState<'maintain' | 'cut' | 'bulk'>('maintain');
    const [goals, setGoals] = useState('');
    const [fightDate, setFightDate] = useState('');
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
                phase,
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
                fight_date: fightDate || null,
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
                        <Text style={styles.stepTitle}>Training Context</Text>
                        <Text style={styles.stepSubtitle}>This tells us what environment to plan for and whether your timeline is open-ended or fight-driven.</Text>

                        <Text style={styles.inputLabel}>Fight Status</Text>
                        <Text style={styles.helperText}>Choose the level you currently compete at so training assumptions match your experience.</Text>
                        <View style={styles.pillRow}>
                            {(['amateur', 'pro'] as const).map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[styles.pill, fightStatus === status && styles.pillActive]}
                                    onPress={() => setFightStatus(status)}
                                >
                                    <Text style={[styles.pillText, fightStatus === status && styles.pillTextActive]}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Current Phase</Text>
                        <Text style={styles.helperText}>Pick the phase you are in right now so the app can shift priorities appropriately.</Text>
                        <View style={styles.pillRow}>
                            {([
                                { value: 'off-season', label: 'Off Season' },
                                { value: 'pre-camp', label: 'Pre Camp' },
                                { value: 'fight-camp', label: 'Fight Camp' },
                            ] as const).map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.pill, phase === option.value && styles.pillActive]}
                                    onPress={() => setPhase(option.value)}
                                >
                                    <Text style={[styles.pillText, phase === option.value && styles.pillTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {phase === 'fight-camp' ? (
                            <View style={{ marginTop: SPACING.lg }}>
                                <Text style={styles.inputLabel}>Fight Date</Text>
                                <Text style={styles.helperText}>Enter the date of your next fight so camp timing and weight-cut projections are built around a real deadline.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={fightDate}
                                    onChangeText={setFightDate}
                                />
                            </View>
                        ) : null}
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Biology</Text>
                        <Text style={styles.stepSubtitle}>We ask for physiology inputs only because they affect recovery, readiness, and training guidance.</Text>

                        <Text style={styles.inputLabel}>Biological Sex</Text>
                        <Text style={styles.helperText}>Used for physiology-specific planning logic. It does not change the rest of your profile experience.</Text>
                        <View style={styles.pillRow}>
                            {(['male', 'female'] as const).map((sex) => (
                                <TouchableOpacity
                                    key={sex}
                                    style={[styles.pill, bioSex === sex && styles.pillActive]}
                                    onPress={() => {
                                        setBioSex(sex);
                                        if (sex === 'male') setCycleTracking(false);
                                    }}
                                >
                                    <Text style={[styles.pillText, bioSex === sex && styles.pillTextActive]}>
                                        {sex.charAt(0).toUpperCase() + sex.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {bioSex === 'female' ? (
                            <View style={{ marginTop: SPACING.lg }}>
                                <Text style={styles.inputLabel}>Cycle Tracking</Text>
                                <Text style={styles.helperText}>Turn this on if you want readiness and workload suggestions to account for cycle phases.</Text>
                                <View style={styles.pillRow}>
                                    <TouchableOpacity
                                        style={[styles.pill, cycleTracking && styles.pillActive]}
                                        onPress={() => setCycleTracking(true)}
                                    >
                                        <Text style={[styles.pillText, cycleTracking && styles.pillTextActive]}>Enable</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.pill, !cycleTracking && styles.pillActive]}
                                        onPress={() => setCycleTracking(false)}
                                    >
                                        <Text style={[styles.pillText, !cycleTracking && styles.pillTextActive]}>Skip</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : null}
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Fueling Setup</Text>
                        <Text style={styles.stepSubtitle}>These answers define the baseline we use for calories, recovery needs, and body-composition direction.</Text>

                        <Text style={styles.inputLabel}>Activity Level</Text>
                        <Text style={styles.helperText}>Think beyond formal training: choose the option that best reflects your full-day movement and workload.</Text>
                        <View style={styles.pillRow}>
                            {([
                                { value: 'sedentary', label: 'Sedentary' },
                                { value: 'light', label: 'Light' },
                                { value: 'moderate', label: 'Moderate' },
                                { value: 'very_active', label: 'Very Active' },
                                { value: 'extra_active', label: 'Extra Active' },
                            ] as const).map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.pill, activityLevel === option.value && styles.pillActive]}
                                    onPress={() => setActivityLevel(option.value)}
                                >
                                    <Text style={[styles.pillText, activityLevel === option.value && styles.pillTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Nutrition Goal</Text>
                        <Text style={styles.helperText}>Tell us whether you want to maintain, cut, or add lean mass so targets move in the right direction.</Text>
                        <View style={styles.pillRow}>
                            {([
                                { value: 'maintain', label: 'Maintain' },
                                { value: 'cut', label: 'Cut Weight' },
                                { value: 'bulk', label: 'Lean Gain' },
                            ] as const).map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.pill, nutritionGoal === option.value && styles.pillActive]}
                                    onPress={() => setNutritionGoal(option.value)}
                                >
                                    <Text style={[styles.pillText, nutritionGoal === option.value && styles.pillTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Priorities</Text>
                        <Text style={styles.stepSubtitle}>Describe the result you want, not every detail. We use this as context for future recommendations.</Text>

                        <Text style={styles.inputLabel}>Current Priority (optional)</Text>
                        <Text style={styles.helperText}>Example: first amateur bout, move down a weight class, rebuild conditioning, or return from time off.</Text>
                        <TextInput
                            style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: SPACING.md }]}
                            placeholder="e.g. Prepare for my first amateur fight in 8 weeks"
                            placeholderTextColor={COLORS.text.tertiary}
                            multiline
                            value={goals}
                            onChangeText={setGoals}
                        />
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
