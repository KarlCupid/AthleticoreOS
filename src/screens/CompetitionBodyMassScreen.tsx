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
import { addDays, todayLocalDate } from '../../lib/utils/date';
import { useBodyMassPlanData } from '../hooks/useBodyMassPlanData';
import type { WeightClassPlanRow } from '../../lib/engine/types';
import { getBodyMassSupportPhase, type BodyMassSupportPhase } from '../../lib/performance-engine';
import type { FightWeekDayViewModel } from '../hooks/fuel/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { Card } from '../components/Card';
import { IconChevronLeft, IconDroplets } from '../components/icons';
import { UrineColorPicker } from '../components/UrineColorPicker';
import { CognitiveTestCard } from '../components/CognitiveTestCard';

const HEALTH_GUIDANCE_NOTE =
  'Fight-week body-mass guidance is coaching-oriented education. Escalate to qualified medical support if symptoms worsen or the target becomes unsafe.';

const PHASE_LABELS: Record<BodyMassSupportPhase, string> = {
  unknown: 'Body-Mass Context',
  long_term_body_composition: 'Long-Term Management',
  gradual_weight_class_preparation: 'Weight-Class Prep',
  competition_week_body_mass_monitoring: 'Competition Week Monitoring',
  weigh_in_logistics: 'Weigh-In Day',
  post_weigh_in_recovery_tracking: 'Post Weigh-In Recovery',
  high_risk_review: 'Safety Review',
};

const PHASE_COLORS: Record<BodyMassSupportPhase, [string, string]> = {
  unknown: [COLORS.chart.water, COLORS.chart.water],
  long_term_body_composition: [COLORS.accent, COLORS.chart.fatigue],
  gradual_weight_class_preparation: [COLORS.success, COLORS.success],
  competition_week_body_mass_monitoring: [COLORS.chart.water, COLORS.chart.water],
  weigh_in_logistics: [COLORS.error, COLORS.error],
  post_weigh_in_recovery_tracking: [COLORS.success, COLORS.success],
  high_risk_review: [COLORS.warning, COLORS.readiness.caution],
};

const FLAG_COLORS: Record<string, string> = {
  critical: COLORS.error,
  high: COLORS.error,
  moderate: COLORS.warning,
  low: COLORS.accent,
  info: COLORS.accent,
};

