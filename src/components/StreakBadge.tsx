import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT_FAMILY, SPACING } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';

interface StreakBadgeProps { streak: number; }

export function StreakBadge({ streak }: StreakBadgeProps) {
    const { themeColor } = useReadinessTheme();
    if (streak <= 0) return null;

    return (
        <View style={[styles.badge, { backgroundColor: themeColor + '20' }]}>
            <Text style={styles.flame}>🔥</Text>
            <Text style={[styles.count, { color: themeColor }]}>{streak}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: 12,
    },
    flame: { fontSize: 14 },
    count: { fontSize: 14, fontFamily: FONT_FAMILY.black },
});
