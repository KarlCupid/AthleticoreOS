/**
 * LazyChart - wrapper for lazy-loading Victory Native chart components.
 *
 * Victory Native is a heavy rendering dependency. Charts should not initialize
 * on mount for screens where they are not immediately visible, such as
 * collapsed sections or secondary tabs.
 *
 * Usage:
 *   const { LazyChart } = useLazyChart();
 *   <LazyChart>{({ CartesianChart, Bar, Line }) => <CartesianChart ... />}</LazyChart>
 *
 * Victory Native audit:
 *   1. BodyMassTrendChart.tsx  -> keep, used on body-mass screens.
 *   2. WorkoutAnalyticsTab.tsx -> migrate to lightweight SVG in a future S&C analytics pass.
 *   3. SCAnalyticsSection.tsx  -> migrate to lightweight SVG in a future S&C analytics pass.
 * Target after UX revamp: <=2 files importing victory-native.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
