import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  StyleSheet,
  Keyboard,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { FoodSearchItem } from '../components/FoodSearchItem';
import { FoodSearchMode, FoodSearchResult, MealType } from '../../lib/engine/types';
import {
  filterFoodSearchSections,
  FoodSearchSection,
  searchFoodCatalog,
  searchLocalFoodCatalog,
} from '../../lib/api/nutritionService';
import { supabase } from '../../lib/supabase';
import { logError } from '../../lib/utils/logger';
import { IconChevronLeft, IconBarcode } from '../components/icons';

type RouteParams = {
  FoodSearch: { mealType: MealType; date?: string };
};

const SEARCH_MODE_LABELS: Record<FoodSearchMode, string> = {
  all: 'All',
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
  const activeRequestRef = useRef(0);
  const searchInputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [allSections, setAllSections] = useState<FoodSearchSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchMode, setSearchMode] = useState<FoodSearchMode>('all');
  const [manualModeOverride, setManualModeOverride] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readyForSearch, setReadyForSearch] = useState(false);

  const activeMode = useMemo<FoodSearchMode>(() => {
    if (query.trim().length < 2) {
      return 'recent';
    }

    if (!manualModeOverride) {
      return 'all';
    }

    return searchMode;
  }, [manualModeOverride, query, searchMode]);

  const sections = useMemo(
    () => filterFoodSearchSections(allSections, activeMode),
    [activeMode, allSections]
  );

  const listSections = useMemo(
    () => sections.map((section) => ({ ...section, data: section.items })),
    [sections],
  );

  useEffect(() => {
    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      setReadyForSearch(true);
      focusTimeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    });

    return () => {
      task.cancel?.();
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
  }, []);

  const loadSections = useCallback(
    async (nextQuery: string) => {
      const requestId = activeRequestRef.current + 1;
      activeRequestRef.current = requestId;
      let hasPartialResults = false;
      setLoading(true);
      setSearched(nextQuery.trim().length >= 2);
      setErrorMessage(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          if (activeRequestRef.current === requestId) {
            setAllSections([]);
            setLoading(false);
          }
          return;
        }

        const trimmedQuery = nextQuery.trim();
        const requestMode: FoodSearchMode =
          trimmedQuery.length < 2 ? 'recent' : manualModeOverride ? searchMode : 'all';
        const fullSearchPromise = searchFoodCatalog({
          userId: session.user.id,
          query: nextQuery,
          mode: requestMode,
        });

        if (trimmedQuery.length >= 2) {
          void searchLocalFoodCatalog({
            userId: session.user.id,
            query: nextQuery,
            mode: requestMode,
          })
            .then((localResult) => {
              if (activeRequestRef.current !== requestId || localResult.sections.length === 0) {
                return;
              }

              hasPartialResults = true;
              setAllSections(localResult.sections);
              setLoading(false);
            })
            .catch(() => undefined);
        }

        const result = await fullSearchPromise;
        if (activeRequestRef.current !== requestId) {
          return;
        }

        setAllSections(result.sections);
        setLoading(false);
      } catch (error) {
        if (activeRequestRef.current !== requestId) {
          return;
        }

        const requestMode: FoodSearchMode =
          nextQuery.trim().length < 2 ? 'recent' : manualModeOverride ? searchMode : 'all';
        logError('FoodSearchScreen.loadSections', error, { query: nextQuery, mode: requestMode });
        if (!hasPartialResults) {
          setAllSections([]);
        }
        setErrorMessage('Search is unavailable right now. Check your connection and try again.');
        setLoading(false);
      }
    },
    [manualModeOverride, searchMode]
  );

  useEffect(() => {
    if (!readyForSearch) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      void loadSections(query);
    }, query.trim().length >= 2 ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [loadSections, query, readyForSearch]);

  const handleSelectFood = (item: FoodSearchResult) => {
    Keyboard.dismiss();
    navigation.navigate('FoodDetail', { foodItem: item, mealType, date });
  };

  const handleChangeQuery = (text: string) => {
    setQuery(text);

    if (text.trim().length < 2) {
      setManualModeOverride(false);
      return;
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
                  : activeMode === 'packaged'
                    ? 'Try a brand name, product name, or scan the barcode.'
                    : activeMode === 'recent'
                      ? 'Try a food you logged recently or switch to All for broader live results.'
                      : 'Try a basic food like oatmeal, mango, pork, or yogurt.'
                : 'Search All to see ingredients, packaged foods, and your saved items together.'}
          </Text>
          {errorMessage ? (
            <AnimatedPressable
              style={styles.retryButton}
              onPress={() => {
                void loadSections(query);
              }}
              testID="food-search-retry"
            >
              <Text style={styles.retryButtonText}>Retry search</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      );
    }

    return (
      <SectionList
        sections={listSections}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultsContent}
        stickySectionHeadersEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.sectionCardRow,
              index === 0 && styles.sectionCardRowFirst,
              index === section.data.length - 1 && styles.sectionCardRowLast,
            ]}
          >
            <FoodSearchItem item={item} onSelect={handleSelectFood} />
          </View>
        )}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton} testID="food-search-back">
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </AnimatedPressable>
        <Text style={styles.title}>Add to {MEAL_LABELS[mealType]}</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            ref={searchInputRef}
            style={[
              styles.searchInput,
              searchFocused && { borderColor: COLORS.accent, ...SHADOWS.sm },
            ]}
            placeholder="Search foods..."
            placeholderTextColor={COLORS.text.tertiary}
            value={query}
            onChangeText={handleChangeQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            testID="food-search-input"
          />
          <AnimatedPressable
            style={styles.barcodeButton}
            onPress={() => navigation.navigate('BarcodeScan', { mealType, date })}
            testID="food-search-scan"
          >
            <IconBarcode size={22} color={COLORS.text.primary} />
          </AnimatedPressable>
        </View>

        <View style={styles.modeRow}>
          {(['all', 'ingredients', 'packaged', 'recent'] as FoodSearchMode[]).map((mode) => {
            const active = activeMode === mode;
            return (
              <AnimatedPressable
                key={mode}
                style={[styles.modeChip, active && styles.modeChipActive]}
                onPress={() => handleSelectMode(mode)}
                testID={`food-search-mode-${mode}`}
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
    backgroundColor: 'transparent',
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
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modeChip: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 44,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sectionCardRow: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  sectionCardRowFirst: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  sectionCardRowLast: {
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  sectionGap: {
    height: SPACING.md,
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
