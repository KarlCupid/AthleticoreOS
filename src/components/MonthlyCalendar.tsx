import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { todayLocalDate } from '../../lib/utils/date';

const ACTIVITY_COLORS: Record<string, string> = {
    boxing_practice: '#FF6B35',
    sparring: '#FF4444',
    sc: '#4A90D9',
    running: '#4CAF50',
    conditioning: '#FFC107',
    active_recovery: '#9C27B0',
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

    // Build calendar grid
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDayOfMonth).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
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
            {/* Month Navigation */}
            <View style={styles.monthHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
                    <Text style={styles.navText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthNames[month]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                    <Text style={styles.navText}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={i} style={styles.dayHeaderText}>{d}</Text>
                ))}
            </View>

            {/* Calendar Grid */}
            {weeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                    {week.map((day, di) => {
                        if (day === null) return <View key={di} style={styles.dayCell} />;

                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = dateStr === selectedDate;
                        const isToday = dateStr === today;
                        const dots = activityDots.get(dateStr);

                        return (
                            <TouchableOpacity
                                key={di}
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
                                                key={ti}
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
        marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
        backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
        padding: SPACING.md,
    },
    monthHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: SPACING.md,
    },
    navButton: { padding: SPACING.xs },
    navText: { fontSize: 24, fontFamily: FONT_FAMILY.black, color: COLORS.text.secondary },
    monthTitle: { fontSize: 18, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
    dayHeaders: { flexDirection: 'row', marginBottom: SPACING.xs },
    dayHeaderText: {
        flex: 1, textAlign: 'center', fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary,
    },
    weekRow: { flexDirection: 'row' },
    dayCell: {
        flex: 1, alignItems: 'center', paddingVertical: SPACING.xs + 2,
        minHeight: 44, justifyContent: 'center', borderRadius: RADIUS.sm,
    },
    selectedDay: { borderRadius: RADIUS.md },
    todayDay: { borderWidth: 1, borderColor: COLORS.text.tertiary, borderRadius: RADIUS.md },
    dayText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    selectedDayText: { color: '#F5F5F0', fontFamily: FONT_FAMILY.black },
    dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
});

