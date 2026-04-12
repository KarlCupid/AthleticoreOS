import React, { useState, useEffect, useCallback } from 'react';
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
    const [prs, setPrs] = useState<Array<{ name: string; weight: number; reps: number }>>([]);

    const loadData = useCallback(async () => {
        const volumeStats = await getWeeklyVolumeStats(userId);
        const latestWeek = volumeStats.length > 0 ? volumeStats[0].volumes : {};
        const nextVolumeData = Object.entries(latestWeek)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([muscle, vol]) => ({ x: muscle.substring(0, 3).toUpperCase(), y: vol }));

        const { data: topSets } = await supabase
            .from('workout_set_log')
            .select(`
                weight_lbs,
                reps,
                exercise_library ( name )
            `)
            .eq('user_id', userId)
            .eq('is_warmup', false)
            .gt('weight_lbs', 0)
            .order('weight_lbs', { ascending: false })
            .limit(20);

        const uniquePrs: Array<{ name: string; weight: number; reps: number }> = [];
        const seen = new Set<string>();
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

        return { nextVolumeData, uniquePrs };
    }, [userId]);

    useEffect(() => {
        let isActive = true;
        setLoading(true);

        void (async () => {
            try {
                const { nextVolumeData, uniquePrs } = await loadData();
                if (!isActive) {
                    return;
                }

                setVolumeData(nextVolumeData);
                setPrs(uniquePrs);
            } catch (error) {
                if (!isActive) {
                    return;
                }

                logError('SCAnalyticsSection.loadData', error, { userId });
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            isActive = false;
        };
    }, [loadData, userId]);

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
