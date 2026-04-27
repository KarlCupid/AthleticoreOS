import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../lib/supabase';
import { computeRehydrationProtocol } from '../../lib/engine/calculateWeightCut';
import { useWeightCutData } from '../hooks/useWeightCutData';
import type { FuelStackParamList } from '../navigation/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { IconChevronLeft, IconCheckCircle } from '../components/icons';

type NavProp = NativeStackNavigationProp<FuelStackParamList>;
type RouteProps = RouteProp<FuelStackParamList, 'RehydrationProtocol'>;

type AthleteProfile = {
  biological_sex?: 'male' | 'female' | null;
};

const HEALTH_GUIDANCE_NOTE =
  'Rehydration guidance is coaching-oriented and educational. It does not replace licensed medical advice, diagnosis, or emergency support.';

export function RehydrationProtocolScreen() {
  const nav = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { weighInWeightLbs, hoursToFight } = route.params;

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [currentRegainLbs, setCurrentRegainLbs] = useState('');
  const [completedPhases, setCompletedPhases] = useState<Set<number>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      setUserId(data.user.id);
      const { data: athleteProfile } = await supabase
        .from('athlete_profiles')
        .select('biological_sex')
        .eq('user_id', data.user.id)
        .single();

      setProfile(athleteProfile);
    });
  }, []);

  const { complete, logSafetyCheck } = useWeightCutData(userId);

  const protocol = computeRehydrationProtocol({
    weighInWeightLbs,
    targetWeightLbs: weighInWeightLbs,
    hoursToFight,
    biologicalSex: profile?.biological_sex ?? 'male',
  });

  const togglePhase = (idx: number) => {
    setCompletedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const currentRegain = currentRegainLbs === '' ? null : Number(currentRegainLbs);
  const targetReached =
    currentRegain !== null && Number.isFinite(currentRegain) && currentRegain >= protocol.targetWeightByFight;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(10, 10, 10, 0.94)', 'rgba(183, 217, 168, 0.22)']} style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rehydration Protocol</Text>
        <Text style={styles.headerSub}>
          Weigh-in: {weighInWeightLbs.toFixed(1)} lbs to Target regain: +
          {protocol.weightToRegainLbs.toFixed(1)} lbs
        </Text>
        <Text style={styles.headerSub}>
          {hoursToFight}h to fight start | {protocol.totalFluidOz} oz total fluids
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>Target Weight by Fight</Text>
          <Text style={styles.goalValue}>{protocol.targetWeightByFight.toFixed(1)} lbs</Text>
          <Text style={styles.goalSub}>Approx. 6% body weight regain</Text>
        </View>

        <View style={styles.monitorCard}>
          <Text style={styles.monitorTitle}>Monitor</Text>
          {protocol.monitorMetrics.map((metric, index) => (
            <View key={index} style={styles.monitorRow}>
              <View style={styles.monitorBullet} />
              <Text style={styles.monitorText}>{metric}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Phased Protocol</Text>
        {protocol.phases.map((phase, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.phaseCard, completedPhases.has(idx) && styles.phaseCardDone]}
            onPress={() => togglePhase(idx)}
            activeOpacity={0.8}
          >
            <View style={styles.phaseHeader}>
              <View style={[styles.checkBox, completedPhases.has(idx) && styles.checkBoxDone]}>
                {completedPhases.has(idx) && <IconCheckCircle size={16} color={COLORS.text.inverse} />}
              </View>
              <Text style={styles.phaseWindow}>{phase.timeWindow ?? phase.name ?? 'Phase'}</Text>
            </View>

            <View style={styles.phaseDetails}>
              <PhaseDetail
                icon="H2O"
                text={phase.fluidInstruction ?? phase.protocol ?? 'Follow the fluid plan for this phase.'}
              />
              {phase.foodInstruction && <PhaseDetail icon="Meal" text={phase.foodInstruction} />}
              {phase.sodiumInstruction && <PhaseDetail icon="Na" text={phase.sodiumInstruction} />}
              <PhaseDetail icon="Target" text={`Target: ${phase.targetFluidOz ?? 0} oz this phase`} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.trackCard}>
          <Text style={styles.trackTitle}>Current Regained Weight</Text>
          <Text style={styles.trackSub}>Weigh yourself every 1-2 hours</Text>
          <View style={styles.trackRow}>
            <TextInput
              style={styles.trackInput}
              keyboardType="numeric"
              value={currentRegainLbs}
              onChangeText={setCurrentRegainLbs}
              placeholder={`${(weighInWeightLbs + 1).toFixed(1)}`}
              placeholderTextColor={COLORS.text.tertiary}
            />
            <Text style={styles.trackUnit}>lbs</Text>
          </View>

          {currentRegain !== null && Number.isFinite(currentRegain) && (
            <Text
              style={[
                styles.trackStatus,
                { color: targetReached ? COLORS.readiness.prime : COLORS.readiness.caution },
              ]}
            >
              {targetReached
                ? `Target reached. ${(currentRegain - weighInWeightLbs).toFixed(1)} lbs regained`
                : `${(protocol.targetWeightByFight - currentRegain).toFixed(1)} lbs to go`}
            </Text>
          )}

          {currentRegain !== null && userId && (
            <TouchableOpacity
              style={styles.logButton}
              onPress={async () => {
                await logSafetyCheck({
                  postWeighInWeight: currentRegain,
                  rehydrationWeightRegained: currentRegain - weighInWeightLbs,
                });
              }}
            >
              <Text style={styles.logButtonText}>Log Weight</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.coachNote}>
          <Text style={styles.coachNoteText}>
            {HEALTH_GUIDANCE_NOTE} {protocol.message}
          </Text>
        </View>

        {userId && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => {
              complete({
                finalWeighInWeight: weighInWeightLbs,
                madeWeight: weighInWeightLbs <= (route.params.targetWeightLbs ?? weighInWeightLbs),
                rehydrationWeightRegained:
                  currentRegain !== null && Number.isFinite(currentRegain)
                    ? currentRegain - weighInWeightLbs
                    : undefined,
              });
              nav.goBack();
            }}
          >
            <Text style={styles.completeButtonText}>Complete Cut and Archive</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function PhaseDetail({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.phaseDetailRow}>
      <Text style={styles.phaseDetailIcon}>{icon}</Text>
      <Text style={styles.phaseDetailText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: 4,
  },
  backBtn: {
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  goalCard: {
    backgroundColor: 'rgba(10, 10, 10, 0.78)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(183, 217, 168, 0.34)',
    ...SHADOWS.sm,
  },
  goalTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.prime,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalValue: {
    fontSize: 40,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.readiness.prime,
    marginVertical: 4,
  },
  goalSub: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  monitorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  monitorTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  monitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  monitorBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.readiness.prime,
  },
  monitorText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  phaseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  phaseCardDone: {
    backgroundColor: 'rgba(183, 217, 168, 0.12)',
    borderColor: 'rgba(183, 217, 168, 0.34)',
    opacity: 0.8,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    backgroundColor: COLORS.readiness.prime,
    borderColor: COLORS.readiness.prime,
  },
  phaseWindow: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  phaseDetails: {
    paddingLeft: 32,
    gap: 6,
  },
  phaseDetailRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  phaseDetailIcon: {
    fontSize: 14,
    width: 38,
  },
  phaseDetailText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  trackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  trackTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  trackSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  trackInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 22,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  trackUnit: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    width: 30,
  },
  trackStatus: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    textAlign: 'center',
  },
  logButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  coachNote: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  coachNoteText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  completeButton: {
    backgroundColor: COLORS.readiness.prime,
    borderRadius: RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  bottomSpacer: {
    height: 80,
  },
});
