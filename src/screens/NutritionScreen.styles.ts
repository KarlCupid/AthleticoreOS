import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    cutBanner: {
        backgroundColor: 'rgba(59, 66, 159, 0.4)', // Ocean Twilight Glass
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    cutBannerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    cutBannerPhase: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 12,
        color: '#C7D2FE',
        flex: 1,
        letterSpacing: 0.4,
    },
    cutBadge: {
        backgroundColor: '#FEF9C3',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    cutBadgeText: {
        fontFamily: FONT_FAMILY.semiBold,
        fontSize: 10,
        color: '#92400E',
        letterSpacing: 0.5,
    },
    cutBannerInstruction: {
        fontFamily: FONT_FAMILY.regular,
        fontSize: 12,
        color: '#A5B4FC',
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
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: RADIUS.xl,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modeChip: {
        flex: 1,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
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
    },
    calorieHero: {
        alignItems: 'center',
        marginBottom: SPACING.md, // Reduced from lg
    },
    calorieNumber: {
        ...TYPOGRAPHY.display,
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
