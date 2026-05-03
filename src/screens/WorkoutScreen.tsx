import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { buildTrainingFloorViewModel } from '../../lib/engine/presentation';
import { getGuidedWorkoutContext } from '../../lib/api/fightCampService';
import { todayLocalDate } from '../../lib/utils/date';
import { supabase } from '../../lib/supabase';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';
import { isGuidedEngineActivityType } from '../../lib/engine/sessionOwnership';
import type { ScheduledActivityRow, WeeklyPlanEntryRow } from '../../lib/engine/types';
import type { TrainStackParamList } from '../navigation/types';
import { useWorkoutData, computeACWRTimeSeries } from '../hooks/useWorkoutData';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { WorkoutAnalyticsTab } from '../components/WorkoutAnalyticsTab';
import { WorkoutHistoryTab } from '../components/WorkoutHistoryTab';
import { WorkoutPrescriptionSection } from '../components/WorkoutPrescriptionSection';
import {
  GeneratedWorkoutBetaSessionCard,
  GeneratedWorkoutPreviewCard,
  type GeneratedWorkoutBetaCompletionDraft,
  type GeneratedWorkoutBetaConfig,
  type GeneratedWorkoutBetaStage,
} from '../components/workout';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import {
  workoutProgrammingService,
  workoutProgrammingServiceFixtures,
  type GeneratedWorkout,
  type ProgressionDecision,
  type WorkoutReadinessBand,
} from '../../lib/performance-engine/workout-programming';
import {
  buildSleepData,
  buildTrainTodaySummary,
  buildTrainingLoadData,
  buildWeightData,
  formatWorkoutTabLabel,
  getWorkoutFocusLabel,
  WORKOUT_TABS,
  type WorkoutTabKey,
} from './workout/utils';

type NavProp = NativeStackNavigationProp<TrainStackParamList>;

const WORKOUT_PROGRAMMING_BETA_ENABLED = process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA === '1';
const WORKOUT_PROGRAMMING_PREVIEW_ENABLED = !WORKOUT_PROGRAMMING_BETA_ENABLED
  && __DEV__
  && process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW === '1';

