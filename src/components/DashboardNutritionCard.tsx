import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { AnimatedNumber } from './AnimatedNumber';
import { ProgressRing } from './ProgressRing';
import { IconWaterDrop } from './icons';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { DailyCutProtocolRow } from '../../lib/engine/types';

interface DashboardNutritionCardProps {
    actualNutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        water: number;
    };
    targets: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        water: number;
    };
    cutProtocol?: DailyCutProtocolRow | null;
}

const SECTION_ICONS: Record<string, string> = {
    Morning: '🌅',
    Afternoon: '☀️',
    Evening: '🌙',
};

export function DashboardNutritionCard({ actualNutrition, targets, cutProtocol }: DashboardNutritionCardProps) {
    const proteinProgress = targets.protein > 0 ? actualNutrition.protein / targets.protein : 0;
    const carbsProgress = targets.carbs > 0 ? actualNutrition.carbs / targets.carbs : 0;
    const fatProgress = targets.fat > 0 ? actualNutrition.fat / targets.fat : 0;
    const waterProgress = targets.water > 0 ? actualNutrition.water / targets.water : 0;

    return (
        <Card style={styles.nutritionCard}>
            {/* Calorie hero number */}
            <View style={styles.calorieHero}>
                <AnimatedNumber
                    value={Math.round(actualNutrition.calories)}
                    style={styles.calorieValue}
                    duration={800}
                />
                <Text style={styles.calorieTarget}>
                    / {targets.calories} kcal
                </Text>
            </View>

            {/* Macro progress rings */}
            <View style={styles.macroRingsRow}>
                <View style={styles.macroRingItem}>
                    <ProgressRing
                        progress={Math.min(proteinProgress, 1)}
                        size={56}
                        strokeWidth={5}
                        color={COLORS.chart.protein}
                        trackColor="rgba(255,255,255,0.1)"
                        label={`${Math.round(actualNutrition.protein)}`}
                        textColor="#FFF"
                    />
                    <Text style={styles.macroRingLabel}>Protein</Text>
                    <Text style={styles.macroRingSub}>{targets.protein}g</Text>
                </View>
                <View style={styles.macroRingItem}>
                    <ProgressRing
                        progress={Math.min(carbsProgress, 1)}
                        size={56}
                        strokeWidth={5}
                        color={COLORS.chart.carbs}
                        trackColor="rgba(255,255,255,0.1)"
                        label={`${Math.round(actualNutrition.carbs)}`}
                        textColor="#FFF"
                    />
                    <Text style={styles.macroRingLabel}>Carbs</Text>
                    <Text style={styles.macroRingSub}>{targets.carbs}g</Text>
                </View>
                <View style={styles.macroRingItem}>
                    <ProgressRing
                        progress={Math.min(fatProgress, 1)}
                        size={56}
                        strokeWidth={5}
                        color={COLORS.chart.fat}
                        trackColor="rgba(255,255,255,0.1)"
                        label={`${Math.round(actualNutrition.fat)}`}
                        textColor="#FFF"
                    />
                    <Text style={styles.macroRingLabel}>Fat</Text>
                    <Text style={styles.macroRingSub}>{targets.fat}g</Text>
                </View>
            </View>

            {/* Hydration bar */}
            <View style={styles.hydrationRow}>
                <IconWaterDrop size={14} color={COLORS.chart.water} />
                <View style={styles.hydrationBarWrap}>
                    <View style={styles.hydrationBarBg}>
                        <View
                            style={[
                                styles.hydrationBarFill,
                                { width: `${Math.min(waterProgress, 1) * 100}%` },
                            ]}
                        />
                    </View>
                </View>
                <Text style={styles.hydrationText}>
                    {Math.round(actualNutrition.water)}/{targets.water}oz
                </Text>
            </View>

            {/* Cut Protocol Additions */}
            {cutProtocol && (
                <View style={styles.cutProtocolContainer}>
                    {/* Sodium & Special instructions */}
                    <View style={styles.cutTagsRow}>
                        {/* Sodium */}
                        <View style={styles.sodiumBlock}>
                            <Text style={styles.sodiumValue}>{((cutProtocol.sodium_target_mg ?? 0) / 1000).toFixed(1)}g</Text>
                            <Text style={styles.sodiumLabel}>Sodium</Text>
                        </View>
                        {cutProtocol.is_refeed_day && (
                            <View style={styles.refeedBadge}>
                                <Text style={styles.refeedText}>REFEED DAY</Text>
                            </View>
                        )}
                        {cutProtocol.is_carb_cycle_high && !cutProtocol.is_refeed_day && (
                            <View style={[styles.refeedBadge, { backgroundColor: 'rgba(96,165,250,0.12)' }]}>
                                <Text style={[styles.refeedText, { color: '#60A5FA' }]}>HIGH CARB</Text>
                            </View>
                        )}
                    </View>

                    {cutProtocol.sodium_instruction && (
                        <Text style={styles.sodiumInstruction}>{cutProtocol.sodium_instruction}</Text>
                    )}

                    {/* Schedule is always rendered if we just rely on parent AnimatedPressable for clicks,
                        but DashboardNutritionCard is wrapped in AnimatedPressable which catches the click and navigates! 
                        So we shouldn't make this expandable inside the card - we should just render it 
                        if it's important, or leave it for the Nutrition screen details. 
                        Let's render the schedule if a cut is active so it's always visible on the dashboard! */}
                    <View style={styles.scheduleBlock}>
                        {[
                            { label: 'Morning', text: cutProtocol.morning_protocol },
                            { label: 'Afternoon', text: cutProtocol.afternoon_protocol },
                            { label: 'Evening', text: cutProtocol.evening_protocol },
                        ]
                            .filter(s => s.text)
                            .map(s => (
                                <View key={s.label} style={styles.scheduleRow}>
                                    <Text style={styles.scheduleIcon}>{SECTION_ICONS[s.label]}</Text>
                                    <View style={styles.scheduleTextBlock}>
                                        <Text style={styles.scheduleLabel}>{s.label}</Text>
                                        <Text style={styles.scheduleBody}>{s.text}</Text>
                                    </View>
                                </View>
                            ))}
                    </View>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    nutritionCard: {
        padding: SPACING.xl,
        backgroundColor: '#18181B', // Zinc 900
        borderRadius: RADIUS.xxl,
        borderWidth: 0,
        ...SHADOWS.md,
    },
    calorieHero: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    calorieValue: {
        fontSize: 48,
        fontFamily: FONT_FAMILY.black,
        color: '#FFF',
        letterSpacing: -1.5,
    },
    calorieTarget: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.7)',
        marginLeft: SPACING.xs,
    },
    macroRingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: SPACING.lg,
    },
    macroRingItem: {
        alignItems: 'center',
    },
    macroRingLabel: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.extraBold,
        color: '#FFF',
        marginTop: SPACING.md,
    },
    macroRingSub: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 1,
    },
    hydrationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 2,
        borderTopColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1, // To give the thin line soft edges
    },
    hydrationBarWrap: {
        flex: 1,
    },
    hydrationBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    hydrationBarFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: COLORS.chart.water,
    },
    hydrationText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFF',
    },
    // Cut specific styles
    cutProtocolContainer: {
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTopWidth: 2,
        borderTopColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
        gap: SPACING.sm,
    },
    cutTagsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    sodiumBlock: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: RADIUS.md,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    sodiumValue: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: '#FFF' },
    sodiumLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 9, color: 'rgba(255,255,255,0.6)' },
    refeedBadge: {
        backgroundColor: 'rgba(251,191,36,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    refeedText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 10, color: COLORS.warning, letterSpacing: 0.5 },
    sodiumInstruction: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontStyle: 'italic',
        marginTop: 2,
    },
    expandTriggerWrapper: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    expandText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: '#FFF', letterSpacing: 0.5, textTransform: 'uppercase' },
    scheduleBlock: { gap: SPACING.sm },
    scheduleRow: { flexDirection: 'row', gap: SPACING.xs },
    scheduleIcon: { fontSize: 16 },
    scheduleTextBlock: { flex: 1 },
    scheduleLabel: { fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: '#FFF' },
    scheduleBody: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
});
