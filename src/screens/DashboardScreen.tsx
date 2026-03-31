import React from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { Card } from "../components/Card";
import { SectionHeader } from "../components/SectionHeader";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { COLORS, RADIUS, SPACING, ANIMATION } from "../theme/theme";
import {
  IconRestaurant,
  IconActivity,
  IconFire,
  IconCalendar,
} from "../components/icons";
import { DashboardNutritionCard } from "../components/DashboardNutritionCard";
import { DailyMissionCard } from "../components/DailyMissionCard";
import {
  buildCompassViewModel,
  getAllDecisionReasons,
} from "../../lib/engine/presentation";
import { TrainingLoadChartCard } from "../components/TrainingLoadChartCard";
import { PrescriptionCard } from "../components/PrescriptionCard";
import { WeightTrendCard } from "../components/WeightTrendCard";
import { SafetyStatusIndicator } from "../components/SafetyStatusIndicator";
import { ActivityCard } from "../components/ActivityCard";
import { ActiveCampBanner } from "../components/ActiveCampBanner";
import { RadialProgress } from "../components/RadialProgress";
import { ScreenWrapper } from "../components/ScreenWrapper";

import type {
  DailyCutProtocolRow,
  ScheduledActivityRow,
  WeightCutPlanRow,
} from "../../lib/engine/types";
import { getActiveUserId } from "../../lib/api/athleteContextService";
import {
  getAndSyncFirstRunGuidanceState,
  markFirstRunGuidanceIntroSeen,
  type FirstRunGuidanceState,
} from "../../lib/api/firstRunGuidanceService";
import { applySameDayOverride } from "../../lib/api/scheduleService";
import { supabase } from "../../lib/supabase";
import { todayLocalDate } from "../../lib/utils/date";
import { logError } from "../../lib/utils/logger";
import { useDashboardData } from "../hooks/useDashboardData";
import { buildTodayHomeState } from "../hooks/dashboard/buildTodayHomeState";
import { styles } from "./DashboardScreen.styles";
import { getGuidedWorkoutContext } from "../../lib/api/fightCampService";
import { isGuidedEngineActivityType } from "../../lib/engine/sessionOwnership";

