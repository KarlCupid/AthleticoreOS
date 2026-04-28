import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { getDailyEngineState } from '../../lib/api/dailyMissionService';
import { determineCutPhase } from '../../lib/engine/calculateWeightCut';
import { addDays, todayLocalDate } from '../../lib/utils/date';
import { useWeightCutData } from '../hooks/useWeightCutData';
import type { DailyCutProtocolRow, CutPhase, WeightCutPlanRow } from '../../lib/engine/types';
import type { FightWeekDayViewModel } from '../hooks/fuel/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { Card } from '../components/Card';
import { IconChevronLeft, IconDroplets } from '../components/icons';
import { UrineColorPicker } from '../components/UrineColorPicker';
import { CognitiveTestCard } from '../components/CognitiveTestCard';

const HEALTH_GUIDANCE_NOTE =
  'Fight-week body-mass guidance is coaching-oriented education. Escalate to qualified medical support if symptoms worsen or the target becomes unsafe.';

const PHASE_LABELS: Record<CutPhase, string> = {
  chronic: 'Long-Term Management',
  intensified: 'Weight-Class Prep',
  fight_week_load: 'Competition Week Monitoring',
  fight_week_cut: 'Blocked Acute Protocol',
  weigh_in: 'Weigh-In Day',
  rehydration: 'Post Weigh-In Recovery',
};

const PHASE_COLORS: Record<CutPhase, [string, string]> = {
  chronic: ['#D4AF37', '#8C6A1E'],
  intensified: ['#15803D', '#166534'],
  fight_week_load: ['#B8C0C2', '#6F7778'],
  fight_week_cut: ['#D4AF37', '#B8892D'],
  weigh_in: ['#D9827E', '#D9827E'],
  rehydration: ['#10B981', '#059669'],
};

const FLAG_COLORS: Record<string, string> = {
  danger: COLORS.error,
  warning: COLORS.warning,
  info: COLORS.accent,
};

function buildFightWeekDays(weighInDate: string, plan: WeightCutPlanRow): FightWeekDayViewModel[] {
  return Array.from({ length: 8 }, (_, index) => {
    const daysToWeighIn = 7 - index;
    const date = addDays(weighInDate, -daysToWeighIn);
    const phase = determineCutPhase(plan, date);
    return {
      date,
      daysToWeighIn,
      label: daysToWeighIn === 0 ? 'Weigh-In' : `Day ${daysToWeighIn}`,
      phaseLabel: PHASE_LABELS[phase],
      phaseColors: PHASE_COLORS[phase],
    };
  });
}

function ProtocolSection({
  title,
  color,
  items,
  icon,
}: {
  title: string;
  color: string;
  items: string[];
  icon?: React.ReactNode;
}) {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) {
    return null;
  }

  return (
    <Card
      style={[styles.sectionCard, { borderLeftColor: color }]}
      backgroundTone="cutProtocol"
      backgroundScrimColor="rgba(10, 10, 10, 0.76)"
    >
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {filtered.map((item) => (
        <Text key={`${title}-${item}`} style={styles.sectionItem}>
          - {item}
        </Text>
      ))}
    </Card>
  );
}

