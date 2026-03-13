import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

export const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    backButton: { marginBottom: SPACING.xs },
    headerTitle: { fontSize: 22, fontFamily: FONT_FAMILY.black, color: '#fff' },
    stepDots: { flexDirection: 'row', gap: 6, marginTop: SPACING.sm },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
    dotActive: { backgroundColor: '#fff' },

    stepContainer: { gap: SPACING.md },
    stepTitle: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, letterSpacing: 1, textTransform: 'uppercase' },
    heading: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
    subtitle: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
    label: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginTop: SPACING.sm },

    // â”€â”€ Step 1: Intro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    introHero: {
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    introHeroEmoji: { fontSize: 48 },
    introHeroTitle: {
        fontSize: 22,
        fontFamily: FONT_FAMILY.black,
        color: '#3730A3',
        textAlign: 'center',
    },
    introHeroSub: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: '#4338CA',
        textAlign: 'center',
        lineHeight: 22,
    },
    introSectionLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: SPACING.xs,
    },
    impactCard: {
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    impactCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    impactIconBox: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    impactIcon: { fontSize: 22 },
    impactFeature: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
    },
    impactTimingBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        marginTop: 3,
    },
    impactTiming: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
    },
    impactDetail: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },
    phaseCard: {
        flexDirection: 'row',
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        gap: SPACING.md,
        padding: SPACING.md,
        alignItems: 'flex-start',
    },
    phaseCardBar: {
        width: 4,
        borderRadius: 2,
        alignSelf: 'stretch',
        minHeight: 40,
    },
    phaseCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    phaseCardLabel: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
    },
    phaseCardWhen: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    phaseCardWhenText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
    },
    phaseCardDesc: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 19,
    },
    introNote: {
        flexDirection: 'row',
        backgroundColor: COLORS.accentLight,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.sm,
        alignItems: 'flex-start',
    },
    introNoteIcon: { fontSize: 18 },
    introNoteText: {
        flex: 1,
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        lineHeight: 20,
    },

    // â”€â”€ Form elements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: 16,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.primary,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    toggleRow: { flexDirection: 'row', gap: SPACING.sm },
    toggleOption: {
        flex: 1, padding: SPACING.md, backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    toggleOptionActive: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
    toggleText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: COLORS.text.secondary },
    toggleTextActive: { color: '#16A34A' },
    suggestionRow: {
        flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md, gap: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    suggestionRowActive: { borderColor: '#16A34A', backgroundColor: '#DCFCE7' },
    suggestionRowDisabled: { opacity: 0.5 },
    suggestionName: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    suggestionSub: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, marginTop: 2 },
    riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
    riskText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    infoBox: { backgroundColor: COLORS.accentLight, borderRadius: RADIUS.md, padding: SPACING.md },
    infoText: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20 },

    // â”€â”€ Plan preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    confirmBox: {
        flexDirection: 'row', backgroundColor: '#DCFCE7', borderRadius: RADIUS.md,
        padding: SPACING.md, gap: SPACING.sm, alignItems: 'flex-start',
    },
    confirmText: { flex: 1, fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary, lineHeight: 22 },

    // â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    footer: {
        padding: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 110 : 80,
        backgroundColor: COLORS.background,
    },
    nextButton: { backgroundColor: '#16A34A', borderRadius: RADIUS.full, padding: SPACING.md, alignItems: 'center' },
    nextButtonDisabled: { backgroundColor: COLORS.text.tertiary },
    activateButton: { backgroundColor: COLORS.readiness.prime, borderRadius: RADIUS.full, padding: SPACING.md, alignItems: 'center' },
    nextButtonText: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: '#fff' },

    // â”€â”€ Extreme cut disclaimer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    extremeReminderBanner: {
        backgroundColor: '#FEE2E2', borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: '#FECACA', padding: SPACING.sm, marginBottom: SPACING.md,
    },
    extremeReminderText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: '#DC2626', textAlign: 'center' },
});

