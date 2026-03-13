import React from 'react';
import { Alert, Modal, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { HeroHeader } from '../components/HeroHeader';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { COLORS, RADIUS, SPACING, ANIMATION } from '../theme/theme';
import { IconRestaurant, IconActivity, IconFire, IconCalendar } from '../components/icons';
import { DashboardNutritionCard } from '../components/DashboardNutritionCard';
import { DailyMissionCard } from '../components/DailyMissionCard';
import { TrainingLoadChartCard } from '../components/TrainingLoadChartCard';
import { ActionGridItem } from '../components/ActionGridItem';
import { PrescriptionCard } from '../components/PrescriptionCard';
import { WorkoutCard } from '../components/WorkoutCard';
import { WeightTrendCard } from '../components/WeightTrendCard';
import { SafetyStatusIndicator } from '../components/SafetyStatusIndicator';
import { ActivityCard } from '../components/ActivityCard';

import type { DailyCutProtocolRow, ScheduledActivityRow, WeightCutPlanRow } from '../../lib/engine/types';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import {
  getAndSyncFirstRunGuidanceState,
  markFirstRunGuidanceIntroSeen,
  type FirstRunGuidanceState,
} from '../../lib/api/firstRunGuidanceService';
import { applySameDayOverride } from '../../lib/api/scheduleService';
import { supabase } from '../../lib/supabase';
import { todayLocalDate } from '../../lib/utils/date';
import { useDashboardData } from '../hooks/useDashboardData';
import { styles } from './DashboardScreen.styles';

export function DashboardScreen() {
  const navigation = useNavigation<any>();

  const [activeCutPlan, setActiveCutPlan] = React.useState<WeightCutPlanRow | null>(null);
  const [todayCutProtocol, setTodayCutProtocol] = React.useState<DailyCutProtocolRow | null>(null);
  const [firstRunGuidance, setFirstRunGuidance] = React.useState<FirstRunGuidanceState | null>(null);
  const [showFirstRunModal, setShowFirstRunModal] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const today = todayLocalDate();
      const { data: plan } = await supabase
        .from('weight_cut_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      setActiveCutPlan(plan ?? null);

      if (plan) {
        const { data: proto } = await supabase
          .from('daily_cut_protocols')
          .select('*')
          .eq('plan_id', plan.id)
          .eq('date', today)
          .maybeSingle();
        setTodayCutProtocol(proto ?? null);
      }
    })();
  }, []);

  const loadFirstRunGuidance = React.useCallback(async () => {
    try {
      const userId = await getActiveUserId();
      if (!userId) {
        setFirstRunGuidance(null);
        setShowFirstRunModal(false);
        return;
      }

      const next = await getAndSyncFirstRunGuidanceState(userId);
      setFirstRunGuidance(next);
      setShowFirstRunModal(next.status === 'pending' && !next.introSeenAt);
    } catch (error) {
      console.error('Dashboard first-run guidance error:', error);
    }
  }, []);

  React.useEffect(() => {
    void loadFirstRunGuidance();
  }, [loadFirstRunGuidance]);

  useFocusEffect(
    React.useCallback(() => {
      void loadFirstRunGuidance();
    }, [loadFirstRunGuidance]),
  );

  const {
    loading,
    refreshing,
    onRefresh,
    acwr,
    biology,
    hydration,
    checkinDone,
    sessionDone,
    sleepQuality,
    morningWeight,
    todayActivities,
    currentLevel,
    prescriptionMessage,
    workoutPrescription,
    weightTrend,
    nutritionTargets,
    actualNutrition,
    currentLedger,
    campStatusLabel,
    campRisk,
    dailyMission,
  } = useDashboardData();

  const targetCalories = todayCutProtocol ? todayCutProtocol.prescribed_calories : (nutritionTargets?.adjustedCalories ?? 0);
  const targetProtein = todayCutProtocol ? todayCutProtocol.prescribed_protein : (nutritionTargets?.protein ?? (currentLedger?.prescribed_protein ?? 150));
  const targetCarbs = todayCutProtocol ? todayCutProtocol.prescribed_carbs : (nutritionTargets?.carbs ?? (currentLedger?.prescribed_carbs ?? 200));
  const targetFat = todayCutProtocol ? todayCutProtocol.prescribed_fat : (nutritionTargets?.fat ?? (currentLedger?.prescribed_fats ?? 60));
  const targetWater = todayCutProtocol ? todayCutProtocol.water_target_oz : (hydration?.dailyWaterOz ?? 100);

  const readinessScore = currentLevel === 'Prime' ? 92 : currentLevel === 'Caution' ? 58 : 25;
  const isDemoMode = (acwr?.chronic || 0) === 0 && (acwr?.acute || 0) === 0;
  const chronic = isDemoMode ? 450 : (acwr?.chronic || 0);
  const acute = isDemoMode ? 380 : (acwr?.acute || 0);
  const readinessBar = checkinDone ? (currentLevel === 'Prime' ? 100 : currentLevel === 'Caution' ? 65 : 30) : 0;
  const trainingLoadData = [
    { x: 0, fitness: chronic, fatigue: 0, readiness: 0 },
    { x: 1, fitness: 0, fatigue: acute, readiness: 0 },
    { x: 2, fitness: 0, fatigue: 0, readiness: readinessBar },
  ];
  const D = 50;

  const openPlanScreen = React.useCallback((screen: string, params?: Record<string, unknown>) => {
    navigation.navigate('Plan', { screen, params });
  }, [navigation]);

  const handleRefresh = React.useCallback(() => {
    onRefresh();
    void loadFirstRunGuidance();
  }, [onRefresh, loadFirstRunGuidance]);

  const handleScheduleOverride = async (activity: ScheduledActivityRow, type: 'lighter' | 'harder' | 'skipped') => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return;
    }

    try {
      await applySameDayOverride(session.user.id, activity, { type });
      handleRefresh();
    } catch (error) {
      console.error('Dashboard override error:', error);
      Alert.alert('Update failed', 'Could not update this session. Please try again.');
    }
  };

  const handleLogActivity = (activity: ScheduledActivityRow) => {
    if (activity.activity_type === 'sc') {
      openPlanScreen('WorkoutHome');
      return;
    }

    navigation.navigate('ActivityLog', { activityId: activity.id, date: activity.date });
  };

  const dismissFirstRunModal = React.useCallback(async () => {
    setShowFirstRunModal(false);

    if (firstRunGuidance?.status !== 'pending' || firstRunGuidance.introSeenAt) {
      return;
    }

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      await markFirstRunGuidanceIntroSeen(userId);
      setFirstRunGuidance((prev) => (
        prev
          ? {
            ...prev,
            introSeenAt: new Date().toISOString(),
          }
          : prev
      ));
    } catch (error) {
      console.error('Dashboard first-run intro save error:', error);
    }
  }, [firstRunGuidance?.introSeenAt, firstRunGuidance?.status]);

  const openFirstRunStep = React.useCallback((step: 'checkin' | 'workout' | 'nutrition') => {
    if (step === 'checkin') {
      navigation.navigate('Log');
      return;
    }

    if (step === 'workout') {
      openPlanScreen('WorkoutHome');
      return;
    }

    openPlanScreen('NutritionHome');
  }, [navigation, openPlanScreen]);

  const checklistSteps = firstRunGuidance ? [
    {
      id: 'checkin' as const,
      title: 'Log your first check-in',
      subtitle: 'Set today\'s readiness baseline so recommendations make sense.',
      done: firstRunGuidance.progress.checkinDone,
    },
    {
      id: 'workout' as const,
      title: 'Complete your first training session',
      subtitle: 'Run your guided S&C flow once to unlock training history.',
      done: firstRunGuidance.progress.workoutDone,
    },
    {
      id: 'nutrition' as const,
      title: 'Log your first meal',
      subtitle: 'Track one meal to activate nutrition feedback loops.',
      done: firstRunGuidance.progress.nutritionDone,
    },
  ] : [];

  const shouldShowFirstRunChecklist = firstRunGuidance?.status === 'pending';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHero}>
          <SkeletonLoader width="60%" height={22} shape="text" style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} shape="text" style={{ marginBottom: 24 }} />
          <SkeletonLoader width={80} height={56} shape="rect" style={{ alignSelf: 'center', marginBottom: 16 }} />
          <SkeletonLoader width="50%" height={8} shape="text" style={{ alignSelf: 'center' }} />
        </View>
        <View style={styles.content}>
          <SkeletonLoader width="100%" height={80} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.md }} />
          <SkeletonLoader width="100%" height={140} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.md }} />
          <SkeletonLoader width="100%" height={160} borderRadius={RADIUS.xl} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={showFirstRunModal}
        transparent
        animationType="fade"
        onRequestClose={() => { void dismissFirstRunModal(); }}
      >
        <View style={styles.firstRunModalOverlay}>
          <View style={styles.firstRunModalCard}>
            <Text style={styles.firstRunModalKicker}>WELCOME</Text>
            <Text style={styles.firstRunModalTitle}>Start Here in 3 Quick Wins</Text>
            <Text style={styles.firstRunModalBody}>
              We will keep this simple. Complete your first check-in, first session, and first meal log.
            </Text>

            <AnimatedPressable
              style={styles.firstRunModalPrimaryButton}
              onPress={() => {
                void dismissFirstRunModal();
                openFirstRunStep('checkin');
              }}
            >
              <Text style={styles.firstRunModalPrimaryText}>Start Step 1</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.firstRunModalSecondaryButton}
              onPress={() => { void dismissFirstRunModal(); }}
            >
              <Text style={styles.firstRunModalSecondaryText}>Not now</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <HeroHeader
          greeting={getGreeting()}
          phase={
            activeCutPlan && todayCutProtocol
              ? `${todayCutProtocol.cut_phase === 'fight_week_cut' ? 'Water Cut' : todayCutProtocol.cut_phase.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} · ${todayCutProtocol.days_to_weigh_in === 0 ? 'Weigh-in Today!' : `${todayCutProtocol.days_to_weigh_in} days out`}`
              : campStatusLabel
          }
          readinessScore={readinessScore}
          readinessLabel={currentLevel}
          acwr={acwr?.ratio}
          sleep={sleepQuality ?? undefined}
          weight={morningWeight ? `${morningWeight} lb` : undefined}
          weightTrend={
            weightTrend
              ? weightTrend.weeklyVelocityLbs < -0.1
                ? 'down'
                : weightTrend.weeklyVelocityLbs > 0.1
                  ? 'up'
                  : 'stable'
              : undefined
          }
        />

        <View style={styles.content}>
          {dailyMission ? (
            <Animated.View entering={FadeInDown.delay(D * 0.6).duration(ANIMATION.slow).springify()}>
              <DailyMissionCard mission={dailyMission} />
            </Animated.View>
          ) : null}

          <PrescriptionCard message={prescriptionMessage} entering enteringDelay={D} />

          {shouldShowFirstRunChecklist && firstRunGuidance ? (
            <Animated.View entering={FadeInDown.delay(D).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.md }}>
              <Card>
                <View style={styles.firstRunHeaderRow}>
                  <Text style={styles.firstRunKicker}>START HERE</Text>
                  <Text style={styles.firstRunProgress}>
                    {firstRunGuidance.progress.completedCount}/{firstRunGuidance.progress.totalCount} complete
                  </Text>
                </View>
                <Text style={styles.firstRunTitle}>Your first 3 wins</Text>
                <Text style={styles.firstRunSubtitle}>
                  Follow these in order once, then Athleticore runs on autopilot.
                </Text>

                <View style={styles.firstRunStepList}>
                  {checklistSteps.map((step, idx) => (
                    <AnimatedPressable
                      key={step.id}
                      style={styles.firstRunStepRow}
                      onPress={() => openFirstRunStep(step.id)}
                    >
                      <View style={[styles.firstRunStepBadge, step.done && styles.firstRunStepBadgeDone]}>
                        <Text style={[styles.firstRunStepBadgeText, step.done && styles.firstRunStepBadgeTextDone]}>
                          {step.done ? '✓' : `${idx + 1}`}
                        </Text>
                      </View>
                      <View style={styles.firstRunStepCopy}>
                        <Text style={styles.firstRunStepTitle}>{step.title}</Text>
                        <Text style={styles.firstRunStepSubtitle}>{step.subtitle}</Text>
                      </View>
                      <Text style={styles.firstRunStepCta}>{step.done ? 'Done' : 'Open'}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </Card>
            </Animated.View>
          ) : null}

          {campRisk ? (
            <Animated.View entering={FadeInDown.delay(D * 1.2).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.md }}>
              <Card>
                <Text style={[styles.biologyTitle, { color: getCampRiskColor(campRisk.level) }]}>
                  Camp Risk {campRisk.score}/100 · {formatCampRiskLevel(campRisk.level)}
                </Text>
                <Text style={[styles.biologyDesc, { marginTop: SPACING.xs }]}>
                  {campRisk.projectedMakeWeightStatus}
                </Text>
                <Text style={[styles.biologyDesc, { marginTop: SPACING.xs }]}>
                  {campRisk.drivers[0]}
                </Text>
              </Card>
            </Animated.View>
          ) : null}

          {todayCutProtocol && (todayCutProtocol.safety_flags as any[])?.filter((f: any) => f.severity === 'danger').length > 0 && (
            <Animated.View entering={FadeInDown.delay(D * 1.5).duration(ANIMATION.slow).springify()}>
              <SafetyStatusIndicator flags={todayCutProtocol.safety_flags as any[]} />
            </Animated.View>
          )}

          {todayActivities.length > 0 && (
            <Animated.View entering={FadeInDown.delay(D * 1.8).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.md }}>
              <SectionHeader title="Today's Commitments" actionLabel="Day View" onAction={() => navigation.navigate('DayDetail', { date: todayLocalDate() })} />
              {todayActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onPress={() => handleLogActivity(activity)}
                  onLog={() => handleLogActivity(activity)}
                  onSkip={() => handleScheduleOverride(activity, 'skipped')}
                  onEdit={() => navigation.navigate('DayDetail', { date: activity.date })}
                  onLighter={() => handleScheduleOverride(activity, 'lighter')}
                  onHarder={() => handleScheduleOverride(activity, 'harder')}
                  showActions
                />
              ))}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(D * 2).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.md }}>
            <WorkoutCard
              prescription={workoutPrescription}
              isCompleted={sessionDone}
              onPress={() => openPlanScreen('WorkoutHome')}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(D * 4).duration(ANIMATION.slow).springify()}>
            <SectionHeader title="Training Load" />
            <TrainingLoadChartCard trainingLoadData={trainingLoadData} acute={acute} chronic={chronic} acwr={acwr} />
          </Animated.View>

          {weightTrend && (
            <Animated.View entering={FadeInDown.delay(D * 4.5).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.lg }}>
              <SectionHeader title="Weight" />
              <WeightTrendCard
                trend={weightTrend}
                baseWeight={weightTrend.currentWeight - weightTrend.totalChangeLbs}
                targetWeight={weightTrend.remainingLbs > 0 ? weightTrend.currentWeight - weightTrend.remainingLbs : null}
              />
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(D * 5).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.lg }}>
            <SectionHeader title="Nutrition" actionLabel="Details" onAction={() => openPlanScreen('NutritionHome')} />
            <AnimatedPressable onPress={() => openPlanScreen('NutritionHome')}>
              <DashboardNutritionCard
                actualNutrition={actualNutrition}
                targets={{
                  calories: targetCalories,
                  protein: targetProtein,
                  carbs: targetCarbs,
                  fat: targetFat,
                  water: targetWater,
                }}
                cutProtocol={activeCutPlan ? todayCutProtocol : undefined}
              />
            </AnimatedPressable>
          </Animated.View>

          {biology && (
            <Animated.View entering={FadeInDown.delay(D * 6).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.lg }}>
              <Card>
                <View style={styles.biologyRow}>
                  <View style={styles.biologyIcon}>
                    <IconFire size={22} color={COLORS.chart.accent} />
                  </View>
                  <View style={styles.biologyInfo}>
                    <Text style={styles.biologyTitle}>Biology Adaptation</Text>
                    <Text style={styles.biologyDesc}>{biology.message}</Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(D * 7).duration(ANIMATION.slow).springify()} style={{ marginTop: SPACING.lg }}>
            <SectionHeader title="Quick Actions" />
            <View style={styles.actionGrid}>
              <ActionGridItem
                icon={<IconActivity size={20} color={checkinDone ? COLORS.success : COLORS.accent} />}
                iconBg={checkinDone ? COLORS.success + '15' : COLORS.accentLight}
                label="Check-in"
                sub="Morning readiness"
                done={checkinDone}
                onPress={() => navigation.navigate('Log')}
              />
              <ActionGridItem
                icon={<IconFire size={20} color={sessionDone ? COLORS.success : COLORS.chart.accent} />}
                iconBg={sessionDone ? COLORS.success + '15' : COLORS.readiness.cautionLight}
                label="Train"
                sub="Start guided work"
                done={sessionDone}
                onPress={() => openPlanScreen('WorkoutHome')}
              />
              <ActionGridItem
                icon={<IconRestaurant size={20} color={COLORS.chart.protein} />}
                iconBg={COLORS.chart.protein + '15'}
                label="Eat"
                sub="Track meals"
                onPress={() => openPlanScreen('NutritionHome')}
              />
              <ActionGridItem
                icon={<IconCalendar size={20} color={COLORS.chart.readiness} />}
                iconBg={COLORS.chart.readiness + '15'}
                label="Plan"
                sub="Review your week"
                onPress={() => navigation.navigate('Plan')}
              />
            </View>
          </Animated.View>

          <View style={{ height: SPACING.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

function formatCampRiskLevel(level: 'low' | 'moderate' | 'high' | 'critical'): string {
  if (level === 'critical') return 'Critical';
  if (level === 'high') return 'High';
  if (level === 'moderate') return 'Moderate';
  return 'Low';
}

function getCampRiskColor(level: 'low' | 'moderate' | 'high' | 'critical'): string {
  if (level === 'critical') return COLORS.error;
  if (level === 'high') return COLORS.readiness.depleted;
  if (level === 'moderate') return COLORS.warning;
  return COLORS.success;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