type DashboardPhaseControlState = {
  currentModeLabel: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
};

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [activeCutPlan, setActiveCutPlan] =
    React.useState<WeightCutPlanRow | null>(null);
  const [todayCutProtocol, setTodayCutProtocol] =
    React.useState<DailyCutProtocolRow | null>(null);
  const [firstRunGuidance, setFirstRunGuidance] =
    React.useState<FirstRunGuidanceState | null>(null);
  const [showFirstRunModal, setShowFirstRunModal] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const today = todayLocalDate();
      const { data: plan } = await supabase
        .from("weight_cut_plans")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();

      setActiveCutPlan(plan ?? null);

      if (plan) {
        const { data: proto } = await supabase
          .from("daily_cut_protocols")
          .select("*")
          .eq("plan_id", plan.id)
          .eq("date", today)
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
      setShowFirstRunModal(next.status === "pending" && !next.introSeenAt);
    } catch (error) {
      logError("DashboardScreen.loadFirstRunGuidance", error);
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
    hydration,
    checkinDone,
    sessionDone,
    sleepQuality,
    morningWeight,
    todayActivities,
    primaryActivity,
    currentLevel,
    prescriptionMessage,
    workoutPrescription,
    todayPlanEntry,
    weightTrend,
    nutritionTargets,
    actualNutrition,
    currentLedger,
    campStatusLabel,
    campRisk,
    dailyMission,
    goalMode,
    hasActiveFightCamp,
  } = useDashboardData();

  const [showWhyToday, setShowWhyToday] = React.useState(false);
  const compassVM = buildCompassViewModel(
    dailyMission,
    Boolean(workoutPrescription || todayPlanEntry),
    checkinDone,
    sessionDone,
  );

  const homeState = React.useMemo(
    () =>
      buildTodayHomeState({
        acwr,
        hydration,
        checkinDone,
        sessionDone,
        currentLevel,
        workoutPrescription,
        todayPlanEntry,
        todayActivities,
        primaryActivity,
        nutritionTargets,
        actualNutrition,
        currentLedger,
        activeCutPlan,
        todayCutProtocol,
      }),
    [
      acwr,
      hydration,
      checkinDone,
      sessionDone,
      currentLevel,
      workoutPrescription,
      todayPlanEntry,
      todayActivities,
      primaryActivity,
      nutritionTargets,
      actualNutrition,
      currentLedger,
      activeCutPlan,
      todayCutProtocol,
    ],
  );
  const D = 50;

  const openTrainScreen = React.useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate("Train", { screen, params });
    },
    [navigation],
  );

  const openPlanScreen = React.useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate("Plan", { screen, params });
    },
    [navigation],
  );

  const openFuelScreen = React.useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate("Fuel", { screen, params });
    },
    [navigation],
  );

  const openTodayTraining = React.useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    if (todayPlanEntry) {
      const context = await getGuidedWorkoutContext(
        session.user.id,
        todayPlanEntry.date,
      );
      openTrainScreen("GuidedWorkout", {
        weeklyPlanEntryId: todayPlanEntry.id,
        scheduledActivityId: todayPlanEntry.scheduled_activity_id ?? undefined,
        focus: todayPlanEntry.focus ?? undefined,
        availableMinutes: todayPlanEntry.estimated_duration_min,
        readinessState: currentLevel ?? "Prime",
        phase: context.phase,
        fitnessLevel: context.fitnessLevel,
        trainingDate: todayPlanEntry.date,
        isDeloadWeek: todayPlanEntry.is_deload,
        autoStart: true,
        entrySource: "dashboard",
      });
      return;
    }

    if (
      primaryActivity &&
      isGuidedEngineActivityType(primaryActivity.activity_type) &&
      primaryActivity.weekly_plan_entry_id
    ) {
      const context = await getGuidedWorkoutContext(
        session.user.id,
        primaryActivity.date,
      );
      openTrainScreen("GuidedWorkout", {
        weeklyPlanEntryId: primaryActivity.weekly_plan_entry_id,
        scheduledActivityId: primaryActivity.id,
        focus: primaryActivity.custom_label ?? undefined,
        availableMinutes: primaryActivity.estimated_duration_min,
        readinessState: currentLevel ?? "Prime",
        phase: context.phase,
        fitnessLevel: context.fitnessLevel,
        trainingDate: primaryActivity.date,
        autoStart: true,
        entrySource: "dashboard",
      });
      return;
    }

    navigation.navigate("DayDetail", { date: todayLocalDate() });
  }, [
    currentLevel,
    navigation,
    openTrainScreen,
    primaryActivity,
    todayPlanEntry,
  ]);

  const openFightCampSetup = React.useCallback(() => {
    openPlanScreen("WeeklyPlanSetup", {
      initialGoalMode: "fight_camp",
      initialPhaseKey: "objective",
      source: "dashboard",
    });
  }, [openPlanScreen]);

  const openBuildPhaseSetup = React.useCallback(() => {
    openPlanScreen("WeeklyPlanSetup", {
      initialGoalMode: "build_phase",
      initialPhaseKey: "objective",
      source: "dashboard",
    });
  }, [openPlanScreen]);

  const openPlanningSurface = React.useCallback(() => {
    if (homeState.schedule.hasLivePlanningState) {
      openPlanScreen("CalendarMain");
      return;
    }

    openBuildPhaseSetup();
  }, [
    homeState.schedule.hasLivePlanningState,
    openBuildPhaseSetup,
    openPlanScreen,
  ]);

  const handleCompassCTA = React.useCallback(() => {
    switch (compassVM.primaryCTATarget) {
      case "checkin":
        navigation.navigate("Log");
        break;
      case "training":
        void openTodayTraining();
        break;
      case "nutrition":
        openFuelScreen("NutritionHome");
        break;
      case "plan":
        openPlanningSurface();
        break;
    }
  }, [
    compassVM.primaryCTATarget,
    navigation,
    openFuelScreen,
    openPlanningSurface,
    openTodayTraining,
  ]);

  const handleCompassSecondaryCTA = React.useCallback(() => {
    switch (compassVM.secondaryCTATarget) {
      case "checkin":
        navigation.navigate("Log");
        break;
      case "training":
        void openTodayTraining();
        break;
      case "nutrition":
        openFuelScreen("NutritionHome");
        break;
      case "plan":
        openPlanningSurface();
        break;
    }
  }, [
    compassVM.secondaryCTATarget,
    navigation,
    openFuelScreen,
    openPlanningSurface,
    openTodayTraining,
  ]);

  const handleSwitchToBuildPhase = React.useCallback(() => {
    Alert.alert(
      "Switch to Build Phase?",
      "This opens build-phase setup so you can confirm the next goal before ending the current camp.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: openBuildPhaseSetup },
      ],
    );
  }, [openBuildPhaseSetup]);

  const handleRefresh = React.useCallback(() => {
    onRefresh();
    void loadFirstRunGuidance();
  }, [onRefresh, loadFirstRunGuidance]);

  const handleScheduleOverride = async (
    activity: ScheduledActivityRow,
    type: "lighter" | "harder" | "skipped",
  ) => {
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
      logError("DashboardScreen.applyOverride", error);
      Alert.alert(
        "Update failed",
        "Could not update this session. Please try again.",
      );
    }
  };

  const handleLogActivity = (activity: ScheduledActivityRow) => {
    if (
      isGuidedEngineActivityType(activity.activity_type) &&
      activity.weekly_plan_entry_id
    ) {
      void openTodayTraining();
      return;
    }

    navigation.navigate("ActivityLog", {
      activityId: activity.id,
      date: activity.date,
    });
  };

  const dismissFirstRunModal = React.useCallback(async () => {
    setShowFirstRunModal(false);

    if (
      firstRunGuidance?.status !== "pending" ||
      firstRunGuidance.introSeenAt
    ) {
      return;
    }

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      await markFirstRunGuidanceIntroSeen(userId);
      setFirstRunGuidance((prev) =>
        prev
          ? {
              ...prev,
              introSeenAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch (error) {
      logError("DashboardScreen.markIntroSeen", error);
    }
  }, [firstRunGuidance?.introSeenAt, firstRunGuidance?.status]);

  const openFirstRunStep = React.useCallback(
    (step: "checkin" | "workout" | "nutrition") => {
      if (step === "checkin") {
        navigation.navigate("Log");
        return;
      }

      if (step === "workout") {
        void openTodayTraining();
        return;
      }

      openFuelScreen("NutritionHome");
    },
    [navigation, openFuelScreen, openTodayTraining],
  );

  const checklistSteps = firstRunGuidance
    ? [
        {
          id: "checkin" as const,
          title: "Log your first check-in",
          subtitle:
            "Set today's readiness baseline so recommendations make sense.",
          done: firstRunGuidance.progress.checkinDone,
        },
        {
          id: "workout" as const,
          title: "Complete your first training session",
          subtitle: "Run your guided S&C flow once to unlock training history.",
          done: firstRunGuidance.progress.workoutDone,
        },
        {
          id: "nutrition" as const,
          title: "Log your first meal",
          subtitle: "Track one meal to activate nutrition feedback loops.",
          done: firstRunGuidance.progress.nutritionDone,
        },
      ]
    : [];

  const shouldShowFirstRunChecklist = firstRunGuidance?.status === "pending";
  const phaseControl = React.useMemo(
    () => getDashboardPhaseControlState({ goalMode, hasActiveFightCamp }),
    [goalMode, hasActiveFightCamp],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHero}>
          <SkeletonLoader
            width="60%"
            height={22}
            shape="text"
            style={{ marginBottom: 8 }}
          />
          <SkeletonLoader
            width="40%"
            height={14}
            shape="text"
            style={{ marginBottom: 24 }}
          />
          <SkeletonLoader
            width={80}
            height={56}
            shape="rect"
            style={{ alignSelf: "center", marginBottom: 16 }}
          />
        </View>
        <View style={styles.content}>
          <SkeletonLoader
            width="100%"
            height={80}
            borderRadius={RADIUS.xl}
            style={{ marginBottom: SPACING.md }}
          />
          <SkeletonLoader
            width="100%"
            height={140}
            borderRadius={RADIUS.xl}
            style={{ marginBottom: SPACING.md }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <Modal
        visible={showFirstRunModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void dismissFirstRunModal();
        }}
      >
        <View style={styles.firstRunModalOverlay}>
          <View style={styles.firstRunModalCard}>
            <Text style={styles.firstRunModalKicker}>WELCOME</Text>
            <Text style={styles.firstRunModalTitle}>
              Start Here in 3 Quick Wins
            </Text>
            <Text style={styles.firstRunModalBody}>
              We will keep this simple. Complete your first check-in, first
              session, and first meal log.
            </Text>

            <AnimatedPressable
              style={styles.firstRunModalPrimaryButton}
              onPress={() => {
                void dismissFirstRunModal();
                openFirstRunStep("checkin");
              }}
            >
              <Text style={styles.firstRunModalPrimaryText}>Start Step 1</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.firstRunModalSecondaryButton}
              onPress={() => {
                void dismissFirstRunModal();
              }}
            >
              <Text style={styles.firstRunModalSecondaryText}>Not now</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Animated.View 
            entering={FadeInDown.duration(ANIMATION.slow)} 
            style={[styles.heroSection, { paddingTop: insets.top + SPACING.lg }]}
        >
            <View style={styles.heroGreetingRow}>
                <Text style={styles.heroGreeting}>{getGreeting()}</Text>
                <Text style={styles.heroDate}>{todayLocalDate().toUpperCase()}</Text>
            </View>

            <View style={styles.heroMetricsBlock}>
                <View style={styles.readinessMain}>
                    <Text style={styles.readinessLabel}>READINESS</Text>
                    <RadialProgress 
                        progress={homeState.training.readinessScore / 100}
                        size={120}
                        strokeWidth={12}
                        color={getReadinessColor(homeState.training.readinessScore)}
                        trackColor="rgba(255,255,255,0.1)"
                        label={Math.round(homeState.training.readinessScore).toString()}
                        sublabel={currentLevel}
                        textColor="#FFF"
                    />
                </View>
                
                <View style={styles.secondaryMetricsList}>
                    {acwr?.ratio !== undefined && (
                        <View style={styles.secondaryMetricItem}>
                            <Text style={styles.secondaryMetricValue}>{acwr.ratio.toFixed(2)}</Text>
                            <Text style={styles.secondaryMetricLabel}>ACWR</Text>
                        </View>
                    )}
                    {sleepQuality !== undefined && (
                        <View style={styles.secondaryMetricItem}>
                            <Text style={styles.secondaryMetricValue}>{sleepQuality}/5</Text>
                            <Text style={styles.secondaryMetricLabel}>Sleep</Text>
                        </View>
                    )}
                    {morningWeight !== undefined && (
                        <View style={styles.secondaryMetricItem}>
                            <Text style={styles.secondaryMetricValue}>{morningWeight} lb</Text>
                            <Text style={styles.secondaryMetricLabel}>Weight</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.compassCard}>
               <Text style={styles.compassSessionRole}>
                  {compassVM.sessionRoleLabel.toUpperCase()}
               </Text>
               <Text style={styles.compassHeadline}>{compassVM.headline}</Text>
               <Text style={styles.compassSummary}>{compassVM.summaryLine}</Text>
               
               {dailyMission?.decisionTrace?.length ? (
                 <View style={styles.compassReasonRow}>
                   <View style={styles.compassReasonBar} />
                   <Text style={styles.compassReasonText}>{compassVM.reasonSentence}</Text>
                 </View>
               ) : null}

               <AnimatedPressable style={styles.compassPrimaryButton} onPress={handleCompassCTA}>
                  <Text style={styles.compassPrimaryText}>{compassVM.primaryCTALabel}</Text>
               </AnimatedPressable>

               {compassVM.secondaryCTALabel ? (
                  <AnimatedPressable style={styles.compassSecondaryButton} onPress={handleCompassSecondaryCTA}>
                    <Text style={styles.compassSecondaryText}>{compassVM.secondaryCTALabel}</Text>
                  </AnimatedPressable>
               ) : null}

               {dailyMission ? (
                  <AnimatedPressable onPress={() => setShowWhyToday(true)}>
                     <Text style={styles.compassMissionLink}>View Full Mission ›</Text>
                  </AnimatedPressable>
               ) : null}
            </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(D).duration(ANIMATION.slow).springify()} style={styles.quickActionGrid}>
            <AnimatedPressable
                style={[styles.quickActionBlock, { backgroundColor: 'rgba(15, 168, 136, 0.7)' }]} // Glassy Mint
                onPress={() => navigation.navigate("Log")}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconActivity size={24} color="#FFF" />
                </View>
                <Text style={[styles.quickActionLabelBlock, checkinDone && styles.quickActionLabelDoneBlock]}>
                   Check In
                </Text>
            </AnimatedPressable>
            
            <AnimatedPressable
                style={[styles.quickActionBlock, { backgroundColor: 'rgba(99, 102, 241, 0.7)' }]} // Glassy Indigo/Violet
                onPress={() => void openTodayTraining()}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconFire size={24} color="#FFF" />
                </View>
                <Text style={[styles.quickActionLabelBlock, sessionDone && styles.quickActionLabelDoneBlock]}>
                   Train
                </Text>
            </AnimatedPressable>

            <AnimatedPressable
                style={[styles.quickActionBlock, { backgroundColor: 'rgba(245, 158, 11, 0.7)' }]} // Glassy Amber
                onPress={() => openFuelScreen("NutritionHome")}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconRestaurant size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionLabelBlock}>
                   Fuel
                </Text>
            </AnimatedPressable>

            <AnimatedPressable
                style={[styles.quickActionBlock, { backgroundColor: 'rgba(59, 130, 246, 0.7)' }]} // Glassy Blue
                onPress={openPlanningSurface}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconCalendar size={24} color="#FFF" />
                </View>
                <Text style={styles.quickActionLabelBlock}>
                   {homeState.schedule.hasLivePlanningState ? "Calendar" : "Setup"}
                </Text>
            </AnimatedPressable>
        </Animated.View>

        {/* The New Active Camp Banner positioned right below the grid */}
        {hasActiveFightCamp && (
            <Animated.View entering={FadeInDown.delay(D * 1.5).duration(ANIMATION.slow).springify()}>
                <ActiveCampBanner goalMode={goalMode} />
            </Animated.View>
        )}

        <View style={styles.content}>
          {showWhyToday && dailyMission ? (
            <Animated.View
              entering={FadeInDown.delay(D * 0.4)
                .duration(ANIMATION.slow)
                .springify()}
            >
              <Card>
                <AnimatedPressable
                  style={styles.whyTodayHeader}
                  onPress={() => setShowWhyToday((v) => !v)}
                >
                  <Text style={styles.whyTodayTitle}>Mission Context</Text>
                  <Text style={styles.whyTodayChevron}>
                    {showWhyToday ? "▲" : "▼"}
                  </Text>
                </AnimatedPressable>
                {showWhyToday &&
                  getAllDecisionReasons(dailyMission.decisionTrace).map(
                    (reason, idx) => (
                      <View key={idx} style={styles.whyTodayItem}>
                        <Text style={styles.whyTodayItemTitle}>
                          {reason.title}
                        </Text>
                        <Text style={styles.whyTodayItemSentence}>
                          {reason.sentence}
                        </Text>
                      </View>
                    ),
                  )}
              </Card>
              <View style={{ marginTop: SPACING.md }}>
                <DailyMissionCard mission={dailyMission} compact />
              </View>
            </Animated.View>
          ) : !dailyMission ? (
            <PrescriptionCard
              message={prescriptionMessage}
              entering
              enteringDelay={D}
            />
          ) : null}

          {homeState.schedule.contextualActivities.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(D * 1.8)
                .duration(ANIMATION.slow)
                .springify()}
              style={{ marginTop: SPACING.md }}
            >
              <SectionHeader
                title={
                  todayPlanEntry
                    ? "Also on today's schedule"
                    : "Today's schedule"
                }
                actionLabel="View day"
                onAction={() =>
                  navigation.navigate("DayDetail", { date: todayLocalDate() })
                }
              />
              {todayPlanEntry && (
                <Text style={styles.contextScheduleNote}>
                  The engine-driven training recommendation is shown above.
                  These items are the rest of today's schedule.
                </Text>
              )}
              {homeState.schedule.contextualActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onPress={() => handleLogActivity(activity)}
                  onLog={() => handleLogActivity(activity)}
                  onSkip={() => handleScheduleOverride(activity, "skipped")}
                  onEdit={() =>
                    navigation.navigate("DayDetail", { date: activity.date })
                  }
                  onLighter={() => handleScheduleOverride(activity, "lighter")}
                  onHarder={() => handleScheduleOverride(activity, "harder")}
                  showActions
                />
              ))}
            </Animated.View>
          )}

          <Animated.View
            entering={FadeInDown.delay(D * 4)
              .duration(ANIMATION.slow)
              .springify()}
            style={{ marginTop: SPACING.md }}
          >
            <SectionHeader title="Training load" />
            <TrainingLoadChartCard
              trainingLoadData={homeState.training.loadChart}
              acute={homeState.training.acute}
              chronic={homeState.training.chronic}
              acwr={acwr}
            />
          </Animated.View>

          {weightTrend && (
            <Animated.View
              entering={FadeInDown.delay(D * 4.5)
                .duration(ANIMATION.slow)
                .springify()}
              style={{ marginTop: SPACING.md }}
            >
              <SectionHeader title="Body trends" />
              <WeightTrendCard
                trend={weightTrend}
                baseWeight={
                  weightTrend.currentWeight - weightTrend.totalChangeLbs
                }
                targetWeight={
                  weightTrend.remainingLbs > 0
                    ? weightTrend.currentWeight - weightTrend.remainingLbs
                    : null
                }
              />
            </Animated.View>
          )}

          <Animated.View
            entering={FadeInDown.delay(D * 5)
              .duration(ANIMATION.slow)
              .springify()}
            style={{ marginTop: SPACING.md }}
          >
            <SectionHeader
              title="Fuel"
              actionLabel="Details"
              onAction={() => openFuelScreen("NutritionHome")}
            />
            <AnimatedPressable onPress={() => openFuelScreen("NutritionHome")}>
              <DashboardNutritionCard
                actualNutrition={homeState.fuel.actual}
                targets={homeState.fuel.targets}
                cutProtocol={activeCutPlan ? todayCutProtocol : undefined}
              />
            </AnimatedPressable>
          </Animated.View>


          {shouldShowFirstRunChecklist && firstRunGuidance ? (
            <Animated.View
              entering={FadeInDown.delay(D)
                .duration(ANIMATION.slow)
                .springify()}
              style={{ marginTop: SPACING.md }}
            >
              <Card>
                <View style={styles.firstRunHeaderRow}>
                  <Text style={styles.firstRunKicker}>START HERE</Text>
                  <Text style={styles.firstRunProgress}>
                    {firstRunGuidance.progress.completedCount}/
                    {firstRunGuidance.progress.totalCount} complete
                  </Text>
                </View>
                <Text style={styles.firstRunTitle}>Your first 3 wins</Text>
                <Text style={styles.firstRunSubtitle}>
                  Follow these in order once, then Athleticore runs on
                  autopilot.
                </Text>

                <View style={styles.firstRunStepList}>
                  {checklistSteps.map((step, idx) => (
                    <AnimatedPressable
                      key={step.id}
                      style={styles.firstRunStepRow}
                      onPress={() => openFirstRunStep(step.id)}
                    >
                      <View
                        style={[
                          styles.firstRunStepBadge,
                          step.done && styles.firstRunStepBadgeDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.firstRunStepBadgeText,
                            step.done && styles.firstRunStepBadgeTextDone,
                          ]}
                        >
                          {step.done ? "✓" : `${idx + 1}`}
                        </Text>
                      </View>
                      <View style={styles.firstRunStepCopy}>
                        <Text style={styles.firstRunStepTitle}>
                          {step.title}
                        </Text>
                        <Text style={styles.firstRunStepSubtitle}>
                          {step.subtitle}
                        </Text>
                      </View>
                      <Text style={styles.firstRunStepCta}>
                        {step.done ? "Done" : "Open"}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </Card>
            </Animated.View>
          ) : null}

          {campRisk ? (
            <Animated.View
              entering={FadeInDown.delay(D * 1.2)
                .duration(ANIMATION.slow)
                .springify()}
              style={{ marginTop: SPACING.md }}
            >
              <Card>
                <Text
                  style={[
                    styles.biologyTitle,
                    { color: getCampRiskColor(campRisk.level) },
                  ]}
                >
                  Camp Risk {campRisk.score}/100 ·{" "}
                  {formatCampRiskLevel(campRisk.level)}
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

          {todayCutProtocol &&
            (todayCutProtocol.safety_flags as any[])?.filter(
              (f: any) => f.severity === "danger",
            ).length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(D * 1.5)
                  .duration(ANIMATION.slow)
                  .springify()}
              >
                <SafetyStatusIndicator
                  flags={todayCutProtocol.safety_flags as any[]}
                />
              </Animated.View>
            )}

          <View style={{ height: SPACING.xxl }} />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

function formatCampRiskLevel(
  level: "low" | "moderate" | "high" | "critical",
): string {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  if (level === "moderate") return "Moderate";
  return "Low";
}

function getCampRiskColor(
  level: "low" | "moderate" | "high" | "critical",
): string {
  if (level === "critical") return COLORS.error;
  if (level === "high") return COLORS.readiness.depleted;
  if (level === "moderate") return COLORS.warning;
  return COLORS.success;
}

function getReadinessColor(score: number): string {
    if (score >= 70) return COLORS.readiness.prime;
    if (score >= 40) return COLORS.readiness.caution;
    return COLORS.readiness.depleted;
}

function getDashboardPhaseControlState(input: {
  goalMode: "fight_camp" | "build_phase";
  hasActiveFightCamp: boolean;
}): DashboardPhaseControlState {
  if (input.hasActiveFightCamp) {
    return {
      currentModeLabel: "Fight Camp",
      title: "Fight camp is active",
      description:
        "Update camp timing, travel, or target weight from here without rebuilding your setup from scratch.",
      primaryLabel: "Update Camp Setup",
      secondaryLabel: "Switch to Build Phase",
    };
  }

  if (input.goalMode === "fight_camp") {
    return {
      currentModeLabel: "Build Phase",
      title: "Fight camp is not active yet",
      description:
        "Enter fight camp to lock the fight date and target weight, then rebuild the weekly plan around camp timing.",
      primaryLabel: "Enter Fight Camp",
    };
  }

  return {
    currentModeLabel: "Build Phase",
    title: "Build phase is active",
    description:
      "When a fight is booked, move into fight camp from the dashboard and reuse your current planning setup.",
    primaryLabel: "Enter Fight Camp",
  };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}
