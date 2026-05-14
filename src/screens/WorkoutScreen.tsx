import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, ImageBackground } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { buildTrainingFloorViewModel } from '../../lib/engine/presentation';
import { getGuidedWorkoutContext } from '../../lib/api/fightCampService';
import { todayLocalDate } from '../../lib/utils/date';
import { supabase } from '../../lib/supabase';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';
import { isGuidedEngineActivityType } from '../../lib/engine/sessionOwnership';
import type { ScheduledActivityRow, WeeklyPlanEntryRow } from '../../lib/engine/types';
import type { RootTabParamList, TrainStackParamList } from '../navigation/types';
import { useWorkoutData, computeACWRTimeSeries } from '../hooks/useWorkoutData';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { WorkoutAnalyticsTab } from '../components/WorkoutAnalyticsTab';
import { WorkoutHistoryTab } from '../components/WorkoutHistoryTab';
import { WorkoutPrescriptionSection } from '../components/WorkoutPrescriptionSection';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, TAP_TARGETS, SHADOWS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import {
  boxingEntryDisplayMeta,
  classifyPlanEntryRuntimeSurface,
  getBoxingSnapshotFromWeeklyPlanEntry,
  type BoxingGeneratedPlanEntrySnapshot,
} from '../../lib/performance-engine/workout-programming';
import {
  buildSupportSessionCoachCopy,
  sanitizeAthleteFacingCopy,
} from '../../lib/performance-engine/presentation/coachCopyViewModel';
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
type RootNavProp = BottomTabNavigationProp<RootTabParamList>;

const TRAIN_BACKGROUND = require('../../assets/images/cards/workout-floor-card-bg.png');

function formatActivityTime(time: string | null | undefined) {
  if (!time) return null;
  const [hourRaw = 0, minuteRaw = 0] = time.split(':').map(Number);
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

function formatQualityGapLabel(gap: { quality: string; priority?: string | null | undefined }) {
  const normalized = String(gap.quality).replace(/[_-]+/g, ' ').toLowerCase();
  if (/aerobic|roadwork|zone ?2/.test(normalized)) return 'roadwork base';
  if (/shoulder|scap/.test(normalized)) return 'shoulder durability';
  if (/neck|trap/.test(normalized)) return 'neck and trap durability';
  if (/trunk|core|rotation/.test(normalized)) return 'core durability';
  if (/conditioning|interval|round/.test(normalized)) return 'conditioning';
  if (/strength/.test(normalized)) return 'strength';
  if (/power/.test(normalized)) return 'power';
  if (/mobility|hip|ankle/.test(normalized)) return 'mobility';
  if (/skill|footwork|boxing/.test(normalized)) return 'skill work';
  return normalized;
}

function joinReadableList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
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
      backgroundScrimColor="rgba(10, 10, 10, 0.74)"
      style={styles.stateOuterCard}
    >
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateBody}>{body}</Text>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={actionLabel} style={styles.stateActionButton} onPress={onPress}>
          <Text style={styles.stateActionButtonText}>{actionLabel}</Text>
        </AnimatedPressable>
      </View>
    </Card>
  );
}

function EmptyPlanCard({ onPress }: { onPress: () => void }) {
  return (
    <StateCard
      title="Set up your plan"
      body="Add your goals, fixed sessions, readiness, and equipment so training can adapt day by day."
      actionLabel="Set up plan"
      onPress={onPress}
    />
  );
}

