import React, { useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { buildNutritionQuickActionViewModel } from '../../lib/engine/presentation';
import { humanizeCoachSentence } from '../../lib/engine/presentation/coachCopy';
import {
  logWater,
  removeFoodEntry,
} from '../../lib/api/nutritionService';
import { COLORS, FONT_FAMILY, GRADIENTS, RADIUS, SPACING, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { HydrationTracker } from '../components/HydrationTracker';
import { MacroProgressBar } from '../components/MacroProgressBar';
import { MealSection } from '../components/MealSection';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { IconBarcode } from '../components/icons';
import { useFuelData } from '../hooks/useFuelData';
import type { FuelStackParamList } from '../navigation/types';
import type { FoodSearchResult, MealType, SessionFuelingWindow } from '../../lib/engine/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { styles } from './NutritionScreen.styles';

type FuelNav = NativeStackNavigationProp<FuelStackParamList>;

const STAGGER_DELAY = 28;

function inferMealTypeForNow(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snacks';
  return 'dinner';
}

function renderFuelWindow(window: SessionFuelingWindow | null | undefined, emptyLabel: string) {
  if (!window) {
    return <Text style={inline.copyMuted}>{emptyLabel}</Text>;
  }

  return (
    <View style={inline.windowBlock}>
      <View style={inline.windowHeader}>
        <Text style={inline.windowTitle}>{window.label}</Text>
        <Text style={inline.windowTiming}>{window.timing}</Text>
      </View>
      <Text style={inline.copyMuted} numberOfLines={1}>
        {window.carbsG}g carbs · {window.proteinG}g protein
      </Text>
      {window.notes.slice(0, 1).map((note) => (
        <Text key={`${window.label}-${note}`} style={inline.noteLine} numberOfLines={1}>
          {humanizeCoachSentence(note)}
        </Text>
      ))}
    </View>
  );
}

function FuelRail({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: FoodSearchResult[];
  onSelect: (item: FoodSearchResult) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={inline.sectionEyebrow}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item) => (
          <AnimatedPressable
            key={item.key}
            style={inline.quickFoodCard}
            onPress={() => onSelect(item)}
          >
            <Text style={inline.quickFoodTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={inline.quickFoodSubtitle} numberOfLines={1}>
              {item.brand ?? item.serving_label}
            </Text>
            <Text style={inline.quickFoodMeta}>
              {Math.round(item.calories_per_serving)} cal · P{Math.round(item.protein_per_serving)}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function NutritionScreen() {
  const navigation = useNavigation<FuelNav>();
  const { themeColor } = useReadinessTheme();
  const { loading, refreshing, error, viewModel, reload, onRefresh } = useFuelData();
  const [nutritionMode, setNutritionMode] = useState<'quick' | 'detailed'>('quick');
  const quickVM = useMemo(
    () => buildNutritionQuickActionViewModel(viewModel.dailyMission, viewModel.totals),
    [viewModel.dailyMission, viewModel.totals],
  );

  const flatMealEntries = useMemo(
    () => Object.values(viewModel.meals).flat(),
    [viewModel.meals],
  );

  const handleQuickFoodSelect = (foodItem: FoodSearchResult, mealType?: MealType) => {
    navigation.navigate('FoodDetail', {
      foodItem,
      mealType: mealType ?? inferMealTypeForNow(),
      date: viewModel.date,
    });
  };

  const handleMealEntrySelect = (foodLogId: string) => {
    const entry = flatMealEntries.find((candidate) => candidate.id === foodLogId);
    if (!entry) {
      return;
    }

    navigation.navigate('FoodDetail', {
      foodItem: entry.foodItem,
      mealType: entry.mealType,
      date: viewModel.date,
      foodLogId: entry.id,
      initialAmountValue: entry.amountValue,
      initialAmountUnit: entry.amountUnit,
      initialGrams: entry.grams,
    });
  };

  const handleRemoveFood = (foodLogId: string) => {
    if (!viewModel.userId) return;

    Alert.alert('Remove food', 'Remove this entry from today?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFoodEntry(viewModel.userId!, foodLogId, viewModel.date);
            await reload(true);
          } catch {
            Alert.alert('Could not remove food', 'Please try again.');
          }
        },
      },
    ]);
  };

  const handleQuickAddWater = async (oz: number) => {
    if (!viewModel.userId) return;

    try {
      await logWater(viewModel.userId, oz, viewModel.date);
      await reload(true);
    } catch {
      Alert.alert('Could not log water', 'Please try again.');
    }
  };

  const renderLoading = () => (
    <View style={styles.content}>
      <SkeletonLoader width="100%" height={124} shape="rect" style={{ marginBottom: SPACING.md, borderRadius: RADIUS.xl }} />
      <SkeletonLoader width="100%" height={96} shape="rect" style={{ marginBottom: SPACING.md, borderRadius: RADIUS.xl }} />
      <SkeletonLoader width="100%" height={172} shape="rect" style={{ marginBottom: SPACING.md, borderRadius: RADIUS.xl }} />
      <SkeletonLoader width="100%" height={124} shape="rect" style={{ borderRadius: RADIUS.xl }} />
    </View>
  );

  const renderErrorCard = () => {
    if (!error) {
      return null;
    }

    return (
      <Card style={{ marginBottom: SPACING.md }}>
        <Text style={inline.errorTitle}>Fuel is temporarily unavailable</Text>
        <Text style={inline.copyMuted}>{error}</Text>
        <AnimatedPressable style={inline.secondaryButton} onPress={() => void reload(true)}>
          <Text style={inline.secondaryButtonText}>Try again</Text>
        </AnimatedPressable>
      </Card>
    );
  };

  const renderMissionCards = () => {
    const sessionPlan = viewModel.targets?.sessionFuelingPlan;
    if (!sessionPlan || !viewModel.targets) {
      return null;
    }

    const waterTarget = Math.round(viewModel.dailyMission?.hydrationDirective.waterTargetOz ?? 0);

    return (
      <>
        <Card style={{ marginBottom: SPACING.md }}>
          <Text style={inline.sectionEyebrow}>Fuel mission</Text>
          <Text style={inline.cardHeadline}>
            {humanizeCoachSentence(
              viewModel.dailyMission?.fuelDirective.message,
              'Stay on top of your food today.',
            )}
          </Text>
          <Text style={inline.copyMuted} numberOfLines={1}>
            {sessionPlan.priorityLabel} · Water {waterTarget} oz
          </Text>
          {viewModel.targets.safetyWarning !== 'none' ? (
            <View style={inline.warningBanner}>
              <Text style={inline.warningText}>
                {humanizeCoachSentence(quickVM.safetyWarning, 'Fuel protected today.')}
              </Text>
            </View>
          ) : null}
          {renderFuelWindow(sessionPlan.preSession, 'No pre-workout fuel block.')}
          {sessionPlan.betweenSessions ? renderFuelWindow(sessionPlan.betweenSessions, '') : null}
          {renderFuelWindow(sessionPlan.postSession, 'No recovery fuel block.')}
        </Card>

      </>
    );
  };

  const renderQuickMode = () => {
    const betweenSessions = viewModel.targets?.sessionFuelingPlan.betweenSessions ?? null;

    return (
      <>
        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.normal)}>
          <Card style={{ marginBottom: SPACING.md }}>
            <Text style={inline.cardHeadline}>{quickVM.fuelDirectiveHeadline}</Text>
            {[quickVM.preSessionCue, quickVM.intraSessionCue, quickVM.postSessionCue]
              .filter(Boolean)
              .map((cue) => (
                <Text key={cue} style={inline.noteLine} numberOfLines={1}>
                  {humanizeCoachSentence(cue)}
                </Text>
              ))}
            {betweenSessions ? (
              <Text style={inline.noteLine} numberOfLines={1}>
                Between: {betweenSessions.carbsG}g carbs, {betweenSessions.proteinG}g protein.
              </Text>
            ) : null}
            <Text style={[inline.copyMuted, { marginTop: SPACING.sm }]} numberOfLines={1}>
              Meals logged: {viewModel.historySummary.mealCount} · Water logged: {viewModel.historySummary.waterOz} oz
            </Text>
          </Card>
        </Animated.View>

        {quickVM.quickIntentOptions.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.normal)}>
            <Text style={inline.sectionEyebrow}>Log next</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {quickVM.quickIntentOptions.map((intent) => (
                <AnimatedPressable
                  key={intent.id}
                  style={inline.intentCard}
                  onPress={() => navigation.navigate('FoodSearch', {
                    mealType: inferMealTypeForNow(),
                    date: viewModel.date,
                  })}
                >
                  <Text style={inline.intentTitle}>{intent.label}</Text>
                  <Text style={inline.intentMacro}>~{intent.calTarget} cal</Text>
                  <Text style={inline.copyMuted} numberOfLines={1}>
                    P {intent.proteinTarget}g · C {intent.carbTarget}g · F {intent.fatTarget}g
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {renderMissionCards()}

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.normal)}>
          <Card style={{ marginBottom: SPACING.md }}>
            <MacroProgressBar
              label="Calories"
              current={viewModel.totals.calories}
              target={viewModel.targets?.adjustedCalories ?? 0}
              color={COLORS.chart.accent}
              unit=" cal"
            />
            <MacroProgressBar
              label="Protein"
              current={viewModel.totals.protein}
              target={viewModel.targets?.protein ?? 0}
              color={COLORS.chart.protein}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 4).duration(ANIMATION.normal)}>
          <HydrationTracker
            currentOz={viewModel.totals.water}
            targetOz={viewModel.dailyMission?.hydrationDirective.waterTargetOz ?? 0}
            onQuickAdd={handleQuickAddWater}
          />
        </Animated.View>

        <FuelRail title="Favorites" items={viewModel.favorites} onSelect={handleQuickFoodSelect} />
        <FuelRail title="Recent" items={viewModel.recent} onSelect={handleQuickFoodSelect} />

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 5).duration(ANIMATION.normal)}>
          <AnimatedPressable onPress={() => setNutritionMode('detailed')}>
            <Text style={[inline.linkText, { color: themeColor }]}>Full tracker</Text>
          </AnimatedPressable>
        </Animated.View>
      </>
    );
  };

  const renderDetailedMode = () => (
    <>
      <Animated.View entering={FadeInDown.delay(0).duration(ANIMATION.normal)} style={{ alignItems: 'flex-start', marginBottom: SPACING.sm }}>
        <AnimatedPressable onPress={() => setNutritionMode('quick')}>
          <Text style={[inline.linkText, { color: themeColor }]}>Quick log</Text>
        </AnimatedPressable>
      </Animated.View>

      {viewModel.activeCutProtocol ? (
        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.normal)} style={styles.cutBanner}>
          <View style={styles.cutBannerTop}>
            <Text style={styles.cutBannerPhase}>
              {viewModel.activeCutProtocol.cut_phase.replace(/_/g, ' ').toUpperCase()} · {viewModel.activeCutProtocol.days_to_weigh_in}d to weigh-in
            </Text>
            {viewModel.activeCutProtocol.is_refeed_day ? (
              <View style={styles.cutBadge}>
                <Text style={styles.cutBadgeText}>REFEED</Text>
              </View>
            ) : null}
            {viewModel.activeCutProtocol.is_carb_cycle_high ? (
              <View style={styles.cutBadge}>
                <Text style={styles.cutBadgeText}>HIGH CARB</Text>
              </View>
            ) : null}
          </View>
          <AnimatedPressable onPress={() => navigation.navigate('WeightCutHome')}>
            <Text style={[inline.linkText, { color: COLORS.text.primary }]}>Weight cut</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.normal)} style={styles.calorieHero}>
        <AnimatedNumber value={viewModel.totals.calories} style={styles.calorieNumber} />
        <Text style={styles.calorieLabel}>
          of {viewModel.targets?.adjustedCalories ?? 0} cal
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.normal)}>
        <Card style={{ marginBottom: SPACING.md }}>
          <MacroProgressBar
            label="Calories"
            current={viewModel.totals.calories}
            target={viewModel.targets?.adjustedCalories ?? 0}
            color={COLORS.chart.accent}
            unit=" cal"
          />
          <MacroProgressBar
            label="Protein"
            current={viewModel.totals.protein}
            target={viewModel.targets?.protein ?? 0}
            color={COLORS.chart.protein}
          />
          <MacroProgressBar
            label="Carbs"
            current={viewModel.totals.carbs}
            target={viewModel.targets?.carbs ?? 0}
            color={COLORS.chart.carbs}
          />
          <MacroProgressBar
            label="Fat"
            current={viewModel.totals.fat}
            target={viewModel.targets?.fat ?? 0}
            color={COLORS.chart.fat}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 5).duration(ANIMATION.normal)}>
        <HydrationTracker
          currentOz={viewModel.totals.water}
          targetOz={viewModel.dailyMission?.hydrationDirective.waterTargetOz ?? 0}
          onQuickAdd={handleQuickAddWater}
        />
      </Animated.View>

      {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((mealType, index) => (
        <Animated.View
          key={mealType}
          entering={FadeInDown.delay(STAGGER_DELAY * (6 + index)).duration(ANIMATION.normal)}
        >
          <MealSection
            mealType={mealType}
            foods={viewModel.meals[mealType]}
            subtotalCalories={viewModel.meals[mealType].reduce((sum, entry) => sum + entry.loggedCalories, 0)}
            defaultExpanded={viewModel.meals[mealType].length > 0}
            onAddFood={() => navigation.navigate('FoodSearch', { mealType, date: viewModel.date })}
            onSelectFood={handleMealEntrySelect}
            onRemoveFood={handleRemoveFood}
          />
        </Animated.View>
      ))}

      <FuelRail title="Favorites" items={viewModel.favorites} onSelect={handleQuickFoodSelect} />
      <FuelRail title="Recent" items={viewModel.recent} onSelect={handleQuickFoodSelect} />

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 11).duration(ANIMATION.normal)} style={styles.quickActions}>
        <AnimatedPressable
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('BarcodeScan', { mealType: inferMealTypeForNow(), date: viewModel.date })}
        >
          <LinearGradient colors={[...GRADIENTS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.quickActionGradient}>
            <IconBarcode size={18} color={COLORS.text.inverse} />
            <Text style={styles.quickActionTextGradient}>Scan</Text>
          </LinearGradient>
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('CustomFood')}
        >
          <LinearGradient colors={[...GRADIENTS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.quickActionGradient}>
            <Text style={styles.quickActionTextGradient}>Custom</Text>
          </LinearGradient>
        </AnimatedPressable>
      </Animated.View>

    </>
  );

  return (
    <ScreenWrapper useSafeArea={true}>
      <Animated.View entering={FadeInDown.delay(0).duration(ANIMATION.normal)} style={styles.header}>
        <ScreenHeader kicker="Fuel" title="Today's fuel" subtitle={viewModel.formattedDate}>
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
                Tracker
              </Text>
            </AnimatedPressable>
          </View>
        </ScreenHeader>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
      >
        {loading ? renderLoading() : (
          <>
            {renderErrorCard()}
            {nutritionMode === 'quick' ? renderQuickMode() : renderDetailedMode()}
            <View style={{ height: SPACING.xxl + 40 }} />
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const inline = {
  cardHeadline: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  copyMuted: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  noteLine: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
    marginTop: SPACING.xs,
  },
  warningBanner: {
    backgroundColor: `${COLORS.error}18`,
    borderColor: `${COLORS.error}40`,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  warningText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.error,
    lineHeight: 19,
  },
  windowBlock: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  windowHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  windowTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    flex: 1,
  },
  windowTiming: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  intentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    minWidth: 160,
  },
  intentTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  intentMacro: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.chart.accent,
    marginBottom: 2,
  },
  linkText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  quickFoodCard: {
    width: 172,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
  },
  quickFoodTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  quickFoodSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  quickFoodMeta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.chart.protein,
    marginTop: SPACING.sm,
  },
  hydrationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.sm,
  },
  editorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap' as const,
  },
  hydrationInput: {
    minWidth: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  hydrationRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  rowActions: {
    flexDirection: 'row' as const,
    gap: SPACING.md,
    alignItems: 'center' as const,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
};
