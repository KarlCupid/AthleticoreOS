import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface MacroPieChartProps {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
}

const CHART_SIZE = 180;
const STROKE_WIDTH = 20;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CENTER = CHART_SIZE / 2;

const MACRO_COLORS = {
    protein: '#3B82F6',
    carbs: '#10B981',
    fat: '#F59E0B',
};

function createArcPath(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
): ReturnType<typeof Skia.Path.Make> {
    const path = Skia.Path.Make();
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const startX = cx + r * Math.cos(startRad);
    const startY = cy + r * Math.sin(startRad);

    path.moveTo(startX, startY);

    const sweep = endAngle - startAngle;
    // Use conic to approximate arc
    const segments = Math.ceil(Math.abs(sweep) / 90);

    let currentAngle = startAngle;
    const step = sweep / segments;

    for (let i = 0; i < segments; i++) {
        const segEnd = currentAngle + step;
        const segEndRad = (segEnd - 90) * (Math.PI / 180);

        const segEndX = cx + r * Math.cos(segEndRad);
        const segEndY = cy + r * Math.sin(segEndRad);

        // Control point for quadratic bezier approximation
        const midA = (currentAngle + segEnd) / 2;
        const midRad = (midA - 90) * (Math.PI / 180);
        const controlDist = r / Math.cos((step / 2) * (Math.PI / 180));
        const cpX = cx + controlDist * Math.cos(midRad);
        const cpY = cy + controlDist * Math.sin(midRad);

        path.quadTo(cpX, cpY, segEndX, segEndY);
        currentAngle = segEnd;
    }

    return path;
}

export function MacroPieChart({ protein, carbs, fat, calories }: MacroPieChartProps) {
    const proteinCal = protein * 4;
    const carbsCal = carbs * 4;
    const fatCal = fat * 9;
    const totalMacroCal = proteinCal + carbsCal + fatCal;

    if (totalMacroCal === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyChart}>
                    <Text style={styles.emptyText}>No data yet</Text>
                    <Text style={styles.emptySubtext}>Log food to see your macro breakdown</Text>
                </View>
            </View>
        );
    }

    const proteinPct = Math.round((proteinCal / totalMacroCal) * 100);
    const carbsPct = Math.round((carbsCal / totalMacroCal) * 100);
    const fatPct = 100 - proteinPct - carbsPct; // ensure they sum to 100

    const GAP = 3; // degrees gap between segments
    const TOTAL_GAP = GAP * 3;
    const AVAILABLE = 360 - TOTAL_GAP;

    const proteinSweep = (proteinPct / 100) * AVAILABLE;
    const carbsSweep = (carbsPct / 100) * AVAILABLE;
    const fatSweep = AVAILABLE - proteinSweep - carbsSweep;

    const segments = [
        { color: MACRO_COLORS.protein, sweep: proteinSweep, pct: proteinPct, label: 'Protein' },
        { color: MACRO_COLORS.carbs, sweep: carbsSweep, pct: carbsPct, label: 'Carbs' },
        { color: MACRO_COLORS.fat, sweep: fatSweep, pct: fatPct, label: 'Fat' },
    ];

    let currentAngle = 0;
    const paths = segments.map((seg) => {
        const start = currentAngle;
        const end = currentAngle + seg.sweep;
        currentAngle = end + GAP;
        return {
            ...seg,
            path: createArcPath(CENTER, CENTER, RADIUS, start, end),
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.chartWrapper}>
                <Canvas style={{ width: CHART_SIZE, height: CHART_SIZE }}>
                    {paths.map((seg, i) => (
                        <Path
                            key={i}
                            path={seg.path}
                            style="stroke"
                            strokeWidth={STROKE_WIDTH}
                            color={seg.color}
                            strokeCap="round"
                        />
                    ))}
                </Canvas>

                {/* Center text */}
                <View style={styles.centerText}>
                    <Text style={styles.centerCalories}>{Math.round(calories)}</Text>
                    <Text style={styles.centerLabel}>cal</Text>
                </View>
            </View>

            {/* Legend row */}
            <View style={styles.legendRow}>
                {segments.map((seg) => (
                    <View key={seg.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                        <Text style={styles.legendLabel}>{seg.label}</Text>
                        <Text style={styles.legendValue}>{seg.pct}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    chartWrapper: {
        width: CHART_SIZE,
        height: CHART_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerText: {
        position: 'absolute',
        alignItems: 'center',
    },
    centerCalories: {
        fontSize: 26,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    centerLabel: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginTop: -2,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.lg,
        marginTop: SPACING.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    legendValue: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    emptyChart: {
        height: CHART_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    emptySubtext: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },
});