function PlannedSupportSessionCard({
  entry,
  snapshot,
  onOpen,
}: {
  entry: WeeklyPlanEntryRow;
  snapshot: BoxingGeneratedPlanEntrySnapshot;
  onOpen: () => void;
}) {
  const domainLabel = snapshot.supportDomainLabel ?? boxingEntryDisplayMeta(entry).sourceLabel;
  const duration = snapshot.estimatedDurationMinutes ?? entry.estimated_duration_min;
  const coachCopy = buildSupportSessionCoachCopy({
    snapshot,
    durationMinutes: duration,
    sourceLabel: domainLabel,
  });
  const supportHeadline = snapshot.label && snapshot.label !== coachCopy.headline
    ? snapshot.label
    : coachCopy.headline;

  return (
    <Card
      title="Today's support work"
      subtitle={coachCopy.headline}
      subtitleLines={2}
      backgroundTone="workoutFloor"
      backgroundScrimColor="rgba(10, 10, 10, 0.70)"
      style={styles.supportOuterCard}
    >
      <View testID="planned-support-session-card" style={styles.supportSessionStack}>
        <Text style={styles.supportHeadline}>{supportHeadline}</Text>
        <Text style={styles.supportBody}>{coachCopy.body}</Text>
        <View style={styles.supportMetaRow}>
          {coachCopy.detailLines.slice(0, 4).map((line) => (
            <Text key={line} style={styles.supportMetaPill}>{line}</Text>
          ))}
        </View>
        {coachCopy.safetyLines.map((line) => (
          <Text key={line} style={styles.supportFuel}>{line}</Text>
        ))}
        <Text style={styles.supportAttachedState}>{coachCopy.secondaryAction}</Text>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={coachCopy.primaryAction}
          style={styles.primaryButton}
          onPress={onOpen}
        >
          <Text style={styles.primaryButtonText}>{coachCopy.primaryAction}</Text>
        </AnimatedPressable>
      </View>
    </Card>
  );
}

function AthleteSupportWeekCard({ snapshot, compact = false }: { snapshot: BoxingGeneratedPlanEntrySnapshot | null; compact?: boolean }) {
  if (!snapshot) return null;
  const week = snapshot.weekSummary;
  const bullets = [
    week.sAndCFocus ? `Strength focus: ${week.sAndCFocus}` : week.primaryBoxingFocus ? `Focus: ${week.primaryBoxingFocus}` : null,
    week.protectedBoxingPracticeSummary,
    week.hardDaySummary,
    week.protectedLoadSummary,
    compact ? null : week.generatedSupportSummary,
    compact ? null : week.nextBestAction,
  ].filter((item): item is string => Boolean(item)).map(sanitizeAthleteFacingCopy);
  const visibleBullets = compact ? bullets.slice(0, 2) : bullets;
  const qualityGaps = Array.from(new Set(week.qualityGaps.map(formatQualityGapLabel))).slice(0, compact ? 1 : 2);

  return (
    <Card
      title={week.weeklyAthleticDevelopmentHeadline ?? week.weeklyBoxingHeadline ?? 'How this week supports you'}
      subtitle={compact ? 'Built around your fixed boxing sessions.' : week.weeklyAthleticDevelopmentSummary ?? week.weeklyBoxingSummary ?? 'Athleticore builds strength, conditioning, and recovery work around fixed boxing sessions.'}
      subtitleLines={compact ? 1 : 3}
      backgroundTone="workoutFloor"
      backgroundScrimColor="rgba(10, 10, 10, 0.72)"
      style={styles.weekContextCard}
    >
      <View style={styles.intelligenceStack}>
        {visibleBullets.map((item) => (
          <View key={item} style={styles.intelligenceRow}>
            <View style={styles.guardrailDot} />
            <Text style={styles.intelligenceText}>{item}</Text>
          </View>
        ))}
        <View style={styles.intelligenceMetaRow}>
          <Text style={styles.intelligenceMeta}>Hard days {week.hardDayCount}{week.hardDayCap != null ? `/${week.hardDayCap}` : ''}</Text>
          {week.protectedBoxingSessionCount != null ? <Text style={styles.intelligenceMeta}>Fixed boxing {week.protectedBoxingSessionCount}</Text> : null}
          {week.generatedSAndCSessionCount != null ? <Text style={styles.intelligenceMeta}>Strength work {week.generatedSAndCSessionCount}</Text> : null}
          {week.generatedRoadworkCount != null ? <Text style={styles.intelligenceMeta}>Roadwork {week.generatedRoadworkCount}</Text> : null}
          {week.generatedDurabilityCount != null ? <Text style={styles.intelligenceMeta}>Durability {week.generatedDurabilityCount}</Text> : null}
          {week.generatedSkillSupportCount != null ? <Text style={styles.intelligenceMeta}>Skill work {week.generatedSkillSupportCount}</Text> : null}
        </View>
        {qualityGaps.length > 0 ? <Text style={styles.intelligenceNote}>Keep an eye on: {joinReadableList(qualityGaps)}</Text> : null}
        {!compact && week.variancePlan?.reason ? <Text style={styles.intelligenceNote}>{week.variancePlan.reason}</Text> : null}
      </View>
    </Card>
  );
}

function HeaderAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.headerBtn} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={15} color={COLORS.accent} />
      <Text style={styles.headerBtnText}>{label}</Text>
    </Pressable>
  );
}

export function WorkoutScreen() {
  const navigation = useNavigation<NavProp>();
  const parentNavigation = navigation.getParent<RootNavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor, currentLevel } = useReadinessTheme();
  const [activeTab, setActiveTab] = useState<WorkoutTabKey>('today');
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [showWeekContext, setShowWeekContext] = useState(false);
  const {
    loading, refreshing, loadData, onRefresh, prescription, todayActivities, workoutHistory,
    checkins, sessions, userId, dailyAthleteSummary, todayPlanEntry, weeklyEntries,
    historyLoaded, analyticsLoaded, historyLoading, analyticsLoading, initialLoadError,
    historyError, analyticsError, loadHistoryData, loadAnalyticsData,
    performanceContext,
  } = useWorkoutData();

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));
  useEffect(() => { if (activeTab === 'history' && !historyLoaded && !historyLoading) void loadHistoryData(); }, [activeTab, historyLoaded, historyLoading, loadHistoryData]);
  useEffect(() => { if (activeTab === 'analytics' && !analyticsLoaded && !analyticsLoading) void loadAnalyticsData(); }, [activeTab, analyticsLoaded, analyticsLoading, loadAnalyticsData]);
  useEffect(() => {
    setShowWorkoutDetails(false);
    setShowWeekContext(false);
  }, [activeTab, todayPlanEntry?.id, prescription?.sessionGoal]);

  const openLegacyGuidedWorkout = useCallback(async (entry?: WeeklyPlanEntryRow | null) => {
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

  const openTrainingEntry = useCallback(async (entry: WeeklyPlanEntryRow) => {
    if (classifyPlanEntryRuntimeSurface(entry) === 'legacy_guided_workout') {
      await openLegacyGuidedWorkout(entry);
      return;
    }
    await openWorkoutDetail(entry);
  }, [openLegacyGuidedWorkout, openWorkoutDetail]);

  const todayBoxingSnapshot = useMemo(() => getBoxingSnapshotFromWeeklyPlanEntry(todayPlanEntry), [todayPlanEntry]);
  const todayBoxingMeta = useMemo(() => todayPlanEntry ? boxingEntryDisplayMeta(todayPlanEntry) : null, [todayPlanEntry]);
  const weekBoxingSnapshot = useMemo(
    () => todayBoxingSnapshot ?? weeklyEntries.map(getBoxingSnapshotFromWeeklyPlanEntry).find((snapshot): snapshot is BoxingGeneratedPlanEntrySnapshot => Boolean(snapshot)) ?? null,
    [todayBoxingSnapshot, weeklyEntries],
  );
  const contextualTodayActivities = useMemo(() => todayActivities.filter((activity) => !isGuidedEngineActivityType(activity.activity_type)), [todayActivities]);
  const weightData = useMemo(() => buildWeightData(checkins), [checkins]);
  const sleepData = useMemo(() => buildSleepData(checkins), [checkins]);
  const trainingLoadData = useMemo(() => buildTrainingLoadData(sessions), [sessions]);
  const acwrData = useMemo(() => computeACWRTimeSeries(sessions), [sessions]);
  const checkinDates = useMemo(() => new Set(checkins.map((checkin) => checkin.date)), [checkins]);
  const floorVM = useMemo(() => buildTrainingFloorViewModel(prescription as any, dailyAthleteSummary), [prescription, dailyAthleteSummary]);

  const todaySessionLabel = useMemo(() => {
    if (todayBoxingMeta) return todayBoxingMeta.title;
    if (todayPlanEntry) return getWorkoutFocusLabel(
      todayPlanEntry.focus,
      todayPlanEntry.session_type,
      todayPlanEntry.prescription_snapshot,
      todayPlanEntry.sc_session_family,
    );
    if (prescription) return getSessionFamilyLabel({ workoutType: prescription.workoutType, focus: prescription.focus, prescription: prescription as any });
    if (contextualTodayActivities.length > 0) return formatActivityLabel(contextualTodayActivities[0]);
    return null;
  }, [todayBoxingMeta, todayPlanEntry, prescription, contextualTodayActivities]);

  const todaySummary = useMemo(() => buildTrainTodaySummary({
    floorVM,
    sessionLabel: todaySessionLabel,
    targetIntensity: todayPlanEntry?.target_intensity ?? null,
    durationMin: todayPlanEntry?.estimated_duration_min ?? prescription?.estimatedDurationMin ?? null,
    supportSession: todayBoxingSnapshot && !todayBoxingSnapshot.protectedAnchor ? todayBoxingSnapshot : null,
  }), [floorVM, todaySessionLabel, todayPlanEntry?.target_intensity, todayPlanEntry?.estimated_duration_min, prescription?.estimatedDurationMin, todayBoxingSnapshot]);

  const heroToneStyles = getHeroToneStyles(todaySummary.effortTone);
  const hasStructuredToday = Boolean(todayPlanEntry || prescription);
  const hasPlannedSupportSession = Boolean(todayPlanEntry && todayBoxingSnapshot && !todayBoxingSnapshot.protectedAnchor);
  const showTodayHero = hasStructuredToday && !hasPlannedSupportSession;
  const showEmptyPlan = !hasStructuredToday && contextualTodayActivities.length === 0 && weeklyEntries.length === 0;
  const primaryActionLabel = todayPlanEntry?.status === 'completed'
    ? 'View workout details'
    : todayPlanEntry?.status === 'skipped'
      ? 'Review today\'s plan'
      : hasStructuredToday
        ? 'Start session'
        : weeklyEntries.length === 0
          ? 'Set up plan'
          : 'Open training';

  const heroBadgeLabel = todayPlanEntry?.status === 'completed'
    ? 'Done today'
    : floorVM.isDeload
      ? 'Lighter day'
      : todaySummary.effortTone === 'push'
        ? 'Harder day'
        : 'Today';

  const handlePrimaryAction = useCallback(() => {
    if (todayPlanEntry) {
      if (todayPlanEntry.status === 'completed' || todayPlanEntry.status === 'skipped') { void openWorkoutDetail(todayPlanEntry); return; }
      void openTrainingEntry(todayPlanEntry); return;
    }
    if (prescription) { void openLegacyGuidedWorkout(null); return; }
    if (weeklyEntries.length === 0) { parentNavigation?.navigate('Plan', { screen: 'WeeklyPlanSetup' }); return; }
    parentNavigation?.navigate('Plan');
  }, [todayPlanEntry, prescription, weeklyEntries.length, parentNavigation, openLegacyGuidedWorkout, openTrainingEntry, openWorkoutDetail]);

  const renderShell = (children: React.ReactNode) => (
    <ScreenWrapper style={styles.screenShell} useSafeArea={true}>
      <ImageBackground
        source={TRAIN_BACKGROUND}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.backgroundOverlay} />
        {children}
      </ImageBackground>
    </ScreenWrapper>
  );

  if (loading) {
    return renderShell(
      <>
        <View style={styles.header}>
          <SkeletonLoader width={72} height={18} shape="rect" style={{ borderRadius: RADIUS.sm }} />
          <SkeletonLoader width="68%" height={38} shape="rect" style={{ marginTop: SPACING.md, borderRadius: RADIUS.lg }} />
          <SkeletonLoader width="100%" height={46} shape="rect" style={{ marginTop: SPACING.md, borderRadius: RADIUS.lg }} />
        </View>
        <View style={styles.content}>
          <SkeletonLoader width="100%" height={110} shape="rect" style={{ borderRadius: RADIUS.xl, marginBottom: SPACING.md }} />
          <SkeletonLoader width="100%" height={280} shape="rect" style={{ borderRadius: RADIUS.xl, marginBottom: SPACING.md }} />
          <SkeletonLoader width="100%" height={120} shape="rect" style={{ borderRadius: RADIUS.xl }} />
        </View>
      </>,
    );
  }

  return renderShell(
    <>
      <View style={styles.header}>
        <ScreenHeader
          kicker="Train"
          title={activeTab === 'today' ? 'Today' : formatWorkoutTabLabel(activeTab)}
          subtitle={activeTab === 'today' ? 'Start or review today\'s training' : 'Your week and progress'}
          rightAction={(
            <View style={styles.headerActions}>
              <HeaderAction icon="calendar-week" label="Plan" onPress={() => parentNavigation?.navigate('Plan')} />
              <HeaderAction icon="dumbbell" label="Gym" onPress={() => navigation.navigate('GymProfiles')} />
            </View>
          )}
        >
          <View style={styles.tabBar}>
            {WORKOUT_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <AnimatedPressable
                  key={tab}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatWorkoutTabLabel(tab)} training tab`}
                  accessibilityState={{ selected: active }}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{formatWorkoutTabLabel(tab)}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </ScreenHeader>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xxxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} colors={[themeColor]} />}
      >
        {activeTab === 'today' && (
          <View style={styles.tabStack}>
            {initialLoadError ? <StateCard title="We couldn't load Train right now" body={initialLoadError} actionLabel="Try again" onPress={() => { void loadData(true); }} /> : null}
            {!initialLoadError && showEmptyPlan ? (
              <Animated.View entering={FadeInDown.delay(40).duration(300).springify()}>
                <EmptyPlanCard onPress={() => parentNavigation?.navigate('Plan', { screen: 'WeeklyPlanSetup' })} />
              </Animated.View>
            ) : null}
            {!initialLoadError ? (
              <Animated.View entering={FadeInDown.delay(45).duration(ANIMATION.slow).springify()}>
                <UnifiedJourneySummaryCard
                  summary={performanceContext}
                  compact
                  showBodyMass={Boolean(performanceContext.bodyMass)}
                  variant="todayCommand"
                />
              </Animated.View>
            ) : null}
            {!initialLoadError && showTodayHero ? (
              <Animated.View entering={FadeInDown.delay(70).duration(300).springify()}>
                <Card
                  style={[styles.heroCard, { borderColor: heroToneStyles.borderColor }]}
                  backgroundTone="workoutFloor"
                  backgroundScrimColor="rgba(10, 10, 10, 0.62)"
                >
                  <View style={styles.heroTopRow}>
                    <View style={[styles.heroBadge, { backgroundColor: heroToneStyles.badgeBackground }]}>
                      <MaterialCommunityIcons name="flash" size={13} color={heroToneStyles.badgeColor} />
                      <Text style={[styles.heroBadgeText, { color: heroToneStyles.badgeColor }]}>{heroBadgeLabel}</Text>
                    </View>
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
                  {todaySummary.guardrails.length > 0 ? (
                    <View style={styles.guardrailsCard}>
                      <Text style={styles.guardrailsTitle}>Know before you train</Text>
                      {todaySummary.guardrails.map((item) => (
                        <View key={item} style={styles.guardrailRow}>
                          <View style={styles.guardrailDot} />
                          <Text style={styles.guardrailText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <AnimatedPressable accessibilityRole="button" accessibilityLabel={primaryActionLabel} style={styles.primaryButton} onPress={handlePrimaryAction}>
                    <MaterialCommunityIcons name="play" size={17} color={COLORS.text.inverse} />
                    <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
                  </AnimatedPressable>
                  {prescription ? (
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={showWorkoutDetails ? 'Hide workout details' : 'View workout details'}
                      style={styles.secondaryLink}
                      onPress={() => setShowWorkoutDetails((value) => !value)}
                    >
                      <Text style={styles.secondaryLinkText}>{showWorkoutDetails ? 'Hide workout details' : 'View workout details'}</Text>
                    </AnimatedPressable>
                  ) : null}
                </Card>
              </Animated.View>
            ) : null}
            {!initialLoadError && showWorkoutDetails && prescription ? (
              <Animated.View entering={FadeInDown.delay(60).duration(280).springify()}>
                <WorkoutPrescriptionSection prescription={prescription} themeColor={themeColor} showStartButton={false} />
              </Animated.View>
            ) : null}
            {!initialLoadError && todayPlanEntry && hasPlannedSupportSession && todayBoxingSnapshot ? (
              <Animated.View entering={FadeInDown.delay(70).duration(280).springify()}>
                <PlannedSupportSessionCard
                  entry={todayPlanEntry}
                  snapshot={todayBoxingSnapshot}
                  onOpen={() => { void openWorkoutDetail(todayPlanEntry); }}
                />
              </Animated.View>
            ) : null}
            {!initialLoadError && contextualTodayActivities.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(90).duration(280).springify()}>
                <Card
                  title="Other plans today"
                  subtitle="Also on your calendar"
                  backgroundTone="schedule"
                  backgroundScrimColor="rgba(10, 10, 10, 0.72)"
                  style={styles.anchorsCard}
                >
                  <View style={styles.alsoTodayList}>
                    {contextualTodayActivities.map((activity, index) => (
                      <View key={activity.id} style={[styles.alsoTodayRow, index === contextualTodayActivities.length - 1 && styles.alsoTodayRowLast]}>
                        <View style={styles.alsoTodayTimeColumn}><Text style={styles.alsoTodayTime}>{formatActivityTime(activity.start_time) ?? 'Any time'}</Text></View>
                        <View style={styles.alsoTodayCopy}>
                          <Text style={styles.alsoTodayLabel}>{formatActivityLabel(activity)}</Text>
                          <Text style={styles.alsoTodayMeta}>{activity.estimated_duration_min} min{activity.actual_rpe ?? activity.expected_intensity ? ` / Effort ${activity.actual_rpe ?? activity.expected_intensity}/10` : ''}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              </Animated.View>
            ) : null}
            {!initialLoadError && weekBoxingSnapshot ? (
              <Animated.View entering={FadeInDown.delay(105).duration(260).springify()}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={showWeekContext ? 'Hide why this week' : 'Show why this week'}
                  style={styles.weekContextToggle}
                  onPress={() => setShowWeekContext((value) => !value)}
                >
                  <Text style={styles.weekContextToggleText}>{showWeekContext ? 'Hide why this week' : 'Show why this week'}</Text>
                  <MaterialCommunityIcons name={showWeekContext ? 'chevron-up' : 'chevron-down'} size={17} color={COLORS.text.secondary} />
                </AnimatedPressable>
              </Animated.View>
            ) : null}
            {!initialLoadError && weekBoxingSnapshot && showWeekContext ? (
              <Animated.View entering={FadeInDown.delay(120).duration(280).springify()}>
                <AthleteSupportWeekCard snapshot={weekBoxingSnapshot} compact={hasPlannedSupportSession} />
              </Animated.View>
            ) : null}
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
      </ScrollView>
    </>,
  );
}

const styles = StyleSheet.create({
  screenShell: {
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    opacity: 0.72,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 10, 0.75)',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerBtn: {
    minHeight: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.30)',
    backgroundColor: 'rgba(10, 10, 10, 0.46)',
    paddingHorizontal: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  headerBtnText: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 10, 0.54)',
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: SPACING.sm,
  },
  tab: {
    flex: 1,
    minHeight: TAP_TARGETS.plan.min,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  tabTextActive: {
    color: COLORS.text.inverse,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  tabStack: {
    gap: SPACING.md,
  },
  heroCard: {
    borderWidth: 1.4,
    backgroundColor: 'rgba(10, 10, 10, 0.66)',
    ...SHADOWS.cardElevated,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  heroBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroDuration: {
    flexShrink: 0,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  heroSessionLabel: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    lineHeight: 34,
    letterSpacing: 0,
  },
  heroGoal: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 24,
    marginTop: SPACING.sm,
  },
  heroReason: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: SPACING.xs,
  },
  effortCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.09)',
  },
  effortLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  effortTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  effortBody: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
    marginTop: 4,
  },
  guardrailsCard: {
    backgroundColor: 'rgba(245, 245, 240, 0.08)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.10)',
  },
  guardrailsTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guardrailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  guardrailDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginTop: 6,
  },
  guardrailText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 54,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    ...SHADOWS.colored.accent,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.inverse,
  },
  secondaryLink: {
    minHeight: TAP_TARGETS.plan.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },
  secondaryLinkText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  supportOuterCard: {
    borderColor: 'rgba(212, 175, 55, 0.24)',
  },
  supportSessionStack: {
    gap: SPACING.sm,
  },
  supportMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  supportMetaPill: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  supportHeadline: {
    fontSize: 19,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    lineHeight: 25,
  },
  supportBody: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  supportFuel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  supportAttachedState: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  anchorsCard: {
    borderColor: 'rgba(245, 245, 240, 0.14)',
  },
  alsoTodayList: {
    marginTop: SPACING.xs,
  },
  alsoTodayRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  alsoTodayRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  alsoTodayTimeColumn: {
    width: 78,
  },
  alsoTodayTime: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  alsoTodayCopy: {
    flex: 1,
    minWidth: 0,
  },
  alsoTodayLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  alsoTodayMeta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  weekContextToggle: {
    minHeight: TAP_TARGETS.plan.min,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(10, 10, 10, 0.42)',
  },
  weekContextToggleText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  weekContextCard: {
    borderColor: COLORS.borderLight,
  },
  intelligenceStack: {
    gap: SPACING.sm,
  },
  intelligenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  intelligenceText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  intelligenceMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  intelligenceMeta: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  intelligenceNote: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    lineHeight: 17,
  },
  weekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(10, 10, 10, 0.64)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  weekCardLeft: {
    width: 64,
  },
  weekCardDay: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  weekCardDate: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  weekCardCenter: {
    flex: 1,
    minWidth: 0,
  },
  weekCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  weekCardFocus: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  weekCardMore: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  weekCardMeta: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 3,
  },
  weekCardNote: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  weekStatusChip: {
    maxWidth: 82,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
  },
  weekStatusChipText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planSettingsButton: {
    minHeight: TAP_TARGETS.plan.min,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.24)',
    backgroundColor: 'rgba(10, 10, 10, 0.36)',
  },
  planSettingsButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  tabLoadingState: {
    gap: SPACING.md,
  },
  stateOuterCard: {
    borderColor: COLORS.borderLight,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  stateTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: 26,
  },
  stateBody: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  stateActionButton: {
    minHeight: 48,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  stateActionButtonText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
});
