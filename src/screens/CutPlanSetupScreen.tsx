import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../lib/supabase';
import { createWeightCutPlan } from '../../lib/api/weightCutService';
import { getEffectiveWeight } from '../../lib/api/weightService';
import { generateCutPlan } from '../../lib/engine/calculateWeightCut';
import type { CutPlanResult, CutSport, FightStatus } from '../../lib/engine/types';
import { formatLocalDate } from '../../lib/utils/date';
import { CutPlanPreviewStep } from '../components/CutPlanPreviewStep';
import { DatePickerField } from '../components/DatePickerField';
import { IconCheckCircle, IconChevronLeft } from '../components/icons';
import { APP_IMPACTS, CUT_PHASES } from '../constants/cutPlanSetup';
import type { FuelStackParamList } from '../navigation/types';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';
import { styles } from './CutPlanSetupScreen.styles';

type NavProp = NativeStackNavigationProp<FuelStackParamList, 'CutPlanSetup'>;
type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  targetWeight: string;
  weightClassName: string;
  sport: CutSport;
  fightDate: string;
  weighInDate: string;
  coachNotes: string;
  startWeightStr: string;
}

interface AthleteProfileSnapshot {
  sport?: CutSport | null;
  fight_status?: FightStatus | null;
  biological_sex?: 'male' | 'female' | null;
}

const HEALTH_GUIDANCE_NOTE =
  'This plan is coaching-oriented guidance for educational use. It does not replace individualized medical advice, diagnosis, or emergency care.';

