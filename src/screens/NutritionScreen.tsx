import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  InteractionManager,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, ANIMATION, GRADIENTS, FONT_FAMILY } from '../theme/theme';
import { buildNutritionQuickActionViewModel } from '../../lib/engine/presentation';
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
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { supabase } from '../../lib/supabase';
import { getDailyEngineState } from '../../lib/api/dailyMissionService';
import {
  getDailyNutrition,
  removeFoodEntry,
  logWater,
  ensureDailyLedger,
} from '../../lib/api/nutritionService';
import { DailyMission, MealType, ResolvedNutritionTargets, DailyCutProtocolRow } from '../../lib/engine/types';
import { todayLocalDate } from '../../lib/utils/date';
import { logError } from '../../lib/utils/logger';
import { calculateCaloriesFromMacros } from '../../lib/utils/nutrition';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const STAGGER_DELAY = 50;

export function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { themeColor } = useReadinessTheme();
  const [nutritionMode, setNutritionMode] = useState<'quick' | 'detailed'>('quick');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<ResolvedNutritionTargets | null>(null);
  const [waterTarget, setWaterTarget] = useState(100);
  const [cutProtocol, setCutProtocol] = useState<DailyCutProtocolRow | null>(null);
  const [waterCurrent, setWaterCurrent] = useState(0);
  const [dailyMission, setDailyMission] = useState<DailyMission | null>(null);
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

      const engineState = await getDailyEngineState(userId, today);
      setCutProtocol(engineState.cutProtocol as DailyCutProtocolRow | null);
      setDailyMission(engineState.mission);
      setTargets({
        ...engineState.nutritionTargets,
        adjustedCalories: calculateCaloriesFromMacros(
          engineState.mission.fuelDirective.protein,
          engineState.mission.fuelDirective.carbs,
          engineState.mission.fuelDirective.fat,
        ),
        protein: engineState.mission.fuelDirective.protein,
        carbs: engineState.mission.fuelDirective.carbs,
        fat: engineState.mission.fuelDirective.fat,
        message: engineState.mission.fuelDirective.message,
      });
      setWaterTarget(engineState.mission.hydrationDirective.waterTargetOz);

      await ensureDailyLedger(userId, today, {
        tdee: engineState.nutritionTargets.tdee,
        calories: engineState.mission.fuelDirective.calories,
        protein: engineState.mission.fuelDirective.protein,
        carbs: engineState.mission.fuelDirective.carbs,
        fat: engineState.mission.fuelDirective.fat,
        weightCorrectionDeficit: engineState.nutritionTargets.weightCorrectionDeficit,
        targetSource: engineState.mission.fuelDirective.source === 'weight_cut_protocol'
          ? 'weight_cut_protocol'
          : engineState.mission.fuelDirective.source === 'daily_engine'
            ? 'daily_activity_adjusted'
            : 'base',
      });

      const data = await getDailyNutrition(userId, today);

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

      const t = data.foodLog.reduce(
        (acc: any, entry: any) => ({
          protein: acc.protein + (entry.logged_protein ?? 0),
          carbs: acc.carbs + (entry.logged_carbs ?? 0),
          fat: acc.fat + (entry.logged_fat ?? 0),
          calories: 0,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      t.calories = calculateCaloriesFromMacros(t.protein, t.carbs, t.fat);
      setTotals(t);

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
      let isActive = true;
      InteractionManager.runAfterInteractions(() => {
        if (isActive) {
          loadData();
        }
      });
      return () => {
        isActive = false;
      };
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
          } catch (_error) {
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
    } catch (_error) {
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
      <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
        <SkeletonLoader width={120} height={40} shape="rect" />
        <SkeletonLoader width={80} height={14} shape="text" style={{ marginTop: SPACING.sm }} />
      </View>
      <SkeletonLoader width="100%" height={120} shape="rect" style={{ marginBottom: SPACING.md, borderRadius: RADIUS.xl }} />
      <View style={{ alignItems: 'center', marginBottom: SPACING.md }}>
        <SkeletonLoader width={140} height={140} shape="circle" />
      </View>
      {[1, 2, 3].map((i) => (
        <SkeletonLoader key={i} width="100%" height={56} shape="rect" style={{ marginBottom: SPACING.sm, borderRadius: RADIUS.lg }} />
      ))}
    </View>
  );

  return (
    <ScreenWrapper useSafeArea={true}>
      <Animated.View
        entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()}
        style={styles.header}
      >
        <ScreenHeader
          kicker="Fuel"
          title="Today's fuel"
          subtitle={formatDate()}
        >
          <View style={styles.modeSwitch}>
            <AnimatedPressable
              style={[styles.modeChip, nutritionMode === 'quick' && { backgroundColor: COLORS.accent }]}
              onPress={() => setNutritionMode('quick')}
            >
              <Text style={[styles.modeChipText, nutritionMode === 'quick' && styles.modeChipTextActive]}>
                Quick log
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={[styles.modeChip, nutritionMode === 'detailed' && { backgroundColor: COLORS.accent }]}
              onPress={() => setNutritionMode('detailed')}
            >
              <Text style={[styles.modeChipText, nutritionMode === 'detailed' && styles.modeChipTextActive]}>
                Full tracker
              </Text>
            </AnimatedPressable>
          </View>
        </ScreenHeader>
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
            {/* Quick Fuel mode — default path */}
            {nutritionMode === 'quick' && (() => {
              const quickVM = buildNutritionQuickActionViewModel(dailyMission, totals);
              const inferMealType = () => {
                const h = new Date().getHours();
                if (h < 11) return 'breakfast';
                if (h < 14) return 'lunch';
                if (h < 17) return 'snacks';
                return 'dinner';
              };
              return (
                <>
                  {quickVM.safetyWarning ? (
                    <Animated.View entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()}>
                      <View style={{
                        backgroundColor: COLORS.error + '18',
                        borderRadius: RADIUS.lg,
                        borderWidth: 1,
                        borderColor: COLORS.error + '40',
                        padding: SPACING.md,
                        marginBottom: SPACING.sm,
                      }}>
                        <Text style={{ fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.error, lineHeight: 19 }}>
                          {quickVM.safetyWarning}
                        </Text>
                      </View>
                    </Animated.View>
                  ) : null}

                  <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.slow).springify()}>
                    <Card style={{ marginBottom: SPACING.sm + 4 }}>
                      <Text style={{ fontSize: 17, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
                        {quickVM.fuelDirectiveHeadline}
                      </Text>
                      {[quickVM.preSessionCue, quickVM.intraSessionCue, quickVM.postSessionCue]
                        .filter(Boolean)
                        .map((cue, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: i > 0 ? SPACING.sm : 0 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: themeColor, marginTop: 6 }} />
                            <Text style={{ flex: 1, fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 19 }}>{cue}</Text>
                          </View>
                        ))
                      }
                    </Card>
                  </Animated.View>

                  {quickVM.quickIntentOptions.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.slow).springify()}>
                      <Text style={{ fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginBottom: SPACING.sm, letterSpacing: 0.5 }}>
                        COACH-SUGGESTED LOG
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                        {quickVM.quickIntentOptions.map((intent) => (
                          <AnimatedPressable
                            key={intent.id}
                            style={{
                              backgroundColor: COLORS.surface,
                              borderRadius: RADIUS.xl,
                              borderWidth: 1,
                              borderColor: COLORS.borderLight,
                              padding: SPACING.md,
                              marginRight: SPACING.sm,
                              minWidth: 140,
                            }}
                            onPress={() => navigation.navigate('FoodSearch', { mealType: inferMealType(), date: today })}
                          >
                            <Text style={{ fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs }}>
                              {intent.label}
                            </Text>
                            <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.chart.accent }}>
                              ~{intent.calTarget} cal
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginTop: 2 }}>
                              P {intent.proteinTarget}g · C {intent.carbTarget}g · F {intent.fatTarget}g
                            </Text>
                          </AnimatedPressable>
                        ))}
                      </ScrollView>
                    </Animated.View>
                  ) : null}

                  <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.slow).springify()}>
                    <Card style={{ marginBottom: SPACING.md }}>
                      <MacroProgressBar
                        label="Calories"
                        current={totals.calories}
                        target={targets?.adjustedCalories ?? 0}
                        color={COLORS.chart.accent}
                        unit=" cal"
                      />
                    </Card>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 4).duration(ANIMATION.slow).springify()}>
                    <HydrationTracker
                      currentOz={waterCurrent}
                      targetOz={waterTarget}
                      onQuickAdd={handleQuickAddWater}
                    />
                  </Animated.View>

                  <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 5).duration(ANIMATION.slow).springify()} style={{ alignItems: 'center', marginTop: SPACING.lg }}>
                    <AnimatedPressable onPress={() => setNutritionMode('detailed')}>
                      <Text style={{ fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: themeColor }}>
                        Open full tracker
                      </Text>
                    </AnimatedPressable>
                  </Animated.View>
                </>
              );
            })()}

            {/* Detailed mode — full existing layout */}
            {nutritionMode === 'detailed' && (
              <>
                <Animated.View entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()} style={{ alignItems: 'flex-start', marginBottom: SPACING.sm }}>
                  <AnimatedPressable onPress={() => setNutritionMode('quick')}>
                    <Text style={{ fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: themeColor }}>
                      Back to quick log
                    </Text>
                  </AnimatedPressable>
                </Animated.View>

            {dailyMission && (
              <Animated.View entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()}>
                <Card style={{ marginBottom: SPACING.sm + 4 }}>
                  <Text style={styles.cardTitle}>Fuel Directive</Text>
                  <Text style={styles.cardSubtitle}>{dailyMission.fuelDirective.message}</Text>
                  <Text style={styles.cardMeta}>
                    Pre {dailyMission.fuelDirective.preSessionCarbsG}g carbs · Post {dailyMission.fuelDirective.postSessionProteinG}g protein · Intra {dailyMission.fuelDirective.intraSessionHydrationOz} oz
                  </Text>
                  <Text style={styles.cardMeta}>{dailyMission.overrideState.note}</Text>
                </Card>
              </Animated.View>
            )}

            {cutProtocol && (
              <Animated.View
                entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()}
                style={styles.cutBanner}
              >
                <View style={styles.cutBannerTop}>
                  <Text style={styles.cutBannerPhase}>
                    {cutProtocol.cut_phase.replace(/_/g, ' ').toUpperCase()} - Day {cutProtocol.days_to_weigh_in > 0 ? `${cutProtocol.days_to_weigh_in}d to weigh-in` : 'Weigh-in today'}
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
                  <Text style={styles.cutBannerInstruction}>{cutProtocol.sodium_instruction}</Text>
                )}
                {cutProtocol.fiber_instruction && (
                  <Text style={styles.cutBannerInstruction}>{cutProtocol.fiber_instruction}</Text>
                )}
              </Animated.View>
            )}

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

            <Animated.View
              entering={FadeInDown.delay(STAGGER_DELAY * 4).duration(ANIMATION.slow).springify()}
            >
              <HydrationTracker
                currentOz={waterCurrent}
                targetOz={waterTarget}
                onQuickAdd={handleQuickAddWater}
              />
            </Animated.View>

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
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
