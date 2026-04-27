import React from "react";
import {
  Alert,
  Image,
  ImageBackground,
  InteractionManager,
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
  IconActivity,
  IconArrowUp,
  IconBarbell,
  IconBell,
  IconCheckCircle,
  IconDroplets,
  IconFire,
  IconCalendar,
  IconChevronRight,
  IconLightning,
  IconTarget,
} from "../components/icons";
import { DashboardNutritionCard } from "../components/DashboardNutritionCard";
import { DailyMissionCard } from "../components/DailyMissionCard";
import {
  buildCompassViewModel,
  getAllDecisionReasons,
} from "../../lib/engine/presentation";
import { PrescriptionCard } from "../components/PrescriptionCard";
import { WeightTrendCard } from "../components/WeightTrendCard";
import { SafetyStatusIndicator } from "../components/SafetyStatusIndicator";
import { ActivityCard } from "../components/ActivityCard";
import { ActiveCampBanner } from "../components/ActiveCampBanner";
import { RadialProgress } from "../components/RadialProgress";
import { ScreenWrapper } from "../components/ScreenWrapper";

import type { CutSafetyFlag, ScheduledActivityRow } from "../../lib/engine/types";
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

const DASHBOARD_BACKGROUNDS = {
  readiness: require("../../assets/images/dashboard/readiness-console-bg.png"),
  mission: require("../../assets/images/dashboard/mission-card-bg.png"),
  support: require("../../assets/images/dashboard/support-card-bg.png"),
};

