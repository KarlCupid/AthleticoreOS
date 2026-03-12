import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { CartesianChart, Line, Bar } from 'victory-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { styles } from './NutritionAnalyticsSection.styles';
import { supabase } from '../../lib/supabase';
import { computeMacroAdherence } from '../../lib/engine/calculateNutrition';
import type { MacroAdherenceResult } from '../../lib/engine/types';
import { formatLocalDate } from '../../lib/utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NutritionAnalyticsSectionProps {
    userId: string;
}

// ─── Types ──────────────────────────────────────────────────────

interface DailyNutritionData {
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
}

interface LedgerData {
    date: string;
    base_tdee: number;
    prescribed_calories?: number | null;
    prescribed_protein: number;
    prescribed_carbs: number;
    prescribed_fats: number;
    target_source?: 'base' | 'daily_activity_adjusted' | 'weight_cut_protocol' | null;
    actual_calories?: number;
    actual_protein?: number;
    actual_carbs?: number;
    actual_fat?: number;
}

interface AdherenceDay {
    date: string;
    status: 'Target Met' | 'Close Enough' | 'Missed It' | 'no_data';
    actual?: { calories: number; protein: number; carbs: number; fat: number };
    prescribed?: { calories: number; protein: number; carbs: number; fat: number };
}

// ─── Component ──────────────────────────────────────────────────

