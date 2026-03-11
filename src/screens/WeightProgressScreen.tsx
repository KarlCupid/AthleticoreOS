import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { Card } from '../components/Card';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { IconChevronLeft } from '../components/icons';
import { supabase } from '../../lib/supabase';
import { CartesianChart, Line } from 'victory-native';
import { calculateWeightTrend } from '../../lib/engine/calculateWeight';
import { getWeightHistory } from '../../lib/api/weightService';
import type { WeightTrendResult, WeightDataPoint } from '../../lib/engine/types';
import { WeightTrendCard } from '../components/WeightTrendCard';

type Period = '7d' | '30d' | '90d';
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

export function WeightProgressScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { themeColor } = useReadinessTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<Period>('30d');
    const [trend, setTrend] = useState<WeightTrendResult | null>(null);
    const [chartData, setChartData] = useState<{ x: number; weight: number; sma: number }[]>([]);
    const [targetWeight, setTargetWeight] = useState<number | null>(null);
    const [baseWeight, setBaseWeight] = useState<number>(150);

    const loadData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const userId = session.user.id;

            const { data: profile } = await supabase
                .from('athlete_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            const days = PERIOD_DAYS[period];
            const history = await getWeightHistory(userId, days);

            const profilePhase = (profile?.phase as 'off-season' | 'pre-camp' | 'fight-camp') || 'off-season';
            const bw = profile?.base_weight ?? 150;
            const tw = profile?.target_weight ?? null;

            setBaseWeight(bw);
            setTargetWeight(tw);

            const trendResult = calculateWeightTrend({
                weightHistory: history,
                targetWeightLbs: tw,
                baseWeightLbs: bw,
                phase: profilePhase,
                deadlineDate: profile?.fight_date ?? null,
            });
            setTrend(trendResult);

            // Build chart data with SMA
            const weights = history.map(h => h.weight);
            const data = history.map((h, i) => {
                const window = Math.min(7, i + 1);
                const slice = weights.slice(Math.max(0, i + 1 - window), i + 1);
                const sma = slice.reduce((s, v) => s + v, 0) / slice.length;
                return { x: i, weight: h.weight, sma: Math.round(sma * 10) / 10 };
            });
            setChartData(data);
        } catch (e) {
            console.error('Weight progress error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const D = 50;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <IconChevronLeft size={22} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weight Progress</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
                }
            >
                {loading ? (
                    <View>
                        <SkeletonLoader width="100%" height={200} shape="rect" style={{ borderRadius: RADIUS.xl, marginBottom: SPACING.md }} />
                        <SkeletonLoader width="100%" height={120} shape="rect" style={{ borderRadius: RADIUS.xl }} />
                    </View>
                ) : (
                    <>
                        {/* Period Selector */}
                        <Animated.View
                            entering={FadeInDown.delay(D).duration(ANIMATION.slow).springify()}
                            style={styles.periodRow}
                        >
                            {(['7d', '30d', '90d'] as Period[]).map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.periodTab, period === p && styles.periodTabActive]}
                                    onPress={() => setPeriod(p)}
                                >
                                    <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                                        {p.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </Animated.View>

                        {/* Weight Chart */}
                        <Animated.View
                            entering={FadeInDown.delay(D * 2).duration(ANIMATION.slow).springify()}
                        >
                            <Card style={styles.chartCard}>
                                {chartData.length > 1 ? (
                                    <View style={styles.chartContainer}>
                                        <CartesianChart
                                            data={chartData}
                                            xKey="x"
                                            yKeys={["weight", "sma"]}
                                            domainPadding={{ left: 10, right: 10, top: 20, bottom: 10 }}
                                        >
                                            {({ points }) => (
                                                <>
                                                    <Line
                                                        points={points.weight}
                                                        color={COLORS.text.tertiary}
                                                        strokeWidth={1.5}
                                                        curveType="natural"
                                                    />
                                                    <Line
                                                        points={points.sma}
                                                        color={themeColor}
                                                        strokeWidth={2.5}
                                                        curveType="natural"
                                                    />
                                                </>
                                            )}
                                        </CartesianChart>
                                    </View>
                                ) : (
                                    <View style={styles.emptyChart}>
                                        <Text style={styles.emptyText}>
                                            Log your morning weight daily to see trends here.
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.chartLegend}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendLine, { backgroundColor: COLORS.text.tertiary }]} />
                                        <Text style={styles.legendText}>Daily</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendLine, { backgroundColor: themeColor }]} />
                                        <Text style={styles.legendText}>7d Average</Text>
                                    </View>
                                    {targetWeight && (
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendLine, { backgroundColor: COLORS.readiness.caution, borderStyle: 'dashed' }]} />
                                            <Text style={styles.legendText}>Target ({targetWeight})</Text>
                                        </View>
                                    )}
                                </View>
                            </Card>
                        </Animated.View>

                        {/* Stats Card */}
                        {trend && (
                            <Animated.View
                                entering={FadeInDown.delay(D * 3).duration(ANIMATION.slow).springify()}
                                style={{ marginTop: SPACING.md }}
                            >
                                <WeightTrendCard
                                    trend={trend}
                                    baseWeight={baseWeight}
                                    targetWeight={targetWeight}
                                />
                            </Animated.View>
                        )}

                        {/* Detail Stats */}
                        {trend && (
                            <Animated.View
                                entering={FadeInDown.delay(D * 4).duration(ANIMATION.slow).springify()}
                                style={{ marginTop: SPACING.md }}
                            >
                                <Card>
                                    <DetailRow label="Total Change" value={`${trend.totalChangeLbs > 0 ? '+' : ''}${trend.totalChangeLbs.toFixed(1)} lbs`} />
                                    <DetailRow label="Starting Weight" value={`${baseWeight.toFixed(1)} lbs`} />
                                    {targetWeight && <DetailRow label="Target Weight" value={`${targetWeight.toFixed(1)} lbs`} />}
                                    {trend.projectedDate && (
                                        <DetailRow
                                            label="Projected Target Date"
                                            value={new Date(trend.projectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        />
                                    )}
                                    <DetailRow label="Data Points" value={`${chartData.length} weigh-ins`} isLast />
                                </Card>
                            </Animated.View>
                        )}

                        <View style={{ height: SPACING.xxl }} />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function DetailRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
    return (
        <View style={[detailStyles.row, isLast && { borderBottomWidth: 0 }]}>
            <Text style={detailStyles.label}>{label}</Text>
            <Text style={detailStyles.value}>{value}</Text>
        </View>
    );
}

const detailStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
    },
    label: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
    },
    value: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    content: {
        padding: SPACING.lg,
    },
    periodRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xs,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    periodTab: {
        flex: 1,
        paddingVertical: SPACING.sm + 2,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    periodTabActive: {
        backgroundColor: COLORS.accent,
    },
    periodTabText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    periodTabTextActive: {
        color: COLORS.text.inverse,
    },
    chartCard: {
        padding: SPACING.md,
    },
    chartContainer: {
        height: 220,
    },
    emptyChart: {
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        textAlign: 'center',
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.lg,
        marginTop: SPACING.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    legendLine: {
        width: 16,
        height: 3,
        borderRadius: 1.5,
    },
    legendText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
});