function buildFightWeekDays(weighInDate: string, plan: WeightClassPlanRow): FightWeekDayViewModel[] {
  return Array.from({ length: 8 }, (_, index) => {
    const daysToWeighIn = 7 - index;
    const date = addDays(weighInDate, -daysToWeighIn);
    const phase = getBodyMassSupportPhase(plan, date);
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
  const filtered = items.filter((item) => item.trim().length > 0);
  if (filtered.length === 0) {
    return null;
  }

  return (
    <Card
      style={[styles.sectionCard, { borderLeftColor: color }]}
      backgroundTone="bodyMassSupport"
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

export function CompetitionBodyMassScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(7);
  const [showUrine, setShowUrine] = useState(false);
  const [showCognitive, setShowCognitive] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const {
    activePlan,
    loading,
    logSafetyCheck,
    performanceContext,
    guidedBodyMass,
  } = useBodyMassPlanData(userId);

  const fightWeekDays = useMemo(
    () => (activePlan ? buildFightWeekDays(activePlan.weigh_in_date, activePlan) : []),
    [activePlan],
  );
  const selectedDayView = fightWeekDays.find((day) => day.daysToWeighIn === selectedDay) ?? null;
  const isSelectedToday = selectedDayView?.date === todayLocalDate();

  useEffect(() => {
    const todayView = fightWeekDays.find((day) => day.date === todayLocalDate());
    if (todayView) {
      setSelectedDay(todayView.daysToWeighIn);
    }
  }, [fightWeekDays]);

  if (loading || !activePlan) {
    return (
      <View style={styles.center}>
        {loading ? <ActivityIndicator color={COLORS.accent} size="large" /> : <Text style={styles.emptyText}>No active weight-class plan.</Text>}
      </View>
    );
  }

  const phaseColors = selectedDayView?.phaseColors ?? PHASE_COLORS.competition_week_body_mass_monitoring;
  const selectedPhase = selectedDayView
    ? getBodyMassSupportPhase(activePlan, selectedDayView.date)
    : 'competition_week_body_mass_monitoring';
  const selectedDayIsFightWeek =
    selectedPhase === 'competition_week_body_mass_monitoring'
    || selectedPhase === 'weigh_in_logistics';
  const currentRiskFlags = performanceContext.riskFlags;
  const blocked = guidedBodyMass.planBlocked || currentRiskFlags.some((flag) => flag.blocksPlan);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(10, 10, 10, 0.94)', `${phaseColors[0]}33`]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fight Week Support</Text>
        <Text style={styles.headerSub}>{activePlan.weight_class_name ?? 'Weight Class'}</Text>
        {selectedDayView ? (
          <Text style={styles.headerSub}>
            {selectedDayView.label} - {selectedDayView.phaseLabel} - {selectedDayView.date}
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
          backgroundTone="bodyMassSupport"
          backgroundScrimColor="rgba(10, 10, 10, 0.68)"
        >
          <View>
            <Text style={styles.dayCardTitle}>
              {selectedDayView?.label ?? 'Fight week'} - {selectedDayView?.phaseLabel ?? 'Support'}
            </Text>
            {selectedDayView ? (
              <Text style={styles.dayCardMeta}>
                {selectedDayView.date}{isSelectedToday ? ' - today' : ''}
              </Text>
            ) : null}
          </View>
          {blocked ? <Text style={styles.statusBadge}>SAFETY REVIEW</Text> : null}
        </Card>

        <Card
          style={styles.briefCard}
          backgroundTone="bodyMassSupport"
          backgroundScrimColor="rgba(10, 10, 10, 0.78)"
        >
          <Text style={styles.briefTitle}>Health guidance note</Text>
          <Text style={styles.briefText}>{HEALTH_GUIDANCE_NOTE}</Text>
        </Card>

        <ProtocolSection
          title="Hydration Monitoring"
          color={COLORS.chart.water}
          icon={<IconDroplets size={18} color={COLORS.chart.water} />}
          items={[
            'Use familiar fluids and normal electrolyte habits; avoid risky rapid body-mass methods.',
            'Escalate dizziness, faintness, severe headache, cramps, or illness symptoms.',
            performanceContext.lowConfidence ? performanceContext.confidenceSummary : '',
          ]}
        />

        <ProtocolSection
          title="Fueling"
          color={COLORS.chart.protein}
          items={[
            performanceContext.nutrition.targetLabel,
            performanceContext.nutrition.explanation,
            performanceContext.nutrition.sessionFuelingSummary ?? '',
          ]}
        />

        <ProtocolSection
          title="Training"
          color={COLORS.chart.fitness}
          items={[
            performanceContext.focus.training,
            performanceContext.readiness.recommendedTrainingAdjustmentLabel
              ? `Adjustment: ${performanceContext.readiness.recommendedTrainingAdjustmentLabel}`
              : performanceContext.readiness.explanation,
            blocked ? 'Automatic high-intensity work is constrained while blocking risk flags are active.' : '',
          ]}
        />

        <ProtocolSection
          title="Body-Mass Safety"
          color={phaseColors[0]}
          items={[
            guidedBodyMass.primaryMessage,
            guidedBodyMass.clearExplanation,
            guidedBodyMass.statusLabel ? `Feasibility: ${guidedBodyMass.statusLabel}` : '',
            guidedBodyMass.professionalReviewRecommendation ?? '',
          ]}
        />

        {isSelectedToday && selectedDayIsFightWeek ? (
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

        {currentRiskFlags.length > 0 ? (
          <View style={styles.flagsContainer}>
            <Text style={styles.flagsTitle}>Risk flags</Text>
            {currentRiskFlags.map((flag) => (
              <Card
                key={flag.id}
                style={[styles.flagCard, { borderLeftColor: FLAG_COLORS[flag.severity] ?? COLORS.accent }]}
                backgroundTone="risk"
                backgroundScrimColor="rgba(10, 10, 10, 0.76)"
              >
                <Text style={styles.flagTitle}>{flag.label}</Text>
                <Text style={styles.flagMessage}>{flag.message}</Text>
                {flag.explanation ? <Text style={styles.flagRec}>{flag.explanation}</Text> : null}
              </Card>
            ))}
          </View>
        ) : null}

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
    color: COLORS.error,
    backgroundColor: COLORS.readiness.depletedLight,
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
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
});
