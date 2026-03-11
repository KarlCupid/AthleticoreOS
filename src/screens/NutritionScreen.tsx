import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS, TYPOGRAPHY } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { Card } from '../components/Card';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { MacroProgressBar } from '../components/MacroProgressBar';
import { MacroPieChart } from '../components/MacroPieChart';
import { MealSection } from '../components/MealSection';
import { HydrationTracker } from '../components/HydrationTracker';
import { IconBarcode } from '../components/icons';
import { styles } from './NutritionScreen.styles';
import { supabase } from '../../lib/supabase';
import { calculateNutritionTargets } from '../../lib/engine/calculateNutrition';
import {
  getDailyNutrition,
  removeFoodEntry,
  logWater,
  ensureDailyLedger,
} from '../../lib/api/nutritionService';
import { getHydrationProtocol } from '../../lib/engine/getHydrationProtocol';
import { calculateWeightTrend, calculateWeightCorrection } from '../../lib/engine/calculateWeight';
import { getWeightHistory, getEffectiveWeight } from '../../lib/api/weightService';
import { MealType, NutritionTargets, DailyCutProtocolRow } from '../../lib/engine/types';
import { todayLocalDate } from '../../lib/utils/date';
import { logError } from '../../lib/utils/logger';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const STAGGER_DELAY = 50;

