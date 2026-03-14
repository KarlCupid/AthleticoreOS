import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
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
import { searchFoods } from '../../lib/api/openFoodFacts';
import {
  searchLocalFoods,
  getRecentFoods,
} from '../../lib/api/nutritionService';
import { supabase } from '../../lib/supabase';
import { FoodItemRow, MealType } from '../../lib/engine/types';
import { logError } from '../../lib/utils/logger';
import { IconChevronLeft, IconBarcode } from '../components/icons';

type RouteParams = {
  FoodSearch: { mealType: MealType; date?: string };
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
  const [results, setResults] = useState<(FoodItemRow | Omit<FoodItemRow, 'id'>)[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    loadRecentFoods();
  }, []);

  async function loadRecentFoods() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const foods = await getRecentFoods(session.user.id, 10);
      setRecentFoods(foods);
    } catch (err) {
      logError('FoodSearchScreen.loadRecentFoods', err);
    }
  }

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (text.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }

      setLoading(true);
      setSearched(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? '';

        // Search local DB and OFF API in parallel
        const [localResults, offResults] = await Promise.all([
          searchLocalFoods(userId, text.trim(), 10),
          searchFoods(text.trim(), 1).catch(() => ({ items: [], totalCount: 0, hasMore: false })),
        ]);

        // Merge: local first, then OFF, deduped by barcode
        const seen = new Set<string>();
        const merged: (FoodItemRow | Omit<FoodItemRow, 'id'>)[] = [];

        for (const item of localResults) {
          if (item.off_barcode) seen.add(item.off_barcode);
          merged.push(item);
        }

        for (const item of offResults.items) {
          if (item.off_barcode && seen.has(item.off_barcode)) continue;
          if (item.off_barcode) seen.add(item.off_barcode);
          merged.push(item);
        }

        setResults(merged);
      } catch (err) {
        logError('FoodSearchScreen.search', err, { query: text.trim() });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch(query);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectFood = (item: FoodItemRow | Omit<FoodItemRow, 'id'>) => {
    Keyboard.dismiss();
    navigation.navigate('FoodDetail', { foodItem: item, mealType, date });
  };

  const showRecent = !searched && query.trim().length < 2 && recentFoods.length > 0;

  const renderItem = ({ item, index }: { item: FoodItemRow | Omit<FoodItemRow, 'id'>; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(ANIMATION.normal).springify()}>
      <FoodSearchItem item={item} onSelect={handleSelectFood} />
    </Animated.View>
  );

  const renderRecentItem = ({ item, index }: { item: FoodItemRow; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(ANIMATION.normal).springify()}>
      <FoodSearchItem item={item} onSelect={handleSelectFood} />
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </AnimatedPressable>
        <Text style={styles.title}>Add to {MEAL_LABELS[mealType]}</Text>
      </View>

      {/* Search Bar + Barcode */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.searchInput,
              { flex: 1 },
              searchFocused && { borderColor: COLORS.accent, ...SHADOWS.sm },
            ]}
            placeholder="Search foods..."
            placeholderTextColor={COLORS.text.tertiary}
            value={query}
            onChangeText={setQuery}
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
      </View>

      {/* Skeleton Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map(i => (
            <SkeletonLoader
              key={i}
              width="100%"
              height={60}
              shape="rect"
              style={{ marginBottom: SPACING.sm, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg }}
            />
          ))}
        </View>
      )}

      {showRecent && (
        <View>
          <Text style={styles.sectionTitle}>Recent</Text>
          <FlatList
            data={recentFoods}
            keyExtractor={(item) => item.id}
            renderItem={renderRecentItem}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {!showRecent && !loading && (
        <FlatList
          data={results}
          keyExtractor={(item, index) =>
            'id' in item ? item.id : item.off_barcode ?? `off-${index}`
          }
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            searched && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No foods found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : null
          }
        />
      )}
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
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  loadingContainer: {
    paddingTop: SPACING.md,
  },
  emptyContainer: {
    padding: SPACING.xxl,
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
  },
});
