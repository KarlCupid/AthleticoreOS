import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { formatLocalDate } from '../../lib/utils/date';

interface ConsistencyCalendarProps {
    checkinDates: Set<string>;
    weeks?: number;
}

export function ConsistencyCalendar({ checkinDates, weeks = 4 }: ConsistencyCalendarProps) {
    const { themeColor, lightTint } = useReadinessTheme();

    // Generate grid of dates going back `weeks` weeks from today
    const today = new Date();
    const grid: string[][] = [];

    for (let w = weeks - 1; w >= 0; w--) {
        const weekDates: string[] = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (w * 7 + (6 - d)));
            weekDates.push(formatLocalDate(date));
        }
        grid.push(weekDates);
    }

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <View style={styles.container}>
            <View style={styles.dayLabels}>
                {dayLabels.map((label, i) => (
                    <Text key={i} style={styles.dayLabel}>{label}</Text>
                ))}
            </View>
            <View style={styles.grid}>
                {grid.map((week, wi) => (
                    <View key={wi} style={styles.weekColumn}>
                        {week.map((date, di) => {
                            const isCheckedIn = checkinDates.has(date);
                            const isFuture = new Date(date) > today;
                            return (
                                <View
                                    key={di}
                                    style={[
                                        styles.cell,
                                        isFuture && styles.cellFuture,
                                        !isFuture && !isCheckedIn && styles.cellEmpty,
                                        isCheckedIn && { backgroundColor: themeColor },
                                    ]}
                                />
                            );
                        })}
                    </View>
                ))}
            </View>
            <View style={styles.legend}>
                <View style={[styles.legendCell, styles.cellEmpty]} />
                <Text style={styles.legendText}>Missed</Text>
                <View style={[styles.legendCell, { backgroundColor: themeColor }]} />
                <Text style={styles.legendText}>Logged</Text>
            </View>
        </View>
    );
}

const CELL_SIZE = 16;
const CELL_GAP = 4;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    dayLabels: {
        flexDirection: 'column',
        position: 'absolute',
        left: 0,
        top: 0,
        gap: CELL_GAP,
    },
    dayLabel: {
        width: 14,
        height: CELL_SIZE,
        textAlign: 'center',
        fontSize: 10,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        lineHeight: CELL_SIZE,
    },
    grid: {
        flexDirection: 'row',
        gap: CELL_GAP,
        marginLeft: 20,
    },
    weekColumn: {
        flexDirection: 'column',
        gap: CELL_GAP,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: 3,
    },
    cellEmpty: {
        backgroundColor: COLORS.borderLight,
    },
    cellFuture: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        gap: SPACING.xs,
    },
    legendCell: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    legendText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginRight: SPACING.sm,
    },
});