export function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { themeColor } = useReadinessTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [waterTarget, setWaterTarget] = useState(100);
  const [cutProtocol, setCutProtocol] = useState<DailyCutProtocolRow | null>(null);
  const [waterCurrent, setWaterCurrent] = useState(0);
  const [meals, setMeals] = useState<Record<MealType, any[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  });
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const today = todayLocalDate();

  const loadData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      // Load profile
      const { data: profile } = await supabase
        .from('athlete_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profile) return;

      // ── Active cut protocol (overrides standard targets when active) ──
      let todayCutProtocol: DailyCutProtocolRow | null = null;
      if (profile.active_cut_plan_id) {
        const { data: proto } = await supabase
          .from('daily_cut_protocols')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();
        todayCutProtocol = proto as DailyCutProtocolRow | null;
      }
      setCutProtocol(todayCutProtocol);

      // Get effective weight (today's checkin > latest > base_weight)
      const effectiveWeight = await getEffectiveWeight(userId, profile.base_weight ?? 150);
      const profilePhase = (profile.phase as 'off-season' | 'pre-camp' | 'fight-camp') ?? 'off-season';

      // Weight trend + correction
      let correctionDeficit = 0;
      let weeklyVelocity: number | undefined;
      try {
        const weightHistory = await getWeightHistory(userId, 30);
        const trend = calculateWeightTrend({
          weightHistory,
          targetWeightLbs: profile.target_weight ?? null,
          baseWeightLbs: profile.base_weight ?? effectiveWeight,
          phase: profilePhase,
          deadlineDate: profile.fight_date ?? null,
        });
        weeklyVelocity = trend.weeklyVelocityLbs;

        // Get TDEE for correction calculation
        const baseTDEE = calculateNutritionTargets({
          weightLbs: effectiveWeight,
          heightInches: profile.height_inches ?? null,
          age: profile.age ?? null,
          biologicalSex: profile.biological_sex ?? 'male',
          activityLevel: profile.activity_level ?? 'moderate',
          phase: profilePhase,
          nutritionGoal: profile.nutrition_goal ?? 'maintain',
          cycleDay: null,
          coachProteinOverride: null,
          coachCarbsOverride: null,
          coachFatOverride: null,
          coachCaloriesOverride: null,
        }).tdee;

        const correction = calculateWeightCorrection({
          weightTrend: trend,
          phase: profilePhase,
          currentTDEE: baseTDEE,
          deadlineDate: profile.fight_date ?? null,
        });
        correctionDeficit = correction.correctionDeficitCal;
      } catch (error) {
        logError('NutritionScreen.weightTrendAndCorrection', error, { userId });
      }

      // Calculate targets with effective weight + correction
      const nutritionTargets = calculateNutritionTargets({
        weightLbs: effectiveWeight,
        heightInches: profile.height_inches ?? null,
        age: profile.age ?? null,
        biologicalSex: profile.biological_sex ?? 'male',
        activityLevel: profile.activity_level ?? 'moderate',
        phase: profilePhase,
        nutritionGoal: profile.nutrition_goal ?? 'maintain',
        cycleDay: null,
        coachProteinOverride: profile.coach_protein_override ?? null,
        coachCarbsOverride: profile.coach_carbs_override ?? null,
        coachFatOverride: profile.coach_fat_override ?? null,
        coachCaloriesOverride: profile.coach_calories_override ?? null,
        weightCorrectionDeficit: correctionDeficit,
      });
      // Cut protocol overrides standard targets when active
      const finalTargets: NutritionTargets = todayCutProtocol
        ? {
          ...nutritionTargets,
          adjustedCalories: todayCutProtocol.prescribed_calories,
          protein: todayCutProtocol.prescribed_protein,
          carbs: todayCutProtocol.prescribed_carbs,
          fat: todayCutProtocol.prescribed_fat,
          message: `Weight cut protocol (${todayCutProtocol.cut_phase.replace(/_/g, ' ')})`,
        }
        : nutritionTargets;
      setTargets(finalTargets);

      // Ensure ledger row exists for today
      await ensureDailyLedger(userId, today, {
        tdee: finalTargets.tdee,
        protein: finalTargets.protein,
        carbs: finalTargets.carbs,
        fat: finalTargets.fat,
        weightCorrectionDeficit: finalTargets.weightCorrectionDeficit,
      });

      // Calculate hydration target — cut protocol overrides standard
      if (todayCutProtocol) {
        setWaterTarget(Math.round(todayCutProtocol.water_target_oz));
      } else {
        const hydration = getHydrationProtocol({
          phase: profilePhase,
          fightStatus: profile.fight_status ?? 'amateur',
          currentWeightLbs: effectiveWeight,
          targetWeightLbs: profile.target_weight ?? effectiveWeight,
          weeklyVelocityLbs: weeklyVelocity,
        });
        setWaterTarget(Math.round(hydration.dailyWaterOz));
      }

      // Load today's nutrition data
      const data = await getDailyNutrition(userId, today);

      // Group food log by meal type
      const grouped: Record<MealType, any[]> = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      };

      for (const entry of data.foodLog) {
        const mt = entry.meal_type as MealType;
        if (grouped[mt]) {
          grouped[mt].push({
            id: entry.id,
            food_name: entry.food_items?.name ?? 'Unknown',
            food_brand: entry.food_items?.brand ?? null,
            servings: entry.servings,
            serving_label: entry.food_items?.serving_label ?? '',
            logged_calories: entry.logged_calories,
          });
        }
      }
      setMeals(grouped);

      // Calculate totals
      const t = data.foodLog.reduce(
        (acc: any, entry: any) => ({
          calories: acc.calories + (entry.logged_calories ?? 0),
          protein: acc.protein + (entry.logged_protein ?? 0),
          carbs: acc.carbs + (entry.logged_carbs ?? 0),
          fat: acc.fat + (entry.logged_fat ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      setTotals(t);

      // Water
      const waterTotal = data.hydrationLog.reduce(
        (sum: number, w: any) => sum + (w.amount_oz ?? 0),
        0
      );
      setWaterCurrent(waterTotal);
    } catch (err) {
      logError('NutritionScreen.loadData', err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRemoveFood = async (foodLogId: string) => {
    Alert.alert('Remove Food', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (!session?.user) return;
            await removeFoodEntry(session.user.id, foodLogId, today);
            await loadData();
          } catch (err) {
            Alert.alert('Error', 'Failed to remove food entry');
          }
        },
      },
    ]);
  };

  const handleQuickAddWater = async (oz: number) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      await logWater(session.user.id, oz, today);
      setWaterCurrent((prev) => prev + oz);
    } catch (err) {
      Alert.alert('Error', 'Failed to log water');
    }
  };

  const formatDate = () => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMealCalories = (mt: MealType) =>
    meals[mt].reduce((sum, f) => sum + (f.logged_calories ?? 0), 0);

  const renderSkeleton = () => (
    <View style={styles.content}>
      {/* Calorie hero skeleton */}
      <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
        <SkeletonLoader width={120} height={40} shape="rect" />
        <SkeletonLoader width={80} height={14} shape="text" style={{ marginTop: SPACING.sm }} />
      </View>
      {/* Macro bars skeleton */}
      <SkeletonLoader width="100%" height={120} shape="rect" style={{ marginBottom: SPACING.md, borderRadius: RADIUS.xl }} />
      {/* Pie chart skeleton */}
      <View style={{ alignItems: 'center', marginBottom: SPACING.md }}>
        <SkeletonLoader width={140} height={140} shape="circle" />
      </View>
      {/* Meal rows skeleton */}
      {[1, 2, 3].map(i => (
        <SkeletonLoader key={i} width="100%" height={56} shape="rect" style={{ marginBottom: SPACING.sm, borderRadius: RADIUS.lg }} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <Text style={styles.headerTitle}>Nutrition</Text>
        <Text style={styles.dateText}>{formatDate()}</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
      >
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {/* Cut Protocol Context Banner */}
            {cutProtocol && (
              <Animated.View
                entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()}
                style={styles.cutBanner}
              >
                <View style={styles.cutBannerTop}>
                  <Text style={styles.cutBannerPhase}>
                    ⚔️ {cutProtocol.cut_phase.replace(/_/g, ' ').toUpperCase()} — Day {cutProtocol.days_to_weigh_in > 0 ? `${cutProtocol.days_to_weigh_in}d to weigh-in` : 'Weigh-in today'}
                  </Text>
                  {cutProtocol.is_refeed_day && (
                    <View style={styles.cutBadge}>
                      <Text style={styles.cutBadgeText}>REFEED</Text>
                    </View>
                  )}
                  {cutProtocol.is_carb_cycle_high && !cutProtocol.is_refeed_day && (
                    <View style={[styles.cutBadge, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.cutBadgeText, { color: '#1D4ED8' }]}>HIGH CARB</Text>
                    </View>
                  )}
                </View>
                {cutProtocol.sodium_instruction && (
                  <Text style={styles.cutBannerInstruction}>🧂 {cutProtocol.sodium_instruction}</Text>
                )}
                {cutProtocol.fiber_instruction && (
                  <Text style={styles.cutBannerInstruction}>🌿 {cutProtocol.fiber_instruction}</Text>
                )}
              </Animated.View>
            )}

            {/* Calorie Hero */}
            <Animated.View
              entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.slow).springify()}
              style={styles.calorieHero}
            >
              <AnimatedNumber
                value={totals.calories}
                style={styles.calorieNumber}
              />
              <Text style={styles.calorieLabel}>
                of {targets?.adjustedCalories ?? 0} cal
              </Text>
            </Animated.View>

            {/* Daily Macro Summary */}
            <Animated.View
              entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.slow).springify()}
            >
              <Card style={{ marginBottom: SPACING.sm + 4 }}>
                <MacroProgressBar
                  label="Calories"
                  current={totals.calories}
                  target={targets?.adjustedCalories ?? 0}
                  color={COLORS.chart.accent}
                  unit=" cal"
                />
                <MacroProgressBar
                  label="Protein"
                  current={totals.protein}
                  target={targets?.protein ?? 0}
                  color={COLORS.chart.protein}
                />
                <MacroProgressBar
                  label="Carbs"
                  current={totals.carbs}
                  target={targets?.carbs ?? 0}
                  color={COLORS.chart.carbs}
                />
                <MacroProgressBar
                  label="Fat"
                  current={totals.fat}
                  target={targets?.fat ?? 0}
                  color={COLORS.chart.fat}
                />
              </Card>
            </Animated.View>

            {/* Macro Pie Chart */}
            <Animated.View
              entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.slow).springify()}
            >
              <Card style={{ marginBottom: SPACING.sm + 4 }}>
                <MacroPieChart
                  protein={totals.protein}
                  carbs={totals.carbs}
                  fat={totals.fat}
                  calories={totals.calories}
                />
              </Card>
            </Animated.View>

            {/* Hydration */}
            <Animated.View
              entering={FadeInDown.delay(STAGGER_DELAY * 4).duration(ANIMATION.slow).springify()}
            >
              <HydrationTracker
                currentOz={waterCurrent}
                targetOz={waterTarget}
                onQuickAdd={handleQuickAddWater}
              />
            </Animated.View>

            {/* Meal Sections */}
            {MEAL_TYPES.map((mt, i) => (
              <Animated.View
                key={mt}
                entering={FadeInDown.delay(STAGGER_DELAY * (5 + i)).duration(ANIMATION.slow).springify()}
              >
                <MealSection
                  mealType={mt}
                  foods={meals[mt]}
                  subtotalCalories={getMealCalories(mt)}
                  onAddFood={() =>
                    navigation.navigate('FoodSearch', { mealType: mt, date: today })
                  }
                  onRemoveFood={handleRemoveFood}
                />
              </Animated.View>
            ))}

            {/* Quick Actions */}
            <Animated.View
              entering={FadeInDown.delay(STAGGER_DELAY * 9).duration(ANIMATION.slow).springify()}
              style={styles.quickActions}
            >
              <AnimatedPressable
                style={styles.quickActionButton}
                onPress={() => {
                  const hour = new Date().getHours();
                  let inferredMeal: MealType = 'dinner';
                  if (hour < 11) inferredMeal = 'breakfast';
                  else if (hour < 14) inferredMeal = 'lunch';
                  else if (hour < 17) inferredMeal = 'snacks';
                  navigation.navigate('BarcodeScan', { mealType: inferredMeal, date: today });
                }}
              >
                <LinearGradient
                  colors={[...GRADIENTS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.quickActionGradient}
                >
                  <IconBarcode size={18} color={COLORS.text.inverse} />
                  <Text style={styles.quickActionTextGradient}>Scan Barcode</Text>
                </LinearGradient>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('CustomFood')}
              >
                <LinearGradient
                  colors={[...GRADIENTS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.quickActionGradient}
                >
                  <Text style={styles.quickActionTextGradient}>Custom Food</Text>
                </LinearGradient>
              </AnimatedPressable>
            </Animated.View>

            <View style={{ height: SPACING.xxl + 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}




