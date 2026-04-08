import React, { useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { buildNutritionQuickActionViewModel } from '../../lib/engine/presentation';
import {
  logWater,
  removeFoodEntry,
  removeWaterEntry,
  updateWaterEntry,
} from '../../lib/api/nutritionService';
import { COLORS, FONT_FAMILY, GRADIENTS, RADIUS, SPACING, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Card } from '../components/Card';
import { HydrationTracker } from '../components/HydrationTracker';
import { MacroPieChart } from '../components/MacroPieChart';
import { MacroProgressBar } from '../components/MacroProgressBar';
import { MealSection } from '../components/MealSection';
import { NutritionAnalyticsSection } from '../components/NutritionAnalyticsSection';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { IconBarcode, IconWaterDrop } from '../components/icons';
import { useFuelData } from '../hooks/useFuelData';
import type { FuelStackParamList } from '../navigation/types';
import type { FoodSearchResult, MealType, SessionFuelingWindow } from '../../lib/engine/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { styles } from './NutritionScreen.styles';

type FuelNav = NativeStackNavigationProp<FuelStackParamList>;

const STAGGER_DELAY = 50;

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
      <Text style={inline.copyMuted}>
        {window.carbsG}g carbs · {window.proteinG}g protein
      </Text>
      {window.notes.map((note) => (
        <Text key={`${window.label}-${note}`} style={inline.noteLine}>
          - {note}
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
  const [hydrationDraft, setHydrationDraft] = useState('');
  const [editingHydrationId, setEditingHydrationId] = useState<string | null>(null);
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

  const handleEditHydration = (entryId: string, amountOz: number) => {
    setEditingHydrationId(entryId);
    setHydrationDraft(String(amountOz));
  };

  const resetHydrationEditor = () => {
    setEditingHydrationId(null);
    setHydrationDraft('');
  };

  const handleSaveHydrationDraft = async () => {
    if (!viewModel.userId) return;
    const amountOz = Number(hydrationDraft);
    if (!Number.isFinite(amountOz) || amountOz <= 0) {
      Alert.alert('Enter a valid amount', 'Use a number greater than zero.');
      return;
    }

    try {
      if (editingHydrationId) {
        await updateWaterEntry(viewModel.userId, editingHydrationId, amountOz, viewModel.date);
      } else {
        await logWater(viewModel.userId, amountOz, viewModel.date);
      }
      resetHydrationEditor();
      await reload(true);
    } catch {
      Alert.alert('Could not save water', 'Please try again.');
    }
  };

  const handleRemoveHydration = (entryId: string) => {
    if (!viewModel.userId) return;

    Alert.alert('Remove water log', 'Delete this hydration entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeWaterEntry(viewModel.userId!, entryId, viewModel.date);
            if (editingHydrationId === entryId) {
              resetHydrationEditor();
            }
            await reload(true);
          } catch {
            Alert.alert('Could not remove water log', 'Please try again.');
          }
        },
      },
    ]);
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

    return (
      <>
        <Card style={{ marginBottom: SPACING.md }}>
          <Text style={inline.sectionEyebrow}>Today's fuel mission</Text>
          <Text style={inline.cardHeadline}>
            {viewModel.dailyMission?.fuelDirective.message ?? 'Stay on top of your food today.'}
          </Text>
          <Text style={inline.copyMuted}>
            Priority: {sessionPlan.priorityLabel} · Water target {Math.round(viewModel.dailyMission?.hydrationDirective.waterTargetOz ?? 0)} oz
          </Text>
          {viewModel.targets.safetyWarning !== 'none' ? (
            <View style={inline.warningBanner}>
              <Text style={inline.warningText}>
                {quickVM.safetyWarning ?? 'The engine protected fuel availability for this day.'}
              </Text>
            </View>
          ) : null}
          {renderFuelWindow(sessionPlan.preSession, 'No dedicated pre-session fuel block today.')}
          {sessionPlan.betweenSessions ? renderFuelWindow(sessionPlan.betweenSessions, '') : null}
          {renderFuelWindow(sessionPlan.postSession, 'No dedicated recovery block today.')}
        </Card>

        <Card style={{ marginBottom: SPACING.md }}>
          <Text style={inline.sectionEyebrow}>Why your targets moved</Text>
          {viewModel.missionReasonLines.length > 0 ? (
            viewModel.missionReasonLines.map((line) => (
              <Text key={line} style={inline.noteLine}>
                - {line}
              </Text>
            ))
          ) : (
            <Text style={inline.copyMuted}>Targets are following your base mission settings today.</Text>
          )}
        </Card>

        <Card style={{ marginBottom: SPACING.md }}>
          <Text style={inline.sectionEyebrow}>Hydration notes</Text>
          {viewModel.targets.hydrationPlan.notes.map((note) => (
            <Text key={note} style={inline.noteLine}>
              - {note}
            </Text>
          ))}
          <Text style={[inline.copyMuted, { marginTop: SPACING.sm }]}>
            Sodium target: {viewModel.targets.hydrationPlan.sodiumTargetMg ?? 0} mg
          </Text>
        </Card>
      </>
    );
  };

  const renderQuickMode = () => {
    const betweenSessions = viewModel.targets?.sessionFuelingPlan.betweenSessions ?? null;

    return (
      <>
        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.slow).springify()}>
          <Card style={{ marginBottom: SPACING.md }}>
            <Text style={inline.cardHeadline}>{quickVM.fuelDirectiveHeadline}</Text>
            {[quickVM.preSessionCue, quickVM.intraSessionCue, quickVM.postSessionCue]
              .filter(Boolean)
              .map((cue) => (
                <Text key={cue} style={inline.noteLine}>
                  - {cue}
                </Text>
              ))}
            {betweenSessions ? (
              <Text style={inline.noteLine}>
                - Between sessions: {betweenSessions.carbsG}g carbs and {betweenSessions.proteinG}g protein.
              </Text>
            ) : null}
            <Text style={[inline.copyMuted, { marginTop: SPACING.sm }]}>
              Meals logged: {viewModel.historySummary.mealCount} · Water logged: {viewModel.historySummary.waterOz} oz
            </Text>
          </Card>
        </Animated.View>

        {quickVM.quickIntentOptions.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.slow).springify()}>
            <Text style={inline.sectionEyebrow}>Coach-suggested log</Text>
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
                  <Text style={inline.copyMuted}>
                    P {intent.proteinTarget}g · C {intent.carbTarget}g · F {intent.fatTarget}g
                  </Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {renderMissionCards()}

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.slow).springify()}>
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

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 4).duration(ANIMATION.slow).springify()}>
          <HydrationTracker
            currentOz={viewModel.totals.water}
            targetOz={viewModel.dailyMission?.hydrationDirective.waterTargetOz ?? 0}
            onQuickAdd={handleQuickAddWater}
          />
        </Animated.View>

        <FuelRail title="Favorites" items={viewModel.favorites} onSelect={handleQuickFoodSelect} />
        <FuelRail title="Recent" items={viewModel.recent} onSelect={handleQuickFoodSelect} />

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 5).duration(ANIMATION.slow).springify()}>
          <AnimatedPressable onPress={() => setNutritionMode('detailed')}>
            <Text style={[inline.linkText, { color: themeColor }]}>Open full tracker</Text>
          </AnimatedPressable>
        </Animated.View>
      </>
    );
  };

  const renderDetailedMode = () => (
    <>
      <Animated.View entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()} style={{ alignItems: 'flex-start', marginBottom: SPACING.sm }}>
        <AnimatedPressable onPress={() => setNutritionMode('quick')}>
          <Text style={[inline.linkText, { color: themeColor }]}>Back to quick log</Text>
        </AnimatedPressable>
      </Animated.View>

      {viewModel.activeCutProtocol ? (
        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.slow).springify()} style={styles.cutBanner}>
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
              <View style={[styles.cutBadge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.cutBadgeText, { color: '#1D4ED8' }]}>HIGH CARB</Text>
              </View>
            ) : null}
          </View>
          {viewModel.activeCutProtocol.training_recommendation ? (
            <Text style={styles.cutBannerInstruction}>{viewModel.activeCutProtocol.training_recommendation}</Text>
          ) : null}
          <AnimatedPressable onPress={() => navigation.navigate('WeightCutHome')}>
            <Text style={[inline.linkText, { color: COLORS.text.primary }]}>Open weight-cut center</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.slow).springify()} style={styles.calorieHero}>
        <AnimatedNumber value={viewModel.totals.calories} style={styles.calorieNumber} />
        <Text style={styles.calorieLabel}>
          of {viewModel.targets?.adjustedCalories ?? 0} cal
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.slow).springify()}>
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

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 4).duration(ANIMATION.slow).springify()}>
        <Card style={{ marginBottom: SPACING.md }}>
          <MacroPieChart
            protein={viewModel.totals.protein}
            carbs={viewModel.totals.carbs}
            fat={viewModel.totals.fat}
            calories={viewModel.totals.calories}
          />
        </Card>
      </Animated.View>

      {renderMissionCards()}

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 5).duration(ANIMATION.slow).springify()}>
        <HydrationTracker
          currentOz={viewModel.totals.water}
          targetOz={viewModel.dailyMission?.hydrationDirective.waterTargetOz ?? 0}
          onQuickAdd={handleQuickAddWater}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 6).duration(ANIMATION.slow).springify()}>
        <Card style={{ marginBottom: SPACING.md }}>
          <View style={inline.hydrationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <IconWaterDrop size={18} color={COLORS.chart.water} />
              <Text style={inline.sectionEyebrow}>Hydration history</Text>
            </View>
            <Text style={inline.copyMuted}>{viewModel.hydrationEntries.length} logs</Text>
          </View>

          <View style={inline.editorRow}>
            <TextInput
              style={inline.hydrationInput}
              value={hydrationDraft}
              onChangeText={setHydrationDraft}
              keyboardType="decimal-pad"
              placeholder="12"
              placeholderTextColor={COLORS.text.tertiary}
            />
            <Text style={inline.copyMuted}>oz</Text>
            <AnimatedPressable style={inline.secondaryButton} onPress={handleSaveHydrationDraft}>
              <Text style={inline.secondaryButtonText}>
                {editingHydrationId ? 'Update' : 'Add custom'}
              </Text>
            </AnimatedPressable>
            {editingHydrationId ? (
              <AnimatedPressable style={inline.secondaryButton} onPress={resetHydrationEditor}>
                <Text style={inline.secondaryButtonText}>Cancel</Text>
              </AnimatedPressable>
            ) : null}
          </View>

          {viewModel.hydrationEntries.length > 0 ? (
            viewModel.hydrationEntries.map((entry) => (
              <View key={entry.id} style={inline.hydrationRow}>
                <View>
                  <Text style={inline.quickFoodTitle}>{entry.amountOz} oz</Text>
                  <Text style={inline.quickFoodSubtitle}>
                    {entry.createdAtLabel}{entry.isLatest ? ' · latest' : ''}
                  </Text>
                </View>
                <View style={inline.rowActions}>
                  <AnimatedPressable onPress={() => handleEditHydration(entry.id, entry.amountOz)}>
                    <Text style={inline.linkText}>Edit</Text>
                  </AnimatedPressable>
                  <AnimatedPressable onPress={() => handleRemoveHydration(entry.id)}>
                    <Text style={[inline.linkText, { color: COLORS.error }]}>Delete</Text>
                  </AnimatedPressable>
                </View>
              </View>
            ))
          ) : (
            <Text style={inline.copyMuted}>No hydration logs yet today.</Text>
          )}
        </Card>
      </Animated.View>

      {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((mealType, index) => (
        <Animated.View
          key={mealType}
          entering={FadeInDown.delay(STAGGER_DELAY * (7 + index)).duration(ANIMATION.slow).springify()}
        >
          <MealSection
            mealType={mealType}
            foods={viewModel.meals[mealType]}
            subtotalCalories={viewModel.meals[mealType].reduce((sum, entry) => sum + entry.loggedCalories, 0)}
            onAddFood={() => navigation.navigate('FoodSearch', { mealType, date: viewModel.date })}
            onSelectFood={handleMealEntrySelect}
            onRemoveFood={handleRemoveFood}
          />
        </Animated.View>
      ))}

      <FuelRail title="Favorites" items={viewModel.favorites} onSelect={handleQuickFoodSelect} />
      <FuelRail title="Recent" items={viewModel.recent} onSelect={handleQuickFoodSelect} />

      <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 11).duration(ANIMATION.slow).springify()} style={styles.quickActions}>
        <AnimatedPressable
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('BarcodeScan', { mealType: inferMealTypeForNow(), date: viewModel.date })}
        >
          <LinearGradient colors={[...GRADIENTS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.quickActionGradient}>
            <IconBarcode size={18} color={COLORS.text.inverse} />
            <Text style={styles.quickActionTextGradient}>Scan barcode</Text>
          </LinearGradient>
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('CustomFood')}
        >
          <LinearGradient colors={[...GRADIENTS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.quickActionGradient}>
            <Text style={styles.quickActionTextGradient}>Custom food</Text>
          </LinearGradient>
        </AnimatedPressable>
      </Animated.View>

      {viewModel.userId ? <NutritionAnalyticsSection userId={viewModel.userId} /> : null}
    </>
  );

  return (
    <ScreenWrapper useSafeArea={true}>
      <Animated.View entering={FadeInDown.delay(0).duration(ANIMATION.slow).springify()} style={styles.header}>
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
                Full tracker
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