export function NutritionAnalyticsSection({ userId }: NutritionAnalyticsSectionProps) {
    const [macroTrendData, setMacroTrendData] = useState<Array<{
        x: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    }>>([]);

    const [calorieBalanceData, setCalorieBalanceData] = useState<Array<{
        x: number;
        target: number;
        actual: number;
        label: string;
    }>>([]);

    const [adherenceDays, setAdherenceDays] = useState<AdherenceDay[]>([]);
    const [selectedDay, setSelectedDay] = useState<AdherenceDay | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) fetchAnalyticsData();
    }, [userId]);

    async function fetchAnalyticsData() {
        setLoading(true);
        try {
            const now = new Date();

            // Dates
            const days14Ago = new Date(now);
            days14Ago.setDate(days14Ago.getDate() - 14);
            const days30Ago = new Date(now);
            days30Ago.setDate(days30Ago.getDate() - 30);

            const dateStr14 = formatLocalDate(days14Ago);
            const dateStr30 = formatLocalDate(days30Ago);

            // Fetch nutrition summary + ledger in parallel
            const [summaryRes, ledgerRes] = await Promise.all([
                supabase
                    .from('daily_nutrition_summary')
                    .select('date, total_calories, total_protein, total_carbs, total_fat')
                    .eq('user_id', userId)
                    .gte('date', dateStr30)
                    .order('date'),
                supabase
                    .from('macro_ledger')
                    .select('date, base_tdee, prescribed_calories, prescribed_protein, prescribed_carbs, prescribed_fats, target_source, actual_calories, actual_protein, actual_carbs, actual_fat')
                    .eq('user_id', userId)
                    .gte('date', dateStr30)
                    .order('date'),
            ]);

            const summaries: DailyNutritionData[] = summaryRes.data || [];
            const ledgers = ((ledgerRes.data ?? []) as unknown) as LedgerData[];

            // Build lookup maps
            const summaryMap = new Map<string, DailyNutritionData>();
            summaries.forEach((s) => summaryMap.set(s.date, s));

            const ledgerMap = new Map<string, LedgerData>();
            ledgers.forEach((l) => ledgerMap.set(l.date, l));

            // ─── Macro Trends (14 days) ───
            const trend14: typeof macroTrendData = [];
            for (let i = 13; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const ds = formatLocalDate(d);
                const s = summaryMap.get(ds);
                if (s) {
                    trend14.push({
                        x: 13 - i,
                        calories: s.total_calories,
                        protein: s.total_protein,
                        carbs: s.total_carbs,
                        fat: s.total_fat,
                    });
                }
            }
            setMacroTrendData(trend14);

            // ─── Calorie Balance (7 days) ───
            const balance7: typeof calorieBalanceData = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const ds = formatLocalDate(d);
                const l = ledgerMap.get(ds);
                const s = summaryMap.get(ds);
                const target = l ? ((l.prescribed_calories ?? l.base_tdee) || 0) : 0;
                const actual = s ? s.total_calories : 0;
                balance7.push({
                    x: 6 - i,
                    target,
                    actual,
                    label: d.toLocaleDateString('en-US', { weekday: 'short' }),
                });
            }
            setCalorieBalanceData(balance7);

            // ─── Adherence Calendar (30 days) ───
            const adherence30: AdherenceDay[] = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const ds = formatLocalDate(d);
                const s = summaryMap.get(ds);
                const l = ledgerMap.get(ds);

                if (s && l) {
                    const actual = {
                        calories: s.total_calories,
                        protein: s.total_protein,
                        carbs: s.total_carbs,
                        fat: s.total_fat,
                    };
                    const prescribed = {
                        calories: (l.prescribed_calories ?? l.base_tdee) || 0,
                        protein: l.prescribed_protein || 0,
                        carbs: l.prescribed_carbs || 0,
                        fat: l.prescribed_fats || 0,
                    };
                    const adherence = computeMacroAdherence(actual, prescribed);
                    adherence30.push({
                        date: ds,
                        status: adherence.overall,
                        actual,
                        prescribed,
                    });
                } else {
                    adherence30.push({ date: ds, status: 'no_data' });
                }
            }
            setAdherenceDays(adherence30);
        } catch (err) {
            console.error('Failed to fetch analytics data:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return null; // Parent handles loading state
    }

    return (
        <View style={styles.container}>
            <SectionHeader title="Nutrition Trends" />

            {/* A. Macro Trends Line Chart */}
            <Card style={styles.cardSpacing}>
                <Text style={styles.chartTitle}>Macro Trends</Text>
                <Text style={styles.chartSubtitle}>Past 14 days</Text>
                {macroTrendData.length > 1 ? (
                    <View style={{ height: 200 }}>
                        <CartesianChart
                            data={macroTrendData}
                            xKey="x"
                            yKeys={['protein', 'carbs', 'fat']}
                            domainPadding={{ left: 12, right: 12, top: 20 }}
                        >
                            {({ points }) => (
                                <>
                                    <Line
                                        points={points.protein}
                                        color="#3B82F6"
                                        strokeWidth={2}
                                        curveType="natural"
                                    />
                                    <Line
                                        points={points.carbs}
                                        color="#10B981"
                                        strokeWidth={2}
                                        curveType="natural"
                                    />
                                    <Line
                                        points={points.fat}
                                        color="#F59E0B"
                                        strokeWidth={2}
                                        curveType="natural"
                                    />
                                </>
                            )}
                        </CartesianChart>
                    </View>
                ) : (
                    <View style={styles.emptyChart}>
                        <Text style={styles.emptyText}>Insufficient nutrition data</Text>
                    </View>
                )}
                <View style={styles.legendRow}>
                    <LegendItem color="#3B82F6" label="Protein" />
                    <LegendItem color="#10B981" label="Carbs" />
                    <LegendItem color="#F59E0B" label="Fat" />
                </View>
            </Card>

            {/* B. Calorie Balance Bar Chart */}
            <Card style={styles.cardSpacing}>
                <Text style={styles.chartTitle}>Calorie Balance</Text>
                <Text style={styles.chartSubtitle}>Past 7 days</Text>
                {calorieBalanceData.some((d) => d.target > 0 || d.actual > 0) ? (
                    <View style={{ height: 180 }}>
                        <CartesianChart
                            data={calorieBalanceData}
                            xKey="x"
                            yKeys={['target', 'actual']}
                            domainPadding={{ left: 20, right: 20, top: 20 }}
                        >
                            {({ points, chartBounds }) => (
                                <>
                                    <Bar
                                        points={points.target}
                                        chartBounds={chartBounds}
                                        color="rgba(156,163,175,0.4)"
                                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                                    />
                                    <Bar
                                        points={points.actual}
                                        chartBounds={chartBounds}
                                        color="#F97316"
                                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                                    />
                                </>
                            )}
                        </CartesianChart>
                    </View>
                ) : (
                    <View style={styles.emptyChart}>
                        <Text style={styles.emptyText}>Insufficient calorie data</Text>
                    </View>
                )}
                <View style={styles.legendRow}>
                    <LegendItem color="rgba(156,163,175,0.6)" label="Target" />
                    <LegendItem color="#F97316" label="Actual" />
                </View>
            </Card>

            {/* C. Adherence Calendar */}
            <Card style={styles.cardSpacing}>
                <Text style={styles.chartTitle}>Adherence</Text>
                <Text style={styles.chartSubtitle}>Past 30 days</Text>

                <View style={styles.calendarGrid}>
                    {adherenceDays.map((day, i) => (
                        <TouchableOpacity
                            key={day.date}
                            style={[
                                styles.calendarDot,
                                { backgroundColor: getAdherenceColor(day.status) },
                            ]}
                            onPress={() => setSelectedDay(day.status !== 'no_data' ? day : null)}
                            activeOpacity={0.7}
                        />
                    ))}
                </View>

                {/* Selected day tooltip */}
                {selectedDay && selectedDay.actual && selectedDay.prescribed && (
                    <View style={styles.tooltip}>
                        <Text style={styles.tooltipDate}>
                            {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                            })}
                        </Text>
                        <View style={styles.tooltipRow}>
                            <Text style={styles.tooltipLabel}>Calories:</Text>
                            <Text style={styles.tooltipValue}>
                                {selectedDay.actual.calories} / {selectedDay.prescribed.calories}
                            </Text>
                        </View>
                        <View style={styles.tooltipRow}>
                            <Text style={styles.tooltipLabel}>Protein:</Text>
                            <Text style={styles.tooltipValue}>
                                {Math.round(selectedDay.actual.protein)}g / {Math.round(selectedDay.prescribed.protein)}g
                            </Text>
                        </View>
                        <View style={styles.tooltipRow}>
                            <Text style={styles.tooltipLabel}>Carbs:</Text>
                            <Text style={styles.tooltipValue}>
                                {Math.round(selectedDay.actual.carbs)}g / {Math.round(selectedDay.prescribed.carbs)}g
                            </Text>
                        </View>
                        <View style={styles.tooltipRow}>
                            <Text style={styles.tooltipLabel}>Fat:</Text>
                            <Text style={styles.tooltipValue}>
                                {Math.round(selectedDay.actual.fat)}g / {Math.round(selectedDay.prescribed.fat)}g
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tooltipBadge,
                                { backgroundColor: getAdherenceColor(selectedDay.status) + '22' },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.tooltipBadgeText,
                                    { color: getAdherenceColor(selectedDay.status) },
                                ]}
                            >
                                {selectedDay.status}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.legendRow}>
                    <LegendItem color="#16A34A" label="Target Met" />
                    <LegendItem color="#D97706" label="Close" />
                    <LegendItem color="#DC2626" label="Missed" />
                </View>
            </Card>
        </View>
    );
}

// ─── Helpers ────────────────────────────────────────────────────

function getAdherenceColor(status: AdherenceDay['status']): string {
    switch (status) {
        case 'Target Met':
            return '#16A34A';
        case 'Close Enough':
            return '#D97706';
        case 'Missed It':
            return '#DC2626';
        default:
            return COLORS.borderLight;
    }
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
        </View>
    );
}



