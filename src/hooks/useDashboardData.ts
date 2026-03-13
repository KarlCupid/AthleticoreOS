import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { calculateACWR } from '../../lib/engine/calculateACWR';
import { adjustForBiology } from '../../lib/engine/adjustForBiology';
import { getHydrationProtocol } from '../../lib/engine/getHydrationProtocol';
import { getGlobalReadinessState } from '../../lib/engine/getGlobalReadinessState';
import { calculateNutritionTargets, resolveDailyNutritionTargets } from '../../lib/engine/calculateNutrition';
import {
  calculateWeightTrend,
  calculateWeightCorrection,
  calculateWeightReadinessPenalty,
} from '../../lib/engine/calculateWeight';
import { getDailyNutrition, ensureDailyLedger } from '../../lib/api/nutritionService';
import { getDailyMission } from '../../lib/api/dailyMissionService';
import { generateRollingSchedule, getDailyAdaptationForToday, getScheduledActivities } from '../../lib/api/scheduleService';
import { getWeightHistory, getEffectiveWeight } from '../../lib/api/weightService';
import { getRecentExerciseIds } from '../../lib/api/scService';
import { generateWorkout } from '../../lib/engine/calculateSC';
import {
  getAthleteContext,
  getActiveUserId,
  normalizeActivityLevel,
  normalizeCycleDay,
  normalizeNutritionGoal,
} from '../../lib/api/athleteContextService';
import { logError } from '../../lib/utils/logger';
import type {
  ACWRResult,
  BiologyResult,
  DailyMission,
  HydrationResult,
  ResolvedNutritionTargets,
  WeightTrendResult,
  ScheduledActivityRow,
  MacroLedgerRow,
  ExerciseLibraryRow,
  WorkoutPrescription,
  DailyCutProtocolRow,
  MuscleGroup,
} from '../../lib/engine/types';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { todayLocalDate } from '../../lib/utils/date';
import { getFightCampStatus } from '../../lib/api/fightCampService';
import { calculateCampRisk, type CampRiskAssessment } from '../../lib/engine/calculateCampRisk';
import { getTodayPlanEntry } from '../../lib/api/weeklyPlanService';
import {
  computeActualNutrition,
  composePrescriptionMessage,
  toFightPrepPhase,
  type DashboardNutritionTotals,
} from './dashboard/utils';

interface DailyCheckinRow {
  cycle_day?: number | null;
  sleep_quality: number;
  morning_weight: number | null;
  readiness: number;
}

const EMPTY_VOLUME: Record<MuscleGroup, number> = {
  chest: 0,
  back: 0,
  shoulders: 0,
  quads: 0,
  hamstrings: 0,
  glutes: 0,
  arms: 0,
  core: 0,
  full_body: 0,
  neck: 0,
  calves: 0,
};

