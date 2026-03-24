/**
 * LazyChart â€” wrapper for lazy-loading Victory Native chart components.
 *
 * Victory Native is a heavy rendering dependency. Charts should not initialize
 * on mount for screens where they are not immediately visible (e.g., collapsed
 * sections, secondary tabs).
 *
 * Usage:
 *   const { LazyChart } = useLazyChart();
 *   <LazyChart>{({ CartesianChart, Bar, Line }) => <CartesianChart ... />}</LazyChart>
 *
 * Or use the Suspense boundary directly:
 *   const ChartModule = React.lazy(() => import('../TrainingLoadChartCard'));
 *   <Suspense fallback={<ChartPlaceholder />}><ChartModule ... /></Suspense>
 *
 * Victory Native audit (Task 7) â€” 4 files currently import victory-native:
 *   1. TrainingLoadChartCard.tsx  â†’ keep, wrap in Suspense in "Under the Hood" collapsible
 *   2. WeightCutChart.tsx         â†’ keep, used on Cut screen (not core daily flow)
 *   3. NutritionAnalyticsSection.tsx â†’ migrate to lightweight SVG (Phase 2 analytics)
 *   4. WorkoutAnalyticsTab.tsx    â†’ migrate to lightweight SVG (S&C analytics)
 *   5. SCAnalyticsSection.tsx     â†’ migrate to lightweight SVG
 * Target after UX revamp: â‰¤2 files importing victory-native.
 */

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../theme/theme';

interface ChartPlaceholderProps {
    height?: number;
}

export function ChartPlaceholder({ height = 180 }: ChartPlaceholderProps) {
    return (
        <View style={[styles.placeholder, { height }]}>
            <ActivityIndicator color={COLORS.accent} />
        </View>
    );
}

const styles = StyleSheet.create({
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceSecondary,
        borderRadius: 8,
        marginVertical: SPACING.sm,
    },
});

