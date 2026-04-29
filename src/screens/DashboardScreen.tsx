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
  IconBell,
  IconCheckCircle,
  IconDroplets,
  IconCalendar,
} from "../components/icons";
import { TodayMissionPanel } from "../components/dashboard/TodayMissionPanel";
import { UnifiedJourneySummaryCard } from "../components/performance/UnifiedJourneySummaryCard";
import { ScreenWrapper } from "../components/ScreenWrapper";
import type { TodayMissionAction, TodayMissionStatus } from "../../lib/performance-engine";

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
  const { width: screenWidth } = useWindowDimensions();
  const useCompactReadinessHero = screenWidth < 380;
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

            <View style={styles.todayMissionWrap}>
              <TodayMissionPanel
                mission={todayMission}
                onAction={handleTodayMissionAction}
              />
            </View>

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
