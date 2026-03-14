import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import {
    getRecurringActivities, upsertRecurringActivity, removeRecurringActivity,
    generateRollingSchedule,
} from '../../lib/api/scheduleService';
import type { RecurringActivityRow, ActivityType } from '../../lib/engine/types';
import { logError } from '../../lib/utils/logger';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ACTIVITY_OPTIONS: { type: ActivityType; label: string; icon: string }[] = [
    { type: 'boxing_practice', label: 'Boxing', icon: '🥊' },
    { type: 'sparring', label: 'Sparring', icon: '🥊' },
    { type: 'sc', label: 'S&C', icon: '🏋️' },
    { type: 'running', label: 'Running', icon: '🏃' },
    { type: 'conditioning', label: 'Conditioning', icon: '💪' },
    { type: 'active_recovery', label: 'Recovery', icon: '🧘' },
    { type: 'rest', label: 'Rest Day', icon: '😴' },
    { type: 'other', label: 'Other', icon: '📝' },
];

export function WeeklyTemplateScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { themeColor } = useReadinessTheme();

    const [template, setTemplate] = useState<RecurringActivityRow[]>([]);
    const [selectedDay, setSelectedDay] = useState<number>(1); // Monday
    const [showAddPicker, setShowAddPicker] = useState(false);
    const loadData = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { return; }
        try {
            const tmpl = await getRecurringActivities(session.user.id);
            setTemplate(tmpl);
        } catch (e) { logError('WeeklyTemplateScreen.loadData', e); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAdd = async (type: ActivityType) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        try {
            await upsertRecurringActivity(session.user.id, {
                activity_type: type,
                estimated_duration_min: 60,
                expected_intensity: 5,
                recurrence: { frequency: 'weekly', interval: 1, days_of_week: [selectedDay] }
            });
            setShowAddPicker(false);
            loadData();
        } catch (e) { logError('WeeklyTemplateScreen.addTemplate', e, { dayOfWeek: selectedDay, activityType: type }); }
    };

    const handleRemove = async (entryId: string) => {
        try {
            await removeRecurringActivity(entryId, true);
            loadData();
        } catch (e) { logError('WeeklyTemplateScreen.removeTemplate', e, { entryId }); }
    };

    const handleApply = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        try {
            await generateRollingSchedule(session.user.id, 4);
            Alert.alert('Success', 'Calendar populated for the next 4 weeks!');
        } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to generate');
        }
    };

    const dayActivities = template.filter(t => t.recurrence.frequency === 'weekly' && t.recurrence.days_of_week?.includes(selectedDay));

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weekly Template</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Day Selector */}
                <View style={styles.daySelector}>
                    {DAY_NAMES.map((name, i) => {
                        const count = template.filter(t => t.recurrence.frequency === 'weekly' && t.recurrence.days_of_week?.includes(i)).length;
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[styles.dayTab, selectedDay === i && { backgroundColor: themeColor }]}
                                onPress={() => setSelectedDay(i)}
                            >
                                <Text style={[styles.dayTabText, selectedDay === i && { color: '#FFF' }]}>{name}</Text>
                                {count > 0 && (
                                    <View style={[styles.countDot, selectedDay === i && { backgroundColor: '#FFF' }]}>
                                        <Text style={[styles.countDotText, selectedDay === i && { color: themeColor }]}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Day Activities */}
                <View style={styles.dayContent}>
                    <View style={styles.daySectionHeader}>
                        <Text style={styles.daySectionTitle}>{DAY_NAMES[selectedDay]}</Text>
                        <TouchableOpacity onPress={() => setShowAddPicker(true)}>
                            <Text style={[styles.addText, { color: themeColor }]}>+ Add</Text>
                        </TouchableOpacity>
                    </View>

                    {dayActivities.length === 0 ? (
                        <Text style={styles.emptyText}>No activities set for this day</Text>
                    ) : (
                        dayActivities.map(entry => {
                            const opt = ACTIVITY_OPTIONS.find(o => o.type === entry.activity_type);
                            return (
                                <View key={entry.id} style={styles.entryCard}>
                                    <Text style={styles.entryIcon}>{opt?.icon ?? '📝'}</Text>
                                    <View style={styles.entryContent}>
                                        <Text style={styles.entryLabel}>{opt?.label ?? entry.activity_type}</Text>
                                        <Text style={styles.entryMeta}>
                                            {entry.estimated_duration_min}min · RPE {entry.expected_intensity}
                                            {entry.start_time ? ` · ${formatTime(entry.start_time)}` : ''}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleRemove(entry.id)}>
                                        <Text style={styles.removeText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Apply Button */}
                <TouchableOpacity
                    style={[styles.applyButton, { backgroundColor: themeColor }]}
                    onPress={handleApply}
                >
                    <Text style={styles.applyButtonText}>Apply to Calendar</Text>
                </TouchableOpacity>

                <View style={{ height: SPACING.xxl * 2 }} />
            </ScrollView>

            {/* Add Picker */}
            {showAddPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Add to {DAY_NAMES[selectedDay]}</Text>
                        {ACTIVITY_OPTIONS.map(opt => (
                            <TouchableOpacity key={opt.type} style={styles.pickerOption} onPress={() => handleAdd(opt.type)}>
                                <Text style={styles.pickerOptionIcon}>{opt.icon}</Text>
                                <Text style={styles.pickerOptionLabel}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowAddPicker(false)}>
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

function formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backButton: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
    headerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
    daySelector: {
        flexDirection: 'row', paddingHorizontal: SPACING.sm,
        marginTop: SPACING.sm, gap: 4,
    },
    dayTab: {
        flex: 1, alignItems: 'center', paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md, backgroundColor: COLORS.surface,
    },
    dayTabText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    countDot: {
        width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.text.tertiary,
        alignItems: 'center', justifyContent: 'center', marginTop: 2,
    },
    countDotText: { fontSize: 10, fontFamily: FONT_FAMILY.black, color: '#FFF' },
    dayContent: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
    daySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    daySectionTitle: { fontSize: 18, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
    addText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold },
    emptyText: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, textAlign: 'center', paddingVertical: SPACING.xl },
    entryCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
        ...SHADOWS.card, gap: SPACING.sm,
    },
    entryIcon: { fontSize: 20 },
    entryContent: { flex: 1 },
    entryLabel: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    entryMeta: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginTop: 2 },
    removeText: { fontSize: 18, color: COLORS.text.tertiary, fontWeight: 'bold' },
    applyButton: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.lg,
        paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center',
    },
    applyButtonText: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: '#FFF' },
    pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    pickerCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xxl },
    pickerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginBottom: SPACING.md },
    pickerOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderLight },
    pickerOptionIcon: { fontSize: 20 },
    pickerOptionLabel: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    pickerCancel: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm },
    pickerCancelText: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
});