const BRAND_LOGO = require("../../assets/images/athleticore-logo.png");

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [firstRunGuidance, setFirstRunGuidance] =
    React.useState<FirstRunGuidanceState | null>(null);
  const [showFirstRunModal, setShowFirstRunModal] = React.useState(false);

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
    let isActive = true;
    InteractionManager.runAfterInteractions(() => {
      if (isActive) {
        void loadFirstRunGuidance();
      }
    });
    return () => { isActive = false; };
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
    readinessScore,
    todayActivities,
    primaryActivity,
    currentLevel,
    prescriptionMessage,
    workoutPrescription,
    todayPlanEntry,
    weightTrend,
    weightHistory,
    nutritionTargets,
    actualNutrition,
    currentLedger,
    activeCutProtocol,
    campRisk,
    dailyMission,
    goalMode,
    hasActiveFightCamp,
    hasActiveCutPlan,
  } = useDashboardData();

  const [showWhyToday, setShowWhyToday] = React.useState(false);
  const compassVM = React.useMemo(
    () =>
      buildCompassViewModel(
        dailyMission,
        Boolean(workoutPrescription || todayPlanEntry),
        checkinDone,
        sessionDone,
      ),
    [dailyMission, workoutPrescription, todayPlanEntry, checkinDone, sessionDone],
  );

  const homeState = React.useMemo(
    () =>
      buildTodayHomeState({
        acwr,
        hydration,
        checkinDone,
        sessionDone,
        currentLevel,
        readinessScore,
        workoutPrescription,
        todayPlanEntry,
        todayActivities,
        primaryActivity,
        nutritionTargets,
        actualNutrition,
        currentLedger,
        hasActiveCutPlan,
        todayCutProtocol: activeCutProtocol,
      }),
    [
      acwr,
      hydration,
      checkinDone,
      sessionDone,
      currentLevel,
      readinessScore,
      workoutPrescription,
      todayPlanEntry,
      todayActivities,
      primaryActivity,
      nutritionTargets,
      actualNutrition,
      currentLedger,
      hasActiveCutPlan,
      activeCutProtocol,
    ],
  );
  const activeCutSafetyFlags = React.useMemo(
    () => normalizeCutSafetyFlags(activeCutProtocol?.safety_flags),
    [activeCutProtocol?.safety_flags],
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
          title: "Check in once",
          subtitle: "Tell coach how you feel today.",
          done: firstRunGuidance.progress.checkinDone,
        },
        {
          id: "workout" as const,
          title: "Complete today's training",
          subtitle: "Get one session in the books.",
          done: firstRunGuidance.progress.workoutDone,
        },
        {
          id: "nutrition" as const,
          title: "Log one meal",
          subtitle: "Start your fuel picture.",
          done: firstRunGuidance.progress.nutritionDone,
        },
      ]
    : [];

  const shouldShowFirstRunChecklist = firstRunGuidance?.status === "pending";

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
              Your First Wins Start Here
            </Text>
            <Text style={styles.firstRunModalBody}>
              First, check in. Then complete today's training and log one meal. We will tighten the details as you build rhythm.
            </Text>

            <AnimatedPressable
              style={styles.firstRunModalPrimaryButton}
              onPress={() => {
                void dismissFirstRunModal();
                openFirstRunStep("checkin");
              }}
            >
              <Text style={styles.firstRunModalPrimaryText}>Check In</Text>
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
                <View style={styles.brandMark}>
                  <Image
                    source={BRAND_LOGO}
                    style={styles.brandMarkImage}
                    resizeMode="cover"
                    accessibilityLabel="AthletiCore OS logo"
                  />
                </View>
                <View style={styles.heroTitleBlock}>
                  <Text style={styles.heroGreeting}>{getGreeting()}</Text>
                  <Text style={styles.heroDate}>{formatDashboardDate(todayLocalDate())}</Text>
                </View>
                <View style={styles.notificationButton}>
                  <IconBell size={20} color={COLORS.accent} />
                </View>
            </View>

            <ImageBackground
              source={DASHBOARD_BACKGROUNDS.readiness}
              style={styles.heroMetricsBlock}
              imageStyle={styles.windowImage}
              resizeMode="cover"
            >
                <View style={styles.readinessScrim} />
                <View style={styles.readinessMain}>
                    <Text style={styles.readinessLabel}>READINESS</Text>
                    <RadialProgress
                        progress={homeState.training.readinessScore / 100}
                        size={132}
                        strokeWidth={10}
                        color={getReadinessColor(homeState.training.readinessScore)}
                        trackColor="rgba(245,245,240,0.14)"
                        label={Math.round(homeState.training.readinessScore).toString()}
                        sublabel={getReadinessGuidance(currentLevel)}
                        textColor="#F5F5F0"
                        labelStyle={styles.readinessScoreText}
                        sublabelStyle={styles.readinessSublabelText}
                    />
                </View>
                
                <View style={styles.secondaryMetricsList}>
                    <View style={styles.secondaryMetricItem}>
                        <View style={styles.metricIconBubble}>
                          <IconLightning size={18} color={COLORS.accent} />
                        </View>
                        <View style={styles.metricCopy}>
                          <Text style={styles.secondaryMetricLabel}>Today</Text>
                          <Text style={styles.secondaryMetricValue}>{homeState.training.workload.label}</Text>
                        </View>
                    </View>
                    {typeof sleepQuality === "number" && (
                        <View style={styles.secondaryMetricItem}>
                            <View style={styles.metricIconBubble}>
                              <IconActivity size={18} color={COLORS.accent} />
                            </View>
                            <View style={styles.metricCopy}>
                              <Text style={styles.secondaryMetricLabel}>Sleep</Text>
                              <Text style={styles.secondaryMetricValue}>{sleepQuality}/5</Text>
                            </View>
                            <View style={styles.metricTrendBubble}>
                              <IconArrowUp size={14} color={COLORS.success} />
                            </View>
                        </View>
                    )}
                    {typeof morningWeight === "number" && (
                        <View style={styles.secondaryMetricItem}>
                            <View style={styles.metricIconBubble}>
                              <IconFire size={18} color={COLORS.accent} />
                            </View>
                            <View style={styles.metricCopy}>
                              <Text style={styles.secondaryMetricLabel}>Weight</Text>
                              <Text style={styles.secondaryMetricValue}>{morningWeight} lb</Text>
                            </View>
                            <View style={styles.metricTrendBubble}>
                              <IconArrowUp size={14} color={COLORS.success} />
                            </View>
                        </View>
                    )}
                </View>
            </ImageBackground>

            <ImageBackground
              source={DASHBOARD_BACKGROUNDS.mission}
              style={styles.compassCard}
              imageStyle={styles.windowImage}
              resizeMode="cover"
            >
               <View style={styles.missionScrim} />
               <Text style={styles.compassWatermark}>A</Text>
               <View style={styles.compassHeaderRow}>
                 <View style={styles.missionIconBubble}>
                   <IconTarget size={20} color={COLORS.accent} />
                 </View>
                 <View style={styles.compassHeaderCopy}>
                   <View style={styles.compassTitleRow}>
                     <Text style={styles.compassSessionRole} numberOfLines={1}>
                       Today's Mission
                     </Text>
                     <Text
                       style={styles.compassRolePill}
                       numberOfLines={1}
                       adjustsFontSizeToFit
                       minimumFontScale={0.84}
                     >
                        {compassVM.sessionRoleLabel.toUpperCase()}
                     </Text>
                   </View>
                 </View>
               </View>
               <Text
                 style={styles.compassHeadline}
                 numberOfLines={3}
                 adjustsFontSizeToFit
                 minimumFontScale={0.88}
               >
                 {compassVM.headline}
               </Text>
               <Text style={styles.compassSummary} numberOfLines={3}>
                 {compassVM.summaryLine}
               </Text>
               
               {dailyMission?.decisionTrace?.length ? (
                 <View style={styles.compassReasonRow}>
                   <View style={styles.compassReasonBar} />
                   <Text style={styles.compassReasonText}>{compassVM.reasonSentence}</Text>
                 </View>
               ) : null}

               <AnimatedPressable style={styles.compassPrimaryButton} onPress={handleCompassCTA}>
                  <Text
                    style={styles.compassPrimaryText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.86}
                  >
                    {compassVM.primaryCTALabel}
                  </Text>
                  <IconChevronRight size={18} color={COLORS.text.inverse} />
               </AnimatedPressable>

               {compassVM.secondaryCTALabel ? (
                  <AnimatedPressable style={styles.compassSecondaryButton} onPress={handleCompassSecondaryCTA}>
                    <Text
                      style={styles.compassSecondaryText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.86}
                    >
                      {compassVM.secondaryCTALabel}
                    </Text>
                  </AnimatedPressable>
               ) : null}

               {dailyMission ? (
                  <AnimatedPressable onPress={() => setShowWhyToday(true)}>
                     <Text style={styles.compassMissionLink}>Mission details &gt;</Text>
                  </AnimatedPressable>
               ) : null}
            </ImageBackground>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(D).duration(ANIMATION.slow).springify()} style={styles.quickActionGrid}>
            <AnimatedPressable
                style={[styles.quickActionBlock, checkinDone && styles.quickActionBlockDone]}
                onPress={() => navigation.navigate("Log")}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconCheckCircle size={28} color={checkinDone ? COLORS.success : COLORS.accent} />
                </View>
                <Text style={[styles.quickActionLabelBlock, checkinDone && styles.quickActionLabelDoneBlock]}>
                   Check In
                </Text>
            </AnimatedPressable>
            
            <AnimatedPressable
                style={[styles.quickActionBlock, sessionDone && styles.quickActionBlockDone]}
                onPress={() => void openTodayTraining()}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconBarbell size={28} color={sessionDone ? COLORS.success : COLORS.accent} />
                </View>
                <Text style={[styles.quickActionLabelBlock, sessionDone && styles.quickActionLabelDoneBlock]}>
                   Train
                </Text>
            </AnimatedPressable>

            <AnimatedPressable
                style={styles.quickActionBlock}
                onPress={() => openFuelScreen("NutritionHome")}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconDroplets size={28} color={COLORS.accent} />
                </View>
                <Text style={styles.quickActionLabelBlock}>
                   Fuel
                </Text>
            </AnimatedPressable>

            <AnimatedPressable
                style={styles.quickActionBlock}
                onPress={openPlanningSurface}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconCalendar size={28} color={COLORS.accent} />
                </View>
                <Text style={styles.quickActionLabelBlock}>
                   {homeState.schedule.hasLivePlanningState ? "Calendar" : "Setup"}
                </Text>
            </AnimatedPressable>
        </Animated.View>

        {/* Active camp context stays close to the mission controls. */}
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
              <Card
                backgroundImage={DASHBOARD_BACKGROUNDS.support}
                backgroundScrimColor="rgba(10, 10, 10, 0.46)"
              >
                <AnimatedPressable
                  style={styles.whyTodayHeader}
                  onPress={() => setShowWhyToday((v) => !v)}
                >
                  <Text style={styles.whyTodayTitle}>Mission details</Text>
                  <Text style={styles.whyTodayChevron}>
                    {showWhyToday ? "^" : "v"}
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
                    ? "Also today"
                    : "Today's schedule"
                }
                actionLabel="View day"
                onAction={() =>
                  navigation.navigate("DayDetail", { date: todayLocalDate() })
                }
              />
              {todayPlanEntry && (
                <Text style={styles.contextScheduleNote}>
                  Training is shown above. These are the rest.
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

          {weightTrend && (
            <Animated.View
              entering={FadeInDown.delay(D * 4)
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
                history={weightHistory}
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
                cutProtocol={hasActiveCutPlan ? activeCutProtocol : undefined}
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
              <Card
                backgroundImage={DASHBOARD_BACKGROUNDS.support}
                backgroundScrimColor="rgba(10, 10, 10, 0.46)"
              >
                <View style={styles.firstRunHeaderRow}>
                  <Text style={styles.firstRunKicker}>START HERE</Text>
                  <Text style={styles.firstRunProgress}>
                    {firstRunGuidance.progress.completedCount}/
                    {firstRunGuidance.progress.totalCount} complete
                  </Text>
                </View>
                <Text style={styles.firstRunTitle}>Your first 3 wins</Text>
                <Text style={styles.firstRunSubtitle}>
                  Build rhythm first. Precision comes after reps.
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
                          {step.done ? "OK" : `${idx + 1}`}
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
              <Card
                backgroundImage={DASHBOARD_BACKGROUNDS.support}
                backgroundScrimColor="rgba(10, 10, 10, 0.50)"
              >
                <Text
                  style={[
                    styles.biologyTitle,
                    { color: getCampRiskColor(campRisk.level) },
                  ]}
                >
                  Camp Risk {campRisk.score}/100 -{" "}
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

          {activeCutSafetyFlags.filter((flag) => flag.severity === "danger").length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(D * 1.5)
                .duration(ANIMATION.slow)
                .springify()}
            >
              <SafetyStatusIndicator
                flags={activeCutSafetyFlags}
              />
            </Animated.View>
          )}

          <View style={{ height: SPACING.xxl }} />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

function isCutSafetyFlag(value: unknown): value is CutSafetyFlag {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CutSafetyFlag>;
  return (
    (candidate.severity === "info" ||
      candidate.severity === "warning" ||
      candidate.severity === "danger") &&
    typeof candidate.code === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.recommendation === "string"
  );
}

function normalizeCutSafetyFlags(flags: unknown): CutSafetyFlag[] {
  return Array.isArray(flags) ? flags.filter(isCutSafetyFlag) : [];
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

function getReadinessGuidance(level: string | null): string {
    if (level === "Prime") return "Clear to train";
    if (level === "Caution") return "Keep controlled";
    if (level === "Depleted") return "Recovery first";
    return "Check in first";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDashboardDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}
