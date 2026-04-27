import React from "react";
import {
  Image,
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
import { AnimatedPressable } from "../components/AnimatedPressable";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { COLORS, RADIUS, SPACING, ANIMATION } from "../theme/theme";
import {
  IconBarbell,
  IconBell,
  IconCheckCircle,
  IconDroplets,
  IconCalendar,
} from "../components/icons";
import { MissionDashboardPanel } from "../components/dashboard/MissionDashboardPanel";
import { buildCompassViewModel } from "../../lib/engine/presentation";
import { buildMissionDashboardViewModel } from "../../lib/engine/presentation/missionDashboard";
import { ScreenWrapper } from "../components/ScreenWrapper";

import type { CutSafetyFlag } from "../../lib/engine/types";
import { getActiveUserId } from "../../lib/api/athleteContextService";
import {
  getAndSyncFirstRunGuidanceState,
  markFirstRunGuidanceIntroSeen,
  type FirstRunGuidanceState,
} from "../../lib/api/firstRunGuidanceService";
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
    checkinDone,
    sessionDone,
    todayActivities,
    primaryActivity,
    currentLevel,
    workoutPrescription,
    todayPlanEntry,
    weightTrend,
    activeCutProtocol,
    dailyMission,
    hasActiveFightCamp,
    hasActiveCutPlan,
    weeklyReview,
    recentTrainingSessions,
  } = useDashboardData();

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

  const activeCutSafetyFlags = React.useMemo(
    () => normalizeCutSafetyFlags(activeCutProtocol?.safety_flags),
    [activeCutProtocol?.safety_flags],
  );
  const missionDashboard = React.useMemo(
    () =>
      buildMissionDashboardViewModel({
        mission: dailyMission,
        acwr,
        readinessState: currentLevel,
        checkinDone,
        sessionDone,
        hasActiveFightCamp,
        hasActiveCutPlan,
        todayPlanEntryIsDeload: Boolean(todayPlanEntry?.is_deload),
        activeCutProtocol,
        weightTrend,
        weeklyReview,
        recentTrainingSessions,
        cutSafetyFlags: activeCutSafetyFlags,
      }),
    [
      dailyMission,
      acwr,
      currentLevel,
      checkinDone,
      sessionDone,
      hasActiveFightCamp,
      hasActiveCutPlan,
      todayPlanEntry?.is_deload,
      activeCutProtocol,
      weightTrend,
      weeklyReview,
      recentTrainingSessions,
      activeCutSafetyFlags,
    ],
  );
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

            <View style={styles.missionDashboardWrap}>
              <MissionDashboardPanel
                viewModel={missionDashboard}
                primaryActionLabel={compassVM.primaryCTALabel}
                onPrimaryAction={handleCompassCTA}
                secondaryActionLabel={compassVM.secondaryCTALabel}
                onSecondaryAction={handleCompassSecondaryCTA}
              />
            </View>
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
                   {hasLivePlanningState ? "Calendar" : "Setup"}
                </Text>
            </AnimatedPressable>
        </Animated.View>

        <View style={styles.content}>
          {shouldShowFirstRunChecklist && firstRunGuidance ? (
            <Animated.View
              entering={FadeInDown.delay(D)
                .duration(ANIMATION.slow)
                .springify()}
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
