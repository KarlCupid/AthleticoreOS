import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    inner: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
    },
    topNav: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: SPACING.md,
    },
    signOutButtonIcon: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    signOutButtonText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginLeft: 4,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: COLORS.borderLight,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.readiness.prime,
        borderRadius: 2,
    },
    stepIndicator: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
    },
    phaseCard: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        ...SHADOWS.card,
    },
    phaseCardKeyboard: {
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    phaseEyebrow: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.readiness.prime,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: SPACING.xs,
    },
    phaseTitle: {
        fontSize: 22,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    phaseDescription: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 21,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: SPACING.sm,
    },
    scrollContentKeyboard: {
        paddingBottom: SPACING.xs,
    },
    stepContent: {
        flex: 1,
    },
    welcomeIcon: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        marginTop: SPACING.xxl,
    },
    welcomeIconGradient: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeTitle: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: SPACING.md,
    },
    welcomeSubtitle: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: SPACING.lg,
    },
    stepTitle: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
        marginBottom: SPACING.xs,
    },
    stepSubtitle: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xl,
        lineHeight: 22,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    inputRow: {
        flexDirection: 'row',
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        fontSize: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
    },
    helperText: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.sm,
        lineHeight: 18,
    },
    pillRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    pill: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm + 4,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pillActive: {
        backgroundColor: COLORS.readiness.prime,
        borderColor: COLORS.readiness.prime,
    },
    pillText: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    pillTextActive: {
        color: COLORS.text.inverse,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.md,
    },
    navRowKeyboard: {
        paddingTop: SPACING.xs,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: SPACING.sm,
    },
    backText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    nextButtonWrapper: {
        borderRadius: RADIUS.full,
        overflow: 'hidden',
        ...SHADOWS.colored.accent,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm + 6,
        borderRadius: RADIUS.full,
    },
    nextButtonDisabled: {
        opacity: 0.4,
    },
    nextText: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
    },
});
