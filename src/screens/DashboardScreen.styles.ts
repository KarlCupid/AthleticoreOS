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

    // Skeleton loading
    skeletonHero: {
        backgroundColor: COLORS.borderLight,
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

    // Action Grid
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    actionGridItem: {
        width: '47%',
    },
    actionGridCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        ...SHADOWS.card,
        minHeight: 120,
    },
    actionGridIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    actionGridLabel: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    actionGridSub: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    actionGridDone: {
        color: COLORS.text.tertiary,
        textDecorationLine: 'line-through',
    },
    actionGridArrow: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
    },
});