const EMPTY_NUTRITION: DashboardNutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  water: 0,
};

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [acwr, setAcwr] = useState<ACWRResult | null>(null);
  const [biology, setBiology] = useState<BiologyResult | null>(null);
  const [hydration, setHydration] = useState<HydrationResult | null>(null);

  const [checkinDone, setCheckinDone] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [morningWeight, setMorningWeight] = useState<string | null>(null);
  const [readinessSubjective, setReadinessSubjective] = useState<number | null>(null);

  const [todayActivities, setTodayActivities] = useState<ScheduledActivityRow[]>([]);
  const [currentLedger, setCurrentLedger] = useState<MacroLedgerRow | null>(null);
  const [prescriptionMessage, setPrescriptionMessage] = useState<string | null>(null);
  const [workoutPrescription, setWorkoutPrescription] = useState<WorkoutPrescription | null>(null);
  const [weightTrend, setWeightTrend] = useState<WeightTrendResult | null>(null);
  const [dailyMission, setDailyMission] = useState<DailyMission | null>(null);

  const { setReadiness, currentLevel } = useReadinessTheme();

  const [nutritionTargets, setNutritionTargets] = useState<ResolvedNutritionTargets | null>(null);
  const [actualNutrition, setActualNutrition] = useState<DashboardNutritionTotals>(EMPTY_NUTRITION);
  const [activeCutProtocol, setActiveCutProtocol] = useState<DailyCutProtocolRow | null>(null);
  const [campStatusLabel, setCampStatusLabel] = useState<string>('Build Phase');
  const [campRisk, setCampRisk] = useState<CampRiskAssessment | null>(null);

  const loadDashboardData = useCallback(async () => {
    const userId = await getActiveUserId();
    if (!userId) {
      setCampRisk(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const todayStr = todayLocalDate();

    try {
      try {
        await generateRollingSchedule(userId, 4);
      } catch (error) {
        logError('useDashboardData.generateRollingSchedule', error, { userId });
      }

      const athleteContext = await getAthleteContext(userId);
      const profile = athleteContext.profile;

      let campStatus: Awaited<ReturnType<typeof getFightCampStatus>> | null = null;
      try {
        campStatus = await getFightCampStatus(userId, todayStr);
        setCampStatusLabel(campStatus.label);
      } catch (error) {
        logError('useDashboardData.getFightCampStatus', error, { userId });
        setCampStatusLabel('Build Phase');
      }

      const [
        { data: checkinData },
        { data: trainingSessions },
        { data: ledger },
        { data: library },
        scheduledActivities,
      ] = await Promise.all([
        supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr)
          .maybeSingle(),
        supabase
          .from('training_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr),
        supabase
          .from('macro_ledger')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr)
          .maybeSingle(),
        supabase.from('exercise_library').select('*'),
        getScheduledActivities(userId, todayStr, todayStr),
      ]);

      const checkin = (checkinData as DailyCheckinRow | null) ?? null;
      const exerciseRows = (library as ExerciseLibraryRow[] | null) ?? [];

      setCheckinDone(Boolean(checkin));
      if (checkin) {
        setSleepQuality(checkin.sleep_quality);
        setMorningWeight(checkin.morning_weight != null ? String(checkin.morning_weight) : null);
        setReadinessSubjective(checkin.readiness);
      } else {
        setSleepQuality(null);
        setMorningWeight(null);
        setReadinessSubjective(null);
      }

      setSessionDone(Boolean(trainingSessions && trainingSessions.length > 0));
      setCurrentLedger((ledger as MacroLedgerRow | null) ?? null);
      setTodayActivities(scheduledActivities);

      const cycleDay = normalizeCycleDay(checkin?.cycle_day ?? profile?.cycle_day ?? null);

      const acwrResult = await calculateACWR({
        userId,
        supabaseClient: supabase,
        asOfDate: todayStr,
        fitnessLevel: athleteContext.fitnessLevel,
        phase: athleteContext.phase,
        isOnActiveCut: athleteContext.isOnActiveCut,
      });
      setAcwr(acwrResult);

      let cutProtocol: DailyCutProtocolRow | null = null;
      if (athleteContext.isOnActiveCut) {
        const { data: proto } = await supabase
          .from('daily_cut_protocols')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayStr)
          .maybeSingle();
        cutProtocol = (proto as DailyCutProtocolRow | null) ?? null;
      }
      setActiveCutProtocol(cutProtocol);

      let currentWeightTrend: WeightTrendResult | null = null;
      let weightPenaltyPoints = 0;
      let correctionDeficit = 0;
      const profilePhase = toFightPrepPhase(profile?.phase);

      if (profile) {
        try {
          const effectiveWeight = await getEffectiveWeight(userId, profile.base_weight ?? 150);
          const weightHistory = await getWeightHistory(userId, 30);

          currentWeightTrend = calculateWeightTrend({
            weightHistory,
            targetWeightLbs: profile.target_weight ?? null,
            baseWeightLbs: profile.base_weight ?? effectiveWeight,
            phase: profilePhase,
            deadlineDate: profile.fight_date ?? null,
          });
          setWeightTrend(currentWeightTrend);

          const tempTargets = calculateNutritionTargets({
            weightLbs: effectiveWeight,
            heightInches: profile.height_inches ?? null,
            age: profile.age ?? null,
            biologicalSex: profile.biological_sex ?? 'male',
            activityLevel: normalizeActivityLevel(profile.activity_level),
            phase: profilePhase,
            nutritionGoal: normalizeNutritionGoal(profile.nutrition_goal),
            cycleDay,
            coachProteinOverride: null,
            coachCarbsOverride: null,
            coachFatOverride: null,
            coachCaloriesOverride: null,
          });

          const weightCorrection = calculateWeightCorrection({
            weightTrend: currentWeightTrend,
            phase: profilePhase,
            currentTDEE: tempTargets.tdee,
            deadlineDate: profile.fight_date ?? null,
          });
          correctionDeficit = weightCorrection.correctionDeficitCal;

          const penalty = calculateWeightReadinessPenalty(currentWeightTrend, profilePhase);
          weightPenaltyPoints = penalty.penaltyPoints;
        } catch (error) {
          logError('useDashboardData.weightEngine', error, { userId });
        }
      } else {
        setWeightTrend(null);
      }

      if (checkin) {
        const readinessState = getGlobalReadinessState({
          sleep: checkin.sleep_quality,
          readiness: checkin.readiness,
          acwr: acwrResult.ratio,
          weightPenalty: weightPenaltyPoints,
        });
        setReadiness(readinessState);

        const todayPlanEntry = await getTodayPlanEntry(userId);

        if (todayPlanEntry?.prescription_snapshot?.exercises?.length) {
          setWorkoutPrescription(todayPlanEntry.prescription_snapshot);
        } else if (exerciseRows.length > 0) {
          const recentIds = await getRecentExerciseIds(userId);
          const workoutRaw = generateWorkout({
            readinessState,
            phase: athleteContext.phase,
            acwr: acwrResult.ratio,
            exerciseLibrary: exerciseRows,
            recentExerciseIds: recentIds,
            recentMuscleVolume: { ...EMPTY_VOLUME },
            trainingIntensityCap: cutProtocol?.training_intensity_cap ?? undefined,
            trainingDate: todayStr,
            fitnessLevel: athleteContext.fitnessLevel,
          });
          setWorkoutPrescription(workoutRaw);
        }

        try {
          const adaptation = await getDailyAdaptationForToday(userId);
          setPrescriptionMessage(
            composePrescriptionMessage(adaptation?.overarchingMessage, cutProtocol?.training_recommendation),
          );
        } catch (error) {
          logError('useDashboardData.getDailyAdaptationForToday', error, { userId });
          setPrescriptionMessage(cutProtocol?.training_recommendation ?? null);
        }
      } else {
        setWorkoutPrescription(null);
        setPrescriptionMessage(cutProtocol?.training_recommendation ?? null);
      }

      if (profile) {
        const effectiveWeight = currentWeightTrend?.currentWeight ?? profile.base_weight ?? 150;

        if (profile.biological_sex === 'female' && profile.cycle_tracking && cycleDay != null) {
          try {
            const bioResult = adjustForBiology({ cycleDay });
            setBiology(bioResult);
          } catch (error) {
            logError('useDashboardData.adjustForBiology', error, { userId, cycleDay });
            setBiology(null);
          }
        } else {
          setBiology(null);
        }

        try {
          const hydResult = getHydrationProtocol({
            phase: profilePhase,
            fightStatus: profile.fight_status ?? 'amateur',
            currentWeightLbs: effectiveWeight,
            targetWeightLbs: profile.target_weight ?? effectiveWeight,
            weeklyVelocityLbs: currentWeightTrend?.weeklyVelocityLbs,
          });
          setHydration(
            cutProtocol ? { ...hydResult, dailyWaterOz: cutProtocol.water_target_oz } : hydResult,
          );
        } catch (error) {
          logError('useDashboardData.getHydrationProtocol', error, { userId });
          setHydration(null);
        }

        try {
          const targets = calculateNutritionTargets({
            weightLbs: effectiveWeight,
            heightInches: profile.height_inches ?? null,
            age: profile.age ?? null,
            biologicalSex: profile.biological_sex ?? 'male',
            activityLevel: normalizeActivityLevel(profile.activity_level),
            phase: profilePhase,
            nutritionGoal: normalizeNutritionGoal(profile.nutrition_goal),
            cycleDay,
            coachProteinOverride: profile.coach_protein_override ?? null,
            coachCarbsOverride: profile.coach_carbs_override ?? null,
            coachFatOverride: profile.coach_fat_override ?? null,
            coachCaloriesOverride: profile.coach_calories_override ?? null,
            weightCorrectionDeficit: correctionDeficit,
          });
          const activeActivities = scheduledActivities.filter((activity) => activity.status !== 'skipped');
          const finalTargets = resolveDailyNutritionTargets(
            targets,
            cutProtocol,
            activeActivities.map((activity) => ({
              activity_type: activity.activity_type,
              expected_intensity: activity.expected_intensity,
              estimated_duration_min: activity.estimated_duration_min,
            })),
          );

          setNutritionTargets(finalTargets);

          await ensureDailyLedger(userId, todayStr, {
            tdee: finalTargets.tdee,
            calories: finalTargets.adjustedCalories,
            protein: finalTargets.protein,
            carbs: finalTargets.carbs,
            fat: finalTargets.fat,
            weightCorrectionDeficit: finalTargets.weightCorrectionDeficit,
            targetSource: finalTargets.source,
          });
        } catch (error) {
          logError('useDashboardData.calculateNutritionTargets', error, { userId });
          setNutritionTargets(null);
        }

        try {
          const nutritionData = await getDailyNutrition(userId, todayStr);
          const actuals = computeActualNutrition(
            nutritionData.foodLog as {
              logged_calories?: number | null;
              logged_protein?: number | null;
              logged_carbs?: number | null;
              logged_fat?: number | null;
            }[],
            nutritionData.summary?.total_water_oz,
          );
          setActualNutrition(actuals);
        } catch (error) {
          logError('useDashboardData.getDailyNutrition', error, { userId });
          setActualNutrition(EMPTY_NUTRITION);
        }
      } else {
        setBiology(null);
        setHydration(null);
        setNutritionTargets(null);
        setActualNutrition(EMPTY_NUTRITION);
      }

      const isTravelWindow = Boolean(
        campStatus?.camp?.travelStartDate
        && campStatus.camp.travelStartDate <= todayStr
        && (!campStatus.camp.travelEndDate || todayStr <= campStatus.camp.travelEndDate),
      );

      const remainingWeightLbs = currentWeightTrend ? Math.max(0, currentWeightTrend.remainingLbs) : null;
      const nextCampRisk = calculateCampRisk({
        goalMode: athleteContext.goalMode,
        weightCutState: campStatus?.weightCutState ?? 'none',
        daysOut: campStatus?.daysOut ?? null,
        remainingWeightLbs,
        weighInTiming: campStatus?.camp?.weighInTiming ?? null,
        readinessAvg: checkin?.readiness ?? null,
        acwrRatio: acwrResult.ratio,
        isTravelWindow,
      });
      setCampRisk(nextCampRisk);

      try {
        const mission = await getDailyMission(userId, todayStr);
        setDailyMission(mission);
        setWorkoutPrescription(mission.trainingDirective.prescription);
        setPrescriptionMessage(mission.summary);
        setNutritionTargets({
          tdee: currentLedger?.base_tdee ?? 0,
          adjustedCalories: mission.fuelDirective.calories,
          protein: mission.fuelDirective.protein,
          carbs: mission.fuelDirective.carbs,
          fat: mission.fuelDirective.fat,
          proteinModifier: 1,
          phaseMultiplier: 0,
          weightCorrectionDeficit: 0,
          message: mission.fuelDirective.message,
          source: mission.fuelDirective.source === 'weight_cut_protocol'
            ? 'weight_cut_protocol'
            : mission.fuelDirective.source === 'daily_engine'
              ? 'daily_activity_adjusted'
              : 'base',
        });
        await ensureDailyLedger(userId, todayStr, {
          tdee: currentLedger?.base_tdee ?? 0,
          calories: mission.fuelDirective.calories,
          protein: mission.fuelDirective.protein,
          carbs: mission.fuelDirective.carbs,
          fat: mission.fuelDirective.fat,
          weightCorrectionDeficit: 0,
          targetSource: mission.fuelDirective.source === 'weight_cut_protocol'
            ? 'weight_cut_protocol'
            : mission.fuelDirective.source === 'daily_engine'
              ? 'daily_activity_adjusted'
              : 'base',
        });
        setHydration((prev) => ({
          dailyWaterOz: mission.hydrationDirective.waterTargetOz,
          waterLoadOz: prev?.waterLoadOz ?? null,
          shedCapPercent: prev?.shedCapPercent ?? 0,
          shedCapLbs: prev?.shedCapLbs ?? 0,
          message: mission.hydrationDirective.message,
        }));
      } catch (error) {
        logError('useDashboardData.getDailyMission', error, { userId });
        setDailyMission(null);
      }
    } catch (error) {
      logError('useDashboardData.loadDashboardData', error, { userId });
      setCampRisk(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, [setReadiness]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  return {
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
    readinessSubjective,
    todayActivities,
    currentLedger,
    currentLevel,
    prescriptionMessage,
    workoutPrescription,
    weightTrend,
    nutritionTargets,
    actualNutrition,
    activeCutProtocol,
    campStatusLabel,
    campRisk,
    dailyMission,
  };
}



















