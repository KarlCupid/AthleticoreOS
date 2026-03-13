import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconAlertTriangle } from './icons';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { CutPlanResult } from '../../lib/engine/types';

interface CutPlanPreviewStepProps {
    planResult: CutPlanResult | null;
    extremeAcknowledged: boolean;
    setExtremeAcknowledged: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CutPlanPreviewStep({ planResult, extremeAcknowledged, setExtremeAcknowledged }: CutPlanPreviewStepProps) {
    if (!planResult) return null;
    const hasErrors = planResult.validationErrors.length > 0;

    return (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Step 4 of 5</Text>
            <Text style={styles.heading}>Plan Preview</Text>

            {hasErrors ? (
                <View style={styles.errorBox}>
                    <IconAlertTriangle size={20} color={COLORS.error} />
                    {planResult.validationErrors.map((e, i) => (
                        <Text key={i} style={styles.errorText}>{e}</Text>
                    ))}
                </View>
            ) : (
                <>
                    <View style={styles.planSummaryGrid}>
                        <PlanStat label="Total Cut" value={`${planResult.totalCutLbs.toFixed(1)} lbs`} />
                        <PlanStat label="Cut %" value={`${planResult.totalCutPct.toFixed(1)}%`} />
                        <PlanStat label="Diet Loss" value={`${planResult.dietPhaseTargetLbs.toFixed(1)} lbs`} />
                        <PlanStat label="Water Cut" value={`${planResult.waterCutAllocationLbs.toFixed(1)} lbs`} />
                        <PlanStat label="Weekly Rate" value={`${planResult.safeWeeklyLossRateLbs.toFixed(1)} lbs/wk`} />
                        <PlanStat label="Daily Deficit" value={`~${planResult.estimatedDailyDeficitIntensified} cal`} />
                    </View>

                    <View style={styles.phaseBreakdown}>
                        {planResult.chronicPhaseDates && (
                            <PhaseRow
                                name="Chronic Cut"
                                start={planResult.chronicPhaseDates.start}
                                end={planResult.chronicPhaseDates.end}
                                color="#3B82F6"
                                weeks={planResult.chronicPhaseWeeks}
                            />
                        )}
                        <PhaseRow
                            name="Intensified Cut"
                            start={planResult.intensifiedPhaseDates.start}
                            end={planResult.intensifiedPhaseDates.end}
                            color="#15803D"
                            weeks={planResult.intensifiedPhaseWeeks}
                        />
                        <PhaseRow
                            name="Fight Week"
                            start={planResult.fightWeekDates.start}
                            end={planResult.fightWeekDates.end}
                            color="#F59E0B"
                            weeks={1}
                        />
                    </View>

                    {planResult.extremeCutWarning && (
                        <View style={styles.extremeWarningBox}>
                            <View style={styles.extremeWarningHeader}>
                                <Text style={styles.extremeWarningIcon}>â˜ ï¸</Text>
                                <Text style={styles.extremeWarningTitle}>EXTREME CUT â€” SERIOUS HEALTH RISK</Text>
                            </View>
                            <Text style={styles.extremeWarningBody}>
                                A {planResult.totalCutPct.toFixed(1)}% body weight cut ({planResult.totalCutLbs.toFixed(1)} lbs) significantly
                                exceeds the 10% limit established by sports medicine authorities (AMA, ACSM, WMA).
                            </Text>
                            <Text style={styles.extremeWarningSubheading}>Documented risks at this magnitude:</Text>
                            {[
                                'Acute kidney injury and kidney failure',
                                'Cardiac arrhythmia and sudden cardiac events',
                                'Severe cognitive and neuromuscular impairment',
                                'Rhabdomyolysis (muscle breakdown)',
                                'In rare cases â€” death',
                            ].map((risk, i) => (
                                <Text key={i} style={styles.extremeRiskItem}>â€¢ {risk}</Text>
                            ))}
                            <Text style={styles.extremeWarningBody}>
                                We strongly recommend choosing a higher weight class. If you insist on proceeding, this
                                must only be done under direct supervision of a licensed sports dietitian and a physician.
                                Do not attempt this plan alone.
                            </Text>

                            <TouchableOpacity
                                style={styles.ackRow}
                                onPress={() => setExtremeAcknowledged(v => !v)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.ackCheckbox, extremeAcknowledged && styles.ackCheckboxChecked]}>
                                    {extremeAcknowledged && <Text style={styles.ackCheckmark}>âœ“</Text>}
                                </View>
                                <Text style={styles.ackText}>
                                    I understand these risks are real and potentially life-threatening. I accept full
                                    responsibility and will proceed only with qualified medical supervision.
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {planResult.safetyWarnings.filter(w => !planResult.extremeCutWarning || planResult.safetyWarnings.indexOf(w) > 0).length > 0 && !planResult.extremeCutWarning && (
                        <View style={styles.warningBox}>
                            <IconAlertTriangle size={16} color={COLORS.warning} />
                            {planResult.safetyWarnings.map((w, i) => (
                                <Text key={i} style={styles.warningText}>{w}</Text>
                            ))}
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

function PlanStat({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.planStat}>
            <Text style={styles.planStatValue}>{value}</Text>
            <Text style={styles.planStatLabel}>{label}</Text>
        </View>
    );
}

function PhaseRow({ name, start, end, color, weeks }: {
    name: string; start: string; end: string; color: string; weeks: number;
}) {
    return (
        <View style={styles.phaseRow}>
            <View style={[styles.phaseColor, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
                <Text style={styles.phaseName}>{name}</Text>
                <Text style={styles.phaseDates}>{start} â†’ {end} ({Math.round(weeks)}w)</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: { gap: SPACING.md },
    stepTitle: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, letterSpacing: 1, textTransform: 'uppercase' },
    heading: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },

    errorBox: { backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
    errorText: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.error, lineHeight: 20 },
    warningBox: { backgroundColor: '#FEF3C7', borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
    warningText: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary, lineHeight: 20 },

    planSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    planStat: {
        width: '31%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm,
    },
    planStatValue: { fontSize: 18, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
    planStatLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginTop: 2, textAlign: 'center' },

    phaseBreakdown: { gap: SPACING.sm },
    phaseRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md },
    phaseColor: { width: 4, height: 40, borderRadius: 2 },
    phaseName: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    phaseDates: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, marginTop: 2 },

    // Extreme Warning
    extremeWarningBox: {
        backgroundColor: '#1C0A0A', borderRadius: RADIUS.xl,
        borderWidth: 2, borderColor: '#DC2626',
        padding: SPACING.md, marginBottom: SPACING.md, gap: SPACING.xs,
    },
    extremeWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
    extremeWarningIcon: { fontSize: 22 },
    extremeWarningTitle: { fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: '#FCA5A5', letterSpacing: 0.4, flex: 1 },
    extremeWarningSubheading: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: '#FCA5A5', marginTop: SPACING.xs },
    extremeWarningBody: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: '#FEE2E2', lineHeight: 20 },
    extremeRiskItem: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: '#FCA5A5', paddingLeft: SPACING.xs, lineHeight: 20 },
    ackRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.sm,
        backgroundColor: 'rgba(220,38,38,0.15)', borderRadius: RADIUS.lg,
        padding: SPACING.sm, borderWidth: 1, borderColor: '#DC2626',
    },
    ackCheckbox: {
        width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#DC2626',
        justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
    },
    ackCheckboxChecked: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    ackCheckmark: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: '#FFFFFF' },
    ackText: { flex: 1, fontFamily: FONT_FAMILY.regular, fontSize: 12, color: '#FEE2E2', lineHeight: 18 },
});

