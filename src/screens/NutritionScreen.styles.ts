import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, TAP_TARGETS, TYPOGRAPHY_V2 } from '../theme/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bodyMassBanner: {
        backgroundColor: 'rgba(245, 245, 240, 0.08)',
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.22)',
    },
    bodyMassBannerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    bodyMassBannerPhase: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 12,
        color: COLORS.accent,
        flex: 1,
        letterSpacing: 0.4,
    },
    bodyMassBadge: {
        backgroundColor: COLORS.accentLight,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.28)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    bodyMassBadgeText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 10,
        color: COLORS.accent,
        letterSpacing: 0.5,
    },
    bodyMassBannerInstruction: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: COLORS.text.secondary,
        lineHeight: 18,
    },
    cardTitle: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
    },
    cardSubtitle: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        lineHeight: 20,
    },
    cardMeta: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 18,
        marginTop: SPACING.xs,
    },
    header: {
        paddingHorizontal: SPACING.md, // Reduced from lg
        paddingBottom: SPACING.sm, // Reduced from md
    },
    modeSwitch: {
        flexDirection: 'row',
        gap: SPACING.sm,
        backgroundColor: 'rgba(10, 10, 10, 0.46)',
        borderRadius: RADIUS.xl,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.12)',
    },
    modeChip: {
        flex: 1,
        minHeight: TAP_TARGETS.plan.min,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeChipText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    modeChipTextActive: {
        color: COLORS.text.inverse,
    },
    content: {
        padding: SPACING.md, // Reduced from lg
        paddingTop: SPACING.xs, // Tighter top gap
        gap: SPACING.md,
    },
    commandHero: {
        borderColor: 'rgba(212, 175, 55, 0.26)',
        backgroundColor: 'rgba(10, 10, 10, 0.66)',
        ...SHADOWS.cardElevated,
    },
    commandHeroTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    commandHeroCopy: {
        flex: 1,
        minWidth: 0,
    },
    commandHeroBadge: {
        width: 62,
        minHeight: 62,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.34)',
        backgroundColor: 'rgba(212, 175, 55, 0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xs,
    },
    commandHeroBadgeValue: {
        fontSize: 22,
        lineHeight: 26,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    commandHeroBadgeLabel: {
        fontSize: 10,
        lineHeight: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.accent,
        textTransform: 'uppercase',
    },
    commandMetricRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    commandActionGrid: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    commandAction: {
        flex: 1,
        minHeight: TAP_TARGETS.plan.recommended,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.24)',
        backgroundColor: 'rgba(10, 10, 10, 0.42)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
    },
    commandActionPrimary: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
        ...SHADOWS.colored.accent,
    },
    commandActionText: {
        flexShrink: 1,
        fontSize: 13,
        lineHeight: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    commandActionTextPrimary: {
        color: COLORS.text.inverse,
    },
    calorieHero: {
        alignItems: 'center',
        marginBottom: SPACING.md, // Reduced from lg
    },
    calorieNumber: {
        ...TYPOGRAPHY_V2.plan.display,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    calorieLabel: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    quickActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    quickActionButton: {
        flex: 1,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    quickActionGradient: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        gap: SPACING.xs + 2,
        borderRadius: RADIUS.lg,
    },
    quickActionTextGradient: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
});