export function CutPlanSetupScreen() {
  const nav = useNavigation<NavProp>();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AthleteProfileSnapshot | null>(null);
  const [startWeight, setStartWeight] = useState(0);
  const [planResult, setPlanResult] = useState<CutPlanResult | null>(null);
  const [extremeAcknowledged, setExtremeAcknowledged] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [form, setForm] = useState<FormState>({
    targetWeight: '',
    weightClassName: '',
    sport: 'mma',
    fightDate: '',
    weighInDate: '',
    coachNotes: '',
    startWeightStr: '',
  });

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);

      const [profileRes, effectiveWeight] = await Promise.all([
        supabase.from('athlete_profiles').select('sport, fight_status, biological_sex').eq('user_id', user.id).single(),
        getEffectiveWeight(user.id, 160),
      ]);

      const nextProfile = (profileRes.data ?? null) as AthleteProfileSnapshot | null;
      setProfile(nextProfile);
      setStartWeight(effectiveWeight);
      setForm((current) => ({
        ...current,
        sport: nextProfile?.sport ?? current.sport,
        startWeightStr: String(effectiveWeight),
      }));
    };

    void init();

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!form.targetWeight || Number.isNaN(Number(form.targetWeight))) {
        Alert.alert('Missing target weight', 'Please enter your target weigh-in weight.');
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      if (!form.fightDate || !form.weighInDate) {
        Alert.alert('Missing dates', 'Please select both your fight date and weigh-in date.');
        return;
      }

      const actualStartWeight = Number(form.startWeightStr) || startWeight;
      const result = generateCutPlan({
        startWeight: actualStartWeight,
        targetWeight: Number(form.targetWeight),
        fightDate: form.fightDate,
        weighInDate: form.weighInDate,
        fightStatus: profile?.fight_status ?? 'amateur',
        biologicalSex: profile?.biological_sex ?? 'male',
        sport: form.sport,
      });

      setPlanResult(result);
      setExtremeAcknowledged(false);
      setStep(4);
      return;
    }

    if (step === 4) {
      if (!planResult?.valid) {
        Alert.alert('Cannot proceed', planResult?.validationErrors.join('\n') ?? 'Invalid plan.');
        return;
      }

      if (planResult.cutWarning && !extremeAcknowledged) {
        Alert.alert(
          'Acknowledgment required',
          'You must confirm that you understand the elevated health risks before proceeding.',
        );
        return;
      }

      setStep(5);
    }
  };

  const handleActivate = async () => {
    if (!userId || !planResult || !planResult.valid) return;

    setLoading(true);
    const actualStartWeight = Number(form.startWeightStr) || startWeight;

    try {
      await createWeightCutPlan(userId, {
        startWeight: actualStartWeight,
        targetWeight: Number(form.targetWeight),
        weightClassName: form.weightClassName || null,
        sport: form.sport,
        fightDate: form.fightDate,
        weighInDate: form.weighInDate,
        fightStatus: profile?.fight_status ?? 'amateur',
        biologicalSex: profile?.biological_sex ?? 'male',
        planResult,
        coachNotes: form.coachNotes || undefined,
      });

      nav.navigate('WeightCutHome');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to create plan.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.introHero}>
        <Text style={styles.introHeroEmoji}>CUT</Text>
        <Text style={styles.introHeroTitle}>How the weight cut plan works</Text>
        <Text style={styles.introHeroSub}>
          Once activated, this plan becomes the camp guide for your timeline. Nutrition, hydration, and training recommendations update automatically by cut phase.
        </Text>
      </View>

      <Text style={styles.introSectionLabel}>What Changes</Text>
      {APP_IMPACTS.map(({ icon, feature, timing, color, bg, detail }) => (
        <View key={feature} style={[styles.impactCard, { backgroundColor: bg, borderColor: `${color}40` }]}>
          <View style={styles.impactCardTop}>
            <View style={[styles.impactIconBox, { backgroundColor: `${color}20` }]}>
              <Text style={styles.impactIcon}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.impactFeature, { color }]}>{feature}</Text>
              <View style={[styles.impactTimingBadge, { backgroundColor: `${color}20` }]}>
                <Text style={[styles.impactTiming, { color }]}>Changes {timing}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.impactDetail}>{detail}</Text>
        </View>
      ))}

      <Text style={[styles.introSectionLabel, { marginTop: SPACING.md }]}>Cut Phases</Text>
      {CUT_PHASES.map(({ label, when, color, bg, description }) => (
        <View key={label} style={[styles.phaseCard, { backgroundColor: bg }]}>
          <View style={[styles.phaseCardBar, { backgroundColor: color }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.phaseCardHeader}>
              <Text style={[styles.phaseCardLabel, { color }]}>{label}</Text>
              <View style={[styles.phaseCardWhen, { backgroundColor: `${color}20` }]}>
                <Text style={[styles.phaseCardWhenText, { color }]}>{when}</Text>
              </View>
            </View>
            <Text style={styles.phaseCardDesc}>{description}</Text>
          </View>
        </View>
      ))}

      <View style={styles.introNote}>
        <Text style={styles.introNoteIcon}>i</Text>
        <Text style={styles.introNoteText}>
          Daily recommendations are estimates based on the data you log. Keep your coach informed, and use medical support whenever symptoms, recovery, or safety become concerns.
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2 of 5</Text>
      <Text style={styles.heading}>Weights and class</Text>

      <Text style={styles.label}>Current weight (lbs)</Text>
      <TextInput
        style={[styles.input, { fontSize: 24, paddingVertical: SPACING.lg, textAlign: 'center', fontFamily: FONT_FAMILY.black }]}
        keyboardType="numeric"
        value={form.startWeightStr}
        onChangeText={(value) => setForm((current) => ({ ...current, startWeightStr: value, weightClassName: '' }))}
        placeholder="175"
        placeholderTextColor={COLORS.text.tertiary}
        returnKeyType="done"
      />

      <Text style={[styles.label, { marginTop: SPACING.md }]}>Sport</Text>
      <View style={styles.toggleRow}>
        {(['mma', 'boxing'] as CutSport[]).map((sport) => (
          <TouchableOpacity
            key={sport}
            style={[styles.toggleOption, form.sport === sport && styles.toggleOptionActive]}
            onPress={() => setForm((current) => ({ ...current, sport }))}
          >
            <Text style={[styles.toggleText, form.sport === sport && styles.toggleTextActive]}>{sport.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: SPACING.md }]}>Target weigh-in weight (lbs)</Text>
      <TextInput
        style={[styles.input, { fontSize: 24, paddingVertical: SPACING.lg, textAlign: 'center', fontFamily: FONT_FAMILY.black }]}
        keyboardType="numeric"
        value={form.targetWeight}
        onChangeText={(value) => setForm((current) => ({ ...current, targetWeight: value, weightClassName: '' }))}
        placeholder="170"
        placeholderTextColor={COLORS.text.tertiary}
        returnKeyType="done"
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Enter the actual number you need to hit at weigh-in. This screen builds a coaching plan around that target; it does not certify medical safety for any specific cut.
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3 of 5</Text>
      <Text style={styles.heading}>Fight details</Text>

      <Text style={styles.label}>Fight date</Text>
      <DatePickerField
        label="Fight Date"
        value={form.fightDate}
        onChange={(value) => {
          let autoWeighInDate = form.weighInDate;

          if (!form.weighInDate) {
            const nextDate = new Date(`${value}T00:00:00`);
            nextDate.setDate(nextDate.getDate() - 1);
            autoWeighInDate = formatLocalDate(nextDate);
          }

          setForm((current) => ({
            ...current,
            fightDate: value,
            weighInDate: autoWeighInDate,
          }));
        }}
      />

      <Text style={styles.label}>Weigh-in date</Text>
      <DatePickerField
        label="Weigh-in Date"
        value={form.weighInDate}
        onChange={(value) => setForm((current) => ({ ...current, weighInDate: value }))}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Most promotions weigh in the day before competition. Same-day weigh-ins leave less time to recover, so rehydration pacing matters more.
        </Text>
      </View>

      <View style={styles.introNote}>
        <Text style={styles.introNoteIcon}>i</Text>
        <Text style={styles.introNoteText}>{HEALTH_GUIDANCE_NOTE}</Text>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 5 of 5</Text>
      <Text style={styles.heading}>Final notes</Text>

      {planResult?.cutWarning ? (
        <View style={styles.extremeReminderBanner}>
          <Text style={styles.extremeReminderText}>
            Extreme cut active ({planResult.totalCutPct.toFixed(1)}% body weight). Medical oversight is strongly recommended before proceeding.
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Coach notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        value={form.coachNotes}
        onChangeText={(value) => setForm((current) => ({ ...current, coachNotes: value }))}
        placeholder="Any coaching context, camp constraints, or reminders..."
        placeholderTextColor={COLORS.text.tertiary}
      />

      <View style={styles.confirmBox}>
        <IconCheckCircle size={20} color={COLORS.readiness.prime} />
        <Text style={styles.confirmText}>
          Your plan is ready to activate. The app will update day-by-day guidance, but your team should still monitor symptoms, recovery, and the practicality of the cut.
        </Text>
      </View>
    </View>
  );

  const isNextDisabled =
    (step === 4 && !planResult?.valid) ||
    (step === 4 && Boolean(planResult?.cutWarning) && !extremeAcknowledged);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#16A34A', '#15803D']} style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 1 ? nav.goBack() : setStep((current) => (current - 1) as Step))}
          style={styles.backButton}
        >
          <IconChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{step === 1 ? 'How It Works' : 'Weight Cut Setup'}</Text>
        <View style={styles.stepDots}>
          {[1, 2, 3, 4, 5].map((dotStep) => (
            <View key={dotStep} style={[styles.dot, step >= dotStep && styles.dotActive]} />
          ))}
        </View>
      </LinearGradient>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? renderStep1() : null}
          {step === 2 ? renderStep2() : null}
          {step === 3 ? renderStep3() : null}
          {step === 4 ? (
            <CutPlanPreviewStep
              planResult={planResult}
              extremeAcknowledged={extremeAcknowledged}
              setExtremeAcknowledged={setExtremeAcknowledged}
            />
          ) : null}
          {step === 5 ? renderStep5() : null}
        </ScrollView>
      </TouchableWithoutFeedback>

      <View style={[styles.footer, keyboardVisible && { paddingBottom: SPACING.lg }]}>
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.nextButton, isNextDisabled && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={isNextDisabled}
          >
            <Text style={styles.nextButtonText}>
              {step === 1
                ? 'Build my cut plan'
                : step === 4 && planResult?.cutWarning && !extremeAcknowledged
                  ? 'Confirm risks above to continue'
                  : step === 4
                    ? 'Looks good'
                    : 'Next'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.activateButton} onPress={handleActivate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextButtonText}>Activate cut plan</Text>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
