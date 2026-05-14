import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, TAP_TARGETS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { todayLocalDate } from '../../lib/utils/date';

const ACTIVITY_COLORS: Record<string, string> = {
    boxing_practice: '#FF6B35',
    boxing_skill: '#FF6B35',
    sparring: '#FF4444',
    sc: '#4A90D9',
    strength: '#4A90D9',
    running: '#4CAF50',
    conditioning: '#FFC107',
    durability_core: '#8B5CF6',
    active_recovery: '#9C27B0',
    recovery: '#9C27B0',
    rest: '#666',
    other: '#999',
};

interface MonthlyCalendarProps {
    currentMonth: Date;
    selectedDate: string;
    activityDots: Map<string, Set<string>>;
    onSelectDate: (date: string) => void;
    onChangeMonth: (date: Date) => void;
}

export function MonthlyCalendar({ currentMonth, selectedDate, activityDots, onSelectDate, onChangeMonth }: MonthlyCalendarProps) {
    const { themeColor } = useReadinessTheme();
    const today = todayLocalDate();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDayOfMonth).fill(null);

    for (let day = 1; day <= daysInMonth; day += 1) {
        week.push(day);
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }

    const prevMonth = () => onChangeMonth(new Date(year, month - 1, 1));
    const nextMonth = () => onChangeMonth(new Date(year, month + 1, 1));

    return (
        <View style={styles.container}>
            <View style={styles.monthHeader}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" onPress={prevMonth} style={styles.navButton}>
                    <MaterialCommunityIcons name="chevron-left" size={22} color={COLORS.text.secondary} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthNames[month]} {year}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" onPress={nextMonth} style={styles.navButton}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.text.secondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.dayHeaders}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={`${d}-${i}`} style={styles.dayHeaderText}>{d}</Text>
                ))}
            </View>

            {weeks.map((weekRow, wi) => (
                <View key={wi} style={styles.weekRow}>
                    {weekRow.map((day, di) => {
                        if (day === null) return <View key={di} style={styles.dayCell} />;

                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = dateStr === selectedDate;
                        const isToday = dateStr === today;
                        const dots = activityDots.get(dateStr);

                        return (
                            <TouchableOpacity
                                key={di}
                                accessibilityRole="button"
                                accessibilityLabel={`Select ${dateStr}`}
                                style={[
                                    styles.dayCell,
                                    isSelected && [styles.selectedDay, { backgroundColor: themeColor }],
                                    isToday && !isSelected && styles.todayDay,
                                ]}
                                onPress={() => onSelectDate(dateStr)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.dayText,
                                    isSelected && styles.selectedDayText,
                                    isToday && !isSelected && { color: themeColor },
                                ]}>
                                    {day}
                                </Text>
                                {dots && (
                                    <View style={styles.dotsRow}>
                                        {[...dots].slice(0, 3).map((type, ti) => (
                                            <View
                                                key={`${type}-${ti}`}
                                                style={[styles.dot, { backgroundColor: ACTIVITY_COLORS[type] ?? '#999' }]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.sm,
        backgroundColor: 'rgba(10, 10, 10, 0.68)',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        padding: SPACING.md,
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    navButton: {
        width: TAP_TARGETS.plan.min,
        height: TAP_TARGETS.plan.min,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(245, 245, 240, 0.06)',
    },
    monthTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
    },
    dayHeaders: { flexDirection: 'row', marginBottom: SPACING.xs },
    dayHeaderText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    weekRow: { flexDirection: 'row' },
    dayCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.xs + 2,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: RADIUS.sm,
    },
    selectedDay: { borderRadius: RADIUS.md },
    todayDay: { borderWidth: 1, borderColor: COLORS.text.tertiary, borderRadius: RADIUS.md },
    dayText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    selectedDayText: { color: '#F5F5F0', fontFamily: FONT_FAMILY.black },
    dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
});
