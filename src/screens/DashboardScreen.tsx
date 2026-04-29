import React from "react";
import {
  Image,
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
import { SkeletonLoader } from "../components/SkeletonLoader";
import { RadialProgress } from "../components/RadialProgress";
import { WeightTrendCard } from "../components/WeightTrendCard";
import { COLORS, RADIUS, SPACING, ANIMATION } from "../theme/theme";
import {
  IconBarbell,
  IconCheckCircle,
  IconDroplets,
  IconCalendar,
} from "../components/icons";
import { TodayMissionPanel } from "../components/dashboard/TodayMissionPanel";
import { GuidedPhaseTransitionCard } from "../components/phases/GuidedPhaseTransitionCard";
import { UnifiedJourneySummaryCard } from "../components/performance/UnifiedJourneySummaryCard";
import {
  FirstSignInAppTourCard,
  type FirstSignInAppTourStep,
} from "../components/first-run/FirstSignInAppTourCard";
import { ExistingUserOverhaulIntroCard } from "../components/first-run/ExistingUserOverhaulIntroCard";
import { ScreenWrapper } from "../components/ScreenWrapper";
import type {
  TodayMissionAction,
  TodayMissionStatus,
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
  pauseAndPersistFirstRunWalkthrough,
  resumeAndPersistFirstRunWalkthrough,
  type FirstRunWalkthroughState,
} from "../../lib/api/firstRunWalkthroughService";
import { supabase } from "../../lib/supabase";
import { todayLocalDate } from "../../lib/utils/date";
import { logError } from "../../lib/utils/logger";
import { useDashboardData } from "../hooks/useDashboardData";
import { styles } from "./DashboardScreen.styles";
import { getGuidedWorkoutContext } from "../../lib/api/fightCampService";
import { isGuidedEngineActivityType } from "../../lib/engine/sessionOwnership";

const BRAND_LOGO = require("../../assets/images/athleticore-logo.png");

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const useCompactReadinessHero = screenWidth < 380;
  const [firstRunGuidance, setFirstRunGuidance] =
    React.useState<FirstRunGuidanceState | null>(null);
  const [firstRunWalkthrough, setFirstRunWalkthrough] =
    React.useState<FirstRunWalkthroughState | null>(null);
  const [appTourIndex, setAppTourIndex] = React.useState(0);
  const [showFirstRunModal, setShowFirstRunModal] = React.useState(false);

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
      setFirstRunGuidance(next);
      setFirstRunWalkthrough(walkthrough);
      setShowFirstRunModal(
        next.status === "pending" &&
        !next.introSeenAt &&
        !shouldShowExistingUserOverhaulIntro(walkthrough) &&
        !shouldShowFirstSignInAppTour(walkthrough),
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

  useFocusEffect(
    React.useCallback(() => {
      void loadFirstRunGuidance();
    }, [loadFirstRunGuidance]),
  );

  const {
    loading,
    refreshing,
    onRefresh,
    checkinDone,
    sessionDone,
    todayActivities,
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
  const hasLivePlanningState = Boolean(todayPlanEntry) || todayActivities.length > 0;
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
    if (hasLivePlanningState) {
      openPlanScreen("CalendarMain");
      return;
    }

    openBuildPhaseSetup();
  }, [
    hasLivePlanningState,
    openBuildPhaseSetup,
    openPlanScreen,
  ]);

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
  const showFightHubTourStep = Boolean(
    performanceContext.available ||
    performanceContext.journey.nextEventLabel ||
    todayMission.fightOrCompetitionContext,
  );
  const existingUserMissingDataPrompts = React.useMemo(
    () => buildExistingUserMissingDataPrompts(performanceContext),
    [performanceContext],
  );
  const appTourSteps = React.useMemo(
    () => buildFirstSignInAppTourSteps(showFightHubTourStep),
    [showFightHubTourStep],
  );
  const shouldShowExistingUserIntro = shouldShowExistingUserOverhaulIntro(firstRunWalkthrough);
  const shouldShowAppTour = !shouldShowExistingUserIntro && shouldShowFirstSignInAppTour(firstRunWalkthrough);
  const appTourPaused = firstRunWalkthrough?.status === "skipped";

  const completeExistingUserIntro = React.useCallback(async () => {
    setFirstRunWalkthrough((current) => current ? {
      ...current,
      status: "in_progress",
      currentStep: "app_tour",
      hasSeenTodayMissionIntro: true,
      completedSteps: Array.from(new Set([...current.completedSteps, "today_mission_intro"])),
    } : current);

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      const next = await completeAndPersistFirstRunWalkthroughStep({
        userId,
        step: "today_mission_intro",
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

    openPlanScreen("WeeklyPlanSetup", {
      initialGoalMode: performanceContext.phase.current === "camp" || performanceContext.phase.current === "competition_week"
        ? "fight_camp"
        : "build_phase",
      initialPhaseKey: joinedPrompts.includes("fight") ? "fight" : "objective",
      source: "existing_user_overhaul_intro",
    });
  }, [
    existingUserMissingDataPrompts,
    navigation,
    openFuelScreen,
    openPlanScreen,
    performanceContext.phase.current,
  ]);

  React.useEffect(() => {
    setAppTourIndex((current) => Math.min(current, Math.max(appTourSteps.length - 1, 0)));
  }, [appTourSteps.length]);

  const handleAppTourBack = React.useCallback(() => {
    setAppTourIndex((current) => Math.max(0, current - 1));
  }, []);

  const completeAppTour = React.useCallback(async () => {
    setFirstRunWalkthrough((current) => current ? {
      ...current,
      status: "completed",
      currentStep: null,
      hasSeenAppTour: true,
      completedSteps: Array.from(new Set([...current.completedSteps, "app_tour"])),
    } : current);

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      const next = await completeAndPersistFirstRunWalkthroughStep({
        userId,
        step: "app_tour",
      });
      setFirstRunWalkthrough(next);
    } catch (error) {
      logError("DashboardScreen.completeFirstSignInAppTour", error);
    }
  }, []);

  const handleAppTourNext = React.useCallback(() => {
    if (appTourIndex >= appTourSteps.length - 1) {
      void completeAppTour();
      return;
    }
    setAppTourIndex((current) => Math.min(appTourSteps.length - 1, current + 1));
  }, [appTourIndex, appTourSteps.length, completeAppTour]);

  const handleAppTourSkip = React.useCallback(async () => {
    setFirstRunWalkthrough((current) => current ? {
      ...current,
      status: "skipped",
      currentStep: "app_tour",
      canResume: true,
    } : current);

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      const next = await pauseAndPersistFirstRunWalkthrough({
        userId,
        currentStep: "app_tour",
      });
      setFirstRunWalkthrough(next);
    } catch (error) {
      logError("DashboardScreen.pauseFirstSignInAppTour", error);
    }
  }, []);

  const handleAppTourResume = React.useCallback(async () => {
    setFirstRunWalkthrough((current) => current ? {
      ...current,
      status: "in_progress",
      currentStep: "app_tour",
      canResume: true,
    } : current);

    try {
      const userId = await getActiveUserId();
      if (!userId) return;
      const next = await resumeAndPersistFirstRunWalkthrough({ userId });
      setFirstRunWalkthrough(next);
    } catch (error) {
      logError("DashboardScreen.resumeFirstSignInAppTour", error);
    }
  }, []);

  const handleOpenAppTourStep = React.useCallback((step: FirstSignInAppTourStep) => {
    switch (step.id) {
      case "training":
        openTrainScreen("WorkoutHome");
        break;
      case "fueling":
        openFuelScreen("NutritionHome");
        break;
      case "check_in":
        navigation.navigate("Log");
        break;
      case "journey":
        navigation.navigate("Plan");
        break;
      case "fight_hub":
        openPlanScreen("WeeklyPlanSetup", {
          initialGoalMode: "fight_camp",
          initialPhaseKey: "objective",
          source: "first_sign_in_tour",
        });
        break;
      case "today_mission":
      default:
        break;
    }
  }, [navigation, openFuelScreen, openPlanScreen, openTrainScreen]);

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
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.todayMissionWrap}>
              <TodayMissionPanel
                mission={todayMission}
                onAction={handleTodayMissionAction}
              />
            </View>

            {shouldShowExistingUserIntro ? (
              <ExistingUserOverhaulIntroCard
                missingDataPrompts={existingUserMissingDataPrompts}
                onContinue={completeExistingUserIntro}
                onDismiss={dismissExistingUserIntro}
                onReviewMissingData={reviewExistingUserMissingContext}
              />
            ) : null}

            {shouldShowAppTour ? (
              <FirstSignInAppTourCard
                steps={appTourSteps}
                currentIndex={appTourIndex}
                paused={appTourPaused}
                onBack={handleAppTourBack}
                onNext={handleAppTourNext}
                onSkip={handleAppTourSkip}
                onResume={handleAppTourResume}
                onOpenStep={handleOpenAppTourStep}
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

            <View style={styles.readinessHeroWrap}>
              <Card
                style={[
                  styles.readinessHeroCard,
                  useCompactReadinessHero && styles.readinessHeroCardCompact,
                  { borderColor: getReadinessBorderColor(currentLevel) },
                ]}
                backgroundTone="readiness"
                backgroundScrimColor="rgba(10, 10, 10, 0.50)"
              >
                <View pointerEvents="none" style={styles.readinessHeroGlow} />
                <View
                  pointerEvents="none"
                  style={[
                    styles.readinessHeroAccentLine,
                    { backgroundColor: getReadinessColor(currentLevel) },
                  ]}
                />
                <View
                  style={[
                    styles.readinessHeroCopy,
                    useCompactReadinessHero && styles.readinessHeroCopyCompact,
                  ]}
                >
                  <Text style={styles.readinessHeroKicker}>TODAY'S READINESS</Text>
                  <Text style={styles.readinessHeroTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
                    {getReadinessHeadline(currentLevel, getTodayMissionStatusLabel(todayMission.status))}
                  </Text>
                  <Text
                    style={[
                      styles.readinessHeroBody,
                      useCompactReadinessHero && styles.readinessHeroBodyCompact,
                    ]}
                    numberOfLines={2}
                  >
                    {getReadinessCircleCopy(currentLevel)}
                  </Text>
                  <View
                    style={[
                      styles.readinessStatusPill,
                      {
                        borderColor: getReadinessBorderColor(currentLevel),
                        backgroundColor: getReadinessPillBackground(currentLevel),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.readinessStatusDot,
                        { backgroundColor: getReadinessColor(currentLevel) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.readinessStatusText,
                        { color: getReadinessColor(currentLevel) },
                      ]}
                      numberOfLines={1}
                    >
                      {getReadinessSignalLabel(currentLevel)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.readinessHeroRingShell,
                    useCompactReadinessHero && styles.readinessHeroRingShellCompact,
                  ]}
                >
                  <RadialProgress
                    progress={getReadinessProgress(readinessScore, currentLevel)}
                    size={useCompactReadinessHero ? 156 : 168}
                    strokeWidth={13}
                    color={getReadinessColor(currentLevel)}
                    trackColor="rgba(245,245,240,0.13)"
                    label={getReadinessCircleValue(readinessScore)}
                    centerSublabel={getReadinessCenterSublabel(readinessScore)}
                    textColor="#F5F5F0"
                    glowColor={getReadinessGlowColor(currentLevel)}
                    centerFillColor="rgba(10, 10, 10, 0.78)"
                    centerBorderColor={getReadinessBorderColor(currentLevel)}
                    labelStyle={styles.readinessHeroCircleLabel}
                    centerSublabelStyle={styles.readinessHeroCircleSublabel}
                  />
                </View>
              </Card>
            </View>

            <View style={styles.content}>
              <UnifiedJourneySummaryCard
                summary={performanceContext}
                compact
                showBodyMass={Boolean(performanceContext.bodyMass)}
              />
            </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(D).duration(ANIMATION.slow).springify()} style={styles.quickActionGrid}>
            <AnimatedPressable
                testID="dashboard-quick-action-check-in"
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
                testID="dashboard-quick-action-train"
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
                testID="dashboard-quick-action-fuel"
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
                testID="dashboard-quick-action-plan"
                style={styles.quickActionBlock}
                onPress={openPlanningSurface}
            >
                <View style={styles.quickActionIconContainer}>
                   <IconCalendar size={28} color={COLORS.accent} />
                </View>
                <Text style={styles.quickActionLabelBlock}>
                   {hasLivePlanningState ? "Calendar" : "Setup"}
                </Text>
            </AnimatedPressable>
        </Animated.View>

        <View style={styles.content}>
          {weightTrend ? (
            <Animated.View
              entering={FadeInDown.delay(D * 1.2)
                .duration(ANIMATION.slow)
                .springify()}
            >
              <WeightTrendCard
                trend={weightTrend}
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
    </ScreenWrapper>
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

function shouldShowFirstSignInAppTour(state: FirstRunWalkthroughState | null): boolean {
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
    prompts.push("Review planning context so Today's Mission can make the next call with more confidence.");
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

function buildFirstSignInAppTourSteps(includeFightHub: boolean): FirstSignInAppTourStep[] {
  const steps: FirstSignInAppTourStep[] = [
    {
      id: "today_mission",
      title: "Today's Mission",
      body: "Start here. Athleticore shows what matters today, why it matters, what changed, and what to do next.",
      actionLabel: "Stay on Today",
    },
    {
      id: "training",
      title: "Training",
      body: "Your plan adapts around your phase, readiness, and protected workouts.",
      actionLabel: "Open Train",
    },
    {
      id: "fueling",
      title: "Fueling",
      body: "Fueling targets move with your training load, recovery needs, and fight timeline.",
      actionLabel: "Open Fuel",
    },
    {
      id: "check_in",
      title: "Check-In / Readiness",
      body: "A quick check-in helps Athleticore know when to push, trim extras, or protect recovery.",
      actionLabel: "Log check-in",
    },
    {
      id: "journey",
      title: "Journey",
      body: "Your phases, fights, recovery, and progress stay connected. The plan can change without the journey restarting.",
      actionLabel: "Open Plan",
    },
  ];

  if (includeFightHub) {
    steps.push({
      id: "fight_hub",
      title: "Fight / Competition Hub",
      body: "Add tentative or confirmed fights here. Athleticore will adjust training, fuel, and recovery around the time available.",
      actionLabel: "Update fight details",
    });
  }

  return steps;
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

function getReadinessHeadline(level: string | null, fallback: string): string {
  if (level === "Prime") return "Ready to push";
  if (level === "Caution") return "Train smart";
  if (level === "Depleted") return "Pull back";
  return fallback;
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

function getReadinessCircleCopy(level: string | null): string {
  if (level === "Prime") return "Your body is ready for quality work.";
  if (level === "Caution") return "Train, but leave room in the tank.";
  if (level === "Depleted") return "Recovery needs to lead today.";
  return "Check in to sharpen this signal.";
}

function getTodayMissionStatusLabel(status: TodayMissionStatus): string {
  if (status === "good_to_push") return "Ready";
  if (status === "train_smart") return "Train smart";
  if (status === "pull_back") return "Recovery first";
  if (status === "blocked") return "Adjust first";
  return "Needs context";
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
