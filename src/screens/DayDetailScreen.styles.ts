import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

export const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backButton: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
    headerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
    addIcon: { fontSize: 28, fontFamily: FONT_FAMILY.black },
    loadBanner: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
    },
    loadBannerText: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary },
    nutritionBanner: {
        marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
        padding: SPACING.md, borderRadius: RADIUS.md,
        backgroundColor: COLORS.surface, ...SHADOWS.card,
    },
    nutritionBannerTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: 4 },
    nutritionBannerText: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 18 },
    timeline: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
    emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
    emptyText: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
    emptySubtext: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginTop: 4 },
    pickerOverlay: {
        flex: 1,
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    pickerCard: {
        backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
        padding: SPACING.lg, paddingBottom: SPACING.xxl,
        maxHeight: '88%',
    },
    pickerCardTall: {
        paddingBottom: SPACING.lg,
    },
    pickerScrollContent: {
        paddingBottom: SPACING.sm,
    },
    pickerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginBottom: SPACING.md },
    pickerOption: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
        minHeight: 48,
        paddingVertical: SPACING.sm + 4, borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.borderLight,
    },
    pickerOptionIcon: { fontSize: 20 },
    pickerOptionLabel: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
    pickerCancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm },
    pickerCancelText: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
    inputLabel: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginTop: SPACING.sm, marginBottom: 4 },
    textInput: {
        backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.sm,
        fontSize: 15, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary,
        borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.md
    },
    applyButton: { minHeight: 48, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
    applyButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#F5F5F0' },
});
