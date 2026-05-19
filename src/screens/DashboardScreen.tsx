import React from "react";
import {
  Image,
  ImageBackground,
  InteractionManager,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { Card } from "../components/Card";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { RadialProgress } from "../components/RadialProgress";
import { WeightTrendCard } from "../components/WeightTrendCard";
import { COLORS, SPACING, ANIMATION } from "../theme/theme";
import {
  IconAlertTriangle,
  IconBell,
  IconChevronRight,
  IconDroplets,
  IconShieldCheck,
} from "../components/icons";
import { TodayMissionPanel } from "../components/dashboard/TodayMissionPanel";
import { GuidedPhaseTransitionCard } from "../components/phases/GuidedPhaseTransitionCard";
import { UnifiedJourneySummaryCard } from "../components/performance/UnifiedJourneySummaryCard";
import { ExistingUserOverhaulIntroCard } from "../components/first-run/ExistingUserOverhaulIntroCard";
import { CommandScreen } from "../components/CommandScreen";
import { ScreenLoadingState } from "../components/ScreenLoadingState";
import { ScreenWrapper } from "../components/ScreenWrapper";
import type {
  TodayMissionAction,
  UnifiedPerformanceViewModel,
} from "../../lib/performance-engine";

import { getActiveUserId } from "../../lib/api/athleteContextService";
import {
  getAndSyncFirstRunGuidanceState,
  markFirstRunGuidanceIntroSeen,
  type FirstRunGuidanceState,
} from "../../lib/api/firstRunGuidanceService";
import {
  completeAndPersistFirstRunWalkthroughStep,
  dismissAndPersistFirstRunWalkthrough,
  ensureFirstRunWalkthroughState,
  type FirstRunWalkthroughState,
} from "../../lib/api/firstRunWalkthroughService";
import { supabase } from "../../lib/supabase";
import { todayLocalDate } from "../../lib/utils/date";
import { logError } from "../../lib/utils/logger";
import { useDashboardData } from "../hooks/useDashboardData";
import { styles } from "./DashboardScreen.styles";
import { getGuidedWorkoutContext } from "../../lib/api/fightCampService";
import { getWeeklyPlanEntryById } from "../../lib/api/weeklyPlanService";
import { isGuidedEngineActivityType } from "../../lib/engine/sessionOwnership";
import { classifyPlanEntryRuntimeSurface } from "../../lib/performance-engine/workout-programming";

const BRAND_LOGO = require("../../assets/images/athleticore-logo.png");
const TODAY_BACKGROUND = require("../../assets/images/universal-screen-background.png");
const QUICK_ACTION_IMAGES: Record<QuickActionKind, number> = {
  checkin: require("../../assets/images/dashboard/quick-actions/today-quick-checkin.png"),
  train: require("../../assets/images/dashboard/quick-actions/today-quick-train.png"),
  fuel: require("../../assets/images/dashboard/quick-actions/today-quick-fuel.png"),
  plan: require("../../assets/images/dashboard/quick-actions/today-quick-plan.png"),
};

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const useCompactReadinessHero = screenWidth < 380;
  const [firstRunGuidance, setFirstRunGuidance] =
    React.useState<FirstRunGuidanceState | null>(null);
  const [firstRunWalkthrough, setFirstRunWalkthrough] =
    React.useState<FirstRunWalkthroughState | null>(null);
  const [showFirstRunModal, setShowFirstRunModal] = React.useState(false);
  const [athleteFirstName, setAthleteFirstName] = React.useState<string | null>(null);

  const loadFirstRunGuidance = React.useCallback(async () => {
    try {
      const userId = await getActiveUserId();
      if (!userId) {
        setFirstRunGuidance(null);
        setShowFirstRunModal(false);
        return;
      }

      const [next, walkthrough] = await Promise.all([
        getAndSyncFirstRunGuidanceState(userId),
        ensureFirstRunWalkthroughState({
          userId,
          source: "auth_sign_in",
        }).catch((error) => {
          logError("DashboardScreen.loadFirstRunWalkthrough", error);
          return null;
        }),
      ]);
      let resolvedWalkthrough = walkthrough;
      if (shouldResolveRedundantAppTourStep(walkthrough)) {
        try {
          resolvedWalkthrough = await completeAndPersistFirstRunWalkthroughStep({
            userId,
            step: "app_tour",
          });
        } catch (error) {
          logError("DashboardScreen.resolveRedundantAppTourStep", error);
        }
      }

      setFirstRunGuidance(next);
      setFirstRunWalkthrough(resolvedWalkthrough);
      setShowFirstRunModal(
        next.status === "pending" &&
        !next.introSeenAt &&
        !shouldShowExistingUserOverhaulIntro(resolvedWalkthrough),
      );
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

  React.useEffect(() => {
    let isActive = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!isActive) return;
      setAthleteFirstName(getUserFirstName(data.user?.user_metadata));
    }).catch((error) => {
      logError("DashboardScreen.loadAthleteFirstName", error);
    });

    return () => { isActive = false; };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadFirstRunGuidance();
    }, [loadFirstRunGuidance]),
  );

  const {
    loading,
    refreshing,
    error,
    onRefresh,
    checkinDone,
    sessionDone,
    primaryActivity,
    currentLevel,
    todayPlanEntry,
    readinessScore,
    weightTrend,
    weightHistory,
    performanceContext,
    todayMission,
    phaseTransition,
  } = useDashboardData();
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
      if (classifyPlanEntryRuntimeSurface(todayPlanEntry) !== "legacy_guided_workout") {
        openTrainScreen("WorkoutDetail", {
          weeklyPlanEntryId: todayPlanEntry.id,
          date: todayPlanEntry.date,
          readinessState: currentLevel ?? "Caution",
          phase: context.phase,
          fitnessLevel: context.fitnessLevel,
          isDeloadWeek: todayPlanEntry.is_deload,
        });
        return;
      }
      openTrainScreen("GuidedWorkout", {
        weeklyPlanEntryId: todayPlanEntry.id,
        scheduledActivityId: todayPlanEntry.scheduled_activity_id ?? undefined,
        focus: todayPlanEntry.focus ?? undefined,
        availableMinutes: todayPlanEntry.estimated_duration_min,
        readinessState: currentLevel ?? "Caution",
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
      try {
        const linkedEntry = await getWeeklyPlanEntryById(primaryActivity.weekly_plan_entry_id);
        if (!linkedEntry || classifyPlanEntryRuntimeSurface(linkedEntry) !== "legacy_guided_workout") {
          openTrainScreen("WorkoutDetail", {
            weeklyPlanEntryId: primaryActivity.weekly_plan_entry_id,
            date: linkedEntry?.date ?? primaryActivity.date,
            readinessState: currentLevel ?? "Caution",
            phase: context.phase,
            fitnessLevel: context.fitnessLevel,
            isDeloadWeek: linkedEntry?.is_deload,
          });
          return;
        }
      } catch (error) {
        logError("DashboardScreen.openTodayTraining.weeklyPlanEntry", error, {
          weeklyPlanEntryId: primaryActivity.weekly_plan_entry_id,
        });
        openTrainScreen("WorkoutDetail", {
          weeklyPlanEntryId: primaryActivity.weekly_plan_entry_id,
          date: primaryActivity.date,
          readinessState: currentLevel ?? "Caution",
          phase: context.phase,
          fitnessLevel: context.fitnessLevel,
        });
        return;
      }
      openTrainScreen("GuidedWorkout", {
        weeklyPlanEntryId: primaryActivity.weekly_plan_entry_id,
        scheduledActivityId: primaryActivity.id,
        focus: primaryActivity.custom_label ?? undefined,
        availableMinutes: primaryActivity.estimated_duration_min,
        readinessState: currentLevel ?? "Caution",
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

  const openPlanningSurface = React.useCallback(() => {
    openPlanScreen("CalendarMain");
  }, [openPlanScreen]);

  const handleTodayMissionAction = React.useCallback((action: TodayMissionAction) => {
    switch (action.intent) {
      case "log_checkin":
        navigation.navigate("Log");
        break;
      case "start_training":
        void openTodayTraining();
        break;
      case "review_fueling":
        openFuelScreen("NutritionHome");
        break;
      case "log_body_mass":
        navigation.navigate("Log");
        break;
      case "review_body_mass":
        openFuelScreen("WeightClassHome");
        break;
      case "confirm_fight":
        openPlanScreen("WeeklyPlanSetup", {
          initialGoalMode: "fight_camp",
          initialPhaseKey: "objective",
          source: "today_mission",
        });
        break;
      case "take_recovery":
      case "review_plan":
      default:
        openPlanningSurface();
        break;
    }
  }, [
    navigation,
    openFuelScreen,
    openPlanScreen,
    openPlanningSurface,
    openTodayTraining,
  ]);

  const handleRefresh = React.useCallback(() => {
    onRefresh();
    void loadFirstRunGuidance();
  }, [onRefresh, loadFirstRunGuidance]);

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
          subtitle: "Give Athleticore today's readiness context.",
          done: firstRunGuidance.progress.checkinDone,
        },
        {
          id: "workout" as const,
          title: "Complete today's training",
          subtitle: "Do the work that moves today forward.",
          done: firstRunGuidance.progress.workoutDone,
        },
        {
          id: "nutrition" as const,
          title: "Log one meal",
          subtitle: "Help Athleticore understand how fuel is matching the work.",
          done: firstRunGuidance.progress.nutritionDone,
        },
      ]
    : [];

  const shouldShowFirstRunChecklist = firstRunGuidance?.status === "pending";
  const existingUserMissingDataPrompts = React.useMemo(
    () => buildExistingUserMissingDataPrompts(performanceContext),
    [performanceContext],
  );
  const shouldShowExistingUserIntro = shouldShowExistingUserOverhaulIntro(firstRunWalkthrough);

  const completeExistingUserIntro = React.useCallback(async () => {
    setFirstRunWalkthrough((current) => current ? {
      ...current,
      status: "completed",
      currentStep: null,
      canResume: false,
      hasSeenTodayMissionIntro: true,
      hasSeenAppTour: true,
      completedSteps: Array.from(new Set([...current.completedSteps, "today_mission_intro", "app_tour"])),
    } : current);

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      const afterIntro = await completeAndPersistFirstRunWalkthroughStep({
        userId,
        step: "today_mission_intro",
      });
      const next = afterIntro.completedSteps.includes("app_tour")
        ? afterIntro
        : await completeAndPersistFirstRunWalkthroughStep({
            userId,
            step: "app_tour",
          });
      setFirstRunWalkthrough(next);
    } catch (error) {
      logError("DashboardScreen.completeExistingUserOverhaulIntro", error);
    }
  }, []);

  const dismissExistingUserIntro = React.useCallback(async () => {
    setFirstRunWalkthrough((current) => current ? {
      ...current,
      status: "dismissed",
      currentStep: null,
      canResume: false,
    } : current);

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      const next = await dismissAndPersistFirstRunWalkthrough({ userId });
      setFirstRunWalkthrough(next);
    } catch (error) {
      logError("DashboardScreen.dismissExistingUserOverhaulIntro", error);
    }
  }, []);

  const reviewExistingUserMissingContext = React.useCallback(() => {
    const joinedPrompts = existingUserMissingDataPrompts.join(" ").toLowerCase();

    if (joinedPrompts.includes("check-in")) {
      navigation.navigate("Log");
      return;
    }

    if (joinedPrompts.includes("body-mass") || joinedPrompts.includes("weight-class")) {
      openFuelScreen("WeightClassHome");
      return;
    }

    if (
      joinedPrompts.includes("protected")
      || joinedPrompts.includes("sparring")
      || joinedPrompts.includes("coach-led")
      || joinedPrompts.includes("classes")
    ) {
      openPlanScreen("WeeklyPlanSetup", {
        initialGoalMode: performanceContext.phase.current === "camp" || performanceContext.phase.current === "competition_week"
          ? "fight_camp"
          : "build_phase",
        initialPhaseKey: "commitments",
        source: "existing_user_overhaul_intro",
      });
      return;
    }

    openPlanScreen("WeeklyPlanSetup", {
      initialGoalMode: performanceContext.phase.current === "camp" || performanceContext.phase.current === "competition_week"
        ? "fight_camp"
        : "build_phase",
      initialPhaseKey: "objective",
      source: "existing_user_overhaul_intro",
    });
  }, [
    existingUserMissingDataPrompts,
    navigation,
    openFuelScreen,
    openPlanScreen,
    performanceContext.phase.current,
  ]);

  if (loading) {
    return (
      <CommandScreen tone="today" useSafeArea>
        <ScreenLoadingState
          kicker="TODAY"
          title="Loading today's command center"
          message="Syncing readiness, training, fuel, body-mass, and risk context."
          tone="today"
          layout="command"
        />
      </CommandScreen>
    );
  }

  return (
    <ScreenWrapper style={styles.screenShell}>
      <ImageBackground
        source={TODAY_BACKGROUND}
        resizeMode="cover"
        style={styles.commandBackground}
        imageStyle={styles.commandBackgroundImage}
      >
        <View style={styles.commandBackgroundOverlay} />
      <Modal
        visible={showFirstRunModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void dismissFirstRunModal();
        }}
      >
        <View
          style={[
            styles.firstRunModalOverlay,
            {
              paddingTop: insets.top + SPACING.lg,
              paddingBottom: insets.bottom + SPACING.lg,
            },
          ]}
        >
          <View style={styles.firstRunModalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.firstRunModalContent}
            >
              <Text style={styles.firstRunModalKicker}>WELCOME</Text>
              <Text style={styles.firstRunModalTitle}>
                Start With Today's Context
              </Text>
              <Text style={styles.firstRunModalBody}>
                Start with a check-in. Athleticore will use that context to guide training, fuel, and recovery without guessing.
              </Text>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Log first check-in"
                accessibilityHint="Closes this message and opens today's check-in."
                style={styles.firstRunModalPrimaryButton}
                onPress={() => {
                  void dismissFirstRunModal();
                  openFirstRunStep("checkin");
                }}
                testID="first-run-check-in"
              >
                <Text style={styles.firstRunModalPrimaryText}>Log check-in</Text>
              </AnimatedPressable>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                accessibilityHint="Closes this introduction and keeps you on Today."
                style={styles.firstRunModalSecondaryButton}
                onPress={() => {
                  void dismissFirstRunModal();
                }}
                testID="first-run-not-now"
              >
                <Text style={styles.firstRunModalSecondaryText}>Not now</Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Animated.View
            entering={FadeInDown.duration(ANIMATION.slow)}
            style={[styles.heroSection, { paddingTop: insets.top + SPACING.lg }]}
        >
            <View style={styles.heroGreetingRow}>
                <View style={styles.heroBrandCluster}>
                  <Image
                    source={BRAND_LOGO}
                    style={styles.brandMarkImage}
                    resizeMode="cover"
                    accessibilityLabel="Athleticore logo"
                  />
                  <Text style={styles.heroBrandText}>ATHLETICORE</Text>
                </View>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh today's context"
                  style={styles.heroAlertButton}
                  onPress={handleRefresh}
                  disabled={refreshing}
                >
                  <IconBell size={21} color={COLORS.text.primary} />
                </AnimatedPressable>
            </View>

            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroGreeting}>{getGreeting(athleteFirstName)}</Text>
              <Text style={styles.heroDate}>{formatDashboardDate(todayLocalDate())}</Text>
            </View>

            {error ? (
              <Card
                style={styles.dashboardLoadErrorCard}
                variant="outlined"
                backgroundTone="none"
              >
                <View style={styles.dashboardLoadErrorHeader}>
                  <View style={styles.dashboardLoadErrorIcon}>
                    <IconAlertTriangle size={18} color={COLORS.error} />
                  </View>
                  <View style={styles.dashboardLoadErrorCopy}>
                    <Text style={styles.dashboardLoadErrorTitle}>
                      Today's mission couldn't refresh
                    </Text>
                    <Text style={styles.dashboardLoadErrorMessage}>
                      {error.message}
                    </Text>
                  </View>
                </View>
                <AnimatedPressable
                  style={[
                    styles.dashboardLoadErrorButton,
                    refreshing && styles.dashboardLoadErrorButtonDisabled,
                  ]}
                  onPress={handleRefresh}
                  disabled={refreshing}
                  testID="dashboard-load-error-retry"
                >
                  <Text style={styles.dashboardLoadErrorButtonText}>
                    Try again
                  </Text>
                </AnimatedPressable>
              </Card>
            ) : null}

            <View style={styles.todayMissionWrap}>
              <TodayMissionPanel
                mission={todayMission}
                onAction={handleTodayMissionAction}
              />
            </View>

            <Animated.View
              entering={FadeInDown.delay(D).duration(ANIMATION.slow).springify()}
              style={styles.quickActionGrid}
            >
              <AnimatedPressable
                testID="dashboard-quick-action-check-in"
                style={[styles.quickActionBlock, checkinDone && styles.quickActionBlockDone]}
                onPress={() => navigation.navigate("Log")}
              >
                <QuickActionIconTile kind="checkin" done={checkinDone} />
                <Text
                  style={[styles.quickActionLabelBlock, checkinDone && styles.quickActionLabelDoneBlock]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                >
                  Check In
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                testID="dashboard-quick-action-train"
                style={[styles.quickActionBlock, sessionDone && styles.quickActionBlockDone]}
                onPress={() => void openTodayTraining()}
              >
                <QuickActionIconTile kind="train" done={sessionDone} />
                <Text
                  style={[styles.quickActionLabelBlock, sessionDone && styles.quickActionLabelDoneBlock]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                >
                  Train
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                testID="dashboard-quick-action-fuel"
                style={styles.quickActionBlock}
                onPress={() => openFuelScreen("NutritionHome")}
              >
                <QuickActionIconTile kind="fuel" />
                <Text
                  style={styles.quickActionLabelBlock}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                >
                  Fuel
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                testID="dashboard-quick-action-plan"
                style={styles.quickActionBlock}
                onPress={openPlanningSurface}
              >
                <QuickActionIconTile kind="plan" />
                <Text
                  style={styles.quickActionLabelBlock}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                >
                  Calendar
                </Text>
              </AnimatedPressable>
            </Animated.View>

            {shouldShowExistingUserIntro ? (
              <ExistingUserOverhaulIntroCard
                missingDataPrompts={existingUserMissingDataPrompts}
                onContinue={completeExistingUserIntro}
                onDismiss={dismissExistingUserIntro}
                onReviewMissingData={reviewExistingUserMissingContext}
              />
            ) : null}

            {phaseTransition.available ? (
              <View style={styles.phaseTransitionWrap}>
                <GuidedPhaseTransitionCard
                  transition={phaseTransition}
                  onContinue={openPlanningSurface}
                />
              </View>
            ) : null}

            <TodaySignalGrid
              summary={performanceContext}
              readinessScore={readinessScore}
              currentLevel={currentLevel}
              compact={useCompactReadinessHero}
              onOpenReadiness={() => navigation.navigate("Log")}
              onOpenFuel={() => openFuelScreen("NutritionHome")}
            />

            <View style={styles.journeySummaryWrap}>
              <UnifiedJourneySummaryCard
                summary={performanceContext}
                compact
                showBodyMass={Boolean(performanceContext.bodyMass)}
                variant="todayCommand"
                onPress={openPlanningSurface}
                style={styles.journeySummaryCard}
              />
            </View>
        </Animated.View>

        <View style={styles.content}>
          {weightTrend ? (
            <Animated.View
              entering={FadeInDown.delay(D * 1.2)
                .duration(ANIMATION.slow)
                .springify()}
              style={styles.bodyTrendWrap}
            >
              <WeightTrendCard
                trend={weightTrend}
                variant="todayCommand"
                baseWeight={weightTrend.currentWeight - weightTrend.totalChangeLbs}
                targetWeight={
                  weightTrend.remainingLbs > 0
                    ? weightTrend.currentWeight - weightTrend.remainingLbs
                    : null
                }
                history={weightHistory}
              />
            </Animated.View>
          ) : null}

          {shouldShowFirstRunChecklist && firstRunGuidance ? (
            <Animated.View
              entering={FadeInDown.delay(D)
                .duration(ANIMATION.slow)
                .springify()}
              style={weightTrend ? styles.firstRunChecklistAfterBodyTrend : undefined}
            >
              <Card backgroundTone="planning" backgroundScrimColor="rgba(10, 10, 10, 0.72)">
                <View style={styles.firstRunHeaderRow}>
                  <Text style={styles.firstRunKicker}>START HERE</Text>
                  <Text style={styles.firstRunProgress}>
                    {firstRunGuidance.progress.completedCount}/
                    {firstRunGuidance.progress.totalCount} complete
                  </Text>
                </View>
                  <Text style={styles.firstRunTitle}>Start with today's rhythm</Text>
                  <Text style={styles.firstRunSubtitle}>
                  A few simple actions help Athleticore make the next call with more context.
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

          <View style={{ height: SPACING.xxl }} />
        </View>
      </ScrollView>
      </ImageBackground>
    </ScreenWrapper>
  );
}

interface TodaySignalGridProps {
  summary: UnifiedPerformanceViewModel;
  readinessScore: number | null;
  currentLevel: string | null;
  compact: boolean;
  onOpenReadiness: () => void;
  onOpenFuel: () => void;
}

function TodaySignalGrid({
  summary,
  readinessScore,
  currentLevel,
  compact,
  onOpenReadiness,
  onOpenFuel,
}: TodaySignalGridProps) {
  const primaryAnchor = summary.protectedAnchors[0] ?? null;
  const readinessColor = getReadinessColor(currentLevel);
  const readinessBorder = getReadinessBorderColor(currentLevel);
  const calories = formatNutritionTarget(summary.nutrition.numbers.calories, "cal");
  const protein = formatNutritionTarget(summary.nutrition.numbers.proteinG, "g protein");
  const hydration = formatNutritionTarget(summary.nutrition.numbers.hydrationOz, "oz water");
  const anchorDetail = primaryAnchor
    ? [primaryAnchor.dateLabel, primaryAnchor.intensityLabel].filter(Boolean).join(" / ")
    : "Add sparring, classes, or coach-led sessions so the plan works around them.";

  return (
    <Animated.View
      entering={FadeInDown.delay(80).duration(ANIMATION.slow).springify()}
      style={[styles.signalGrid, compact && styles.signalGridCompact]}
    >
      <View style={[styles.signalCard, styles.readinessSignalCard, { borderColor: readinessBorder }]}>
        <View style={styles.signalHeaderRow}>
          <View style={styles.signalHeaderCopy}>
            <Text style={styles.signalKicker}>TODAY'S READINESS</Text>
            <Text style={styles.signalTitle} numberOfLines={1}>
              {getReadinessSignalLabel(currentLevel)}
            </Text>
          </View>
          <View
            style={[
              styles.miniStatusPill,
              {
                borderColor: readinessBorder,
                backgroundColor: getReadinessPillBackground(currentLevel),
              },
            ]}
          >
            <Text style={[styles.miniStatusText, { color: readinessColor }]} numberOfLines={1}>
              {summary.readiness.bandLabel}
            </Text>
          </View>
        </View>

        <View style={styles.readinessSignalBody}>
          <View style={styles.readinessScorePanel}>
            <RadialProgress
              progress={getReadinessProgress(readinessScore, currentLevel)}
              size={compact ? 112 : 92}
              strokeWidth={9}
              color={readinessColor}
              trackColor="rgba(245,245,240,0.13)"
              label={getReadinessCircleValue(readinessScore)}
              centerSublabel={getReadinessCenterSublabel(readinessScore)}
              textColor={COLORS.text.primary}
              glowColor={getReadinessGlowColor(currentLevel)}
              centerFillColor="rgba(10, 10, 10, 0.76)"
              centerBorderColor={readinessBorder}
              labelStyle={styles.signalCircleLabel}
              centerSublabelStyle={styles.signalCircleSublabel}
            />
            <View style={styles.readinessSignalCopy}>
              <Text style={[styles.signalBodyStrong, { color: readinessColor }]} numberOfLines={1}>
                {summary.readiness.bandLabel}
              </Text>
              <Text style={styles.readinessSignalBodyText} numberOfLines={2}>
                {getReadinessCircleCopy(currentLevel)}
              </Text>
            </View>
          </View>

          <View style={styles.readinessMetaList}>
            <SignalStat
              label="Score"
              value={summary.readiness.scoreLabel}
              toneColor={readinessColor}
            />
            <SignalStat
              label="Context"
              value={summary.readiness.confidenceLabel}
              toneColor={summary.lowConfidence ? COLORS.warning : COLORS.text.secondary}
            />
          </View>
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="View full readiness"
          style={styles.signalCta}
          onPress={onOpenReadiness}
        >
          <Text style={styles.signalCtaText}>View full readiness</Text>
          <IconChevronRight size={15} color={COLORS.accent} />
        </AnimatedPressable>
      </View>

      <View style={styles.signalCard}>
        <View style={styles.signalSection}>
          <View style={styles.signalSectionHeader}>
            <View style={styles.signalIconBubble}>
              <IconShieldCheck size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.signalKicker}>PROTECTED ANCHORS</Text>
          </View>
          <Text style={styles.signalTitle} numberOfLines={1}>
            {primaryAnchor?.label ?? "No anchors logged"}
          </Text>
          <Text style={styles.signalBody} numberOfLines={2}>
            {anchorDetail}
          </Text>
          {primaryAnchor ? (
            <View style={styles.anchorProtectionPill}>
              <Text style={styles.anchorProtectionText}>Protected / Non-negotiable</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.signalDivider} />

        <View style={styles.signalSection}>
          <View style={styles.signalSectionHeader}>
            <View style={styles.signalIconBubble}>
              <IconDroplets size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.signalKicker}>FUEL TODAY</Text>
          </View>
          <SignalStat label="Calories" value={calories} toneColor={COLORS.success} />
          <SignalStat label="Protein" value={protein} toneColor={COLORS.text.secondary} />
          <SignalStat label="Hydration" value={hydration} toneColor={COLORS.chart.water} />
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="View nutrition"
          style={styles.signalCta}
          onPress={onOpenFuel}
        >
          <Text style={styles.signalCtaText}>View nutrition</Text>
          <IconChevronRight size={15} color={COLORS.accent} />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

function SignalStat({
  label,
  value,
  toneColor,
}: {
  label: string;
  value: string;
  toneColor: string;
}) {
  return (
    <View style={styles.signalStatRow}>
      <Text style={styles.signalStatLabel}>{label}</Text>
      <Text style={[styles.signalStatValue, { color: toneColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

type QuickActionKind = "checkin" | "train" | "fuel" | "plan";

function QuickActionIconTile({
  kind,
}: {
  kind: QuickActionKind;
  done?: boolean;
}) {
  return (
    <Image
      source={QUICK_ACTION_IMAGES[kind]}
      style={styles.quickActionImage}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

function getReadinessProgress(
  score: number | null | undefined,
  level: string | null,
): number {
  if (typeof score === "number" && Number.isFinite(score)) {
    return Math.max(0, Math.min(1, score / 100));
  }

  if (level === "Prime") return 0.88;
  if (level === "Caution") return 0.58;
  if (level === "Depleted") return 0.28;
  return 0.18;
}

function shouldResolveRedundantAppTourStep(state: FirstRunWalkthroughState | null): boolean {
  if (!state) return false;
  if (state.hasSeenAppTour) return false;
  if (state.status === "completed" || state.status === "dismissed") return false;

  return state.currentStep === "app_tour" || (
    state.completedSteps.includes("today_mission_intro") &&
    !state.completedSteps.includes("app_tour")
  );
}

function shouldShowExistingUserOverhaulIntro(state: FirstRunWalkthroughState | null): boolean {
  if (!state) return false;
  if (state.appliesTo !== "existing_user_overhaul_intro") return false;
  if (state.hasSeenTodayMissionIntro) return false;
  if (state.status === "completed" || state.status === "dismissed") return false;

  return state.currentStep === "today_mission_intro"
    || state.status === "not_started"
    || state.status === "needs_update";
}

function buildExistingUserMissingDataPrompts(
  performanceContext: UnifiedPerformanceViewModel,
): string[] {
  const prompts: string[] = [];

  if (!performanceContext.available) {
    prompts.push("Review planning context so Today's Mission can make the next call with more context.");
  }

  if (
    performanceContext.readiness.band === "unknown"
    || performanceContext.readiness.missingDataLabels.length > 0
  ) {
    prompts.push("Log today's check-in so readiness can shape the work safely.");
  }

  if (performanceContext.protectedAnchors.length === 0) {
    prompts.push("Add protected workouts if sparring, classes, or coach-led sessions need to stay locked in.");
  }

  if (
    !performanceContext.bodyMass
    && (
      Boolean(performanceContext.journey.nextEventLabel)
      || performanceContext.phase.current === "camp"
      || performanceContext.phase.current === "competition_week"
      || performanceContext.focus.bodyMass != null
    )
  ) {
    prompts.push("Add body-mass or weight-class context when it matters. We need a little history before making a confident call.");
  }

  if (
    !performanceContext.journey.nextEventLabel
    && (
      performanceContext.phase.current === "camp"
      || performanceContext.phase.current === "competition_week"
    )
  ) {
    prompts.push("Add tentative or confirmed fight details if this phase is tied to an opportunity.");
  }

  return prompts.slice(0, 3);
}

function getReadinessColor(level: string | null): string {
  if (level === "Prime") return COLORS.success;
  if (level === "Caution") return COLORS.warning;
  if (level === "Depleted") return COLORS.error;
  return COLORS.text.tertiary;
}

function getReadinessBorderColor(level: string | null): string {
  if (level === "Prime") return "rgba(183, 217, 168, 0.42)";
  if (level === "Caution") return "rgba(212, 175, 55, 0.46)";
  if (level === "Depleted") return "rgba(217, 130, 126, 0.46)";
  return "rgba(245, 245, 240, 0.18)";
}

function getReadinessPillBackground(level: string | null): string {
  if (level === "Prime") return "rgba(183, 217, 168, 0.14)";
  if (level === "Caution") return "rgba(212, 175, 55, 0.15)";
  if (level === "Depleted") return "rgba(217, 130, 126, 0.16)";
  return "rgba(245, 245, 240, 0.08)";
}

function getReadinessSignalLabel(level: string | null): string {
  if (level === "Prime") return "Recovered";
  if (level === "Caution") return "Manage load";
  if (level === "Depleted") return "Recover first";
  return "Needs check-in";
}

function getReadinessGlowColor(level: string | null): string {
  if (level === "Prime") return "rgba(183, 217, 168, 0.28)";
  if (level === "Caution") return "rgba(212, 175, 55, 0.30)";
  if (level === "Depleted") return "rgba(217, 130, 126, 0.30)";
  return "rgba(245, 245, 240, 0.16)";
}

function getReadinessCircleValue(
  score: number | null | undefined,
): string {
  if (typeof score === "number" && Number.isFinite(score)) {
    return `${Math.round(Math.max(0, Math.min(100, score)))}`;
  }

  return "Log";
}

function getReadinessCenterSublabel(score: number | null | undefined): string {
  return typeof score === "number" && Number.isFinite(score) ? "/100" : "check in";
}

function formatNutritionTarget(value: number | null | undefined, suffix: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Target pending";
  }

  return `${Math.round(value).toLocaleString("en-US")} ${suffix}`;
}

function getReadinessCircleCopy(level: string | null): string {
  if (level === "Prime") return "Your body is ready for quality work.";
  if (level === "Caution") return "Train, but leave room in the tank.";
  if (level === "Depleted") return "Recovery needs to lead today.";
  return "Check in to sharpen this signal.";
}

function getGreeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const salutation = hour < 12
    ? "Good Morning"
    : hour < 17
      ? "Good Afternoon"
      : "Good Evening";

  return firstName ? `${salutation}, ${firstName}` : salutation;
}

function getUserFirstName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const source = metadata as Record<string, unknown>;
  const rawName =
    source.first_name ??
    source.firstName ??
    source.name ??
    source.full_name ??
    source.fullName;

  if (typeof rawName !== "string") return null;
  const firstName = rawName.trim().split(/\s+/)[0];
  return firstName.length > 0 ? firstName : null;
}

function formatDashboardDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}
