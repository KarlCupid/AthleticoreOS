import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface WeeklyComplianceBarProps {
    label: string;
    planned: number;
    actual: number;
    color: string;
}

export function WeeklyComplianceBar({ label, planned, actual, color }: WeeklyComplianceBarProps) {
    const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : actual > 0 ? 100 : 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.count}>{actual}/{planned}</Text>
            </View>
            <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: SPACING.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    label: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    count: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
    barBg: {
        height: 6, backgroundColor: COLORS.borderLight, borderRadius: 3, overflow: 'hidden',
    },
    barFill: { height: 6, borderRadius: 3 },
});
