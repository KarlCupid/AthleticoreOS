import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { computeRehydrationProtocol } from '../../lib/engine/calculateWeightCut';
import { useWeightCutData } from '../hooks/useWeightCutData';
import { WeightCutStackParamList } from '../navigation/WeightCutStack';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { IconChevronLeft, IconDroplets, IconCheckCircle } from '../components/icons';

type RouteProps = RouteProp<WeightCutStackParamList, 'RehydrationProtocol'>;

export function RehydrationProtocolScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProps>();
  const { weighInWeightLbs, hoursToFight } = route.params;

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentRegainLbs, setCurrentRegainLbs] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const { data: p } = await supabase.from('athlete_profiles').select('biological_sex').eq('user_id', data.user.id).single();
        setProfile(p);
      }
    });
  }, []);

  const { complete, logSafetyCheck } = useWeightCutData(userId);

  const protocol = computeRehydrationProtocol({
    weighInWeightLbs,
    targetWeightLbs: weighInWeightLbs,
    hoursToFight,
    biologicalSex: profile?.biological_sex ?? 'male',
  });

  const [completedPhases, setCompletedPhases] = useState<Set<number>>(new Set());

  const togglePhase = (idx: number) => {
    setCompletedPhases(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <IconChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rehydration Protocol</Text>
        <Text style={styles.headerSub}>
          Weigh-in: {weighInWeightLbs.toFixed(1)} lbs → Target regain: +{protocol.weightToRegainLbs.toFixed(1)} lbs
        </Text>
        <Text style={styles.headerSub}>{hoursToFight}h to fight start · {protocol.totalFluidOz} oz total fluids</Text>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md }}>

        {/* Goal card */}
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>Target Weight by Fight</Text>
          <Text style={styles.goalValue}>{protocol.targetWeightByFight.toFixed(1)} lbs</Text>
          <Text style={styles.goalSub}>≈ 6% body weight regain</Text>
        </View>

        {/* Monitor metrics */}
        <View style={styles.monitorCard}>
          <Text style={styles.monitorTitle}>Monitor</Text>
          {protocol.monitorMetrics.map((m, i) => (
            <View key={i} style={styles.monitorRow}>
              <View style={styles.monitorBullet} />
              <Text style={styles.monitorText}>{m}</Text>
            </View>
          ))}
        </View>

        {/* Phase checklist */}
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
                {completedPhases.has(idx) && <IconCheckCircle size={16} color="#fff" />}
              </View>
              <Text style={styles.phaseWindow}>{phase.timeWindow}</Text>
            </View>
            <View style={styles.phaseDetails}>
              <PhaseDetail icon="💧" text={phase.fluidInstruction} />
              {phase.foodInstruction && <PhaseDetail icon="🍽" text={phase.foodInstruction} />}
              {phase.sodiumInstruction && <PhaseDetail icon="🧂" text={phase.sodiumInstruction} />}
              <PhaseDetail icon="🥛" text={`Target: ${phase.targetFluidOz} oz this phase`} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Weight tracking */}
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
          {currentRegainLbs !== '' && (
            <Text style={[styles.trackStatus, { color: Number(currentRegainLbs) >= protocol.targetWeightByFight ? COLORS.readiness.prime : COLORS.readiness.caution }]}>
              {Number(currentRegainLbs) >= protocol.targetWeightByFight
                ? `✓ Target reached! (${(Number(currentRegainLbs) - weighInWeightLbs).toFixed(1)} lbs regained)`
                : `${(protocol.targetWeightByFight - Number(currentRegainLbs)).toFixed(1)} lbs to go`
              }
            </Text>
          )}
          {currentRegainLbs !== '' && userId && (
            <TouchableOpacity
              style={styles.logButton}
              onPress={async () => {
                await logSafetyCheck({ post_weigh_in_weight: Number(currentRegainLbs) } as any);
              }}
            >
              <Text style={styles.logButtonText}>Log Weight</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Coaching note */}
        <View style={styles.coachNote}>
          <Text style={styles.coachNoteText}>{protocol.message}</Text>
        </View>

        {/* Complete cut */}
        {userId && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => {
              complete({
                finalWeighInWeight: weighInWeightLbs,
                madeWeight: weighInWeightLbs <= (route.params as any).targetWeightLbs,
                rehydrationWeightRegained: currentRegainLbs ? Number(currentRegainLbs) - weighInWeightLbs : undefined,
              });
              nav.goBack();
            }}
          >
            <Text style={styles.completeButtonText}>Complete Cut & Archive</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 80 }} />
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: 4,
  },
  backBtn: { marginBottom: SPACING.sm },
  headerTitle: { fontSize: 26, fontFamily: FONT_FAMILY.black, color: '#fff' },
  headerSub: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: 'rgba(255,255,255,0.85)' },
  goalCard: {
    backgroundColor: '#DCFCE7', borderRadius: RADIUS.lg, padding: SPACING.lg,
    alignItems: 'center', ...SHADOWS.sm,
  },
  goalTitle: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.prime, letterSpacing: 0.5, textTransform: 'uppercase' },
  goalValue: { fontSize: 40, fontFamily: FONT_FAMILY.black, color: COLORS.readiness.prime, marginVertical: 4 },
  goalSub: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  monitorCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm, gap: SPACING.sm },
  monitorTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: 4 },
  monitorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  monitorBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.readiness.prime },
  monitorText: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  sectionHeader: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  phaseCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    gap: SPACING.sm, ...SHADOWS.sm,
  },
  phaseCardDone: { backgroundColor: '#F0FDF4', opacity: 0.8 },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkBox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: COLORS.readiness.prime, borderColor: COLORS.readiness.prime },
  phaseWindow: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  phaseDetails: { paddingLeft: 32, gap: 6 },
  phaseDetailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  phaseDetailIcon: { fontSize: 14, width: 20 },
  phaseDetailText: { flex: 1, fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20 },
  trackCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm, gap: SPACING.sm },
  trackTitle: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  trackSub: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  trackInput: {
    flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: 22, fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary, textAlign: 'center',
  },
  trackUnit: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, width: 30 },
  trackStatus: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, textAlign: 'center' },
  logButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, padding: SPACING.sm, alignItems: 'center' },
  logButtonText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: '#fff' },
  coachNote: { backgroundColor: COLORS.accentLight, borderRadius: RADIUS.md, padding: SPACING.md },
  coachNoteText: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 22 },
  completeButton: { backgroundColor: COLORS.readiness.prime, borderRadius: RADIUS.full, padding: SPACING.md, alignItems: 'center' },
  completeButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#fff' },
});
