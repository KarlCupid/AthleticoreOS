import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

export const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.lg,
    },
    cardSpacing: {
        marginBottom: SPACING.md,
    },
    chartTitle: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    chartSubtitle: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.md,
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
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.md,
        marginTop: SPACING.sm,
        flexWrap: 'wrap',
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
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'flex-start',
        paddingVertical: SPACING.sm,
    },
    calendarDot: {
        width: 28,
        height: 28,
        borderRadius: 6,
    },
    tooltip: {
        backgroundColor: COLORS.borderLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
    tooltipDate: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    tooltipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
    },
    tooltipValue: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    tooltipBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        marginTop: SPACING.xs,
    },
    tooltipBadgeText: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
    },
});