function readinessBandFromLevel(level: string | null | undefined): WorkoutReadinessBand {
  const normalized = level?.toLowerCase() ?? '';
  if (normalized.includes('prime') || normalized.includes('green') || normalized.includes('ready')) return 'green';
  if (normalized.includes('steady') || normalized.includes('yellow')) return 'yellow';
  if (normalized.includes('caution') || normalized.includes('orange')) return 'orange';
  if (normalized.includes('red') || normalized.includes('depleted')) return 'red';
  return 'unknown';
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function groupWeekEntries(entries: WeeklyPlanEntryRow[]) {
  const groups = new Map<string, { date: string; dayOfWeek: number; sessions: WeeklyPlanEntryRow[] }>();
  for (const entry of entries) {
    const existing = groups.get(entry.date);
    if (existing) existing.sessions.push(entry);
    else groups.set(entry.date, { date: entry.date, dayOfWeek: entry.day_of_week, sessions: [entry] });
  }
  return Array.from(groups.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((group) => ({ ...group, sessions: [...group.sessions].sort((a, b) => a.slot.localeCompare(b.slot)) }));
}

function formatActivityTime(time: string | null | undefined) {
  if (!time) return null;
  const [hourRaw, minuteRaw] = time.split(':').map(Number);
  const suffix = hourRaw >= 12 ? 'PM' : 'AM';
  return `${hourRaw % 12 || 12}:${String(minuteRaw).padStart(2, '0')} ${suffix}`;
}

function formatActivityLabel(activity: ScheduledActivityRow) {
  const label = activity.custom_label ?? activity.activity_type.replace(/_/g, ' ');
  return label.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getHeroToneStyles(tone: 'calm' | 'steady' | 'push' | 'caution') {
  if (tone === 'caution') return { borderColor: COLORS.warning, badgeBackground: `${COLORS.warning}20`, badgeColor: COLORS.warning, effortBackground: `${COLORS.warning}14` };
  if (tone === 'push') return { borderColor: COLORS.accent, badgeBackground: COLORS.accentLight, badgeColor: COLORS.accent, effortBackground: `${COLORS.accent}14` };
  if (tone === 'calm') return { borderColor: COLORS.success, badgeBackground: `${COLORS.success}20`, badgeColor: COLORS.success, effortBackground: `${COLORS.success}14` };
  return { borderColor: COLORS.border, badgeBackground: COLORS.surfaceSecondary, badgeColor: COLORS.text.secondary, effortBackground: COLORS.surfaceSecondary };
}

function getWeekStatus(group: { date: string; sessions: WeeklyPlanEntryRow[] }) {
  const allCompleted = group.sessions.every((session) => session.status === 'completed');
  const allSkipped = group.sessions.every((session) => session.status === 'skipped');
  if (allCompleted) return { label: 'Done', tone: 'success' as const };
  if (allSkipped) return { label: 'Skipped', tone: 'warning' as const };
  if (group.date === todayLocalDate()) return { label: 'Today', tone: 'accent' as const };
  return { label: 'Planned', tone: 'neutral' as const };
}

function getChipStyles(tone: 'success' | 'warning' | 'accent' | 'neutral') {
  if (tone === 'success') return { backgroundColor: `${COLORS.success}20`, color: COLORS.success };
  if (tone === 'warning') return { backgroundColor: `${COLORS.warning}20`, color: COLORS.warning };
  if (tone === 'accent') return { backgroundColor: COLORS.accentLight, color: COLORS.accent };
  return { backgroundColor: COLORS.surfaceSecondary, color: COLORS.text.secondary };
}

function StateCard({
  title,
  body,
  actionLabel,
  onPress,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <Card
      backgroundTone="workoutFloor"
      backgroundScrimColor="rgba(10, 10, 10, 0.72)"
    >
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateBody}>{body}</Text>
        <AnimatedPressable style={styles.stateActionButton} onPress={onPress}>
          <Text style={styles.stateActionButtonText}>{actionLabel}</Text>
        </AnimatedPressable>
      </View>
    </Card>
  );
}

function EmptyPlanCard({ onPress }: { onPress: () => void }) {
  return (
    <StateCard
      title="Update your journey plan"
      body="Training will adapt from your current phase, anchors, readiness, and goals."
      actionLabel="Update Journey Plan"
      onPress={onPress}
    />
  );
}

export function WorkoutScreen() {
  const navigation = useNavigation<NavProp>();
  const parentNavigation = navigation.getParent();
  const { themeColor, currentLevel } = useReadinessTheme();
  const [activeTab, setActiveTab] = useState<WorkoutTabKey>('today');
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [generatedWorkoutPreview, setGeneratedWorkoutPreview] = useState<GeneratedWorkout | null>(null);
  const [generatedWorkoutPreviewLoading, setGeneratedWorkoutPreviewLoading] = useState(false);
  const [generatedWorkoutPreviewError, setGeneratedWorkoutPreviewError] = useState<string | null>(null);
  const [generatedWorkoutBeta, setGeneratedWorkoutBeta] = useState<GeneratedWorkout | null>(null);
  const [generatedWorkoutBetaId, setGeneratedWorkoutBetaId] = useState<string | null>(null);
  const [generatedWorkoutBetaPersisted, setGeneratedWorkoutBetaPersisted] = useState(false);
  const [generatedWorkoutBetaStage, setGeneratedWorkoutBetaStage] = useState<GeneratedWorkoutBetaStage>('configure');
  const [generatedWorkoutBetaStartedAt, setGeneratedWorkoutBetaStartedAt] = useState<string | null>(null);
  const [generatedWorkoutBetaLoading, setGeneratedWorkoutBetaLoading] = useState(false);
  const [generatedWorkoutBetaCompleting, setGeneratedWorkoutBetaCompleting] = useState(false);
  const [generatedWorkoutBetaError, setGeneratedWorkoutBetaError] = useState<string | null>(null);
  const [generatedWorkoutBetaProgression, setGeneratedWorkoutBetaProgression] = useState<ProgressionDecision | null>(null);
  const {
    loading, refreshing, loadData, onRefresh, prescription, todayActivities, workoutHistory,
    checkins, sessions, userId, dailyAthleteSummary, todayPlanEntry, weeklyEntries,
    historyLoaded, analyticsLoaded, historyLoading, analyticsLoading, initialLoadError,
    historyError, analyticsError, loadHistoryData, loadAnalyticsData, handleStartWorkout,
    performanceContext,
  } = useWorkoutData();

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));
  useEffect(() => { if (activeTab === 'history' && !historyLoaded && !historyLoading) void loadHistoryData(); }, [activeTab, historyLoaded, historyLoading, loadHistoryData]);
  useEffect(() => { if (activeTab === 'analytics' && !analyticsLoaded && !analyticsLoading) void loadAnalyticsData(); }, [activeTab, analyticsLoaded, analyticsLoading, loadAnalyticsData]);
  useEffect(() => { setShowWorkoutDetails(false); }, [activeTab, todayPlanEntry?.id, prescription?.sessionGoal]);

  const loadGeneratedWorkoutPreview = useCallback(async () => {
    if (!WORKOUT_PROGRAMMING_PREVIEW_ENABLED) return;
    setGeneratedWorkoutPreviewLoading(true);
    setGeneratedWorkoutPreviewError(null);
    try {
      const workout = await workoutProgrammingService.generatePreviewWorkout(
        workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
        { persistGeneratedWorkout: false },
      );
      setGeneratedWorkoutPreview(workout);
    } catch (error) {
      setGeneratedWorkoutPreviewError(error instanceof Error ? error.message : 'Generated workout preview failed.');
    } finally {
      setGeneratedWorkoutPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      WORKOUT_PROGRAMMING_PREVIEW_ENABLED
      && activeTab === 'today'
      && !generatedWorkoutPreview
      && !generatedWorkoutPreviewLoading
    ) {
      void loadGeneratedWorkoutPreview();
    }
  }, [activeTab, generatedWorkoutPreview, generatedWorkoutPreviewLoading, loadGeneratedWorkoutPreview]);

  const generatedWorkoutBetaReadiness = useMemo(() => readinessBandFromLevel(currentLevel), [currentLevel]);

  const generateGeneratedWorkoutBeta = useCallback(async (config: GeneratedWorkoutBetaConfig) => {
    if (!WORKOUT_PROGRAMMING_BETA_ENABLED) return;
    const experienceLevel = config.goalId === 'dumbbell_hypertrophy' ? 'intermediate' as const : 'beginner' as const;
    const workoutEnvironment = config.equipmentIds.includes('stationary_bike') ? 'gym' as const : 'home' as const;
    const request = {
      goalId: config.goalId,
      durationMinutes: config.durationMinutes,
      preferredDurationMinutes: config.durationMinutes,
      equipmentIds: config.equipmentIds,
      readinessBand: config.readinessBand,
      experienceLevel,
      workoutEnvironment,
      preferredToneVariant: 'coach_like' as const,
    };

    setGeneratedWorkoutBetaLoading(true);
    setGeneratedWorkoutBetaCompleting(false);
    setGeneratedWorkoutBetaError(null);
    setGeneratedWorkoutBetaProgression(null);
    setGeneratedWorkoutBetaStartedAt(null);
    try {
      if (userId) {
        try {
          const result = await workoutProgrammingService.generateGeneratedWorkoutSessionForUser(userId, request, {
            useSupabase: true,
            contentReviewMode: 'production',
          });
          setGeneratedWorkoutBeta(result.workout);
          setGeneratedWorkoutBetaId(result.generatedWorkoutId);
          setGeneratedWorkoutBetaPersisted(result.persisted);
          setGeneratedWorkoutBetaStage('inspect');
          return;
        } catch (persistError) {
          const workout = await workoutProgrammingService.generatePreviewWorkout(request, {
            persistGeneratedWorkout: false,
            contentReviewMode: 'preview',
          });
          setGeneratedWorkoutBeta(workout);
          setGeneratedWorkoutBetaId(null);
          setGeneratedWorkoutBetaPersisted(false);
          setGeneratedWorkoutBetaStage('inspect');
          setGeneratedWorkoutBetaError(`Generated locally. Persistence unavailable: ${errorMessage(persistError, 'Unable to save generated workout.')}`);
          return;
        }
      }

      const workout = await workoutProgrammingService.generatePreviewWorkout(request, {
        persistGeneratedWorkout: false,
        contentReviewMode: 'preview',
      });
      setGeneratedWorkoutBeta(workout);
      setGeneratedWorkoutBetaId(null);
      setGeneratedWorkoutBetaPersisted(false);
      setGeneratedWorkoutBetaStage('inspect');
    } catch (error) {
      setGeneratedWorkoutBetaError(errorMessage(error, 'Generated workout failed.'));
    } finally {
      setGeneratedWorkoutBetaLoading(false);
    }
  }, [userId]);

  const startGeneratedWorkoutBeta = useCallback(() => {
    setGeneratedWorkoutBetaStartedAt(new Date().toISOString());
    setGeneratedWorkoutBetaStage('started');
    setGeneratedWorkoutBetaError(null);
  }, []);

  const completeGeneratedWorkoutBeta = useCallback(async (draft: GeneratedWorkoutBetaCompletionDraft) => {
    if (!generatedWorkoutBeta) return;
    const completionInput = {
      workout: generatedWorkoutBeta,
      generatedWorkoutId: generatedWorkoutBetaId,
      startedAt: generatedWorkoutBetaStartedAt,
      completedAt: new Date().toISOString(),
      ...draft,
    };
    const fallbackUserId = userId ?? 'local-generated-workout-beta-user';

    setGeneratedWorkoutBetaCompleting(true);
    setGeneratedWorkoutBetaError(null);
    try {
      const result = await workoutProgrammingService.completeGeneratedWorkoutSession(fallbackUserId, completionInput, userId ? {
        useSupabase: true,
      } : {
        persistGeneratedWorkout: false,
      });
      setGeneratedWorkoutBetaProgression(result.progressionDecision);
      setGeneratedWorkoutBetaStage('completed');
    } catch (persistError) {
      if (!userId) {
        setGeneratedWorkoutBetaError(errorMessage(persistError, 'Generated workout completion failed.'));
        return;
      }
      try {
        const result = await workoutProgrammingService.completeGeneratedWorkoutSession('local-generated-workout-beta-user', completionInput, {
          persistGeneratedWorkout: false,
        });
        setGeneratedWorkoutBetaProgression(result.progressionDecision);
        setGeneratedWorkoutBetaStage('completed');
        setGeneratedWorkoutBetaError(`Completed locally. Persistence unavailable: ${errorMessage(persistError, 'Unable to save completion.')}`);
      } catch (localError) {
        setGeneratedWorkoutBetaError(errorMessage(localError, 'Generated workout completion failed.'));
      }
    } finally {
      setGeneratedWorkoutBetaCompleting(false);
    }
  }, [generatedWorkoutBeta, generatedWorkoutBetaId, generatedWorkoutBetaStartedAt, userId]);

  const resetGeneratedWorkoutBeta = useCallback(() => {
    setGeneratedWorkoutBeta(null);
    setGeneratedWorkoutBetaId(null);
    setGeneratedWorkoutBetaPersisted(false);
    setGeneratedWorkoutBetaStage('configure');
    setGeneratedWorkoutBetaStartedAt(null);
    setGeneratedWorkoutBetaError(null);
    setGeneratedWorkoutBetaProgression(null);
  }, []);

  const openGuidedWorkout = useCallback(async (entry?: WeeklyPlanEntryRow | null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const trainingDate = entry?.date ?? todayLocalDate();
    const context = await getGuidedWorkoutContext(session.user.id, trainingDate);
    navigation.navigate('GuidedWorkout', {
      weeklyPlanEntryId: entry?.id,
      scheduledActivityId: entry?.scheduled_activity_id ?? undefined,
      focus: entry?.focus ?? undefined,
      availableMinutes: entry?.estimated_duration_min,
      readinessState: currentLevel ?? 'Prime',
      phase: context.phase,
      fitnessLevel: context.fitnessLevel,
      trainingDate,
      isDeloadWeek: entry?.is_deload,
      autoStart: true,
      entrySource: 'train',
    });
  }, [navigation, currentLevel]);

  const openWorkoutDetail = useCallback(async (entry: WeeklyPlanEntryRow) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const context = await getGuidedWorkoutContext(session.user.id, entry.date);
    navigation.navigate('WorkoutDetail', {
      weeklyPlanEntryId: entry.id,
      date: entry.date,
      readinessState: currentLevel ?? 'Prime',
      phase: context.phase,
      fitnessLevel: context.fitnessLevel,
      isDeloadWeek: entry.is_deload,
    });
  }, [navigation, currentLevel]);

  const groupedWeeklyEntries = useMemo(() => groupWeekEntries(weeklyEntries), [weeklyEntries]);
  const contextualTodayActivities = useMemo(() => todayActivities.filter((activity) => !isGuidedEngineActivityType(activity.activity_type)), [todayActivities]);
  const weightData = useMemo(() => buildWeightData(checkins), [checkins]);
  const sleepData = useMemo(() => buildSleepData(checkins), [checkins]);
  const trainingLoadData = useMemo(() => buildTrainingLoadData(sessions), [sessions]);
  const acwrData = useMemo(() => computeACWRTimeSeries(sessions), [sessions]);
  const checkinDates = useMemo(() => new Set(checkins.map((checkin) => checkin.date)), [checkins]);
  const floorVM = useMemo(() => buildTrainingFloorViewModel(prescription as any, dailyAthleteSummary), [prescription, dailyAthleteSummary]);

  const todaySessionLabel = useMemo(() => {
    if (todayPlanEntry) return getWorkoutFocusLabel(
      todayPlanEntry.focus,
      todayPlanEntry.session_type,
      todayPlanEntry.prescription_snapshot,
      todayPlanEntry.sc_session_family,
    );
    if (prescription) return getSessionFamilyLabel({ workoutType: prescription.workoutType, focus: prescription.focus, prescription: prescription as any });
    if (contextualTodayActivities.length > 0) return formatActivityLabel(contextualTodayActivities[0]);
    return null;
  }, [todayPlanEntry, prescription, contextualTodayActivities]);

  const todaySummary = useMemo(() => buildTrainTodaySummary({
    floorVM,
    sessionLabel: todaySessionLabel,
    targetIntensity: todayPlanEntry?.target_intensity ?? null,
    durationMin: todayPlanEntry?.estimated_duration_min ?? prescription?.estimatedDurationMin ?? null,
  }), [floorVM, todaySessionLabel, todayPlanEntry?.target_intensity, todayPlanEntry?.estimated_duration_min, prescription?.estimatedDurationMin]);

  const heroToneStyles = getHeroToneStyles(todaySummary.effortTone);
  const hasStructuredToday = Boolean(todayPlanEntry || prescription);
  const showEmptyPlan = !hasStructuredToday && contextualTodayActivities.length === 0 && groupedWeeklyEntries.length === 0;
  const primaryActionLabel = todayPlanEntry?.status === 'completed'
    ? 'View workout details'
    : todayPlanEntry?.status === 'skipped'
      ? 'Review today\'s plan'
      : hasStructuredToday
        ? 'Start session'
        : groupedWeeklyEntries.length === 0
          ? 'Set up weekly plan'
          : 'Open training';

  const handlePrimaryAction = useCallback(() => {
    if (todayPlanEntry) {
      if (todayPlanEntry.status === 'completed' || todayPlanEntry.status === 'skipped') { void openWorkoutDetail(todayPlanEntry); return; }
      void openGuidedWorkout(todayPlanEntry); return;
    }
    if (prescription) { void openGuidedWorkout(null); return; }
    if (groupedWeeklyEntries.length === 0) { navigation.navigate('WeeklyPlanSetup'); return; }
    void handleStartWorkout(navigation);
  }, [todayPlanEntry, prescription, groupedWeeklyEntries.length, navigation, handleStartWorkout, openGuidedWorkout, openWorkoutDetail]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.header}>
          <SkeletonLoader width={70} height={20} shape="rect" style={{ borderRadius: RADIUS.sm }} />
          <SkeletonLoader width="100%" height={42} shape="rect" style={{ marginTop: SPACING.md, borderRadius: RADIUS.lg }} />
        </View>
        <View style={styles.content}>
          <SkeletonLoader width="100%" height={260} shape="rect" style={{ borderRadius: RADIUS.xl, marginBottom: SPACING.md }} />
          <SkeletonLoader width="100%" height={120} shape="rect" style={{ borderRadius: RADIUS.xl }} />
        </View>
      </View>
    );
  }

  return (
    <ScreenWrapper useSafeArea={true}>
      <View style={styles.header}>
        <ScreenHeader
          kicker="Train"
          title="Training"
          subtitle="Today, week, progress."
          rightAction={(
            <View style={styles.headerActions}>
              <Pressable style={styles.headerBtn} onPress={() => parentNavigation?.navigate('Plan' as never)}><Text style={styles.headerBtnText}>Plan</Text></Pressable>
              <Pressable style={styles.headerBtn} onPress={() => navigation.navigate('GymProfiles')}><Text style={styles.headerBtnText}>Gym</Text></Pressable>
            </View>
          )}
        >
          <View style={styles.tabBar}>
            {WORKOUT_TABS.map((tab) => (
              <AnimatedPressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{formatWorkoutTabLabel(tab)}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </ScreenHeader>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
      >
        {activeTab === 'today' && (
          <View style={styles.tabStack}>
            <Animated.View entering={FadeInDown.delay(20).duration(300).springify()}>
              <UnifiedJourneySummaryCard
                summary={performanceContext}
                compact
                showBodyMass={Boolean(performanceContext.bodyMass)}
              />
            </Animated.View>
            {initialLoadError ? <StateCard title="We couldn't load Train right now" body={initialLoadError} actionLabel="Try again" onPress={() => { void loadData(true); }} /> : null}
            {!initialLoadError && showEmptyPlan ? <Animated.View entering={FadeInDown.delay(40).duration(300).springify()}><EmptyPlanCard onPress={() => navigation.navigate('WeeklyPlanSetup')} /></Animated.View> : null}
            {!initialLoadError && hasStructuredToday ? (
              <Animated.View entering={FadeInDown.delay(40).duration(300).springify()}>
                <Card
                  style={[styles.heroCard, { borderColor: heroToneStyles.borderColor }]}
                  backgroundTone="workoutFloor"
                  backgroundScrimColor="rgba(10, 10, 10, 0.64)"
                >
                  <View style={styles.heroTopRow}>
                    <View style={[styles.heroBadge, { backgroundColor: heroToneStyles.badgeBackground }]}><Text style={[styles.heroBadgeText, { color: heroToneStyles.badgeColor }]}>{todayPlanEntry?.status === 'completed' ? 'Done today' : floorVM.isDeload ? 'Lighter day' : 'Today'}</Text></View>
                    {todaySummary.durationLabel ? <Text style={styles.heroDuration}>{todaySummary.durationLabel}</Text> : null}
                  </View>
                  <Text style={styles.heroSessionLabel}>{todaySummary.sessionLabel}</Text>
                  <Text style={styles.heroGoal}>{todaySummary.goal}</Text>
                  <Text style={styles.heroReason}>{todaySummary.reason}</Text>
                  <View style={[styles.effortCard, { backgroundColor: heroToneStyles.effortBackground }]}>
                    <Text style={styles.effortLabel}>How hard to go</Text>
                    <Text style={styles.effortTitle}>{todaySummary.effortTitle}</Text>
                    <Text style={styles.effortBody}>{todaySummary.effortDetail}</Text>
                  </View>
                  {todaySummary.guardrails.length > 0 && (
                    <View style={styles.guardrailsCard}>
                      <Text style={styles.guardrailsTitle}>Know before you train</Text>
                      {todaySummary.guardrails.map((item) => (
                        <View key={item} style={styles.guardrailRow}>
                          <View style={styles.guardrailDot} />
                          <Text style={styles.guardrailText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <AnimatedPressable style={styles.primaryButton} onPress={handlePrimaryAction}><Text style={styles.primaryButtonText}>{primaryActionLabel}</Text></AnimatedPressable>
                  {prescription ? <AnimatedPressable style={styles.secondaryLink} onPress={() => setShowWorkoutDetails((value) => !value)}><Text style={styles.secondaryLinkText}>{showWorkoutDetails ? 'Hide workout details' : 'View workout details'}</Text></AnimatedPressable> : null}
                </Card>
              </Animated.View>
            ) : null}
            {!initialLoadError && showWorkoutDetails && prescription ? (
              <Animated.View entering={FadeInDown.delay(60).duration(280).springify()}>
                <WorkoutPrescriptionSection prescription={prescription} themeColor={themeColor} showStartButton={false} />
              </Animated.View>
            ) : null}
            {!initialLoadError && WORKOUT_PROGRAMMING_BETA_ENABLED ? (
              <Animated.View testID="generated-workout-beta-section" entering={FadeInDown.delay(70).duration(280).springify()}>
                <GeneratedWorkoutBetaSessionCard
                  userAuthenticated={Boolean(userId)}
                  stage={generatedWorkoutBetaStage}
                  workout={generatedWorkoutBeta}
                  generatedWorkoutId={generatedWorkoutBetaId}
                  persisted={generatedWorkoutBetaPersisted}
                  startedAt={generatedWorkoutBetaStartedAt}
                  loading={generatedWorkoutBetaLoading}
                  completing={generatedWorkoutBetaCompleting}
                  error={generatedWorkoutBetaError}
                  progressionDecision={generatedWorkoutBetaProgression}
                  defaultReadinessBand={generatedWorkoutBetaReadiness}
                  onGenerate={(config) => { void generateGeneratedWorkoutBeta(config); }}
                  onStart={startGeneratedWorkoutBeta}
                  onComplete={(draft) => { void completeGeneratedWorkoutBeta(draft); }}
                  onReset={resetGeneratedWorkoutBeta}
                />
              </Animated.View>
            ) : null}
            {!initialLoadError && WORKOUT_PROGRAMMING_PREVIEW_ENABLED ? (
              <Animated.View testID="generated-workout-preview-section" entering={FadeInDown.delay(70).duration(280).springify()}>
                {generatedWorkoutPreviewLoading && !generatedWorkoutPreview ? (
                  <StateCard
                    title="Generating programming preview"
                    body="This developer-only section is loading through the workout-programming service layer."
                    actionLabel="Refresh Preview"
                    onPress={() => { void loadGeneratedWorkoutPreview(); }}
                  />
                ) : generatedWorkoutPreviewError ? (
                  <StateCard
                    title="Generated preview unavailable"
                    body={generatedWorkoutPreviewError}
                    actionLabel="Try Again"
                    onPress={() => { void loadGeneratedWorkoutPreview(); }}
                  />
                ) : generatedWorkoutPreview ? (
                  <GeneratedWorkoutPreviewCard workout={generatedWorkoutPreview} />
                ) : null}
              </Animated.View>
            ) : null}
            {!initialLoadError && contextualTodayActivities.length > 0 && (
              <Animated.View entering={FadeInDown.delay(80).duration(280).springify()}>
                <Card
                  title="Also today"
                  subtitle="Other sessions"
                  backgroundTone="schedule"
                  backgroundScrimColor="rgba(10, 10, 10, 0.70)"
                >
                  <View style={styles.alsoTodayList}>
                    {contextualTodayActivities.map((activity, index) => (
                      <View key={activity.id} style={[styles.alsoTodayRow, index === contextualTodayActivities.length - 1 && styles.alsoTodayRowLast]}>
                        <View style={styles.alsoTodayTimeColumn}><Text style={styles.alsoTodayTime}>{formatActivityTime(activity.start_time) ?? 'Any time'}</Text></View>
                        <View style={styles.alsoTodayCopy}>
                          <Text style={styles.alsoTodayLabel}>{formatActivityLabel(activity)}</Text>
                          <Text style={styles.alsoTodayMeta}>{activity.estimated_duration_min} min{activity.actual_rpe ?? activity.expected_intensity ? `  |  Effort ${activity.actual_rpe ?? activity.expected_intensity}/10` : ''}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              </Animated.View>
            )}
          </View>
        )}
        {activeTab === 'plan' && (
          <View style={styles.tabStack}>
            {initialLoadError ? <StateCard title="We couldn't load your week" body={initialLoadError} actionLabel="Try again" onPress={() => { void loadData(true); }} /> : groupedWeeklyEntries.length === 0 ? <EmptyPlanCard onPress={() => navigation.navigate('WeeklyPlanSetup')} /> : (
              <>
                {groupedWeeklyEntries.map((group, index) => {
                  const primaryEntry = group.sessions.find((session) => session.status !== 'completed') ?? group.sessions[0];
                  const extraSessions = Math.max(0, group.sessions.length - 1);
                  const status = getWeekStatus(group);
                  const chipStyles = getChipStyles(status.tone);
                  const sessionLabel = getWorkoutFocusLabel(
                    primaryEntry.focus,
                    primaryEntry.session_type,
                    primaryEntry.prescription_snapshot,
                    primaryEntry.sc_session_family,
                  );
                  const handlePress = () => {
                    if (group.date === todayLocalDate() && primaryEntry.status === 'planned') { void openGuidedWorkout(primaryEntry); return; }
                    void openWorkoutDetail(primaryEntry);
                  };
                  return (
                    <Animated.View key={group.date} entering={FadeInDown.delay(index * 45).duration(260).springify()}>
                      <AnimatedPressable style={styles.weekCard} onPress={handlePress}>
                        <View style={styles.weekCardLeft}>
                          <Text style={styles.weekCardDay}>{new Date(`${group.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                          <Text style={styles.weekCardDate}>{new Date(`${group.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                        </View>
                        <View style={styles.weekCardCenter}>
                          <View style={styles.weekCardTitleRow}>
                            <Text style={styles.weekCardFocus}>{sessionLabel}</Text>
                            {extraSessions > 0 ? <Text style={styles.weekCardMore}>+{extraSessions} more</Text> : null}
                          </View>
                          <Text style={styles.weekCardMeta}>{primaryEntry.estimated_duration_min} min{primaryEntry.target_intensity ? `  |  Effort ${primaryEntry.target_intensity}/10` : ''}</Text>
                          {group.sessions.some((session) => session.is_deload) ? <Text style={styles.weekCardNote}>Recovery emphasis this day.</Text> : null}
                        </View>
                        <View style={[styles.weekStatusChip, { backgroundColor: chipStyles.backgroundColor }]}><Text style={[styles.weekStatusChipText, { color: chipStyles.color }]}>{status.label}</Text></View>
                      </AnimatedPressable>
                    </Animated.View>
                  );
                })}
                <AnimatedPressable style={styles.planSettingsButton} onPress={() => navigation.navigate('WeeklyPlanSetup')}><Text style={styles.planSettingsButtonText}>Adjust Plan</Text></AnimatedPressable>
              </>
            )}
          </View>
        )}
        {activeTab === 'history' && (
          <View style={styles.tabStack}>
            {historyLoading && !historyLoaded ? (
              <View style={styles.tabLoadingState}>
                <SkeletonLoader width="100%" height={110} shape="rect" style={{ borderRadius: RADIUS.xl }} />
                <SkeletonLoader width="100%" height={110} shape="rect" style={{ borderRadius: RADIUS.xl }} />
              </View>
            ) : historyError ? (
              <StateCard title="We couldn't load your recent sessions" body={historyError} actionLabel="Try again" onPress={() => { void loadHistoryData(); }} />
            ) : <WorkoutHistoryTab workoutHistory={workoutHistory} />}
          </View>
        )}
        {activeTab === 'analytics' && (
          <View style={styles.tabStack}>
            {analyticsLoading && !analyticsLoaded ? (
              <View style={styles.tabLoadingState}>
                <SkeletonLoader width="100%" height={120} shape="rect" style={{ borderRadius: RADIUS.xl }} />
                <SkeletonLoader width="100%" height={120} shape="rect" style={{ borderRadius: RADIUS.xl }} />
                <SkeletonLoader width="100%" height={120} shape="rect" style={{ borderRadius: RADIUS.xl }} />
              </View>
            ) : analyticsError ? (
              <StateCard title="We couldn't load your progress" body={analyticsError} actionLabel="Try again" onPress={() => { void loadAnalyticsData(); }} />
            ) : (
              <WorkoutAnalyticsTab userId={userId} trainingLoadData={trainingLoadData} acwrData={acwrData} checkinDates={checkinDates} weightData={weightData} sleepData={sleepData} />
            )}
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  headerBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full },
  headerBtnText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(10, 10, 10, 0.46)', borderRadius: RADIUS.lg, padding: 4, borderWidth: 1, borderColor: COLORS.borderLight },
  tab: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  tabTextActive: { color: COLORS.text.inverse },
  content: { padding: SPACING.md, paddingTop: SPACING.xs },
  tabStack: { gap: SPACING.md },
  heroCard: { borderWidth: 1.5 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  heroBadge: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm + 2, paddingVertical: 5 },
  heroBadgeText: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroDuration: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  heroSessionLabel: { fontSize: 24, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, lineHeight: 30 },
  heroGoal: { fontSize: 17, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, lineHeight: 24, marginTop: SPACING.sm },
  heroReason: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20, marginTop: SPACING.xs },
  effortCard: { borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md },
  effortLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  effortTitle: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  effortBody: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 19, marginTop: 4 },
  guardrailsCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md, gap: SPACING.sm },
  guardrailsTitle: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.6 },
  guardrailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  guardrailDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 6 },
  guardrailText: { flex: 1, fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 19 },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.md },
  primaryButtonText: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
  secondaryLink: { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  secondaryLinkText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent },
  alsoTodayList: { marginTop: SPACING.xs },
  alsoTodayRow: { flexDirection: 'row', gap: SPACING.md, paddingVertical: SPACING.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderLight },
  alsoTodayRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  alsoTodayTimeColumn: { width: 74 },
  alsoTodayTime: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
  alsoTodayCopy: { flex: 1 },
  alsoTodayLabel: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  alsoTodayMeta: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, marginTop: 2 },
  weekCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
  weekCardLeft: { width: 64 },
  weekCardDay: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  weekCardDate: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginTop: 2 },
  weekCardCenter: { flex: 1 },
  weekCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  weekCardFocus: { flex: 1, fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  weekCardMore: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
  weekCardMeta: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, marginTop: 3 },
  weekCardNote: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginTop: 4 },
  weekStatusChip: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm + 2, paddingVertical: 6 },
  weekStatusChipText: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  planSettingsButton: { alignItems: 'center', paddingVertical: SPACING.sm },
  planSettingsButtonText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  tabLoadingState: { gap: SPACING.md },
  stateCard: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  stateTitle: { fontSize: 20, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, textAlign: 'center', lineHeight: 26 },
  stateBody: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20 },
  stateActionButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  stateActionButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
  bottomSpacer: { height: SPACING.xxl },
});
