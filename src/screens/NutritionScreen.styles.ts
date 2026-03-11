import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    cutBanner: {
        backgroundColor: '#1E1B4B',
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        gap: SPACING.xs,
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
    header: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    dateText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    content: {
        padding: SPACING.lg,
        paddingTop: SPACING.sm,
    },
    calorieHero: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
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
