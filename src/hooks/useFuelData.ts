import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { getDailyEngineState } from '../../lib/api/dailyMissionService';
import {
  buildUnifiedPerformanceViewModel,
  nutritionNumbersFromUnifiedTarget,
} from '../../lib/performance-engine';
import {
  ensureDailyLedger,
  getDailyNutrition,
  getFavoriteFoods,
  getRecentFoods,
} from '../../lib/api/nutritionService';
import { todayLocalDate } from '../../lib/utils/date';
import { logError } from '../../lib/utils/logger';
import type { MealType } from '../../lib/engine/types';
import type { FuelHomeViewModel } from './fuel/types';
import {
  buildFoodSearchResultFromFoodItemRow,
  buildHydrationEntries,
  buildMealGroups,
  buildTotalsFromFoodLog,
  summarizeFuelHistory,
} from './fuel/utils';

const EMPTY_MEALS: Record<MealType, []> = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snacks: [],
};

const EMPTY_MODEL: FuelHomeViewModel = {
  userId: null,
  date: todayLocalDate(),
  formattedDate: '',
  dailyMission: null,
  targets: null,
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 },
  meals: EMPTY_MEALS,
  hydrationEntries: [],
  favorites: [],
  recent: [],
  activeCutProtocol: null,
  historySummary: { mealCount: 0, waterOz: 0 },
  missionReasonLines: [],
  missionTraceLines: [],
  performanceContext: buildUnifiedPerformanceViewModel(null),
};

export function useFuelData() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewModel, setViewModel] = useState<FuelHomeViewModel>(EMPTY_MODEL);
  const requestIdRef = useRef(0);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    const requestId = ++requestIdRef.current;
    const date = todayLocalDate();

    const isCurrentRequest = () => requestId === requestIdRef.current;

    try {
      if (isCurrentRequest()) {
        setError(null);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!isCurrentRequest()) {
          return;
        }

        setViewModel({ ...EMPTY_MODEL, date });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userId = session.user.id;
      const engineState = await getDailyEngineState(userId, date, { forceRefresh });
      const performanceContext = buildUnifiedPerformanceViewModel(engineState.unifiedPerformance);
      const canonicalNutritionTarget = engineState.unifiedPerformance?.canonicalOutputs.nutritionTarget ?? null;
      const canonicalNutritionNumbers = nutritionNumbersFromUnifiedTarget(canonicalNutritionTarget);
      const resolvedCalories = Math.round(canonicalNutritionNumbers.calories ?? engineState.mission.fuelDirective.calories);
      const resolvedProtein = Math.round(canonicalNutritionNumbers.proteinG ?? engineState.mission.fuelDirective.protein);
      const resolvedCarbs = Math.round(canonicalNutritionNumbers.carbsG ?? engineState.mission.fuelDirective.carbs);
      const resolvedFat = Math.round(canonicalNutritionNumbers.fatG ?? engineState.mission.fuelDirective.fat);

      await ensureDailyLedger(userId, date, {
        tdee: engineState.nutritionTargets.tdee,
        calories: resolvedCalories,
        protein: resolvedProtein,
        carbs: resolvedCarbs,
        fat: resolvedFat,
        weightCorrectionDeficit: engineState.nutritionTargets.weightCorrectionDeficit,
        targetSource: engineState.nutritionTargets.source,
      });

      const [nutritionData, favoriteRows, recentRows] = await Promise.all([
        getDailyNutrition(userId, date),
        getFavoriteFoods(userId),
        getRecentFoods(userId, 8),
      ]);

      const meals = buildMealGroups(nutritionData.foodLog as never[]);
      const hydrationEntries = buildHydrationEntries(
        (nutritionData.hydrationLog as Array<{ id: string; amount_oz: number; created_at?: string | null }>) ?? [],
      );
      const totals = buildTotalsFromFoodLog(
        nutritionData.foodLog as Array<{
          logged_calories?: number | null;
          logged_protein?: number | null;
          logged_carbs?: number | null;
          logged_fat?: number | null;
        }>,
        nutritionData.summary?.total_water_oz,
      );

      if (!isCurrentRequest()) {
        return;
      }

      setViewModel({
        userId,
        date,
        formattedDate: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        dailyMission: engineState.mission,
        targets: {
          ...engineState.nutritionTargets,
          adjustedCalories: resolvedCalories,
          protein: resolvedProtein,
          carbs: resolvedCarbs,
          fat: resolvedFat,
          message: canonicalNutritionTarget?.explanation?.summary ?? engineState.mission.fuelDirective.message,
        },
        totals,
        meals,
        hydrationEntries,
        favorites: favoriteRows.map(buildFoodSearchResultFromFoodItemRow),
        recent: recentRows.map(buildFoodSearchResultFromFoodItemRow),
        activeCutProtocol: engineState.cutProtocol,
        historySummary: summarizeFuelHistory({
          totalWaterOz: nutritionData.summary?.total_water_oz,
          mealGroups: meals,
        }),
        missionReasonLines: canonicalNutritionTarget?.explanation?.reasons ?? engineState.nutritionTargets.reasonLines,
        missionTraceLines: performanceContext.explanations.map((explanation) => explanation.summary),
        performanceContext,
      });
    } catch (loadError) {
      if (!isCurrentRequest()) {
        return;
      }

      logError('useFuelData.loadData', loadError);
      setError('We could not load Fuel right now. Pull to try again.');
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (requestIdRef.current >= 0) {
          void loadData();
        }
      });

      return () => {
        requestIdRef.current += 1;
        task.cancel?.();
      };
    }, [loadData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

  return {
    loading,
    refreshing,
    error,
    viewModel,
    reload: loadData,
    onRefresh,
  };
}