export function FightWeekProtocolScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(7);
  const [selectedProtocol, setSelectedProtocol] = useState<DailyCutProtocolRow | null>(null);
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const [protocolReloadKey, setProtocolReloadKey] = useState(0);
  const [showUrine, setShowUrine] = useState(false);
  const [showCognitive, setShowCognitive] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const {
    activePlan,
    todayProtocol,
    loading,
    logSafetyCheck,
    logCompliance,
  } = useWeightCutData(userId);

  const fightWeekDays = useMemo(
    () => (activePlan ? buildFightWeekDays(activePlan.weigh_in_date, activePlan) : []),
    [activePlan],
  );
  const selectedDayView = fightWeekDays.find((day) => day.daysToWeighIn === selectedDay) ?? null;
  const isSelectedToday = selectedDayView?.date === todayLocalDate();

  useEffect(() => {
    if (todayProtocol?.days_to_weigh_in != null) {
      setSelectedDay(Math.min(7, Math.max(0, todayProtocol.days_to_weigh_in)));
    }
  }, [todayProtocol]);

  useEffect(() => {
    let isActive = true;

    async function loadProtocolForSelectedDay() {
      if (!userId || !activePlan || !selectedDayView) {
        if (isActive) {
          setSelectedProtocol(null);
        }
        return;
      }

      if (isSelectedToday && todayProtocol) {
        setSelectedProtocol(todayProtocol);
        setProtocolError(null);
        return;
      }

      setLoadingProtocol(true);
      setProtocolError(null);

      try {
        const engineState = await getDailyEngineState(userId, selectedDayView.date, { forceRefresh: true });
        if (!isActive) {
          return;
        }

        setSelectedProtocol((engineState.cutProtocol as DailyCutProtocolRow | null) ?? null);
        if (!engineState.cutProtocol) {
          setProtocolError('No generated protocol is available for this day yet.');
        }
      } catch {
        if (isActive) {
          setSelectedProtocol(null);
          setProtocolError('We could not load that day right now.');
        }
      } finally {
        if (isActive) {
          setLoadingProtocol(false);
        }
      }
    }

    void loadProtocolForSelectedDay();

    return () => {
      isActive = false;
    };
  }, [userId, activePlan, selectedDayView, isSelectedToday, todayProtocol, protocolReloadKey]);

  if (loading || !activePlan) {
    return (
      <View style={styles.center}>
        {loading ? <ActivityIndicator color={COLORS.accent} size="large" /> : <Text style={styles.emptyText}>No active weight-class plan.</Text>}
      </View>
    );
  }

  const phaseColors = selectedDayView?.phaseColors ?? PHASE_COLORS.fight_week_load;
  const protocol = selectedProtocol;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(10, 10, 10, 0.94)', `${phaseColors[0]}33`]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fight Week Protocol</Text>
        <Text style={styles.headerSub}>{activePlan.weight_class_name ?? 'Weight Cut'}</Text>
        {selectedDayView ? (
          <Text style={styles.headerSub}>
            {selectedDayView.label} · {selectedDayView.phaseLabel} · {selectedDayView.date}
          </Text>
        ) : null}
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {fightWeekDays.map((day) => (
          <TouchableOpacity
            key={day.date}
            style={[
              styles.dayTab,
              selectedDay === day.daysToWeighIn && { backgroundColor: `${phaseColors[0]}22`, borderColor: phaseColors[0] },
              day.date === todayLocalDate() && styles.dayTabToday,
            ]}
            onPress={() => setSelectedDay(day.daysToWeighIn)}
          >
            <Text style={[styles.dayTabLabel, selectedDay === day.daysToWeighIn && { color: COLORS.text.primary }]}>
              {day.label}
            </Text>
            <Text style={[styles.dayTabPhase, selectedDay === day.daysToWeighIn && { color: COLORS.text.secondary }]}>
              {day.phaseLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.md, gap: SPACING.md }}>
        <Card
          style={[styles.dayCard, { borderLeftColor: phaseColors[0] }]}
          backgroundTone="cutProtocol"
          backgroundScrimColor="rgba(10, 10, 10, 0.68)"
        >
          <View>
            <Text style={styles.dayCardTitle}>
              {selectedDayView?.label ?? 'Fight week'} · {selectedDayView?.phaseLabel ?? 'Protocol'}
            </Text>
            {selectedDayView ? (
              <Text style={styles.dayCardMeta}>
                {selectedDayView.date}{isSelectedToday ? ' · today' : ''}
              </Text>
            ) : null}
          </View>
          {protocol?.protocol_adherence ? (
            <Text style={styles.statusBadge}>{protocol.protocol_adherence.toUpperCase()}</Text>
          ) : null}
        </Card>

        <Card
          style={styles.briefCard}
          backgroundTone="cutProtocol"
          backgroundScrimColor="rgba(10, 10, 10, 0.78)"
        >
          <Text style={styles.briefTitle}>Health guidance note</Text>
          <Text style={styles.briefText}>{HEALTH_GUIDANCE_NOTE}</Text>
        </Card>

        {loadingProtocol ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.emptyText}>Loading protocol...</Text>
          </View>
        ) : protocol ? (
          <>
            <ProtocolSection
              title="Hydration"
              color={COLORS.chart.water}
              icon={<IconDroplets size={18} color={COLORS.chart.water} />}
              items={[
                `Target: ${Math.round(protocol.water_target_oz)} oz`,
                protocol.sodium_instruction ?? '',
                protocol.fiber_instruction ?? '',
              ]}
            />

            <ProtocolSection
              title="Nutrition Targets"
              color={COLORS.chart.protein}
              items={[
                `${protocol.prescribed_calories} calories`,
                `${protocol.prescribed_protein}g protein · ${protocol.prescribed_carbs}g carbs · ${protocol.prescribed_fat}g fat`,
                protocol.is_refeed_day ? 'Refeed day active.' : '',
                protocol.is_carb_cycle_high ? 'High-carb day active.' : '',
              ]}
            />

            <ProtocolSection
              title="Training"
              color={COLORS.chart.fitness}
              items={[
                protocol.training_recommendation ?? 'No training recommendation available.',
                protocol.training_intensity_cap != null ? `Max RPE ${protocol.training_intensity_cap}/10` : '',
                protocol.intervention_reason ?? '',
              ]}
            />

            <ProtocolSection title="Morning" color={phaseColors[0]} items={[protocol.morning_protocol ?? '']} />
            <ProtocolSection title="Afternoon" color={phaseColors[0]} items={[protocol.afternoon_protocol ?? '']} />
            <ProtocolSection title="Evening" color={phaseColors[0]} items={[protocol.evening_protocol ?? '']} />

            {isSelectedToday ? (
              <Card
                style={styles.sectionCard}
                backgroundTone="cutProtocol"
                backgroundScrimColor="rgba(10, 10, 10, 0.76)"
              >
                <Text style={styles.sectionTitle}>Compliance</Text>
                <Text style={styles.sectionItem}>Log how closely you followed today's protocol.</Text>
                <View style={styles.complianceRow}>
                  {(['followed', 'partial', 'missed'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={styles.complianceChip}
                      onPress={() => void logCompliance(status, protocol.date)}
                    >
                      <Text style={styles.complianceChipText}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            ) : null}

            {isSelectedToday && (protocol.cut_phase === 'fight_week_load' || protocol.cut_phase === 'fight_week_cut' || protocol.cut_phase === 'weigh_in') ? (
              <>
                <TouchableOpacity style={styles.vitalButton} onPress={() => setShowUrine((current) => !current)}>
                  <Text style={styles.vitalButtonText}>Log urine color check</Text>
                </TouchableOpacity>
                {showUrine ? (
                  <UrineColorPicker
                    onSelect={async (color) => {
                      await logSafetyCheck({ urineColor: color });
                      setShowUrine(false);
                    }}
                  />
                ) : null}

                <TouchableOpacity
                  style={[styles.vitalButton, { backgroundColor: `${COLORS.success}18`, borderColor: COLORS.success }]}
                  onPress={() => setShowCognitive((current) => !current)}
                >
                  <Text style={[styles.vitalButtonText, { color: COLORS.success }]}>Reaction time test</Text>
                </TouchableOpacity>
                {showCognitive ? (
                  <CognitiveTestCard
                    baseline={activePlan.baseline_cognitive_score}
                    onResult={async (ms) => {
                      await logSafetyCheck({ cognitiveScore: ms });
                      setShowCognitive(false);
                    }}
                  />
                ) : null}
              </>
            ) : null}

            {(protocol.safety_flags?.length ?? 0) > 0 ? (
              <View style={styles.flagsContainer}>
                <Text style={styles.flagsTitle}>Safety flags</Text>
                {protocol.safety_flags.map((flag, index) => (
                  <Card
                    key={`${flag.code}-${index}`}
                    style={[styles.flagCard, { borderLeftColor: FLAG_COLORS[flag.severity] ?? COLORS.accent }]}
                    backgroundTone="risk"
                    backgroundScrimColor="rgba(10, 10, 10, 0.76)"
                  >
                    <Text style={styles.flagTitle}>{flag.title}</Text>
                    <Text style={styles.flagMessage}>{flag.message}</Text>
                    <Text style={styles.flagRec}>{flag.recommendation}</Text>
                  </Card>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.centerBlock}>
            <Text style={styles.emptyText}>{protocolError ?? 'No protocol is available for this day.'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setProtocolReloadKey((current) => current + 1)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  centerBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  emptyText: {
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: 4,
  },
  backBtn: {
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  daySelector: {
    maxHeight: 80,
  },
  daySelectorContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  dayTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    minWidth: 96,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  dayTabToday: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  dayTabLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  dayTabPhase: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  dayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  dayCardTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  dayCardMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  statusBadge: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    textTransform: 'uppercase',
  },
  briefCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  briefTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  briefText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.borderLight,
    borderRightColor: COLORS.borderLight,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  sectionItem: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 22,
    marginTop: 2,
  },
  complianceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    flexWrap: 'wrap',
  },
  complianceChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  complianceChipText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textTransform: 'capitalize',
  },
  vitalButton: {
    backgroundColor: 'rgba(183, 217, 168, 0.12)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.readiness.prime,
  },
  vitalButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.prime,
  },
  flagsContainer: {
    gap: SPACING.sm,
  },
  flagsTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  flagCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    gap: 4,
    ...SHADOWS.sm,
  },
  flagTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  flagMessage: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  flagRec: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    marginTop: 4,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
});
