import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.lg,
    },
    contextScheduleNote: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
        lineHeight: 18,
    },

    // Skeleton loading
    skeletonHero: {
        backgroundColor: COLORS.surfaceSecondary,
        padding: SPACING.xl,
        paddingTop: SPACING.xxxl,
    },

    // Chart
    chartContainer: {
        height: 200,
    },
    chartLegend: {
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
    legendText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    chartCaption: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },

    // Nutrition Summary Card
    nutritionCard: {
        padding: SPACING.lg,
    },
    calorieHero: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    calorieValue: {
        fontSize: 36,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.8,
    },
    calorieTarget: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
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
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginTop: SPACING.sm,
    },
    macroRingSub: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginTop: 1,
    },
    hydrationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.borderLight,
    },
    hydrationBarWrap: {
        flex: 1,
    },
    hydrationBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.borderLight,
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
        color: COLORS.text.secondary,
    },

    // Biology
    biologyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    biologyIcon: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.readiness.cautionLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    biologyInfo: {
        flex: 1,
    },
    biologyTitle: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    biologyDesc: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },

    // Quick Action Strip (compact pill row replacing 2×2 grid)
    quickActionStrip: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    quickActionPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.full,
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.sm + 2,
        ...SHADOWS.sm,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    quickActionIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        flexShrink: 1,
    },
    quickActionLabelDone: {
        color: COLORS.text.tertiary,
    },

    // Phase control
    phaseControlHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    phaseControlEyebrow: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        letterSpacing: 1,
    },
    phaseControlCurrentMode: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    phaseControlTitle: {
        marginTop: SPACING.xs,
        fontSize: 22,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.3,
    },
    phaseControlDescription: {
        marginTop: SPACING.xs,
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    phaseControlSummaryRow: {
        marginTop: SPACING.md,
        flexDirection: 'row',
        alignItems: 'stretch',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceSecondary,
    },
    phaseControlSummaryBlock: {
        flex: 1,
        paddingVertical: SPACING.sm + 2,
        paddingHorizontal: SPACING.md,
    },
    phaseControlSummaryDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.borderLight,
    },
    phaseControlSummaryLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    phaseControlSummaryValue: {
        marginTop: 4,
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    phaseControlPrimaryButton: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    phaseControlPrimaryText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
    phaseControlSecondaryButton: {
        marginTop: SPACING.sm,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md - 2,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    phaseControlSecondaryText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },

    // First-run guidance
    firstRunModalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
    },
    firstRunModalCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.cardElevated,
    },
    firstRunModalKicker: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        letterSpacing: 1,
    },
    firstRunModalTitle: {
        marginTop: SPACING.xs,
        fontSize: 24,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.3,
    },
    firstRunModalBody: {
        marginTop: SPACING.sm,
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 21,
    },
    firstRunModalPrimaryButton: {
        marginTop: SPACING.lg,
        backgroundColor: COLORS.accent,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    firstRunModalPrimaryText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
    firstRunModalSecondaryButton: {
        marginTop: SPACING.sm,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    firstRunModalSecondaryText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    firstRunHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    firstRunKicker: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        letterSpacing: 1,
    },
    firstRunProgress: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    firstRunTitle: {
        marginTop: SPACING.xs,
        fontSize: 22,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.3,
    },
    firstRunSubtitle: {
        marginTop: SPACING.xs,
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    firstRunStepList: {
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    firstRunStepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: RADIUS.lg,
        padding: SPACING.sm,
        gap: SPACING.sm,
    },
    firstRunStepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceSecondary,
    },
    firstRunStepBadgeDone: {
        borderColor: COLORS.success,
        backgroundColor: COLORS.success + '20',
    },
    firstRunStepBadgeText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    firstRunStepBadgeTextDone: {
        color: COLORS.success,
    },
    firstRunStepCopy: {
        flex: 1,
    },
    firstRunStepTitle: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    firstRunStepSubtitle: {
        marginTop: 1,
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        lineHeight: 17,
    },
    firstRunStepCta: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
    },

    // Compass header (replaces HeroHeader above-fold)
    compassHeader: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.lg,
    },
    compassSessionRole: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1.2,
    },
    compassSessionRoleContext: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.62)',
        letterSpacing: 1,
        marginTop: 2,
        marginBottom: SPACING.xs,
    },
    compassHeadline: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.extraBold,
        color: '#FFFFFF',
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    compassSummary: {
        marginTop: SPACING.xs,
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.82)',
        lineHeight: 22,
    },
    compassReasonRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    compassReasonBar: {
        width: 3,
        borderRadius: 2,
        marginTop: 3,
        minHeight: 14,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    compassReasonText: {
        flex: 1,
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.72)',
        lineHeight: 20,
    },
    compassPrimaryButton: {
        marginTop: SPACING.lg,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        paddingVertical: SPACING.md + 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    compassPrimaryText: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    compassSecondaryButton: {
        marginTop: SPACING.sm,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    compassSecondaryText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.7)',
    },
    compassMissionLink: {
        marginTop: SPACING.sm,
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },

    // Why Today? expandable
    whyTodayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
    },
    whyTodayTitle: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    whyTodayChevron: {
        fontSize: 11,
        color: COLORS.text.tertiary,
    },
    whyTodayItem: {
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.borderLight,
    },
    whyTodayItemTitle: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    whyTodayItemSentence: {
        marginTop: 2,
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 19,
    },
});
