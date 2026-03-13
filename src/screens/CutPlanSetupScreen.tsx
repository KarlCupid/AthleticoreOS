import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Modal, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { generateCutPlan } from '../../lib/engine/calculateWeightCut';
import { suggestWeightClass } from '../../lib/engine/weightClassData';
import { createWeightCutPlan } from '../../lib/api/weightCutService';
import { getEffectiveWeight } from '../../lib/api/weightService';
import { PlanStackParamList } from '../navigation/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { CutPlanResult, WeightClassSuggestion, CutSport } from '../../lib/engine/types';
import { IconAlertTriangle, IconCheckCircle, IconChevronLeft } from '../components/icons';
import { CutPlanPreviewStep } from '../components/CutPlanPreviewStep';

type NavProp = NativeStackNavigationProp<PlanStackParamList, 'CutPlanSetup'>;

// Step 1 = How It Works intro
// Step 2 = Target Weight
// Step 3 = Fight Details
// Step 4 = Plan Preview
// Step 5 = Final Notes
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

import { DatePickerField } from '../components/DatePickerField';
import { APP_IMPACTS, CUT_PHASES } from '../constants/cutPlanSetup';
import { styles } from './CutPlanSetupScreen.styles';
import { formatLocalDate } from '../../lib/utils/date';
// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function CutPlanSetupScreen() {
  const nav = useNavigation<NavProp>();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [startWeight, setStartWeight] = useState<number>(0);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [profileRes, weight] = await Promise.all([
        supabase.from('athlete_profiles').select('*').eq('user_id', user.id).single(),
        getEffectiveWeight(user.id, 160),
      ]);
      setProfile(profileRes.data);
      setStartWeight(weight);
      setForm(f => ({ ...f, startWeightStr: String(weight) }));

      if (profileRes.data?.sport) {
        setForm(f => ({ ...f, sport: profileRes.data.sport }));
      }
    };
    init();

    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!form.targetWeight || isNaN(Number(form.targetWeight))) {
        Alert.alert('Missing target weight', 'Please enter your target weigh-in weight.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
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
    } else if (step === 4) {
      if (!planResult?.valid) {
        Alert.alert('Cannot proceed', planResult?.validationErrors.join('\n') ?? 'Invalid plan.');
        return;
      }
      if (planResult.extremeCutWarning && !extremeAcknowledged) {
        Alert.alert(
          'Acknowledgment Required',
          'You must confirm that you understand the extreme health risks before proceeding.',
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
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create plan.');
    } finally {
      setLoading(false);
    }
  };

  // â”€â”€ Step 1: How It Works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {/* Hero */}
      <View style={styles.introHero}>
        <Text style={styles.introHeroEmoji}>âš–ï¸</Text>
        <Text style={styles.introHeroTitle}>How the Weight Cut Works</Text>
        <Text style={styles.introHeroSub}>
          Once activated, the weight cut becomes the central engine of your camp â€” every part of the app adapts to your timeline and cut phase.
        </Text>
      </View>

      {/* What changes and when */}
      <Text style={styles.introSectionLabel}>WHAT CHANGES & WHEN</Text>

      {APP_IMPACTS.map(({ icon, feature, timing, color, bg, detail }) => (
        <View key={feature} style={[styles.impactCard, { backgroundColor: bg, borderColor: color + '40' }]}>
          <View style={styles.impactCardTop}>
            <View style={[styles.impactIconBox, { backgroundColor: color + '20' }]}>
              <Text style={styles.impactIcon}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.impactFeature, { color }]}>{feature}</Text>
              <View style={[styles.impactTimingBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.impactTiming, { color }]}>Changes {timing}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.impactDetail}>{detail}</Text>
        </View>
      ))}

      {/* Cut phases */}
      <Text style={[styles.introSectionLabel, { marginTop: SPACING.md }]}>CUT PHASES EXPLAINED</Text>

      {CUT_PHASES.map(({ label, when, color, bg, description }) => (
        <View key={label} style={[styles.phaseCard, { backgroundColor: bg }]}>
          <View style={[styles.phaseCardBar, { backgroundColor: color }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.phaseCardHeader}>
              <Text style={[styles.phaseCardLabel, { color }]}>{label}</Text>
              <View style={[styles.phaseCardWhen, { backgroundColor: color + '20' }]}>
                <Text style={[styles.phaseCardWhenText, { color }]}>{when}</Text>
              </View>
            </View>
            <Text style={styles.phaseCardDesc}>{description}</Text>
          </View>
        </View>
      ))}

      {/* Important note */}
      <View style={styles.introNote}>
        <Text style={styles.introNoteIcon}>ðŸ’¡</Text>
        <Text style={styles.introNoteText}>
          Protocols are recalculated every day based on where you are in the timeline. Changes to nutrition, hydration, and training intensity happen automatically â€” you don't need to do anything.
        </Text>
      </View>
    </View>
  );

  // â”€â”€ Step 2: Target Weight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2 of 5</Text>
      <Text style={styles.heading}>Weights & Class</Text>

      <Text style={styles.label}>Current Weight (lbs)</Text>
      <TextInput
        style={[styles.input, { fontSize: 24, paddingVertical: SPACING.lg, textAlign: 'center', fontFamily: FONT_FAMILY.black }]}
        keyboardType="numeric"
        value={form.startWeightStr}
        onChangeText={v => {
          setForm(f => ({ ...f, startWeightStr: v, weightClassName: '' }));
        }}
        placeholder="175"
        placeholderTextColor={COLORS.text.tertiary}
        returnKeyType="done"
      />

      <Text style={[styles.label, { marginTop: SPACING.md }]}>Sport</Text>
      <View style={styles.toggleRow}>
        {(['mma', 'boxing'] as CutSport[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.toggleOption, form.sport === s && styles.toggleOptionActive]}
            onPress={() => {
              setForm(f => ({ ...f, sport: s }));
            }}
          >
            <Text style={[styles.toggleText, form.sport === s && styles.toggleTextActive]}>
              {s.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: SPACING.md }]}>Target Weight (lbs)</Text>
      <TextInput
        style={[styles.input, { fontSize: 24, paddingVertical: SPACING.lg, textAlign: 'center', fontFamily: FONT_FAMILY.black }]}
        keyboardType="numeric"
        value={form.targetWeight}
        onChangeText={v => setForm(f => ({ ...f, targetWeight: v, weightClassName: '' }))}
        placeholder="170"
        placeholderTextColor={COLORS.text.tertiary}
        returnKeyType="done"
      />
    </View>
  );

  // â”€â”€ Step 3: Fight Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3 of 5</Text>
      <Text style={styles.heading}>Fight Details</Text>

      <Text style={styles.label}>Fight Date</Text>
      <DatePickerField
        label="Fight Date"
        value={form.fightDate}
        onChange={(v) => {
          let autoWeighIn = form.weighInDate;
          if (!form.weighInDate) {
            const d = new Date(v + 'T00:00:00');
            d.setDate(d.getDate() - 1);
            autoWeighIn = formatLocalDate(d);
          }
          setForm(f => ({ ...f, fightDate: v, weighInDate: autoWeighIn }));
        }}
      />

      <Text style={styles.label}>Weigh-in Date</Text>
      <DatePickerField
        label="Weigh-in Date"
        value={form.weighInDate}
        onChange={(v) => setForm(f => ({ ...f, weighInDate: v }))}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Most promotions hold weigh-ins the day before the fight. Same-day weigh-ins have shorter rehydration windows.
        </Text>
      </View>
    </View>
  );

  // â”€â”€ Step 4: Plan Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€



  // â”€â”€ Step 5: Final Notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 5 of 5</Text>
      <Text style={styles.heading}>Final Notes</Text>

      {planResult?.extremeCutWarning && (
        <View style={styles.extremeReminderBanner}>
          <Text style={styles.extremeReminderText}>
            â˜ ï¸ Extreme cut active ({planResult.totalCutPct.toFixed(1)}% BW). Medical supervision required.
          </Text>
        </View>
      )}

      <Text style={styles.label}>Coach Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        value={form.coachNotes}
        onChangeText={v => setForm(f => ({ ...f, coachNotes: v }))}
        placeholder="Any specific instructions from your coach..."
        placeholderTextColor={COLORS.text.tertiary}
      />

      <View style={styles.confirmBox}>
        <IconCheckCircle size={20} color={COLORS.readiness.prime} />
        <Text style={styles.confirmText}>
          Your cut plan is ready. The app will calculate your daily nutrition, hydration, and training protocols automatically â€” you just have to check in each day.
        </Text>
      </View>
    </View>
  );

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const isNextDisabled =
    (step === 4 && !planResult?.valid) ||
    (step === 4 && planResult?.extremeCutWarning && !extremeAcknowledged);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient colors={['#16A34A', '#15803D']} style={styles.header}>
        <TouchableOpacity
          onPress={() => step === 1 ? nav.goBack() : setStep(s => (s - 1) as Step)}
          style={styles.backButton}
        >
          <IconChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'How It Works' : 'Weight Cut Setup'}
        </Text>
        <View style={styles.stepDots}>
          {[1, 2, 3, 4, 5].map(s => (
            <View key={s} style={[styles.dot, step >= s && styles.dotActive]} />
          ))}
        </View>
      </LinearGradient>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && (
            <CutPlanPreviewStep
              planResult={planResult}
              extremeAcknowledged={extremeAcknowledged}
              setExtremeAcknowledged={setExtremeAcknowledged}
            />
          )}
          {step === 5 && renderStep5()}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Bottom action */}
      <View style={[styles.footer, keyboardVisible && { paddingBottom: SPACING.lg }]}>
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.nextButton, isNextDisabled && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={isNextDisabled}
          >
            <Text style={styles.nextButtonText}>
              {step === 1
                ? "Let's Build My Cut Plan"
                : step === 4 && planResult?.extremeCutWarning && !extremeAcknowledged
                  ? 'Confirm risks above to continue'
                  : step === 4
                    ? 'Looks Good'
                    : 'Next'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.activateButton} onPress={handleActivate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>Activate Cut Plan</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€



const RISK_COLORS: Record<string, string> = {
  low: '#DCFCE7',
  moderate: '#FEF3C7',
  high: '#FEE2E2',
  unsafe: '#E5E7EB',
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€



