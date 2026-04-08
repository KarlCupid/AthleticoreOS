import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Keyboard,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { FoodSearchItem } from '../components/FoodSearchItem';
import { FoodSearchMode, FoodSearchResult, MealType } from '../../lib/engine/types';
import { classifyFoodQuery, FoodSearchSection, searchFoodCatalog } from '../../lib/api/nutritionService';
import { supabase } from '../../lib/supabase';
import { logError } from '../../lib/utils/logger';
import { IconChevronLeft, IconBarcode } from '../components/icons';

type RouteParams = {
  FoodSearch: { mealType: MealType; date?: string };
};

const SEARCH_MODE_LABELS: Record<FoodSearchMode, string> = {
  recent: 'Recent',
  ingredients: 'Ingredients',
  packaged: 'Packaged',
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function FoodSearchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'FoodSearch'>>();
  const { mealType, date } = route.params;

  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<FoodSearchSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchMode, setSearchMode] = useState<FoodSearchMode>('recent');
  const [manualModeOverride, setManualModeOverride] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeMode = useMemo<FoodSearchMode>(() => {
    if (query.trim().length < 2) {
      return 'recent';
    }

    return searchMode;
  }, [query, searchMode]);

  const loadSections = useCallback(
    async (nextQuery: string, nextMode: FoodSearchMode) => {
      setLoading(true);
      setSearched(nextQuery.trim().length >= 2);
      setErrorMessage(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setSections([]);
          return;
        }

        const result = await searchFoodCatalog({
          userId: session.user.id,
          query: nextQuery,
          mode: nextMode,
        });

        if (!manualModeOverride && nextQuery.trim().length >= 2) {
          const suggestedMode: FoodSearchMode =
            result.classifier === 'ingredient' ? 'ingredients' : 'packaged';
          if (suggestedMode !== nextMode) {
            setSearchMode(suggestedMode);
            const refined = await searchFoodCatalog({
              userId: session.user.id,
              query: nextQuery,
              mode: suggestedMode,
            });
            setSections(refined.sections);
            return;
          }
        }

        setSections(result.sections);
      } catch (error) {
        logError('FoodSearchScreen.loadSections', error, { query: nextQuery, mode: nextMode });
        setSections([]);
        setErrorMessage('Search is unavailable right now. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [manualModeOverride]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSections(query, activeMode);
    }, query.trim().length >= 2 ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [activeMode, loadSections, query]);

  const handleSelectFood = (item: FoodSearchResult) => {
    Keyboard.dismiss();
    navigation.navigate('FoodDetail', { foodItem: item, mealType, date });
  };

  const handleChangeQuery = (text: string) => {
    setQuery(text);

    if (text.trim().length < 2) {
      setManualModeOverride(false);
      setSearchMode('recent');
      return;
    }

    if (!manualModeOverride) {
      const suggestedMode: FoodSearchMode =
        classifyFoodQuery(text) === 'ingredient' ? 'ingredients' : 'packaged';
      setSearchMode(suggestedMode);
    }
  };

  const handleSelectMode = (mode: FoodSearchMode) => {
    setManualModeOverride(true);
    setSearchMode(mode);
  };

  const renderSections = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((item) => (
            <SkeletonLoader
              key={item}
              width="100%"
              height={76}
              shape="rect"
              style={{
                marginBottom: SPACING.sm,
                marginHorizontal: SPACING.lg,
                borderRadius: RADIUS.lg,
              }}
            />
          ))}
        </View>
      );
    }

    if (sections.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {errorMessage ? 'Search paused' : searched ? 'No foods found' : 'Search to start logging'}
          </Text>
          <Text style={styles.emptySubtext}>
            {errorMessage
              ? errorMessage
              : searched
                ? activeMode === 'ingredients'
                  ? 'Try a simpler ingredient like banana, rice, or chicken breast.'
                  : 'Try a brand name, product name, or scan the barcode.'
                : 'Use ingredients for whole foods or packaged for branded products.'}
          </Text>
          {errorMessage ? (
            <AnimatedPressable
              style={styles.retryButton}
              onPress={() => {
                void loadSections(query, activeMode);
              }}
            >
              <Text style={styles.retryButtonText}>Retry search</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      );
    }

    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultsContent}
      >
        {sections.map((section, sectionIndex) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(sectionIndex * 40).duration(ANIMATION.normal).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item) => (
                <FoodSearchItem key={item.key} item={item} onSelect={handleSelectFood} />
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </AnimatedPressable>
        <Text style={styles.title}>Add to {MEAL_LABELS[mealType]}</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.searchInput,
              searchFocused && { borderColor: COLORS.accent, ...SHADOWS.sm },
            ]}
            placeholder="Search foods..."
            placeholderTextColor={COLORS.text.tertiary}
            value={query}
            onChangeText={handleChangeQuery}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <AnimatedPressable
            style={styles.barcodeButton}
            onPress={() => navigation.navigate('BarcodeScan', { mealType, date })}
          >
            <IconBarcode size={22} color={COLORS.text.primary} />
          </AnimatedPressable>
        </View>

        <View style={styles.modeRow}>
          {(['recent', 'ingredients', 'packaged'] as FoodSearchMode[]).map((mode) => {
            const active = activeMode === mode;
            return (
              <AnimatedPressable
                key={mode}
                style={[styles.modeChip, active && styles.modeChipActive]}
                onPress={() => handleSelectMode(mode)}
              >
                <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                  {SEARCH_MODE_LABELS[mode]}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {renderSections()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    fontSize: 16,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  barcodeButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modeChip: {
    flex: 1,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modeChipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  modeChipTextActive: {
    color: COLORS.text.inverse,
  },
  loadingContainer: {
    paddingTop: SPACING.md,
  },
  resultsContent: {
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sectionCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  emptyContainer: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
});
