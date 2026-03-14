import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';
import { CartesianChart, Bar } from 'victory-native';
import { getWeeklyVolumeStats } from '../../lib/api/scService';
import { supabase } from '../../lib/supabase';
import { logError } from '../../lib/utils/logger';

interface SCAnalyticsSectionProps {
    userId: string;
}

export function SCAnalyticsSection({ userId }: SCAnalyticsSectionProps) {
    const { themeColor } = useReadinessTheme();
    const [loading, setLoading] = useState(true);
    const [volumeData, setVolumeData] = useState<{ x: string; y: number }[]>([]);
    const [prs, setPrs] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load weekly volume
            const volumeStats = await getWeeklyVolumeStats(userId);
            // Volume stats is an array of weeks. Grab the first (most recent) or default to empty
            const latestWeek = volumeStats.length > 0 ? volumeStats[0].volumes : {};

            // Convert to chart format (take top 6 muscle groups)
            const vData = Object.entries(latestWeek)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([muscle, vol]) => ({ x: muscle.substring(0, 3).toUpperCase(), y: vol }));
            setVolumeData(vData);

            // Load some PRs (e.g. top 3 exercises by max weight)
            // For now we'll just fetch recent max efforts from workout_set_log
            const { data: topSets } = await supabase
                .from('workout_set_log')
                .select(`
                    weight_lbs,
                    reps,
                    exercise_library ( name )
                `)
                .eq('is_warmup', false)
                .gt('weight_lbs', 0)
                .order('weight_lbs', { ascending: false })
                .limit(20);

            // Group by exercise to get distinct PRs
            const uniquePrs = [];
            const seen = new Set();
            if (topSets) {
                for (const set of topSets) {
                    const lib = set.exercise_library as any;
                    const name = lib?.name;
                    if (name && !seen.has(name)) {
                        seen.add(name);
                        uniquePrs.push({ name, weight: set.weight_lbs, reps: set.reps });
                        if (uniquePrs.length >= 3) break;
                    }
                }
            }
            setPrs(uniquePrs);

        } catch (error) {
            logError('SCAnalyticsSection.loadData', error, { userId });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', height: 200 }]}>
                <ActivityIndicator size="small" color={themeColor} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Weekly Volume */}
            <SectionHeader title="Weekly Volume (lbs)" />
            <Card>
                {volumeData.length > 0 ? (
                    <View style={{ height: 180 }}>
                        <CartesianChart
                            data={volumeData}
                            xKey="x"
                            yKeys={["y"]}
                            domainPadding={{ left: 24, right: 24, top: 20 }}
                        >
                            {({ points, chartBounds }) => (
                                <Bar
                                    points={points.y}
                                    chartBounds={chartBounds}
                                    color={COLORS.chart.fitness}
                                    roundedCorners={{ topLeft: 6, topRight: 6 }}
                                    barWidth={24}
                                />
                            )}
                        </CartesianChart>
                    </View>
                ) : (
                    <View style={styles.emptyChart}>
                        <Text style={styles.emptyText}>Complete workouts to see volume distribution</Text>
                    </View>
                )}
            </Card>

            {/* PR Tracker */}
            <View style={{ marginTop: SPACING.lg }}>
                <SectionHeader title="Recent PRs" />
                <Card>
                    {prs.length > 0 ? (
                        prs.map((pr, i) => (
                            <View key={i} style={[styles.prRow, i < prs.length - 1 && styles.prRowBorder]}>
                                <Text style={styles.prName}>{pr.name}</Text>
                                <View style={styles.prStats}>
                                    <Text style={styles.prWeight}>{pr.weight}</Text>
                                    <Text style={styles.prReps}>× {pr.reps}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyText}>Log heavy sets to track PRs</Text>
                        </View>
                    )}
                </Card>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.lg,
    },
    emptyChart: {
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    prRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 2,
    },
    prRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
    },
    prName: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        flex: 1,
    },
    prStats: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: SPACING.xs,
    },
    prWeight: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
    },
    prReps: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
});
